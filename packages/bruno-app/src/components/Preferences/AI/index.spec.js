import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

global.React = React;

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('./ProviderCard', () => () => null);
jest.mock('./CompatEndpointCard', () => () => null);
jest.mock('./AutocompletePane', () => () => null);
jest.mock('./SecurityPane', () => () => null);
jest.mock('components/ToggleSwitch', () => () => null);
jest.mock('ui/StatusBadge', () => ({ children }) => <span>{children}</span>);
jest.mock('components/Icons/IconSparkles', () => () => null);
jest.mock('utils/ai', () => ({
  getAiStatus: jest.fn(() => Promise.resolve({ enabled: true, providers: {}, models: [], availableModels: [] })),
  clearAiApiKey: jest.fn()
}));
jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: jest.fn(() => () => Promise.resolve())
}));

import { savePreferences } from 'providers/ReduxStore/slices/app';
import AI from './index';

const renderAiPreferences = () => {
  const store = configureStore({
    reducer: {
      app: (state = { preferences: { ai: { enabled: true, providers: {}, models: {}, openaiCompatibleEndpoints: [] } } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <AI />
    </Provider>
  );
};

describe('AI preferences — local Ollama preset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a ready-to-use local endpoint with one click', async () => {
    renderAiPreferences();

    fireEvent.click(await screen.findByTestId('ai-compat-add-ollama'));

    await waitFor(() => expect(savePreferences).toHaveBeenCalled());
    const { ai } = savePreferences.mock.calls[0][0];
    expect(ai.openaiCompatibleEndpoints).toHaveLength(1);
    expect(ai.openaiCompatibleEndpoints[0]).toMatchObject({
      name: 'Ollama (local)',
      baseURL: 'http://localhost:11434/v1',
      models: []
    });
    expect(ai.providers[`openai-compatible:${ai.openaiCompatibleEndpoints[0].id}`]).toEqual({ enabled: true });
  });

  it('still adds an empty endpoint with the generic button', async () => {
    renderAiPreferences();

    fireEvent.click(await screen.findByTestId('ai-compat-add-endpoint'));

    await waitFor(() => expect(savePreferences).toHaveBeenCalled());
    const { ai } = savePreferences.mock.calls[0][0];
    expect(ai.openaiCompatibleEndpoints[0]).toMatchObject({ name: 'Endpoint 1', baseURL: '' });
  });

  it('describes the provider connection without claiming the key never leaves the machine', async () => {
    const store = configureStore({
      reducer: { app: (state = { preferences: { ai: { enabled: false } } }) => state }
    });
    render(
      <Provider store={store}>
        <AI />
      </Provider>
    );

    expect(await screen.findByText(/sent only to that provider/)).toBeInTheDocument();
    expect(screen.queryByText(/never leave your machine/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bruno/)).not.toBeInTheDocument();
  });
});
