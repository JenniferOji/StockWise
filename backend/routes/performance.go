package routes

import (
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// handles performance metrics request
func GetPerformanceMetrics(ctx iris.Context) {
	// read request body
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

	// check each stock has valid values
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

	// run performance calculation in service layer
	result, err := services.CalculatePerformanceMetrics(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}
