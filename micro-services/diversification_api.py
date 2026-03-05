from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
from operator import itemgetter

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


@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]
        
        target_clusters = [idx for idx, risk in cluster_risk.items() 
                          if risk == request.user_risk_preference]
        
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
                "risk_preference": request.user_risk_preference
            }
        
        # randomly selecting 5 stocks to send to the user 
        num_suggestions = min(5, len(suggested_stocks))
        selected_stocks = suggested_stocks.sample(n=num_suggestions)
        
        # a list of dictionaries of suggestions to return to the user
        suggestions = []
        
        for index, stock_row in selected_stocks.iterrows():
            stock_symbol = stock_row['Stock Symbols']
            
            company_info = STOCK_DATA[stock_symbol]
            company_name = company_info["name"]
            company_sector = company_info["sector"]
            
            suggestion = {
                "symbol": stock_symbol,
                "company_name": company_name,
                "sector": company_sector,
                "reason": f"Aligns with your {request.user_risk_preference} risk preference",
            }
            
            suggestions.append(suggestion)
        
        
        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
