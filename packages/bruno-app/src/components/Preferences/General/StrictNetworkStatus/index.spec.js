import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import StrictNetworkStatus from './index';

const stubStatus = (status) => {
  window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve(status)) };
};

describe('StrictNetworkStatus', () => {
  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('asks nothing and shows nothing while the mode is off', () => {
    stubStatus({ enabled: false, blockedCount: 0, blockedHosts: [] });
    render(<StrictNetworkStatus enabled={false} />);

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(screen.queryByTestId('strict-network-status')).not.toBeInTheDocument();
  });

  it('says that nothing has been blocked', async () => {
    stubStatus({ enabled: true, blockedCount: 0, blockedHosts: [] });
    render(<StrictNetworkStatus enabled />);

    expect(await screen.findByTestId('strict-network-status')).toHaveTextContent('Nothing has been blocked since RestLab started.');
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-strict-network-status');
  });

  it('counts what was blocked and names the addresses', async () => {
    stubStatus({ enabled: true, blockedCount: 3, blockedHosts: [{ host: 'cdn.example.com', attempts: 2 }, { host: 'img.example.org', attempts: 1 }] });
    render(<StrictNetworkStatus enabled />);

    expect(await screen.findByTestId('strict-network-status')).toHaveTextContent(
      'Blocked since RestLab started: 3 connections to cdn.example.com, img.example.org.'
    );
  });
});
