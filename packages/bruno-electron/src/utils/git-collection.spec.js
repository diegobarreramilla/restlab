const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const gitCollection = require('./git-collection');

// Real repositories in a temp folder: the point is to know the engine works with the git on this machine.
const fakeWindow = { webContents: { send: () => {} } };
const tmpDirs = [];

const makeTmpDir = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'git-collection-')));
  tmpDirs.push(dir);
  return dir;
};

const requestFile = (url, accept = '*/*') =>
  ['info:', '  name: list', '  type: http', '  seq: 1', '', 'http:', '  method: GET', `  url: ${url}`, '  headers:', '    - name: Accept', `      value: "${accept}"`, ''].join('\n');

const write = (dir, name, content) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
};

const runGit = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();

// Set in the repository itself: the commits made through the engine run in child processes that do not see
// changes to this process' environment, and the machine's own git identity must not leak into the assertions.
const configureIdentity = (dir, name = 'Ana') => {
  runGit(dir, 'config', 'user.name', name);
  runGit(dir, 'config', 'user.email', `${name.toLowerCase()}@example.com`);
  runGit(dir, 'config', 'commit.gpgsign', 'false');
};

/** A collection that is its own repository, with one committed request. */
const makeCommittedCollection = async () => {
  const collectionPath = makeTmpDir();
  write(collectionPath, 'opencollection.yml', 'opencollection: 1.0.0\n\ninfo:\n  name: probe\n');
  write(collectionPath, 'list.yml', requestFile('https://a.example.com'));
  await gitCollection.initRepository(collectionPath);
  configureIdentity(collectionPath);
  await gitCollection.stage(collectionPath, ['opencollection.yml', 'list.yml']);
  await gitCollection.commit(collectionPath, 'first');
  return collectionPath;
};

afterAll(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

describe('overview', () => {
  it('says a plain folder is not a repository', async () => {
    const overview = await gitCollection.getOverview(makeTmpDir());

    expect(overview).toEqual({ gitAvailable: true, isRepository: false });
  });

  it('describes a new repository before its first commit', async () => {
    const collectionPath = makeTmpDir();
    write(collectionPath, 'list.yml', requestFile('https://a.example.com'));

    await gitCollection.initRepository(collectionPath);
    const overview = await gitCollection.getOverview(collectionPath);

    expect(overview).toMatchObject({ isRepository: true, currentBranch: 'main', hasCommits: false, hasRemote: false, staged: [] });
    expect(overview.unstaged).toEqual([{ path: 'list.yml', status: 'new' }]);
  });

  it('refuses to initialize a folder that is already inside a repository', async () => {
    const collectionPath = await makeCommittedCollection();

    await expect(gitCollection.initRepository(collectionPath)).rejects.toThrow('already in a Git repository');
  });

  it('moves a file between the two lists as it is staged and unstaged', async () => {
    const collectionPath = await makeCommittedCollection();
    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));

    expect((await gitCollection.getOverview(collectionPath)).unstaged).toEqual([{ path: 'list.yml', status: 'modified' }]);

    await gitCollection.stage(collectionPath, ['list.yml']);
    const staged = await gitCollection.getOverview(collectionPath);
    expect(staged.staged).toEqual([{ path: 'list.yml', status: 'modified' }]);
    expect(staged.unstaged).toEqual([]);

    await gitCollection.unstage(collectionPath, ['list.yml']);
    expect((await gitCollection.getOverview(collectionPath)).staged).toEqual([]);
  });

  it('discards a change and removes a new file', async () => {
    const collectionPath = await makeCommittedCollection();
    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));
    write(collectionPath, 'extra.yml', requestFile('https://c.example.com'));

    await gitCollection.discard(collectionPath, ['list.yml', 'extra.yml']);

    expect(fs.readFileSync(path.join(collectionPath, 'list.yml'), 'utf8')).toContain('a.example.com');
    expect(fs.existsSync(path.join(collectionPath, 'extra.yml'))).toBe(false);
    expect((await gitCollection.getOverview(collectionPath)).unstaged).toEqual([]);
  });
});

describe('a collection inside a larger repository', () => {
  const makeNested = async () => {
    const root = makeTmpDir();
    const collectionPath = path.join(root, 'apis', 'billing');
    write(collectionPath, 'list.yml', requestFile('https://a.example.com'));
    write(root, 'README.md', 'hello\n');
    runGit(root, 'init', '-q', '-b', 'main');
    configureIdentity(root);
    runGit(root, 'add', '.');
    runGit(root, 'commit', '-q', '-m', 'first');
    return { root, collectionPath };
  };

  it('only lists changes that belong to the collection, and counts what is staged elsewhere', async () => {
    const { root, collectionPath } = await makeNested();
    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));
    write(root, 'README.md', 'changed\n');
    runGit(root, 'add', 'README.md');

    const overview = await gitCollection.getOverview(collectionPath);

    expect(overview.collectionPrefix).toBe('apis/billing');
    expect(overview.unstaged).toEqual([{ path: 'apis/billing/list.yml', status: 'modified' }]);
    expect(overview.staged).toEqual([]);
    expect(overview.stagedOutsideCollection).toBe(1);
  });

  it('refuses to touch a file outside the collection', async () => {
    const { collectionPath } = await makeNested();

    await expect(gitCollection.stage(collectionPath, ['README.md'])).rejects.toThrow('outside the collection');
    await expect(gitCollection.discard(collectionPath, ['apis/billing/../../README.md'])).rejects.toThrow('outside the collection');
    await expect(gitCollection.getBlame(collectionPath, '--help')).rejects.toThrow('not valid');
  });

  it('limits the history to commits that touched the collection', async () => {
    const { root, collectionPath } = await makeNested();
    write(root, 'README.md', 'changed\n');
    runGit(root, 'commit', '-q', '-am', 'docs only');

    const history = await gitCollection.getHistory(collectionPath);

    expect(history.map((entry) => entry.message)).toEqual(['first']);
  });
});

describe('commit', () => {
  it('requires a message and something staged', async () => {
    const collectionPath = await makeCommittedCollection();

    await expect(gitCollection.commit(collectionPath, '   ')).rejects.toThrow('message is required');
    await expect(gitCollection.commit(collectionPath, 'nothing')).rejects.toThrow('Nothing to commit');
  });

  it('records the change and empties the lists', async () => {
    const collectionPath = await makeCommittedCollection();
    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));
    await gitCollection.stage(collectionPath, ['list.yml']);

    const { hash } = await gitCollection.commit(collectionPath, 'point at b');

    expect(hash).toMatch(/^[0-9a-f]{7,40}$/);
    const overview = await gitCollection.getOverview(collectionPath);
    expect([overview.staged, overview.unstaged]).toEqual([[], []]);
    expect((await gitCollection.getHistory(collectionPath)).map((entry) => entry.message)).toEqual(['point at b', 'first']);
  });
});

describe('history, diff and blame', () => {
  const makeTwoCommits = async () => {
    const collectionPath = await makeCommittedCollection();
    write(collectionPath, 'list.yml', requestFile('https://a.example.com', 'application/json'));
    configureIdentity(collectionPath, 'Luis');
    await gitCollection.stage(collectionPath, ['list.yml']);
    await gitCollection.commit(collectionPath, 'json only');
    configureIdentity(collectionPath);
    const hash = runGit(collectionPath, 'rev-parse', 'HEAD').trim();
    return { collectionPath, hash };
  };

  it('lists the commits of one file with author and date', async () => {
    const { collectionPath } = await makeTwoCommits();

    const history = await gitCollection.getHistory(collectionPath, { filePath: 'list.yml' });

    expect(history.map((entry) => [entry.message, entry.author])).toEqual([['json only', 'Luis'], ['first', 'Ana']]);
    expect(Number.isNaN(Date.parse(history[0].date))).toBe(false);
  });

  it('returns an empty history for a repository without commits', async () => {
    const collectionPath = makeTmpDir();
    await gitCollection.initRepository(collectionPath);

    expect(await gitCollection.getHistory(collectionPath)).toEqual([]);
  });

  it('lists the files of a commit and shows the request before and after it', async () => {
    const { collectionPath, hash } = await makeTwoCommits();

    expect(await gitCollection.getCommitFiles(collectionPath, hash)).toEqual([{ path: 'list.yml', status: 'modified' }]);

    const diff = await gitCollection.getDiff(collectionPath, { filePath: 'list.yml', source: 'commit', commitHash: hash });
    expect(diff.oldParsed.request.headers[0].value).toBe('*/*');
    expect(diff.newParsed.request.headers[0].value).toBe('application/json');
  });

  it('shows a pending change against the last commit', async () => {
    const { collectionPath } = await makeTwoCommits();
    write(collectionPath, 'list.yml', requestFile('https://z.example.com', 'application/json'));

    const diff = await gitCollection.getDiff(collectionPath, { filePath: 'list.yml', source: 'unstaged' });

    expect(diff.oldParsed.request.url).toBe('https://a.example.com');
    expect(diff.newParsed.request.url).toBe('https://z.example.com');
  });

  it('rejects a commit or a source that is not valid', async () => {
    const { collectionPath } = await makeTwoCommits();

    await expect(gitCollection.getCommitFiles(collectionPath, 'HEAD; rm -rf')).rejects.toThrow('Commit is not valid');
    await expect(gitCollection.getDiff(collectionPath, { filePath: 'list.yml', source: 'other' })).rejects.toThrow('source is not valid');
  });

  it('says who last changed each field', async () => {
    const { collectionPath } = await makeTwoCommits();

    const { tracked, fields } = await gitCollection.getBlame(collectionPath, 'list.yml');
    const byField = Object.fromEntries(fields.map((field) => [field.field, field]));

    expect(tracked).toBe(true);
    expect(byField['http.url']).toMatchObject({ author: 'Ana', summary: 'first', uncommitted: false });
    expect(byField['http.headers[Accept]']).toMatchObject({ author: 'Luis', summary: 'json only' });
  });

  it('marks a field that was edited and not committed', async () => {
    const { collectionPath } = await makeTwoCommits();
    write(collectionPath, 'list.yml', requestFile('https://z.example.com', 'application/json'));

    const { fields } = await gitCollection.getBlame(collectionPath, 'list.yml');

    expect(fields.find((field) => field.field === 'http.url').uncommitted).toBe(true);
  });

  it('has no blame for a file git does not track yet', async () => {
    const { collectionPath } = await makeTwoCommits();
    write(collectionPath, 'new.yml', requestFile('https://n.example.com'));

    expect(await gitCollection.getBlame(collectionPath, 'new.yml')).toEqual({ tracked: false, fields: [] });
  });
});

describe('branches', () => {
  it('creates a branch, switches to it and back', async () => {
    const collectionPath = await makeCommittedCollection();

    await gitCollection.checkoutBranch(fakeWindow, collectionPath, { branchName: 'feature/login', create: true });
    const onFeature = await gitCollection.getOverview(collectionPath);
    expect(onFeature.currentBranch).toBe('feature/login');
    expect(onFeature.branches.sort()).toEqual(['feature/login', 'main']);

    await gitCollection.checkoutBranch(fakeWindow, collectionPath, { branchName: 'main' });
    expect((await gitCollection.getOverview(collectionPath)).currentBranch).toBe('main');
  });

  it.each([['--force'], ['a b'], ['a..b'], ['']])('rejects the branch name %p', async (branchName) => {
    const collectionPath = await makeCommittedCollection();

    await expect(gitCollection.checkoutBranch(fakeWindow, collectionPath, { branchName, create: true })).rejects.toThrow('Branch name is not valid');
  });
});

describe('stashes', () => {
  it('puts changes away, brings them back and drops the stash', async () => {
    const collectionPath = await makeCommittedCollection();
    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));

    await gitCollection.createStash(collectionPath, 'try b');
    expect((await gitCollection.getOverview(collectionPath)).unstaged).toEqual([]);
    const stashes = await gitCollection.listStashes(collectionPath);
    expect(stashes).toHaveLength(1);
    expect(stashes[0].message).toContain('try b');

    await gitCollection.applyStash(collectionPath, 0);
    expect((await gitCollection.getOverview(collectionPath)).unstaged).toEqual([{ path: 'list.yml', status: 'modified' }]);

    await gitCollection.dropStash(collectionPath, 0);
    expect(await gitCollection.listStashes(collectionPath)).toEqual([]);
  });

  it('rejects a stash that is not a position in the list', async () => {
    const collectionPath = await makeCommittedCollection();

    await expect(gitCollection.applyStash(collectionPath, '0; echo')).rejects.toThrow('Stash is not valid');
  });
});

describe('sync with a remote', () => {
  it('refuses when the repository has no remote', async () => {
    const collectionPath = await makeCommittedCollection();

    await expect(gitCollection.sync(fakeWindow, collectionPath, 'push')).rejects.toThrow('no remote');
    await expect(gitCollection.sync(fakeWindow, collectionPath, 'rebase')).rejects.toThrow('not valid');
  });

  it('pushes, counts what is ahead and behind, and pulls', async () => {
    const remote = makeTmpDir();
    runGit(remote, 'init', '-q', '--bare', '-b', 'main');
    const collectionPath = await makeCommittedCollection();
    runGit(collectionPath, 'remote', 'add', 'origin', remote);

    await gitCollection.sync(fakeWindow, collectionPath, 'push');
    expect(await gitCollection.getOverview(collectionPath)).toMatchObject({ hasRemote: true, remoteName: 'origin', ahead: 0, behind: 0 });

    write(collectionPath, 'list.yml', requestFile('https://b.example.com'));
    await gitCollection.stage(collectionPath, ['list.yml']);
    await gitCollection.commit(collectionPath, 'second');
    expect((await gitCollection.getOverview(collectionPath)).ahead).toBe(1);

    // Someone else pushes a commit from a second clone.
    const other = makeTmpDir();
    runGit(other, 'clone', '-q', remote, '.');
    configureIdentity(other, 'Luis');
    write(other, 'other.yml', requestFile('https://o.example.com'));
    runGit(other, 'add', '.');
    runGit(other, 'commit', '-q', '-m', 'from a teammate');
    runGit(other, 'push', '-q', 'origin', 'main');

    await gitCollection.sync(fakeWindow, collectionPath, 'fetch');
    expect(await gitCollection.getOverview(collectionPath)).toMatchObject({ ahead: 1, behind: 1 });

    await gitCollection.sync(fakeWindow, collectionPath, 'pull');
    expect(fs.existsSync(path.join(collectionPath, 'other.yml'))).toBe(true);
    expect((await gitCollection.getOverview(collectionPath)).behind).toBe(0);
  });
});
