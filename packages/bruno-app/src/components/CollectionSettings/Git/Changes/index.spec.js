import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Changes from './index';

jest.mock('../FileDiff', () => ({ filePath, source }) => <div data-testid="git-file-diff">{`${source}:${filePath}`}</div>);
jest.mock('../ConflictMixer', () => ({ filePath }) => <div data-testid="git-conflict-mixer">{filePath}</div>);

const TOKEN = 'ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';

const collection = (headers = []) => ({
  uid: 'col-1',
  pathname: '/repo',
  environments: [],
  root: {},
  items: [{ uid: 'r1', type: 'http-request', name: 'List users', pathname: '/repo/list.yml', request: { url: 'https://a', headers, params: [], auth: { mode: 'none' } } }]
});

const overview = (overrides = {}) => ({
  gitRootPath: '/repo/',
  collectionPrefix: '',
  staged: [],
  unstaged: [],
  conflicted: [],
  stagedOutsideCollection: 0,
  conflictedOutsideCollection: 0,
  isMerging: false,
  tooManyFiles: false,
  ...overrides
});

const renderChanges = (overviewOverrides, headers) => {
  const run = jest.fn().mockResolvedValue({ ok: true });
  render(
    <ThemeProvider theme={themes.light}>
      <Changes collection={collection(headers)} git={{ overview: overview(overviewOverrides), run, invoke: jest.fn(), version: 1 }} />
    </ThemeProvider>
  );
  return run;
};

describe('Git changes', () => {
  it('says so when there is nothing to commit', () => {
    renderChanges();

    expect(screen.getByTestId('git-no-changes')).toBeInTheDocument();
    expect(screen.queryByTestId('git-commit')).not.toBeInTheDocument();
  });

  it('lists a changed request by its name and stages it', () => {
    const run = renderChanges({ unstaged: [{ path: 'list.yml', status: 'modified' }] });

    expect(screen.getByTestId('git-file-row')).toHaveTextContent('List users');
    fireEvent.click(screen.getByTestId('git-stage'));

    expect(run).toHaveBeenCalledWith('stage', { files: ['list.yml'] });
  });

  it('asks twice before discarding a change', () => {
    const run = renderChanges({ unstaged: [{ path: 'list.yml', status: 'modified' }] });

    fireEvent.click(screen.getByTestId('git-discard'));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByTestId('git-discard')).toHaveTextContent('Discard for good?');

    fireEvent.click(screen.getByTestId('git-discard'));
    expect(run).toHaveBeenCalledWith('discard', { files: ['list.yml'] });
  });

  it('shows the change of the selected file', () => {
    renderChanges({ unstaged: [{ path: 'list.yml', status: 'modified' }] });

    fireEvent.click(screen.getByTestId('git-file-row'));

    expect(screen.getByTestId('git-file-diff')).toHaveTextContent('unstaged:list.yml');
  });

  it('commits only with a message, and clears it afterwards', async () => {
    const run = renderChanges({ staged: [{ path: 'list.yml', status: 'modified' }] });

    expect(screen.getByTestId('git-commit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('git-commit-message'), { target: { value: 'point at b' } });
    fireEvent.click(screen.getByTestId('git-commit'));

    await waitFor(() => expect(run).toHaveBeenCalledWith('commit', { message: 'point at b' }));
    await waitFor(() => expect(screen.getByTestId('git-commit-message')).toHaveValue(''));
  });

  it('warns about plain-text secrets and about files staged outside the collection before a commit', () => {
    renderChanges(
      { staged: [{ path: 'list.yml', status: 'modified' }], stagedOutsideCollection: 2 },
      [{ name: 'X-Trace', value: TOKEN, enabled: true }]
    );

    expect(screen.getByTestId('git-commit-secrets')).toHaveTextContent('1 value looks like a secret');
    expect(screen.getByTestId('git-staged-outside')).toHaveTextContent('2 files staged elsewhere');
  });

  it('says what the commit will save and what stays out of it', () => {
    renderChanges({
      staged: [{ path: 'list.yml', status: 'modified' }, { path: 'opencollection.yml', status: 'modified' }],
      unstaged: [{ path: 'other.yml', status: 'new' }]
    });

    const summary = screen.getByTestId('git-commit-summary');
    expect(summary).toHaveTextContent('This commit will save 2 files: List users, opencollection.yml.');
    expect(summary).toHaveTextContent('1 other change is not staged and will stay out of it.');
  });

  it('shortens a long list of files in the summary', () => {
    const staged = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => ({ path: `${name}.yml`, status: 'new' }));
    renderChanges({ staged });

    expect(screen.getByTestId('git-commit-summary')).toHaveTextContent('a.yml, b.yml, c.yml, d.yml, e.yml and 2 more.');
  });

  describe('during a merge', () => {
    const conflict = { conflicted: [{ path: 'list.yml', status: 'conflicted' }], isMerging: true };

    it('lists the file in conflict and keeps one side on request', () => {
      const run = renderChanges(conflict);

      expect(screen.getByTestId('git-conflicts')).toHaveTextContent('Choose which version to keep');
      expect(screen.getByTestId('git-conflicted-list')).toHaveTextContent('List users');

      fireEvent.click(screen.getByTestId('git-keep-mine'));
      expect(run).toHaveBeenCalledWith('resolve-conflict', { filePath: 'list.yml', side: 'ours' });

      fireEvent.click(screen.getByTestId('git-take-theirs'));
      expect(run).toHaveBeenCalledWith('resolve-conflict', { filePath: 'list.yml', side: 'theirs' });
    });

    it('compares both versions of the selected file', () => {
      renderChanges(conflict);

      fireEvent.click(screen.getByTestId('git-file-row'));

      expect(screen.getByTestId('git-file-diff')).toHaveTextContent('conflict:list.yml');
      expect(screen.getByTestId('git-conflict-mixer')).toHaveTextContent('list.yml');
    });

    it('cannot finish while something is in conflict, and can abort', () => {
      const run = renderChanges(conflict);

      expect(screen.queryByTestId('git-finish-merge')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('git-abort-merge'));

      expect(run).toHaveBeenCalledWith('abort-merge');
    });

    it('offers to finish once everything is settled, instead of a normal commit', () => {
      const run = renderChanges({ isMerging: true, staged: [{ path: 'list.yml', status: 'modified' }] });

      expect(screen.getByTestId('git-conflicts')).toHaveTextContent('Every conflict is settled');
      expect(screen.queryByTestId('git-commit')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('git-finish-merge'));

      expect(run).toHaveBeenCalledWith('finish-merge');
    });

    it('waits for conflicts elsewhere in the repository', () => {
      renderChanges({ isMerging: true, conflictedOutsideCollection: 2 });

      expect(screen.getByTestId('git-conflicts')).toHaveTextContent('2 files elsewhere in the repository still are');
      expect(screen.queryByTestId('git-finish-merge')).not.toBeInTheDocument();
    });
  });
});
