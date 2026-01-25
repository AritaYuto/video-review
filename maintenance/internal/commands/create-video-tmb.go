package commands

import (
	"bytes"
	"flag"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	. "videoreview-maintenance/internal/lib"
)

func RunVideoThumbnail(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	b, err := FetchRaw(FetchOptions{
		Method: GET,
		Path:   fmt.Sprintf("/api/v1/media/download?videoId=%s", *videoId),
	})
	if err != nil {
		fmt.Println("error fetching video:", err)
		return
	}

	tmpVideo, err := os.CreateTemp("", "videoreview-*.mp4")
	if err != nil {
		fmt.Println("failed to create temp file:", err)
		return
	}
	defer os.Remove(tmpVideo.Name())
	defer tmpVideo.Close()

	if _, err := tmpVideo.Write(b); err != nil {
		fmt.Println("failed to write video:", err)
		return
	}

	thumbPath := tmpVideo.Name() + ".png"
	ffmpegCmd := exec.Command(
		"ffmpeg",
		"-y",
		"-i", tmpVideo.Name(),
		"-ss", "00:00:01",
		"-vframes", "1",
		thumbPath,
	)

	ffmpegCmd.Stdout = os.Stdout
	ffmpegCmd.Stderr = os.Stderr

	if err := ffmpegCmd.Run(); err != nil {
		fmt.Println("failed to generate thumbnail:", err)
		return
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	file, err := os.Open(thumbPath)
	if err != nil {
		fmt.Println("failed to open thumbnail file:", err)
		return
	}
	defer file.Close()

	err = writer.WriteField("videoId", *videoId)
	if err != nil {
		fmt.Println("failed to write videoId field:", err)
		return
	}

	part, err := writer.CreateFormFile("file", filepath.Base(thumbPath))
	if err != nil {
		fmt.Println("failed to create multipart file:", err)
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		fmt.Println("failed to write file to multipart:", err)
		return
	}
	writer.Close()

	req, err := http.NewRequest("PUT", GlobalConfig.BaseURL+"/api/v1/thumbnail/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-api-token", GlobalConfig.APIToken)

	if err != nil {
		fmt.Println("failed to create request for upload:", err)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("failed to upload thumbnail:", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		fmt.Printf("failed to upload thumbnail: status %d: %s\n", resp.StatusCode, string(b))
		return
	}

	fmt.Println("thumbnail uploaded successfully")
}
