package routes

import (
	"log"

	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

func GetPerformanceMetrics(ctx iris.Context) {
	log.Println("[PerformanceMetrics] Incoming request to /api/services/performance-metrics")
	var req services.PerformanceMetricsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}
	if len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}

	for i, stock := range req.Stocks {
		if stock.Symbol == "" {
			ctx.StatusCode(iris.StatusBadRequest)
			ctx.JSON(iris.Map{"error": "Invalid stock payload", "details": "symbol is required", "index": i})
			return
		}
		if stock.Shares <= 0 {
			ctx.StatusCode(iris.StatusBadRequest)
			ctx.JSON(iris.Map{"error": "Invalid stock payload", "details": "shares must be greater than 0", "index": i})
			return
		}
	}

	result, err := services.CalculatePerformanceMetrics(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}
