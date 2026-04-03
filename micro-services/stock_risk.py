from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
import os
import numpy as np
import pickle

router = APIRouter()

class StockRiskCheckRequest(BaseModel):
    symbol: str


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SCALER_PATH = os.path.join(BASE_DIR, "models", "stock_scaler.pkl")
GMM_PATH = os.path.join(BASE_DIR, "models", "gmm_model.pkl")

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(GMM_PATH, "rb") as f:
    gmm = pickle.load(f)

# the cluster risk mapping is needed to assign the risk category to the stocks based on the predicted cluster label from the gmm model
CLUSTER_RISK_PATH = os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl")
with open(CLUSTER_RISK_PATH, "rb") as f:
    CLUSTER_CATEGORY = pickle.load(f)


def predict_cluster(row_dict: dict[str, float]) -> int:
    features = np.array([[row_dict["Log_Variances"], row_dict["Volatility"], row_dict["VaR_95"]]])
    scaled_features = scaler.transform(features)
    return int(gmm.predict(scaled_features)[0])


def calculate_dynamic_features(symbol: str):
    ticker = yf.Ticker(symbol)
    history = ticker.history(period="1y", auto_adjust=True)

    if history.empty or "Close" not in history.columns:
        raise ValueError("No price history found for this ticker")

    close_prices = history["Close"].dropna()

    if len(close_prices) < 30:
        raise ValueError("Not enough price history to calculate risk metrics")

    simple_returns = close_prices.pct_change().dropna()
    log_returns = np.log(close_prices / close_prices.shift(1)).dropna()

    if len(simple_returns) == 0 or len(log_returns) == 0:
        raise ValueError("Could not calculate returns for this ticker")

    variance = float(log_returns.var())
    if variance <= 0:
        raise ValueError("Variance must be greater than zero")

    log_variances = float(np.log(variance))
    volatility = float(simple_returns.std() * np.sqrt(252))
    var_95 = float(np.percentile(simple_returns, 5))

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
    }


def map_cluster_to_risk(cluster_label: int):
    return CLUSTER_CATEGORY.get(cluster_label, "Unknown")

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
