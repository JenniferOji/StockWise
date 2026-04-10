package routes

import (
	"net/http"

	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// GetStockNews handles http requests for stock news
func GetStockNews(ctx iris.Context) {
	var req services.NewsRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(http.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	result, err := services.GetStockNews(req)
	if err != nil {
		ctx.StatusCode(http.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

func GetStockSentiment(ctx iris.Context) {
	var req services.NewsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(http.StatusBadRequest)
		return
	}

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
