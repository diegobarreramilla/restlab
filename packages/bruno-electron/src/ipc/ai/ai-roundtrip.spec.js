// The assistant rewrites whole files from a redacted copy. Applying the result must never replace a
// real value with a placeholder, so each handler restores what it hid before returning.
const handlers = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, fn) => { handlers[channel] = fn; }),
    on: jest.fn((channel, fn) => { handlers[channel] = fn; })
  }
}));

const mockStreamText = jest.fn();
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  streamText: (...args) => mockStreamText(...args),
  generateText: (...args) => mockGenerateText(...args),
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

const registerAiIpc = require('./index');
const registerAutocompleteIpc = require('./autocomplete');

const SECRET = 'hunter2hunter2';

const enabledPreferences = (overrides = {}) => ({
  ai: {
    enabled: true,
    providers: { openai: { enabled: true } },
    models: {},
    defaultModel: 'gpt-4o-mini',
    openaiCompatibleEndpoints: [],
    autocomplete: { enabled: true, model: '', triggerMode: 'debounced' },
    security: {},
    ...overrides
  }
});

const streamOf = (text) => ({
  fullStream: (async function* () {
    yield { type: 'text-delta', text };
  })()
});

describe('script generation', () => {
  let promptSeenByModel;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    mockPreferences = enabledPreferences();
    registerAiIpc({ webContents: { isDestroyed: () => false, send: jest.fn() } });

    // A model that returns the existing script with one line added.
    mockStreamText.mockImplementation((args) => {
      promptSeenByModel = args.prompt;
      const existing = args.prompt.match(/```js\n([\s\S]*?)\n```/)[1];
      return streamOf(`\`\`\`js\n${existing}\nconsole.log('done');\n\`\`\``);
    });
  });

  it('keeps the real value in the rewritten script and never shows it to the model', async () => {
    const result = await handlers['renderer:ai-generate-script']({}, {
      scriptType: 'pre-request',
      prompt: 'log when done',
      currentScript: `const apiKey = '${SECRET}';\nconst page = 2;`,
      model: 'gpt-4o-mini'
    });

    expect(promptSeenByModel).not.toContain(SECRET);
    expect(promptSeenByModel).toContain('const page = 2;');
    expect(result.content).toBe(`const apiKey = '${SECRET}';\nconst page = 2;\nconsole.log('done');`);
  });

  it('sends the script as it is when body redaction is switched off', async () => {
    mockPreferences = enabledPreferences({ security: { redactBody: false } });

    const result = await handlers['renderer:ai-generate-script']({}, {
      scriptType: 'pre-request',
      prompt: 'log when done',
      currentScript: `const apiKey = '${SECRET}';`,
      model: 'gpt-4o-mini'
    });

    expect(promptSeenByModel).toContain(SECRET);
    expect(result.content).toContain(`const apiKey = '${SECRET}';`);
  });
});

describe('autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    mockPreferences = enabledPreferences();
    registerAutocompleteIpc();
  });

  it('hides the code around the cursor from the model and restores values it echoes back', async () => {
    let promptSeenByModel;
    mockGenerateText.mockImplementation(async (args) => {
      promptSeenByModel = args.prompt;
      return { text: '\'<redacted:1>\'' };
    });

    const result = await handlers['renderer:ai-autocomplete']({}, {
      requestId: 'r1',
      scriptType: 'pre-request',
      prefix: `const apiKey = '${SECRET}';\nconst copy = `
    });

    expect(promptSeenByModel).not.toContain(SECRET);
    expect(promptSeenByModel).toContain('<redacted:1>');
    expect(result.suggestion).toContain(SECRET);
  });
});
