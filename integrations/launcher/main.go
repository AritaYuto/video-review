package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
)

var clientAddr = "127.0.0.1:18766"

func main() {
	if len(os.Args) < 2 {
		log.Println("no url provided")
		return
	}

	raw := os.Args[1]
	handleURL(raw)
}

func handleURL(raw string) {
	u, err := url.Parse(raw)
	if err != nil {
		log.Println("invalid url:", err)
		return
	}

	fmt.Printf("URL: %s\n", u.String())
	fmt.Printf("Scheme: %s\n", u.Scheme)
	fmt.Printf("Opaque: %s\n", u.Opaque)
	fmt.Printf("User: %s\n", u.User)
	fmt.Printf("Host: %s\n", u.Host)
	fmt.Printf("Hostname(): %s\n", u.Hostname())
	fmt.Printf("Path: %s\n", u.Path)
	fmt.Printf("RawPath: %s\n", u.RawPath)
	fmt.Printf("RawQuery: %s\n", u.RawQuery)
	fmt.Printf("Fragment: %s\n", u.Fragment)

	action := u.Host
	if action == "" {
		log.Println("empty action")
		return
	}

	msg := map[string]interface{}{
		"action": action,
	}

	for k, v := range u.Query() {
		if len(v) > 0 {
			msg[k] = v[0]
		}
	}

	b, err := json.Marshal(msg)
	if err != nil {
		log.Println("failed to marshal json:", err)
		return
	}

	sendToClient(append(b, '\n'))
}

func sendToClient(b []byte) {
	conn, err := net.Dial("tcp", clientAddr)
	if err != nil {
		log.Println("failed to connect to client:", err)
		return
	}
	defer conn.Close()

	_, err = conn.Write(b)
	if err != nil {
		log.Println("failed to send message:", err)
		return
	}
}
