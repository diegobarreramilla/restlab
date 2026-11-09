import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

global.React = React;

jest.mock('./StyledWrapper', () => ({ children, ...props }) => <div {...props}>{children}</div>);
jest.mock('react-hot-toast', () => {
  const toast = jest.fn();
  toast.success = jest.fn();
  toast.error = jest.fn();
  toast.dismiss = jest.fn();
  toast.custom = jest.fn();
  return { __esModule: true, default: toast };
});

import ImportIssuesToastContent from './index';

const theme = {};
const issues = [
  { severity: 'error', path: 'Folder / Bad One', message: 'Missing method' },
  { severity: 'warning', path: 'Two', message: 'Invalid maxRedirects' }
];
const report = {
  collectionName: 'My API',
  format: 'postman',
  totalItems: 7,
  importedItems: 5,
  importedBreakdown: { requests: 4, folders: 1, environments: 0 }
};

const renderToast = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <ImportIssuesToastContent t={{ id: 'x', visible: true }} issues={issues} summary="1 item(s) skipped, 1 warning(s)" {...props} />
    </ThemeProvider>
  );

describe('ImportIssuesToast report', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue({ saved: true, filePath: '/tmp/r.txt' }) };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('leads with how many items were imported when a report is present', () => {
    renderToast({ report });
    expect(screen.getByTestId('import-issues-toast-title')).toHaveTextContent('5 of 7 items imported');
  });

  it('keeps the previous title when there is no report', () => {
    renderToast({ report: null });
    expect(screen.getByTestId('import-issues-toast-title')).toHaveTextContent('Imported with issues');
    expect(screen.queryByTestId('import-issues-save-report-btn')).not.toBeInTheDocument();
  });

  it('saves the report as a file with the skipped items listed', async () => {
    renderToast({ report });

    fireEvent.click(screen.getByTestId('import-issues-save-report-btn'));

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalled());
    const [channel, payload] = window.ipcRenderer.invoke.mock.calls[0];
    expect(channel).toBe('renderer:save-import-report');
    expect(payload.defaultFileName).toBe('My-API-import-report.txt');
    expect(payload.content).toContain('5 of 7 items imported');
    expect(payload.content).toContain('- Folder / Bad One: Missing method');
  });
});
