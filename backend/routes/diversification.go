package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"github.com/kataras/iris/v12"
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
	CurrentPortfolio []SectorAllocation `json:"current_portfolio"`
	WithSuggestions  []SectorAllocation `json:"with_suggestions"`
	CurrentVolatility *float64          `json:"current_volatility"`
	WithSuggestionsVolatility *float64  `json:"with_suggestions_volatility"`
}

type DiversificationResponse struct {
	Success        bool              `json:"success"`
	Suggestions    []StockSuggestion `json:"suggestions"`
	RiskPreference string            `json:"risk_preference"`
	Comparison     DiversificationComparison `json:"comparison"`
	Message        string            `json:"message,omitempty"`
}

// GetDiversificationSuggestions handles HTTP requests.
func GetDiversificationSuggestions(ctx iris.Context) {
	mlApiUrl := os.Getenv("ML_API_URL")
    endpoint := "/api/diversification-suggestions"

	if mlApiUrl == "" {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "ML_API_URL not set"})
		return
	}

	// variable to hold the request body
	var req DiversificationRequest

	// reads the JSON request body and binds it to the req variable
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	// converts the Go struct back into JSON bytes
	reqBody, err := json.Marshal(req)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to marshal"})
		return
	}

	// call FastAPI endpoint
	url := mlApiUrl + endpoint

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewBuffer(reqBody),
	)

	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to call to diversisifcation api"})
		return
	}
	defer resp.Body.Close()

	// read the response from the fastapi
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to read resp"})
		return
	}

	// parse the response the the fastapi
	var diversificationResp DiversificationResponse
	if err := json.Unmarshal(body, &diversificationResp); err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": "Failed to parse res"})
		return
	}

	ctx.JSON(diversificationResp)
}
