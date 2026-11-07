// With AI turned off, no handler may reach a model provider. These tests guard that promise at the
// main-process boundary, so it holds no matter what the renderer sends.
const handlers = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, fn) => { handlers[channel] = fn; }),
    on: jest.fn((channel, fn) => { handlers[channel] = fn; })
  }
}));
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  stepCountIs: jest.fn()
}));

let mockPreferences;
jest.mock('../../store/preferences', () => ({
  getPreferences: () => mockPreferences
}));
jest.mock('../../store/ai-keys', () => ({
  aiKeyStore: {
    hasKey: jest.fn(() => true),
    getKey: jest.fn(() => 'sk-test'),
    setKey: jest.fn(),
    clearKey: jest.fn()
  }
}));

const { generateText, streamText } = require('ai');
const registerAiIpc = require('./index');
const registerAutocompleteIpc = require('./autocomplete');

const aiPreferences = (overrides = {}) => ({
  ai: {
    enabled: false,
    providers: { openai: { enabled: true }, anthropic: { enabled: true } },
    models: {},
    defaultModel: '',
    openaiCompatibleEndpoints: [],
    autocomplete: { enabled: false, model: '', triggerMode: 'debounced' },
    security: {},
    ...overrides
  }
});

describe('AI handlers when AI is turned off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    mockPreferences = aiPreferences();
    registerAiIpc({ webContents: { isDestroyed: () => false, send: jest.fn() } });
    registerAutocompleteIpc();
  });

  it('refuses plain text generation and never calls the provider', async () => {
    const result = await handlers['renderer:ai-generate-text']({}, { model: 'openai:gpt-test', prompt: 'hello' });

    expect(result.error).toMatch(/disabled/i);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('answers autocomplete as disabled and never calls the provider', async () => {
    const result = await handlers['renderer:ai-autocomplete']({}, {
      requestId: 'r1',
      scriptType: 'pre-request',
      prefix: 'const token = await'
    });

    expect(result).toEqual({ disabled: true });
    expect(generateText).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });
});

describe('AI autocomplete is a separate opt-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    registerAutocompleteIpc();
  });

  it('stays off after enabling AI until autocomplete itself is switched on', async () => {
    mockPreferences = aiPreferences({ enabled: true, autocomplete: { model: '', triggerMode: 'debounced' } });

    const result = await handlers['renderer:ai-autocomplete']({}, {
      requestId: 'r2',
      scriptType: 'tests',
      prefix: 'expect(res.status'
    });

    expect(result).toEqual({ disabled: true });
    expect(generateText).not.toHaveBeenCalled();
  });

  it('stays off when autocomplete is on but the master AI switch is off', async () => {
    mockPreferences = aiPreferences({ enabled: false, autocomplete: { enabled: true } });

    const result = await handlers['renderer:ai-autocomplete']({}, {
      requestId: 'r3',
      scriptType: 'tests',
      prefix: 'expect(res.status'
    });

    expect(result).toEqual({ disabled: true });
  });
});
