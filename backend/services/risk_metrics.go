package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type Stock struct {
	Symbol        string  `json:"symbol"`
	Shares        float64 `json:"shares"`
	PurchasePrice float64 `json:"purchase_price"`
}

type RiskMetricsRequest struct {
	Stocks []Stock `json:"stocks"`
}

type RiskMetricsResponse struct {
	Success        bool              `json:"success"`
	Metrics        map[string]string `json:"metrics"`
	PortfolioValue float64           `json:"portfolio_value"`
}

type StockRiskCategoriesRequest struct {
	Stocks []Stock `json:"stocks"`
}

type StockRiskCategory struct {
	Symbol       string  `json:"symbol"`
	RiskBucket   string  `json:"risk_bucket"`
	Volatility   float64 `json:"volatility"`
	MaxDrawdown  float64 `json:"max_drawdown"`
	AnnualReturn float64 `json:"annual_return"`
	Sharpe       float64 `json:"sharpe"`
	Var95        float64 `json:"var_95"`
}

type StockRiskCategoriesResponse struct {
	Success       bool                           `json:"success"`
	Categories    map[string][]StockRiskCategory `json:"categories"`
	Total         int                            `json:"total"`
	PortfolioRisk string                         `json:"portfolio_risk"`
}

// calls risk metrics endpoint
func CalculateRiskMetrics(stocks []Stock) (*RiskMetricsResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/risk-metrics"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// build the request 
	requestBody := RiskMetricsRequest{
		Stocks: stocks,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	// call ml service
	url := mlApiUrl + endpoint

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// handle errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("risk metrics service error: %s", string(body))
	}

	// parse json response
	var result RiskMetricsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// calls stock risk categories endpoint
func CalculateStockRiskCategories(stocks []Stock) (*StockRiskCategoriesResponse, error) {
	// build the request payload
	requestBody := StockRiskCategoriesRequest{
		Stocks: stocks,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	// get the ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/stock-risk-categories"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// call the ml service
	url := mlApiUrl + endpoint

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stock risk categories service error: %s", string(body))
	}

	// parse the json response
	var result StockRiskCategoriesResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
