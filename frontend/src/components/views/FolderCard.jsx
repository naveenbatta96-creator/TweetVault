import React from 'react'
import { Folder, MoreVertical } from 'lucide-react'
import { sanitizeM3Color } from '../../utils/colors'

export default function FolderCard({
  folder,
  onClick,
  onEdit,
}) {
  const fColor = sanitizeM3Color(folder.color)

  return (
    <div
      className="gdrive-folder-card"
      onClick={() => onClick?.(folder)}
      title={`Open ${folder.name}`}
    >
      <div className="gdrive-folder-card-header">
        <div
          className="gdrive-folder-icon-box"
          style={{
            background: `${fColor}18`,
            color: fColor,
          }}
        >
          <Folder size={20} fill={fColor} fillOpacity={0.2} />
        </div>
        <button
          type="button"
          className="gdrive-folder-more-btn"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.(folder, e)
          }}
          title="Folder settings"
        >
          <MoreVertical size={16} />
        </button>
      </div>
      <div className="gdrive-folder-card-body">
        <span className="gdrive-folder-name" title={folder.name}>
          {folder.name}
        </span>
        <span className="gdrive-folder-meta">
          {folder.posts_count || 0} {folder.posts_count === 1 ? 'item' : 'items'}
        </span>
      </div>
    </div>
  )
}

