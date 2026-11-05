import React, { useState, useEffect } from 'react'
import { FolderInput, Loader2 } from 'lucide-react'
import Modal from '../shared/Modal'
import { getFolders } from '../../api/folders'

export default function BulkMoveModal({
  isOpen,
  onClose,
  selectedPostIds = [],
  activeSpace,
  isOperating = false,
  onConfirmBulkMove,
}) {
  const [targetFolderId, setTargetFolderId] = useState('')
  const [availableFolders, setAvailableFolders] = useState([])

  useEffect(() => {
    if (!isOpen) return
    setTargetFolderId('')
    const spaceParam =
      activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : undefined
    getFolders(spaceParam)
      .then((fData) => setAvailableFolders(fData || []))
      .catch(console.error)
  }, [isOpen, activeSpace])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedPostIds.length === 0) return
    const targetFolder = availableFolders.find(
      (f) => f.id === parseInt(targetFolderId)
    )
    onConfirmBulkMove({
      targetFolderId: targetFolderId ? parseInt(targetFolderId) : null,
      targetSpaceId: targetFolder?.space_id,
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isOperating && onClose()}
      title={`Move ${selectedPostIds.length} items`}
      icon={<FolderInput size={18} />}
      iconColor="var(--md-sys-color-primary, #a8c7fa)"
      dialogClassName="md3-dialog"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="m3-preview-card">
            <div className="m3-preview-card-label">Bulk Transfer</div>
            <div className="m3-preview-card-title">
              {selectedPostIds.length}{' '}
              {selectedPostIds.length === 1 ? 'item selected' : 'items selected'}
            </div>
            <div className="m3-preview-card-sub">
              Select a target folder to organize these tweets.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Folder</label>
            <select
              className="form-input"
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              disabled={isOperating}
            >
              <option value="">No folder (Root Vault)</option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isOperating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isOperating}
          >
            {isOperating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Moving items...</span>
              </>
            ) : (
              <span>Move {selectedPostIds.length} items</span>
            )}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
