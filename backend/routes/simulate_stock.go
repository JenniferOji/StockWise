package routes

import (
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

type SimulateStockRequest struct {
	CurrentStocks []services.PortfolioStock `json:"current_stocks"`
	NewStock      services.PortfolioStock   `json:"new_stock"`
}

func SimulateStock(ctx iris.Context) {
	var req SimulateStockRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"detail": "Invalid request"})
		return
	}

	if req.NewStock.Symbol == "" {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"detail": "Symbol is required"})
		return
	}

	quantity := 0.0
	if req.NewStock.Quantity != nil {
		quantity = *req.NewStock.Quantity
	}

	result, err := services.SimulateStock(
		req.NewStock.Symbol,
		quantity,
		req.CurrentStocks,
	)

	if err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"detail": err.Error()})
		return
	}

	ctx.JSON(result)
}
