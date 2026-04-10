package routes 

import (
	"log"
	"github.com/kataras/iris/v12"
	"github.com/YourGitHubUser/StockWise/backend/services"
)


func GetPerformanceMetrics(ctx iris.Context) {
	log.Println("[PerformanceMetrics] Incoming request to /api/services/performance-metrics")
	var req services.PerformanceMetricsRequest
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
	result, err := services.CalculatePerformanceMetrics(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}