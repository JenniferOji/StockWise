package routes

import (
	"net/http"
	"strings"

	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// handles stock news request
func GetStockNews(ctx iris.Context) {
	// read symbol from route
	symbol := strings.TrimSpace(ctx.Params().Get("symbol"))
	if symbol == "" {
		ctx.StatusCode(http.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Symbol is required"})
		return
	}

	// build request for service
	req := services.NewsRequest{
		CurrentStocks: []services.StockHoldings{{Name: symbol}},
	}

	// call news service
	result, err := services.GetStockNews(req)
	if err != nil {
		ctx.StatusCode(http.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

// handles stock sentiment request
func GetStockSentiment(ctx iris.Context) {
	// read symbol from route
	symbol := strings.TrimSpace(ctx.Params().Get("symbol"))
	if symbol == "" {
		ctx.StatusCode(http.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Symbol is required"})
		return
	}

	// build request for service
	req := services.NewsRequest{
		CurrentStocks: []services.StockHoldings{{Name: symbol}},
	}

	// call sentiment service and keep upstream status
	result, statusCode, upstreamBody, err := services.GetStockSentiment(req)
	if err != nil {
		if len(upstreamBody) > 0 {
			ctx.StatusCode(statusCode)
			ctx.Write(upstreamBody)
			return
		}

		ctx.StatusCode(statusCode)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
