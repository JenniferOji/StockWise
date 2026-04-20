package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type PortfolioStock struct {
	Symbol   string   `json:"symbol"`
	Quantity *float64 `json:"quantity,omitempty"`
}

type SimulateStockRequest struct {
	CurrentStocks []PortfolioStock `json:"current_stocks"`
	NewStock      PortfolioStock   `json:"new_stock"`
}

type MetricChange struct {
	Before float64 `json:"before"`
	After  float64 `json:"after"`
	Change float64 `json:"change"`
}

type SimulateStockResponse struct {
	Success  bool    `json:"success"`
	Symbol   string  `json:"symbol"`
	Quantity float64 `json:"quantity"`
	Impact   struct {
		Volatility   MetricChange `json:"volatility"`
		Var95        MetricChange `json:"var_95"`
		MaxDrawdown  MetricChange `json:"max_drawdown"`
		AnnualReturn MetricChange `json:"annual_return"`
		Sharpe       MetricChange `json:"sharpe"`
	} `json:"impact"`
}

func SimulateStock(symbol string, quantity float64, current []PortfolioStock) (*SimulateStockResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/simulate-stock"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// build request payload
	requestBody := SimulateStockRequest{
		CurrentStocks: current,
		NewStock: PortfolioStock{
			Symbol:   symbol,
			Quantity: &quantity,
		},
	}

	reqBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// call ml service
	url := mlApiUrl + endpoint

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewBuffer(reqBody),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call ML API: %w", err)
	}
	defer resp.Body.Close()

	// read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// pass back upstream error details
	if resp.StatusCode >= 400 {
		return nil, &UpstreamHTTPError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
		}
	}

	// parse json response
	var result SimulateStockResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}
