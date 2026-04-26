import os
import pickle
from datetime import datetime, timedelta

import numpy as np
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from dotenv import load_dotenv
import re
import onnxruntime as ort
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# loading environment variables and setting up api router
load_dotenv()
router = APIRouter()

lemm = WordNetLemmatizer()

# setting up base directory and loading onnx sentiment model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(BASE_DIR, "models", "svm_model.onnx")
model_sess = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

# mapping model outputs to sentiment labels
labels = ["negative", "neutral", "positive"]

class StockRequest(BaseModel):
    names: List[str]

# extracting simplified company name for search queries
def split_company_name(company_name: str):
    name = company_name.split('(')[0].strip()
    name = name.split(',')[0].strip()
    if '.' in name:
        name = name.split('.')[0]
    words = name.split()
    return words[0] if words else company_name

# checking if article headline actually mentions the company
def title_mentions_stock(headline: str, company_name: str, shortened_company_name: str, symbol: str):
    headline_lower = headline.lower()
    company_base = company_name.split('(')[0].strip().lower()

    if shortened_company_name and shortened_company_name.lower() in headline_lower:
        return True
    if symbol and symbol.lower() in headline_lower:
        return True
    if company_base and company_base in headline_lower:
        return True

    return False

# converting timestamps into readable date format
def format_date(value: str):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        dt = datetime.utcfromtimestamp(value)
    else:
        fixed = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(fixed)

    return dt.strftime("%d %b %Y")

# normalising repeated characters in text
def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)

# cleaning and preprocessing text before passing to model
def text_preprocess(doc: str):
    temp = doc.lower()
    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)
    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)
    temp = re.sub("'", " ", temp)

    tokens = word_tokenize(temp)
    tokens = [reduce_lengthening(w) for w in tokens]
    tokens = [lemm.lemmatize(w) for w in tokens]
    tokens = [w for w in tokens if len(w) > 2]

    return " ".join(tokens)

# running sentiment model on list of texts
def get_sentiment_labels(texts: List[str]):
    clean_texts = [text_preprocess(t) for t in texts]

    model_input = model_sess.get_inputs()[0].name
    inputs = np.array(clean_texts, dtype=object).reshape(-1, 1)

    outputs = model_sess.run(None, {model_input: inputs})
    predictions = outputs[0]

    result = []
    for pred in predictions:
        if isinstance(pred, (str, np.str_)):
            result.append(pred)
        else:
            result.append(labels[int(pred)])
    return result

# mapping sentiment labels to numeric scores
SENTIMENT_SCORE = {
    "positive": 1,
    "neutral": 0,
    "negative": -1
}

# aggregating sentiment scores per stock
def compute_stock_sentiment(articles, names: List[str] | None = None):

    stock_scores = {}
    stock_counts = {}

    for article in articles:
        stock = article.get("symbol")
        sentiment = article.get("linearsvm_model", "neutral")

        score = SENTIMENT_SCORE.get(sentiment, 0)
        stock_scores[stock] = stock_scores.get(stock, 0) + score
        stock_counts[stock] = stock_counts.get(stock, 0) + 1

    results = {}

    # converting average score into final sentiment label
    for stock in stock_scores:
        avg_score = stock_scores[stock] / stock_counts[stock]

        if avg_score > 0.33:
            label = "positive"
        elif avg_score < -0.33:
            label = "negative"
        else:
            label = "neutral"

        results[stock] = {
            "score": round(avg_score, 3),
            "label": label,
            "articles": stock_counts[stock]
        }

    return results

# fetching news articles and attaching sentiment predictions
@router.post("/stock-news")
def fetch_news_by_names(request: StockRequest, look_back_days: int = 0):
    api_key = os.getenv("FINNHUB_API_KEY") 
    names = request.names

    if len(names) == 0:
        raise HTTPException(status_code=400, detail="No stock names provided")

    search_terms = [split_company_name(name) for name in names]

    # calculating date range for news query
    to_date = datetime.utcnow().date()
    if look_back_days <= 1:
        from_date = to_date
    else:
        from_date = to_date - timedelta(days=look_back_days - 1)

    formatted_articles = []
    seen_urls = set()

    article_texts = []
    article_refs = []

    # fetching company symbols and related news from api
    for i, search_term in enumerate(search_terms):
        try:
            search_resp = requests.get(
                "https://finnhub.io/api/v1/search",
                params={"q": search_term, "token": api_key},
                timeout=10,
            )
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
            articles = news_resp.json()
        except requests.RequestException:
            continue

        if not isinstance(articles, list):
            continue

        # filtering and collecting valid articles
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

            text = headline + " " + summary
            article_texts.append(text)

            article_refs.append({
                "image": image,
                "name": names[i],
                "symbol": symbol, 
                "headline": headline,
                "source": article.get("source"),
                "url": url,
                "date": format_date(article.get("datetime")),
            })

    # running sentiment model and attaching results
    linearsvm_sentiments = get_sentiment_labels(article_texts) if article_texts else []

    for article, sentiment in zip(article_refs, linearsvm_sentiments):
        article["linearsvm_model"] = sentiment
        formatted_articles.append(article)

    return {
        "success": True,
        "names": names,
        "count": len(formatted_articles),
        "articles": formatted_articles
    }

# endpoint to summarise sentiment per stock
@router.post("/stock-sentiment")
def get_stock_sentiment(request: StockRequest):

    news = fetch_news_by_names(request, look_back_days=1)
    sentiment_summary = compute_stock_sentiment(news["articles"], request.names)

    return sentiment_summary