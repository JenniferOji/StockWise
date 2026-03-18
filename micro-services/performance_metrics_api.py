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
	price_data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)

	if price_data.empty:
		raise HTTPException(status_code=404, detail="No data for the tickers")

	if len(tickers) == 1:
		price_data = price_data["Close"].to_frame(name=tickers[0])
	else:
		price_data = price_data["Close"]

	price_data = price_data.ffill().bfill().dropna(how="all")

	# Calculate value for each stock in the portfolio
	portfolio_value = {}
	total_value = 0
	returns = {}

	for ticker, holding in portfolio.items():
		if ticker not in price_data.columns:
			continue

		shares = holding['shares']
		purchase_price = holding['purchase_price']
		initial_price = price_data[ticker].iloc[0]
		final_price = price_data[ticker].iloc[-1]
		value = final_price * shares
		total_value += value

		# Total return for the period
		returns[ticker] = (final_price - purchase_price) / purchase_price
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
