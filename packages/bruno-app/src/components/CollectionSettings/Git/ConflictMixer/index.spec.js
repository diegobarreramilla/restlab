import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import ConflictMixer from './index';

const mockQuery = jest.fn();
jest.mock('hooks/useGitQuery', () => (query) => mockQuery(query));

const PARTS = [
  { key: 'request.url', changedBy: 'both' },
  { key: 'request.headers', changedBy: 'theirs' },
  { key: 'request.tests', changedBy: 'ours' }
];

const renderMixer = (data = { mergeable: true, parts: PARTS }) => {
  mockQuery.mockReturnValue({ data, loading: false });
  const run = jest.fn().mockResolvedValue({ ok: true });
  const view = render(
    <ThemeProvider theme={themes.light}>
      <ConflictMixer git={{ invoke: jest.fn(), run, version: 1 }} filePath="list.yml" />
    </ThemeProvider>
  );
  return { run, ...view };
};

const sideOf = (row, side) => row.querySelector(`[data-testid="git-mixer-${side}"]`);

describe('ConflictMixer', () => {
  it('renders nothing for a file that cannot be mixed', () => {
    const { container } = renderMixer({ mergeable: false, parts: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it('starts each part on the only side that changed it and leaves the contested one open', () => {
    renderMixer();
    const [url, headers, tests] = screen.getAllByTestId('git-mixer-part');

    expect(url).toHaveTextContent('URL');
    expect(url).toHaveTextContent('both changed it: choose one');
    expect(sideOf(url, 'ours')).toHaveAttribute('aria-checked', 'false');
    expect(sideOf(url, 'theirs')).toHaveAttribute('aria-checked', 'false');
    expect(sideOf(headers, 'theirs')).toHaveAttribute('aria-checked', 'true');
    expect(sideOf(tests, 'ours')).toHaveAttribute('aria-checked', 'true');
  });

  it('cannot be saved until every part has a side', () => {
    const { run } = renderMixer();

    expect(screen.getByTestId('git-mixer-save')).toBeDisabled();
    expect(screen.getByTestId('git-conflict-mixer')).toHaveTextContent('1 part still needs a choice');

    fireEvent.click(sideOf(screen.getAllByTestId('git-mixer-part')[0], 'ours'));
    fireEvent.click(screen.getByTestId('git-mixer-save'));

    expect(run).toHaveBeenCalledWith('resolve-conflict-parts', {
      filePath: 'list.yml',
      choices: { 'request.url': 'ours', 'request.headers': 'theirs', 'request.tests': 'ours' }
    });
  });

  it('lets a suggested side be overridden', () => {
    const { run } = renderMixer();
    const [url, headers] = screen.getAllByTestId('git-mixer-part');

    fireEvent.click(sideOf(url, 'theirs'));
    fireEvent.click(sideOf(headers, 'ours'));
    fireEvent.click(screen.getByTestId('git-mixer-save'));

    expect(run).toHaveBeenCalledWith('resolve-conflict-parts', {
      filePath: 'list.yml',
      choices: { 'request.url': 'theirs', 'request.headers': 'ours', 'request.tests': 'ours' }
    });
  });
});
