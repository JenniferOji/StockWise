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

type DiversificationComparison struct {
	CurrentVolatility         *float64 `json:"current_volatility"`
	WithSuggestionsVolatility *float64 `json:"with_suggestions_volatility"`
}

type SectorAllocation struct {
	Sector     string  `json:"sector"`
	Percentage float64 `json:"percentage"`
}

type RandomSuggestionComparison struct {
	CurrentPortfolio []SectorAllocation `json:"current_portfolio"`
	WithSuggestions  []SectorAllocation `json:"with_suggestions"`
}

type DiversificationResponse struct {
	Success        bool                      `json:"success"`
	Suggestions    []StockSuggestion         `json:"suggestions"`
	RiskPreference string                    `json:"risk_preference"`
	Comparison     DiversificationComparison `json:"comparison"`
	Message        string                    `json:"message,omitempty"`
}

type RandomSuggestionResponse struct {
	Success        bool                       `json:"success"`
	Suggestions    []StockSuggestion          `json:"suggestions"`
	RiskPreference string                     `json:"risk_preference"`
	Comparison     RandomSuggestionComparison `json:"comparison"`
	Message        string                     `json:"message,omitempty"`
}

func GetDiversificationSuggestions(req DiversificationRequest) (*DiversificationResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/diversification-suggestions"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// build request payload
	reqBody, err := json.Marshal(req)
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

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("diversification service error: %s", string(body))
	}

	// parse json response
	var result DiversificationResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func GetRandomSuggestions(req DiversificationRequest) (*RandomSuggestionResponse, error) {
	// get ml service url
	mlApiUrl := os.Getenv("ML_API_URL")
	endpoint := "/api/random-suggestions"

	if mlApiUrl == "" {
		return nil, fmt.Errorf("ML_API_URL not set")
	}

	// build request payload
	reqBody, err := json.Marshal(req)
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

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("random suggestions service error: %s", string(body))
	}

	// parse json response
	var result RandomSuggestionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
