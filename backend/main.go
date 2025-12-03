package main

import (
	"github.com/YourGitHubUser/StockWise/backend/database"
	_ "github.com/YourGitHubUser/StockWise/backend/database"
	_ "github.com/lib/pq"
)

func main() {

	// auth.Test()
	database.Connect()

}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}

}
