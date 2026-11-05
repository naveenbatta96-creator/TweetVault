import { apiFetch } from './client'

export async function migrateLocalSocialArchive(archivePath) {
  return await apiFetch('/migrate/localsocialarchive', {
    method: 'POST',
    body: { archive_path: archivePath },
  })
}

