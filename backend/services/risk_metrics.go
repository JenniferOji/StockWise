package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Stock struct {
	Ticker        string  `json:"ticker"`
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

// either returns the risk metrics respinse or an error 
func CalculateRiskMetrics(stocks []Stock) (*RiskMetricsResponse, error) {
	requestBody := RiskMetricsRequest{
		Stocks: stocks,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	// calling the fastAPI microservice
	resp, err := http.Post(
		//"http://localhost:8000/api/risk-metrics",
		"http://192.168.1.6:8000/api/risk-metrics",
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
