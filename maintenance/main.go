package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type HTTPMethod string

const (
	GET  HTTPMethod = "GET"
	POST HTTPMethod = "POST"
	PUT  HTTPMethod = "PUT"
)

type FetchOptions struct {
	Method HTTPMethod
	Path   string
	Query  map[string]string
	Json   any
	Form   map[string]string
}

type Command struct {
	Run  func(cmd string, args []string)
	Desc string
}

var (
	BASE_URL = os.Getenv("VIDEO_REVIEW_SERVER_URL")
	TOKEN    = os.Getenv("ADMIN_MAINTENANCE_TOKEN")
)

var commands = map[string]Command{
	"create-admin": {
		Run:  runCreateAdmin,
		Desc: "Create admin user",
	},
	"get-videos": {
		Run:  runGetVideos,
		Desc: "List videos",
	},
	"get-videos-rev": {
		Run:  runGetVideosRev,
		Desc: "List video revisions",
	},
	"delete-video": {
		Run:  runDeleteVideo,
		Desc: "Soft delete video",
	},
	"purge-revision": {
		Run:  runPurgeRevision,
		Desc: "Purge video revision",
	},
}

func main() {
	if BASE_URL == "" {
		panic("VIDEO_REVIEW_SERVER_URL is not set")
	}
	if TOKEN == "" {
		panic("ADMIN_MAINTENANCE_TOKEN is not set")
	}

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	BASE_URL = strings.TrimRight(BASE_URL, "/")

	cmd := os.Args[1]
	c, ok := commands[cmd]
	if !ok {
		fmt.Fprintln(os.Stderr, "unknown command:", cmd)
		printUsage()
		os.Exit(1)
	}

	c.Run(cmd, os.Args[2:])
}

func runCreateAdmin(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	email := fs.String("email", "", "admin email")
	pass := fs.String("pass", "", "admin password")
	fs.Parse(args)

	if *email == "" || *pass == "" {
		fmt.Println("email and pass are required")
		fs.Usage()
		return
	}

	fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/user",
		Json: map[string]any{
			"email": email,
			"pass":  pass,
		},
	})
}

func runGetVideos(cmd string, args []string) {
	fetch(FetchOptions{
		Method: "GET",
		Path:   "/api/v1/videos",
	})
}

func runGetVideosRev(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	fetch(FetchOptions{
		Method: GET,
		Path:   fmt.Sprintf("/api/v1/videos/%s/revisions", *videoId),
	})
}

func runDeleteVideo(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/maintenance/video/delete",
		Json: map[string]any{
			"videoId": *videoId,
			"deleted": "true",
		},
	})
}

func runPurgeRevision(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	revision := fs.Int("revision", -1, "revision number")
	fs.Parse(args)

	if *videoId == "" || *revision == -1 {
		fmt.Println("videoId and revision are required")
		fs.Usage()
		return
	}

	fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/maintenance/video/purge",
		Json: map[string]any{
			"videoId":  *videoId,
			"revision": fmt.Sprintf("%d", *revision),
		},
	})
}

func fetch(opt FetchOptions) {
	restURL := BASE_URL + opt.Path

	// query
	if len(opt.Query) > 0 {
		q := url.Values{}
		for k, v := range opt.Query {
			q.Set(k, v)
		}
		restURL += "?" + q.Encode()
	}

	var body io.Reader

	if opt.Json != nil {
		b, err := json.Marshal(opt.Json)
		if err != nil {
			fmt.Println("failed:", err)
			return
		}
		body = bytes.NewReader(b)
	} else if opt.Form != nil {
		v := url.Values{}
		for k, v2 := range opt.Form {
			v.Set(k, v2)
		}
		body = strings.NewReader(v.Encode())
	}

	req, err := http.NewRequest(string(opt.Method), restURL, body)
	if err != nil {
		fmt.Println("failed:", err)
		return
	}

	req.Header.Set("x-maintenance-token", TOKEN)
	if opt.Json != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if opt.Form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		fmt.Fprintln(os.Stderr, string(b))
		os.Exit(1)
	}
	io.Copy(os.Stdout, resp.Body)
}

func printUsage() {
	fmt.Println("Usage:")
	for name, c := range commands {
		fmt.Printf("  %s\t%s\n", name, c.Desc)
	}
}
