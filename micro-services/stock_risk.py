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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SCALER_PATH = os.path.join(BASE_DIR, "models", "stock_scaler.pkl")
GMM_PATH = os.path.join(BASE_DIR, "models", "gmm_model.pkl")
CLUSTER_RISK_PATH = os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
STOCK_META_PATH = os.path.join(BASE_DIR, "data", "stocks.json")

df_features = pd.read_csv(FEATURES_PATH)
df_features["ticker"] = df_features["ticker"].astype(str).str.strip().str.upper()
feature_map = df_features.set_index("ticker").to_dict(orient="index")

with open(STOCK_META_PATH, "r") as f:
    stock_list = json.load(f)

stock_meta = {
    str(item.get("symbol", "")).strip().upper(): {
        "company_name": item.get("companyName", ""),
        "sector": item.get("sector", ""),
    }
    for item in stock_list
    if str(item.get("symbol", "")).strip()
}

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(GMM_PATH, "rb") as f:
    gmm = pickle.load(f)

with open(CLUSTER_RISK_PATH, "rb") as f:
    CLUSTER_CATEGORY = pickle.load(f)

def predict_cluster(row_dict: dict[str, float]) -> int:
    features = np.array([[
        row_dict["Log_Variances"],
        row_dict["Volatility"],
        row_dict["VaR_95"]
    ]])
    scaled_features = scaler.transform(features)
    return int(gmm.predict(scaled_features)[0])

def normalize_symbol(raw_symbol: str) -> str:
    if raw_symbol is None:
        return ""

    cleaned = "".join(ch for ch in str(raw_symbol).upper().strip() if ch.isalnum() or ch in {".", "-"})
    return cleaned

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

    vols = []
    vars_ = []
    drawdowns = []
    returns = []
    sharpes = []
    weights = []

    for stock in stocks:
        try:
            features = calculate_dynamic_features(stock.symbol)
        except Exception:
            continue

        qty = stock.quantity if stock.quantity else 1

        vols.append(features["Volatility"])
        vars_.append(features["VaR_95"])
        drawdowns.append(features["max_drawdown"])
        returns.append(features["annual_return"])
        sharpes.append(features["sharpe"])
        weights.append(qty)

    if not vols:
        return None

    total_weight = np.sum(weights)
    if total_weight <= 0:
        return None

    weights = np.array(weights) / total_weight

    vols = np.array(vols)
    vars_ = np.array(vars_)
    drawdowns = np.array(drawdowns)
    returns = np.array(returns)
    sharpes = np.array(sharpes)

    portfolio_vol = float(np.sum(vols * weights))
    portfolio_var = float(np.sum(vars_ * weights))
    portfolio_drawdown = float(np.min(drawdowns))
    portfolio_return = float(np.sum(returns * weights))
    portfolio_sharpe = float(np.sum(sharpes * weights))

    return {
        "volatility": round(portfolio_vol * 100, 2),
        "var_95": round(portfolio_var * 100, 2),
        "max_drawdown": round(portfolio_drawdown * 100, 2),
        "annual_return": round(portfolio_return * 100, 2),
        "sharpe": round(portfolio_sharpe, 3),
    }

@router.post("/api/check-stock-risk")
def check_stock_risk(request: StockRiskCheckRequest):
    try:
        symbol = normalize_symbol(request.symbol)

        stock_features = calculate_dynamic_features(symbol)

        cluster_label = predict_cluster({
            "Log_Variances": stock_features["Log_Variances"],
            "Volatility": stock_features["Volatility"],
            "VaR_95": stock_features["VaR_95"],
        })

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
            "symbol": request.new_stock.symbol,
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))