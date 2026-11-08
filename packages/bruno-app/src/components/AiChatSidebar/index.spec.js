import '@testing-library/jest-dom';
import React from 'react';
import { render, act, waitFor, fireEvent, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

jest.mock('utils/ai/chat-store', () => ({
  newConversationId: () => 'conv-1',
  saveConversation: jest.fn().mockResolvedValue(undefined),
  listConversationsForPath: jest.fn().mockResolvedValue([]),
  loadConversation: jest.fn().mockResolvedValue(null),
  deleteConversation: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('utils/ai', () => ({
  getAiStatus: jest.fn().mockResolvedValue({
    availableModels: [{ id: 'gpt-mock', label: 'GPT Mock', provider: 'mock' }]
  }),
  buildAiVariablesPayload: jest.fn(() => []),
  buildAiRequestsPayload: jest.fn(() => []),
  previewAiChat: jest.fn()
}));

jest.mock('components/AiChatSidebar/DiffView', () => () => null);
jest.mock('components/AiChatSidebar/AssistantCodeBlock', () => () => null);

// Button / MenuDropdown pull in `polished` color helpers that choke on our
// theme proxy — swap them for lightweight stubs.
jest.mock('ui/Button', () => (props) => {
  const React = require('react');
  return React.createElement('button', props, props.children);
});
jest.mock('ui/MenuDropdown', () => (props) => {
  const React = require('react');
  return React.createElement('div', null, props.children);
});

// jsdom doesn't implement scrollIntoView / scrollTo; the sidebar's auto-scroll
// effect calls them and would otherwise throw during render.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

import { previewAiChat } from 'utils/ai';
import AiChatSidebar from './index';

const COLLECTION = {
  uid: 'col-1',
  name: 'Test Collection',
  pathname: '/tmp/collection',
  root: {},
  items: []
};

const buildStore = ({ isLoading = false, isOpen = true, reviewBeforeSend = false } = {}) => {
  const chatSlice = createSlice({
    name: 'chat',
    initialState: {
      isOpen,
      isPoppedOut: false,
      chats: {
        'tab-1': {
          conversationId: null,
          pathname: '/tmp/collection',
          collectionUid: 'col-1',
          contentType: 'app',
          messages: [],
          isLoading,
          error: null,
          currentRequestId: null,
          createdAt: null,
          historyList: []
        }
      }
    },
    reducers: {
      setAiLoading: (state, action) => {
        const { tabUid, isLoading } = action.payload;
        if (state.chats[tabUid]) state.chats[tabUid].isLoading = isLoading;
      }
    }
  });

  const tabsSlice = createSlice({
    name: 'tabs',
    initialState: {
      tabs: [{ uid: 'tab-1', collectionUid: 'col-1', pathname: '/tmp/collection', requestPaneTab: 'script', scriptPaneTab: 'pre-request' }],
      activeTabUid: 'tab-1'
    },
    reducers: {}
  });

  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences: { ai: { enabled: true, security: { reviewBeforeSend } } } },
    reducers: {}
  });

  const store = configureStore({
    reducer: {
      chat: chatSlice.reducer,
      tabs: tabsSlice.reducer,
      app: appSlice.reducer
    },
    // The real store dispatches unrelated thunks/actions during mount
    // (setChatBinding, refreshChatHistory, ...). The mock reducers don't
    // handle them, and immutable/serializable checks would flag payloads
    // we don't care about here — turn them off for this focused test.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false
    })
  });

  return { store, setAiLoading: chatSlice.actions.setAiLoading };
};

// StyledWrapper reads many nested theme paths (`theme.border.radius.base`,
// `theme.button2.color.primary.bg`, `theme.request.methods.get`, ...). A
// recursive proxy returns a benign stub for every level so styled-components
// can generate CSS without us hand-listing every leaf.
// Every leaf is coerced by styled-components to a string via
// `Symbol.toPrimitive`; polished/color helpers then parse those strings, so
// we return a valid hex to keep them happy.
const makeThemeProxy = () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => '#000000';
      if (typeof prop === 'symbol') return undefined;
      return makeThemeProxy();
    }
  });
const theme = makeThemeProxy();

const renderSidebar = (options) => {
  const { store, setAiLoading } = buildStore(options);
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AiChatSidebar collection={COLLECTION} />
      </ThemeProvider>
    </Provider>
  );
  return { ...utils, store, setAiLoading };
};

describe('AiChatSidebar prompt-input focus', () => {
  it('refocuses the prompt input when isLoading transitions from true to false', async () => {
    const { container, store, setAiLoading } = renderSidebar({ isLoading: true, isOpen: true });

    // The textarea is gated on getAiStatus() populating availableModels.
    const textarea = await waitFor(() => {
      const el = container.querySelector('.ai-sidebar-input textarea');
      if (!el) throw new Error('textarea not rendered yet');
      return el;
    });

    textarea.blur();
    expect(document.activeElement).not.toBe(textarea);

    await act(async () => {
      store.dispatch(setAiLoading({ tabUid: 'tab-1', isLoading: false }));
    });

    expect(document.activeElement).toBe(textarea);
  });

  it('does not steal focus when isLoading changes while the sidebar is closed', async () => {
    const { container, store, setAiLoading } = renderSidebar({ isLoading: true, isOpen: false });

    const textarea = container.querySelector('.ai-sidebar-input textarea');
    // With isOpen=false the sidebar body doesn't render its input.
    expect(textarea).toBeNull();

    await act(async () => {
      store.dispatch(setAiLoading({ tabUid: 'tab-1', isLoading: false }));
    });

    // Nothing to focus — assertion is that dispatch didn't blow up and no
    // element was force-focused elsewhere.
    expect(document.activeElement).toBe(document.body);
  });
});

describe('AiChatSidebar preview of what will be sent', () => {
  const PREVIEW = {
    sections: [
      { id: 'instructions', kind: 'instructions', title: 'Instructions to the assistant', text: 'You help.', characters: 9, hidden: 0 },
      { id: 'message-0', kind: 'conversation', title: 'Your message', text: 'add a test', characters: 10, hidden: 0 }
    ],
    onDemand: [],
    totals: { characters: 19, approximateTokens: 5, hidden: 0 }
  };

  const streamCalls = () => window.ipcRenderer.send.mock.calls.filter(([channel]) => channel === 'renderer:ai-chat-stream');

  const typeMessage = async (container, text) => {
    const textarea = await waitFor(() => {
      const el = container.querySelector('.ai-sidebar-input textarea');
      if (!el) throw new Error('textarea not rendered yet');
      return el;
    });
    fireEvent.change(textarea, { target: { value: text } });
    return textarea;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    previewAiChat.mockResolvedValue(PREVIEW);
    window.ipcRenderer = { send: jest.fn(), on: jest.fn(() => jest.fn()), invoke: jest.fn().mockResolvedValue(null) };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('opens a read-only look on demand, built from the message being typed, and closes again', async () => {
    const { container } = renderSidebar({ isOpen: true });
    await typeMessage(container, 'add a test');

    fireEvent.click(screen.getByTestId('ai-preview-toggle'));

    expect(await screen.findByTestId('ai-context-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-context-preview-confirm')).not.toBeInTheDocument();
    const payload = previewAiChat.mock.calls[0][0];
    expect(payload.messages).toEqual([{ role: 'user', content: 'add a test' }]);
    expect(streamCalls()).toHaveLength(0);

    fireEvent.click(screen.getByTestId('ai-preview-toggle'));
    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
  });

  it('shows the error when the preview cannot be prepared', async () => {
    previewAiChat.mockResolvedValue({ error: 'AI features are disabled.' });
    const { container } = renderSidebar({ isOpen: true });
    await typeMessage(container, 'hello');

    fireEvent.click(screen.getByTestId('ai-preview-toggle'));

    expect(await screen.findByRole('alert')).toHaveTextContent('AI features are disabled.');
  });

  it('sends straight away when review is off, without asking for a preview', async () => {
    const { container } = renderSidebar({ isOpen: true });
    const textarea = await typeMessage(container, 'add a test');

    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => expect(streamCalls()).toHaveLength(1));
    expect(previewAiChat).not.toHaveBeenCalled();
  });

  it('holds the message for approval when review before sending is on', async () => {
    const { container } = renderSidebar({ isOpen: true, reviewBeforeSend: true });
    const textarea = await typeMessage(container, 'add a test');

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(await screen.findByTestId('ai-context-preview-confirm')).toBeInTheDocument();
    expect(screen.getByText('Review before sending')).toBeInTheDocument();
    expect(streamCalls()).toHaveLength(0);
    expect(textarea).toBeDisabled();
  });

  it('sends the reviewed message once the user approves it', async () => {
    const { container } = renderSidebar({ isOpen: true, reviewBeforeSend: true });
    const textarea = await typeMessage(container, 'add a test');
    fireEvent.keyDown(textarea, { key: 'Enter' });

    fireEvent.click(await screen.findByTestId('ai-context-preview-confirm'));

    await waitFor(() => expect(streamCalls()).toHaveLength(1));
    expect(streamCalls()[0][1].messages).toEqual([{ role: 'user', content: 'add a test' }]);
    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
  });

  it('sends nothing when the user backs out of the review, and keeps what they typed', async () => {
    const { container } = renderSidebar({ isOpen: true, reviewBeforeSend: true });
    const textarea = await typeMessage(container, 'add a test');
    fireEvent.keyDown(textarea, { key: 'Enter' });

    fireEvent.click(await screen.findByTestId('ai-context-preview-cancel'));

    expect(streamCalls()).toHaveLength(0);
    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
    expect(textarea).toHaveValue('add a test');
    expect(textarea).toBeEnabled();
  });

  it('closes the preview with Escape', async () => {
    const { container } = renderSidebar({ isOpen: true });
    await typeMessage(container, 'hello');
    fireEvent.click(screen.getByTestId('ai-preview-toggle'));
    const panel = await screen.findByTestId('ai-context-preview');

    fireEvent.keyDown(panel, { key: 'Escape' });

    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
  });
});
