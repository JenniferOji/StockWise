package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type PerformanceMetricsRequest struct {
	Stocks []PerformanceStock `json:"stocks"`
	Days   int                `json:"days"`
}

type PerformanceStock struct {
	Symbol        string  `json:"symbol"`
	Shares        float64 `json:"shares"`
	PurchasePrice float64 `json:"purchase_price"`
}

type PriceComparison struct {
	PurchasePrice float64 `json:"purchase_price"`
	CurrentPrice  float64 `json:"current_price"`
	ReturnPct     string  `json:"return_pct"`
}

type Performer struct {
	Symbol    string  `json:"symbol"`
	Profit    float64 `json:"profit"`
	ReturnPct float64 `json:"return_pct"`
}

type PerformanceMetricsResponse struct {
	Success bool `json:"success"`
	Metrics struct {
		OverallReturn   string                     `json:"overall_return"`
		ReturnsBySymbol map[string]string          `json:"returns_by_symbol"`
		PriceComparison map[string]PriceComparison `json:"price_comparison"`
	} `json:"metrics"`

	PortfolioValue float64   `json:"portfolio_value"`
	TotalInvested  float64   `json:"total_invested"`
	ProfitLoss     float64   `json:"profit_loss"`
	BestPerformer  Performer `json:"best_performer"`
	WorstPerformer Performer `json:"worst_performer"`
}

// calls performance metrics endpoint
func CalculatePerformanceMetrics(req PerformanceMetricsRequest) (*PerformanceMetricsResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/performance-metrics"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// build request payload
	requestBody := PerformanceMetricsRequest{
		Stocks: req.Stocks,
		Days:   req.Days,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	// call ml service
	url := mlApiUrl + endpoint

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	// read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("performance metrics service error: %s", string(body))
	}

	// parse json response
	var result PerformanceMetricsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
