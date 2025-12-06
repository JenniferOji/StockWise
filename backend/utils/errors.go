package utils

import (
	"fmt"

	"github.com/go-playground/validator/v10"

	"github.com/kataras/iris/v12"
)

func CreateError(statusCode int, title string, detail string, ctx iris.Context) {
	ctx.StopWithProblem(statusCode, iris.NewProblem().Title(title).Detail(detail))
}

// create a seperate function for 500 bad request errors as they are common
func CreateInternalServerError(ctx iris.Context) {
	CreateError(iris.StatusInternalServerError,
		"Internal Server Error",
		"Internal Server Error",
		ctx,
	)
}

func HandleValidationErrors(err error, ctx iris.Context) {
	if errs, ok := err.(validator.ValidationErrors); ok {
		validationErrors := wrapValidationErrors(errs)

		fmt.Println("wrapValidationErrors", validationErrors)
		ctx.StopWithProblem(
			iris.StatusBadRequest,
			iris.NewProblem().
				Title("Validation Error").
				Detail("One or more fields failed to be validated").
				Key("errors", validationErrors))
		return
	}
	CreateInternalServerError(ctx)
}

// function takes in the validation errors and returns and array of custom validationError structs
func wrapValidationErrors(errs validator.ValidationErrors) []validationError {
	validationErrors := make([]validationError, 0, len(errs))
	// for each validation errors and the errors passed in
	for _, validationErr := range errs {
		// create a new validation error
		validationErrors = append(validationErrors, validationError{
			ActualTag: validationErr.ActualTag(),
			Namespace: validationErr.Namespace(),
			Kind:      validationErr.Kind().String(),
			Type:      validationErr.Type().String(),
			Value:     fmt.Sprintf("%v", validationErr.Value()),
			Param:     validationErr.Param(),
			Field:     validationErr.Field(),
		})

	}
	return validationErrors

}

// wraps validation errors into a slice of custom validationError structs
type validationError struct {
	ActualTag string `json:"actualTag"`
	Namespace string `json:"namespace"`
	Kind      string `json:"kind"`
	Type      string `json:"type"`
	Value     string `json:"value"`
	Param     string `json:"param"`
	Field     string `json:"field"`
}
