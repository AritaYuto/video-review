package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunGetVideosRev(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: GET,
		Path:   fmt.Sprintf("/api/v1/videos/%s/revisions", *videoId),
	})
}
