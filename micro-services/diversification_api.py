from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
import math
from datetime import datetime, timedelta
from operator import itemgetter
from risk_metrics import (
    get_portfolio_data,
    calculate_portfolio_value,
    calculate_returns,
    calculate_volatility,
)

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

df2 = pd.read_csv(os.path.join(BASE_DIR, 'ml/models/clustered_stocks.csv'))

with open(os.path.join(BASE_DIR, 'ml/models/cluster_risk_mapping.pkl'), 'rb') as f:
    cluster_risk = pickle.load(f)

stock_data_path = os.path.join(os.path.dirname(__file__), 'stock_data.json')
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
    return round(float(volatility), 1)

def sector_breakdown(stocks: List[StockHolding]):
    if len(stocks) == 0:
        return []

    sector_counts = {}

    for stock in stocks:
        sector_name = stock.sector

        # if the key already exists
        if sector_name in sector_counts:
            sector_counts[sector_name] += 1
        # if it doesnt, add the key 
        else:
            sector_counts[sector_name] = 1

    total_stocks = len(stocks)
    breakdown = []

    for sector_name, count in sector_counts.items():
        # calculate the percentage of stocks in this sector 
        percent = round((count / total_stocks) * 100, 1)
        breakdown.append({
            "sector": sector_name,
            "percentage": percent,
        })


    # sortign the sectors from highest percentage to lowest
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

        target_clusters = []

        for cluster_idx, risk_label in cluster_risk.items():
            cluster_index = risk_levels.index(risk_label)

            # allowing stock suggestions within a +/- 1 risk band
            if abs(cluster_index - user_index) <= 1:
                target_clusters.append(cluster_idx)


        # only considers stocks the user doesnt currently hold 
        available_stocks = df2[~df2['Stock Symbols'].isin(current_stock_symbols)].copy()

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
        
        # selecting the up to 5 suggestions to return to the user depending on their risk preference
        num_suggestions = min(5, len(suggested_stocks))

        # suggesting stock with the lowest variance for low risk users
        if request.user_risk_preference == "Low Risk":
            suggested_stocks = suggested_stocks.sort_values(
                by="Variances",
                ascending=True
            )

        # suggesting stock with the highest variance for high risk users
        elif request.user_risk_preference == "High Risk":
            suggested_stocks = suggested_stocks.sort_values(
                by="Variances",
                ascending=False
            )

        # suggesting stocks with variance closest to the median for moderate risk users
        else:  
            median_variance = suggested_stocks["Variances"].median()

            suggested_stocks["variance_distance"] = (
                suggested_stocks["Variances"] - median_variance
            ).abs()

            suggested_stocks = suggested_stocks.sort_values(
                by="variance_distance"
            )

        # selecting the top suggestions to return to the user
        selected_stocks = suggested_stocks.head(num_suggestions)

        # a list of dictionaries of suggestions to return to the user
        suggestions = []
        
        for index, stock_row in selected_stocks.iterrows():
            stock_symbol = stock_row['Stock Symbols']
            
            company_info = STOCK_DATA.get(stock_symbol)
            # skipping the stock if theres no data available 
            if not company_info:
                continue

            company_name = company_info["name"]
            company_sector = company_info["sector"]
            
            suggestion = {
                "symbol": stock_symbol,
                "company_name": company_name,
                "sector": company_sector,
                "reason": f"Aligns with your {request.user_risk_preference} risk preference",
            }
            
            suggestions.append(suggestion)
    
        projected_holdings = []
        # addign the users current stocks to the projected holdings list
        for stock in request.current_stocks:
            projected_holdings.append(stock)

        for suggestion in suggestions:
            projected_holdings.append(
                StockHolding(
                    symbol=suggestion["symbol"],
                    sector=suggestion["sector"],
                )
            )

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
