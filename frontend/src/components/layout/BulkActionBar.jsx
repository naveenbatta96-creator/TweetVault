import React from 'react'
import { X, FolderInput, Trash2 } from 'lucide-react'

export default function BulkActionBar({
  selectedCount = 0,
  totalCount = 0,
  onClearSelection,
  onSelectAllVisible,
  onOpenBulkMove,
  onOpenBulkDelete,
}) {
  if (selectedCount === 0) return null

  return (
    <div className="gdrive-bulk-action-bar">
      <button
        type="button"
        className="gdrive-bulk-close-btn"
        onClick={onClearSelection}
        title="Deselect all (Esc)"
      >
        <X size={16} />
      </button>

      <div className="gdrive-bulk-count-pill">
        <span className="gdrive-bulk-count-badge">{selectedCount}</span>
        <span>{selectedCount === 1 ? 'item selected' : 'items selected'}</span>
      </div>

      <button
        type="button"
        className="gdrive-bulk-link-btn"
        onClick={onSelectAllVisible}
      >
        {selectedCount === totalCount ? 'Deselect all' : `Select all (${totalCount})`}
      </button>

      <div className="gdrive-bulk-divider" />

      <button
        type="button"
        className="gdrive-bulk-btn"
        onClick={onOpenBulkMove}
        title="Move selected items to a folder or collection"
      >
        <FolderInput size={15} />
        <span>Move to...</span>
      </button>

      <button
        type="button"
        className="gdrive-bulk-btn danger"
        onClick={onOpenBulkDelete}
        title="Delete selected items"
      >
        <Trash2 size={15} />
        <span>Delete</span>
      </button>
    </div>
  )
}

