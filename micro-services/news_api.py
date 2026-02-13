from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import pickle
import os
import json
import onnxruntime as ort

router = APIRouter()
# load the onnx model from the file path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(BASE_DIR, "ml", "models", "sentiment_catboost_model.onnx")

session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
catboost_input_name = session.get_inputs()[0].name
catboost_output_name = session.get_outputs()[0].name

