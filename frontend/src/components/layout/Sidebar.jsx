import React, { useState, useMemo } from 'react'
import {
  Plus,
  ChevronDown,
  MessageSquare,
  BookOpen,
  LayoutGrid,
  Folder,
  Image as ImageIcon,
  Bookmark,
  Hash,
} from 'lucide-react'
import { sanitizeM3Color } from '../../utils/colors'

export default function Sidebar({
  posts = [],
  folders = [],
  filterType = 'all',
  setFilterType,
  activeFolderId = 'all',
  setActiveFolderId,
  searchQuery = '',
  setSearchQuery,
  onOpenNewPost,
  onCreateNewStoryDoc,
  onOpenFolderModal,
  activeSpace,
  spaces = [],
  onSelectSpace,
}) {
  const [showNewMenu, setShowNewMenu] = useState(false)

  const tweetCount = posts.filter((p) => p.type === 'tweet').length
  const storyCount = posts.filter((p) => p.type === 'story').length
  const mediaCount = posts.filter((p) => Boolean(p.media_url)).length
  const favoriteCount = posts.filter((p) => Boolean(p.is_favorite)).length

  // Extract top tags from posts
  const topTags = useMemo(() => {
    const counts = {}
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          const clean = t.trim()
          if (clean) counts[clean] = (counts[clean] || 0) + 1
        })
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [posts])

  return (
    <aside className="gdrive-sidebar">
      {/* "+ New" Action Button */}
      <div className="gdrive-new-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          className="gdrive-new-btn"
          onClick={() => setShowNewMenu(!showNewMenu)}
          title="Archive a new tweet or thread"
        >
          <div className="gdrive-new-plus-icon">
            <Plus size={22} strokeWidth={2.5} />
          </div>
          <span>New</span>
          <ChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
        </button>

        {showNewMenu && (
          <div
            className="gdrive-new-popup-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% - 6px)',
              left: 0,
              width: '100%',
              zIndex: 120,
              background: 'var(--md-sys-color-surface-container-high, #282a2f)',
              border: '1px solid var(--md-sys-color-outline-variant, #444746)',
              borderRadius: '16px',
              padding: '6px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <button
              type="button"
              className="gdrive-new-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--md-sys-color-on-surface, #e3e3e3)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => {
                setShowNewMenu(false)
                onOpenNewPost()
              }}
            >
              <MessageSquare size={16} color="var(--md-sys-color-primary, #a8c7fa)" />
              <span>Archive Tweet</span>
            </button>

            <button
              type="button"
              className="gdrive-new-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--md-sys-color-on-surface, #e3e3e3)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => {
                setShowNewMenu(false)
                onCreateNewStoryDoc()
              }}
            >
              <BookOpen size={16} color="#81c995" />
              <span>New Thread</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Vault Space Badge */}
      <div
        className="gdrive-sidebar-space-pill"
        title={`Active Vault: ${activeSpace?.name || 'All Spaces'}`}
      >
        <span
          className="gdrive-sidebar-space-dot"
          style={{ backgroundColor: activeSpace?.color || '#a8c7fa' }}
        />
        <span className="gdrive-sidebar-space-name truncate" style={{ fontWeight: 600 }}>
          {activeSpace?.name || 'All Spaces'}
        </span>
        <span className="gdrive-nav-badge" style={{ marginLeft: 'auto', fontSize: '11px' }}>
          {posts.length} {posts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Main Views Navigation */}
      <button
        type="button"
        className={`gdrive-nav-item ${filterType === 'all' && activeFolderId === 'all' ? 'active' : ''}`}
        onClick={() => {
          setFilterType('all')
          setActiveFolderId('all')
          setSearchQuery?.('')
        }}
      >
        <div className="gdrive-nav-left">
          <div className="gdrive-nav-icon"><LayoutGrid size={17} /></div>
          <span>All Archived</span>
        </div>
        <span className="gdrive-nav-badge">{posts.length}</span>
      </button>

      <button
        type="button"
        className={`gdrive-nav-item ${filterType === 'tweet' ? 'active' : ''}`}
        onClick={() => {
          setFilterType('tweet')
          setActiveFolderId('all')
        }}
      >
        <div className="gdrive-nav-left">
          <div className="gdrive-nav-icon"><MessageSquare size={17} /></div>
          <span>Tweets</span>
        </div>
        <span className="gdrive-nav-badge">{tweetCount}</span>
      </button>

      <button
        type="button"
        className={`gdrive-nav-item ${filterType === 'story' ? 'active' : ''}`}
        onClick={() => {
          setFilterType('story')
          setActiveFolderId('all')
        }}
      >
        <div className="gdrive-nav-left">
          <div className="gdrive-nav-icon"><BookOpen size={17} /></div>
          <span>Threads</span>
        </div>
        <span className="gdrive-nav-badge">{storyCount}</span>
      </button>

      <button
        type="button"
        className={`gdrive-nav-item ${filterType === 'media' ? 'active' : ''}`}
        onClick={() => {
          setFilterType('media')
          setActiveFolderId('all')
        }}
      >
        <div className="gdrive-nav-left">
          <div className="gdrive-nav-icon"><ImageIcon size={17} /></div>
          <span>With Media</span>
        </div>
        <span className="gdrive-nav-badge">{mediaCount}</span>
      </button>

      <button
        type="button"
        className={`gdrive-nav-item ${filterType === 'favorite' ? 'active' : ''}`}
        onClick={() => {
          setFilterType('favorite')
          setActiveFolderId('all')
        }}
      >
        <div className="gdrive-nav-left">
          <div className="gdrive-nav-icon"><Bookmark size={17} /></div>
          <span>Starred</span>
        </div>
        <span className="gdrive-nav-badge">{favoriteCount}</span>
      </button>

      {/* Folders Section */}
      <div className="gdrive-section-header">
        <span>Folders</span>
        <button
          type="button"
          className="gdrive-section-add-btn"
          onClick={onOpenFolderModal}
          title="Add Folder"
        >
          <Plus size={14} />
        </button>
      </div>

      {folders.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`gdrive-nav-item ${activeFolderId === f.id.toString() ? 'active' : ''}`}
          onClick={() => {
            setActiveFolderId(f.id.toString())
            setFilterType('all')
          }}
        >
          <div className="gdrive-nav-left truncate">
            <div className="gdrive-nav-icon">
              <Folder size={17} color={sanitizeM3Color(f.color)} />
            </div>
            <span className="truncate">{f.name}</span>
          </div>
          <span className="gdrive-nav-badge">{f.posts_count || 0}</span>
        </button>
      ))}

      {/* Dynamic Tags Filter */}
      {topTags.length > 0 && (
        <>
          <div className="gdrive-section-header">
            <span>Tags</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 14px' }}>
            {topTags.map(([tag, count]) => {
              const isSelected = searchQuery === `#${tag}` || searchQuery === tag
              return (
                <button
                  key={tag}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-outline-variant, #333538)',
                    background: isSelected ? 'var(--md-sys-color-primary, #a8c7fa)' : 'rgba(255,255,255,0.04)',
                    color: isSelected ? '#042b59' : 'var(--md-sys-color-on-surface, #e3e3e3)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onClick={() => setSearchQuery?.(isSelected ? '' : `#${tag}`)}
                >
                  <Hash size={10} />
                  <span>{tag}</span>
                  <span style={{ opacity: 0.6 }}>{count}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Vault Summary Footer */}
      <div className="gdrive-sidebar-footer">
        <div className="gdrive-storage-text" style={{ fontWeight: 500, opacity: 0.8 }}>
          {posts.length} {posts.length === 1 ? 'tweet' : 'tweets'} saved locally
        </div>
      </div>
    </aside>
  )
}
