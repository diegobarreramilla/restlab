const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');
const {
  BACKUP_RETENTION_DAYS,
  recordBackup,
  findBackup,
  deleteBackup,
  purgeExpiredBackups
} = require('./migration-backups');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('migration-backups', () => {
  let rootDir;

  const makeBackup = (name) => {
    const dir = path.join(rootDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ping.bru'), 'meta {}');
    return dir;
  };

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-backups-'));
  });

  afterEach(() => {
    fsExtra.removeSync(rootDir);
  });

  it('finds the newest backup of a collection again, with its expiry date', () => {
    const older = makeBackup('backup-old');
    const newer = makeBackup('backup-new');
    recordBackup(rootDir, { collectionPathname: '/c/demo', backupPath: older, now: 1000 });
    recordBackup(rootDir, { collectionPathname: '/c/demo', backupPath: newer, now: 5000 });
    recordBackup(rootDir, { collectionPathname: '/c/other', backupPath: makeBackup('backup-x'), now: 9000 });

    expect(findBackup(rootDir, '/c/demo')).toEqual({
      backupPath: newer,
      createdAt: 5000,
      expiresAt: 5000 + BACKUP_RETENTION_DAYS * DAY_MS,
      retentionDays: 30
    });
    expect(findBackup(rootDir, '/c/none')).toBeNull();
  });

  it('forgets a backup whose folder no longer exists', () => {
    const dir = makeBackup('backup-gone');
    recordBackup(rootDir, { collectionPathname: '/c/demo', backupPath: dir, now: 1 });
    fsExtra.removeSync(dir);

    expect(findBackup(rootDir, '/c/demo')).toBeNull();
  });

  it('deletes a backup folder and its index entry', async () => {
    const dir = makeBackup('backup-a');
    recordBackup(rootDir, { collectionPathname: '/c/demo', backupPath: dir, now: 1 });

    await deleteBackup(rootDir, dir);

    expect(fs.existsSync(dir)).toBe(false);
    expect(findBackup(rootDir, '/c/demo')).toBeNull();
  });

  it('refuses to delete anything that is not a backup folder under the root', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'not-a-backup-'));
    const nested = path.join(makeBackup('backup-a'), 'inner');
    fs.mkdirSync(nested);
    try {
      await expect(deleteBackup(rootDir, outside)).rejects.toThrow(/Not a migration backup/);
      await expect(deleteBackup(rootDir, rootDir)).rejects.toThrow(/Not a migration backup/);
      await expect(deleteBackup(rootDir, nested)).rejects.toThrow(/Not a migration backup/);
      await expect(deleteBackup(rootDir, path.join(rootDir, 'backup-a', '..', '..'))).rejects.toThrow();
      expect(fs.existsSync(outside)).toBe(true);
      expect(fs.existsSync(nested)).toBe(true);
    } finally {
      fsExtra.removeSync(outside);
    }
  });

  it('purges only backups older than the retention window', async () => {
    const now = 100 * DAY_MS;
    const expired = makeBackup('backup-expired');
    const fresh = makeBackup('backup-fresh');
    recordBackup(rootDir, { collectionPathname: '/c/a', backupPath: expired, now: now - 31 * DAY_MS });
    recordBackup(rootDir, { collectionPathname: '/c/b', backupPath: fresh, now: now - 29 * DAY_MS });

    const removed = await purgeExpiredBackups(rootDir, { now });

    expect(removed).toEqual([expired]);
    expect(fs.existsSync(expired)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
    expect(findBackup(rootDir, '/c/a')).toBeNull();
    expect(findBackup(rootDir, '/c/b')).not.toBeNull();
  });

  it('ages an unindexed backup folder by its modification time', async () => {
    const orphan = makeBackup('backup-orphan');
    const now = Date.now();
    const old = new Date(now - 40 * DAY_MS);
    fs.utimesSync(orphan, old, old);
    const recentOrphan = makeBackup('backup-recent');
    fs.writeFileSync(path.join(rootDir, 'unrelated.txt'), 'keep');

    const removed = await purgeExpiredBackups(rootDir, { now });

    expect(removed).toEqual([orphan]);
    expect(fs.existsSync(recentOrphan)).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'unrelated.txt'))).toBe(true);
  });

  it('does nothing when the root does not exist yet', async () => {
    await expect(purgeExpiredBackups(path.join(rootDir, 'missing'))).resolves.toEqual([]);
  });
});
