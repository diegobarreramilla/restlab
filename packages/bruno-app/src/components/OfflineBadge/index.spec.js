import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('ui/StatusBadge', () => ({ children }) => <span>{children}</span>);

import OfflineBadge from './index';

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
    render(<OfflineBadge />);

    expect(screen.queryByTestId('offline-badge')).not.toBeInTheDocument();
  });

  it('appears when the connection is lost and disappears when it returns', () => {
    render(<OfflineBadge />);

    setOnline(false);
    expect(screen.getByTestId('offline-badge')).toHaveTextContent('Offline mode');

    setOnline(true);
    expect(screen.queryByTestId('offline-badge')).not.toBeInTheDocument();
  });

  it('shows the label from the start when the app opens without a connection', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

    render(<OfflineBadge />);

    expect(screen.getByTestId('offline-badge')).toBeInTheDocument();
  });
});
