FROM python:3.10

# install go
RUN apt-get update && apt-get install -y golang

WORKDIR /app

COPY . .

# install python dependencies
RUN pip install --no-cache-dir -r micro-services/requirements.txt

RUN python -m nltk.downloader punkt wordnet

# build go backend
WORKDIR /app/backend
RUN go mod download
RUN go build -o main .

WORKDIR /app

EXPOSE 8080

# run both services
CMD sh -c "uvicorn micro-services.main:app --host 0.0.0.0 --port 8000 & ./backend/main"