package services

// import (
// 	"bytes"
// 	"encoding/json"
// 	"fmt"
// 	"io"
// 	"net/http"
// )

type Stock struct {
	Ticker        string  `json:"ticker"`
	Shares        float64 `json:"shares"`
	PurchasePrice float64 `json:"purchase_price"`
}

type RiskMetricsRequest struct {
	Stocks []Stock `json:"stocks"`
}

type RiskMetricsResponse struct {
	Success        bool              `json:"success"`
	Metrics        map[string]string `json:"metrics"`
	PortfolioValue float64           `json:"portfolio_value"`
}

