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

// either returns the risk metrics respinse or an error
func CalculateRiskMetrics(stocks []Stock) (*RiskMetricsResponse, error) {
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/risk-metrics"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}
	requestBody := RiskMetricsRequest{
		Stocks: stocks,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	// calling the fastAPI microservice
	url := mlApiUrl + endpoint
	// url := "http://192.168.1.19:8000" + endpoint

	resp, err := http.Post(
		url,
		"application/json",
		// bytes because http.Post requires an io.Reader
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, err
	}
	// ensures the response body is closed after reading
	defer resp.Body.Close()

	// read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// checking for non-200 status codes to know if there was an error
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("risk metrics service error: %s", string(body))
	}

	// parse the JSON response into RiskMetricsResponse struct
	var result RiskMetricsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// returns a risk bucket for each stock symbol
func CalculateStockRiskCategories(stocks []Stock) (*StockRiskCategoriesResponse, error) {
	requestBody := StockRiskCategoriesRequest{
		Stocks: stocks,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/stock-risk-categories"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	url := mlApiUrl + endpoint
	// url := "http://fastapi:8000" + endpoint 

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stock risk categories service error: %s", string(body))
	}

	var result StockRiskCategoriesResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}