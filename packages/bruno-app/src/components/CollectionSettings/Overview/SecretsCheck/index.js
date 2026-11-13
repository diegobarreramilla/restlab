import { useState } from 'react';
import { IconKey, IconChevronDown, IconChevronRight } from '@tabler/icons';
import useSecretFindings from 'hooks/useSecretFindings';
import StyledWrapper from './StyledWrapper';

const MAX_ROWS = 50;

const KIND_LABELS = {
  'private-key': 'private key',
  'jwt': 'token',
  'provider-token': 'access token',
  'password-in-url': 'password in the URL',
  'unmarked-environment-secret': 'not marked as secret',
  'plain-credential': 'typed in directly'
};

// Appears only when something in the collection looks like a credential written in plain text, and says where.
// The values themselves are never shown.
const SecretsCheck = ({ collection }) => {
  const findings = useSecretFindings(collection);
  const [isOpen, setIsOpen] = useState(false);

  if (!findings.length) {
    return null;
  }

  const summary = findings.length === 1
    ? '1 value looks like a secret stored in plain text'
    : `${findings.length} values look like secrets stored in plain text`;

  return (
    <StyledWrapper data-testid="secrets-check">
      <button
        type="button"
        className="secrets-summary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-testid="secrets-check-toggle"
      >
        <IconKey size={16} strokeWidth={1.5} className="flex-shrink-0" />
        <span className="flex-1">{summary}</span>
        {isOpen ? <IconChevronDown size={14} strokeWidth={1.5} /> : <IconChevronRight size={14} strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div className="secrets-list" data-testid="secrets-check-list">
          {findings.slice(0, MAX_ROWS).map((finding) => (
            <div key={`${finding.path.join('/')}|${finding.field}`} className="secrets-row" data-testid="secrets-check-row">
              {finding.path.join(' / ')} · <span className="secrets-field">{finding.field}</span> · {KIND_LABELS[finding.kind]}
            </div>
          ))}
          {findings.length > MAX_ROWS && <div className="secrets-row">and {findings.length - MAX_ROWS} more</div>}
          <div className="secrets-advice">
            Use a <code>{'{{variable}}'}</code> instead, or mark the environment variable as secret so its value stays out of the collection files.
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default SecretsCheck;
