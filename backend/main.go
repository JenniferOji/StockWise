package main

import (
	"github.com/YourGitHubUser/StockWise/backend/database"
	"github.com/YourGitHubUser/StockWise/backend/routes"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/kataras/iris/v12"
	_ "github.com/lib/pq"
)

func main() {

	godotenv.Load()
	storage.InitialiseDatabase()
	database.Connect()

	app := iris.New()

	app.Use(func(ctx iris.Context) {
		ctx.Header("Access-Control-Allow-Origin", "http://localhost:8081")
		ctx.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		ctx.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if ctx.Method() == "OPTIONS" {
			ctx.StatusCode(204)
			return
		}
		ctx.Next()
	})

	app.Validator = validator.New()
	// location := app.Party("/api/location")
	// {
	// 	location.Get("autocomplete", routes.Autocomplete)
	// 	location.Get("search", routes.Search)
	// }
	user := app.Party("/api/user")
	{
		user.Post("/register", routes.Register)
		user.Post("/login", routes.Login)
	}

	app.Listen(":4000")

}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}

}
