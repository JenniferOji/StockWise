# Stock Wise

Stock Wise is a portfolio analytics app that helps retail investors understand risk, diversification, and stock performance with ML-powered insights.

## Overview

The project is split into 3 main parts:

- Frontend app (React) in [frontend](frontend)
- Backend API (Go + Iris) in [backend](backend)
- ML service (Python + FastAPI) in [micro-services](micro-services)

The backend handles user and portfolio operations, then calls the ML service for analytics such as risk metrics, risk categories, diversification suggestions, performance metrics, sentiment, and simulations.

## Features

- Portfolio holdings management (add, update, delete, list)
- Portfolio risk metrics (volatility, sharpe, max drawdown, VaR)
- Stock risk categories by risk level
- Performance metrics and comparisons
- Diversification suggestions and random suggestions
- Stock-level news and sentiment analysis

## Tech Stack

- Frontend: Expo + React Native + TypeScript
- Backend API: Go + Iris
- ML service: Python + FastAPI + scikit-learn/pandas/numpy
- Database: PostgreSQL
- Container runtime: Docker + Docker Compose

## Repository Layout

- [frontend](frontend): mobile/web UI and client services
- [backend](backend): REST API routes, services, and DB models
- [micro-services](micro-services): ML endpoints and model assets
- [docker-compose.yml](docker-compose.yml): local multi-service orchestration

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Docker Compose v2+
- Node.js 18+ and npm (for running frontend outside containers)

## Run With Docker Compose

This starts:

- `postgres` on `5432`
- `backend` on `8080`
- `fastapi` on `8000`

From the project root, run:

```bash
docker-compose up --build
```

Run detached:

```bash
docker-compose up --build -d
```

Stop services:

```bash
docker-compose down
```

Stop and remove DB volume too (full reset):

```bash
docker-compose down -v
```

Tail logs:

```bash
docker-compose logs -f
```

## Run Frontend Locally

The frontend is not currently included in [docker-compose.yml](docker-compose.yml), so run it locally.

1. Set API URL environment variable:

```bash
# mac/linux
export EXPO_PUBLIC_API_URL=http://localhost:8080

# windows powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:8080"
```

2. Start frontend:

```bash
cd frontend
npm install
npx expo start
```

