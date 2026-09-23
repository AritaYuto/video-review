package commands

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
)

// Only reached if the server did not report a size of its own.
const fallbackChunkSize int64 = 16 * 1024 * 1024

const tusVersion = "1.0.0"

// How many chunks in a row may fail to move the offset before the upload is given up on.
const maxStalledChunks = 3

// tusUploader sends a file to the server's resumable upload route, one chunk per request.
// The server answers every chunk with the offset it has stored, and that answer is what
// decides where the next chunk starts.
type tusUploader struct {
	client   *http.Client
	endpoint string
	apiToken string
	chunk    int64
}

func newTusUploader(endpoint, apiToken string, chunk int64) *tusUploader {
	if chunk <= 0 {
		chunk = fallbackChunkSize
	}

	return &tusUploader{
		client:   http.DefaultClient,
		endpoint: endpoint,
		apiToken: apiToken,
		chunk:    chunk,
	}
}

// Upload creates the upload for the given session and sends the whole file.
//
// A chunk that is refused is retried from the offset the server reports, but a command that
// exits still starts from the beginning: resuming across runs is not implemented yet.
func (u *tusUploader) Upload(src io.ReadSeeker, size int64, sessionID string) error {
	location, err := u.create(size, sessionID)
	if err != nil {
		return err
	}

	offset := int64(0)
	// A refused chunk is resent from the same offset, but a server that never moves forward
	// would otherwise keep the upload spinning.
	stalled := 0

	for offset < size {
		if _, err := src.Seek(offset, io.SeekStart); err != nil {
			return fmt.Errorf("seek to offset %d: %w", offset, err)
		}

		next, err := u.sendChunk(location, src, offset, size)
		if err != nil {
			return err
		}

		if next > offset {
			stalled = 0
		} else if stalled++; stalled >= maxStalledChunks {
			return fmt.Errorf("upload stopped making progress at offset %d", offset)
		}

		offset = next
	}

	return nil
}

func (u *tusUploader) create(size int64, sessionID string) (string, error) {
	req, err := http.NewRequest("POST", u.endpoint, nil)
	if err != nil {
		return "", err
	}

	u.setCommonHeaders(req)
	req.Header.Set("Upload-Length", strconv.FormatInt(size, 10))
	req.Header.Set("Upload-Metadata", "sessionId "+base64.StdEncoding.EncodeToString([]byte(sessionID)))

	res, err := u.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusCreated {
		return "", statusError("create upload", res)
	}

	location := res.Header.Get("Location")
	if location == "" {
		return "", fmt.Errorf("create upload: no Location header")
	}

	return u.resolve(location)
}

// sendChunk writes one chunk and returns the offset the server stored. A 409 means our idea
// of the offset is stale, so the server is asked where it actually is and the chunk is resent
// from there.
func (u *tusUploader) sendChunk(location string, src io.ReadSeeker, offset, size int64) (int64, error) {
	length := u.chunk
	if remaining := size - offset; remaining < length {
		length = remaining
	}

	req, err := http.NewRequest("PATCH", location, io.LimitReader(src, length))
	if err != nil {
		return 0, err
	}

	u.setCommonHeaders(req)
	req.Header.Set("Content-Type", "application/offset+octet-stream")
	req.Header.Set("Upload-Offset", strconv.FormatInt(offset, 10))
	req.ContentLength = length

	res, err := u.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusConflict {
		return u.receivedOffset(location)
	}

	if res.StatusCode != http.StatusNoContent {
		return 0, statusError("upload chunk", res)
	}

	return parseOffset(res.Header.Get("Upload-Offset"))
}

// receivedOffset asks the server how much of the upload it holds.
func (u *tusUploader) receivedOffset(location string) (int64, error) {
	req, err := http.NewRequest("HEAD", location, nil)
	if err != nil {
		return 0, err
	}
	u.setCommonHeaders(req)

	res, err := u.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return 0, statusError("read upload offset", res)
	}

	return parseOffset(res.Header.Get("Upload-Offset"))
}

func (u *tusUploader) setCommonHeaders(req *http.Request) {
	req.Header.Set("Tus-Resumable", tusVersion)
	req.Header.Set("x-api-token", u.apiToken)
}

// resolve turns the Location header into an absolute URL, which it is not when the server
// answers with a path.
func (u *tusUploader) resolve(location string) (string, error) {
	base, err := url.Parse(u.endpoint)
	if err != nil {
		return "", err
	}

	ref, err := url.Parse(location)
	if err != nil {
		return "", err
	}

	return base.ResolveReference(ref).String(), nil
}

func parseOffset(value string) (int64, error) {
	if value == "" {
		return 0, fmt.Errorf("no Upload-Offset header")
	}
	return strconv.ParseInt(value, 10, 64)
}

func statusError(what string, res *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(res.Body, 512))
	return fmt.Errorf("%s: status %d: %s", what, res.StatusCode, string(body))
}
