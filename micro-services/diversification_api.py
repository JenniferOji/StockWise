from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
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

STOCK_SECTORS = {
    # Technology
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "GOOG": "Technology",
    "META": "Technology", "NVDA": "Technology", "ADBE": "Technology", "CRM": "Technology",
    "INTC": "Technology", "CSCO": "Technology", "ORCL": "Technology", "QCOM": "Technology",
    "TXN": "Technology", "AVGO": "Technology", "AMAT": "Technology", "ADSK": "Technology",
    "NOW": "Technology", "LRCX": "Technology", "KLAC": "Technology", "MU": "Technology",
    "AKAM": "Technology", "FTNT": "Technology", "ANET": "Technology", "CRWD": "Technology",
    "NET": "Technology", "ZS": "Technology", "OKTA": "Technology", "TWLO": "Technology",
    "SNOW": "Technology", "MDB": "Technology",
    
    # Consumer Cyclical
    "AMZN": "Consumer Cyclical", "TSLA": "Consumer Cyclical", "HD": "Consumer Cyclical",
    "NKE": "Consumer Cyclical", "MCD": "Consumer Cyclical", "SBUX": "Consumer Cyclical",
    "LOW": "Consumer Cyclical", "BKNG": "Consumer Cyclical", "TJX": "Consumer Cyclical",
    "MAR": "Consumer Cyclical", "F": "Consumer Cyclical", "ORLY": "Consumer Cyclical",
    "BBY": "Consumer Cyclical", "EXPE": "Consumer Cyclical", "NVR": "Consumer Cyclical",
    "CTAS": "Consumer Cyclical", "DG": "Consumer Cyclical", "URI": "Consumer Cyclical",
    "VFC": "Consumer Cyclical", "DLTR": "Consumer Cyclical", "NCLH": "Consumer Cyclical",
    "AMC": "Consumer Cyclical", "UBER": "Consumer Cyclical", "LYFT": "Consumer Cyclical",
    "DASH": "Consumer Cyclical",
    
    # Healthcare
    "JNJ": "Healthcare", "UNH": "Healthcare", "PFE": "Healthcare", "ABBV": "Healthcare",
    "MRK": "Healthcare", "TMO": "Healthcare", "LLY": "Healthcare", "ABT": "Healthcare",
    "BMY": "Healthcare", "GILD": "Healthcare", "MDT": "Healthcare", "ISRG": "Healthcare",
    "SYK": "Healthcare", "BDX": "Healthcare", "CI": "Healthcare", "ELV": "Healthcare",
    "VRTX": "Healthcare", "BSX": "Healthcare", "HUM": "Healthcare", "BIIB": "Healthcare",
    "ZTS": "Healthcare", "ILMN": "Healthcare", "ALGN": "Healthcare", "HCA": "Healthcare",
    "EW": "Healthcare", "TFX": "Healthcare", "RMD": "Healthcare",
    
    # Financial Services
    "BRK-B": "Financial Services", "JPM": "Financial Services", "V": "Financial Services",
    "MA": "Financial Services", "BAC": "Financial Services", "GS": "Financial Services",
    "MS": "Financial Services", "AXP": "Financial Services", "SPGI": "Financial Services",
    "BLK": "Financial Services", "C": "Financial Services", "PNC": "Financial Services",
    "USB": "Financial Services", "SCHW": "Financial Services", "MMC": "Financial Services",
    "AON": "Financial Services", "ICE": "Financial Services", "COF": "Financial Services",
    "TFC": "Financial Services", "AIG": "Financial Services", "PGR": "Financial Services",
    "SYF": "Financial Services", "CFG": "Financial Services", "MET": "Financial Services",
    "COIN": "Financial Services", "HOOD": "Financial Services", "PYPL": "Financial Services",
    
    # Communication Services
    "DIS": "Communication Services", "CMCSA": "Communication Services", "NFLX": "Communication Services",
    "T": "Communication Services", "VZ": "Communication Services", "EA": "Communication Services",
    "ZM": "Communication Services", "ROKU": "Communication Services",
    
    # Consumer Defensive
    "WMT": "Consumer Defensive", "PG": "Consumer Defensive", "KO": "Consumer Defensive",
    "PEP": "Consumer Defensive", "COST": "Consumer Defensive", "PM": "Consumer Defensive",
    "MO": "Consumer Defensive", "CL": "Consumer Defensive", "KMB": "Consumer Defensive",
    "MDLZ": "Consumer Defensive", "CLX": "Consumer Defensive", "STZ": "Consumer Defensive",
    "HSY": "Consumer Defensive", "ADM": "Consumer Defensive", "CPB": "Consumer Defensive",
    "KHC": "Consumer Defensive", "KR": "Consumer Defensive",
    
    # Energy
    "XOM": "Energy", "CVX": "Energy", "NEE": "Energy", "DUK": "Energy", "EOG": "Energy",
    "AEP": "Energy", "SO": "Energy", "SLB": "Energy", "EXC": "Energy", "OXY": "Energy",
    "AES": "Energy", "PEG": "Energy", "CNP": "Energy", "ETR": "Energy", "PPL": "Energy",
    "NRG": "Energy",
    
    # Industrials
    "UPS": "Industrials", "RTX": "Industrials", "HON": "Industrials", "LMT": "Industrials",
    "CAT": "Industrials", "GE": "Industrials", "DE": "Industrials", "NOC": "Industrials",
    "ETN": "Industrials", "CSX": "Industrials", "WM": "Industrials", "MSI": "Industrials",
    "PNR": "Industrials", "APH": "Industrials", "FTV": "Industrials", "A": "Industrials",
    "PNW": "Industrials", "GLW": "Industrials",
    
    # Basic Materials
    "LIN": "Basic Materials", "APD": "Basic Materials", "SHW": "Basic Materials",
    "ECL": "Basic Materials", "NEM": "Basic Materials", "DOW": "Basic Materials",
    
    # Real Estate
    "PLD": "Real Estate", "EQIX": "Real Estate", "DLR": "Real Estate", "ESS": "Real Estate",
    "ARE": "Real Estate",
    
    # Utilities
    "AEE": "Utilities", "KMI": "Utilities",
    
    # High Volatility
    "GME": "Consumer Cyclical", "BB": "Technology", "NIO": "Consumer Cyclical",
    "XPEV": "Consumer Cyclical", "LI": "Consumer Cyclical", "WKHS": "Industrials",
    "RIVN": "Consumer Cyclical", "FUBO": "Communication Services", "PLTR": "Technology",
    "AFRM": "Financial Services", "DKNG": "Consumer Cyclical", "CLOV": "Healthcare",
    "LULU": "Consumer Cyclical", "SNY": "Healthcare",
}

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
                "suggestions": []
            }
        
        num_suggestions = min(5, len(suggested_stocks))
        suggestions = suggested_stocks.sample(
            n=num_suggestions, 
            random_state=42
        )['Stock Symbols'].tolist()
        
        return {
            "success": True,
            "risk_preference": request.user_risk_preference,
            "suggestions": suggestions,
            "count": len(suggestions)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
