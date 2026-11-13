import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Git from './index';

const mockRepository = jest.fn();
jest.mock('hooks/useGitRepository', () => () => mockRepository());
jest.mock('./Changes', () => () => <div data-testid="git-changes" />);
jest.mock('./History', () => () => <div />);
jest.mock('./Blame', () => () => <div />);
jest.mock('./Stashes', () => () => <div />);

const overview = (overrides = {}) => ({
  gitAvailable: true,
  isRepository: true,
  currentBranch: 'main',
  branches: ['main'],
  hasRemote: false,
  remoteUrl: null,
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  conflicted: [],
  ...overrides
});

const renderGit = (overviewValue) => {
  const run = jest.fn().mockResolvedValue({ ok: true });
  mockRepository.mockReturnValue({ overview: overviewValue, run, refresh: jest.fn(), invoke: jest.fn(), version: 1 });
  render(
    <ThemeProvider theme={themes.light}>
      <Git collection={{ pathname: '/repo', items: [] }} />
    </ThemeProvider>
  );
  return run;
};

describe('Git panel', () => {
  it('explains what is missing when git is not installed', () => {
    renderGit({ gitAvailable: false, isRepository: false });

    expect(screen.getByTestId('git-not-installed')).toBeInTheDocument();
  });

  it('offers to start tracking a collection that is not a repository', () => {
    const run = renderGit({ gitAvailable: true, isRepository: false });

    fireEvent.click(screen.getByTestId('git-init'));

    expect(run).toHaveBeenCalledWith('init');
  });

  it('says the repository is only local and connects it to a remote', async () => {
    const run = renderGit(overview());

    expect(screen.getByTestId('git-connection')).toHaveTextContent('Only on this computer');
    expect(screen.queryByTestId('git-push')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('git-connect'));
    fireEvent.change(screen.getByTestId('git-remote-address'), { target: { value: 'https://github.com/acme/billing-api.git' } });
    fireEvent.click(screen.getByTestId('git-remote-save'));

    await waitFor(() => expect(run).toHaveBeenCalledWith('set-remote', { remoteUrl: 'https://github.com/acme/billing-api.git' }));
    await waitFor(() => expect(screen.queryByTestId('git-remote-form')).not.toBeInTheDocument());
  });

  it('names the connected project and shows what is ahead and behind', () => {
    renderGit(overview({ hasRemote: true, remoteUrl: 'git@gitlab.com:acme/billing-api.git', ahead: 2, behind: 1 }));

    expect(screen.getByTestId('git-connection')).toHaveTextContent('acme/billing-api');
    expect(screen.getByTestId('git-connection')).toHaveTextContent('on GitLab');
    expect(screen.getByTestId('git-push')).toHaveTextContent('Push 2');
    expect(screen.getByTestId('git-pull')).toHaveTextContent('Pull 1');
  });

  it('leaves the remote alone when the address was not changed, and can disconnect it', async () => {
    const run = renderGit(overview({ hasRemote: true, remoteUrl: 'https://github.com/acme/billing-api.git' }));

    fireEvent.click(screen.getByTestId('git-connection'));
    expect(screen.getByTestId('git-remote-address')).toHaveValue('https://github.com/acme/billing-api.git');
    fireEvent.click(screen.getByTestId('git-remote-save'));
    expect(run).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('git-connection'));
    fireEvent.click(screen.getByTestId('git-remote-disconnect'));
    await waitFor(() => expect(run).toHaveBeenCalledWith('remove-remote'));
  });

  it('counts pending work, conflicts included, on the Changes tab', () => {
    renderGit(overview({ unstaged: [{ path: 'a.yml' }], conflicted: [{ path: 'b.yml' }] }));

    expect(screen.getByTestId('git-view-changes')).toHaveTextContent('Changes · 2');
  });
});
