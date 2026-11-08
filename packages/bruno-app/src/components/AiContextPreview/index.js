import React from 'react';
import { IconX } from '@tabler/icons';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const HIDDEN_VALUE_PATTERN = /(<redacted(?::\d+)?>)/;

export const formatTokens = (tokens) => {
  if (tokens < 1000) return String(tokens);
  return `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`;
};

export const describeHidden = (count) => {
  if (count === 0) return 'no values hidden';
  return count === 1 ? '1 value hidden' : `${count} values hidden`;
};

// Hidden values are drawn as marks so the user can see where something was held back.
const MarkedText = ({ text }) => text.split(HIDDEN_VALUE_PATTERN).map((part, index) => (
  index % 2 === 1
    ? <mark key={index} className="ctx-hidden-value">{part}</mark>
    : <React.Fragment key={index}>{part}</React.Fragment>
));

/**
 * What would be sent to the AI provider, section by section. It only displays a preview that the
 * main process already built with the same code as the real request; it never builds one itself.
 *
 * With `onConfirm` it becomes a review step and asks for approval; without it, it is a read-only
 * look that the user can close.
 */
const AiContextPreview = ({
  preview,
  error,
  isLoading = false,
  title = 'What will be sent',
  confirmLabel = 'Send',
  onConfirm,
  onClose
}) => {
  const isReview = typeof onConfirm === 'function';
  const canConfirm = isReview && !isLoading && !error && Boolean(preview);

  return (
    <StyledWrapper role="region" aria-label={title} data-testid="ai-context-preview">
      <div className="ctx-header">
        <div className="ctx-heading">
          <span className="ctx-title">{title}</span>
          {preview && (
            <span className="ctx-summary" data-testid="ai-context-preview-summary">
              {`about ${formatTokens(preview.totals.approximateTokens)} tokens · ${describeHidden(preview.totals.hidden)}`}
            </span>
          )}
        </div>
        {!isReview && (
          <button
            type="button"
            className="ctx-close"
            onClick={onClose}
            aria-label="Close preview"
            data-testid="ai-context-preview-close"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <div className="ctx-body">
        {isLoading && <div className="ctx-state">Preparing the preview…</div>}
        {!isLoading && error && <div className="ctx-state is-error" role="alert">{error}</div>}

        {!isLoading && !error && preview && preview.sections.map((section) => (
          <details
            key={section.id}
            className="ctx-section"
            open={section.kind === 'conversation'}
            data-testid={`ai-context-section-${section.id}`}
          >
            <summary>
              <span className="ctx-section-title">{section.title}</span>
              <span className="ctx-section-meta">
                {`${section.characters.toLocaleString('en-US')} characters`}
                {section.hidden > 0 && <span className="ctx-section-hidden">{` · ${section.hidden} hidden`}</span>}
              </span>
            </summary>
            <pre className="ctx-section-text"><MarkedText text={section.text} /></pre>
          </details>
        ))}

        {!isLoading && !error && preview && preview.onDemand.length > 0 && (
          <div className="ctx-on-demand">
            <div className="ctx-on-demand-title">The assistant may also ask for</div>
            <ul>
              {preview.onDemand.map((tool) => (
                <li key={tool.name}>
                  <code>{tool.name}</code>
                  {tool.summary}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isReview && (
        <div className="ctx-footer">
          <Button variant="ghost" color="secondary" size="sm" rounded="sm" onClick={onClose} data-testid="ai-context-preview-cancel">
            Cancel
          </Button>
          <Button size="sm" rounded="sm" disabled={!canConfirm} onClick={onConfirm} data-testid="ai-context-preview-confirm">
            {confirmLabel}
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default AiContextPreview;
