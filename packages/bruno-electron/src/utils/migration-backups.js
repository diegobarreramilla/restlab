const fs = require('node:fs');
const path = require('node:path');
const fsExtra = require('fs-extra');

// Backups of the .bru sources kept after a committed BRU -> YML migration.
// They live under one root folder with an `index.json` that remembers which collection each
// copy belongs to and when it was made, so the UI can find it again after a restart and the
// app can delete it once it is old enough. Everything here is local disk only.

const BACKUP_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_DIR_PREFIX = 'backup-';
const INDEX_FILE = 'index.json';

const indexPath = (rootDir) => path.join(rootDir, INDEX_FILE);

const readIndex = (rootDir) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath(rootDir), 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.backupPath === 'string') : [];
  } catch (_) {
    return [];
  }
};

// Write to a temp file and rename so a crash never leaves a half-written index.
const writeIndex = (rootDir, entries) => {
  fsExtra.ensureDirSync(rootDir);
  const tempPath = `${indexPath(rootDir)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(entries, null, 2));
  fs.renameSync(tempPath, indexPath(rootDir));
};

// Only direct children named `backup-*` of the root count as backups: this is what stops a
// renderer-supplied path from deleting anything else on disk.
const isBackupDirOf = (rootDir, candidate) => {
  if (typeof candidate !== 'string' || !candidate) return false;
  const resolved = path.resolve(candidate);
  return path.dirname(resolved) === path.resolve(rootDir) && path.basename(resolved).startsWith(BACKUP_DIR_PREFIX);
};

const describeEntry = (entry) => ({
  backupPath: entry.backupPath,
  createdAt: entry.createdAt,
  expiresAt: entry.createdAt + BACKUP_RETENTION_DAYS * DAY_MS,
  retentionDays: BACKUP_RETENTION_DAYS
});

const recordBackup = (rootDir, { collectionPathname, backupPath, now = Date.now() }) => {
  if (!isBackupDirOf(rootDir, backupPath)) return;
  const entries = readIndex(rootDir).filter((entry) => entry.backupPath !== backupPath);
  entries.push({ collectionPathname, backupPath, createdAt: now });
  writeIndex(rootDir, entries);
};

// Newest existing backup for this collection, or null.
const findBackup = (rootDir, collectionPathname) => {
  const matches = readIndex(rootDir)
    .filter((entry) => entry.collectionPathname === collectionPathname && fs.existsSync(entry.backupPath))
    .sort((a, b) => b.createdAt - a.createdAt);
  return matches.length ? describeEntry(matches[0]) : null;
};

const deleteBackup = async (rootDir, backupPath) => {
  if (!isBackupDirOf(rootDir, backupPath)) {
    throw new Error('Not a migration backup folder');
  }
  await fsExtra.remove(backupPath);
  writeIndex(rootDir, readIndex(rootDir).filter((entry) => entry.backupPath !== backupPath));
};

// Deletes backups older than the retention window. Folders with no index entry (for example
// made by an earlier build) are aged by their modification time instead.
const purgeExpiredBackups = async (rootDir, { now = Date.now() } = {}) => {
  if (!fs.existsSync(rootDir)) return [];
  const maxAgeMs = BACKUP_RETENTION_DAYS * DAY_MS;
  const entries = readIndex(rootDir);
  const known = new Set(entries.map((entry) => entry.backupPath));
  const removed = [];
  const kept = [];

  for (const entry of entries) {
    if (!fs.existsSync(entry.backupPath)) continue; // deleted by hand: drop the stale entry
    if (now - entry.createdAt >= maxAgeMs && isBackupDirOf(rootDir, entry.backupPath)) {
      await fsExtra.remove(entry.backupPath);
      removed.push(entry.backupPath);
    } else {
      kept.push(entry);
    }
  }

  for (const dirent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || !dirent.name.startsWith(BACKUP_DIR_PREFIX)) continue;
    const dirPath = path.join(rootDir, dirent.name);
    if (known.has(dirPath)) continue;
    if (now - fs.statSync(dirPath).mtimeMs >= maxAgeMs) {
      await fsExtra.remove(dirPath);
      removed.push(dirPath);
    }
  }

  if (removed.length || kept.length !== entries.length) writeIndex(rootDir, kept);
  return removed;
};

module.exports = {
  BACKUP_RETENTION_DAYS,
  recordBackup,
  findBackup,
  deleteBackup,
  purgeExpiredBackups
};
