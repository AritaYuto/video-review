package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunCreateAdmin(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	email := fs.String("email", "", "admin email")
	pass := fs.String("pass", "", "admin password")
	fs.Parse(args)

	if *email == "" || *pass == "" {
		fmt.Println("email and pass are required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/user",
		Json: map[string]any{
			"email": email,
			"pass":  pass,
		},
	})
}
