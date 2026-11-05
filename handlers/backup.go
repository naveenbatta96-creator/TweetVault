package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"tweetvault/database"
)

type VaultInfoResponse struct {
	VaultPath       string `json:"vault_path"`
	DBSizeBytes     int64  `json:"db_size_bytes"`
	MediaFilesCount int    `json:"media_files_count"`
	MediaSizeBytes  int64  `json:"media_size_bytes"`
	IsPortable      bool   `json:"is_portable"`
}

// GetVaultInfo returns storage metrics and the exact folder path of the active vault.
func GetVaultInfo(w http.ResponseWriter, r *http.Request) {
	vaultDir, err := database.GetVaultDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to determine vault directory: "+err.Error())
		return
	}

	resp := VaultInfoResponse{
		VaultPath: vaultDir,
	}

	// Check DB size
	dbPath := filepath.Join(vaultDir, "tweetvault.db")
	if fi, err := os.Stat(dbPath); err == nil {
		resp.DBSizeBytes = fi.Size()
	}

	// Check WAL size and add to DB size
	walPath := filepath.Join(vaultDir, "tweetvault.db-wal")
	if fiWal, err := os.Stat(walPath); err == nil {
		resp.DBSizeBytes += fiWal.Size()
	}

	// Check media directory
	mediaDir := filepath.Join(vaultDir, "media")
	if entries, err := os.ReadDir(mediaDir); err == nil {
		resp.MediaFilesCount = len(entries)
		for _, e := range entries {
			if !e.IsDir() {
				if fi, err := os.Stat(filepath.Join(mediaDir, e.Name())); err == nil {
					resp.MediaSizeBytes += fi.Size()
				}
			}
		}
	}

	// Check if running in portable mode
	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		if filepath.Dir(vaultDir) == exeDir || vaultDir == exeDir {
			resp.IsPortable = true
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// FlushVault runs PRAGMA wal_checkpoint(TRUNCATE) to cleanly write all changes into tweetvault.db.
func FlushVault(w http.ResponseWriter, r *http.Request) {
	if err := database.CheckpointDB(); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to checkpoint database: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Vault cleanly flushed. All recent tweets are committed to tweetvault.db.",
	})
}

// OpenVaultFolder opens the active TweetVault directory in Windows File Explorer.
func OpenVaultFolder(w http.ResponseWriter, r *http.Request) {
	vaultDir, err := database.GetVaultDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get vault directory: "+err.Error())
		return
	}

	cmd := exec.Command("explorer.exe", vaultDir)
	if err := cmd.Start(); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to launch Explorer: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"path":    vaultDir,
	})
}

// ExportVaultFolder creates a standalone copy of tweetvault.db and media/ in a target directory (e.g. Desktop).
func ExportVaultFolder(w http.ResponseWriter, r *http.Request) {
	// First checkpoint the database so the copy is clean
	_ = database.CheckpointDB()

	vaultDir, err := database.GetVaultDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get vault directory: "+err.Error())
		return
	}

	// Determine destination folder
	var req struct {
		DestinationPath string `json:"destination_path"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	destDir := req.DestinationPath
	if destDir == "" {
		// Default to Desktop/TweetVault_Backup_YYYY-MM-DD
		homeDir, err := os.UserHomeDir()
		if err != nil {
			destDir = filepath.Join(os.TempDir(), "TweetVault_Backup")
		} else {
			desktop := filepath.Join(homeDir, "Desktop")
			if _, err := os.Stat(desktop); err == nil {
				destDir = filepath.Join(desktop, fmt.Sprintf("TweetVault_Backup_%s", time.Now().Format("2006-01-02")))
			} else {
				destDir = filepath.Join(homeDir, fmt.Sprintf("TweetVault_Backup_%s", time.Now().Format("2006-01-02")))
			}
		}
	}

	if err := os.MkdirAll(destDir, 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create destination folder: "+err.Error())
		return
	}

	// Copy tweetvault.db
	srcDb := filepath.Join(vaultDir, "tweetvault.db")
	dstDb := filepath.Join(destDir, "tweetvault.db")
	if err := copyFile(srcDb, dstDb); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to copy database: "+err.Error())
		return
	}

	// Copy media directory
	srcMedia := filepath.Join(vaultDir, "media")
	dstMedia := filepath.Join(destDir, "media")
	_ = os.MkdirAll(dstMedia, 0755)

	copiedMediaCount := 0
	if entries, err := os.ReadDir(srcMedia); err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				s := filepath.Join(srcMedia, e.Name())
				d := filepath.Join(dstMedia, e.Name())
				if err := copyFile(s, d); err == nil {
					copiedMediaCount++
				}
			}
		}
	}

	// Open the destination folder in File Explorer for the user
	_ = exec.Command("explorer.exe", destDir).Start()

	writeJSON(w, http.StatusOK, map[string]any{
		"success":            true,
		"backup_path":        destDir,
		"copied_media_files": copiedMediaCount,
		"message":            fmt.Sprintf("Vault folder successfully exported to %s with %d media files.", destDir, copiedMediaCount),
	})
}

// SelectFolderDialog prompts the native Windows folder picker dialog and returns the selected path.
func SelectFolderDialog(w http.ResponseWriter, r *http.Request) {
	cmd := exec.Command("powershell", "-NoProfile", "-Command",
		`Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Select TweetVault Backup Folder'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }`)
	out, err := cmd.Output()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to open folder picker: "+err.Error())
		return
	}
	selectedPath := strings.TrimSpace(string(out))
	writeJSON(w, http.StatusOK, map[string]any{
		"selected_path": selectedPath,
	})
}

// ImportVaultFolder restores tweetvault.db and media/ from a selected backup folder into the active vault.
func ImportVaultFolder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SourcePath string `json:"source_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	srcDir := strings.TrimSpace(req.SourcePath)
	if srcDir == "" {
		writeError(w, http.StatusBadRequest, "Source backup folder path is required")
		return
	}

	// Verify source folder exists
	srcStat, err := os.Stat(srcDir)
	if err != nil || !srcStat.IsDir() {
		writeError(w, http.StatusBadRequest, "The specified path does not exist or is not a folder.")
		return
	}

	// Check if tweetvault.db is directly inside, or inside a TweetVault subfolder
	dbFile := filepath.Join(srcDir, "tweetvault.db")
	if _, err := os.Stat(dbFile); err != nil {
		nested := filepath.Join(srcDir, "TweetVault", "tweetvault.db")
		if _, err := os.Stat(nested); err == nil {
			srcDir = filepath.Join(srcDir, "TweetVault")
			dbFile = nested
		} else {
			writeError(w, http.StatusBadRequest, "Could not find 'tweetvault.db' in the selected folder. Please choose a folder containing tweetvault.db.")
			return
		}
	}

	vaultDir, err := database.GetVaultDir()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to resolve active vault directory: "+err.Error())
		return
	}

	// Prevent importing into the exact same active directory
	if filepath.Clean(srcDir) == filepath.Clean(vaultDir) {
		writeError(w, http.StatusBadRequest, "Source folder is the same as the active vault folder.")
		return
	}

	// 1. Flush and close active DB handle
	_ = database.CheckpointDB()
	_ = database.CloseDB()

	// 2. Safety snapshot of existing DB before overwrite
	currDb := filepath.Join(vaultDir, "tweetvault.db")
	safetyBackup := filepath.Join(vaultDir, "pre_import_backup.db")
	_ = copyFile(currDb, safetyBackup)

	// 3. Remove existing WAL/SHM files to avoid conflicts with imported DB
	_ = os.Remove(filepath.Join(vaultDir, "tweetvault.db-wal"))
	_ = os.Remove(filepath.Join(vaultDir, "tweetvault.db-shm"))

	// 4. Copy imported tweetvault.db
	if err := copyFile(dbFile, currDb); err != nil {
		// Reconnect DB and return error
		_, _ = database.InitDB()
		writeError(w, http.StatusInternalServerError, "Failed to restore database file: "+err.Error())
		return
	}

	// 5. Copy media files if present
	srcMedia := filepath.Join(srcDir, "media")
	dstMedia := filepath.Join(vaultDir, "media")
	_ = os.MkdirAll(dstMedia, 0755)

	importedMediaCount := 0
	if entries, err := os.ReadDir(srcMedia); err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				s := filepath.Join(srcMedia, e.Name())
				d := filepath.Join(dstMedia, e.Name())
				if err := copyFile(s, d); err == nil {
					importedMediaCount++
				}
			}
		}
	}

	// 6. Reopen SQLite database
	newDB, err := database.InitDB()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database replaced, but failed to reconnect: "+err.Error())
		return
	}

	// 7. Query imported statistics
	var postCount, folderCount, spaceCount int
	_ = newDB.QueryRow("SELECT COUNT(*) FROM posts").Scan(&postCount)
	_ = newDB.QueryRow("SELECT COUNT(*) FROM folders").Scan(&folderCount)
	_ = newDB.QueryRow("SELECT COUNT(*) FROM spaces").Scan(&spaceCount)

	writeJSON(w, http.StatusOK, map[string]any{
		"success":                true,
		"imported_posts_count":   postCount,
		"imported_folders_count": folderCount,
		"imported_spaces_count":  spaceCount,
		"imported_media_count":   importedMediaCount,
		"message": fmt.Sprintf("Successfully restored vault: %d tweets, %d folders, and %d media files!",
			postCount, folderCount, importedMediaCount),
	})
}


