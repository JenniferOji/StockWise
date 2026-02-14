import os
import pickle
from datetime import datetime, timedelta

import numpy as np
import onnxruntime as ort
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from dotenv import load_dotenv
load_dotenv()

router = APIRouter()

# load the onnx models from the file path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

preproc_path = os.path.join(BASE_DIR, "ml", "models", "sentiment_preprocessor.onnx")
model_path = os.path.join(BASE_DIR, "ml", "models", "sentiment_catboost_model.onnx")

preproc_sess = ort.InferenceSession(preproc_path, providers=["CPUExecutionProvider"])
model_sess = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

# loads the label dictionary to convert the model output back to the sentiment label
with open(os.path.join(BASE_DIR, "ml", "models", "sentiment_label_map.pkl"), "rb") as f:
    sentiment_label = pickle.load(f)

class StockRequest(BaseModel):
    names: List[str]


def split_company_name(company_name: str):
    name = company_name.split('(')[0].strip()

    name = name.split(',')[0].strip()
    if '.' in name:
        name = name.split('.')[0]
    words = name.split()
   
    return words[0] if words else company_name


def format_date(value: str):
    fixed = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(fixed)
    return dt.date().isoformat()


def get_sentiment_label(text: str):
    # preprocess the text using the onnx preprocessor
    preproc_input = preproc_sess.get_inputs()[0].name
    preproc_out = preproc_sess.run(None, {preproc_input: np.array([[text]], dtype=object)})
    #  extract the features from the preprocessor output 
    features = preproc_out[0]

    # running the features through the onnx model to get the sentiment label
    model_input = model_sess.get_inputs()[0].name
    outputs = model_sess.run(None, {model_input: features})

    # ouput is an array with the predicted label as the first element 
    if isinstance(outputs[0], np.ndarray) and outputs[0].dtype == object and outputs[0].size == 1:
        label = outputs[0].flat[0]
        if isinstance(label, bytes):
            return label.decode("utf-8")
        if isinstance(label, str):
            return label



@router.post("/stock-news")
def fetch_news_by_names(request: StockRequest):
    api_key = os.getenv("NEWS_API_KEY") 
    
    names = request.names

    if len(names) == 0:
        raise HTTPException(status_code=400, detail="No stock names provided")
    
    # get the frist part of the company name 
    search_terms = [split_company_name(name) for name in names]
    name_query = " OR ".join(search_terms)

    params = {
        "q": name_query,
        "language": "en",
        # "from": week,
        "pageSize": 15,
        "apiKey": api_key,
    }

    resp = requests.get("https://newsapi.org/v2/everything", params=params, timeout=10)
    if resp.status_code != 200:
        print("NewsAPI error:", resp.status_code, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    articles = data.get("articles", [])
    
    # clean articles to only return article image, headline, and the ticker 
    formatted_articles = []
    for article in articles:
        image = article.get("urlToImage")
        
        if not image:
            continue
        
        # find the name from the article 
        title = article.get("title", "").lower()
        name_in_article = None
        for i, search_term in enumerate(search_terms):
            if search_term.lower() in title:
                name_in_article = names[i]
                break
        
        if not name_in_article:
            continue

        sentiment_label = get_sentiment_label(article.get("title", ""))
        print("Sentiment label:", sentiment_label, "-", article.get("title", ""))
        
        # return the fromatted articles 
        formatted_articles.append({
            "image": image,
            "name": name_in_article,
            "headline": article.get("title"),
            "source": article.get("source", {}).get("name"),
            "url": article.get("url"),
            "date": format_date(article.get("publishedAt")),
            "sentiment": sentiment_label
        })

    return {
        "success": True,
        "names": names,
        "count": len(formatted_articles),
        "articles": formatted_articles
    }

    