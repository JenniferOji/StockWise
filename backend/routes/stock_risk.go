package routes

import (
	"github.com/kataras/iris/v12"
	"github.com/YourGitHubUser/StockWise/backend/services"
)

type StockRiskRequest struct {
	Symbol string `json:"symbol"`
}

func CheckStockRisk(ctx iris.Context) {
	var req StockRiskRequest

	// validation on the request body
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	if req.Symbol == "" {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "Symbol is required"})
		return
	}

	// call the service function to check stock risk
	result, err := services.CheckStockRisk(req.Symbol)
	if err != nil {
		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}