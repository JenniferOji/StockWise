from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
from pathlib import Path
import os
import numpy as np
import onnxruntime as ort
import pickle

from risk_metrics import (
    get_stock_data,
    get_portfolio_data, 
    calculate_portfolio_value, 
    calculate_returns,
    calculate_risk_metrics
)

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[1]
KMEANS_MODEL_PATH = BASE_DIR / "ml" / "models" / "kmeans_stock_clustering.onnx"
kmeans_session = ort.InferenceSession(str(KMEANS_MODEL_PATH), providers=["CPUExecutionProvider"])

# the scaler is needed to scale the input features for the kmeans model to predict the cluster labels for the stocks 
SCALER_PATH = BASE_DIR / "ml" / "models" / "stock_scaler.pkl"
with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

# The cluster risk mapping is needed to assign the risk category to the stocks based on the predicted cluster label from the kmeans model
CLUSTER_RISK_PATH = BASE_DIR / "ml" / "models" / "cluster_risk_mapping.pkl"
with open(CLUSTER_RISK_PATH, "rb") as f:
    cluster_risk_mapping = pickle.load(f)

CLUSTER_CATEGORY = cluster_risk_mapping

# pydantic models for request validation and type checking
class Stock(BaseModel):
    ticker: str  
    shares: float 
    purchase_price: float 

class PortfolioRequest(BaseModel):
    stocks: List[Stock]  
    days: int = 730


class StockRiskCategory(BaseModel):
    ticker: str
    risk_bucket: str
    risk_score: float


class StockRiskCategoryResponse(BaseModel):
    success: bool
    categories: dict[str, List[StockRiskCategory]]
    total: int

def predict_cluster_label(session, log_return, log_variance, volatility, max_drawdown):

    features = np.array([[log_return, log_variance, volatility, max_drawdown]])

    scaled_features = scaler.transform(features)

    model_input = session.get_inputs()[0].name

    outputs = session.run(
        None,
        {model_input: scaled_features.astype(np.float32)}
    )

    labels = outputs[0]

    return int(np.ravel(labels)[0])

@router.get("/")
def root():
    return {"message": "Risk metrics API"}

@router.post("/api/risk-metrics")
def calculate_portfolio_risk_metrics(portfolio_request: PortfolioRequest):
    portfolio = {}
    for stock in portfolio_request.stocks:
        portfolio[stock.ticker] = {
            'shares': stock.shares,
            'purchase_price': stock.purchase_price
        }

    # calculate date range for historical data analysis
    start_date = (datetime.now() - timedelta(days=portfolio_request.days)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')

    # fetch historical price data from yahoo finance via yfinance library
    price_data = get_portfolio_data(portfolio, start_date, end_date)
    
    # validate that the data was recieved for the tickers
    if price_data.empty:
        raise HTTPException(status_code=404, detail="No data for the tickers")
    
    # calculate total portfolio value over time 
    portfolio_value = calculate_portfolio_value(price_data, portfolio)
    
    # calculate daily returns and cumulative returns
    daily_returns, cumulative_returns = calculate_returns(portfolio_value)
    
    # calculate all risk metrics: volatility, sharpe ratio, max drawdown, and var
    risk_metrics = calculate_risk_metrics(daily_returns)
    
    current_portfolio_value = portfolio_value['Total'].values[-1]
    
    return {
        "success": True,
        "metrics": risk_metrics,
        "portfolio_value": current_portfolio_value
    }

@router.post("/api/stock-risk-categories", response_model=StockRiskCategoryResponse)
def calculate_stock_risk_categories(portfolio_request: PortfolioRequest):

    if len(portfolio_request.stocks) == 0:
        raise HTTPException(status_code=400, detail="No stocks provided")

    tickers = list({stock.ticker for stock in portfolio_request.stocks})

    stock_features = get_stock_data(tickers, portfolio_request.days)

    if len(stock_features) == 0:
        raise HTTPException(status_code=404, detail="No price data found for the stocks")

    categories: dict[str, List[StockRiskCategory]] = {
        "very_low_risk": [],
        "low_risk": [],
        "moderate_risk": [],
        "high_risk": [],
        "very_high_risk": [],
    }

    # predict the cluster label for each stock and assign the risk category
    for ticker in tickers:

        features = stock_features.get(ticker)

        if not features:
            continue

        cluster_label = predict_cluster_label(
            kmeans_session,
            features["log_return"],
            features["log_variance"],
            features["volatility"],
            features["max_drawdown"],
        )

        risk_label = CLUSTER_CATEGORY.get(cluster_label, "Moderate Risk")

        category = risk_label.lower().replace(" ", "_")

        categories[category].append(
            StockRiskCategory(
                ticker=ticker,
                risk_bucket=category,
                risk_score=round(float(features["risk_score"]), 6),
            )
        )

    total = sum(len(v) for v in categories.values())

    return {
        "success": True,
        "categories": categories,
        "total": total,
    }