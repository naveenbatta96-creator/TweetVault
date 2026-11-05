import React, { useMemo } from 'react'
import { Folder } from 'lucide-react'
import PostGridCard from './PostGridCard'

export default function PostGridView({
  posts = [],
  selectedPostIds = [],
  onSelectPost,
  onOpenPost,
  onOpenMovePost,
}) {
  const selectedSet = useMemo(() => new Set(selectedPostIds), [selectedPostIds])

  return (
    <div
      className={`gdrive-grid-feed ${selectedPostIds.length > 0 ? 'has-active-selection' : ''}`}
    >
      {posts.map((post) => (
        <PostGridCard
          key={post.id}
          post={post}
          isSelected={selectedSet.has(post.id)}
          onSelectPost={onSelectPost}
          onOpenPost={onOpenPost}
          onOpenMovePost={onOpenMovePost}
        />
      ))}

      {posts.length === 0 && (
        <div className="md3-empty-state">
          <div className="md3-empty-icon-box">
            <Folder size={32} />
          </div>
          <h3 className="md3-title-medium">No archived items in this view</h3>
          <p className="md3-body-small text-secondary">
            Click "+ New" above or press ⌘K to archive your first tweet or story.
          </p>
        </div>
      )}
    </div>
  )
}

