# fastapi microservice for calculating portfolio risk metrics
# this service integrates with the go backend to provide risk analysis functionality

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from diversification_api import router as diversification_router
from risk_metrics_api import router as risk_metrics_router

# resource used: https://fastapi.tiangolo.com/#example-upgrade

app = FastAPI()
app.include_router(diversification_router) 
app.include_router(risk_metrics_router) 


# cors to allow the go backend to make requests to the fastapi 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,  
    allow_methods=["*"], 
    allow_headers=["*"],  
)

