import React, { useState, useRef, useEffect } from 'react'
import {
  Search,
  X,
  SlidersHorizontal,
  HelpCircle,
  Settings,
  ChevronDown,
  Check,
  Layers,
} from 'lucide-react'

export default function TopHeader({
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  spaces = [],
  activeSpace,
  onSelectSpace,
}) {
  const [showSpaceMenu, setShowSpaceMenu] = useState(false)
  const switcherRef = useRef(null)

  const userName = localStorage.getItem('tweetvault_user_name') || 'Naveen'
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'N'

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowSpaceMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="gdrive-top-header">
      <div className="gdrive-brand">
        <div className="gdrive-logo-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 9l8 7 8-7-8-7z" fill="#4285f4" />
            <path d="M4 9v6l8 7V16L4 9z" fill="#34a853" />
            <path d="M20 9l-8 7v6l8-7V9z" fill="#fbbc05" />
          </svg>
        </div>
        <span className="gdrive-brand-text">TweetVault</span>

        {/* Space / Vault Switcher */}
        {spaces.length > 0 && (
          <div ref={switcherRef} className="gdrive-space-switcher-wrapper">
            <button
              type="button"
              className="gdrive-space-switcher-btn"
              onClick={() => setShowSpaceMenu((prev) => !prev)}
              title="Switch Vault Space"
            >
              <span
                className="gdrive-space-pill-dot"
                style={{ backgroundColor: activeSpace?.color || '#a8c7fa' }}
              />
              <span className="gdrive-space-current-name">
                {activeSpace?.name || 'All Spaces'}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
            </button>

            {showSpaceMenu && (
              <div className="gdrive-space-dropdown-menu">
                <div className="gdrive-space-dropdown-header">Vault Spaces</div>
                <button
                  type="button"
                  className={`gdrive-space-dropdown-item ${activeSpace?.id === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    onSelectSpace?.({
                      id: 'all',
                      name: 'All Spaces',
                      description: 'Unified vault across all spaces',
                      color: '#a8c7fa',
                    })
                    setShowSpaceMenu(false)
                  }}
                >
                  <Layers size={15} color="#a8c7fa" />
                  <div className="gdrive-space-item-text">
                    <span className="gdrive-space-item-title">All Spaces (Unified)</span>
                    <span className="gdrive-space-item-desc">All archived tweets & folders</span>
                  </div>
                  {activeSpace?.id === 'all' && (
                    <Check size={14} className="gdrive-space-check" />
                  )}
                </button>

                <div className="gdrive-space-dropdown-divider" />

                {spaces.map((sp) => {
                  const isSelected = activeSpace?.id === sp.id
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      className={`gdrive-space-dropdown-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        onSelectSpace?.(sp)
                        setShowSpaceMenu(false)
                      }}
                    >
                      <span
                        className="gdrive-space-item-dot"
                        style={{ backgroundColor: sp.color || '#3b82f6' }}
                      />
                      <div className="gdrive-space-item-text">
                        <span className="gdrive-space-item-title">{sp.name}</span>
                        <span className="gdrive-space-item-desc">
                          {sp.posts_count || 0} tweets • {sp.folders_count || 0} folders
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="gdrive-space-check" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centered Search Bar */}
      <div className="gdrive-search-wrapper">
        <div className="gdrive-search-bar">
          <Search size={18} className="gdrive-search-icon" />
          <input
            type="text"
            className="gdrive-search-input"
            placeholder="Search tweets, authors, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="gdrive-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            className="gdrive-search-btn"
            title="Search options"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="gdrive-header-right">
        <button type="button" className="gdrive-icon-btn" title="Help & shortcuts">
          <HelpCircle size={18} />
        </button>
        <button
          type="button"
          className="gdrive-icon-btn"
          title="Settings (Ctrl+,)"
          onClick={onOpenSettings}
        >
          <Settings size={18} />
        </button>
        <div className="gdrive-user-avatar" title={`${userName} (User)`}>
          {userInitial}
        </div>
      </div>
    </header>
  )
}
