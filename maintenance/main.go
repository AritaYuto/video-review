package main

import (
	"fmt"
	"os"
	"strings"

	. "videoreview-maintenance/internal/commands"
	. "videoreview-maintenance/internal/lib"
)

type Command struct {
	Run  func(cmd string, args []string)
	Desc string
}

var commands = map[string]Command{
	"create-admin": {
		Run:  RunCreateUser,
		Desc: "Create user",
	},
	"get-videos": {
		Run:  RunGetVideos,
		Desc: "List videos",
	},
	"get-videos-rev": {
		Run:  RunGetVideosRev,
		Desc: "List video revisions",
	},
	"delete-video": {
		Run:  RunDeleteVideo,
		Desc: "Soft delete video",
	},
	"purge-revision": {
		Run:  RunPurgeRevision,
		Desc: "Purge video revision",
	},
	"upload-video": {
		Run:  RunUploadVideo,
		Desc: "upload video",
	},
}

func main() {
	apiToken := os.Getenv("VIDEO_REVIEW_API_TOKEN")
	if apiToken == "" {
		apiToken = os.Getenv("ADMIN_MAINTENANCE_TOKEN")
	}

	GlobalConfig = Config{
		BaseURL:  os.Getenv("VIDEO_REVIEW_SERVER_URL"),
		APIToken: apiToken,
	}

	if GlobalConfig.BaseURL == "" {
		panic("VIDEO_REVIEW_SERVER_URL is not set")
	}
	if GlobalConfig.APIToken == "" {
		panic("VIDEO_REVIEW_API_TOKEN is not set")
	}

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	GlobalConfig.BaseURL = strings.TrimRight(GlobalConfig.BaseURL, "/")
	cmd := os.Args[1]
	c, ok := commands[cmd]
	if !ok {
		fmt.Fprintln(os.Stderr, "unknown command:", cmd)
		printUsage()
		os.Exit(1)
	}

	c.Run(cmd, os.Args[2:])
}

func printUsage() {
	fmt.Println("Usage:")
	for name, c := range commands {
		fmt.Printf("  %s\t%s\n", name, c.Desc)
	}
}
