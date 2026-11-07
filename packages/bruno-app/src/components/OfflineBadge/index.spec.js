import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import OfflineBadge from './index';

const theme = {
  text: '#343434',
  status: { warning: { text: 'hsl(35, 85%, 42%)' } }
};

const renderBadge = () => render(
  <ThemeProvider theme={theme}>
    <OfflineBadge />
  </ThemeProvider>
);

const setOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
};

describe('OfflineBadge', () => {
  afterEach(() => {
    setOnline(true);
  });

  it('renders nothing while the network is available', () => {
    renderBadge();

    expect(screen.queryByTestId('offline-badge')).not.toBeInTheDocument();
  });

  it('appears when the connection is lost and disappears when it returns', () => {
    renderBadge();

    setOnline(false);
    expect(screen.getByTestId('offline-badge')).toBeInTheDocument();

    setOnline(true);
    expect(screen.queryByTestId('offline-badge')).not.toBeInTheDocument();
  });

  it('is plain text, with no icon or image', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    renderBadge();

    const badge = screen.getByTestId('offline-badge');
    expect(badge).toHaveTextContent('Offline');
    expect(badge).toHaveTextContent('Working locally');
    expect(badge.querySelector('svg, img')).toBeNull();
  });

  it('is announced as a status and explains what keeps working', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    renderBadge();

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-state', 'offline');
    expect(badge).toHaveAttribute('title', expect.stringContaining('keep working'));
  });
});
