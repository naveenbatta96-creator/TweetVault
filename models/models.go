package models

type Space struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Color        string `json:"color"`
	Icon         string `json:"icon"`
	FoldersCount int    `json:"folders_count,omitempty"`
	PostsCount   int    `json:"posts_count,omitempty"`
	CreatedAt    string `json:"created_at"`
}

type Folder struct {
	ID         int    `json:"id"`
	SpaceID    int    `json:"space_id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	PostsCount int    `json:"posts_count,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type Collection struct {
	ID         int    `json:"id"`
	SpaceID    int    `json:"space_id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	PostsCount int    `json:"posts_count,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type Post struct {
	ID             int      `json:"id"`
	SpaceID        int      `json:"space_id"`
	FolderID       *int     `json:"folder_id"`
	CollectionID   *int     `json:"collection_id"`
	Type           string   `json:"type"` // "tweet" or "story"
	Title          string   `json:"title"`
	Content        string   `json:"content"`
	AuthorName     string   `json:"author_name"`
	AuthorHandle   string   `json:"author_handle"`
	AuthorAvatar   string   `json:"author_avatar"`
	MediaURL       string   `json:"media_url"`
	OriginalURL    string   `json:"original_url"`
	LikesCount     int      `json:"likes_count"`
	RetweetsCount  int      `json:"retweets_count"`
	BookmarksCount int      `json:"bookmarks_count"`
	ReadTime       string   `json:"read_time"`
	Tags           []string `json:"tags"`
	IsFavorite     bool     `json:"is_favorite"`
	Comment        string   `json:"comment"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`

	// Joined metadata for UI convenience
	FolderName     string `json:"folder_name,omitempty"`
	CollectionName string `json:"collection_name,omitempty"`
}
