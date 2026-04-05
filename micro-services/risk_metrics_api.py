from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import os
import numpy as np
import pickle
import pandas as pd

router = APIRouter() 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
SCALER_PATH = os.path.join(BASE_DIR, "models", "stock_scaler.pkl")
GMM_PATH = os.path.join(BASE_DIR, "models", "gmm_model.pkl")

df_features = pd.read_csv(FEATURES_PATH)

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
    vols = []
    returns = []
    drawdowns = []
    vars_ = []

    for stock in portfolio_request.stocks:
        features = feature_map.get(stock.ticker)
        if not features:
            continue

        vols.append(features["Volatility"])
        returns.append(features["returns"])
        drawdowns.append(features["max_drawdown"])
        vars_.append(features["VaR_95"])  

    if not vols:
        raise HTTPException(status_code=404, detail="No data for the tickers")

    portfolio_volatility = np.mean(vols)
    portfolio_return = np.mean(returns)
    portfolio_drawdown = np.max(drawdowns)
    portfolio_var_95 = np.mean(vars_)

    risk_free_rate = 0.02

    if portfolio_volatility == 0:
        portfolio_sharpe = 0
    else:
        portfolio_sharpe = (portfolio_return - risk_free_rate) / portfolio_volatility
        
    portfolio_volatility *= 100
    portfolio_return *= 100
    portfolio_drawdown *= 100
    portfolio_var_95 *= 100

    return {
        "success": True,
        "metrics": {
            "volatility": f"{portfolio_volatility:.2f}%",
            "annual_return": f"{portfolio_return:.2f}%",
            "max_drawdown": f"{portfolio_drawdown:.2f}%",
            "sharpe": f"{portfolio_sharpe:.3f}",
            "var_95": f"{portfolio_var_95:.2f}%"
        },
        "portfolio_value": 0
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

    # predict the cluster label for each stock and assign the risk category
    for ticker in tickers:

        features = feature_map.get(ticker)

        if not features:
            continue

        # passes the 3 features the model was trained on to get the cluster label
        cluster_label = predict_cluster_label(
            features["Log_Variances"],
            features["Volatility"],
            features["VaR_95"],
        )

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