from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import numpy as np
import pandas as pd
import pickle
import json
import logging

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
df_features["ticker"] = df_features["ticker"].astype(str).str.strip().str.upper()
feature_map = df_features.set_index("ticker").to_dict(orient="index")

df_prices = pd.read_csv(PRICES_PATH, index_col=0, parse_dates=True)
df_prices.columns = df_prices.columns.astype(str).str.strip().str.upper()

with open(STOCK_META_PATH, "r") as f:
    stock_list = json.load(f)

stock_meta = {
    str(item.get("symbol", "")).strip().upper().replace(".", "-"): {
        "company_name": item.get("companyName", ""),
        "sector": item.get("sector", ""),
    }
    for item in stock_list
    if str(item.get("symbol", "")).strip()
}

with open(CLUSTER_RISK_PATH, "rb") as f:
    CLUSTER_CATEGORY = pickle.load(f)

def normalize_symbol(raw_symbol: str) -> str:
    if raw_symbol is None:
        return ""

    cleaned = "".join(ch for ch in str(raw_symbol).upper().strip() if ch.isalnum() or ch in {".", "-"})
    return cleaned.replace(".", "-")

def calculate_dynamic_features(symbol: str):
    symbol = normalize_symbol(symbol)

    if not symbol:
        raise ValueError("Symbol is required")

    features = feature_map.get(symbol)
    if not features:
        raise ValueError(f"Ticker '{symbol}' not found in dataset")

    meta = stock_meta.get(symbol)
    if not meta:
        raise ValueError(f"Ticker metadata not found for '{symbol}'")

    return {
        "symbol": symbol,
        "company_name": meta["company_name"],
        "sector": meta["sector"],
        "Cluster_labels": int(features["Cluster_labels"]),
        "Log_Variances": float(features["Log_Variances"]),
        "Volatility": float(features["Volatility"]),
        "VaR_95": float(features["VaR_95"]),
        "max_drawdown": float(features["max_drawdown"]),
        "annual_return": float(features["returns"]),
        "sharpe": float(features["Sharpe"]),
    }

def map_cluster_to_risk(cluster_label: int):
    return CLUSTER_CATEGORY.get(cluster_label, "Unknown")

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

    for stock in stocks:
        symbol = normalize_symbol(stock.symbol)

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

@router.post("/api/check-stock-risk")
def check_stock_risk(request: StockRiskCheckRequest):
    try:
        symbol = normalize_symbol(request.symbol)

        stock_features = calculate_dynamic_features(symbol)

        cluster_label = int(stock_features["Cluster_labels"])

        risk_label = map_cluster_to_risk(cluster_label)

        return {
            "success": True,
            "symbol": stock_features["symbol"],
            "company_name": stock_features["company_name"],
            "sector": stock_features["sector"],
            "cluster": cluster_label,
            "risk_level": risk_label,
            "metrics": {
                "volatility": round(stock_features["Volatility"] * 100, 2),
                "max_drawdown": round(stock_features["max_drawdown"] * 100, 2),
                "annual_return": round(stock_features["annual_return"] * 100, 2),
            },
            "message": f"{stock_features['symbol']} is classified as {risk_label}",
        }

    except ValueError as e:
        logger.warning("Stock risk validation failed for symbol '%s': %s", request.symbol, str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/simulate-stock")
def simulate_stock(request: SimulateStockRequest):
    try:
        current_metrics = calculate_portfolio_metrics(request.current_stocks)

        projected_portfolio = list(request.current_stocks)
        projected_portfolio.append(request.new_stock)

        new_metrics = calculate_portfolio_metrics(projected_portfolio)

        if not current_metrics or not new_metrics:
            raise HTTPException(status_code=400, detail="Could not calculate portfolio metrics")

        return {
            "success": True,
            "symbol": normalize_symbol(request.new_stock.symbol),
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