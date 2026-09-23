package commands

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func payload(size int) []byte {
	data := make([]byte, size)
	for i := range data {
		data[i] = byte(i % 251)
	}
	return data
}

// stubServer is the smallest server that behaves like the upload route: it appends what it
// receives and reports how much it holds.
type stubServer struct {
	received []byte
	// acceptPerChunk caps how much of each chunk is stored, standing in for a transfer that
	// was cut short.
	acceptPerChunk int
	// rejectNext makes the next chunk answer 409, as the server does when the offsets disagree.
	rejectNext bool
	// alwaysConflict answers every chunk with 409, so the offset never advances.
	alwaysConflict bool
	failWith       int
	heads          int
	// schemes records how each request reached the server.
	schemes []string
}

func (s *stubServer) handler(t *testing.T) http.Handler {
	t.Helper()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Tus-Resumable") != tusVersion {
			t.Errorf("missing Tus-Resumable header on %s", r.Method)
		}

		if r.TLS != nil {
			s.schemes = append(s.schemes, "https")
		} else {
			s.schemes = append(s.schemes, "http")
		}

		switch r.Method {
		case "POST":
			w.Header().Set("Location", "/uploads/1")
			w.WriteHeader(http.StatusCreated)

		case "HEAD":
			s.heads++
			w.Header().Set("Upload-Offset", strconv.Itoa(len(s.received)))
			w.WriteHeader(http.StatusOK)

		case "PATCH":
			if s.failWith != 0 {
				w.WriteHeader(s.failWith)
				return
			}
			if s.alwaysConflict {
				w.WriteHeader(http.StatusConflict)
				return
			}
			if s.rejectNext {
				s.rejectNext = false
				w.WriteHeader(http.StatusConflict)
				return
			}

			body := new(bytes.Buffer)
			if _, err := body.ReadFrom(r.Body); err != nil {
				t.Fatalf("read body: %v", err)
			}

			chunk := body.Bytes()
			if s.acceptPerChunk > 0 && len(chunk) > s.acceptPerChunk {
				chunk = chunk[:s.acceptPerChunk]
			}

			offset, _ := strconv.Atoi(r.Header.Get("Upload-Offset"))
			if offset != len(s.received) {
				w.WriteHeader(http.StatusConflict)
				return
			}

			s.received = append(s.received, chunk...)
			w.Header().Set("Upload-Offset", strconv.Itoa(len(s.received)))
			w.WriteHeader(http.StatusNoContent)

		default:
			t.Errorf("unexpected method %s", r.Method)
		}
	})
}

func uploaderFor(t *testing.T, stub *stubServer, chunk int64) (*tusUploader, func()) {
	t.Helper()

	server := httptest.NewServer(stub.handler(t))
	uploader := newTusUploader(server.URL, "test-token", chunk)

	return uploader, server.Close
}

// tlsUploaderFor serves the stub over real TLS, which is how the app is reached in production.
func tlsUploaderFor(t *testing.T, stub *stubServer, chunk int64) (*tusUploader, func()) {
	t.Helper()

	server := httptest.NewTLSServer(stub.handler(t))
	uploader := newTusUploader(server.URL, "test-token", chunk)
	uploader.client = server.Client()

	return uploader, server.Close
}

func TestUploadSendsTheWholeFileInChunks(t *testing.T) {
	data := payload(250_000)
	stub := &stubServer{}
	uploader, done := uploaderFor(t, stub, 90_000)
	defer done()

	if err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1"); err != nil {
		t.Fatalf("upload: %v", err)
	}

	if !bytes.Equal(stub.received, data) {
		t.Fatalf("server assembled %d bytes, want the original %d", len(stub.received), len(data))
	}
}

func TestUploadContinuesFromTheOffsetTheServerReports(t *testing.T) {
	data := payload(100_000)
	// The server keeps only part of every chunk, so an uploader that counted the bytes it
	// sent itself would skip over the rest.
	stub := &stubServer{acceptPerChunk: 10_000}
	uploader, done := uploaderFor(t, stub, 40_000)
	defer done()

	if err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1"); err != nil {
		t.Fatalf("upload: %v", err)
	}

	if !bytes.Equal(stub.received, data) {
		t.Fatalf("server assembled %d bytes, want the original %d", len(stub.received), len(data))
	}
}

func TestUploadResumesAfterTheServerRejectsAnOffset(t *testing.T) {
	data := payload(120_000)
	stub := &stubServer{rejectNext: true}
	uploader, done := uploaderFor(t, stub, 50_000)
	defer done()

	if err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1"); err != nil {
		t.Fatalf("upload: %v", err)
	}

	if stub.heads == 0 {
		t.Fatal("the uploader never asked the server where the upload stood")
	}
	if !bytes.Equal(stub.received, data) {
		t.Fatalf("server assembled %d bytes, want the original %d", len(stub.received), len(data))
	}
}

func TestUploadReportsAServerErrorInsteadOfFinishingQuietly(t *testing.T) {
	data := payload(50_000)
	stub := &stubServer{failWith: http.StatusRequestEntityTooLarge}
	uploader, done := uploaderFor(t, stub, 20_000)
	defer done()

	err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1")

	if err == nil {
		t.Fatal("upload returned no error, so the caller would go on to finish the upload")
	}
	if !strings.Contains(err.Error(), "413") {
		t.Fatalf("error does not say what the server answered: %v", err)
	}
}

func TestUploadGivesUpWhenTheServerNeverMovesForward(t *testing.T) {
	data := payload(50_000)
	// Answers every chunk with 409 and reports offset 0, so nothing ever advances.
	stub := &stubServer{alwaysConflict: true}
	uploader, done := uploaderFor(t, stub, 20_000)
	defer done()

	err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1")

	if err == nil {
		t.Fatal("upload returned no error, so it would have retried forever")
	}
}

func TestUploadStaysOnHTTPS(t *testing.T) {
	data := payload(120_000)
	stub := &stubServer{}
	uploader, done := tlsUploaderFor(t, stub, 50_000)
	defer done()

	if err := uploader.Upload(bytes.NewReader(data), int64(len(data)), "session-1"); err != nil {
		t.Fatalf("upload: %v", err)
	}

	// A chunk sent over plain http would never have reached the TLS server.
	if !bytes.Equal(stub.received, data) {
		t.Fatalf("server assembled %d bytes, want the original %d", len(stub.received), len(data))
	}
	for _, scheme := range stub.schemes {
		if scheme != "https" {
			t.Fatalf("a request was made over %s, not https", scheme)
		}
	}
}
