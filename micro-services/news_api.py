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
import re
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

nltk.download("punkt")
nltk.download("punkt_tab")
nltk.download("wordnet")

load_dotenv()
lemm = WordNetLemmatizer()
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


def title_mentions_stock(title: str, company_name: str, search_term: str, symbol: str):
    title_lower = title.lower()
    company_base = company_name.split('(')[0].strip().lower()

    if search_term and search_term.lower() in title_lower:
        return True

    if symbol and symbol.lower() in title_lower:
        return True

    if company_base and company_base in title_lower:
        return True

    return False


def format_date(value: str):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(value).date().isoformat()

    fixed = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(fixed)
    return dt.date().isoformat()

def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)


def text_preprocess(doc: str):

    temp = doc.lower()

    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)

    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)

    temp = re.sub("[0-9]", "", temp)
    temp = re.sub("'", " ", temp)

    temp = word_tokenize(temp)

    temp = [reduce_lengthening(w) for w in temp]

    temp = [lemm.lemmatize(w) for w in temp]

    temp = [w for w in temp if len(w) > 1]

    temp = " ".join(temp)

    return temp

def get_sentiment_label(text: str):

    clean_text = text_preprocess(text)

    preproc_input = preproc_sess.get_inputs()[0].name

    preproc_out = preproc_sess.run(
        None,
        {preproc_input: np.array([[clean_text]], dtype=object)}
    )

    features = preproc_out[0]

    model_input = model_sess.get_inputs()[0].name

    outputs = model_sess.run(
        None,
        {model_input: features}
    )

    label = outputs[0].flat[0]

    if hasattr(label, "item"):
        label = label.item()

    return label

SENTIMENT_SCORE = {
    "positive": 1,
    "neutral": 0,
    "negative": -1
}

def compute_stock_sentiment(articles, names: List[str] | None = None):

    stock_scores = {}
    stock_counts = {}

    for article in articles:
        stock = article["name"]
        sentiment = article["sentiment"]

        score = SENTIMENT_SCORE.get(sentiment, 0)

        stock_scores[stock] = stock_scores.get(stock, 0) + score
        stock_counts[stock] = stock_counts.get(stock, 0) + 1

    results = {}

    for stock in stock_scores:
        avg_score = stock_scores[stock] / stock_counts[stock]

        if avg_score > 0.25:
            label = "bullish"
        elif avg_score < -0.25:
            label = "bearish"
        else:
            label = "neutral"

        results[stock] = {
            "score": round(avg_score, 3),
            "label": label,
            "articles": stock_counts[stock]
        }

    if names:
        for stock_name in names:
            if stock_name not in results:
                results[stock_name] = {
                    "score": 0.0,
                    "label": "neutral",
                    "articles": 0,
                }

    return results

@router.post("/stock-news")
def fetch_news_by_names(request: StockRequest, look_back_days: int = 0):
    api_key = os.getenv("FINNHUB_API_KEY") 
    
    names = request.names

    if len(names) == 0:
        raise HTTPException(status_code=400, detail="No stock names provided")

    if not api_key:
        raise HTTPException(status_code=500, detail="Missing FINNHUB_API_KEY")
    
    # get the frist part of the company name 
    search_terms = [split_company_name(name) for name in names]
    to_date = datetime.utcnow().date()
    if look_back_days <= 1:
        from_date = to_date
    else:
        from_date = to_date - timedelta(days=look_back_days - 1)

    # clean articles to only return article image, headline, and the ticker
    formatted_articles = []
    seen_urls = set()

    for i, search_term in enumerate(search_terms):
        try:
            search_resp = requests.get(
                "https://finnhub.io/api/v1/search",
                params={"q": search_term, "token": api_key},
                timeout=10,
            )
            search_resp.raise_for_status()
            search_data = search_resp.json()

            results = search_data.get("result", [])
            symbol = results[0].get("symbol") if results else None
            if not symbol:
                continue

            news_resp = requests.get(
                "https://finnhub.io/api/v1/company-news",
                params={
                    "symbol": symbol,
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat(),
                    "token": api_key,
                },
                timeout=10,
            )
            news_resp.raise_for_status()
            articles = news_resp.json()
        except requests.RequestException:
            continue

        if not isinstance(articles, list):
            continue

        for article in articles:
            image = article.get("image")
            headline = article.get("headline", "")
            summary = article.get("summary", "")
            url = article.get("url")

            if not headline or not url:
                continue

            if not title_mentions_stock(headline, names[i], search_term, symbol):
                continue

            if url in seen_urls:
                continue
            seen_urls.add(url)

            # sentiment = get_sentiment_label(headline)
            text = headline + " " + summary
            sentiment = get_sentiment_label(text)

            formatted_articles.append(
                {
                    "image": image,
                    "name": names[i],
                    "headline": headline,
                    "source": article.get("source"),
                    "url": url,
                    "date": format_date(article.get("datetime")),
                    "sentiment": sentiment,
                }
            )

    # formatted_articles = formatted_articles[:15]

    return {
        "success": True,
        "names": names,
        "count": len(formatted_articles),
        # "stock_sentiments": stock_sentiments,
        "articles": formatted_articles
    }

@router.post("/stock-sentiment")
def get_stock_sentiment(request: StockRequest):

    news = fetch_news_by_names(request, look_back_days=7)

    sentiment_summary = compute_stock_sentiment(news["articles"], request.names)

    return sentiment_summary