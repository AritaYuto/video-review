package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunCreateUser(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	name := fs.String("name", "User", "user name")
	role := fs.String("role", "", "user role")
	email := fs.String("email", "", "user email")
	pass := fs.String("pass", "", "user password")
	fs.Parse(args)

	if *email == "" || *pass == "" || *role == "" {
		fmt.Println("email, pass, role are required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/user",
		Json: map[string]any{
			"email":       email,
			"pass":        pass,
			"displayName": name,
			"role":        role,
		},
	})
}
