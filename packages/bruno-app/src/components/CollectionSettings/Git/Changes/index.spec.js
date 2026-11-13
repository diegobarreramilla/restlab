import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Changes from './index';

jest.mock('../FileDiff', () => ({ filePath, source }) => <div data-testid="git-file-diff">{`${source}:${filePath}`}</div>);

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

  it('offers to abort a merge that left conflicts', () => {
    const run = renderChanges({ conflicted: [{ path: 'list.yml', status: 'modified' }] });

    fireEvent.click(screen.getByTestId('git-abort-merge'));

    expect(run).toHaveBeenCalledWith('abort-merge');
  });
});
