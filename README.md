# Stock Wise

Stock Wise is a portfolio analytics application designed to help retail investors better understand their investments. It focuses on risk analysis, diversification, and performance insights using a combination of financial metrics and machine learning.

Screencast: [SharePoint video](https://atlantictu-my.sharepoint.com/:v:/g/personal/g00413791_atu_ie/IQBp8Dg70NoFSKE-GPQO3yASAWbmH8ZopOPoNubV4TIc58o?e=qva7d4)

---

## Project Overview

This project is built as a multi-service system consisting of four main components:

- **Frontend (React Native + Expo Web)** - user interface to interact with the application  
- **Backend API (Go + Iris)** -  handles requests, business logic, and database interaction  
- **ML Service (Python + FastAPI)** - performs financial analytics and machine learning tasks  
- **Database (PostgreSQL)** - stores portfolio and user data  

---

## Key Features

The application includes the following features:

- Portfolio management (add, update, delete, and view holdings)
- Risk analysis metrics:
  - Portfolio volatility  
  - Sharpe ratio  
  - Value at Risk (VaR)  
  - Maximum Drawdown (MDD)
- Machine learning-based stock risk categorisation
- Portfolio performance evaluation and comparison
- Diversification suggestions based on user risk preference
- Simulation of portfolio changes before applying them
- Financial news retrieval with sentiment analysis (positive, negative, neutral)

---

## System Architecture

- The frontend communicates with the Go backend via a REST API  
- The backend validates requests and interacts with PostgreSQL  
- The backend forwards analytics-related requests to the FastAPI service  
- The FastAPI service processes data using trained ML models and returns results  
- Results are sent back to the frontend for display  

## System Architecture Diagram

<p align="center">
  <img src="frontend/assets/images/architecture.png" width="700"/>
</p>

---

## Tech Stack

- **Frontend:** React Native (Expo Web), TypeScript  
- **Backend:** Go (Iris framework)  
- **ML Service:** Python (FastAPI, scikit-learn, pandas, numpy)  
- **Database:** PostgreSQL  
- **Containerisation:** Docker & Docker Compose  

---

## Repository Structure

- `frontend/` – user interface  
- `backend/` – REST API and business logic  
- `services/` – ML models and FastAPI endpoints  
- `docker-compose.yml` – multi-service configuration  

---

## Prerequisites

Before running the project, ensure you have:

- Docker Desktop (or Docker Engine + Compose)
- Docker Compose (v2 or higher)

---

## Environment Variables

This project uses environment variables for configuration.

1. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

2. Update values as needed.

Docker Compose will automatically load these variables.

---

## Running the Project

1. Create a `.env` file in the project root based on the `.env.example`.

2. Run the application:

```bash
docker-compose up --build
```

3. Open in your browser:

- Frontend $\rightarrow$ http://localhost:3000  
- Backend  $\rightarrow$ http://localhost:8080  
- FastAPI  $\rightarrow$ http://localhost:8000  

To stop the application:

```bash
docker-compose down
```
---

## Deployment

The application is deployed across multiple platforms:

- **Frontend:** Vercel  
- **Backend API:** Render  
- **ML Service (FastAPI):** Render  
