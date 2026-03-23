from fastapi import APIRouter, HTTPException 
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
from datetime import datetime, timedelta
from operator import itemgetter
from itertools import combinations
import numpy as np
import yfinance as yf

from risk_metrics import (
    get_portfolio_data,
    calculate_portfolio_value,
    calculate_returns,
    calculate_volatility,
)

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# load trained clustering components instead of CSV
with open(os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl"), "rb") as f:
    cluster_risk = pickle.load(f)

with open(os.path.join(BASE_DIR, "models", "stock_scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)

with open(os.path.join(BASE_DIR, "models", "kmeans_pipeline.onnx"), "rb") as f:
    kmeans = pickle.load(f)

stock_data_path = os.path.join(BASE_DIR, "stock_data.json")
with open(stock_data_path, 'r') as f:
    STOCK_DATA = json.load(f)


class StockHolding(BaseModel):
    symbol: str
    sector: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None


class DiversificationRequest(BaseModel):
    current_stocks: List[StockHolding]
    user_risk_preference: str


# builds feature dataframe dynamically at runtime instead of reading CSV
def build_feature_dataframe(tickers: List[str]):
    prices = yf.download(tickers, period="1y", auto_adjust=True)['Close']
    prices = prices.dropna(axis=1, how='all')
    prices = prices.ffill().bfill()

    returns = prices.pct_change(fill_method=None).dropna()

    # caculating max drawdown fro each stock 
    max_drawdowns = {}
    for ticker in returns.columns:
        r = returns[ticker].dropna()
        cumulative = (1 + r).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_drawdowns[ticker] = abs(drawdown.min())

    # Calculate annual means and annual variances
    annual_means_returns = returns.mean() * 252
    annual_return_variances = returns.var() * 252

    df = pd.DataFrame({
        'Stock Symbols': annual_return_variances.index,
        'Variances': annual_return_variances.values,
        'Returns': annual_means_returns.values,
        'Max_Drawdown': [max_drawdowns.get(t, np.nan) for t in annual_return_variances.index]
    })

    # log scaling to compress extreme values
    df['Log_Returns'] = np.log1p(np.clip(df['Returns'], -0.999, None))

    # clipping extreme variances so outliers do not dominate clustering
    df['Log_Variances'] = np.log1p(np.clip(df['Variances'], 0, 2))

    # adding features to capture risk adjusted returns 
    df['Volatility'] = np.sqrt(df['Variances'])

    # Dropping rows with NaN values before scaling to avoid errors
    df = df.dropna()

    return df


# calculates the annualised portfolio volatility for a list of stocks
def calculate_portfolio_volatility(stocks: List[StockHolding], lookback_days: int = 365):
    if not stocks:
        return None

    portfolio = {}
    for stock in stocks:
        symbol = stock.symbol
        shares = stock.quantity if stock.quantity and stock.quantity > 0 else 1.0
        if symbol in portfolio:
            portfolio[symbol]["shares"] += shares
        else:
            portfolio[symbol] = {
                "shares": shares,
                "purchase_price": stock.purchase_price if stock.purchase_price else 0.0,
            }

    start_date = (datetime.now() - timedelta(days=lookback_days)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')

    price_data = get_portfolio_data(portfolio, start_date, end_date).dropna(how='all')
    portfolio_value = calculate_portfolio_value(price_data, portfolio)
    daily_returns, _ = calculate_returns(portfolio_value)
    volatility = calculate_volatility(daily_returns.dropna())
    return round(float(volatility), 2)


# calculates the percentage sector allocation of the portfolio
def sector_breakdown(stocks: List[StockHolding]):
    if len(stocks) == 0:
        return []

    sector_counts = {}

    for stock in stocks:
        sector_name = stock.sector

        if sector_name in sector_counts:
            sector_counts[sector_name] += 1
        else:
            sector_counts[sector_name] = 1

    total_stocks = len(stocks)
    breakdown = []

    # convert counts to percentages
    for sector_name, count in sector_counts.items():
        percent = round((count / total_stocks) * 100, 1)
        breakdown.append({
            "sector": sector_name,
            "percentage": percent,
        })

    # sort sectors from highest allocation to lowest
    breakdown.sort(key=itemgetter("percentage"), reverse=True)
    return breakdown


@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]
        current_stock_breakdown = sector_breakdown(request.current_stocks)
        current_portfolio_volatility = calculate_portfolio_volatility(request.current_stocks)

        risk_levels = [
            "Very Low Risk",
            "Low Risk",
            "Moderate Risk",
            "High Risk",
            "Very High Risk",
        ]

        if request.user_risk_preference not in risk_levels:
            raise HTTPException(status_code=400, detail="Invalid risk preference")

        user_index = risk_levels.index(request.user_risk_preference)

        # build full ticker universe dynamically
        tickers = list(STOCK_DATA.keys())

        # build features + cluster at runtime
        df_runtime = build_feature_dataframe(tickers)

        X = df_runtime[['Log_Returns', 'Log_Variances', 'Volatility', 'Max_Drawdown']].values
        Xs = scaler.transform(X)

        df_runtime['Cluster_labels'] = kmeans.predict(Xs)

        target_clusters = []

        # determine which clusters match the user's risk preference
        for cluster_idx, risk_label in cluster_risk.items():
            cluster_index = risk_levels.index(risk_label)

            # allowing stock suggestions within a +/- 1 risk band
            if abs(cluster_index - user_index) <= 1:
                target_clusters.append(cluster_idx)

        # only considers stocks the user doesnt currently hold 
        available_stocks = df_runtime[
            ~df_runtime['Stock Symbols'].isin(current_stock_symbols)
        ].copy()

        # keep only stocks belonging to the selected clusters
        suggested_stocks = available_stocks[
            available_stocks['Cluster_labels'].isin(target_clusters)
        ]

        if len(suggested_stocks) == 0:
            return {
                "success": False,
                "message": "No stocks match your risk preference",
                "suggestions": [],
                "risk_preference": request.user_risk_preference,
                "comparison": {
                    "current_portfolio": current_stock_breakdown,
                    "with_suggestions": current_stock_breakdown,
                    "current_volatility": current_portfolio_volatility,
                    "with_suggestions_volatility": current_portfolio_volatility,
                },
            }

        # limit the candidate pool so the optimisation remains fast
        candidate_pool = suggested_stocks.sort_values(by="Volatility").head(10)

        candidate_symbols = candidate_pool["Stock Symbols"].tolist()

        combos = []

        # generating combinations of 1 to 3 stocks
        for r in range(1, 4):
            combos.extend(combinations(candidate_symbols, r))

        results = []

        # evaluate each combination by computing the resulting portfolio volatility
        for combo in combos:
            projected = list(request.current_stocks)

            for symbol in combo:
                company = STOCK_DATA.get(symbol)
                if not company:
                    continue

                projected.append(
                    StockHolding(
                        symbol=symbol,
                        sector=company["sector"]
                    )
                )

            vol = calculate_portfolio_volatility(projected)

            if vol is not None:
                results.append({
                    "symbols": combo,
                    "volatility": vol
                })

        if not results:
            raise HTTPException(status_code=500, detail="Could not compute volatility")

        # choose the best combination depending on the user's risk preference
        if request.user_risk_preference == "Low Risk":
            best = min(results, key=lambda x: x["volatility"])

        elif request.user_risk_preference == "High Risk":
            best = max(results, key=lambda x: x["volatility"])

        else:
            # for moderate risk choose a volatility near the median
            vols = sorted(r["volatility"] for r in results)
            median_vol = vols[len(vols)//2]
            best = min(results, key=lambda x: abs(x["volatility"] - median_vol))

        best_symbols = best["symbols"]
        suggestions = []

        # build suggestion objects to return to the user
        for symbol in best_symbols:
            company = STOCK_DATA.get(symbol)

            if not company:
                continue

            suggestions.append({
                "symbol": symbol,
                "company_name": company["name"],
                "sector": company["sector"],
                "reason": f"Optimises portfolio volatility for your {request.user_risk_preference} risk preference",
            })

        projected_holdings = list(request.current_stocks)

        # add suggested stocks to simulate the new portfolio
        for symbol in best_symbols:
            company = STOCK_DATA.get(symbol)

            if company:
                projected_holdings.append(
                    StockHolding(
                        symbol=symbol,
                        sector=company["sector"]
                    )
                )

        # compute sector allocation and volatility after adding suggestions
        projected_stock_breakdown = sector_breakdown(projected_holdings)
        projected_portfolio_volatility = calculate_portfolio_volatility(projected_holdings)

        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions,
            "comparison": {
                "current_portfolio": current_stock_breakdown,
                "with_suggestions": projected_stock_breakdown,
                "current_volatility": current_portfolio_volatility,
                "with_suggestions_volatility": projected_portfolio_volatility,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))