package routes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/kataras/iris/v12"
)

type DiversificationRequest struct {
	CurrentStocks      []string `json:"current_stocks"`
	UserRiskPreference string   `json:"user_risk_preference"`
}

type DiversificationResponse struct {
	Success        bool     `json:"success"`
	RiskPreference string   `json:"risk_preference"`
	Suggestions    []string `json:"suggestions"`
	Count          int      `json:"count"`
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

	// Call FastAPI endpoint
	resp, err := http.Post(
		"http://localhost:8000/api/diversification-suggestions",
		"application/json",
		bytes.NewBuffer(reqBody),
	)

}

	
