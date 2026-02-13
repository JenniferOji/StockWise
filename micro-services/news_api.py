import os
import pickle
from datetime import datetime, timedelta

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
        
        # return the fromatted articles 
        formatted_articles.append({
            "image": image,
            "name": name_in_article,
            "headline": article.get("title"),
            "source": article.get("source", {}).get("name")
        })

    return {
        "success": True,
        "names": names,
        "count": len(formatted_articles),
        "articles": formatted_articles
    }

    