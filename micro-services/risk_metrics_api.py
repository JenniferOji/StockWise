from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
from pathlib import Path
import os
import numpy as np
import onnxruntime as ort

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
    risk_score: float


class StockRiskCategoryResponse(BaseModel):
    success: bool
    categories: dict[str, List[StockRiskCategory]]
    total: int


CLUSTER_CATEGORY = {
    # average variance from the trained KMeans clusters.
    0: "low",
    2: "moderate",
    1: "high",
}


def _predict_cluster_label(session, log_return: float, log_variance: float):
    model_input = session.get_inputs()[0].name
    outputs = session.run(
        None,
        {model_input: np.array([[log_return, log_variance]], dtype=np.float32)},
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

    # building the ticker list for the yfinance query
    tickers = []
    for stock in portfolio_request.stocks:
        ticker = stock.ticker:
            tickers.append(ticker)

    stock_features = get_stock_data(tickers, portfolio_request.days)

    if len(stock_features) == 0:
        raise HTTPException(status_code=404, detail="No price data found for the stocks")

    categories: dict[str, List[StockRiskCategory]] = {
        "low": [],
        "moderate": [],
        "high": [],
    }

    # predict the cluster label for each stock and assign the risk category
    for stock in portfolio_request.stocks:
        ticker = stock.ticker
        # getting the variance and return features for the stock to predict the cluster label
        features = stock_features.get(ticker)
        if not features:
            continue

        # using the model to predict the cluster label 
        cluster_label = _predict_cluster_label(
            kmeans_session,
            features["log_return"],
            features["log_variance"],
        )

        category = CLUSTER_CATEGORY.get(cluster_label)

        categories[category].append(
            StockRiskCategory(
                ticker=ticker,
                risk_bucket=category,
                risk_score=round(float(features["risk_score"]), 6),
            )
        )

    total = len(categories["low"]) + len(categories["moderate"]) + len(categories["high"])

    return {
        "success": True,
        "categories": categories,
        "total": total,
    }


