import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { aiGenerateScript, previewAiGeneration, stopAiGeneration } from 'utils/ai';
import AIAssist from './index';

jest.mock('utils/ai', () => ({
  aiGenerateScript: jest.fn(),
  previewAiGeneration: jest.fn(),
  stopAiGeneration: jest.fn()
}));

const theme = {
  bg: '#1e1e1e',
  text: '#ffffff',
  brand: '#6366f1',
  codemirror: { bg: '#111827' },
  status: { success: { text: '#22c55e', background: 'rgba(34, 197, 94, 0.15)' } },
  border: { border1: '#374151', radius: { sm: '4px', base: '5px', md: '6px', lg: '8px' } },
  colors: {
    accent: '#6366f1',
    text: { muted: '#9ca3af', danger: '#ef4444' },
    bg: { danger: '#ef4444' }
  },
  button2: {
    color: {
      primary: { bg: '#6366f1', text: '#ffffff', border: '#6366f1' },
      secondary: { bg: '#374151', text: '#d1d5db', border: '#374151' },
      danger: { bg: '#ef4444', text: '#ffffff', border: '#ef4444' }
    }
  },
  input: {
    border: '#374151',
    bg: '#111827',
    focusBorder: '#6366f1'
  },
  font: { monospace: 'monospace', size: { xs: '11px', sm: '12px', base: '13px' } }
};

const createStore = (aiEnabled = true, reviewBeforeSend = false) => configureStore({
  reducer: {
    app: (state = { preferences: { ai: { enabled: aiEnabled, security: { reviewBeforeSend } } } }) => state
  }
});

const defaultProps = {
  scriptType: 'tests',
  currentScript: 'test("ok", () => {});',
  onApply: jest.fn()
};

const renderAIAssist = ({
  props = {},
  aiEnabled = true,
  reviewBeforeSend = false
} = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <Provider store={createStore(aiEnabled, reviewBeforeSend)}>
      <ThemeProvider theme={theme}>
        <AIAssist {...mergedProps} />
      </ThemeProvider>
    </Provider>
  );
};

const openPopup = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Generate Tests' }));
};

describe('AIAssist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiGenerateScript.mockResolvedValue({ content: 'test("generated", () => {});' });
  });

  describe('visibility', () => {
    it('renders nothing when AI is disabled', () => {
      const { container } = renderAIAssist({ aiEnabled: false });
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for an unsupported script type', () => {
      const { container } = renderAIAssist({ props: { scriptType: 'unknown-type' } });
      expect(container.firstChild).toBeNull();
    });

    it('renders the trigger when AI is enabled and the script type is supported', () => {
      renderAIAssist();
      expect(screen.getByRole('button', { name: 'Generate Tests' })).toBeInTheDocument();
    });
  });

  describe('titles', () => {
    it.each([
      ['tests', 'Generate Tests'],
      ['pre-request', 'Generate Pre-Request Script'],
      ['post-response', 'Generate Post-Response Script'],
      ['docs', 'Generate Documentation']
    ])('uses the correct title for %s', (scriptType, title) => {
      renderAIAssist({ props: { scriptType } });
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    });
  });

  describe('popup interactions', () => {
    it('opens and closes the popup from the trigger and close button', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('dialog', { name: 'Generate Tests' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('renders the popup into document.body as a portal', () => {
      renderAIAssist();
      openPopup();
      const dialog = screen.getByRole('dialog', { name: 'Generate Tests' });
      const tippyRoot = dialog.closest('[data-tippy-root]');
      expect(tippyRoot).not.toBeNull();
      expect(tippyRoot.parentElement).toBe(document.body);
    });

    it('closes the popup when Escape is pressed', () => {
      renderAIAssist();
      openPopup();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('closes the popup when clicking outside', () => {
      renderAIAssist();
      openPopup();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });
  });

  describe('prompt view', () => {
    it('shows suggestion chips when the prompt is empty', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('button', { name: 'Status 200' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'JSON body' })).toBeInTheDocument();
    });

    it('shows docs suggestions for the docs script type', () => {
      renderAIAssist({ props: { scriptType: 'docs', currentScript: '# Overview' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));

      expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
    });

    it('hides suggestions once the user starts typing', () => {
      renderAIAssist();
      openPopup();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add a status test' }
      });

      expect(screen.queryByRole('button', { name: 'Status 200' })).not.toBeInTheDocument();
    });

    it('shows the generate shortcut hint', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByText('Enter to generate · Shift+Enter for newline')).toBeInTheDocument();
    });

    it('keeps Generate disabled until the prompt has text', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add a status test' }
      });

      expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
    });
  });

  describe('generation flow', () => {
    it('generates from a suggestion chip', async () => {
      renderAIAssist();
      openPopup();

      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith(expect.objectContaining({
          scriptType: 'tests',
          prompt: 'Add a test asserting the response status code is 200',
          currentScript: 'test("ok", () => {});',
          requestContext: undefined,
          streamId: expect.any(String)
        }));
      });

      expect(screen.getByText('test("generated", () => {});')).toBeInTheDocument();
    });

    it('passes docs context for folder and collection documentation', async () => {
      const docsContext = {
        scope: 'folder',
        name: 'Users',
        collectionName: 'Pet Store API',
        folders: [{ name: 'Admin', requestCount: 1, subfolderCount: 0 }],
        requests: [{ name: 'List Users', method: 'GET', url: '{{base}}/users' }]
      };

      renderAIAssist({ props: { scriptType: 'docs', currentScript: '', docsContext } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));
      fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith(expect.objectContaining({
          scriptType: 'docs',
          prompt: 'Write an overview section describing the purpose and key features',
          currentScript: '',
          requestContext: undefined,
          docsContext
        }));
      });
    });

    it('generates from the prompt input and passes request context', async () => {
      const requestContext = {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        params: [],
        body: null
      };

      renderAIAssist({ props: { requestContext } });
      openPopup();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add auth header test' }
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith(expect.objectContaining({
          scriptType: 'tests',
          prompt: 'Add auth header test',
          currentScript: 'test("ok", () => {});',
          requestContext
        }));
      });
    });

    it('generates when pressing Enter', async () => {
      renderAIAssist();
      openPopup();

      const textarea = screen.getByPlaceholderText('Describe what you want to generate...');
      fireEvent.change(textarea, { target: { value: 'Add response time test' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith(expect.objectContaining({
          scriptType: 'tests',
          prompt: 'Add response time test',
          currentScript: 'test("ok", () => {});',
          requestContext: undefined
        }));
      });
    });

    it('does not generate when pressing Shift+Enter (allows newline)', () => {
      renderAIAssist();
      openPopup();

      const textarea = screen.getByPlaceholderText('Describe what you want to generate...');
      fireEvent.change(textarea, { target: { value: 'Add response time test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(aiGenerateScript).not.toHaveBeenCalled();
    });

    it('shows a loading state while generation is in progress', async () => {
      let resolveGenerate;
      aiGenerateScript.mockImplementation(() => new Promise((resolve) => {
        resolveGenerate = resolve;
      }));

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      expect(screen.getByText('Generating...')).toBeInTheDocument();

      resolveGenerate({ content: 'test("done", () => {});' });

      await waitFor(() => {
        expect(screen.getByText('test("done", () => {});')).toBeInTheDocument();
      });
    });

    it('shows a Stop button during generation and cancels via streamId', async () => {
      let resolveGenerate;
      aiGenerateScript.mockImplementation(() => new Promise((resolve) => {
        resolveGenerate = resolve;
      }));

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      const stopButton = await screen.findByRole('button', { name: /stop/i });
      expect(stopButton).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();

      const passedStreamId = aiGenerateScript.mock.calls[0][0].streamId;
      expect(passedStreamId).toEqual(expect.any(String));

      fireEvent.click(stopButton);
      expect(stopAiGeneration).toHaveBeenCalledWith(passedStreamId);

      resolveGenerate({ stopped: true });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    });

    it('shows an API error without entering preview mode', async () => {
      aiGenerateScript.mockResolvedValue({ error: 'Provider unavailable' });

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByText('Provider unavailable')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });

    it('shows a fallback error when no content is returned', async () => {
      aiGenerateScript.mockResolvedValue({});

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByText('No content was generated. Try rephrasing your prompt.')).toBeInTheDocument();
      });
    });
  });

  describe('preview and apply', () => {
    const showPreview = async () => {
      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      });
    };

    it('uses the script preview label for script types', async () => {
      await showPreview();
      expect(screen.getByText('Preview · replaces current script')).toBeInTheDocument();
    });

    it('uses the documentation preview label for docs', async () => {
      aiGenerateScript.mockResolvedValue({ content: '# API Docs' });

      renderAIAssist({ props: { scriptType: 'docs', currentScript: '# Existing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));
      fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

      await waitFor(() => {
        expect(screen.getByText('Preview · replaces current documentation')).toBeInTheDocument();
      });
      expect(screen.getByText('# API Docs')).toBeInTheDocument();
    });

    it('applies generated content and closes the popup', async () => {
      const onApply = jest.fn();
      renderAIAssist({ props: { onApply } });
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledWith('test("generated", () => {});');
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('returns to the prompt view when Back is clicked', async () => {
      await showPreview();

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByPlaceholderText('Describe what you want to generate...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Status 200' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });
  });
});

describe('AIAssist preview of what will be sent', () => {
  const PREVIEW = {
    sections: [
      { id: 'instructions', kind: 'instructions', title: 'Instructions to the assistant', text: 'You write tests.', characters: 16, hidden: 0 },
      { id: 'existing-content', kind: 'context', title: 'Existing Code', text: 'const k = \'<redacted:1>\';', characters: 25, hidden: 1 },
      { id: 'user-request', kind: 'conversation', title: 'Your request', text: 'User Request\nadd a test', characters: 23, hidden: 0 }
    ],
    onDemand: [{ name: 'read_response', summary: 'Reads the structure of the last response, never the values.' }],
    totals: { characters: 64, approximateTokens: 16, hidden: 1 }
  };

  const typePrompt = (text) => {
    fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), { target: { value: text } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiGenerateScript.mockResolvedValue({ content: 'test("generated", () => {});' });
    previewAiGeneration.mockResolvedValue(PREVIEW);
  });

  it('shows what would be sent for the prompt typed so far, without generating', async () => {
    renderAIAssist();
    openPopup();
    typePrompt('add a test');

    fireEvent.click(screen.getByTestId('ai-assist-preview-toggle'));

    expect(await screen.findByTestId('ai-context-preview')).toBeInTheDocument();
    expect(previewAiGeneration).toHaveBeenCalledWith(expect.objectContaining({
      scriptType: 'tests',
      prompt: 'add a test',
      currentScript: 'test("ok", () => {});'
    }));
    expect(screen.queryByTestId('ai-context-preview-confirm')).not.toBeInTheDocument();
    expect(aiGenerateScript).not.toHaveBeenCalled();
  });

  it('offers a single way back in the read-only look: the Back button, not a second close', async () => {
    renderAIAssist();
    openPopup();
    fireEvent.click(screen.getByTestId('ai-assist-preview-toggle'));
    await screen.findByTestId('ai-context-preview');

    expect(screen.queryByTestId('ai-context-preview-close')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);

    fireEvent.click(screen.getByTestId('ai-assist-preview-back'));

    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what you want to generate...')).toBeInTheDocument();
  });

  it('closes the preview first with Escape, and only then the popup', async () => {
    renderAIAssist();
    openPopup();
    fireEvent.click(screen.getByTestId('ai-assist-preview-toggle'));
    await screen.findByTestId('ai-context-preview');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('ai-context-preview')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Generate Tests' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
  });

  it('generates straight away when review is off', async () => {
    renderAIAssist();
    openPopup();
    typePrompt('add a test');

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(aiGenerateScript).toHaveBeenCalledTimes(1));
    expect(previewAiGeneration).not.toHaveBeenCalled();
  });

  it('holds the request for approval when review before sending is on', async () => {
    renderAIAssist({ reviewBeforeSend: true });
    openPopup();
    typePrompt('add a test');

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByTestId('ai-context-preview-confirm')).toHaveTextContent('Generate');
    expect(screen.getByText('Review before sending')).toBeInTheDocument();
    expect(aiGenerateScript).not.toHaveBeenCalled();
  });

  it('also holds the one-click suggestions for approval', async () => {
    renderAIAssist({ reviewBeforeSend: true });
    openPopup();

    fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

    expect(await screen.findByTestId('ai-context-preview-confirm')).toBeInTheDocument();
    expect(previewAiGeneration).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('status code is 200') }));
    expect(aiGenerateScript).not.toHaveBeenCalled();
  });

  it('generates once the user approves the review', async () => {
    renderAIAssist({ reviewBeforeSend: true });
    openPopup();
    typePrompt('add a test');
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    fireEvent.click(await screen.findByTestId('ai-context-preview-confirm'));

    await waitFor(() => expect(aiGenerateScript).toHaveBeenCalledTimes(1));
    expect(aiGenerateScript).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'add a test' }));
    expect(await screen.findByText('test("generated", () => {});')).toBeInTheDocument();
  });

  it('goes back to the prompt without generating when the user cancels the review', async () => {
    renderAIAssist({ reviewBeforeSend: true });
    openPopup();
    typePrompt('add a test');
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    fireEvent.click(await screen.findByTestId('ai-context-preview-cancel'));

    expect(aiGenerateScript).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Describe what you want to generate...')).toHaveValue('add a test');
  });
});
