package database

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const (
	host   = "localhost"
	port   = "5432"
	user   = "postgres"
	dbname = "stockwise_db"
)

func Connect() {
	// Database connection and authentication logic
	_ = godotenv.Load()

	// Read password from environment variable
	password := os.Getenv("POSTGRES_PASSWORD")

	// Build connection string (password will be empty if DB_PASSWORD unset)
	psqlconn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)

	db, err := sql.Open("postgres", psqlconn)
	CheckError(err)

	defer db.Close()

	// insertStmt := `insert into "User" ("Username", "Password") values ($1, $2)`
	// _, e := db.Exec(insertStmt, "DavidS", "david")
	// CheckError(e)
}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}

}
