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

	// auth.Test()
	// database.Connect()
	godotenv.Load()
	storage.InitialiseDatabase()
	database.Connect()

	app := iris.Default()
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
