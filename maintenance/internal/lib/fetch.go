package lib

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

func buildRequest(opt FetchOptions) (*http.Request, error) {
	restURL := GlobalConfig.BaseURL + opt.Path

	if len(opt.Query) > 0 {
		q := url.Values{}
		for k, v := range opt.Query {
			q.Set(k, v)
		}
		restURL += "?" + q.Encode()
	}

	var body io.Reader

	if opt.Json != nil {
		b, err := json.Marshal(opt.Json)
		if err != nil {
			fmt.Println("failed:", err)
			return nil, err
		}
		body = bytes.NewReader(b)
	} else if opt.Form != nil {
		v := url.Values{}
		for k, v2 := range opt.Form {
			v.Set(k, v2)
		}
		body = strings.NewReader(v.Encode())
	}

	req, err := http.NewRequest(string(opt.Method), restURL, body)
	if err != nil {
		fmt.Println("failed:", err)
		return nil, err
	}

	// NOTE: temporary compatibility for migration.
	// Send the same token as both x-api-token and x-maintenance-token.
	// This will be removed once ADMIN_MAINTENANCE_TOKEN is fully deprecated.
	req.Header.Set("x-api-token", GlobalConfig.APIToken)
	req.Header.Set("x-maintenance-token", GlobalConfig.APIToken)
	if opt.Json != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if opt.Form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	return req, nil
}

func doRequest(req *http.Request) ([]byte, *http.Response, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, resp, fmt.Errorf("status %d: %s", resp.StatusCode, string(b))
	}

	return b, resp, nil
}

func Fetch(opt FetchOptions) {
	req, err := buildRequest(opt)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	body, _, err := doRequest(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	os.Stdout.Write(body)
}

func FetchRaw(opt FetchOptions) ([]byte, error) {
	req, err := buildRequest(opt)
	if err != nil {
		return nil, err
	}

	body, _, err := doRequest(req)
	return body, err
}
