from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
import onnxruntime as onnx_runtime
import numpy as np
from sklearn.preprocessing import StandardScaler

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# clustered stocks contains the stock symbols, their annual return, annual variance, log scaled return and variance, and the cluster label assigned by the kmeans model
df2 = pd.read_csv(os.path.join(BASE_DIR, 'ml/models/clustered_stocks.csv'))

# cluster risk mapping contains the mapping of each cluster label to its assigned risk level (Low, Moderate, High)
with open(os.path.join(BASE_DIR, 'ml/models/cluster_risk_mapping.pkl'), 'rb') as f:
    cluster_risk = pickle.load(f)

# load the onnx model from the file path
onnx_path = os.path.join(BASE_DIR, 'ml/models/kmeans_stock_clustering.onnx')
# session is the variable that holds the loaded model
session = onnx_runtime.InferenceSession(onnx_path) 

# Load stock data from JSON file
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

@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        # get stock symbols from holdings 
        current_stock_symbols = [stock.symbol for stock in request.current_stocks]
        
        # find stock clusters matching users inputted risk preference
        target_clusters = [idx for idx, risk in cluster_risk.items() 
                          if risk == request.user_risk_preference]
        
        # get available stocks from the target clusters excluding stocks the user is currently holding
        suggested_stocks = df2[
            (df2['Cluster_labels'].isin(target_clusters)) & 
            (~df2['Stock Symbols'].isin(current_stock_symbols))
        ]
        
        if len(suggested_stocks) == 0:
            return {
                "success": False,
                "message": "No stocks",
                "suggestions": [],
                "risk_preference": request.user_risk_preference
            }
        
        num_suggestions = min(5, len(suggested_stocks))
        selected_stocks = suggested_stocks.sample(
            n=num_suggestions, 
            random_state=42
        )
        
        suggestions = []
        for symbol in selected_stocks['Stock Symbols'].tolist():
            stock_info = STOCK_DATA.get(symbol, {"name", "sector"})
            company_name = stock_info["name"]
            sector = stock_info["sector"]
            reason = f"Aligns with your {request.user_risk_preference} risk preference"
            suggestions.append({
                "symbol": symbol,
                "company_name": company_name,
                "sector": sector,
                "reason": reason
            })
        
        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
