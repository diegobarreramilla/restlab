import { Page } from '../../../playwright';

/**
 * Locators for the "What's sent" panel that shows what an AI request would send, and for the two
 * places that open it: the generation popup and the chat composer.
 */
export const buildAiPreviewLocators = (page: Page) => ({
  /** The panel itself, in the generation popup or in the chat sidebar */
  panel: () => page.getByTestId('ai-context-preview'),
  /** "about N tokens · M values hidden" */
  summary: () => page.getByTestId('ai-context-preview-summary'),
  /** One titled piece of the request (instructions, request, variables, ...) */
  section: (id: string) => page.getByTestId(`ai-context-section-${id}`),
  /** The clickable header of a section, which folds and unfolds it */
  sectionHeader: (id: string) => page.getByTestId(`ai-context-section-${id}`).locator('summary'),
  /** The text a section would send */
  sectionText: (id: string) => page.getByTestId(`ai-context-section-${id}`).locator('pre'),
  /** The marks that show where a value was held back */
  hiddenMarks: () => page.getByTestId('ai-context-preview').locator('mark'),
  /** Approval buttons, present only in the review step */
  confirm: () => page.getByTestId('ai-context-preview-confirm'),
  cancel: () => page.getByTestId('ai-context-preview-cancel'),
  /** Close button, present only in the read-only look */
  close: () => page.getByTestId('ai-context-preview-close'),

  generation: {
    /** The "What's sent" link in the generation popup */
    toggle: () => page.getByTestId('ai-assist-preview-toggle'),
    promptInput: () => page.getByPlaceholder('Describe what you want to generate...'),
    generateButton: () => page.getByRole('button', { name: 'Generate', exact: true })
  },

  chat: {
    /** The sparkles button in the collection header that opens the chat sidebar */
    sidebarToggle: () => page.getByTestId('ai-assistant'),
    composer: () => page.locator('.ai-sidebar-input textarea'),
    /** The "What's sent" button next to Send */
    toggle: () => page.getByTestId('ai-preview-toggle')
  }
});
