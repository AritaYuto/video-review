package commands

import (
	"flag"
	. "videoreview-maintenance/internal/lib"
)

func RunAnnotateVideoRev(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_rev_id", "", "video revision id")
	fs.Parse(args)

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/videos/annotate",
		Json:   map[string]interface{}{"videoRevId": *videoId},
	})
}
