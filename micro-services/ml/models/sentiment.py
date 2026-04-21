import os
import pickle
import re
from pathlib import Path

import nltk
import pandas as pd
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.svm import LinearSVC

from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType


import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

nltk.download("punkt")
nltk.download("wordnet")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

news_sentiment_path = os.path.join(BASE_DIR, "training_data", "news_sentiment_data.csv")

# loading dataset and preparing training data
df = pd.read_csv(news_sentiment_path, encoding="ISO-8859-1", low_memory=False)

x = df.Headline.astype(str).values
y = df.Sentiment.astype(str)

# splitting data into training and testing sets
x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.3, random_state=0
)

lemm = WordNetLemmatizer()

# reducing repeated characters to normalise informal text
def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)

# cleaning and preprocessing text before feature extraction
def text_preprocess(doc):
    temp = doc.lower()
    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)
    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)
    temp = re.sub("'", " ", temp)

    tokens = word_tokenize(temp)
    tokens = [reduce_lengthening(w) for w in tokens]
    tokens = [lemm.lemmatize(w) for w in tokens]
    tokens = [w for w in tokens if len(w) > 2]

    return " ".join(tokens)

# applying preprocessing to training and test data
x_train_clean = [text_preprocess(x) for x in x_train]
x_test_clean = [text_preprocess(x) for x in x_test]

# building feature extraction pipeline using ngrams and tfidf weighting
features = Pipeline([
    ("vectorizer", CountVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        stop_words="english",
        min_df=2,
        max_df=0.9,
        max_features=30000
    )),
    ("tfidf", TfidfTransformer())
])

# combining feature extraction with linear svm classifier
pipeline = Pipeline([
    ("features", features),
    ("clf", LinearSVC(
        C=2.0,
        multi_class='ovr',
        class_weight={
            "negative": 1,
            "neutral": 1,
            "positive": 1.4
        }
    ))
])

# training the model
pipeline.fit(x_train_clean, y_train)

# evaluating model performance
predictions = pipeline.predict(x_test_clean)

print("accuracy:", accuracy_score(y_test, predictions))
print(classification_report(y_test, predictions))

# exporting trained model to onnx format for fast inference in api
onnx_model = convert_sklearn(
    pipeline,
    initial_types=[("input", StringTensorType([None]))],
    options={id(pipeline.named_steps["clf"]): {"raw_scores": True}}
)

# saving onnx model to disk for loading in api
model_path = os.path.join(MODELS_DIR, "svm_model.onnx")

with open(model_path, "wb") as f:
    f.write(onnx_model.SerializeToString())

# generating confusion matrix to visualise performance
labels = ["negative", "neutral", "positive"]
cm = confusion_matrix(y_test, predictions, labels=labels)

plt.figure(figsize=(6, 5))
sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=labels,
    yticklabels=labels,
    cbar=True
)
    
plt.title("LinearSVC - Confusion Matrix")
plt.xlabel("Predicted Label")
plt.ylabel("True Label")

plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=300)
plt.show()