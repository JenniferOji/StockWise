package main

import (
	"github.com/YourGitHubUser/StockWise/backend/routes"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/kataras/iris/v12"
	// "github.com/kataras/iris/v12/middleware/cors"

	_ "github.com/lib/pq"
)

func main() {

	godotenv.Load()
	storage.InitialiseDatabase()

	app := iris.New()

	// app.UseRouter(cors.New().
	// 	AllowOrigin("*").
	// 	Handler())

	app.UseRouter(func(ctx iris.Context) {
		origin := ctx.GetHeader("Origin")
		if origin != "" {
			ctx.Header("Access-Control-Allow-Origin", origin)
			ctx.Header("Vary", "Origin")
		} else {
			ctx.Header("Access-Control-Allow-Origin", "*")
		}

		ctx.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		ctx.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if ctx.Method() == iris.MethodOptions {
			ctx.StatusCode(iris.StatusNoContent)
			return
		}

		ctx.Next()
	})

	app.Validator = validator.New()

	user := app.Party("/api/user")
	{
		user.Post("/register", routes.Register)
		user.Post("/login", routes.Login)
		user.Post("/stock", routes.AddStock)
		user.Get("/stocks", routes.GetUserStocks)
		user.Put("/stock", routes.UpdateStock)
		user.Delete("/stock", routes.DeleteStock)
		user.Put("/risk", routes.UpdateRisk)
		user.Get("/risk-preference", routes.GetRiskPreference)
		// user.Get("/news", routes.GetNews)
		user.Post("/diversification-suggestions", routes.GetDiversificationSuggestions)
		user.Post("/stock-news", routes.GetStockNews)

	}

	service := app.Party("/api/services")
	{
		service.Post("/risk-metrics", routes.GetRiskMetrics)
		service.Post("/stock-risk-categories", routes.GetStockRiskCategories)
	}

	app.Listen(":4000")

}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}
