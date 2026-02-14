package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunAnnotateVideoRev(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_rev_id", "all", "video revision id")
	fs.Parse(args)

	Fetch(FetchOptions{
		Method: POST,
		Path:   fmt.Sprintf("/api/v1/videos/%s/metadata/annotate", *videoId),
		Json:   map[string]interface{}{"promptKey": "annotation"},
	})
}
