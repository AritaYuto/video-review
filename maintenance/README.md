# VideoReview Maintenance CLI

This is a CLI tool for maintaining VideoReview.  
It is an **internal administrator tool** separate from the main application.

## Build Instructions

### Windows
> $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o video-review-cli.exe

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

## Required Environment Variables

URL of the server running VideoReview
> VIDEO_REVIEW_SERVER_URL

VideoReview API Token  
Set the same value as in .env
> VIDEO_REVIEW_API_TOKEN

### Command List

##### Create an administrator
> go run . create-admin --email hoge@gmail.com --pass 123abc

##### Get the video list (JSON)
> go run . get-videos
> go run . get-videos --include_revisions true

##### Get a video's revision information (JSON)
> go run . get-videos-rev --video_id {uuid}

##### Logically delete a video
> go run . delete-video --video_id {uuid}

##### Delete the specified revision of a video
* Performs file deletion + logical deletion
* Cannot be undone after execution
> go run . purge-revision --video_id {uuid} --revision 1

##### Upload a video
> go run . upload-video --title "title" --folder_key "folder_key" --scene_path "scene_path" --video_path "/path/to/video.mp4"