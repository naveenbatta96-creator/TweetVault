package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"tweetvault-backend/database"
)

type DownloadMediaRequest struct {
	URL  string   `json:"url"`
	URLs []string `json:"urls"`
}

type DownloadMediaResult struct {
	OriginalURL string `json:"original_url"`
	LocalURL    string `json:"local_url"`
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
	FileName    string `json:"file_name,omitempty"`
}

func randomHex(n int) string {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)
}

func getExtensionFromContentType(contentType string) string {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if idx := strings.Index(ct, ";"); idx != -1 {
		ct = ct[:idx]
	}
	switch ct {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	case "image/bmp":
		return ".bmp"
	default:
		return ".png"
	}
}

// processSingleMedia downloads an external URL or imports a local/OneNote file path into local media storage
func processSingleMedia(mediaDir string, rawURL string) DownloadMediaResult {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "empty url"}
	}

	// 1. Check if already a local /api/media/ URL
	if strings.HasPrefix(trimmed, "/api/media/") {
		return DownloadMediaResult{
			OriginalURL: rawURL,
			LocalURL:    trimmed,
			Success:     true,
			FileName:    strings.TrimPrefix(trimmed, "/api/media/"),
		}
	}

	// 2. Handle Data URL (base64)
	if strings.HasPrefix(trimmed, "data:image/") {
		idxComma := strings.Index(trimmed, ",")
		if idxComma == -1 {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "invalid data url"}
		}
		header := trimmed[:idxComma]
		b64Data := trimmed[idxComma+1:]

		ext := ".png"
		if strings.Contains(header, "image/jpeg") || strings.Contains(header, "image/jpg") {
			ext = ".jpg"
		} else if strings.Contains(header, "image/webp") {
			ext = ".webp"
		} else if strings.Contains(header, "image/gif") {
			ext = ".gif"
		}

		decoded, err := base64.StdEncoding.DecodeString(b64Data)
		if err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed to decode base64: " + err.Error()}
		}

		fileName := fmt.Sprintf("clip_%d_%s%s", time.Now().UnixMilli(), randomHex(4), ext)
		destPath := filepath.Join(mediaDir, fileName)
		if err := os.WriteFile(destPath, decoded, 0644); err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed to write file: " + err.Error()}
		}

		return DownloadMediaResult{
			OriginalURL: rawURL,
			LocalURL:    "/api/media/" + fileName,
			FileName:    fileName,
			Success:     true,
		}
	}

	// 3. Handle file:/// URLs (typical from OneNote, local folders, or desktop apps)
	if strings.HasPrefix(trimmed, "file://") || (len(trimmed) > 3 && trimmed[1] == ':' && (trimmed[2] == '\\' || trimmed[2] == '/')) {
		filePath := trimmed
		if strings.HasPrefix(filePath, "file://") {
			filePath = strings.TrimPrefix(filePath, "file://")
			// On Windows, file:///C:/path starts with /C:/
			if len(filePath) > 3 && filePath[0] == '/' && filePath[2] == ':' {
				filePath = filePath[1:]
			}
		}

		// URL decode path
		if unescaped, err := url.PathUnescape(filePath); err == nil {
			filePath = unescaped
		}
		filePath = filepath.Clean(filePath)

		data, err := os.ReadFile(filePath)
		if err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed to read local file: " + err.Error()}
		}

		ext := filepath.Ext(filePath)
		if ext == "" {
			ext = ".png"
		}

		fileName := fmt.Sprintf("onenote_%d_%s%s", time.Now().UnixMilli(), randomHex(4), ext)
		destPath := filepath.Join(mediaDir, fileName)
		if err := os.WriteFile(destPath, data, 0644); err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed to save file: " + err.Error()}
		}

		return DownloadMediaResult{
			OriginalURL: rawURL,
			LocalURL:    "/api/media/" + fileName,
			FileName:    fileName,
			Success:     true,
		}
	}

	// 4. Handle HTTP/HTTPS URLs (from external websites)
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		client := &http.Client{
			Timeout: 15 * time.Second,
		}

		req, err := http.NewRequest("GET", trimmed, nil)
		if err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "invalid request: " + err.Error()}
		}

		// Mimic a modern browser to avoid 403 Forbidden / anti-hotlinking
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

		resp, err := client.Do(req)
		if err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "download failed: " + err.Error()}
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: fmt.Sprintf("HTTP %d from source", resp.StatusCode)}
		}

		// Read up to 25MB
		limitReader := io.LimitReader(resp.Body, 25*1024*1024)
		data, err := io.ReadAll(limitReader)
		if err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed reading body: " + err.Error()}
		}

		// Determine extension
		ext := getExtensionFromContentType(resp.Header.Get("Content-Type"))
		if ext == ".png" {
			// Check if URL has known extension
			parsedURL, err := url.Parse(trimmed)
			if err == nil {
				urlExt := strings.ToLower(filepath.Ext(parsedURL.Path))
				if urlExt == ".jpg" || urlExt == ".jpeg" || urlExt == ".png" || urlExt == ".webp" || urlExt == ".gif" || urlExt == ".svg" {
					ext = urlExt
				}
			}
		}

		fileName := fmt.Sprintf("img_%d_%s%s", time.Now().UnixMilli(), randomHex(4), ext)
		destPath := filepath.Join(mediaDir, fileName)
		if err := os.WriteFile(destPath, data, 0644); err != nil {
			return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "failed to save media: " + err.Error()}
		}

		return DownloadMediaResult{
			OriginalURL: rawURL,
			LocalURL:    "/api/media/" + fileName,
			FileName:    fileName,
			Success:     true,
		}
	}

	return DownloadMediaResult{OriginalURL: rawURL, Success: false, Error: "unsupported url scheme"}
}

// DownloadMedia handles downloading external images from sites or importing local OneNote images
func DownloadMedia(w http.ResponseWriter, r *http.Request) {
	mediaDir, err := database.GetMediaDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Media directory unavailable: "+err.Error())
		return
	}

	var req DownloadMediaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// If single URL provided
	if req.URL != "" && len(req.URLs) == 0 {
		res := processSingleMedia(mediaDir, req.URL)
		writeJSON(w, http.StatusOK, res)
		return
	}

	// Batch URLs provided
	results := make([]DownloadMediaResult, 0, len(req.URLs))
	for _, u := range req.URLs {
		if strings.TrimSpace(u) == "" {
			continue
		}
		results = append(results, processSingleMedia(mediaDir, u))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"results": results,
	})
}

// UploadMedia handles direct file or base64 uploads (clipboard screenshots, dragged files)
func UploadMedia(w http.ResponseWriter, r *http.Request) {
	mediaDir, err := database.GetMediaDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Media directory unavailable: "+err.Error())
		return
	}

	// Check if multipart form
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		// 25MB max memory
		if err := r.ParseMultipartForm(25 << 20); err != nil {
			writeError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, http.StatusBadRequest, "No file provided: "+err.Error())
			return
		}
		defer file.Close()

		ext := filepath.Ext(header.Filename)
		if ext == "" {
			ext = ".png"
		}

		fileName := fmt.Sprintf("upload_%d_%s%s", time.Now().UnixMilli(), randomHex(4), ext)
		destPath := filepath.Join(mediaDir, fileName)

		destFile, err := os.Create(destPath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to create destination file: "+err.Error())
			return
		}
		defer destFile.Close()

		if _, err := io.Copy(destFile, file); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to write file: "+err.Error())
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success":   true,
			"local_url": "/api/media/" + fileName,
			"file_name": fileName,
		})
		return
	}

	// JSON payload (Base64)
	var body struct {
		Data     string `json:"data"`
		FileName string `json:"file_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	res := processSingleMedia(mediaDir, body.Data)
	writeJSON(w, http.StatusOK, res)
}

// ServeMedia serves locally saved media files with caching headers
func ServeMedia(w http.ResponseWriter, r *http.Request) {
	mediaDir, err := database.GetMediaDir()
	if err != nil {
		http.Error(w, "Media directory unavailable", http.StatusInternalServerError)
		return
	}

	fileName := r.PathValue("filename")
	if fileName == "" {
		http.NotFound(w, r)
		return
	}

	// Sanitize to prevent path traversal
	safeName := filepath.Base(fileName)
	filePath := filepath.Join(mediaDir, safeName)

	fileInfo, err := os.Stat(filePath)
	if err != nil || fileInfo.IsDir() {
		http.NotFound(w, r)
		return
	}

	// Add strong cache control headers
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, filePath)
}
