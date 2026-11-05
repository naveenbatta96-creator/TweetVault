import { apiFetch } from './client'

export async function getVaultInfo() {
  return await apiFetch('/backup/info')
}

export async function flushVault() {
  return await apiFetch('/backup/flush', { method: 'POST' })
}

export async function openVaultFolder() {
  return await apiFetch('/backup/open-folder', { method: 'POST' })
}

export async function exportVaultFolder(destinationPath = '') {
  return await apiFetch('/backup/export-folder', {
    method: 'POST',
    body: { destination_path: destinationPath },
  })
}

export async function selectFolderDialog() {
  return await apiFetch('/backup/select-folder', { method: 'POST' })
}

export async function importVaultFolder(sourcePath) {
  return await apiFetch('/backup/import-folder', {
    method: 'POST',
    body: { source_path: sourcePath },
  })
}


