# import libraries for sentiment analysis
import pandas as pd  # read dataset
import numpy as np  # numeric operations
from textblob import TextBlob  # get subjectivity for each text
import re  # text cleaning
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  # get VADER scores for each text
from sklearn.model_selection import train_test_split  # split data into train and test sets
from sklearn.metrics import classification_report  # evaluate model performance
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis  # classifier to predict sentiment labels

from newsapi import NewsApiClient
import pandas as pd
import yfinance as yf
from pathlib import Path

from pathlib import Path

current_directory = Path(__file__).parent  # current scripts directory
headlines_path = current_directory / "training_data" / "djia_news.csv"
djia_path = current_directory / "training_data" / "djia_price_table.csv"

# reference : https://www.youtube.com/watch?v=4OlvGGAsj8I&t=698s
# headlines_path = Path("training_data/djia_news.csv")
# djia_path = Path("training_data/djia_price_table.csv")

df1 = pd.read_csv(headlines_path, encoding="cp1252", low_memory=False, parse_dates=["Date"])
df2 = pd.read_csv(djia_path, encoding="cp1252", low_memory=False, parse_dates=["Date"])
print("df1:", df1.shape)
print(df1.head(3))

print("df2:", df2.shape)
print(df2.head(3))

# create a new dataset merging headlines and DJIA data on Date
merge = df1.merge(df2, how="inner", on="Date")

# show the merged dataset
merge.head(3)

# combine news headlines into one column
headlines = []

# for each row in the dataframe, combine the news headlines into one string - iloc is used to access the rows and columns by index
for row in range(0, len(merge.index)):
    headlines.append(' '.join(str(x) for x in merge.iloc[row, 2:27]))  # 25 news headlines from column 2 to 26

# print a sample of the combined headlines
headlines[0]

# clean the dataset
clean_headlines = []

for i in range(0, len(headlines)):
    # replace non-alphabetic characters with spaces
    clean_headlines.append(re.sub("b[(')]", ' ', headlines[i]))  # remove b'
    clean_headlines[i] = re.sub('b[(")]', ' ', clean_headlines[i])  # remove b"
    # clean_headlines[i] = re.sub("[\ ']", ' ', clean_headlines[i])  # remove \'
    clean_headlines[i] = re.sub(r"[\ ']", ' ', clean_headlines[i])  # remove \'

# show the combined cleaned headlines
clean_headlines[20]

# add clean headlines to the merge dataset
merge['Combined News'] = clean_headlines

# subjectivity is a measure of how subjective or objective a text is, ranging from 0 (very objective) to 1 (very subjective) - if it is based on facts or opinions
def getSubjectivity(text):
    return TextBlob(text).sentiment.subjectivity  # textblob function to get subjectivity score which ranges from 0 to 1

# polarity is a measure of how positive or negative a text is, ranging from -1 (very negative) to 1 (very positive)
def getPolarity(text):
    return TextBlob(text).sentiment.polarity

# create two new columns to add to the merged datasets - gets text from combined news column
merge['Subjectivity'] = merge['Combined News'].apply(getSubjectivity)  # apply to function to the rows in the 'Combined News' column
merge['Polarity'] = merge['Combined News'].apply(getPolarity)
merge.head(3)

# get the sentiment scores using SentimentIntensityAnalyser
def getSIA(text):
    sia = SentimentIntensityAnalyzer()
    sentiment = sia.polarity_scores(text)
    return sentiment

# get sentiment scores for each day
compound = []  # the score that calculates the combined score of the lexicon ratings
negative = []
positive = []
neutral = []
SIA = 0

for i in range(0, len(merge['Combined News'])):
    SIA = getSIA(merge['Combined News'][i])  # takes in the merged text
    compound.append(SIA['compound'])
    negative.append(SIA['neg'])
    neutral.append(SIA['neu'])
    positive.append(SIA['pos'])

# store the sentiment scores in the merged dataset
merge['Compound'] = compound
merge['Negative'] = negative
merge['Neutral'] = neutral
merge['Positive'] = positive

# collapse data to train our model on model
# a list of columns to keep
keep_columns = ['Open', 'High', 'Low', 'Volume', 'Subjectivity', 'Polarity', 'Compound', 'Negative', 'Neutral', 'Positive', 'Label']
# Define explicit feature columns (same order used for training and prediction)
features_columns = ['Open', 'High', 'Low', 'Volume', 'Subjectivity', 'Polarity', 'Compound', 'Negative', 'Neutral', 'Positive']
df = merge[keep_columns]
df.head(3)

# create the feature dataset
# Use explicit feature columns to ensure consistent ordering between training and prediction
X = df[features_columns].to_numpy()  # features as numpy array

# the target dataset - contained in the label column
y = df['Label'].to_numpy()
# split the data into 80% training the model and 20% of the data will be for testing the model
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
# create and train the model
model = LinearDiscriminantAnalysis().fit(x_train, y_train)
# show the model predictions and a simple aggregated confidence metric
predictions = model.predict(x_test)

# Try to get class probabilities if the model supports it, otherwise fall back to proportion of predicted labels
import numpy as _np
try:
    probs = model.predict_proba(x_test)
    # average probability across the test set for each class
    avg_prob = probs.mean(axis=0)
    pred_label = int(_np.argmax(avg_prob))
    confidence = float(avg_prob[pred_label])
except Exception:
    # fallback: use fraction of predictions equal to the modal predicted label
    pred_label = int(_np.round(predictions.mean()))  # 1 if majority are 1 else 0
    confidence = float((predictions == pred_label).mean())

label_str = 'UP' if pred_label == 1 else 'DOWN'
pct = int(round(confidence * 100))
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M GMT')
model_version = 'v1'
print(f'"Prediction: {label_str} ({pct}% probability) — Model {model_version}, generated {ts}"')

# also show raw predictions and a quick distribution for inspection
print('\nPrediction distribution (counts):')
unique, counts = _np.unique(predictions, return_counts=True)
print(dict(zip(unique.astype(int).tolist(), counts.tolist())))

# add per row predictions to the dataset df using the trained model
# this cell appends Prediction (0/1) and Prediction probability
features = df[features_columns]
full_X = features.to_numpy()

try:
    full_probs = model.predict_proba(full_X)
    full_pred = full_probs.argmax(axis=1)
    full_conf = full_probs.max(axis=1)
except Exception:
    # if model doesn't support predict_proba it falls back to direct predict
    full_pred = model.predict(full_X)
    full_conf = None

# attach predictions to df
# keep numeric 0/1 for later use
df['Prediction'] = full_pred
if full_conf is not None:
    df['Prediction_Prob'] = full_conf

# show the model metrics
print(classification_report(y_test, predictions))