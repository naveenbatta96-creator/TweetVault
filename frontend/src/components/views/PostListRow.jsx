import React, { memo, useMemo } from 'react'
import {
  Video,
  FileText,
  MessageSquare,
  Folder,
  FolderInput,
  MoreVertical,
} from 'lucide-react'
import {
  getPrimaryMediaUrl,
  isVideoUrl,
  isGifUrl,
  resolveMediaUrl,
  handleMediaError,
} from '../../utils/media'

function PostListRow({
  post,
  isSelected = false,
  onSelectPost,
  onOpenPost,
  onOpenMovePost,
}) {
  const isStory = post.type === 'story'
  const primaryMedia = useMemo(() => getPrimaryMediaUrl(post.media_url), [post.media_url])
  const isVideo = useMemo(() => isVideoUrl(primaryMedia), [primaryMedia])
  const isGif = useMemo(() => isGifUrl(primaryMedia), [primaryMedia])
  const displayTitle = useMemo(
    () => post.title || post.content?.split('\n')[0]?.substring(0, 70) || 'Untitled Post',
    [post.title, post.content]
  )

  const authorInit = (post.author_name || 'A').charAt(0).toUpperCase()

  return (
    <tr
      className={`gdrive-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onOpenPost?.(post)}
    >
      <td
        style={{ width: '40px', paddingRight: '0px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="gdrive-checkbox"
          checked={isSelected}
          onChange={(e) => onSelectPost?.(post.id, e)}
          title={isSelected ? 'Deselect item' : 'Select item'}
        />
      </td>
      <td>
        <div className="gdrive-file-name-cell">
          <span
            className={`gdrive-file-icon ${isVideo ? 'video' : isGif ? 'gif' : isStory ? 'doc' : 'tweet'}`}
          >
            {isVideo ? (
              <Video size={13} />
            ) : isGif ? (
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>GIF</span>
            ) : isStory ? (
              <FileText size={13} />
            ) : (
              <MessageSquare size={13} />
            )}
          </span>
          <span className="gdrive-file-title" title={post.content}>
            {displayTitle}
          </span>
        </div>
      </td>
      <td>
        <span className="gdrive-reason-text">
          {post.tags && post.tags.length > 0
            ? `#${post.tags.slice(0, 2).join(' #')}`
            : 'Preserved'}
        </span>
      </td>
      <td>
        <div
          className="gdrive-owner-cell"
          title={`${post.author_name || 'Author'} (${post.author_handle || '@author'})`}
        >
          {post.author_avatar ? (
            <img
              src={resolveMediaUrl(post.author_avatar)}
              alt=""
              decoding="async"
              loading="lazy"
              onError={(e) => handleMediaError(e, post.author_avatar)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div className="gdrive-owner-avatar">{authorInit}</div>
          )}
          <span className="gdrive-owner-name truncate">
            {post.author_handle || post.author_name || '@author'}
          </span>
        </div>
      </td>
      <td>
        <div className="gdrive-location-cell">
          <Folder size={14} className="text-secondary" />
          <span className="truncate">{post.folder_name || 'Main Vault'}</span>
        </div>
      </td>
      <td>
        <div className="gdrive-row-actions">
          <button
            type="button"
            className="gdrive-action-icon-btn"
            onClick={(e) => {
              e.stopPropagation()
              onOpenMovePost?.(post, e)
            }}
            title="Move to folder"
          >
            <FolderInput size={15} />
          </button>
          <button
            type="button"
            className="gdrive-action-icon-btn"
            onClick={(e) => {
              e.stopPropagation()
              onOpenPost?.(post)
            }}
            title="Open details"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default memo(PostListRow)
