package routes

import (
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// handles diversification suggestions request
func GetDiversificationSuggestions(ctx iris.Context) {
	// read request body
	var req services.DiversificationRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	// run diversification logic in service layer
	result, err := services.GetDiversificationSuggestions(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

// handles random suggestions request
func GetRandomSuggestions(ctx iris.Context) {
	// read request body
	var req services.DiversificationRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	// run random suggestion logic in service layer
	result, err := services.GetRandomSuggestions(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
