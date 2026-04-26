from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import numpy as np
import pandas as pd
import pickle
import json
import logging

# setting up router and loading required datasets and models
router = APIRouter()
logger = logging.getLogger(__name__)

class StockRiskCheckRequest(BaseModel):
    symbol: str

class PortfolioStock(BaseModel):
    symbol: str
    quantity: Optional[float] = None

class SimulateStockRequest(BaseModel):
    current_stocks: List[PortfolioStock]
    new_stock: PortfolioStock

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLUSTER_RISK_PATH = os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
PRICES_PATH = os.path.join(BASE_DIR, "data", "prices.csv")
STOCK_META_PATH = os.path.join(BASE_DIR, "data", "stocks.json")

df_features = pd.read_csv(FEATURES_PATH)
df_features["symbol"] = df_features["symbol"].astype(str).str.strip().str.upper().str.replace(".", "-", regex=False)
df_features.columns = df_features.columns.str.lower()
feature_map = df_features.set_index("symbol").to_dict(orient="index")

df_prices = pd.read_csv(PRICES_PATH, index_col=0, parse_dates=True)
df_prices.columns = df_prices.columns.astype(str).str.strip().str.upper()

with open(STOCK_META_PATH, "r") as f:
    STOCK_DATA = json.load(f)

# building lookup for stock metadata
STOCK_LOOKUP = {
    stock["symbol"].replace(".", "-").upper(): stock
    for stock in STOCK_DATA
    if stock.get("symbol")
}

with open(CLUSTER_RISK_PATH, "rb") as f:
    CLUSTER_CATEGORY = pickle.load(f)

# retrieving combined static and dynamic features for a stock
def calculate_dynamic_features(symbol: str):
    symbol = str(symbol).strip().upper().replace(".", "-")

    if symbol not in STOCK_LOOKUP:
        raise ValueError(f"Symbol '{symbol}' not found")

    features = feature_map.get(symbol)
    if not features:
        raise ValueError(f"Symbol '{symbol}' not found in dataset")

    meta = STOCK_LOOKUP[symbol]

    return {
        "symbol": symbol,
        "company_name": meta.get("companyName", ""),
        "sector": meta.get("sector", ""),
        "cluster_labels": int(features["cluster_labels"]),
        "log_variances": float(features["log_variances"]),
        "volatility": float(features["volatility"]),
        "var_95": float(features["var_95"]),
        "max_drawdown": float(features["max_drawdown"]),
        "annual_return": float(features["returns"]),
        "sharpe": float(features["sharpe"]),
    }

# mapping cluster label to human readable risk category
def map_cluster_to_risk(cluster_label: int):
    return CLUSTER_CATEGORY.get(cluster_label, "Unknown")

# calculating portfolio level risk metrics for simulation
def calculate_portfolio_metrics(stocks: List[PortfolioStock]):
    if not stocks:
        return None

    prices = df_prices.copy()
    prices = prices.dropna(axis=1, how="all")
    prices.ffill(inplace=True)
    prices.bfill(inplace=True)

    if prices.empty:
        return None

    latest_prices = prices.iloc[-1]

    holding_values = {}

    # calculating portfolio weights from holdings
    for stock in stocks:
        symbol = str(stock.symbol).strip().upper().replace(".", "-")

        if symbol not in STOCK_LOOKUP:
            continue

        if symbol not in latest_prices.index:
            continue

        quantity = stock.quantity if stock.quantity else 1
        latest_price = float(latest_prices[symbol])
        holding_value = quantity * latest_price

        if holding_value <= 0:
            continue

        if symbol in holding_values:
            holding_values[symbol] += holding_value
        else:
            holding_values[symbol] = holding_value

    if len(holding_values) == 0:
        return None

    portfolio_value = sum(holding_values.values())

    if portfolio_value <= 0:
        return None

    portfolio_symbols = [symbol for symbol in holding_values.keys() if symbol in prices.columns]

    if len(portfolio_symbols) == 0:
        return None

    # computing returns and risk metrics for portfolio
    prices = prices[portfolio_symbols]
    returns = prices.pct_change().dropna()

    if returns.empty:
        return None

    weights = np.array([holding_values[symbol] / portfolio_value for symbol in portfolio_symbols])
    portfolio_returns = returns.mul(weights, axis=1).sum(axis=1)

    portfolio_annual_return = float(portfolio_returns.mean() * 252)
    portfolio_volatility = float(portfolio_returns.std() * np.sqrt(252))
    portfolio_var = float(abs(np.percentile(portfolio_returns, 5)))

    cumulative = (1 + portfolio_returns).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    portfolio_drawdown = float(abs(drawdown.min()))

    risk_free_rate = 0.02

    if portfolio_volatility == 0:
        portfolio_sharpe = 0
    else:
        portfolio_sharpe = float((portfolio_annual_return - risk_free_rate) / portfolio_volatility)

    return {
        "volatility": round(portfolio_volatility * 100, 2),
        "var_95": round(portfolio_var * 100, 2),
        "max_drawdown": round(portfolio_drawdown * 100, 2),
        "annual_return": round(portfolio_annual_return * 100, 2),
        "sharpe": round(portfolio_sharpe, 3),
    }

# checking risk classification for a single stock
@router.post("/api/check-stock-risk")
def check_stock_risk(request: StockRiskCheckRequest):
    try:
        symbol = str(request.symbol).strip().upper().replace(".", "-")

        if symbol not in STOCK_LOOKUP:
            raise ValueError(f"Symbol '{symbol}' not found")

        stock_features = calculate_dynamic_features(symbol)
        cluster_label = int(stock_features["cluster_labels"])
        risk_label = map_cluster_to_risk(cluster_label)

        return {
            "success": True,
            "symbol": stock_features["symbol"],
            "company_name": stock_features["company_name"],
            "sector": stock_features["sector"],
            "cluster": cluster_label,
            "risk_level": risk_label,
            "metrics": {
                "volatility": round(stock_features["volatility"] * 100, 2),
                "max_drawdown": round(stock_features["max_drawdown"] * 100, 2),
                "annual_return": round(stock_features["annual_return"] * 100, 2),
            },
            "message": f"{stock_features['symbol']} is classified as {risk_label}",
        }

    except ValueError as e:
        logger.warning("Stock risk validation failed for symbol '%s': %s", request.symbol, str(e))
        raise HTTPException(status_code=400, detail=str(e))

# simulating impact of adding a new stock to portfolio
@router.post("/api/simulate-stock")
def simulate_stock(request: SimulateStockRequest):
    try:
        current_metrics = calculate_portfolio_metrics(request.current_stocks)

        projected_portfolio = list(request.current_stocks)
        projected_portfolio.append(request.new_stock)

        new_metrics = calculate_portfolio_metrics(projected_portfolio)

        if not current_metrics or not new_metrics:
            raise HTTPException(status_code=400, detail="Could not calculate portfolio metrics")

        symbol = str(request.new_stock.symbol).strip().upper().replace(".", "-")

        if symbol not in STOCK_LOOKUP:
            raise HTTPException(status_code=400, detail=f"Symbol '{symbol}' not found")

        # comparing before and after metrics to show impact
        return {
            "success": True,
            "symbol": symbol,
            "quantity": request.new_stock.quantity,
            "impact": {
                "volatility": {
                    "before": current_metrics["volatility"],
                    "after": new_metrics["volatility"],
                    "change": round(new_metrics["volatility"] - current_metrics["volatility"], 2),
                },
                "var_95": {
                    "before": current_metrics["var_95"],
                    "after": new_metrics["var_95"],
                    "change": round(new_metrics["var_95"] - current_metrics["var_95"], 2),
                },
                "max_drawdown": {
                    "before": current_metrics["max_drawdown"],
                    "after": new_metrics["max_drawdown"],
                    "change": round(new_metrics["max_drawdown"] - current_metrics["max_drawdown"], 2),
                },
                "annual_return": {
                    "before": current_metrics["annual_return"],
                    "after": new_metrics["annual_return"],
                    "change": round(new_metrics["annual_return"] - current_metrics["annual_return"], 2),
                },
                "sharpe": {
                    "before": current_metrics["sharpe"],
                    "after": new_metrics["sharpe"],
                    "change": round(new_metrics["sharpe"] - current_metrics["sharpe"], 3),
                },
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))