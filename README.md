# Stock Wise

## Overview
Stock Wise helps retail investors analyze their stock portfolios, assess risk and diversification, and receive actionable, AI-powered recommendations for improvement. It combines finance and technology to empower users to make smarter, safer investment decisions.

## Features

- **Portfolio Analysis:** Get a breakdown of your holdings, diversification, and risk profile.
- **Risk Assessment:** AI model predicts risk levels for each stock in your portfolio and your overall portfolio.
- **Sentiment Analysis:** See how market news and sentiment may affect your stocks.
- **Actionable Recommendations:** Get suggestions to optimize your portfolio and reduce unnecessary risks.
- **Interactive Charts:** Visualize your investments and risk exposure.

## Technologies Used

- **Frontend:** Flutter (Dart) for cross-platform mobile app and interactive charts.
- **Backend API:** Go (Golang) for fast REST API.
- **Machine Learning Service:** Python (FastAPI) for risk and sentiment analysis, using ONNX for model inference.
- **Database:** PostgreSQL for secure storage of user data and portfolio analysis.
- **Cache:** Redis for fast access to market data and rate limiting.
- **External APIs:** Yahoo Finance, Finnhub, NewsAPI for stock prices, fundamentals, and news.
- **Cloud Hosting:** Railway free tier for cloud deployment.

**Other Libraries & Tools:**
- ONNX (ML model export/inference)
- SQLAlchemy (Python) and GORM (Go) for database access
- Chart libraries (Flutter)
- JWT for authentication
- GitHub Actions for CI/CD

## Getting Started

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/JenniferOji/StockWise
   ```

2. **Set up the backend and ML service:**
   - Configure database and cache connection settings in environment files.
   - Build and run Docker containers for API, ML service, database, and cache.

3. **Install Flutter dependencies:**
   ```sh
   cd frontend
   flutter pub get
   ```

4. **Run the app locally:**
   - Start backend and ML service.
   - Open the Flutter project and run on your device or emulator.

## Project Motivation

Retail investors often struggle to understand the risk and diversification of their portfolios. Many rely on instinct or social trends, which can lead to poor decisions. This project aims to provide clear analytics and recommendations, drawing on personal experience and a passion for finance and technology.
