package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/kataras/iris/v12"
)

type StockHoldings struct {
	Name string `json:"name"`
}

type NewsRequest struct {
	CurrentStocks []StockHoldings `json:"current_stocks"`
}

type Article struct {
	Image     string `json:"image"`
	Name      string `json:"name"`
	Headline  string `json:"headline"`
	Source    string `json:"source"`
	URL       string `json:"url"`
	Date      string `json:"date"`
	Sentiment string `json:"sentiment"`
}

type StockSentiment struct {
	Score    float64 `json:"score"`
	Label    string  `json:"label"`
	Articles int     `json:"articles"`
}
type NewsResponse struct {
	Success  bool      `json:"success"`
	Names    []string  `json:"names"`
	Count    int       `json:"count"`
	Articles []Article `json:"articles"`
}

type NewsAPIRequest struct {
	Names []string `json:"names"`
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

	// get the names from stock holdings
	names := make([]string, len(req.CurrentStocks))
	for i, stock := range req.CurrentStocks {
		names[i] = stock.Name
	}

	// create request for Python API
	apiReq := NewsAPIRequest{Names: names}
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

func GetStockSentiment(ctx iris.Context) {

	var req NewsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(400)
		return
	}

	names := make([]string, len(req.CurrentStocks))
	for i, stock := range req.CurrentStocks {
		names[i] = stock.Name
	}

	if len(names) == 0 {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "No stock names provided"})
		return
	}

	apiReq := NewsAPIRequest{Names: names}
	reqBody, _ := json.Marshal(apiReq)

	resp, err := http.Post(
		"http://localhost:8000/stock-sentiment",
		"application/json",
		bytes.NewBuffer(reqBody),
	)

	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to call sentiment api"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to read resp"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		ctx.StatusCode(resp.StatusCode)
		ctx.Write(body)
		return
	}

	var sentimentResp map[string]StockSentiment
	if err := json.Unmarshal(body, &sentimentResp); err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to parse res"})
		return
	}

	ctx.JSON(sentimentResp)
}
