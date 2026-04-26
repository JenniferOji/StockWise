from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import sys
import os
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import load_features, load_prices, load_cluster_risk

# setting up api router and loading datasets
router = APIRouter() 

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

df_features = load_features()
df_features.columns = df_features.columns.str.lower()
df_prices = load_prices()
cluster_risk_mapping = load_cluster_risk()

CLUSTER_CATEGORY = cluster_risk_mapping

feature_map = df_features.set_index("symbol").to_dict(orient="index")

# request and response models for risk endpoints
class Stock(BaseModel):
    symbol: str  
    shares: float 
    purchase_price: float 

class PortfolioRequest(BaseModel):
    stocks: List[Stock]  
    days: int = 365

class StockRiskCategory(BaseModel):
    symbol: str
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

@router.get("/")
def root():
    return {"message": "Risk metrics API"}

# calculating overall portfolio risk metrics using historical price data
@router.post("/api/risk-metrics")
def calculate_portfolio_risk_metrics(portfolio_request: PortfolioRequest):
    if len(portfolio_request.stocks) == 0:
        raise HTTPException(status_code=400, detail="No stocks provided")

    symbols = list({stock.symbol.replace(".", "-") for stock in portfolio_request.stocks})

    prices = df_prices.copy()

    # filtering available symbols and preparing price data
    available_symbols = [symbol for symbol in symbols if symbol in prices.columns]

    if len(available_symbols) == 0:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    prices = prices[available_symbols]
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

    # calculating portfolio weights based on current market value
    for stock in portfolio_request.stocks:
        symbol = stock.symbol.replace(".", "-")

        if symbol not in latest_prices.index:
            continue

        latest_price = latest_prices[symbol]
        holding_value = stock.shares * latest_price
        portfolio_value += holding_value
        weights[symbol] = holding_value

    if portfolio_value == 0:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    for symbol in weights:
        weights[symbol] = weights[symbol] / portfolio_value

    portfolio_symbols = [symbol for symbol in weights.keys() if symbol in returns.columns]

    if len(portfolio_symbols) == 0:
        raise HTTPException(status_code=404, detail="No return data for the tickers")

    # computing portfolio level return series and risk metrics
    weights_array = np.array([weights[symbol] for symbol in portfolio_symbols])
    portfolio_returns = returns[portfolio_symbols].mul(weights_array, axis=1).sum(axis=1)

    portfolio_annual_return = portfolio_returns.mean() * 252
    portfolio_volatility = portfolio_returns.std() * np.sqrt(252)
    portfolio_var_95 = abs(np.percentile(portfolio_returns, 5)) * np.sqrt(252)
    portfolio_var_95 = abs(np.percentile(portfolio_returns, 5))

    cumulative = (1 + portfolio_returns).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    portfolio_max_drawdown = abs(drawdown.min())

    risk_free_rate = 0.02

    if portfolio_volatility == 0:
        portfolio_sharpe = 0
    else:
        portfolio_sharpe = (portfolio_annual_return - risk_free_rate) / portfolio_volatility

    # converting metrics to percentage format for output
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

# assigning each stock to a risk category using cluster mapping
@router.post("/api/stock-risk-categories", response_model=StockRiskCategoryResponse)
def calculate_stock_risk_categories(portfolio_request: PortfolioRequest):

    if len(portfolio_request.stocks) == 0:
        raise HTTPException(status_code=400, detail="No stocks provided")

    symbols = list({stock.symbol for stock in portfolio_request.stocks})

    if len(feature_map) == 0:
        raise HTTPException(status_code=404, detail="No price data found for the stocks")

    categories: dict[str, List[StockRiskCategory]] = {
        "Very Low Risk": [],
        "Low Risk": [],
        "Moderate Risk": [],
        "High Risk": [],
        "Very High Risk": [],
        "Extreme Risk": [],
    }

    cluster_counts = {}

    # mapping each stock to its risk bucket using precomputed clusters
    for symbol in symbols:

        symbol = symbol.replace(".", "-")  
        features = feature_map.get(symbol)

        if not features:
            continue

        cluster_label = int(features["cluster_labels"])
        category = CLUSTER_CATEGORY.get(cluster_label, "Moderate Risk")

        cluster_counts[category] = cluster_counts.get(category, 0) + 1

        categories[category].append(
            StockRiskCategory(
                symbol=symbol,
                risk_bucket=category,
                volatility=round(features["volatility"] * 100, 2),
                max_drawdown=round(features.get("max_drawdown", 0) * 100, 2),
                annual_return=round(features["returns"] * 100, 2),
                sharpe=round(features.get("sharpe", 0), 3),
                var_95=round(features["var_95"] * 100, 2),
            )
        )

    total = sum(len(v) for v in categories.values())

    # determining overall portfolio risk based on majority category
    if not cluster_counts:
        overall_risk = "Unknown"
    else:
        overall_risk = max(cluster_counts, key=cluster_counts.get)

    return {
        "success": True,
        "categories": categories,
        "total": total,
        "portfolio_risk": overall_risk,
    }