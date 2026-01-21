import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd

# resource used : https://www.trymito.io/blog/how-to-automate-portfolio-analysis-in-python-a-complete-guide
# sample data 
portfolio = {
    'AAPL': {'shares': 50, 'purchase_price': 150},
    'MSFT': {'shares': 30, 'purchase_price': 280},
    'GOOGL': {'shares': 20, 'purchase_price': 2800},
    'VTI': {'shares': 100, 'purchase_price': 200},
    'BND': {'shares': 200, 'purchase_price': 80}
}

# Set analysis timeframe to be a year
start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
end_date = datetime.now().strftime('%Y-%m-%d')

# takes in a dictionary portfolio with the stock as the key and the shares as values 
# example: {'AAPL': 10, 'MSFT': 5, 'GOOGL': 2}
def get_portfolio_data(portfolio, start_date, end_date):
    """Download the historical price data of the portfolio stocks"""
    tickers = list(portfolio.keys())
    data = yf.download(tickers, start=start_date, end=end_date)['Adj Close']
    return data

price_data = get_portfolio_data(portfolio, start_date, end_date)
print("Data fetched successfully!")


def calculate_portfolio_value(price_data, portfolio):
    """Calculate the total value of the portfolio over time"""
    portfolio_value = pd.DataFrame()
    
    # Calculate value for each stock in the portfolio
    for ticker, holding in portfolio.items():
        shares = holding['shares']
        portfolio_value[ticker] = price_data[ticker] * shares
    
    portfolio_value['Total'] = portfolio_value.sum(axis=1)
    return portfolio_value