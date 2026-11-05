import React from 'react'
import { SlidersHorizontal, Plus, Folder } from 'lucide-react'
import FolderCard from './FolderCard'

export default function HomeView({
  folders = [],
  folderColumns = 4,
  onFolderColumnsChange,
  onSelectFolder,
  onEditFolder,
  onOpenCreateFolder,
}) {
  return (
    <>
      <div className="gdrive-toolbar">
        <div className="gdrive-toolbar-left">
          {/* FilePilot-style Grid Column Slider in Left Corner */}
          <div className="filepilot-slider-corner">
            <SlidersHorizontal size={14} className="filepilot-slider-icon" />
            <span className="filepilot-slider-label">Columns</span>
            <input
              type="range"
              min={2}
              max={8}
              value={folderColumns}
              onChange={(e) => {
                const val = Number(e.target.value)
                onFolderColumnsChange?.(val)
              }}
              className="filepilot-range-slider"
              title={`Grid columns: ${folderColumns}`}
            />
            <span className="filepilot-col-count">{folderColumns}</span>
          </div>

          <div className="gdrive-section-title-badge">
            <span className="gdrive-section-title-text">Folders</span>
            <span className="gdrive-count-pill">{folders.length}</span>
          </div>
        </div>

        <div className="gdrive-toolbar-actions">
          <button
            type="button"
            className="gdrive-add-folder-action-btn"
            onClick={onOpenCreateFolder}
            title="Create New Folder"
          >
            <Plus size={15} />
            <span>New folder</span>
          </button>
        </div>
      </div>

      {folders.length > 0 ? (
        <div
          className="gdrive-folders-grid"
          style={{
            gridTemplateColumns: `repeat(${folderColumns}, minmax(0, 1fr))`,
          }}
        >
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={onSelectFolder}
              onEdit={onEditFolder}
            />
          ))}
        </div>
      ) : (
        <div className="md3-empty-state">
          <div className="md3-empty-icon-box">
            <Folder size={32} />
          </div>
          <h3 className="md3-title-medium">No folders created yet</h3>
          <p className="md3-body-small text-secondary">
            Folders keep your saved tweets, threads, and knowledge neatly organized.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={onOpenCreateFolder}
          >
            <Plus size={16} />
            <span>Create your first folder</span>
          </button>
        </div>
      )}
    </>
  )
}

