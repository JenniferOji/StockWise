package main

import (
	"github.com/YourGitHubUser/StockWise/backend/database"
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
	database.Connect()

	app := iris.New()

	app.UseRouter(cors.New().
		AllowOrigin("*").
		Handler())

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
		user.Get("/news", routes.GetNews)
		user.Post("/diversification-suggestions", routes.GetDiversificationSuggestions)
	}

	service := app.Party("/api/services")
	{
		service.Post("/risk-metrics", routes.GetRiskMetrics)
	}

	app.Listen(":4000")

}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}
