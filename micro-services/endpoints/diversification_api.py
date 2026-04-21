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

# setting up the api router for endpoints
router = APIRouter()

# getting base directory for file paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# loading features dataset path
FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")  

# loading cluster to risk mapping model
with open(os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl"), "rb") as f:
    cluster_risk = pickle.load(f)

# loading stock metadata from json file
stock_data_path = os.path.join(BASE_DIR, "data", "stocks.json")
with open(stock_data_path, 'r') as f:
    STOCK_DATA = json.load(f)

# reading features csv into dataframe and standardising column names
df_features = pd.read_csv(FEATURES_PATH)
df_features.columns = df_features.columns.str.lower()

# creating lookup dictionary for stock features
feature_map = df_features.set_index("symbol").to_dict(orient="index")

# building stock lookup dictionary for quick access
STOCK_LOOKUP = {
    stock["symbol"].replace(".", "-"): stock
    for stock in STOCK_DATA
}

# helper function to get sector of a company using symbol
def get_company_sector(symbol: str) -> Optional[str]:
    lookup_symbol = symbol.replace("-", ".")
    company = STOCK_LOOKUP.get(lookup_symbol)
    if not company:
        return None
    return company.get("sector")

# defining stock holding model for request input
class StockHolding(BaseModel):
    symbol: str
    sector: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None

# defining request schema for diversification endpoint
class DiversificationRequest(BaseModel):
    current_stocks: List[StockHolding]
    user_risk_preference: str

# calculates the average portfolio volatility based on stock volatilities
def calculate_portfolio_volatility(stocks: List[StockHolding]):
    if not stocks:
        return None

    vols = []
    for stock in stocks:
        features = df_features[df_features["symbol"] == stock.symbol]
        if features.empty:
            continue
        vols.append(features.iloc[0]["volatility"])

    if not vols:
        return None

    return round(float(np.mean(vols) * 100), 2)

# calculates percentage allocation of stocks across sectors
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

    # converting sector counts into percentage values
    for sector_name, count in sector_counts.items():
        percent = round((count / total_stocks) * 100, 1)
        breakdown.append({
            "sector": sector_name,
            "percentage": percent,
        })

    # sorting sectors by highest percentage first
    breakdown.sort(key=itemgetter("percentage"), reverse=True)
    return breakdown

# rebuilding feature map for safety
feature_map = df_features.set_index("symbol").to_dict(orient="index")

# endpoint to generate optimised diversification suggestions
@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]
        current_portfolio_volatility = calculate_portfolio_volatility(request.current_stocks)

        # defining valid risk levels and mapping user preference to index
        risk_levels = [
            "Very Low Risk",
            "Low Risk",
            "Moderate Risk",
            "High Risk",
            "Very High Risk",
            "Extreme Risk",
        ]

        if request.user_risk_preference not in risk_levels:
            raise HTTPException(status_code=400, detail="Invalid risk preference")

        user_index = risk_levels.index(request.user_risk_preference)

        # preparing clean dataset for filtering and clustering logic
        df_runtime = df_features.copy()
        df_runtime = df_runtime.dropna(subset=["log_variances", "volatility", "var_95", "cluster_labels"])
        df_runtime["cluster_labels"] = df_runtime["cluster_labels"].astype(int)

        target_clusters = []

        # selecting clusters that match user risk within allowed band
        for cluster_idx, risk_label in cluster_risk.items():
            cluster_index = risk_levels.index(risk_label)

            if abs(cluster_index - user_index) <= 1 and risk_label != "Extreme Risk":
                target_clusters.append(cluster_idx)

        # filtering out stocks already owned and keeping only matching clusters
        available_stocks = df_runtime[
            ~df_runtime['symbol'].isin(current_stock_symbols)
        ].copy()

        suggested_stocks = available_stocks[
            available_stocks['cluster_labels'].isin(target_clusters)
        ]

        # handling case where no suitable stocks exist
        if len(suggested_stocks) == 0:
            return {
                "success": False,
                "message": "No stocks match your risk preference",
                "suggestions": [],
                "risk_preference": request.user_risk_preference,
                "comparison": {
                    "current_volatility": current_portfolio_volatility,
                    "with_suggestions_volatility": current_portfolio_volatility,
                },
            }

        # building candidate pool based on whether user prefers higher or lower risk
        if request.user_risk_preference in ["High Risk", "Very High Risk"]:
            candidate_pool = suggested_stocks.sort_values(by="volatility", ascending=False).head(10)
        else:
            candidate_pool = suggested_stocks.sort_values(by="volatility", ascending=True).head(10)

        candidate_symbols = candidate_pool["symbol"].tolist()
        combos = []

        # generating combinations of stocks to test different portfolio outcomes
        for r in range(1, 4):
            combos.extend(combinations(candidate_symbols, r))

        results = []

        # evaluating each combination by recalculating portfolio volatility
        for combo in combos:
            projected = list(request.current_stocks)

            for symbol in combo:
                company = STOCK_LOOKUP.get(symbol)

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

        # selecting best combination depending on risk strategy
        if request.user_risk_preference == "Low Risk":
            best = min(results, key=lambda x: x["volatility"])

        elif request.user_risk_preference == "High Risk":
            best = max(results, key=lambda x: x["volatility"])

        else:
            # choosing option closest to median volatility for balanced risk
            vols = sorted(r["volatility"] for r in results)
            median_vol = vols[len(vols)//2]
            best = min(results, key=lambda x: abs(x["volatility"] - median_vol))

        best_symbols = best["symbols"]
        suggestions = []

        # building response objects for selected stocks
        for symbol in best_symbols:
            company = STOCK_LOOKUP.get(symbol)

            if not company:
                continue

            suggestions.append({
                "symbol": symbol,
                "company_name": company["companyName"],
                "sector": company["sector"],
                "reason": f"Optimises portfolio volatility for your {request.user_risk_preference} risk preference",
            })

        projected_holdings = list(request.current_stocks)

        # simulating portfolio after adding suggested stocks
        for symbol in best_symbols:
            company = STOCK_LOOKUP.get(symbol)

            if company:
                projected_holdings.append(
                    StockHolding(
                        symbol=symbol,
                        sector=company["sector"]
                    )
                )

        # calculating updated portfolio volatility after suggestions
        projected_portfolio_volatility = calculate_portfolio_volatility(projected_holdings)

        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions,
            "comparison": {
                "current_volatility": current_portfolio_volatility,
                "with_suggestions_volatility": projected_portfolio_volatility,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# endpoint to generate random diversification suggestions with sector awareness
@router.post("/api/random-suggestions")
def get_random_suggestions(request: DiversificationRequest):
    try:
        # extracting current portfolio symbols
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]

        # calculating current sector breakdown
        current_stock_breakdown = sector_breakdown(request.current_stocks)

        # collecting sectors already present in portfolio
        current_sectors = {
            stock.sector
            for stock in request.current_stocks
            if stock.sector
        }

        # defining risk levels
        risk_levels = [
            "Very Low Risk",
            "Low Risk",
            "Moderate Risk",
            "High Risk",
            "Very High Risk",
            "Extreme Risk",
        ]

        if request.user_risk_preference not in risk_levels:
            raise HTTPException(status_code=400, detail="Invalid risk preference")

        user_index = risk_levels.index(request.user_risk_preference)

        # preparing dataset
        df_runtime = df_features.copy()
        df_runtime = df_runtime.dropna(subset=["log_variances", "volatility", "var_95", "cluster_labels"])
        df_runtime["cluster_labels"] = df_runtime["cluster_labels"].astype(int)

        target_clusters = []

        # selecting clusters based on risk band
        for cluster_idx, risk_label in cluster_risk.items():
            cluster_index = risk_levels.index(risk_label)

            if abs(cluster_index - user_index) <= 1 and risk_label != "Extreme Risk":
                target_clusters.append(cluster_idx)

        # removing already owned stocks
        available_stocks = df_runtime[
            ~df_runtime['symbol'].isin(current_stock_symbols)
        ].copy()

        # filtering out sectors already heavily represented
        sector_filtered_stocks = available_stocks
        if current_sectors:
            sector_filtered_stocks = available_stocks[
                ~available_stocks["symbol"].apply(
                    lambda symbol: get_company_sector(str(symbol)) in current_sectors
                )
            ]

        # filtering by risk clusters
        suggested_stocks = sector_filtered_stocks[
            sector_filtered_stocks['cluster_labels'].isin(target_clusters)
        ]

        # fallback if sector filtering too strict
        if len(suggested_stocks) == 0 and len(available_stocks) > 0:
            suggested_stocks = available_stocks[
                available_stocks['cluster_labels'].isin(target_clusters)
            ]

        # handling no results case
        if len(suggested_stocks) == 0:
            return {
                "success": False,
                "message": "No stocks match your risk preference",
                "suggestions": [],
                "risk_preference": request.user_risk_preference,
                "comparison": {
                    "current_portfolio": current_stock_breakdown,
                    "with_suggestions": current_stock_breakdown,
                },
            }

        # randomly sampling stocks for simple suggestions
        candidate_pool = suggested_stocks.sample(n=min(3, len(suggested_stocks)))

        suggestions = []

        # building suggestion output
        for _, row in candidate_pool.iterrows():
            symbol = row["symbol"]

            company = STOCK_LOOKUP.get(symbol)

            if not company:
                continue

            suggestions.append({
                "symbol": symbol,
                "company_name": company["companyName"],
                "sector": company["sector"],
                "reason": f"Diversifies your sector exposure {request.user_risk_preference} within your risk range",
            })

        projected_holdings = list(request.current_stocks)

        # simulating updated portfolio with new stocks
        for suggestion in suggestions:
            projected_holdings.append(
                StockHolding(
                    symbol=suggestion["symbol"],
                    sector=suggestion["sector"]
                )
            )

        # recalculating sector breakdown after suggestions
        projected_stock_breakdown = sector_breakdown(projected_holdings)

        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions,
            "comparison": {
                "current_portfolio": current_stock_breakdown,
                "with_suggestions": projected_stock_breakdown,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))