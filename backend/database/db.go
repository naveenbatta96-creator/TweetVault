package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// getDBPath returns the path to the SQLite database file.
// It stores the DB in the user's AppData/TweetVault directory for a clean install experience.
func getDBPath() (string, error) {
	// Check for explicit override via environment variable
	if dbPath := os.Getenv("DATABASE_PATH"); dbPath != "" {
		dir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", fmt.Errorf("failed to create directory for DATABASE_PATH: %w", err)
		}
		return dbPath, nil
	}

	// Prefer UserConfigDir (e.g. %APPDATA%\TweetVault on Windows) for reliable permissions & update persistence
	if configDir, err := os.UserConfigDir(); err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "TweetVault")
		if err := os.MkdirAll(appDir, 0755); err == nil {
			return filepath.Join(appDir, "tweetvault.db"), nil
		}
	}

	// Fallback: store alongside the executable
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("failed to get executable path: %w", err)
	}
	exeDir := filepath.Dir(exePath)
	dbDir := filepath.Join(exeDir, "data")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create data directory: %w", err)
	}
	return filepath.Join(dbDir, "tweetvault.db"), nil
}

// GetMediaDir returns the path to the directory where downloaded media and images are saved.
func GetMediaDir() (string, error) {
	dbPath, err := getDBPath()
	if err != nil {
		return "", err
	}
	mediaDir := filepath.Join(filepath.Dir(dbPath), "media")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create media directory: %w", err)
	}
	return mediaDir, nil
}

func InitDB() (*sql.DB, error) {
	dbPath, err := getDBPath()
	if err != nil {
		return nil, err
	}

	log.Printf("Using SQLite database at: %s", dbPath)

	DB, err = sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Connected to SQLite database successfully.")

	if err := createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	if err := seedInitialData(); err != nil {
		log.Printf("Notice during seeding: %v", err)
	}

	return DB, nil
}

func createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS spaces (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		color TEXT DEFAULT '#3b82f6',
		icon TEXT DEFAULT 'space',
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS folders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		color TEXT DEFAULT '#6366f1',
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS collections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		color TEXT DEFAULT '#ec4899',
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
		folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
		collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
		type TEXT NOT NULL DEFAULT 'tweet',
		title TEXT DEFAULT '',
		content TEXT NOT NULL,
		author_name TEXT DEFAULT 'Anonymous',
		author_handle TEXT DEFAULT '@anon',
		author_avatar TEXT DEFAULT '',
		media_url TEXT DEFAULT '',
		original_url TEXT DEFAULT '',
		likes_count INTEGER DEFAULT 0,
		retweets_count INTEGER DEFAULT 0,
		bookmarks_count INTEGER DEFAULT 0,
		read_time TEXT DEFAULT '',
		tags TEXT DEFAULT '[]',
		is_favorite INTEGER DEFAULT 0,
		comment TEXT DEFAULT '',
		created_at TEXT DEFAULT (datetime('now')),
		updated_at TEXT DEFAULT (datetime('now'))
	);
	`

	_, err := DB.Exec(schema)
	return err
}

func seedInitialData() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM spaces").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // already seeded
	}

	log.Println("Seeding initial spaces, folders, collections, tweets and stories...")

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert Spaces
	res1, err := tx.Exec(`INSERT INTO spaces (name, description, color, icon) VALUES ('Space 1 - Tech & AI', 'Saved AI breakthroughs, developer tweets, and tech insights', '#3b82f6', 'cpu')`)
	if err != nil {
		return err
	}
	s1, _ := res1.LastInsertId()

	res2, err := tx.Exec(`INSERT INTO spaces (name, description, color, icon) VALUES ('Space 2 - Stories & Essays', 'Deep long-form articles, thought pieces, and memoirs', '#8b5cf6', 'book-open')`)
	if err != nil {
		return err
	}
	s2, _ := res2.LastInsertId()

	res3, err := tx.Exec(`INSERT INTO spaces (name, description, color, icon) VALUES ('Space 3 - Design & Sparks', 'UI/UX inspiration, product teardowns, and creative gems', '#ec4899', 'palette')`)
	if err != nil {
		return err
	}
	s3, _ := res3.LastInsertId()

	// 2. Insert Folders for Space 1
	r, _ := tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'AI & Agents', '#3b82f6')`, s1)
	f1, _ := r.LastInsertId()
	r, _ = tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Go & Backend', '#06b6d4')`, s1)
	f2, _ := r.LastInsertId()
	r, _ = tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'System Design', '#10b981')`, s1)
	f3, _ := r.LastInsertId()
	r, _ = tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Frontend Tricks', '#f59e0b')`, s1)
	f4, _ := r.LastInsertId()

	// 3. Insert Collections for Space 1
	r, _ = tx.Exec(`INSERT INTO collections (space_id, name, color) VALUES (?, 'Must Read Today', '#ef4444')`, s1)
	c1, _ := r.LastInsertId()
	r, _ = tx.Exec(`INSERT INTO collections (space_id, name, color) VALUES (?, 'High Signal Threads', '#8b5cf6')`, s1)
	c2, _ := r.LastInsertId()
	r, _ = tx.Exec(`INSERT INTO collections (space_id, name, color) VALUES (?, 'Tools & Frameworks', '#10b981')`, s1)
	c3, _ := r.LastInsertId()

	// 4. Insert Sample Posts (tags stored as JSON arrays)
	type seedPost struct {
		spaceID, folderID, collectionID int64
		pType, title, content           string
		authorName, authorHandle        string
		authorAvatar, mediaURL          string
		originalURL                     string
		likes, retweets, bookmarks      int
		readTime, tags                  string
	}

	posts := []seedPost{
		{s1, f1, c1, "tweet", "",
			"The future of software engineering isn't just generating code—it's orchestrating agentic loops that reason, test, reflect, and continuously self-heal. 🚀",
			"Andrej Karpathy", "@karpathy",
			"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
			"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
			"https://twitter.com/karpathy/status/1780000000",
			14200, 2350, 3890, "", `["AI","Agents","Future"]`},
		{s1, f2, c2, "tweet", "",
			"Go 1.27 with enhanced pattern routing in net/http makes writing microservices so clean you rarely even need heavy third-party routing routers anymore. Pure standard library delight.",
			"Rob Pike Fan", "@golang_dev",
			"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
			"",
			"https://twitter.com/golang_dev/status/1781111111",
			3840, 620, 1280, "", `["Go","Backend","Architecture"]`},
		{s1, f1, c1, "story", "How Autonomous Code Agents Will Redefine 2027 Engineering",
			"When we look back at developer productivity over the last decade, the transition wasn't from slower typing to faster typing. It was shifting from manual syntax assembly to high-level systemic architecture.\n\n### The Feedback Loop\nIn modern software, the agent doesn't stop when a file is written. It compiles, inspects errors, spins up headless environments, and self-corrects before a human ever reviews the PR.\n\n### Where Humans Excel\nJudgment, ethical alignment, product nuance, and taste remain uniquely irreplaceable. Great builders will direct orchestras of AI agents instead of writing boilerplate.",
			"Elena Rostova", "@elena_tech",
			"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
			"https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
			"https://medium.com/@elena/autonomous-code-agents",
			8450, 1120, 4320, "5 min read", `["DeepDive","AI","Engineering"]`},
		{s1, f3, c3, "tweet", "",
			"PostgreSQL 18 brings incredible concurrency improvements. Pair it with connection pooling and typed schemas, and it easily handles 95% of workloads that people mistakenly reach distributed NoSQL for.",
			"Database Weekly", "@pg_insights",
			"https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
			"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
			"https://twitter.com/pg_insights/status/1782222222",
			5600, 940, 2890, "", `["PostgreSQL","Database","Scale"]`},
		{s1, f4, c2, "story", "The Renaissance of Vanilla CSS & Modern Design Systems",
			"For years, web development was dominated by giant utility suites and heavy CSS-in-JS abstractions. But with CSS nesting, custom properties (`var(--token)`), `@container` queries, and color-mix(), native CSS has returned to supreme dominance.\n\n#### Why Simplicity Wins\nZero build step friction, instant paint times, crystal clear debugging in devtools, and complete design freedom. Your design system becomes transparent and enduring.",
			"Marcus Thorne", "@marcusthorne",
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
			"https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
			"https://designsystems.io/vanilla-css-renaissance",
			4120, 730, 2110, "4 min read", `["CSS","Design","WebDev"]`},
		{s1, f1, c1, "tweet", "",
			"Tip: When saving tweets, categorize them by actionable topic instead of chronologically. Your future self looking for 'auth patterns' will thank you immensely.",
			"Sarah Jenkins", "@sarah_codes",
			"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
			"",
			"https://twitter.com/sarah_codes/status/1783333333",
			2150, 320, 980, "", `["Productivity","Tips"]`},
	}

	for _, p := range posts {
		_, err := tx.Exec(`
			INSERT INTO posts (
				space_id, folder_id, collection_id, type, title, content,
				author_name, author_handle, author_avatar, media_url, original_url,
				likes_count, retweets_count, bookmarks_count, read_time, tags
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, p.spaceID, p.folderID, p.collectionID, p.pType, p.title, p.content,
			p.authorName, p.authorHandle, p.authorAvatar, p.mediaURL, p.originalURL,
			p.likes, p.retweets, p.bookmarks, p.readTime, p.tags)
		if err != nil {
			log.Printf("Error inserting post seed: %v", err)
		}
	}

	// Seed folders for space 2
	r, _ = tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Philosophy', '#8b5cf6')`, s2)
	s2f1, _ := r.LastInsertId()
	tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Science & Cosmos', '#6366f1')`, s2)
	tx.Exec(`INSERT INTO collections (space_id, name, color) VALUES (?, 'Timeless Essays', '#f43f5e')`, s2)

	// Seed one story in space 2
	tx.Exec(`
		INSERT INTO posts (
			space_id, folder_id, type, title, content,
			author_name, author_handle, author_avatar, media_url, read_time, tags
		) VALUES (?, ?, 'story', 'The Quiet Architecture of Solitude',
			'In an era defined by continuous pings, notifications, and instant feedback loops, intentional solitude has become the rarest luxury.

When we carve out uninterrupted silence, our brains transition from reactive mode to generative mode. It is in this stillness that genuine creative synthesis occurs.',
			'Julian Sterling', '@jsterling', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
			'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=800&auto=format&fit=crop&q=80',
			'6 min read', '["Philosophy","Mindfulness"]')
	`, s2, s2f1)

	// Seed folders for space 3
	tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Micro-Interactions', '#ec4899')`, s3)
	tx.Exec(`INSERT INTO folders (space_id, name, color) VALUES (?, 'Glassmorphism & Gradients', '#f43f5e')`, s3)
	tx.Exec(`INSERT INTO collections (space_id, name, color) VALUES (?, 'Award-Winning UI', '#8b5cf6')`, s3)

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}

	log.Println("Database seeded successfully!")
	return nil
}
