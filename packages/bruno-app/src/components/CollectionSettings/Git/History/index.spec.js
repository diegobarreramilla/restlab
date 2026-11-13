import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import History from './index';

const mockQuery = jest.fn();
jest.mock('hooks/useGitQuery', () => (query) => mockQuery(query));
jest.mock('../FileDiff', () => () => <div data-testid="git-file-diff" />);

const commit = (hash, message, parents, refs = []) => ({ hash: hash.repeat(40), message, author: 'Ana', date: '2026-11-10T10:00:00Z', parents: parents.map((p) => p.repeat(40)), refs });

// m merges f into x; both come from a.
const COMMITS = [commit('d', 'merge feature', ['c', 'b'], ['main']), commit('c', 'on main', ['a']), commit('b', 'on feature', ['a'], ['feature']), commit('a', 'first', [])];

const renderHistory = () => {
  mockQuery.mockImplementation(({ action }) => (action === 'history' ? { data: COMMITS, loading: false } : { data: [], loading: false }));
  render(
    <ThemeProvider theme={themes.light}>
      <History collection={{ items: [] }} git={{ invoke: jest.fn(), version: 1, overview: { gitRootPath: '/repo/', collectionPrefix: '' } }} />
    </ThemeProvider>
  );
};

describe('Git history', () => {
  beforeEach(() => mockQuery.mockReset());

  it('starts as a list of the current branch, without a graph', () => {
    renderHistory();

    expect(screen.getAllByTestId('git-commit-row')).toHaveLength(4);
    expect(screen.queryByTestId('git-graph-node')).not.toBeInTheDocument();
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ action: 'history', payload: { allBranches: false } }));
  });

  it('draws one node per commit in graph mode and asks for every branch', () => {
    renderHistory();

    fireEvent.click(screen.getByTestId('git-history-mode-graph'));

    expect(screen.getAllByTestId('git-graph-node')).toHaveLength(4);
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ action: 'history', payload: { allBranches: true } }));
    expect(screen.getAllByTestId('git-commit-ref').map((ref) => ref.textContent)).toEqual(['main', 'feature']);
  });

  it('shows the message, author and date of a commit while its node is hovered', () => {
    renderHistory();
    fireEvent.click(screen.getByTestId('git-history-mode-graph'));
    const [, , featureNode] = screen.getAllByTestId('git-graph-node');

    fireEvent.mouseEnter(featureNode);
    const tooltip = screen.getByTestId('git-commit-tooltip');
    expect(tooltip).toHaveTextContent('on feature');
    expect(tooltip).toHaveTextContent('Ana');
    expect(tooltip).toHaveTextContent('2026');
    expect(tooltip).toHaveTextContent('bbbbbbb · feature');

    fireEvent.mouseLeave(featureNode);
    expect(screen.queryByTestId('git-commit-tooltip')).not.toBeInTheDocument();
  });

  it('marks a merge in its tooltip', () => {
    renderHistory();
    fireEvent.click(screen.getByTestId('git-history-mode-graph'));

    fireEvent.mouseEnter(screen.getAllByTestId('git-graph-node')[0]);

    expect(screen.getByTestId('git-commit-tooltip')).toHaveTextContent('merge');
  });

  it('opens the files of a commit when its row is clicked', () => {
    renderHistory();

    fireEvent.click(screen.getAllByTestId('git-commit-row')[0]);

    expect(screen.getByTestId('git-commit-files')).toBeInTheDocument();
  });
});
