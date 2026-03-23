from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
from pathlib import Path
import os
import numpy as np
import pickle
import pandas as pd

from risk_metrics import (
    get_stock_data,
    get_portfolio_data, 
    calculate_portfolio_value, 
    calculate_returns,
    calculate_risk_metrics
)

router = APIRouter() 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")
KMEANS_PATH = os.path.join(BASE_DIR, "models", "kmeans.pkl")

df_features = pd.read_csv(FEATURES_PATH)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(KMEANS_PATH, "rb") as f:
    kmeans = pickle.load(f)

# The cluster risk mapping is needed to assign the risk category to the stocks based on the predicted cluster label from the kmeans model
CLUSTER_RISK_PATH = os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl")
with open(CLUSTER_RISK_PATH, "rb") as f:
    cluster_risk_mapping = pickle.load(f)

CLUSTER_CATEGORY = cluster_risk_mapping

feature_map = df_features.set_index("ticker").to_dict(orient="index")

# pydantic models for request validation and type checking
class Stock(BaseModel):
    ticker: str  
    shares: float 
    purchase_price: float 

class PortfolioRequest(BaseModel):
    stocks: List[Stock]  
    days: int = 365

class StockRiskCategory(BaseModel):
    ticker: str
    risk_bucket: str
    volatility: float
    max_drawdown: float
    annual_return: float

class StockRiskCategoryResponse(BaseModel):
    success: bool
    categories: dict[str, List[StockRiskCategory]]
    total: int

def predict_cluster_label(log_return, log_variance, volatility, max_drawdown):

    features = np.array([[log_return, log_variance, volatility, max_drawdown]])

    scaled_features = scaler.transform(features)

    labels = kmeans.predict(scaled_features)

    return int(labels[0])

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

# this endpoint gets the risk category for each stock in the portfolio based on the model
@router.post("/api/stock-risk-categories", response_model=StockRiskCategoryResponse)
def calculate_stock_risk_categories(portfolio_request: PortfolioRequest):

    if len(portfolio_request.stocks) == 0:
        raise HTTPException(status_code=400, detail="No stocks provided")

    tickers = list({stock.ticker for stock in portfolio_request.stocks})

    if len(feature_map) == 0:
        raise HTTPException(status_code=404, detail="No price data found for the stocks")

    categories: dict[str, List[StockRiskCategory]] = {
        "Very Low Risk": [],
        "Low Risk": [],
        "Moderate Risk": [],
        "High Risk": [],
        "Very High Risk": [],
    }

    # predict the cluster label for each stock and assign the risk category
    for ticker in tickers:

        features = feature_map.get(ticker)

        if not features:
            continue

        # passes into the model the required features to get the cluster label 
        cluster_label = predict_cluster_label(
            features["log_return"],
            features["log_variance"],
            features["volatility"],
            features["max_drawdown"],
        )

        # mapping the cluster label (0,1,2...) to the label mapping (low/moderate risk...)
        category = CLUSTER_CATEGORY.get(cluster_label, "Moderate Risk")

        categories[category].append(
            StockRiskCategory(
                ticker=ticker,
                risk_bucket=category,
                volatility=round(features["volatility"] * 100, 2),
                max_drawdown=round(features["max_drawdown"] * 100, 2),
                annual_return=round(np.expm1(features["log_return"]) * 100, 2),
            )
        )
        
    total = sum(len(v) for v in categories.values())

    print("API returning categories:", categories)

    return {
        "success": True,
        "categories": categories,
        "total": total,
    }