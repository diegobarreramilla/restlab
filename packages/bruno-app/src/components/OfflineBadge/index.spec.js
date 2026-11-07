import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { RESTORED_DURATION_MS, EXIT_DURATION_MS } from 'hooks/useConnectionPhase';
import OfflineBadge from './index';

const theme = {
  text: '#343434',
  status: {
    warning: { text: 'hsl(35, 85%, 42%)' },
    success: { text: 'hsl(145, 50%, 36%)' }
  }
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
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while the network is available', () => {
    renderBadge();

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

  it('switches to Back online when the connection returns instead of disappearing at once', () => {
    renderBadge();
    setOnline(false);

    setOnline(true);

    const badge = screen.getByTestId('offline-badge');
    expect(badge).toHaveAttribute('data-state', 'restored');
    expect(badge).toHaveAttribute('title', 'Connection restored.');
    expect(screen.getByText('Back online')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Offline')).toHaveAttribute('data-active', 'false');
  });

  it('keeps only the active label visible to assistive technology', () => {
    renderBadge();
    setOnline(false);
    expect(screen.getByText('Back online')).toHaveAttribute('aria-hidden', 'true');

    setOnline(true);
    expect(screen.getByText('Offline')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Back online')).toHaveAttribute('aria-hidden', 'false');
  });

  it('fades out after a moment and then leaves the page', () => {
    renderBadge();
    setOnline(false);
    setOnline(true);

    act(() => jest.advanceTimersByTime(RESTORED_DURATION_MS));
    expect(screen.getByTestId('offline-badge')).toHaveAttribute('data-state', 'leaving');

    act(() => jest.advanceTimersByTime(EXIT_DURATION_MS));
    expect(screen.queryByTestId('offline-badge')).not.toBeInTheDocument();
  });

  it('shows Offline again if the connection drops during the notice', () => {
    renderBadge();
    setOnline(false);
    setOnline(true);

    setOnline(false);

    expect(screen.getByTestId('offline-badge')).toHaveAttribute('data-state', 'offline');
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByTestId('offline-badge')).toHaveAttribute('data-state', 'offline');
  });
});
