package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunPurgeRevision(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	revision := fs.Int("revision", -1, "revision number")
	fs.Parse(args)

	if *videoId == "" || *revision == -1 {
		fmt.Println("videoId and revision are required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/maintenance/video/purge",
		Json: map[string]any{
			"videoId":  *videoId,
			"revision": fmt.Sprintf("%d", *revision),
		},
	})
}
