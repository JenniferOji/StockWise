# fastapi microservice for calculating portfolio risk metrics
# this service integrates with the go backend to provide risk analysis functionality

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from endpoints.diversification_api import router as diversification_router
from endpoints.risk_metrics_api import router as risk_metrics_router
from endpoints.news_api import router as news_router
from endpoints.performance_metrics_api import router as performance_metrics_router
from endpoints.stock_risk import router as stock_risk_router

# resource used to help create fastAPI service: https://fastapi.tiangolo.com/#example-upgrade

app = FastAPI()

# including routers for different API endpoints
app.include_router(diversification_router)  
app.include_router(risk_metrics_router) 
app.include_router(news_router) 
app.include_router(performance_metrics_router)
app.include_router(stock_risk_router)


# cors to allow the go backend to make requests to the fastapi 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,  
    allow_methods=["*"], 
    allow_headers=["*"],  
)

