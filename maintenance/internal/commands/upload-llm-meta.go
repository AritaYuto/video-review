package commands

import (
	"bytes"
	"flag"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	. "videoreview-maintenance/internal/lib"
)

func RunUploadLLMMeta(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_rev_id", "", "video revision id")
	kind := fs.String("kind", "", "kind type")
	jsonPath := fs.String("json_path", "", "path to the json file")
	fs.Parse(args)

	if *videoId == "" || *kind == "" || *jsonPath == "" {
		fmt.Println("video_rev_id, kind, json_path are required")
		fs.Usage()
		return
	}

	file, err := os.Open(*jsonPath)
	if err != nil {
		fmt.Println("failed to open json file:", err)
		return
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("kind", *kind)
	part, err := writer.CreateFormFile("file", filepath.Base(*jsonPath))
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

	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/v1/videos/%s/metadata/upload", GlobalConfig.BaseURL, *videoId), body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-api-token", GlobalConfig.APIToken)

	if err != nil {
		fmt.Println("failed to create request for upload:", err)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("failed to upload json:", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		fmt.Printf("failed to upload json: status %d: %s\n", resp.StatusCode, string(b))
		return
	}
	fmt.Println("metadata uploaded successfully")
}
