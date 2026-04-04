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

type SimulateStockResponse struct {
	Success  bool   `json:"success"`
	Symbol   string `json:"symbol"`
	Quantity float64 `json:"quantity"`
	Impact   struct {
		VolatilityChange float64 `json:"volatility_change"`
		Var95Change      float64 `json:"var_95_change"`
	} `json:"impact"`
}

func SimulateStock(symbol string, quantity float64, current []PortfolioStock) (*SimulateStockResponse, error) {
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/simulate-stock"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

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

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, &UpstreamHTTPError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
		}
	}

	var result SimulateStockResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}