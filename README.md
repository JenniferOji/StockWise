# Stock Wise

Stock Wise is a portfolio analytics application designed to help retail investors better understand their investments. It focuses on risk analysis, diversification, and performance insights using a combination of financial metrics and machine learning.

Screencast: [SharePoint video](https://atlantictu-my.sharepoint.com/:v:/g/personal/g00413791_atu_ie/IQBp8Dg70NoFSKE-GPQO3yASAWbmH8ZopOPoNubV4TIc58o?e=qva7d4)

---

## Project Overview

This project is built as a multi-service system made up of three main components:

- **Frontend (React Native + Expo)** – user interface for interacting with the app  
- **Backend API (Go + Iris)** – handles requests, business logic, and database interaction  
- **ML Service (Python + FastAPI)** – performs financial analytics and machine learning tasks  

The backend acts as the main controller, receiving requests from the frontend and calling the ML service when advanced analytics (such as risk calculations or clustering) are required.

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

- Frontend communicates with the Go backend via REST API  
- Backend validates requests and interacts with PostgreSQL  
- Backend forwards analytics-related requests to FastAPI  
- FastAPI processes data using trained ML models and returns results  
- Results are sent back to the frontend for display  

---

## Tech Stack

- **Frontend:** React Native (Expo), TypeScript  
- **Backend:** Go (Iris framework)  
- **ML Service:** Python (FastAPI, scikit-learn, pandas, numpy)  
- **Database:** PostgreSQL  
- **Containerisation:** Docker & Docker Compose  

---

## Repository Structure

- `frontend/` – mobile/web UI and API calls  
- `backend/` – REST API, business logic, database models  
- `services/` – ML models and FastAPI endpoints  
- `docker-compose.yml` – multi-service setup  

---

## Prerequisites

Before running the project, ensure you have:

- Docker Desktop (or Docker Engine + Compose)
- Docker Compose (v2 or higher)
- Node.js (v18+) and npm (only if running frontend locally)

---

## Running the Project (Docker)

The easiest way to run the project is using Docker Compose.

This will start:
- PostgreSQL database on **port 5432**
- Go backend API on **port 8080**
- FastAPI ML service on **port 8000**

### Build and run:

```bash
docker-compose up --build