package routes

type StockHoldings struct {
	Symbol string `json:"symbol"`
}

type NewsRequest struct {
	CurrentStocks []StockHolding `json:"current_stocks"`
}

type Article struct {
	Image    string `json:"image"`
	Ticker   string `json:"ticker"`
	Headline string `json:"headline"`
	Source   string `json:"source"`
}

type NewsResponse struct {
	Success  bool      `json:"success"`
	Tickers  []string  `json:"tickers"`
	Count    int       `json:"count"`
	Articles []Article `json:"articles"`
}
