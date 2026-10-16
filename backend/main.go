package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	"tweetvault-backend/database"
	"tweetvault-backend/handlers"
)

//go:embed dist/*
var embeddedDist embed.FS

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	_, err := database.InitDB()
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}

	mux := http.NewServeMux()

	// Spaces routes
	mux.HandleFunc("GET /api/spaces", handlers.GetSpaces)
	mux.HandleFunc("POST /api/spaces", handlers.CreateSpace)
	mux.HandleFunc("PUT /api/spaces/{id}", handlers.UpdateSpace)
	mux.HandleFunc("DELETE /api/spaces/{id}", handlers.DeleteSpace)

	// Folders routes
	mux.HandleFunc("GET /api/folders", handlers.GetFolders)
	mux.HandleFunc("POST /api/folders", handlers.CreateFolder)
	mux.HandleFunc("PUT /api/folders/{id}", handlers.UpdateFolder)
	mux.HandleFunc("DELETE /api/folders/{id}", handlers.DeleteFolder)

	// Collections routes
	mux.HandleFunc("GET /api/collections", handlers.GetCollections)
	mux.HandleFunc("POST /api/collections", handlers.CreateCollection)
	mux.HandleFunc("PUT /api/collections/{id}", handlers.UpdateCollection)
	mux.HandleFunc("DELETE /api/collections/{id}", handlers.DeleteCollection)


	// Posts routes (Tweets & Stories)
	mux.HandleFunc("GET /api/posts", handlers.GetPosts)
	mux.HandleFunc("GET /api/posts/{id}", handlers.GetPostByID)
	mux.HandleFunc("POST /api/posts", handlers.CreatePost)
	mux.HandleFunc("PUT /api/posts/{id}", handlers.UpdatePost)
	mux.HandleFunc("DELETE /api/posts/{id}", handlers.DeletePost)

	// Media & Image routes (OneNote import, Web story image download & local serving)
	mux.HandleFunc("GET /api/media/{filename}", handlers.ServeMedia)
	mux.HandleFunc("POST /api/media/download", handlers.DownloadMedia)
	mux.HandleFunc("POST /api/media/upload", handlers.UploadMedia)

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","database":"connected","timestamp":"` + os.Getenv("PORT") + `"}`))
	})

	// Serve static files from embedded dist, with SPA fallback to index.html
	distSubFS, err := fs.Sub(embeddedDist, "dist")
	if err == nil {
		fileServer := http.FileServer(http.FS(distSubFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api") {
				http.NotFound(w, r)
				return
			}

			cleaned := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
			if cleaned == "" {
				cleaned = "index.html"
			}

			// Check if static file exists in embedded dist
			f, err := distSubFS.Open(cleaned)
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}

			// Fallback to index.html for SPA routing
			indexData, err := fs.ReadFile(distSubFS, "index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(indexData)
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: corsMiddleware(mux),
	}

	log.Printf("TweetVault Go server with embedded UI listening on http://localhost:%s\n", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}
