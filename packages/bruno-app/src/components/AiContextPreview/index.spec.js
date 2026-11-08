import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

jest.mock('./StyledWrapper', () => ({ children, ...rest }) => <div {...rest}>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick, disabled, ...rest }) => (
  <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
));

import AiContextPreview, { formatTokens, describeHidden } from './index';

const preview = {
  sections: [
    { id: 'instructions', kind: 'instructions', title: 'Instructions to the assistant', text: 'You help with API requests.', characters: 27, hidden: 0 },
    { id: 'active-content', kind: 'context', title: 'Test Code', text: 'const apiKey = \'<redacted:1>\';\nconst page = 2;', characters: 1234, hidden: 1 },
    { id: 'message-0', kind: 'conversation', title: 'Your message', text: 'add a status test', characters: 17, hidden: 0 }
  ],
  onDemand: [{ name: 'read_response', summary: 'Reads the structure of the last response, never the values.' }],
  totals: { characters: 1278, approximateTokens: 320, hidden: 1 }
};

describe('formatting helpers', () => {
  it('writes token counts in a short form', () => {
    expect(formatTokens(840)).toBe('840');
    expect(formatTokens(3200)).toBe('3.2k');
    expect(formatTokens(2000)).toBe('2k');
  });

  it('says plainly how many values were held back', () => {
    expect(describeHidden(0)).toBe('nothing hidden');
    expect(describeHidden(1)).toBe('hidden in 1 place');
    expect(describeHidden(5)).toBe('hidden in 5 places');
  });
});

describe('AiContextPreview as a read-only look', () => {
  it('summarizes the size and the hidden values', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByTestId('ai-context-preview-summary')).toHaveTextContent('about 320 tokens · hidden in 1 place');
  });

  it('lists every section with its title and size, and marks how many values were hidden', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    const section = screen.getByTestId('ai-context-section-active-content');
    expect(within(section).getByText('Test Code')).toBeInTheDocument();
    expect(section).toHaveTextContent('1,234 characters');
    expect(section).toHaveTextContent('1 hidden');
  });

  it('opens only the user message at first and keeps the long instructions folded', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByTestId('ai-context-section-message-0')).toHaveAttribute('open');
    expect(screen.getByTestId('ai-context-section-instructions')).not.toHaveAttribute('open');
    expect(screen.getByTestId('ai-context-section-active-content')).not.toHaveAttribute('open');
  });

  it('draws each hidden value as a mark, so it is visible where something was held back', () => {
    const { container } = render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    const marks = container.querySelectorAll('mark.ctx-hidden-value');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('<redacted:1>');
  });

  it('does not mark placeholder-looking text in a section that hid nothing, such as the fixed instructions', () => {
    const withMention = {
      ...preview,
      sections: [
        { id: 'instructions', kind: 'instructions', title: 'Instructions to the assistant', text: 'Secrets come back as <redacted>.', characters: 32, hidden: 0 },
        ...preview.sections.slice(1)
      ]
    };
    const { container } = render(<AiContextPreview preview={withMention} onClose={jest.fn()} />);

    expect(container.querySelectorAll('mark.ctx-hidden-value')).toHaveLength(1);
    expect(screen.getByTestId('ai-context-section-instructions')).toHaveTextContent('Secrets come back as <redacted>.');
  });

  it('explains that the same value shown twice counts twice', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByTestId('ai-context-preview-summary')).toHaveAttribute('title', expect.stringContaining('same value shown twice'));
  });

  it('can leave out its own close button when the host already offers a way back', () => {
    render(<AiContextPreview preview={preview} showClose={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('ai-context-preview-close')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-context-preview')).toBeInTheDocument();
  });

  it('folds the list of on-demand requests at first to save room', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByTestId('ai-context-on-demand')).not.toHaveAttribute('open');
  });

  it('lists what the assistant may ask for on demand', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByText('The assistant may also ask for')).toBeInTheDocument();
    expect(screen.getByText('read_response')).toBeInTheDocument();
    expect(screen.getByText(/never the values/)).toBeInTheDocument();
  });

  it('closes from the header and offers no approval buttons', () => {
    const onClose = jest.fn();
    render(<AiContextPreview preview={preview} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('ai-context-preview-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ai-context-preview-confirm')).not.toBeInTheDocument();
  });

  it('is a labelled region', () => {
    render(<AiContextPreview preview={preview} onClose={jest.fn()} />);

    expect(screen.getByRole('region', { name: 'What will be sent' })).toBeInTheDocument();
  });
});

describe('AiContextPreview as a review step', () => {
  it('asks for approval and sends only when the user confirms', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<AiContextPreview preview={preview} onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('ai-context-preview-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets the user back out without sending', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<AiContextPreview preview={preview} onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('ai-context-preview-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cannot be confirmed while loading, on error, or without a preview', () => {
    const { rerender } = render(<AiContextPreview isLoading onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('ai-context-preview-confirm')).toBeDisabled();
    expect(screen.getByText('Preparing the preview…')).toBeInTheDocument();

    rerender(<AiContextPreview error="AI features are disabled." onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('ai-context-preview-confirm')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('AI features are disabled.');

    rerender(<AiContextPreview preview={preview} onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('ai-context-preview-confirm')).toBeEnabled();
  });

  it('uses the label it is given for the approval button', () => {
    render(<AiContextPreview preview={preview} confirmLabel="Generate" onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('ai-context-preview-confirm')).toHaveTextContent('Generate');
  });
});
