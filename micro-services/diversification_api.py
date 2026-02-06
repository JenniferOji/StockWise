from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
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

# pydantic model for request validation and type checking
class DiversificationRequest(BaseModel):
    current_stocks: List[str]
    user_risk_preference: str

@router.post("/api/diversification-suggestions")
def get_diversification_suggestions(request: DiversificationRequest):
    try:
        # find stock clusters matching users inputted risk preference
        target_clusters = [idx for idx, risk in cluster_risk.items() 
                          if risk == request.user_risk_preference]
        
        # get available stocks from the target clusters excluding stocks the user is currently hodling
        suggested_stocks = df2[
            (df2['Cluster_labels'].isin(target_clusters)) & 
            (~df2['Stock Symbols'].isin(request.current_stocks))
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