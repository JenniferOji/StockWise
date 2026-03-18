package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type StockHolding struct {
    Ticker        string  `json:"ticker"`
    Shares        float64 `json:"shares"`
    PurchasePrice float64 `json:"purchase_price"`
}

type PerformanceMetricsRequest struct {
       Stocks []StockHolding `json:"stocks"`
       Days   int            `json:"days"`
}

type PerformanceMetricsResponse struct {
    Success         bool `json:"success"`
    Metrics         struct {
        OverallReturn    string            `json:"overall_return"`
        AnnualizedReturn string            `json:"annualized_return"`
        ReturnsByTicker  map[string]string `json:"returns_by_ticker"`
    } `json:"metrics"`
    PortfolioValue float64 `json:"portfolio_value"`
    BestPerformer  string  `json:"best_performer"`
    WorstPerformer string  `json:"worst_performer"`
}

// calls the FastAPI microservice for performance metrics
func CalculatePerformanceMetrics(req PerformanceMetricsRequest) (*PerformanceMetricsResponse, error) {
       requestBody := PerformanceMetricsRequest{
	       Stocks: req.Stocks,
	       Days:   req.Days,
       }

       jsonData, err := json.Marshal(requestBody)
       if err != nil {
	       return nil, err
       }

       fastAPIURL := "http://localhost:8000"

       resp, err := http.Post(
	       fastAPIURL+"/api/performance-metrics",
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
       return nil, fmt.Errorf("performance metrics service error: %s", string(body))
       }

       var result PerformanceMetricsResponse
       if err := json.Unmarshal(body, &result); err != nil {
	       return nil, err
       }

       return &result, nil
}
