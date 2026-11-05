import React from 'react'
import {
  ArrowLeft,
  Plus,
  Check,
  Menu,
  LayoutGrid,
} from 'lucide-react'
import PostListView from './PostListView'
import PostGridView from './PostGridView'

export default function SubView({
  posts = [],
  selectedPostIds = [],
  layoutMode = 'list',
  setLayoutMode,
  sortBy = 'newest',
  setSortBy,
  filterType = 'all',
  activeViewTitle = 'All items',
  activeSpaceName = 'My Vault',
  onBackToHome,
  onCreateNewStoryDoc,
  onSelectPost,
  onSelectAllVisible,
  onOpenPost,
  onOpenMovePost,
}) {
  return (
    <>
      {/* Breadcrumbs Navigation */}
      <div className="gdrive-breadcrumbs-bar">
        <button
          type="button"
          className="gdrive-back-to-home-btn"
          onClick={onBackToHome}
        >
          <ArrowLeft size={14} />
          <span>Back to all folders</span>
        </button>
        <span className="gdrive-breadcrumb-separator">/</span>
        <span className="gdrive-breadcrumb-current">{activeViewTitle}</span>
      </div>

      {/* Toolbar Row */}
      <div className="gdrive-toolbar">
        <div className="gdrive-suggested-label">
          <span>Items in {activeViewTitle}</span>
          <span className="gdrive-count-pill">{posts.length}</span>
        </div>

        <div className="gdrive-toolbar-actions">
          {filterType === 'story' && (
            <button
              type="button"
              className="gdrive-add-folder-action-btn"
              onClick={onCreateNewStoryDoc}
              title="Draft a new thread or story document"
            >
              <Plus size={15} />
              <span>New thread</span>
            </button>
          )}

          {/* Segmented View Mode Toggle: [ ✓ ☰ | ⊞ ] */}
          <div className="gdrive-view-segmented">
            <button
              type="button"
              className={`gdrive-seg-btn ${layoutMode === 'list' ? 'active' : ''}`}
              onClick={() => setLayoutMode('list')}
              title="List view"
            >
              {layoutMode === 'list' && <Check size={13} />}
              <Menu size={16} />
            </button>
            <button
              type="button"
              className={`gdrive-seg-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => setLayoutMode('grid')}
              title="Grid view"
            >
              {layoutMode === 'grid' && <Check size={13} />}
              <LayoutGrid size={16} />
            </button>
          </div>

          <select
            className="gdrive-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Recently Saved</option>
            <option value="likes">Most Referenced</option>
            <option value="oldest">Date Posted</option>
          </select>
        </div>
      </div>

      {/* Content Display: List View vs Grid View */}
      {layoutMode === 'list' ? (
        <PostListView
          posts={posts}
          selectedPostIds={selectedPostIds}
          activeSpaceName={activeSpaceName}
          onSelectPost={onSelectPost}
          onSelectAllVisible={onSelectAllVisible}
          onOpenPost={onOpenPost}
          onOpenMovePost={onOpenMovePost}
        />
      ) : (
        <PostGridView
          posts={posts}
          selectedPostIds={selectedPostIds}
          onSelectPost={onSelectPost}
          onOpenPost={onOpenPost}
          onOpenMovePost={onOpenMovePost}
        />
      )}
    </>
  )
}

