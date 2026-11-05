package main

import (
	"embed"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"tweetvault/database"
	"tweetvault/handlers"
)

//go:embed all:frontend/dist
var assets embed.FS

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

func setupAPIRouter() http.Handler {
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
	mux.HandleFunc("POST /api/posts/batch-move", handlers.BatchMovePosts)
	mux.HandleFunc("POST /api/posts/batch-delete", handlers.BatchDeletePosts)
	mux.HandleFunc("POST /api/tweets/fetch", handlers.FetchTweet)

	// Vault Backup & Explorer routes
	mux.HandleFunc("GET /api/backup/info", handlers.GetVaultInfo)
	mux.HandleFunc("POST /api/backup/flush", handlers.FlushVault)
	mux.HandleFunc("POST /api/backup/open-folder", handlers.OpenVaultFolder)
	mux.HandleFunc("POST /api/backup/export-folder", handlers.ExportVaultFolder)
	mux.HandleFunc("POST /api/backup/select-folder", handlers.SelectFolderDialog)
	mux.HandleFunc("POST /api/backup/import-folder", handlers.ImportVaultFolder)

	// Media & Image routes (support GET, HEAD, and path fallbacks)
	mux.HandleFunc("/api/media/{filename}", handlers.ServeMedia)
	mux.HandleFunc("/api/media/", handlers.ServeMedia)
	mux.HandleFunc("POST /api/media/download", handlers.DownloadMedia)
	mux.HandleFunc("POST /api/media/upload", handlers.UploadMedia)
	mux.HandleFunc("POST /api/migrate/localsocialarchive", handlers.MigrateLocalSocialArchive)

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","database":"connected","framework":"wails"}`))
	})

	// Client diagnostic error logger
	mux.HandleFunc("POST /api/client-log", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		log.Printf("[CLIENT LOG] %s\n", string(body))
		w.WriteHeader(http.StatusOK)
	})

	return corsMiddleware(mux)
}

func main() {
	// Configure logging to AppData/TweetVault/app.log for production diagnostics
	if configDir, err := os.UserConfigDir(); err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "TweetVault")
		_ = os.MkdirAll(appDir, 0755)
		if logFile, err := os.OpenFile(filepath.Join(appDir, "app.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666); err == nil {
			log.SetOutput(logFile)
			defer logFile.Close()
		}
	}

	log.Println("[TweetVault] Starting application...")

	// Initialize SQLite database in AppData
	_, err := database.InitDB()
	if err != nil {
		log.Fatalf("[TweetVault] Database initialization failed: %v", err)
	}

	apiHandler := setupAPIRouter()

	// Extract frontend/dist sub-filesystem for fallback and dev server
	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Printf("[TweetVault] Warning: failed to sub frontend/dist: %v", err)
	}

	fileServer := http.FileServer(http.FS(distFS))

	// Combined handler for Wails AssetServer fallback & SPA routing
	combinedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") {
			apiHandler.ServeHTTP(w, r)
			return
		}

		if distFS != nil {
			cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
			if cleanPath == "" || cleanPath == "." {
				cleanPath = "index.html"
			}

			// If the static file exists in distFS, serve it
			if f, err := distFS.Open(cleanPath); err == nil {
				_ = f.Close()
				if strings.HasPrefix(cleanPath, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				fileServer.ServeHTTP(w, r)
				return
			}

			// SPA Fallback: If not an asset file (has no extension) or index.html, serve index.html
			if !strings.Contains(path.Base(cleanPath), ".") || cleanPath == "index.html" {
				indexData, err := fs.ReadFile(distFS, "index.html")
				if err == nil {
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.Write(indexData)
					return
				}
			}
		}

		http.NotFound(w, r)
	})

	// Run background HTTP server on port 8085 for Vite dev mode proxy and external callers
	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8085"
		}

		devMux := http.NewServeMux()
		devMux.Handle("/api/", apiHandler)
		devMux.Handle("/", combinedHandler)

		server := &http.Server{
			Addr:    ":" + port,
			Handler: corsMiddleware(devMux),
		}
		log.Printf("[TweetVault] Background server running on http://localhost:%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[TweetVault] Background server stopped: %v\n", err)
		}
	}()

	app := NewApp()

	log.Println("[TweetVault] Launching Wails window...")

	err = wails.Run(&options.App{
		Title:             "TweetVault",
		Width:             1360,
		Height:            860,
		MinWidth:          960,
		MinHeight:         640,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: combinedHandler,
		},
		BackgroundColour:         &options.RGBA{R: 17, G: 19, B: 24, A: 1},
		OnStartup:                app.startup,
		EnableDefaultContextMenu: true,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "tweetvault-single-instance-lock-uuid",
			OnSecondInstanceLaunch: func(secondInstanceData options.SecondInstanceData) {
				if app.ctx != nil {
					runtime.WindowUnminimise(app.ctx)
					runtime.Show(app.ctx)
				}
			},
		},
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			BackdropType:         windows.Auto,
		},
	})

	if err != nil {
		log.Fatalf("[TweetVault] Error running Wails app: %v", err)
	}

	log.Println("[TweetVault] Application closed cleanly.")
}
