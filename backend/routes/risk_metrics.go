package routes

import (
	"log"

	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

func GetRiskMetrics(ctx iris.Context) {
	log.Println("[RiskMetrics] Incoming request to /api/services/risk-metrics")
	var req services.RiskMetricsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}
	log.Printf("[RiskMetrics] Request body: %+v\n", req)
	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}
	result, err := services.CalculateRiskMetrics(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}

func GetStockRiskCategories(ctx iris.Context) {
	log.Println("[StockRiskCategories] Incoming request to /api/services/stock-risk-categories")
	var req services.StockRiskCategoriesRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}

	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}

	result, err := services.CalculateStockRiskCategories(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
