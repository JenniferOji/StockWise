from fastapi import APIRouter, HTTPException  
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
from operator import itemgetter
from itertools import combinations
import numpy as np

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")
KMEANS_PATH = os.path.join(BASE_DIR, "models", "kmeans.pkl")

df_features = pd.read_csv(FEATURES_PATH)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(KMEANS_PATH, "rb") as f:
    kmeans = pickle.load(f)

with open(os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl"), "rb") as f:
    cluster_risk = pickle.load(f)

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


# calculates the annualised portfolio volatility for a list of stocks
def calculate_portfolio_volatility(stocks: List[StockHolding]):
    if not stocks:
        return None

    vols = []
    for stock in stocks:
        features = df_features[df_features["ticker"] == stock.symbol]
        if features.empty:
            continue
        vols.append(features.iloc[0]["volatility"])

    if not vols:
        return None

    return round(float(np.mean(vols) * 100), 2)


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


def predict_cluster(log_return, log_variance, volatility, max_drawdown):
    X = np.array([[log_return, log_variance, volatility, max_drawdown]])
    Xs = scaler.transform(X)
    return int(kmeans.predict(Xs)[0])


feature_map = df_features.set_index("ticker").to_dict(orient="index")


@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        print("REQUEST:", request)
        
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]
        print("Symbols:", current_stock_symbols)

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

        df_runtime = df_features.copy()

        df_runtime = df_runtime.dropna(subset=["log_return", "log_variance", "volatility", "max_drawdown"])

        df_runtime["Cluster_labels"] = [
            predict_cluster(
                row["log_return"],
                row["log_variance"],
                row["volatility"],
                row["max_drawdown"]
            )
            for _, row in df_runtime.iterrows()
        ]

        target_clusters = []

        # determine which clusters match the user's risk preference
        for cluster_idx, risk_label in cluster_risk.items():
            cluster_index = risk_levels.index(risk_label)

            # allowing stock suggestions within a +/- 1 risk band
            if abs(cluster_index - user_index) <= 1:
                target_clusters.append(cluster_idx)

        # only considers stocks the user doesnt currently hold 
        available_stocks = df_runtime[
            ~df_runtime['ticker'].isin(current_stock_symbols)
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
        candidate_pool = suggested_stocks.sort_values(by="volatility").head(10)

        candidate_symbols = candidate_pool["ticker"].tolist()

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
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))