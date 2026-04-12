from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import os
import numpy as np
import pickle
import pandas as pd

router = APIRouter() 

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
PRICES_PATH = os.path.join(BASE_DIR, "data", "prices.csv")
SCALER_PATH = os.path.join(BASE_DIR, "models", "stock_scaler.pkl")
GMM_PATH = os.path.join(BASE_DIR, "models", "gmm_model.pkl")

df_features = pd.read_csv(FEATURES_PATH)
df_prices = pd.read_csv(PRICES_PATH, index_col=0, parse_dates=True)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(GMM_PATH, "rb") as f:
    gmm = pickle.load(f)

# the cluster risk mapping is needed to assign the risk category to the stocks based on the predicted cluster label from the gmm model
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
    sharpe: float
    var_95: float 

class StockRiskCategoryResponse(BaseModel):
    success: bool
    categories: dict[str, List[StockRiskCategory]]
    total: int
    portfolio_risk: str

# predicts the cluster label for a stock using the 3 features the model was trained on
def predict_cluster_label(log_variance, volatility, var_95):
    features = np.array([[log_variance, volatility, var_95]])
    scaled_features = scaler.transform(features)
    labels = gmm.predict(scaled_features)
    return int(labels[0])

@router.get("/")
def root():
    return {"message": "Risk metrics API"}

@router.post("/api/risk-metrics")
def calculate_portfolio_risk_metrics(portfolio_request: PortfolioRequest):
    if len(portfolio_request.stocks) == 0:
        raise HTTPException(status_code=400, detail="No stocks provided")

    tickers = list({stock.ticker.replace(".", "-") for stock in portfolio_request.stocks})

    prices = df_prices.copy()

    available_tickers = [ticker for ticker in tickers if ticker in prices.columns]

    if len(available_tickers) == 0:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    prices = prices[available_tickers]
    prices = prices.dropna(axis=1, how="all")
    prices.ffill(inplace=True)
    prices.bfill(inplace=True)

    if prices.empty:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    latest_prices = prices.iloc[-1]
    returns = prices.pct_change().dropna()

    if returns.empty:
        raise HTTPException(status_code=404, detail="Not enough return data to calculate portfolio metrics")

    weights = {}
    portfolio_value = 0

    for stock in portfolio_request.stocks:
        ticker = stock.ticker.replace(".", "-")

        if ticker not in latest_prices.index:
            continue

        latest_price = latest_prices[ticker]
        holding_value = stock.shares * latest_price
        portfolio_value += holding_value
        weights[ticker] = holding_value

    if portfolio_value == 0:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    for ticker in weights:
        weights[ticker] = weights[ticker] / portfolio_value

    portfolio_tickers = [ticker for ticker in weights.keys() if ticker in returns.columns]

    if len(portfolio_tickers) == 0:
        raise HTTPException(status_code=404, detail="No return data for the tickers")

    weights_array = np.array([weights[ticker] for ticker in portfolio_tickers])
    portfolio_returns = returns[portfolio_tickers].mul(weights_array, axis=1).sum(axis=1)

    portfolio_annual_return = portfolio_returns.mean() * 252
    portfolio_volatility = portfolio_returns.std() * np.sqrt(252)
    portfolio_var_95 = abs(np.percentile(portfolio_returns, 5))

    cumulative = (1 + portfolio_returns).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    portfolio_max_drawdown = abs(drawdown.min())

    risk_free_rate = 0.02

    if portfolio_volatility == 0:
        portfolio_sharpe = 0
    else:
        portfolio_sharpe = (portfolio_annual_return - risk_free_rate) / portfolio_volatility
        
    portfolio_volatility *= 100
    portfolio_annual_return *= 100
    portfolio_max_drawdown *= 100
    portfolio_var_95 *= 100

    return {
        "success": True,
        "metrics": {
            "volatility": f"{portfolio_volatility:.2f}%",
            "annual_return": f"{portfolio_annual_return:.2f}%",
            "max_drawdown": f"{portfolio_max_drawdown:.2f}%",
            "sharpe": f"{portfolio_sharpe:.3f}",
            "var_95": f"{portfolio_var_95:.2f}%"
        },
        "portfolio_value": round(portfolio_value, 2)
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

    cluster_counts = {}

    # assigning the risk categegory for each stock 
    for ticker in tickers:

        features = feature_map.get(ticker)

        if not features:
            continue

        # using the precomputed cluster label from the features CSV
        cluster_label = int(features["Cluster_labels"])

        category = CLUSTER_CATEGORY.get(cluster_label, "Moderate Risk")

        cluster_counts[category] = cluster_counts.get(category, 0) + 1

        categories[category].append(
            StockRiskCategory(
                ticker=ticker,
                risk_bucket=category,
                volatility=round(features["Volatility"] * 100, 2),
                max_drawdown=round(features["max_drawdown"] * 100, 2),
                annual_return=round(features["returns"] * 100, 2),
                sharpe=round(features["Sharpe"], 3),
                var_95=round(features["VaR_95"] * 100, 2),
            )
        )
        
    total = sum(len(v) for v in categories.values())

    if not cluster_counts:
        overall_risk = "Unknown"
    else:
        overall_risk = max(cluster_counts, key=cluster_counts.get)

    print("API returning categories:", categories)

    return {
        "success": True,
        "categories": categories,
        "total": total,
        "portfolio_risk": overall_risk,
    }