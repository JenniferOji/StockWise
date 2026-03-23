from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import pandas as pd
import os

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES_PATH = os.path.join(BASE_DIR, "data", "features.csv")

df_features = pd.read_csv(FEATURES_PATH)
feature_map = df_features.set_index("ticker").to_dict(orient="index")

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

	portfolio_value = {}
	total_value = 0
	returns = {}

	for ticker, holding in portfolio.items():
		features = feature_map.get(ticker)
		if not features:
			continue

		shares = holding['shares']
		purchase_price = holding['purchase_price']

		annual_return = np.expm1(features["log_return"])

		value = purchase_price * (1 + annual_return) * shares
		total_value += value

		returns[ticker] = annual_return
		portfolio_value[ticker] = value

	if not returns:
		raise HTTPException(status_code=404, detail="No valid tickers in data")
			
	# calculating best and worst performer
	best_performer = max(returns, key=returns.get)
	worst_performer = min(returns, key=returns.get)

	# calculating the overall portfolio return 
	total_invested = sum(holding['shares'] * holding['purchase_price'] for holding in portfolio.values())
	overall_return = (total_value - total_invested) / total_invested if total_invested else 0

	# annualised return using the CAGR formula: https://www.investopedia.com/terms/c/cagr.asp
	n_years = portfolio_request.days / 365

	if total_invested and n_years > 0:
		growth_factor = total_value / total_invested
		annual_growth_rate = 1 / n_years
		cagr = (growth_factor ** annual_growth_rate) - 1
	else:
		cagr = 0

	metrics = {
		"overall_return": f"{overall_return * 100:.2f}%",
		"annualized_return": f"{cagr * 100:.2f}%",
		"returns_by_ticker": {k: f"{v * 100:.2f}%" for k, v in returns.items()}
	}

	return PerformanceMetricsResponse(
		success=True,
		metrics=metrics,
    	portfolio_value=round(total_value, 2),
		best_performer=best_performer,
		worst_performer=worst_performer
	)