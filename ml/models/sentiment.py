import os
import pickle
import re
from pathlib import Path

import nltk
import pandas as pd
from catboost import CatBoostClassifier
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

# Download tokenizer resources
nltk.download("punkt")
nltk.download("wordnet")

# Load dataset
BASE_DIR = Path(__file__).resolve().parents[1]
news_sentiment_path = BASE_DIR / "training_data" / "news_sentiment_data.csv"

if not news_sentiment_path.exists():
    raise FileNotFoundError(f"Dataset not found at: {news_sentiment_path}")

df = pd.read_csv(news_sentiment_path, encoding="ISO-8859-1", low_memory=False)

# Inputs and labels
X = df.Headline.values
y = df.Sentiment.replace(4, 1)

# Train / test splitml/models/training_data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=0
)

# Text preprocessing tools
lemm = WordNetLemmatizer()

def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)

def text_preprocess(doc):

    temp = doc.lower()

    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)
    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)

    temp = re.sub("[0-9]", "", temp)
    temp = re.sub("'", " ", temp)

    temp = word_tokenize(temp)

    temp = [reduce_lengthening(w) for w in temp]

    temp = [lemm.lemmatize(w) for w in temp]

    temp = [w for w in temp if len(w) > 1]

    return " ".join(temp)

# Preprocess training data
X_train_clean = [text_preprocess(x) for x in X_train]
X_test_clean = [text_preprocess(x) for x in X_test]

# Vectorization pipeline
pipe = make_pipeline(
    CountVectorizer(
        ngram_range=(1,2),        # capture financial bigrams
        stop_words="english",     # remove common words
        min_df=5,                 # ignore rare words
        max_df=0.9
    ),
    TfidfTransformer()
)

pipe.fit(X_train_clean)

Xtrain = pipe.transform(X_train_clean)
Xtest = pipe.transform(X_test_clean)

# Train CatBoost model
cat_classifier = CatBoostClassifier(
    iterations=1000,
    learning_rate=0.03,
    depth=6,
    od_type="Iter",
    od_wait=50,
    verbose=100,
    objective="MultiClass"
)

cat_classifier.fit(Xtrain, y_train, eval_set=(Xtest, y_test))

# Evaluate model
predictions = cat_classifier.predict(Xtest)

print("Accuracy:", accuracy_score(y_test, predictions))
print(classification_report(y_test, predictions))

# Export preprocessing pipeline to ONNX
onnx_preprocessor = convert_sklearn(
    pipe,
    initial_types=[("input", StringTensorType([None, 1]))]
)

with open("sentiment_preprocessor.onnx", "wb") as f:
    f.write(onnx_preprocessor.SerializeToString())

# Export CatBoost model to ONNX
cat_classifier.save_model(
    "sentiment_catboost_model.onnx",
    format="onnx",
    export_parameters={
        "onnx_domain": "ai.catboost",
        "onnx_model_version": 1,
        "onnx_doc_string": "News sentiment classification model",
        "onnx_graph_name": "CatBoostModel_for_Sentiment",
    }
)

# Save label map
LABEL_MAP = {-1: "negative", 0: "neutral", 1: "positive"}

with open("sentiment_label_map.pkl", "wb") as f:
    pickle.dump(LABEL_MAP, f)

print("Model training complete.")
print("ONNX models exported.")