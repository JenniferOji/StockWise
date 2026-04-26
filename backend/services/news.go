package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type StockHoldings struct {
	Name string `json:"name"`
}

type NewsRequest struct {
	CurrentStocks []StockHoldings `json:"current_stocks"`
}

type Article struct {
	Image          string `json:"image"`
	Name           string `json:"name"`
	Symbol         string `json:"symbol"`
	Headline       string `json:"headline"`
	Source         string `json:"source"`
	URL            string `json:"url"`
	Date           string `json:"date"`
	LinearsvmModel string `json:"linearsvm_model"`
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

func GetStockNews(req NewsRequest) (*NewsResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/stock-news"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// map holdings into names
	names := make([]string, len(req.CurrentStocks))
	for i, stock := range req.CurrentStocks {
		names[i] = stock.Name
	}

	// build request payload
	apiReq := NewsAPIRequest{Names: names}
	reqBody, err := json.Marshal(apiReq)
	if err != nil {
		return nil, err
	}

	// call ml service
	url := mlApiUrl + endpoint
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// parse json response
	var newsResp NewsResponse
	if err := json.Unmarshal(body, &newsResp); err != nil {
		return nil, err
	}

	return &newsResp, nil
}

func GetStockSentiment(req NewsRequest) (map[string]StockSentiment, int, []byte, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/stock-sentiment"

	if mlApiUrl == "" {
		return nil, http.StatusInternalServerError, nil, fmt.Errorf("ML_API_URL not set")
	}

	// map holdings into names
	names := make([]string, len(req.CurrentStocks))
	for i, stock := range req.CurrentStocks {
		names[i] = stock.Name
	}

	if len(names) == 0 {
		return nil, http.StatusBadRequest, nil, fmt.Errorf("No stock names provided")
	}

	// build request payload
	apiReq := NewsAPIRequest{Names: names}
	reqBody, err := json.Marshal(apiReq)
	if err != nil {
		return nil, http.StatusInternalServerError, nil, err
	}

	// call ml service
	url := mlApiUrl + endpoint
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, http.StatusInternalServerError, nil, fmt.Errorf("Failed to call sentiment api")
	}
	defer resp.Body.Close()

	// read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, http.StatusInternalServerError, nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, body, fmt.Errorf("sentiment service returned %d", resp.StatusCode)
	}

	// parse json response
	var sentimentResp map[string]StockSentiment
	if err := json.Unmarshal(body, &sentimentResp); err != nil {
		return nil, http.StatusInternalServerError, nil, err
	}

	return sentimentResp, http.StatusOK, nil, nil
}
