/**
 * Git for one collection. Everything here takes the collection's folder and stays inside it: the repository
 * may hold other things, but changes, history and file operations are limited to the collection.
 */
const fs = require('fs');
const path = require('path');
const git = require('./git');
const { uuid } = require('./common');
const { parseRequest } = require('@usebruno/filestore');
const { parseBlamePorcelain, summarizeBlameByField } = require('./git-blame');

const FIELD_SEPARATOR = '\x1f';
const HISTORY_LIMIT = 200;

const toPosix = (value) => value.split(path.sep).join('/');

/** The repository that holds the collection, and where the collection sits inside it. */
const locate = (collectionPath) => {
  if (typeof collectionPath !== 'string' || !collectionPath) {
    throw new Error('Collection path is required');
  }
  const gitRootPath = git.getCollectionGitRootPath(collectionPath);
  if (!gitRootPath) {
    return null;
  }
  return { collectionPath, gitRootPath, prefix: toPosix(path.relative(gitRootPath, collectionPath)) };
};

const requireRepository = (collectionPath) => {
  const repository = locate(collectionPath);
  if (!repository) {
    throw new Error('This collection is not in a Git repository');
  }
  return repository;
};

const isInsideCollection = ({ prefix }, repositoryPath) =>
  prefix === '' || repositoryPath === prefix || repositoryPath.startsWith(`${prefix}/`);

/** The absolute path of a file given relative to the repository. Rejects anything outside the collection. */
const resolveFile = (repository, repositoryPath) => {
  if (typeof repositoryPath !== 'string' || !repositoryPath || repositoryPath.startsWith('-')) {
    throw new Error('File path is not valid');
  }
  const absolutePath = path.resolve(repository.gitRootPath, repositoryPath);
  const fromCollection = path.relative(repository.collectionPath, absolutePath);
  if (fromCollection.startsWith('..') || path.isAbsolute(fromCollection)) {
    throw new Error('File is outside the collection');
  }
  return absolutePath;
};

const repositoryPathOf = (repository, absolutePath) => toPosix(path.relative(repository.gitRootPath, absolutePath));

// A remote URL can carry a user name or a token (`https://user:token@host/...`). They never leave this process.
const withoutCredentials = (url) => url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]+@/i, '$1');

const describeChange = (file, list) => {
  const code = list === 'staged' ? file.fileIndex : file.working_dir;
  if (file.type === 'renamed') return 'renamed';
  if (code === '?' || code === 'A') return 'new';
  if (code === 'D') return 'deleted';
  return 'modified';
};

const toChange = (list) => (file) => ({ path: file.path, from: file.from, status: describeChange(file, list) });

const getOverview = async (collectionPath) => {
  const gitVersion = await git.getGitVersion();
  if (!gitVersion) {
    return { gitAvailable: false, isRepository: false };
  }

  const repository = locate(collectionPath);
  if (!repository) {
    return { gitAvailable: true, isRepository: false };
  }

  const { gitRootPath } = repository;
  const simpleGit = git.getSimpleGitInstanceForPath(gitRootPath);
  const [changed, branches, remotes] = await Promise.all([
    git.getChangedFilesInCollectionGit(gitRootPath, collectionPath),
    git.getCollectionGitBranches(gitRootPath),
    git.fetchRemotes(gitRootPath)
  ]);
  // A repository without commits has no branch yet for `branch --list`; HEAD still names the one it will be.
  const currentBranch = (await simpleGit.raw(['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();

  const inCollection = (file) => isInsideCollection(repository, file.path);
  // Every file git could not merge, whatever the reason (both changed it, one side deleted it, both added it).
  const unmerged = (await simpleGit.raw(['diff', '--name-only', '--diff-filter=U']).catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((file) => ({ path: file, type: 'conflicted' }));
  const hasRemote = remotes.length > 0;
  let ahead = 0;
  let behind = 0;
  if (hasRemote && branches.length) {
    const upstream = await simpleGit.raw(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).catch(() => '');
    if (upstream.trim()) {
      const counts = (await simpleGit.raw(['rev-list', '--left-right', '--count', 'HEAD...@{u}']).catch(() => '0\t0')).trim().split(/\s+/);
      ahead = Number(counts[0]) || 0;
      behind = Number(counts[1]) || 0;
    }
  }

  return {
    gitAvailable: true,
    isRepository: true,
    gitRootPath,
    collectionPrefix: repository.prefix,
    currentBranch,
    branches,
    hasCommits: branches.length > 0,
    hasRemote,
    remoteName: hasRemote ? remotes[0].name : null,
    remoteUrl: hasRemote ? withoutCredentials(remotes[0].refs?.fetch || remotes[0].refs?.push || '') : null,
    ahead,
    behind,
    tooManyFiles: Boolean(changed.tooManyFiles),
    staged: (changed.staged || []).filter(inCollection).map(toChange('staged')),
    unstaged: (changed.unstaged || []).filter(inCollection).map(toChange('unstaged')),
    conflicted: unmerged.filter(inCollection).map((file) => ({ path: file.path, status: 'conflicted' })),
    conflictedOutsideCollection: unmerged.filter((file) => !inCollection(file)).length,
    isMerging: fs.existsSync(path.join(gitRootPath, '.git', 'MERGE_HEAD')),
    // Staged elsewhere in the repository: a commit takes them too, so the user is told.
    stagedOutsideCollection: (changed.staged || []).filter((file) => !inCollection(file)).length
  };
};

const initRepository = async (collectionPath) => {
  if (locate(collectionPath)) {
    throw new Error('This collection is already in a Git repository');
  }
  await git.initGit(collectionPath);
};

const withFiles = (action) => async (collectionPath, files) => {
  const repository = requireRepository(collectionPath);
  if (!Array.isArray(files) || !files.length) {
    throw new Error('No files given');
  }
  return action(repository, files.map((file) => resolveFile(repository, file)));
};

const stage = withFiles((repository, absolutePaths) => git.stageChanges(repository.gitRootPath, absolutePaths));
const unstage = withFiles((repository, absolutePaths) => git.unstageChanges(repository.gitRootPath, absolutePaths));
const discard = withFiles((repository, absolutePaths) => git.discardChanges(repository.gitRootPath, absolutePaths));

const commit = async (collectionPath, message) => {
  const repository = requireRepository(collectionPath);
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    throw new Error('A commit message is required');
  }
  const result = await git.commitChanges(repository.gitRootPath, text);
  if (!result?.commit) {
    throw new Error('Nothing to commit: stage a change first');
  }
  return { hash: result.commit };
};

const BRANCH_NAME = /^(?!-)(?!.*\.\.)(?!.*[\s~^:?*[\\])[\w./-]+$/;

const checkoutBranch = async (win, collectionPath, { branchName, create = false }) => {
  const repository = requireRepository(collectionPath);
  if (typeof branchName !== 'string' || !BRANCH_NAME.test(branchName)) {
    throw new Error('Branch name is not valid');
  }
  await git.checkoutGitBranch(win, { gitRootPath: repository.gitRootPath, branchName, processUid: uuid(), shouldCreate: create });
};

// `HEAD -> main, origin/main, tag: v1` becomes the names a person would point at: branches and tags.
const parseRefs = (decoration) =>
  String(decoration || '')
    .split(',')
    .map((ref) => ref.trim().replace(/^HEAD -> /, '').replace(/^tag: /, ''))
    .filter((ref) => ref && ref !== 'HEAD' && !ref.endsWith('/HEAD'));

const parseHistory = (output) =>
  String(output || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, parents, message, author, date, decoration] = line.split(FIELD_SEPARATOR);
      return { hash, parents: parents ? parents.split(' ') : [], message, author, date, refs: parseRefs(decoration) };
    });

const HISTORY_FORMAT = ['%H', '%P', '%s', '%an', '%aI', '%D'].join(FIELD_SEPARATOR);

/**
 * Commits that touched the collection, or one file of it when `filePath` is given. Newest first.
 * `allBranches` includes every branch, which is what a graph needs; each commit carries its parents, rewritten
 * by git to the nearest commits that also touched the collection, so the lines of the graph stay connected.
 */
const getHistory = async (collectionPath, { filePath, allBranches = false } = {}) => {
  const repository = requireRepository(collectionPath);
  const args = ['log', `--format=${HISTORY_FORMAT}`, '-n', String(HISTORY_LIMIT)];
  if (filePath) {
    args.push('--follow', '--', repositoryPathOf(repository, resolveFile(repository, filePath)));
  } else {
    args.push('--parents', '--date-order');
    // Not `--all`: that also walks `refs/stash`, and changes put aside are not part of the history.
    if (allBranches) args.push('--branches', '--remotes', '--tags');
    // Limiting the log to a path makes git drop merges that ended up equal to one of their sides. A collection
    // that is the whole repository needs no limit, so its history keeps every merge; a collection inside a
    // larger repository keeps the merges that matter to it.
    if (repository.prefix) args.push('--full-history', '--simplify-merges', '--', repository.prefix);
  }
  // A repository without commits makes `git log` fail; that is an empty history, not an error.
  const output = await git.getSimpleGitInstanceForPath(repository.gitRootPath).raw(args).catch(() => '');
  return parseHistory(output);
};

const COMMIT_HASH = /^[0-9a-f]{7,40}$/;

const requireCommitHash = (commitHash) => {
  if (typeof commitHash !== 'string' || !COMMIT_HASH.test(commitHash)) {
    throw new Error('Commit is not valid');
  }
  return commitHash;
};

const getCommitFiles = async (collectionPath, commitHash) => {
  const repository = requireRepository(collectionPath);
  const files = await git.getCommitFiles(repository.gitRootPath, requireCommitHash(commitHash));
  return files.filter((file) => isInsideCollection(repository, file.path));
};

const CONFLICT_STAGES = { ours: 2, theirs: 3 };

// During a merge git keeps both versions of a conflicted file in the index: stage 2 is the current branch,
// stage 3 the one being merged. A side that deleted the file has no stage.
const readConflictStage = (repository, repositoryPath, side) =>
  git.getSimpleGitInstanceForPath(repository.gitRootPath).raw(['show', `:${CONFLICT_STAGES[side]}:${repositoryPath}`]).catch(() => null);

const parseRequestFile = (content, repositoryPath) => {
  const format = repositoryPath.endsWith('.bru') ? 'bru' : repositoryPath.endsWith('.yml') ? 'yml' : null;
  if (!content || !format) return null;
  try {
    return parseRequest(content, { format });
  } catch (error) {
    return null;
  }
};

/** Both versions of a conflicted file, "old" being yours and "new" theirs, in the shape of any other diff. */
const getConflictSides = async (repository, repositoryPath) => {
  const [oldContent, newContent] = await Promise.all([
    readConflictStage(repository, repositoryPath, 'ours'),
    readConflictStage(repository, repositoryPath, 'theirs')
  ]);
  return {
    oldContent,
    newContent,
    oldParsed: parseRequestFile(oldContent, repositoryPath),
    newParsed: parseRequestFile(newContent, repositoryPath)
  };
};

/**
 * Settles a conflicted file by keeping one side whole: `ours` is the current branch, `theirs` the one being
 * merged. When the chosen side had deleted the file, the file is removed.
 */
const resolveConflict = async (collectionPath, filePath, side) => {
  const repository = requireRepository(collectionPath);
  if (!CONFLICT_STAGES[side]) {
    throw new Error('Side is not valid');
  }
  const absolutePath = resolveFile(repository, filePath);
  const repositoryPath = repositoryPathOf(repository, absolutePath);
  const simpleGit = git.getSimpleGitInstanceForPath(repository.gitRootPath);
  const unmerged = (await simpleGit.raw(['diff', '--name-only', '--diff-filter=U'])).split('\n');
  if (!unmerged.includes(repositoryPath)) {
    throw new Error('This file is not in conflict');
  }

  const content = await readConflictStage(repository, repositoryPath, side);
  if (content === null) {
    await simpleGit.raw(['rm', '-q', '--', repositoryPath]);
    return;
  }
  await simpleGit.raw(['checkout', `--${side}`, '--', repositoryPath]);
  await simpleGit.raw(['add', '--', repositoryPath]);
};

/** Closes a merge once nothing is left in conflict, with the message git prepared for it. */
const finishMerge = async (collectionPath) => {
  const repository = requireRepository(collectionPath);
  const overview = await getOverview(collectionPath);
  if (!overview.isMerging) {
    throw new Error('There is no merge in progress');
  }
  if (overview.conflicted.length || overview.conflictedOutsideCollection) {
    throw new Error('Some files are still in conflict');
  }
  await git.getSimpleGitInstanceForPath(repository.gitRootPath).raw(['commit', '--no-edit']);
};

// What git accepts as a repository address: a URL, the `user@host:path` form, or a folder. A leading dash would
// be read as an option.
const REMOTE_URL = /^(?!-)(?:[a-z][a-z0-9+.-]*:\/\/\S+|[\w.-]+@[\w.-]+:\S+|\/\S.*|[A-Za-z]:[\\/].*)$/;

/** Connects the repository to a remote, or points the existing one somewhere else. Nothing is sent or fetched. */
const setRemote = async (collectionPath, remoteUrl) => {
  const repository = requireRepository(collectionPath);
  const url = typeof remoteUrl === 'string' ? remoteUrl.trim() : '';
  if (!REMOTE_URL.test(url)) {
    throw new Error('Repository address is not valid');
  }
  const { gitRootPath } = repository;
  const remotes = await git.fetchRemotes(gitRootPath);
  // Run directly rather than through the engine's `addRemote`, which writes the address to the log: an address
  // can carry a token.
  const args = remotes.length ? ['remote', 'set-url', remotes[0].name, url] : ['remote', 'add', 'origin', url];
  await git.getSimpleGitInstanceForPath(gitRootPath).raw(args);
};

const removeRemote = async (collectionPath) => {
  const { gitRootPath } = requireRepository(collectionPath);
  const remotes = await git.fetchRemotes(gitRootPath);
  if (!remotes.length) {
    throw new Error('This repository has no remote');
  }
  await git.getSimpleGitInstanceForPath(gitRootPath).raw(['remote', 'remove', remotes[0].name]);
};

/** Before and after of one file: a pending change (`staged` / `unstaged`) or what a commit did to it. */
const getDiff = async (collectionPath, { filePath, source, commitHash }) => {
  const repository = requireRepository(collectionPath);
  const repositoryPath = repositoryPathOf(repository, resolveFile(repository, filePath));
  if (source === 'commit') {
    return git.getFileContentForVisualDiff(repository.gitRootPath, requireCommitHash(commitHash), repositoryPath);
  }
  if (source === 'conflict') {
    return getConflictSides(repository, repositoryPath);
  }
  if (source !== 'staged' && source !== 'unstaged') {
    throw new Error('Diff source is not valid');
  }
  return git.getWorkingFileContentForVisualDiff(repository.gitRootPath, repositoryPath, source);
};

/** Who last changed each field of a request file. A file Git does not track yet has no history to show. */
const getBlame = async (collectionPath, filePath) => {
  const repository = requireRepository(collectionPath);
  const repositoryPath = repositoryPathOf(repository, resolveFile(repository, filePath));
  const simpleGit = git.getSimpleGitInstanceForPath(repository.gitRootPath);
  try {
    const output = await simpleGit.raw(['blame', '--line-porcelain', '--', repositoryPath]);
    const newestFirstHashes = (await simpleGit.raw(['rev-list', 'HEAD', '--', repositoryPath])).split('\n').filter(Boolean);
    return { tracked: true, fields: summarizeBlameByField(parseBlamePorcelain(output), repositoryPath, newestFirstHashes) };
  } catch (error) {
    return { tracked: false, fields: [] };
  }
};

const SYNC_ACTIONS = ['fetch', 'pull', 'push'];

const sync = async (win, collectionPath, action) => {
  const repository = requireRepository(collectionPath);
  if (!SYNC_ACTIONS.includes(action)) {
    throw new Error('Sync action is not valid');
  }
  const overview = await getOverview(collectionPath);
  if (!overview.hasRemote) {
    throw new Error('This repository has no remote');
  }
  const { gitRootPath } = repository;
  const remote = overview.remoteName;
  if (action === 'fetch') {
    return git.fetchChanges(gitRootPath, remote);
  }
  const options = { gitRootPath, processUid: uuid(), remote, remoteBranch: overview.currentBranch };
  if (action === 'pull') {
    return git.pullGitChanges(win, { ...options, strategy: '--no-rebase' });
  }
  return git.pushGitChanges(win, options);
};

const abortMerge = async (collectionPath) => git.abortConflictResolution(requireRepository(collectionPath).gitRootPath);

const requireStashIndex = (index) => {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Stash is not valid');
  }
  return index;
};

const listStashes = async (collectionPath) => git.listStashes(requireRepository(collectionPath).gitRootPath);

const createStash = async (collectionPath, message) => {
  const text = typeof message === 'string' && message.trim() ? message.trim() : 'Work in progress';
  return git.createStash(requireRepository(collectionPath).gitRootPath, text);
};

const applyStash = async (collectionPath, index) => git.applyStash(requireRepository(collectionPath).gitRootPath, requireStashIndex(index));
const dropStash = async (collectionPath, index) => git.dropStash(requireRepository(collectionPath).gitRootPath, requireStashIndex(index));

module.exports = {
  getOverview,
  initRepository,
  stage,
  unstage,
  discard,
  commit,
  checkoutBranch,
  getHistory,
  getCommitFiles,
  getDiff,
  getBlame,
  sync,
  abortMerge,
  resolveConflict,
  finishMerge,
  setRemote,
  removeRemote,
  listStashes,
  createStash,
  applyStash,
  dropStash
};
