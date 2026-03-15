from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import numpy as np
import yfinance as yf

router = APIRouter()

# Pydantic models for request validation and type checking
class Stock(BaseModel):
	ticker: str
	shares: float
	purchase_price: float

class PortfolioRequest(BaseModel):
	stocks: List[Stock]
	days: int = 365

class PerformanceMetricsResponse(BaseModel):
	success: bool
	metrics: dict
	portfolio_value: float
	best_performer: str
	worst_performer: str

@router.get("/")
def root():
	return {"message": "Performance metrics API"}

@router.post("/api/performance-metrics")
def calculate_performance_metrics(portfolio_request: PortfolioRequest):
	portfolio = {}
	for stock in portfolio_request.stocks:
		portfolio[stock.ticker] = {
			'shares': stock.shares,
			'purchase_price': stock.purchase_price
		}

	start_date = (datetime.now() - timedelta(days=portfolio_request.days)).strftime('%Y-%m-%d')
	end_date = datetime.now().strftime('%Y-%m-%d')

	tickers = list(portfolio.keys())
	price_data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)["Close"]
	if isinstance(price_data, np.ndarray) or price_data.empty:
		raise HTTPException(status_code=404, detail="No data for the tickers")

	price_data = price_data.ffill().bfill().dropna(how="all")
