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
    tickers: List[str]


@router.post("/news")
def fetch_news_by_tickers(request: StockRequest):
    api_key = os.getenv("NEWS_API_KEY")
    
    tickers = request.tickers

    if len(tickers) == 0:
        raise HTTPException(status_code=400, detail="No stock tickers provided")

    # get news from last week only
    week = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    
    query = " OR ".join(tickers)
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "from": week,
        "pageSize": 15,
        "apiKey": api_key,
    }

    resp = requests.get("https://newsapi.org/v2/everything", params=params, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    articles = data.get("articles", [])
    
    # clean articles to only return article image, headline, and the ticker 
    formatted_articles = []
    for article in articles:
        image = article.get("urlToImage")
        
        # only consider articles with images
        if not image:
            continue
        
        # find the ticker from the article 
        title = article.get("title", "").lower()
        ticker_in_article = None
        for ticker in tickers:
            if ticker.lower() in title:
                ticker_in_article = ticker
                break
        
        # return the fromatted articles 
        formatted_articles.append({
            "image": image,
            "ticker": ticker_in_article,
            "headline": article.get("title"),
            "source": article.get("source", {}).get("name")
        })

    return {
        "success": True,
        "tickers": tickers,
        "count": len(formatted_articles),
        "articles": formatted_articles
    }

    