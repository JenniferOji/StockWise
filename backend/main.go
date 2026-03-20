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
		user.Post("/stock-sentiment", routes.GetStockSentiment)

	}

	service := app.Party("/api/services")
	{
		service.Post("/risk-metrics", routes.GetRiskMetrics)
		service.Post("/stock-risk-categories", routes.GetStockRiskCategories)
		service.Post("/performance-metrics", routes.GetPerformanceMetrics)
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
