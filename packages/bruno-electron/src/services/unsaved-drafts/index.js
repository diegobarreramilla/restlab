const fs = require('fs');
const path = require('path');

/**
 * Keeps the unsaved changes of requests on disk, outside the collection, so they survive the app closing
 * unexpectedly. The renderer sends the full set every time it changes; an empty set removes the file.
 */

const FILE_NAME = 'unsaved-drafts.json';
// A set larger than this is not kept: recovering edits must never make the app slow to type in.
const MAX_BYTES = 20 * 1024 * 1024;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Keeps only entries of the expected shape: an absolute request path mapped to its saved and edited versions. */
const sanitizeDrafts = (drafts) => {
  if (!isPlainObject(drafts)) return {};
  const clean = {};
  for (const [pathname, entry] of Object.entries(drafts)) {
    if (!path.isAbsolute(pathname) || !isPlainObject(entry) || !isPlainObject(entry.draft) || !isPlainObject(entry.base)) continue;
    clean[pathname] = { base: entry.base, draft: entry.draft };
  }
  return clean;
};

const createUnsavedDraftsStore = (directory) => {
  const filePath = path.join(directory, FILE_NAME);

  const read = () => {
    try {
      return sanitizeDrafts(JSON.parse(fs.readFileSync(filePath, 'utf8')).drafts);
    } catch (error) {
      return {};
    }
  };

  const write = (drafts) => {
    const clean = sanitizeDrafts(drafts);
    if (Object.keys(clean).length === 0) {
      fs.rmSync(filePath, { force: true });
      return;
    }
    const content = JSON.stringify({ drafts: clean });
    if (Buffer.byteLength(content) > MAX_BYTES) return;

    // Written beside the file and renamed over it, so a crash mid-write cannot leave half a file.
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, content);
    fs.renameSync(temporaryPath, filePath);
  };

  return { read, write };
};

module.exports = { createUnsavedDraftsStore, sanitizeDrafts };
