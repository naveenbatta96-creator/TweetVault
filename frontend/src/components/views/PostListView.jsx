import React, { useMemo } from 'react'
import { Folder } from 'lucide-react'
import PostListRow from './PostListRow'

export default function PostListView({
  posts = [],
  selectedPostIds = [],
  activeSpaceName,
  onSelectPost,
  onSelectAllVisible,
  onOpenPost,
  onOpenMovePost,
}) {
  const selectedSet = useMemo(() => new Set(selectedPostIds), [selectedPostIds])
  const isAllSelected = posts.length > 0 && selectedPostIds.length === posts.length
  const isPartiallySelected =
    selectedPostIds.length > 0 && selectedPostIds.length < posts.length

  return (
    <div className="gdrive-table-container">
      <table className="gdrive-table">
        <thead>
          <tr>
            <th style={{ width: '40px', paddingRight: '0px' }}>
              <input
                type="checkbox"
                className="gdrive-checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected
                }}
                onChange={onSelectAllVisible}
                title={isAllSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
            <th style={{ width: '40%' }}>Name</th>
            <th style={{ width: '20%' }}>Tags</th>
            <th style={{ width: '18%' }}>Author</th>
            <th style={{ width: '16%' }}>Folder</th>
            <th style={{ width: '6%' }}></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <PostListRow
              key={post.id}
              post={post}
              isSelected={selectedSet.has(post.id)}
              activeSpaceName={activeSpaceName}
              onSelectPost={onSelectPost}
              onOpenPost={onOpenPost}
              onOpenMovePost={onOpenMovePost}
            />
          ))}
        </tbody>
      </table>

      {posts.length === 0 && (
        <div className="md3-empty-state">
          <div className="md3-empty-icon-box">
            <Folder size={32} />
          </div>
          <h3 className="md3-title-medium">No archived tweets in this view</h3>
          <p className="md3-body-small text-secondary">
            Click "+ New" above or paste a tweet URL to archive your first item.
          </p>
        </div>
      )}
    </div>
  )
}
