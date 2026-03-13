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

# preprocessing converts text to the numeric feature vectors used b the model - catboost cannot read text 
preproc_path = os.path.join(BASE_DIR, "ml", "models", "sentiment_preprocessor.onnx")
# takes the numeric feature vectors from the preprocessing step and predicts the sentiment class
model_path = os.path.join(BASE_DIR, "ml", "models", "sentiment_catboost_model.onnx")

preproc_sess = ort.InferenceSession(preproc_path, providers=["CPUExecutionProvider"])
model_sess = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

# loads the label dictionary to convert the model output back to the sentiment label
with open(os.path.join(BASE_DIR, "ml", "models", "sentiment_label_map.pkl"), "rb") as f:
    sentiment_label = pickle.load(f)

class StockRequest(BaseModel):
    names: List[str]


# only getting the first part of the company name to search for news as the api seems to work better with that.
def split_company_name(company_name: str):
    name = company_name.split('(')[0].strip()

    name = name.split(',')[0].strip()
    if '.' in name:
        name = name.split('.')[0]
    words = name.split()
   
    return words[0] if words else company_name

# checks if the headline mentions the stock by looking for the parameters in the headline
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


# formatting the date from the api for display
def format_date(value: str):
    if value is None:
        return None

    # handling unix timestamps - somethign returned by api endpoints
    if isinstance(value, (int, float)):
        dt = datetime.utcfromtimestamp(value)

    else:
        fixed = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(fixed)

    return dt.strftime("%d %b %Y")

# TEXT PREPROCESSIGN STPES - same as the preprocessing used during model training 

# reduces repeated characters to a max of 2 
def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)

# cleans text - removes urls, mentions, numbers
def text_preprocess(doc: str):
    temp = doc.lower()
    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)

    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)

    temp = re.sub("[0-9]", "", temp)
    temp = re.sub("'", " ", temp)

    # tokenising is when we split the text into individual words
    temp = word_tokenize(temp)

    temp = [reduce_lengthening(w) for w in temp]
    # lemmatisation is when we reduce words to their base form - running becomes run - this helps the model generalise better
    temp = [lemm.lemmatize(w) for w in temp]
    temp = [w for w in temp if len(w) > 1]
    temp = " ".join(temp)

    return temp

# gets the sentiment label for a list of texts by running them through the preprocessing and model onnx pipelines
def get_sentiment_labels(texts: List[str]):

    clean_texts = [text_preprocess(t) for t in texts]

    # initialising the input for the preprocessing model 
    preproc_input = preproc_sess.get_inputs()[0].name

    # running the preprocessing model to get the features for the sentiment model
    # preprocessing model take the clean text and converts them to numeric feature vectors as model inout 
    preproc_out = preproc_sess.run(
        None,
        {preproc_input: np.array([[t] for t in clean_texts], dtype=object)}
    )

    features = preproc_out[0]

    # initialising the input for the sentiment model
    model_input = model_sess.get_inputs()[0].name

    # running the sentiment model to get the sentiment predictions for the input features
    outputs = model_sess.run(
        None,
        {model_input: features}
    )

    labels = outputs[0].flatten()

    result = []
    for label in labels:
        # the label is a number representing the sentiment class 
        result.append(label)
    return result

SENTIMENT_SCORE = {
    "positive": 1,
    "neutral": 0,
    "negative": -1
}

# computes the average sentiment score for each stock based on the sentiment of the articles 
def compute_stock_sentiment(articles, names: List[str] | None = None):

    stock_scores = {}
    stock_counts = {}

    # for each article, we get the stock name and sentiment, convert the sentiment to a score using the SENTIMENT_SCORE dictionary and tally the scores and counts for each stock
    for article in articles:
        stock = article["name"]
        sentiment = article["sentiment"]

        score = SENTIMENT_SCORE.get(sentiment, 0)
        stock_scores[stock] = stock_scores.get(stock, 0) + score
        stock_counts[stock] = stock_counts.get(stock, 0) + 1

    results = {}

    # for each stock we compute the vaerage sentiment score and assign a label based on it 
    for stock in stock_scores:
        avg_score = stock_scores[stock] / stock_counts[stock]

        # the 0.33 threshold means at least 33% more positive articles than negative articles
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

    if names:
        for stock_name in names:
            if stock_name not in results:
                results[stock_name] = {
                    "score": 0.0,
                    "label": "neutral",
                    "articles": 0,
                }

    return results

# this endpoint fetches the news articles and gets a sentiment label for each 
@router.post("/stock-news")
def fetch_news_by_names(request: StockRequest, look_back_days: int = 0):
    api_key = os.getenv("FINNHUB_API_KEY") 
    
    names = request.names

    if len(names) == 0:
        raise HTTPException(status_code=400, detail="No stock names provided")

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

    article_texts = []
    article_refs = []

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

            article_texts.append(text)

            article_refs.append({
                "image": image,
                "name": names[i],
                "headline": headline,
                "source": article.get("source"),
                "url": url,
                "date": format_date(article.get("datetime")),
            })

    # formatted_articles = formatted_articles[:15]

    # using the onnx models to get the sentiment label 
    sentiments = get_sentiment_labels(article_texts) if article_texts else []

    # for each article we add the sentiment label to it
    for article, sentiment in zip(article_refs, sentiments):
        article["sentiment"] = sentiment
        formatted_articles.append(article)

    return {
        "success": True,
        "names": names,
        "count": len(formatted_articles),
        # "stock_sentiments": stock_sentiments,
        "articles": formatted_articles
    }

# thsi endpoint gets the sentiment summary for a list of stocks 
@router.post("/stock-sentiment")
def get_stock_sentiment(request: StockRequest):

    news = fetch_news_by_names(request, look_back_days=1)
    sentiment_summary = compute_stock_sentiment(news["articles"], request.names)

    return sentiment_summary