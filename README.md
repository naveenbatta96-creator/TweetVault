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
  * **Backend:** Golang embedded server with SQLite WAL mode persistence.
  * **Desktop:** Electron shell with zero-configuration installer.

---

## 🛠️ Project Structure

```text
├── backend/          # Go HTTP REST API & SQLite database
│   ├── handlers/     # Spaces, Folders, Collections, Posts & Media handlers
│   ├── database/     # SQLite schema, WAL mode, migrations
│   └── main.go       # Go entrypoint & static SPA embedder
├── frontend/         # React + Vite application
│   └── src/
│       ├── components/
│       │   ├── StoryDocEditor.jsx # Lexical-powered rich editor
│       │   ├── StoryDocViewer.jsx # Reading view modal
│       │   └── ImageNode.jsx      # Image node with auto local download
│       └── App.jsx
└── desktop-app/      # Electron desktop wrapper & packaging
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Go](https://go.dev/) (v1.22+)

### Development Mode

1. **Start the Go Backend:**
   ```bash
   cd backend
   go run .
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Start the Desktop App (Optional):**
   ```bash
   cd desktop-app
   npm install
   npm start
   ```

### Building Installers

```bash
cd desktop-app
npm run build:win
```

Generates:
* `TweetVault Setup.exe` (NSIS Installer)
* `TweetVault.exe` (Portable executable)
