package routes

import (
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// GetDiversificationSuggestions handles HTTP requests.
func GetDiversificationSuggestions(ctx iris.Context) {
	var req services.DiversificationRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	result, err := services.GetDiversificationSuggestions(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

func GetRandomSuggestions(ctx iris.Context) {
	var req services.DiversificationRequest

	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(map[string]string{"error": "Invalid body"})
		return
	}

	result, err := services.GetRandomSuggestions(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
