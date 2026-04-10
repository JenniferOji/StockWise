package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type StockHolding struct {
	Symbol        string  `json:"symbol"`
	Sector        string  `json:"sector,omitempty"`
	Quantity      float64 `json:"quantity,omitempty"`
	PurchasePrice float64 `json:"purchase_price,omitempty"`
}

type DiversificationRequest struct {
	CurrentStocks      []StockHolding `json:"current_stocks"`
	UserRiskPreference string         `json:"user_risk_preference"`
}

type StockSuggestion struct {
	Symbol      string `json:"symbol"`
	CompanyName string `json:"company_name"`
	Sector      string `json:"sector"`
	Reason      string `json:"reason"`
}

type SectorAllocation struct {
	Sector     string  `json:"sector"`
	Percentage float64 `json:"percentage"`
}

type DiversificationComparison struct {
	CurrentPortfolio          []SectorAllocation `json:"current_portfolio"`
	WithSuggestions           []SectorAllocation `json:"with_suggestions"`
	CurrentVolatility         *float64           `json:"current_volatility"`
	WithSuggestionsVolatility *float64           `json:"with_suggestions_volatility"`
}

type DiversificationResponse struct {
	Success        bool                      `json:"success"`
	Suggestions    []StockSuggestion         `json:"suggestions"`
	RiskPreference string                    `json:"risk_preference"`
	Comparison     DiversificationComparison `json:"comparison"`
	Message        string                    `json:"message,omitempty"`
}

type RandomSuggestionResponse struct {
	Success        bool              `json:"success"`
	Suggestions    []StockSuggestion `json:"suggestions"`
	RiskPreference string            `json:"risk_preference"`
	Message        string            `json:"message,omitempty"`
}

func GetDiversificationSuggestions(req DiversificationRequest) (*DiversificationResponse, error) {
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/diversification-suggestions"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	url := mlApiUrl + endpoint
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result DiversificationResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func GetRandomSuggestions(req DiversificationRequest) (*RandomSuggestionResponse, error) {
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/random-suggestions"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	url := mlApiUrl + endpoint
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result RandomSuggestionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
