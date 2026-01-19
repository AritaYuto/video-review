package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunBootstrap(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	email := fs.String("email", "", "user email")
	pass := fs.String("pass", "", "user password")
	fs.Parse(args)

	if *email == "" || *pass == "" {
		fmt.Println("email, pass are required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/bootstrap",
		Json: map[string]any{
			"email": email,
			"pass":  pass,
		},
	})
}
