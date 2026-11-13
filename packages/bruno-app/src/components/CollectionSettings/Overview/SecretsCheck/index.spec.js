import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import SecretsCheck from './index';

const TOKEN = 'ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';

const renderCheck = (collection) =>
  render(
    <ThemeProvider theme={themes.light}>
      <SecretsCheck collection={collection} />
    </ThemeProvider>
  );

const request = (headers) => ({
  type: 'http-request',
  name: 'list users',
  request: { url: 'https://api.example.com', headers, params: [], auth: { mode: 'none' } }
});

describe('SecretsCheck', () => {
  it('renders nothing for a collection without plain-text secrets', () => {
    const { container } = renderCheck({
      items: [request([{ name: 'Accept', value: '*/*', enabled: true }])],
      environments: [],
      root: {}
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('says how many there are and keeps the list closed until asked', () => {
    renderCheck({ items: [request([{ name: 'X-Trace', value: TOKEN, enabled: true }])], environments: [], root: {} });

    expect(screen.getByTestId('secrets-check-toggle')).toHaveTextContent('1 value looks like a secret stored in plain text');
    expect(screen.queryByTestId('secrets-check-list')).not.toBeInTheDocument();
  });

  it('lists where each one is without ever showing the value', () => {
    renderCheck({ items: [request([{ name: 'X-Trace', value: TOKEN, enabled: true }])], environments: [], root: {} });

    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    const row = screen.getByTestId('secrets-check-row');
    expect(row).toHaveTextContent('list users');
    expect(row).toHaveTextContent('X-Trace');
    expect(screen.getByTestId('secrets-check')).not.toHaveTextContent(TOKEN);
  });
});
