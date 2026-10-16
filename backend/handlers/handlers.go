package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"tweetvault-backend/database"
	"tweetvault-backend/models"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// tagsToJSON converts a []string to a JSON string for storage
func tagsToJSON(tags []string) string {
	if tags == nil {
		tags = []string{}
	}
	b, _ := json.Marshal(tags)
	return string(b)
}

// tagsFromJSON converts a JSON string back to []string
func tagsFromJSON(s string) []string {
	var tags []string
	if err := json.Unmarshal([]byte(s), &tags); err != nil {
		return []string{}
	}
	return tags
}

// ---- SPACES HANDLERS ----

func GetSpaces(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT s.id, s.name, s.description, s.color, s.icon, s.created_at,
		       (SELECT COUNT(*) FROM folders f WHERE f.space_id = s.id) AS folders_count,
		       (SELECT COUNT(*) FROM posts p WHERE p.space_id = s.id) AS posts_count
		FROM spaces s
		ORDER BY s.id ASC
	`
	rows, err := database.DB.Query(query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch spaces: "+err.Error())
		return
	}
	defer rows.Close()

	spaces := make([]models.Space, 0)
	for rows.Next() {
		var s models.Space
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Color, &s.Icon, &s.CreatedAt, &s.FoldersCount, &s.PostsCount); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan space: "+err.Error())
			return
		}
		spaces = append(spaces, s)
	}

	writeJSON(w, http.StatusOK, spaces)
}

func CreateSpace(w http.ResponseWriter, r *http.Request) {
	var s models.Space
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(s.Name) == "" {
		writeError(w, http.StatusBadRequest, "Space name is required")
		return
	}
	if s.Color == "" {
		s.Color = "#3b82f6"
	}
	if s.Icon == "" {
		s.Icon = "sparkles"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	query := `INSERT INTO spaces (name, description, color, icon, created_at) VALUES (?, ?, ?, ?, ?)`
	res, err := database.DB.Exec(query, s.Name, s.Description, s.Color, s.Icon, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create space: "+err.Error())
		return
	}

	id, _ := res.LastInsertId()
	s.ID = int(id)
	s.CreatedAt = now

	writeJSON(w, http.StatusCreated, s)
}

func UpdateSpace(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid space id")
		return
	}

	var s models.Space
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	query := `UPDATE spaces SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?`
	res, err := database.DB.Exec(query, s.Name, s.Description, s.Color, s.Icon, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update space: "+err.Error())
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, "Space not found")
		return
	}

	s.ID = id
	writeJSON(w, http.StatusOK, s)
}

func DeleteSpace(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid space id")
		return
	}

	_, err = database.DB.Exec(`DELETE FROM spaces WHERE id = ?`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete space: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Space deleted successfully"})
}

// ---- FOLDERS HANDLERS ----

func GetFolders(w http.ResponseWriter, r *http.Request) {
	spaceIDStr := r.URL.Query().Get("space_id")
	var rows *sql.Rows
	var err error

	if spaceIDStr != "" {
		spaceID, _ := strconv.Atoi(spaceIDStr)
		query := `
			SELECT f.id, f.space_id, f.name, f.color, f.created_at,
			       (SELECT COUNT(*) FROM posts p WHERE p.folder_id = f.id) AS posts_count
			FROM folders f
			WHERE f.space_id = ?
			ORDER BY f.id ASC
		`
		rows, err = database.DB.Query(query, spaceID)
	} else {
		query := `
			SELECT f.id, f.space_id, f.name, f.color, f.created_at,
			       (SELECT COUNT(*) FROM posts p WHERE p.folder_id = f.id) AS posts_count
			FROM folders f
			ORDER BY f.id ASC
		`
		rows, err = database.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch folders: "+err.Error())
		return
	}
	defer rows.Close()

	folders := make([]models.Folder, 0)
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(&f.ID, &f.SpaceID, &f.Name, &f.Color, &f.CreatedAt, &f.PostsCount); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan folder: "+err.Error())
			return
		}
		folders = append(folders, f)
	}

	writeJSON(w, http.StatusOK, folders)
}

func CreateFolder(w http.ResponseWriter, r *http.Request) {
	var f models.Folder
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(f.Name) == "" || f.SpaceID == 0 {
		writeError(w, http.StatusBadRequest, "Name and valid space_id are required")
		return
	}
	if f.Color == "" {
		f.Color = "#3b82f6"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	query := `INSERT INTO folders (space_id, name, color, created_at) VALUES (?, ?, ?, ?)`
	res, err := database.DB.Exec(query, f.SpaceID, f.Name, f.Color, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create folder: "+err.Error())
		return
	}

	id, _ := res.LastInsertId()
	f.ID = int(id)
	f.CreatedAt = now

	writeJSON(w, http.StatusCreated, f)
}

func DeleteFolder(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid folder id")
		return
	}

	_, err = database.DB.Exec(`DELETE FROM folders WHERE id = ?`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete folder: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Folder deleted successfully"})
}

func UpdateFolder(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid folder id")
		return
	}

	var f models.Folder
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(f.Name) == "" {
		writeError(w, http.StatusBadRequest, "Folder name is required")
		return
	}

	// For SQLite: handle the COALESCE(NULLIF()) pattern manually
	if f.SpaceID > 0 {
		query := `UPDATE folders SET space_id = ?, name = ?, color = ? WHERE id = ?`
		_, err = database.DB.Exec(query, f.SpaceID, f.Name, f.Color, id)
	} else {
		query := `UPDATE folders SET name = ?, color = ? WHERE id = ?`
		_, err = database.DB.Exec(query, f.Name, f.Color, id)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update folder: "+err.Error())
		return
	}

	// Read back the updated row
	err = database.DB.QueryRow(`SELECT space_id, name, color, created_at FROM folders WHERE id = ?`, id).
		Scan(&f.SpaceID, &f.Name, &f.Color, &f.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read updated folder: "+err.Error())
		return
	}

	// If moving to another space, also update all posts belonging to this folder to the new space
	if f.SpaceID > 0 {
		_, _ = database.DB.Exec(`UPDATE posts SET space_id = ? WHERE folder_id = ?`, f.SpaceID, id)
	}

	f.ID = id
	writeJSON(w, http.StatusOK, f)
}


// ---- COLLECTIONS HANDLERS ----

func GetCollections(w http.ResponseWriter, r *http.Request) {
	spaceIDStr := r.URL.Query().Get("space_id")
	var rows *sql.Rows
	var err error

	if spaceIDStr != "" {
		spaceID, _ := strconv.Atoi(spaceIDStr)
		query := `
			SELECT c.id, c.space_id, c.name, c.color, c.created_at,
			       (SELECT COUNT(*) FROM posts p WHERE p.collection_id = c.id) AS posts_count
			FROM collections c
			WHERE c.space_id = ?
			ORDER BY c.id ASC
		`
		rows, err = database.DB.Query(query, spaceID)
	} else {
		query := `
			SELECT c.id, c.space_id, c.name, c.color, c.created_at,
			       (SELECT COUNT(*) FROM posts p WHERE p.collection_id = c.id) AS posts_count
			FROM collections c
			ORDER BY c.id ASC
		`
		rows, err = database.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch collections: "+err.Error())
		return
	}
	defer rows.Close()

	collections := make([]models.Collection, 0)
	for rows.Next() {
		var c models.Collection
		if err := rows.Scan(&c.ID, &c.SpaceID, &c.Name, &c.Color, &c.CreatedAt, &c.PostsCount); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan collection: "+err.Error())
			return
		}
		collections = append(collections, c)
	}

	writeJSON(w, http.StatusOK, collections)
}

func CreateCollection(w http.ResponseWriter, r *http.Request) {
	var c models.Collection
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(c.Name) == "" || c.SpaceID == 0 {
		writeError(w, http.StatusBadRequest, "Name and valid space_id are required")
		return
	}
	if c.Color == "" {
		c.Color = "#ec4899"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	query := `INSERT INTO collections (space_id, name, color, created_at) VALUES (?, ?, ?, ?)`
	res, err := database.DB.Exec(query, c.SpaceID, c.Name, c.Color, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create collection: "+err.Error())
		return
	}

	id, _ := res.LastInsertId()
	c.ID = int(id)
	c.CreatedAt = now

	writeJSON(w, http.StatusCreated, c)
}

func DeleteCollection(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	_, err = database.DB.Exec(`DELETE FROM collections WHERE id = ?`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete collection: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Collection deleted successfully"})
}

func UpdateCollection(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	var c models.Collection
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(c.Name) == "" {
		writeError(w, http.StatusBadRequest, "Collection name is required")
		return
	}

	if c.SpaceID > 0 {
		query := `UPDATE collections SET space_id = ?, name = ?, color = ? WHERE id = ?`
		_, err = database.DB.Exec(query, c.SpaceID, c.Name, c.Color, id)
	} else {
		query := `UPDATE collections SET name = ?, color = ? WHERE id = ?`
		_, err = database.DB.Exec(query, c.Name, c.Color, id)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update collection: "+err.Error())
		return
	}

	// Read back updated row
	err = database.DB.QueryRow(`SELECT space_id, name, color, created_at FROM collections WHERE id = ?`, id).
		Scan(&c.SpaceID, &c.Name, &c.Color, &c.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read updated collection: "+err.Error())
		return
	}

	// If moving to another space, also update all posts belonging to this collection to the new space
	if c.SpaceID > 0 {
		_, _ = database.DB.Exec(`UPDATE posts SET space_id = ? WHERE collection_id = ?`, c.SpaceID, id)
	}

	c.ID = id
	writeJSON(w, http.StatusOK, c)
}


// ---- POSTS (TWEETS & STORIES) HANDLERS ----

func GetPosts(w http.ResponseWriter, r *http.Request) {
	queryValues := r.URL.Query()
	spaceIDStr := queryValues.Get("space_id")
	folderIDStr := queryValues.Get("folder_id")
	collectionIDStr := queryValues.Get("collection_id")
	postType := queryValues.Get("type")
	search := queryValues.Get("q")
	sortBy := queryValues.Get("sort")

	var conditions []string
	var args []any

	if spaceIDStr != "" {
		if spaceID, err := strconv.Atoi(spaceIDStr); err == nil {
			conditions = append(conditions, "p.space_id = ?")
			args = append(args, spaceID)
		}
	}

	if folderIDStr != "" && folderIDStr != "all" {
		if folderID, err := strconv.Atoi(folderIDStr); err == nil {
			conditions = append(conditions, "p.folder_id = ?")
			args = append(args, folderID)
		}
	}

	if collectionIDStr != "" && collectionIDStr != "all" {
		if colID, err := strconv.Atoi(collectionIDStr); err == nil {
			conditions = append(conditions, "p.collection_id = ?")
			args = append(args, colID)
		}
	}

	if postType != "" && postType != "all" {
		conditions = append(conditions, "p.type = ?")
		args = append(args, postType)
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		conditions = append(conditions, "(LOWER(p.content) LIKE ? OR LOWER(p.title) LIKE ? OR LOWER(p.author_name) LIKE ? OR LOWER(p.author_handle) LIKE ?)")
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	orderClause := "ORDER BY p.id DESC"
	if sortBy == "likes" {
		orderClause = "ORDER BY p.likes_count DESC"
	} else if sortBy == "oldest" {
		orderClause = "ORDER BY p.id ASC"
	}

	rawSQL := `
		SELECT p.id, p.space_id, p.folder_id, p.collection_id, p.type, p.title, p.content,
		       p.author_name, p.author_handle, p.author_avatar, p.media_url, p.original_url,
		       p.likes_count, p.retweets_count, p.bookmarks_count, p.read_time, p.tags,
		       p.is_favorite, COALESCE(p.comment, '') AS comment, p.created_at, p.updated_at,
		       COALESCE(f.name, '') AS folder_name,
		       COALESCE(c.name, '') AS collection_name
		FROM posts p
		LEFT JOIN folders f ON p.folder_id = f.id
		LEFT JOIN collections c ON p.collection_id = c.id
		` + whereClause + ` ` + orderClause

	rows, err := database.DB.Query(rawSQL, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Query failed: "+err.Error())
		return
	}
	defer rows.Close()

	posts := make([]models.Post, 0)
	for rows.Next() {
		var p models.Post
		var tagsJSON string
		var isFav int
		err := rows.Scan(
			&p.ID, &p.SpaceID, &p.FolderID, &p.CollectionID, &p.Type, &p.Title, &p.Content,
			&p.AuthorName, &p.AuthorHandle, &p.AuthorAvatar, &p.MediaURL, &p.OriginalURL,
			&p.LikesCount, &p.RetweetsCount, &p.BookmarksCount, &p.ReadTime, &tagsJSON,
			&isFav, &p.Comment, &p.CreatedAt, &p.UpdatedAt,
			&p.FolderName, &p.CollectionName,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan post: "+err.Error())
			return
		}
		p.IsFavorite = isFav != 0
		p.Tags = tagsFromJSON(tagsJSON)
		posts = append(posts, p)
	}

	writeJSON(w, http.StatusOK, posts)
}

func GetPostByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid post id")
		return
	}

	var p models.Post
	var tagsJSON string
	var isFav int
	rawSQL := `
		SELECT p.id, p.space_id, p.folder_id, p.collection_id, p.type, p.title, p.content,
		       p.author_name, p.author_handle, p.author_avatar, p.media_url, p.original_url,
		       p.likes_count, p.retweets_count, p.bookmarks_count, p.read_time, p.tags,
		       p.is_favorite, COALESCE(p.comment, '') AS comment, p.created_at, p.updated_at,
		       COALESCE(f.name, '') AS folder_name,
		       COALESCE(c.name, '') AS collection_name
		FROM posts p
		LEFT JOIN folders f ON p.folder_id = f.id
		LEFT JOIN collections c ON p.collection_id = c.id
		WHERE p.id = ?
	`
	err = database.DB.QueryRow(rawSQL, id).Scan(
		&p.ID, &p.SpaceID, &p.FolderID, &p.CollectionID, &p.Type, &p.Title, &p.Content,
		&p.AuthorName, &p.AuthorHandle, &p.AuthorAvatar, &p.MediaURL, &p.OriginalURL,
		&p.LikesCount, &p.RetweetsCount, &p.BookmarksCount, &p.ReadTime, &tagsJSON,
		&isFav, &p.Comment, &p.CreatedAt, &p.UpdatedAt,
		&p.FolderName, &p.CollectionName,
	)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "Post not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "Query error: "+err.Error())
		return
	}

	p.IsFavorite = isFav != 0
	p.Tags = tagsFromJSON(tagsJSON)
	writeJSON(w, http.StatusOK, p)
}

func CreatePost(w http.ResponseWriter, r *http.Request) {
	var p models.Post
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(p.Content) == "" {
		writeError(w, http.StatusBadRequest, "Content is required")
		return
	}
	if p.Type == "" {
		p.Type = "tweet"
	}
	if p.AuthorName == "" {
		p.AuthorName = "Saved Creator"
	}
	if p.AuthorHandle == "" {
		p.AuthorHandle = "@creator"
	}
	if p.Tags == nil {
		p.Tags = []string{}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	isFav := 0
	if p.IsFavorite {
		isFav = 1
	}

	query := `
		INSERT INTO posts (
			space_id, folder_id, collection_id, type, title, content,
			author_name, author_handle, author_avatar, media_url, original_url,
			likes_count, retweets_count, bookmarks_count, read_time, tags, is_favorite, comment,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	res, err := database.DB.Exec(
		query,
		p.SpaceID, p.FolderID, p.CollectionID, p.Type, p.Title, p.Content,
		p.AuthorName, p.AuthorHandle, p.AuthorAvatar, p.MediaURL, p.OriginalURL,
		p.LikesCount, p.RetweetsCount, p.BookmarksCount, p.ReadTime, tagsToJSON(p.Tags), isFav, p.Comment,
		now, now,
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create post: "+err.Error())
		return
	}

	id, _ := res.LastInsertId()
	p.ID = int(id)
	p.CreatedAt = now
	p.UpdatedAt = now

	writeJSON(w, http.StatusCreated, p)
}

func UpdatePost(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid post id")
		return
	}

	var p models.Post
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if p.Tags == nil {
		p.Tags = []string{}
	}

	isFav := 0
	if p.IsFavorite {
		isFav = 1
	}
	now := time.Now().UTC().Format(time.RFC3339)

	// Handle the COALESCE(NULLIF()) pattern: only update space_id if non-zero
	var query string
	var execArgs []any

	if p.SpaceID > 0 {
		query = `
			UPDATE posts SET
				space_id = ?,
				folder_id = ?,
				collection_id = ?,
				type = ?,
				title = ?,
				content = ?,
				author_name = ?,
				author_handle = ?,
				author_avatar = ?,
				media_url = ?,
				original_url = ?,
				likes_count = ?,
				retweets_count = ?,
				bookmarks_count = ?,
				read_time = ?,
				tags = ?,
				is_favorite = ?,
				comment = ?,
				updated_at = ?
			WHERE id = ?
		`
		execArgs = []any{
			p.SpaceID, p.FolderID, p.CollectionID, p.Type, p.Title, p.Content,
			p.AuthorName, p.AuthorHandle, p.AuthorAvatar, p.MediaURL, p.OriginalURL,
			p.LikesCount, p.RetweetsCount, p.BookmarksCount, p.ReadTime, tagsToJSON(p.Tags), isFav, p.Comment,
			now, id,
		}
	} else {
		query = `
			UPDATE posts SET
				folder_id = ?,
				collection_id = ?,
				type = ?,
				title = ?,
				content = ?,
				author_name = ?,
				author_handle = ?,
				author_avatar = ?,
				media_url = ?,
				original_url = ?,
				likes_count = ?,
				retweets_count = ?,
				bookmarks_count = ?,
				read_time = ?,
				tags = ?,
				is_favorite = ?,
				comment = ?,
				updated_at = ?
			WHERE id = ?
		`
		execArgs = []any{
			p.FolderID, p.CollectionID, p.Type, p.Title, p.Content,
			p.AuthorName, p.AuthorHandle, p.AuthorAvatar, p.MediaURL, p.OriginalURL,
			p.LikesCount, p.RetweetsCount, p.BookmarksCount, p.ReadTime, tagsToJSON(p.Tags), isFav, p.Comment,
			now, id,
		}
	}

	res, err := database.DB.Exec(query, execArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update post: "+err.Error())
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, "Post not found")
		return
	}

	p.ID = id
	writeJSON(w, http.StatusOK, p)
}

func DeletePost(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid post id")
		return
	}

	_, err = database.DB.Exec(`DELETE FROM posts WHERE id = ?`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete post: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Post deleted successfully"})
}
