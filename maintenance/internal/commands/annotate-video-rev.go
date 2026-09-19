package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunAnnotateVideoRev(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_rev_id", "", "video revision id")
	tags := fs.String("tags", "", "comma-separated tags (e.g. A,B,C)")
	summary := fs.String("summary", "", "summary text")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId required")
		fs.Usage()
		return
	}

	// Send only the flags that were given so the server leaves the other field untouched.
	body := map[string]interface{}{}
	fs.Visit(func(f *flag.Flag) {
		switch f.Name {
		case "tags":
			body["tags"] = *tags
		case "summary":
			body["summary"] = *summary
		}
	})

	Fetch(FetchOptions{
		Method: POST,
		Path:   fmt.Sprintf("/api/v1/videos/%s/metadata/annotate", *videoId),
		Json:   body,
	})
}
