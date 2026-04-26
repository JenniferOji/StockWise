package main

import (
	"os"

	"github.com/YourGitHubUser/StockWise/backend/routes"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/kataras/iris/v12"
	"github.com/kataras/iris/v12/middleware/cors"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	storage.InitialiseDatabase()

	app := iris.New()

	crs := cors.New()

	crs.AllowOrigin("*")
	crs.AllowHeaders("Origin", "Content-Type", "Accept", "Authorization")
	crs.ExposeHeaders("*")

	app.UseRouter(crs.Handler())

	app.Options("/{any:path}", func(ctx iris.Context) {
		ctx.StatusCode(iris.StatusNoContent)
	})

	app.Validator = validator.New()

	// define routes
	users := app.Party("/api/users")
	{
		users.Post("", routes.Register)
		users.Get("/{userId:uint}/stocks", routes.GetUserStocks)
		users.Post("/{userId:uint}/stocks", routes.AddStock)
		users.Patch("/{userId:uint}/stocks/{stockId:uint}", routes.UpdateStock)
		users.Delete("/{userId:uint}/stocks/{stockId:uint}", routes.DeleteStock)
		users.Get("/{userId:uint}/risk-preference", routes.GetRiskPreference)
		users.Patch("/{userId:uint}/risk-preference", routes.UpdateRisk)
	}

	// session related routes
	sessions := app.Party("/api/sessions")
	{
		sessions.Post("", routes.Login)
	}

	// portfolio related routes
	portfolios := app.Party("/api/portfolios")
	{
		portfolios.Post("/risk-metrics", routes.GetRiskMetrics)
		portfolios.Post("/risk-categories", routes.GetStockRiskCategories)
		portfolios.Post("/performance-metrics", routes.GetPerformanceMetrics)
		portfolios.Post("/diversification-suggestions", routes.GetDiversificationSuggestions)
		portfolios.Post("/random-suggestions", routes.GetRandomSuggestions)
		portfolios.Post("/simulations", routes.SimulateStock)
	}

	// stock related routes
	stocks := app.Party("/api/stocks")
	{
		stocks.Get("/{symbol:string}/news", routes.GetStockNews)
		stocks.Get("/{symbol:string}/sentiment", routes.GetStockSentiment)
		stocks.Get("/{symbol:string}/risk", routes.GetStockRisk)
	}

	// app.Listen(":4000")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	app.Listen(":" + port)

}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}
