package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/kataras/iris/v12"
)

type StockHoldings struct {
	Symbol string `json:"symbol"`
}

type NewsRequest struct {
	CurrentStocks []StockHoldings `json:"current_stocks"`
}

type Article struct {
	Image    string `json:"image"`
	Ticker   string `json:"ticker"`
	Headline string `json:"headline"`
	Source   string `json:"source"`
}

type NewsResponse struct {
	Success  bool      `json:"success"`
	Tickers  []string  `json:"tickers"`
	Count    int       `json:"count"`
	Articles []Article `json:"articles"`
}

type NewsAPIRequest struct {
	Tickers []string `json:"tickers"`
}

// GetStockNews handles http requests for stock news
func GetStockNews(ctx iris.Context) {
	// variable to hold the request body
	var req NewsRequest

	// reads the JSON request body and binds it to the req variable
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	// get the tickers from stock holdings
	tickers := make([]string, len(req.CurrentStocks))
	for i, stock := range req.CurrentStocks {
		tickers[i] = stock.Symbol
	}

	// create request for Python API
	apiReq := NewsAPIRequest{Tickers: tickers}
	reqBody, err := json.Marshal(apiReq)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to marshal"})
		return
	}

	// call call the fastAPI endpoint
	fastAPIURL := "http://localhost:8000"

	resp, err := http.Post(
		fastAPIURL+"/stock-news",
		"application/json",
		bytes.NewBuffer(reqBody),
	)

	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to call news api"})
		return
	}
	defer resp.Body.Close()

	// read the response from the fastapi
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to read resp"})
		return
	}

	// parse the response from the fastapi
	var newsResp NewsResponse
	if err := json.Unmarshal(body, &newsResp); err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to parse res"})
		return
	}

	ctx.JSON(newsResp)
}
