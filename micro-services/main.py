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

@app.post("/api/risk-metrics")
def calculate_portfolio_risk_metrics(portfolio_request: PortfolioRequest):
    portfolio = {}
    for stock in portfolio_request.stocks:
        portfolio[stock.ticker] = {
            'shares': stock.shares,
            'purchase_price': stock.purchase_price
        }

    # calculate date range for historical data analysis
    start_date = (datetime.now() - timedelta(days=portfolio_request.days)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    # fetch historical price data from yahoo finance via yfinance library
    price_data = get_portfolio_data(portfolio, start_date, end_date)
    
    # validate that the data was recieved for the tickers
    if price_data.empty:
        raise HTTPException(status_code=404, detail="No data found for the tickers")
    
    # calculate total portfolio value over time 
    portfolio_value = calculate_portfolio_value(price_data, portfolio)
    
    # calculate daily returns and cumulative returns
    daily_returns, cumulative_returns = calculate_returns(portfolio_value)
    
    # calculate all risk metrics: volatility, sharpe ratio, max drawdown, and var
    risk_metrics = calculate_risk_metrics(daily_returns)
    
    current_portfolio_value = portfolio_value['Total'].values[-1]
    
    return {
        "success": True,
        "metrics": risk_metrics,
        "portfolio_value": current_portfolio_value
    }

