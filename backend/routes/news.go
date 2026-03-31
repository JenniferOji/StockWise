package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"github.com/kataras/iris/v12"
	"fmt"
)

type StockHoldings struct {
	Name string `json:"name"`
}

type NewsRequest struct {
	CurrentStocks []StockHoldings `json:"current_stocks"`
}

type Article struct {
	Image      string `json:"image"`
	Name       string `json:"name"`
	Symbol     string `json:"symbol"`
	Headline   string `json:"headline"`
	Source     string `json:"source"`
	URL        string `json:"url"`
	Date       string `json:"date"`
	CatboostModel  string `json:"catboost_model"`
	// FinBERT    string `json:"finbert"`
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
	mlApiUrl := os.Getenv("ML_API_URL")
    endpoint := "/stock-news"

	if mlApiUrl == "" {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "ML_API_URL not set"})
		return
	}

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
	url := mlApiUrl + endpoint
	// url := "http://fastapi:8000" + endpoint


	resp, err := http.Post(url,"application/json",bytes.NewBuffer(reqBody))

	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	// read the response from the fastapi
	body, err := io.ReadAll(resp.Body)
	fmt.Println("RAW FASTAPI RESPONSE:", string(body))

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

	mlApiUrl := os.Getenv("ML_API_URL")
    endpoint := "/stock-sentiment"

	if mlApiUrl == "" {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "ML_API_URL not set"})
		return
	}

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

	url := mlApiUrl + endpoint
	
	resp, err := http.Post(
		url,
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
