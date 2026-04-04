from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import yfinance as yf
import os
import numpy as np
import pandas as pd
import pickle

router = APIRouter()

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

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(GMM_PATH, "rb") as f:
    gmm = pickle.load(f)

CLUSTER_RISK_PATH = os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl")
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


def calculate_max_drawdown_from_returns(simple_returns: pd.Series) -> float:
    cumulative = (1 + simple_returns).cumprod()
    peak = cumulative.cummax()
    drawdown = (cumulative - peak) / peak
    return float(drawdown.min())


def calculate_dynamic_features(symbol: str):
    ticker = yf.Ticker(symbol)
    history = ticker.history(period="1y", auto_adjust=True)

    if history.empty or "Close" not in history.columns:
        raise ValueError("No price history found for this ticker")

    close_prices = history["Close"].dropna()

    if len(close_prices) < 30:
        raise ValueError("Not enough price history to calculate risk metrics")

    # IMPORTANT: must match training pipeline exactly
    simple_returns = close_prices.pct_change().dropna()

    if len(simple_returns) == 0:
        raise ValueError("Could not calculate returns for this ticker")

    # match training exactly
    variance = float(simple_returns.var() * 252)

    if variance <= 0:
        raise ValueError("Variance must be greater than zero")

    log_variances = float(np.log1p(np.clip(variance, 0, 2)))
    volatility = float(simple_returns.std() * np.sqrt(252))
    var_95 = float(abs(np.percentile(simple_returns, 5)))

    max_drawdown = calculate_max_drawdown_from_returns(simple_returns)

    annual_return = float(simple_returns.mean() * 252)

    risk_free_rate = 0.02
    sharpe = 0.0
    if volatility != 0:
        sharpe = float((annual_return - risk_free_rate) / volatility)

    info = {}
    try:
        info = ticker.info or {}
    except Exception:
        info = {}

    return {
        "symbol": symbol.upper(),
        "company_name": info.get("longName") or info.get("shortName") or symbol.upper(),
        "sector": info.get("sector") or "Unknown",
        "Log_Variances": log_variances,
        "Volatility": volatility,
        "VaR_95": var_95,
        "max_drawdown": max_drawdown,
        "annual_return": annual_return,
        "sharpe": sharpe,
        "simple_returns": simple_returns,
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
    return_series = []

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
        return_series.append(features["simple_returns"].rename(stock.symbol))

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

    if return_series:
        aligned_returns = pd.concat(return_series, axis=1, join="inner").dropna()
        if not aligned_returns.empty:
            weighted_portfolio_returns = aligned_returns.mul(weights, axis=1).sum(axis=1)
            portfolio_drawdown = calculate_max_drawdown_from_returns(weighted_portfolio_returns)
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
        stock_features = calculate_dynamic_features(request.symbol)

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
                "log_variances": round(stock_features["Log_Variances"], 6),
                "volatility": round(stock_features["Volatility"] * 100, 2),
                "var_95": round(stock_features["VaR_95"] * 100, 2),
            },
            "message": f"{stock_features['symbol']} is classified as {risk_label}",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# this endpoint simulates adding a new stock to the portfolio and shows the change in risk metrics - useful for users to understand the impact of adding a new stock
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