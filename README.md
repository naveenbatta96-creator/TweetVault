# TweetVault 🚀

**TweetVault** is a modern desktop workspace application designed to organize, curate, and draft content with dedicated **Spaces**, **Folders**, and **Collections**. It features a rich **Docx Story Editor** powered by Lexical with native support for Microsoft Word export, OneNote text + image pasting, and automatic offline local media caching.

---

## 🌟 Key Features

* **Multi-Space Architecture:** Organize tweets, threads, essays, and stories into customizable color-coded Spaces and Folders.
* **Docx Lexical Editor:**
  * Rich-text editing with headings, quotes, lists, code, and formatting.
  * Direct export to Microsoft Word `.doc` documents.
  * Full-featured Story Reader mode with typography scaling and print support.
* **OneNote & Web Story Image Support:**
  * Paste mixed text + images directly from **Microsoft OneNote**.
  * Paste articles and stories from websites; embedded image links are automatically downloaded and cached locally in offline media storage.
  * Paste raw screenshots or drag-and-drop local images.
* **High Performance Desktop Stack:**
  * **Frontend:** React 19 + Vite + Lexical Rich Text Engine.
  * **Backend & Desktop:** Wails v2 + Go + native WebView2 runtime with pure-Go SQLite WAL persistence.
  * **Ultra Lightweight:** Single ~17 MB standalone executable (replaces heavy 115+ MB Electron shell).

---

## 🛠️ Project Structure

```text
├── build/            # Wails build assets (Windows manifest, icons, installer)
│   └── bin/          # Compiled executable (TweetVault.exe)
├── database/         # SQLite schema, WAL mode, migrations
├── handlers/         # Spaces, Folders, Collections, Posts & Media handlers
├── models/           # Data models and structures
├── frontend/         # React 19 + Vite application
│   └── src/
│       ├── components/
│       │   ├── StoryDocEditor.jsx # Lexical-powered rich editor
│       │   ├── StoryDocViewer.jsx # Reading view modal
│       │   └── ImageNode.jsx      # Image node with auto local download
│       └── App.jsx
├── main.go           # Wails desktop entrypoint & in-process AssetServer API
├── app.go            # Wails desktop lifecycle & runtime bridge
├── wails.json        # Wails v2 project configuration
└── go.mod            # Go module definitions
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Go](https://go.dev/) (v1.22+)
* [Wails v2](https://wails.io/) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Development Mode

Run the app with live reload for both Go backend and React frontend:
```bash
wails dev
```

### Production Build

Compile a single, self-contained native Windows executable:
```bash
wails build
```

Generates:
* `build/bin/TweetVault.exe` (~17.5 MB standalone executable)
