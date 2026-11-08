const { ipcMain } = require('electron');
const { streamText, stepCountIs } = require('ai');
const { z } = require('zod');
const { get } = require('lodash');
const { CONTENT_TYPES, TOOL_LABELS, buildSystemPrompt, resolveContentType } = require('./chat-prompts');
const {
  formatRequestContext,
  formatResponseShape,
  formatVariablesList,
  searchVariables,
  formatSearchVariablesResult,
  formatRequestsList,
  searchRequests,
  formatSearchRequestsResult,
  createCodeRedactor,
  buildRedactionPolicy
} = require('./context');
const { describePreview, describeReadResponseTool, SEARCH_VARIABLES_TOOL } = require('./preview');
const { getPreferences } = require('../../store/preferences');
const { isBuiltInModelId } = require('./providers');

const getSecurityPrefs = () => get(getPreferences(), 'ai.security', null);

const activeStreams = new Map();

const CONTENT_LABELS = {
  'app': 'App Code',
  'tests': 'Test Code',
  'pre-request': 'Pre-Request Script',
  'post-response': 'Post-Response Script',
  'docs': 'Documentation'
};

const APP_DISABLED_NOTICE = 'App mode is currently DISABLED for this request. The App tab is hidden and any code written to \'app\' will not be visible or runnable. Do NOT call write_content(\'app\'); instead, tell the user to open the request\'s Settings tab and turn on "Enable App" first, then ask them to run the request again.';

// The context message the model starts from, as titled pieces. The preview shows these same pieces,
// so what the user reviews is built by the code that builds what is sent.
const buildContextParts = (contentType, allContent, requestContext, variables, security, appEnabled, requests, redactor) => {
  const parts = [];
  if (appEnabled === false) {
    parts.push({ id: 'notice', title: 'Notice', text: `Note: ${APP_DISABLED_NOTICE}` });
  }
  const ctx = formatRequestContext(requestContext, { includeResponse: true, security });
  if (ctx) {
    parts.push({ id: 'request', title: 'The request', text: `HTTP Request Context:\n${ctx}` });
  }

  const varsStr = formatVariablesList(variables, { security });
  if (varsStr) {
    parts.push({
      id: 'variables',
      title: 'Variable names',
      text: `Available Variables (names only — call search_variables(query) for a value):\n${varsStr}`
    });
  }

  const requestsStr = formatRequestsList(requests, { security });
  if (requestsStr) {
    parts.push({
      id: 'requests',
      title: 'Requests in this collection',
      text: `Requests in this collection (preview — call list_requests / search_requests for full details, use \`pathname\` with bru.ctx.runRequest):\n${requestsStr}`
    });
  }

  const activeLabel = CONTENT_LABELS[contentType] || 'Code';
  const activeContent = allContent[contentType] || '';
  if (activeContent.trim()) {
    parts.push({
      id: 'active-content',
      title: activeLabel,
      text: `Current ${activeLabel} (active tab — snapshot only; use read_content('${contentType}') to get the latest version before writing):\n\`\`\`\n${redactor.redact(activeContent)}\n\`\`\``
    });
  } else {
    parts.push({
      id: 'active-content',
      title: activeLabel,
      text: `The ${activeLabel} (active tab) is currently empty. Use read_content('${contentType}') before writing new content.`
    });
  }

  const others = Object.entries(allContent)
    .filter(([type, content]) => type !== contentType && content && content.trim());
  if (others.length > 0) {
    const summary = others
      .map(([type, content]) => `${CONTENT_LABELS[type] || type}:\n\`\`\`\n${redactor.redact(content)}\n\`\`\``)
      .join('\n\n');
    parts.push({ id: 'other-content', title: 'Other content in this request', text: `Other content in this request:\n${summary}` });
  }

  return parts;
};

// Everything one chat turn sends before the model asks for more. The stream and the preview both
// come through here. The redactor is returned because the model rewrites whole files from a
// redacted copy, and the stream must put the original values back into what it writes.
const assembleChatRequest = (payload, security) => {
  const { messages = [], allContent, contentType, requestContext, variables, requests, appEnabled } = payload || {};
  const normalizedContent = allContent || {};
  const effectiveType = contentType || 'app';
  const hasMultiple = Object.values(normalizedContent).filter((c) => c && c.trim()).length > 1;
  const redactor = createCodeRedactor(security);

  const contextParts = buildContextParts(effectiveType, normalizedContent, requestContext, variables, security, appEnabled, requests, redactor);
  const system = buildSystemPrompt(effectiveType, hasMultiple);
  const conversation = messages.map((m) => ({ role: m.role, content: m.content }));
  const allMessages = [{ role: 'user', content: contextParts.map((part) => part.text).join('\n\n') }, ...conversation];

  const sections = [
    { id: 'instructions', kind: 'instructions', title: 'Instructions to the assistant', text: system },
    ...contextParts.map((part) => ({ ...part, kind: 'context' })),
    ...conversation.map((m, index) => ({
      id: `message-${index}`,
      kind: 'conversation',
      title: m.role === 'user' ? 'Your message' : 'Earlier reply',
      text: m.content
    }))
  ];

  return { system, allMessages, sections, redactor, normalizedContent, effectiveType };
};

// What the assistant can ask for while it answers, described from the active redaction settings.
const describeOnDemandTools = (security) => {
  const policy = buildRedactionPolicy(security);
  return [
    {
      name: 'read_content',
      summary: 'Re-reads a section of this request (script, tests, docs or app) for its latest text.'
        + (policy.redactBody ? ' Credential-looking values stay hidden.' : '')
    },
    describeReadResponseTool(policy),
    SEARCH_VARIABLES_TOOL,
    {
      name: 'list_requests / search_requests',
      summary: 'Lists the requests of this collection with their names, methods and URLs.'
        + (policy.redactHeaders ? ' Credentials in URLs stay hidden.' : '')
    }
  ];
};

// The same pieces the stream sends, plus the size of each and how many values were hidden in it.
const previewChatRequest = (payload, { isAiEnabled, security }) => {
  if (!isAiEnabled()) {
    return { error: 'AI features are disabled. Enable them in Preferences > AI.' };
  }
  if (payload?.messages !== undefined && !Array.isArray(payload.messages)) {
    return { error: 'Invalid request: messages must be an array' };
  }

  const { sections } = assembleChatRequest(payload, security);
  return describePreview(sections, describeOnDemandTools(security));
};

// Defensive fallback: if the model returns a markdown code block instead of
// calling write_content, extract the fenced code so the UI still has something
// to diff against. The tool path is the primary route.
const extractFencedCode = (text) => {
  if (!text) return null;
  const fenced = text.match(/```(?:[\w-]+)?\s*\n([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : null;
};

const READ_PARAMS = z.object({
  type: z.string().describe('Section to read. One of: \'app\', \'tests\', \'pre-request\', \'post-response\', \'docs\'.')
});
const WRITE_PARAMS = z.object({
  type: z.string().describe('Section to write. One of: \'app\', \'tests\', \'pre-request\', \'post-response\', \'docs\'.'),
  content: z.string().describe('The complete new content for the section.')
});
const READ_RESPONSE_PARAMS = z.object({});
const SEARCH_VARS_PARAMS = z.object({
  query: z
    .string()
    .optional()
    .describe('Substring to match against variable names (case-insensitive). Omit to list the first 50 variables.')
});
const LIST_REQUESTS_PARAMS = z.object({});
const SEARCH_REQUESTS_PARAMS = z.object({
  query: z
    .string()
    .describe('Substring to match against request name, URL, pathname, folder path (case-insensitive), or an exact HTTP method like GET/POST.')
});

const registerChatIpc = ({ mainWindow, resolveModel, pickDefaultModelId, isAiEnabled }) => {
  ipcMain.on('renderer:ai-chat-stop', (_event, { requestId } = {}) => {
    const controller = activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      activeStreams.delete(requestId);
    }
  });

  ipcMain.handle('renderer:ai-chat-preview', (_event, payload) => {
    return previewChatRequest(payload, { isAiEnabled, security: getSecurityPrefs() });
  });

  ipcMain.on('renderer:ai-chat-stream', async (_event, payload) => {
    const { messages, requestContext, variables, requests, requestId, model: modelId, appEnabled } = payload || {};

    const send = (channel, data) => {
      if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
      }
    };

    // Validate payload shape upfront. Without this, a missing or wrong-typed
    // `messages` would throw out of the handler at `messages.map(...)` below,
    // bypassing the try/catch and never emitting `main:ai-chat-error` — the
    // renderer would then sit waiting on a stream that will never arrive.
    if (!requestId || typeof requestId !== 'string') {
      console.error('[AI] ai-chat-stream missing/invalid requestId, dropping payload');
      return;
    }
    if (!Array.isArray(messages)) {
      send('main:ai-chat-error', { requestId, error: 'Invalid request: messages must be an array' });
      return;
    }

    if (!isAiEnabled()) {
      send('main:ai-chat-error', { requestId, error: 'AI features are disabled. Enable them in Preferences > AI.' });
      return;
    }

    // Empty / 'auto' signals "let the backend pick" — resolves to the user's
    // configured default model, falling back to the first available.
    let effectiveModelId = modelId;
    if (!effectiveModelId || effectiveModelId === 'auto') {
      effectiveModelId = pickDefaultModelId();
      if (!effectiveModelId) {
        send('main:ai-chat-error', { requestId, error: 'No AI model available. Configure a provider in Preferences > AI.' });
        return;
      }
    }

    let model;
    try {
      model = resolveModel(effectiveModelId);
    } catch (err) {
      send('main:ai-chat-error', { requestId, error: err.message });
      return;
    }

    const security = getSecurityPrefs();
    const { system, allMessages, redactor, normalizedContent, effectiveType } = assembleChatRequest(payload, security);

    const readState = {};
    const writeResults = [];

    const tools = {
      read_content: {
        description: 'Read the current content of a section. MUST be called before write_content for the same type.',
        inputSchema: READ_PARAMS,
        execute: async ({ type }) => {
          const resolved = resolveContentType(type, effectiveType);
          const content = normalizedContent[resolved] || '';
          readState[resolved] = content;
          return redactor.redact(content) || `(empty — no existing content for '${resolved}')`;
        }
      },
      write_content: {
        description: 'Write complete updated content to a section. MUST call read_content for the same type first. The content parameter must be the COMPLETE file content, not a diff.',
        inputSchema: WRITE_PARAMS,
        execute: async ({ type, content: writtenByModel }) => {
          const resolved = resolveContentType(type, effectiveType);
          if (resolved === 'app' && appEnabled === false) {
            return APP_DISABLED_NOTICE;
          }
          // The model wrote this from a redacted copy: bring the user's real values back.
          const content = redactor.restore(writtenByModel);
          if (!(resolved in readState)) {
            // Tolerate models that skip read_content. We still record the
            // original snapshot so the diff renders correctly, but the UI
            // surfaces a warning when wasRead === false.
            readState[resolved] = normalizedContent[resolved] || '';
            writeResults.push({
              type: resolved,
              content,
              originalContent: readState[resolved],
              wasRead: false
            });
          } else {
            writeResults.push({
              type: resolved,
              content,
              originalContent: readState[resolved],
              wasRead: true
            });
          }
          return 'Success: Changes prepared for user review. The user will see a diff and can accept or reject your changes.';
        }
      },
      read_response: {
        description: 'Read the redacted shape of the response body from the last API request execution. Returns keys, array structure, and value types (as `<string>`, `<number>`, etc.) — actual values are stripped for user privacy. Use it to learn property paths and types when writing tests, scripts, or assertions; do not treat the placeholders as real values.',
        inputSchema: READ_RESPONSE_PARAMS,
        execute: async () => {
          const status = requestContext?.responseStatus;
          const data = requestContext?.responseData;
          if (!status && data == null) {
            return '(No response available — the request has not been executed yet. The user needs to run the request first.)';
          }
          const formatted = formatResponseShape(status, data, { security });
          return formatted || '(empty response)';
        }
      },
      search_variables: {
        description: 'Search environment / collection / global / runtime variables by name (case-insensitive substring match). Use this when the user has many variables or you need to confirm a name before referencing it in code. Values are returned, but variables marked `secret` (or whose names match patterns like `*_token`, `*_secret`, `password`, etc.) come back as `<redacted>`. Each result has a `scope` field — use it to pick the right runtime accessor: `bru.getEnvVar` for `env`, `bru.getGlobalEnvVar` for `global`, `bru.getCollectionVar` / `bru.getFolderVar` / `bru.getRequestVar` for `collection`, `bru.getVar` for `runtime`, and `bru.getSecretVar` for any value that came back redacted. Never hard-code a returned value.',
        inputSchema: SEARCH_VARS_PARAMS,
        execute: async ({ query }) => {
          if (!Array.isArray(variables) || variables.length === 0) {
            return '(No variables available — the collection has no environment, runtime, or collection variables defined.)';
          }
          const result = searchVariables(variables, query);
          return formatSearchVariablesResult(result, query, { security });
        }
      },
      list_requests: {
        description: 'List every HTTP / GraphQL / gRPC / WebSocket request in this collection. Returns each request\'s name, method, url, folder path, and `pathname`. Use `pathname` — never the name — when generating code that calls `bru.ctx.runRequest(pathname)` (collection/folder-level apps) or when telling the user which file to open. Prefer search_requests when the collection is large or you already know a keyword.',
        inputSchema: LIST_REQUESTS_PARAMS,
        execute: async () => {
          if (!Array.isArray(requests) || requests.length === 0) {
            return '(No requests in this collection.)';
          }
          return formatSearchRequestsResult(searchRequests(requests, ''), '', { security });
        }
      },
      search_requests: {
        description: 'Search this collection\'s requests by a case-insensitive substring matched against name / url / pathname / folder path (or an exact HTTP method like GET/POST). Returns each match\'s name, method, url, folder path, and `pathname`. Use `pathname` verbatim when generating `bru.ctx.runRequest(pathname)` calls for a collection/folder-level app.',
        inputSchema: SEARCH_REQUESTS_PARAMS,
        execute: async ({ query }) => {
          if (!Array.isArray(requests) || requests.length === 0) {
            return '(No requests in this collection.)';
          }
          const result = searchRequests(requests, query);
          return formatSearchRequestsResult(result, query, { security });
        }
      }
    };

    const controller = new AbortController();
    activeStreams.set(requestId, controller);
    let fullText = '';

    const finishWithWrites = () => {
      const primary = writeResults[writeResults.length - 1];
      send('main:ai-chat-complete', {
        requestId,
        message: redactor.restore(fullText) || 'Here are the proposed changes:',
        code: primary.content,
        contentType: primary.type,
        writes: writeResults.map((w) => ({
          type: w.type,
          content: w.content,
          originalContent: w.originalContent,
          wasRead: w.wasRead
        }))
      });
    };

    try {
      const result = streamText({
        model,
        system,
        messages: allMessages,
        tools,
        stopWhen: stepCountIs(8),
        toolChoice: 'auto',
        maxOutputTokens: isBuiltInModelId(effectiveModelId) ? 16000 : undefined,
        abortSignal: controller.signal
      });

      let streamError = null;
      for await (const part of result.fullStream) {
        if (controller.signal.aborted) break;
        switch (part.type) {
          case 'text-delta': {
            fullText += part.text;
            send('main:ai-chat-chunk', { requestId, chunk: part.text, fullText: redactor.restore(fullText) });
            break;
          }
          case 'tool-call': {
            const input = part.input || {};
            const toolType = input.type || effectiveType;
            const label = TOOL_LABELS[part.toolName]?.[toolType]
              || TOOL_LABELS[part.toolName]?.default
              || `Running ${part.toolName}`;
            send('main:ai-chat-tool-activity', {
              requestId,
              toolName: part.toolName,
              toolArgs: input,
              label
            });
            break;
          }
          case 'tool-result': {
            send('main:ai-chat-tool-done', { requestId, toolName: part.toolName });
            break;
          }
          case 'error': {
            streamError = part.error;
            break;
          }
          default:
            break;
        }
      }

      if (streamError) throw streamError;

      activeStreams.delete(requestId);

      if (controller.signal.aborted) {
        send('main:ai-chat-stopped', { requestId, message: redactor.restore(fullText) });
        return;
      }

      if (writeResults.length > 0) {
        finishWithWrites();
        return;
      }

      if (fullText.trim()) {
        const restoredText = redactor.restore(fullText);
        const fallback = extractFencedCode(restoredText);
        send('main:ai-chat-complete', {
          requestId,
          message: restoredText,
          code: fallback,
          contentType: effectiveType
        });
        return;
      }

      send('main:ai-chat-complete', {
        requestId,
        message: 'I wasn\'t able to generate a response. Could you try rephrasing your request?',
        code: null,
        contentType: effectiveType
      });
    } catch (error) {
      activeStreams.delete(requestId);

      if (error?.name === 'AbortError' || controller.signal.aborted) {
        send('main:ai-chat-stopped', { requestId, message: redactor.restore(fullText) });
        return;
      }

      // The AI SDK may surface a stream error after the model successfully
      // emitted tool calls. Treat partial writes as the result so the user
      // doesn't lose them.
      if (writeResults.length > 0) {
        console.warn(`[AI] Stream error after successful writes (${error.message}), surfacing writes`);
        finishWithWrites();
        return;
      }

      console.error('[AI] Chat stream error:', error);
      send('main:ai-chat-error', {
        requestId,
        error: error?.message || 'Failed to get AI response'
      });
    }
  });
};

module.exports = registerChatIpc;
module.exports.previewChatRequest = previewChatRequest;
module.exports.assembleChatRequest = assembleChatRequest;
