package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type StockRiskCheckRequest struct {
	Symbol string `json:"symbol"`
}

type StockRiskCheckResponse struct {
	Success     bool   `json:"success"`
	Symbol      string `json:"symbol"`
	CompanyName string `json:"company_name"`
	Sector      string `json:"sector"`
	Cluster     int    `json:"cluster"`
	RiskLevel   string `json:"risk_level"`
	Metrics     struct {
		LogVariances float64 `json:"log_variances"`
		Volatility   float64 `json:"volatility"`
		Var95        float64 `json:"var_95"`
	} `json:"metrics"`
	Message string `json:"message,omitempty"`
}

type UpstreamHTTPError struct {
	StatusCode int
	Body       string
}

func (e *UpstreamHTTPError) Error() string {
	return fmt.Sprintf("ML API error (%d): %s", e.StatusCode, e.Body)
}

func CheckStockRisk(symbol string) (*StockRiskCheckResponse, error) {
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/check-stock-risk"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	requestBody := StockRiskCheckRequest{
		Symbol: symbol,
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

	var stockRiskResp StockRiskCheckResponse
	if err := json.Unmarshal(body, &stockRiskResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &stockRiskResp, nil
}