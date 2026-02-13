import os
import pickle
import re
from pathlib import Path

import matplotlib.pyplot as plt
import nltk
import numpy as np
import pandas as pd
import requests
from autocorrect import Speller
from catboost import CatBoostClassifier
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer, TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

spell = Speller(lang='en')

# https://medium.com/@lei.xiaofan/quick-start-building-sentiment-analysis-models-8c1e78c30b2c
# Download tokenizers and lemmatization dataset
nltk.download('punkt')
nltk.download('wordnet')

inputpath = 'input'
outputpath = 'outputs'
if os.path.exists(inputpath) is False:
    os.mkdir(inputpath)
if os.path.exists(outputpath) is False:
    os.mkdir(outputpath)

# load dataset
# resource 1: https://www.kaggle.com/datasets/myrios/news-sentiment-analysis?resource=download
news_sentiment_path = Path("C:/Users/35387/OneDrive - Atlantic TU\year 4/Applied Project/StockWise/ml/training_data/news_sentiment_data.csv")
df = pd.read_csv(news_sentiment_path, encoding="ISO-8859-1", low_memory=False)

colnames = ['Sentiment', 'Headline']

# replacing textual categories by integers
X = df.Headline.values
y = df.Sentiment.replace(4, 1)

# split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)

print("training size:", len(X_train))
print("testing size:", len(X_test))

# initialise lemmatizer which will be used in text_preprocess
lemm = WordNetLemmatizer()

# Fixing Word Lengthening
def reduce_lengthening(text):
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(r"\1\1", text)

def text_preprocess(doc):
    # Lowercasing all the letters
    temp = doc.lower()
    # Removing hashtags and mentions
    temp = re.sub("@[A-Za-z0-9_]+", "", temp)
    temp = re.sub("#[A-Za-z0-9_]+", "", temp)
    # Removing links
    temp = re.sub(r"http\S+", "", temp)
    temp = re.sub(r"www.\S+", "", temp)
    # Removing numbers
    temp = re.sub("[0-9]", "", temp)
    # Removing '
    temp = re.sub("'", " ", temp)

    # Tokenization
    temp = word_tokenize(temp)
    # Fixing Word Lengthening
    temp = [reduce_lengthening(w) for w in temp]
    # Spell corrector
    # temp = [spell(w) for w in temp]
    # Stem
    temp = [lemm.lemmatize(w) for w in temp]
    # Removing short words
    temp = [w for w in temp if len(w) > 1]
    temp = " ".join(w for w in temp)

    return temp

# text_preprocess("Sooo happppyyy to seee youuu!!! Visit my blog at http://example.com #excited @friend")
# 'soo happy see you visit blog'


tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_df=0.95)

# preprocess the raw text
X_train_clean = [text_preprocess(x) for x in X_train]
X_test_clean = [text_preprocess(x) for x in X_test]

# vectorising using the pipeline
pipe = make_pipeline(CountVectorizer(), TfidfTransformer())
pipe.fit(X_train_clean)

Xtrain = pipe.transform(X_train_clean)
Xtest = pipe.transform(X_test_clean)

# training
cat_classifier = CatBoostClassifier(
    iterations=1000,
    learning_rate=0.03,
    depth=6,
    od_type='Iter',
    od_wait=50,
    verbose=100, 
    objective='MultiClass'  # Ensure correct objective for a multiclass task
)

cat_classifier.fit(Xtrain, y_train, eval_set=(Xtest, y_test))

# prediction
predictions = cat_classifier.predict(Xtest)
print('Test score: %.2f\n' % (accuracy_score(y_test, predictions)))

print(classification_report(y_test, predictions))
print(confusion_matrix(y_test, predictions, labels=cat_classifier.classes_))

# one hot (binary) bag of words vectoriser
# binary=True gives 0/1 per word
vectorizer = CountVectorizer(binary=True)
X_train_vec = vectorizer.fit_transform(X_train_clean)
X_test_vec = vectorizer.transform(X_test_clean)

# quick checks
print("vocab size:", len(vectorizer.get_feature_names_out()))
print("X_train_vec shape:", X_train_vec.shape)
print("X_test_vec shape:", X_test_vec.shape)

# show the first headline vector as dense (only do for small check)
print("first headline:", X_train_clean[0])
print("first vector (nonzero indices):", X_train_vec[0].nonzero()[1])
print("first vector (as array) sample:", X_train_vec[0].toarray()[0][:50])  # first 50 features

res = cat_classifier.get_evals_result()

# Show structure so you can see available dataset names and metric names
print("Top-level keys (datasets):", list(res.keys()))
for ds_name, metrics in res.items():
    print(f"- {ds_name}: metrics = {list(metrics.keys())}")

# Choose dataset keys
ds_keys = list(res.keys())
train_key = ds_keys[0]
val_key = ds_keys[1] if len(ds_keys) > 1 else None

# Pick the first metric reported for the train set
metric = list(res[train_key].keys())[0]
print("\nPlotting metric:", metric, "for", train_key, "and", val_key)

# Prepare series
train_series = res[train_key][metric]
val_series = res[val_key][metric] if val_key is not None and metric in res[val_key] else None

plt.figure(figsize=(8, 4))
plt.plot(train_series, label=f'{train_key} ({metric})')
if val_series is not None:
    plt.plot(val_series, label=f'{val_key} ({metric})')
plt.xlabel('Iteration')
plt.ylabel(metric)
plt.legend()
plt.grid(True)
plt.show()


LABEL_MAP = {-1: "negative", 1: "positive", 0: "neutral"}
NAME_TO_ID = {v: k for k, v in LABEL_MAP.items()}

# resource for catboost export to onnx : https://catboost.ai/docs/en/concepts/apply-onnx-ml

# convert the preprocessing pipeline to ONNX
onnx_preprocessor = convert_sklearn(
    pipe, 
    initial_types=[('input', StringTensorType([None, 1]))]
)

with open("sentiment_preprocessor.onnx", "wb") as f:
    f.write(onnx_preprocessor.SerializeToString())

# saving the catboost model in ONNX format to use in the api microservice
cat_classifier.save_model(
    'sentiment_catboost_model.onnx',
    format='onnx',
    export_parameters={
        'onnx_domain': 'ai.catboost',
        'onnx_model_version': 1,
        'onnx_doc_string': 'News sentiment classification model',
        'onnx_graph_name': 'CatBoostModel_for_Sentiment'
    }
)

# saving the label mapping for inference
with open('sentiment_label_map.pkl', 'wb') as f:
    pickle.dump(LABEL_MAP, f)


