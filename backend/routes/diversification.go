package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

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
	Symbol string `json:"symbol"`
	Sector string `json:"sector"`
	Reason string `json:"reason"`
}

type DiversificationResponse struct {
	Success        bool              `json:"success"`
	Suggestions    []StockSuggestion `json:"suggestions"`
	RiskPreference string            `json:"risk_preference"`
	Message        string            `json:"message,omitempty"`
}

// GetDiversificationSuggestions handles HTTP requests.
func GetDiversificationSuggestions(ctx iris.Context) {
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
	fastAPIURL := "http://localhost:8000"

	resp, err := http.Post(
		fastAPIURL+"/api/diversification-suggestions",
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
