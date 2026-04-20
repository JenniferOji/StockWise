package routes

import (
	"errors"
	"strings"

	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/kataras/iris/v12"
)

// handles stock risk request
func GetStockRisk(ctx iris.Context) {
	// read symbol from route
	symbol := strings.TrimSpace(ctx.Params().Get("symbol"))
	if symbol == "" {
		ctx.StatusCode(400)
		ctx.JSON(map[string]string{"error": "Symbol is required"})
		return
	}

	// run stock risk check in service layer
	result, err := services.CheckStockRisk(symbol)
	if err != nil {
		// pass back clear errors from ml api
		var upstreamErr *services.UpstreamHTTPError
		if errors.As(err, &upstreamErr) {
			ctx.StatusCode(upstreamErr.StatusCode)
			ctx.JSON(map[string]string{"detail": upstreamErr.Body})
			return
		}

		ctx.StatusCode(500)
		ctx.JSON(map[string]string{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}
