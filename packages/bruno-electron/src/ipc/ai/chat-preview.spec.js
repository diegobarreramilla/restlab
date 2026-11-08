// The preview is only worth trusting if it is built by the same code that builds what is sent.
const handlers = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, fn) => { handlers[channel] = fn; }),
    on: jest.fn((channel, fn) => { handlers[channel] = fn; })
  }
}));

const mockStreamText = jest.fn();
jest.mock('ai', () => ({
  streamText: (...args) => mockStreamText(...args),
  stepCountIs: jest.fn()
}));

let mockPreferences;
jest.mock('../../store/preferences', () => ({
  getPreferences: () => mockPreferences
}));

const registerChatIpc = require('./chat');

const SECRET = 'hunter2hunter2';

const payload = (overrides = {}) => ({
  requestId: 'req-1',
  contentType: 'tests',
  messages: [{ role: 'user', content: 'add a status test' }],
  allContent: {
    'tests': `const apiKey = '${SECRET}';\nconst page = 2;`,
    'pre-request': 'bru.setVar("started", true);'
  },
  requestContext: {
    method: 'GET',
    url: `https://api.example.com/items?api_key=${SECRET}&page=2`,
    headers: [{ enabled: true, name: 'Accept', value: 'application/json' }]
  },
  variables: [{ name: 'baseUrl', value: 'https://api.example.com', scope: 'env', secret: false }],
  requests: [{ name: 'List', method: 'GET', url: `https://api.example.com/items?token=${SECRET}`, pathname: 'items/list' }],
  ...overrides
});

const preferencesWith = (security = {}, enabled = true) => ({ ai: { enabled, security } });

const emptyStream = () => ({ fullStream: (async function* () {})() });

describe('chat preview', () => {
  let send;
  let isAiEnabled;

  const register = () => {
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    registerChatIpc({
      mainWindow: { webContents: { isDestroyed: () => false, send } },
      resolveModel: () => ({}),
      pickDefaultModelId: () => 'gpt-4o-mini',
      isAiEnabled
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    send = jest.fn();
    isAiEnabled = () => true;
    mockPreferences = preferencesWith();
    mockStreamText.mockImplementation(() => emptyStream());
    register();
  });

  it('shows exactly what the stream sends', async () => {
    const preview = await handlers['renderer:ai-chat-preview']({}, payload());
    await handlers['renderer:ai-chat-stream']({}, payload());

    const sent = mockStreamText.mock.calls[0][0];
    const section = (kind) => preview.sections.filter((s) => s.kind === kind);

    expect(section('instructions')[0].text).toBe(sent.system);
    expect(section('context').map((s) => s.text).join('\n\n')).toBe(sent.messages[0].content);
    expect(section('conversation').map((s) => s.text)).toEqual(sent.messages.slice(1).map((m) => m.content));
  });

  it('never contains a value the redaction hides, and counts what it hid', async () => {
    const preview = await handlers['renderer:ai-chat-preview']({}, payload());

    const everything = preview.sections.map((s) => s.text).join('\n');
    expect(everything).not.toContain(SECRET);
    expect(preview.totals.hidden).toBeGreaterThanOrEqual(3);
    expect(preview.sections.find((s) => s.id === 'active-content').hidden).toBe(1);
    expect(preview.sections.find((s) => s.id === 'request').hidden).toBeGreaterThanOrEqual(1);
  });

  it('titles each piece so the user can tell what it is', async () => {
    const preview = await handlers['renderer:ai-chat-preview']({}, payload());

    expect(preview.sections.map((s) => s.title)).toEqual([
      'Instructions to the assistant',
      'The request',
      'Variable names',
      'Requests in this collection',
      'Test Code',
      'Other content in this request',
      'Your message'
    ]);
  });

  it('reports sizes', async () => {
    const preview = await handlers['renderer:ai-chat-preview']({}, payload());

    expect(preview.totals.characters).toBe(preview.sections.reduce((n, s) => n + s.text.length, 0));
    expect(preview.totals.approximateTokens).toBe(Math.ceil(preview.totals.characters / 4));
  });

  it('describes what the assistant can ask for, following the redaction settings', async () => {
    const strict = await handlers['renderer:ai-chat-preview']({}, payload());
    expect(strict.onDemand.find((t) => t.name === 'read_response').summary).toMatch(/never the values/);

    mockPreferences = preferencesWith({ redactResponse: false });
    const open = await handlers['renderer:ai-chat-preview']({}, payload());
    expect(open.onDemand.find((t) => t.name === 'read_response').summary).toMatch(/as it is/);
  });

  it('shows the real content when the user switched body redaction off', async () => {
    mockPreferences = preferencesWith({ redactBody: false });

    const preview = await handlers['renderer:ai-chat-preview']({}, payload());

    expect(preview.sections.find((s) => s.id === 'active-content').text).toContain(SECRET);
    expect(preview.sections.find((s) => s.id === 'active-content').hidden).toBe(0);
  });

  it('refuses to preview while AI is turned off, and does not call the model', async () => {
    isAiEnabled = () => false;
    register();

    const preview = await handlers['renderer:ai-chat-preview']({}, payload());

    expect(preview.error).toMatch(/disabled/i);
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it('does not call the model just to build a preview', async () => {
    await handlers['renderer:ai-chat-preview']({}, payload());

    expect(mockStreamText).not.toHaveBeenCalled();
  });
});

describe('chat edits keep the real values', () => {
  it('lets the model read a redacted file and writes the real values back into its answer', async () => {
    const send = jest.fn();
    mockPreferences = preferencesWith();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    registerChatIpc({
      mainWindow: { webContents: { isDestroyed: () => false, send } },
      resolveModel: () => ({}),
      pickDefaultModelId: () => 'gpt-4o-mini',
      isAiEnabled: () => true
    });

    let seenByModel;
    mockStreamText.mockImplementation(({ tools }) => ({
      fullStream: (async function* () {
        seenByModel = await tools.read_content.execute({ type: 'tests' });
        await tools.write_content.execute({ type: 'tests', content: `${seenByModel}\nexpect(res.status).toBe(200);` });
      })()
    }));

    await handlers['renderer:ai-chat-stream']({}, payload());

    expect(seenByModel).not.toContain(SECRET);
    expect(seenByModel).toContain('<redacted:1>');

    const complete = send.mock.calls.find(([channel]) => channel === 'main:ai-chat-complete')[1];
    expect(complete.writes[0].content).toBe(`const apiKey = '${SECRET}';\nconst page = 2;\nexpect(res.status).toBe(200);`);
    expect(complete.writes[0].originalContent).toBe(`const apiKey = '${SECRET}';\nconst page = 2;`);
    expect(complete.code).not.toContain('<redacted');
  });
});
