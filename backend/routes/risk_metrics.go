package routes

import (
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// handles risk metrics request
func GetRiskMetrics(ctx iris.Context) {
	// read request body
	var req services.RiskMetricsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}
	// check stock list is present
	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}

	// run risk metrics in service layer
	result, err := services.CalculateRiskMetrics(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

func GetStockRiskCategories(ctx iris.Context) {
	// read request body
	var req services.StockRiskCategoriesRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}

	// check stock list is present
	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}

	// run category mapping in service layer
	result, err := services.CalculateStockRiskCategories(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
