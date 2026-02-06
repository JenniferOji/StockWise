package routes

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
