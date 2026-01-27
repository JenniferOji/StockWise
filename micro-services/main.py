# fastapi microservice for calculating portfolio risk metrics
# this service integrates with the go backend to provide risk analysis functionality

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
from risk_metrics import (
    get_portfolio_data, 
    calculate_portfolio_value, 
    calculate_returns,
    calculate_risk_metrics
)
from datetime import datetime, timedelta

# resource used: https://fastapi.tiangolo.com/#example-upgrade

app = FastAPI() 

# cors to allow the go backend to make requests to the fastapi 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,  
    allow_methods=["*"], 
    allow_headers=["*"],  
)

# pydantic models for request validation and type checking
class Stock(BaseModel):
    ticker: str  
    shares: float 
    purchase_price: float 

class PortfolioRequest(BaseModel):
    stocks: List[Stock]  

@app.get("/")
def root():
    return {"message": "Risk metrics API"}


