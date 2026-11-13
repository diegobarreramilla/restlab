import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import CertificateErrorHint from './index';

const renderHint = (error) => {
  const store = configureStore({
    reducer: { tabs: tabsReducer },
    preloadedState: { tabs: { tabs: [], activeTabUid: null } }
  });
  render(
    <Provider store={store}>
      <CertificateErrorHint error={error} />
    </Provider>
  );
  return store;
};

describe('CertificateErrorHint', () => {
  it('explains an untrusted certificate in the current Node spelling', () => {
    renderHint('self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca');

    expect(screen.getByTestId('certificate-error-hint')).toHaveTextContent('Use Custom CA Certificate');
  });

  it('renders nothing for an error that is not about the certificate', () => {
    renderHint('connect ECONNREFUSED 127.0.0.1:8080');

    expect(screen.queryByTestId('certificate-error-hint')).not.toBeInTheDocument();
  });

  it('opens the Preferences tab', () => {
    const store = renderHint('certificate has expired');

    fireEvent.click(screen.getByTestId('certificate-error-open-preferences'));

    expect(store.getState().tabs.tabs.some((tab) => tab.type === 'preferences')).toBe(true);
  });
});
