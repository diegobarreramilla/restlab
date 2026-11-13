import { useState } from 'react';
import { diffLines } from 'diff';
import EndpointVisualDiff from 'components/OpenAPISyncTab/EndpointChangeSection/EndpointVisualDiff';
import useGitQuery from 'hooks/useGitQuery';
import StyledWrapper from './StyledWrapper';

const LABELS = {
  unstaged: ['Last commit', 'Your changes'],
  staged: ['Last commit', 'Staged'],
  commit: ['Before', 'After'],
  conflict: ['Yours', 'Theirs']
};

const toLines = (text) => text.replace(/\n$/, '').split('\n');

const TextDiff = ({ oldContent, newContent }) => {
  const parts = diffLines(oldContent || '', newContent || '');
  return (
    <pre className="diff-text" data-testid="git-diff-text">
      {parts.flatMap((part, partIndex) =>
        toLines(part.value).map((line, lineIndex) => {
          const kind = part.added ? 'added' : part.removed ? 'removed' : 'same';
          const sign = part.added ? '+' : part.removed ? '-' : ' ';
          return (
            <div key={`${partIndex}-${lineIndex}`} className={`diff-line ${kind}`}>
              {sign} {line}
            </div>
          );
        })
      )}
    </pre>
  );
};

/**
 * What changed in one file. A request is compared as a request (URL, headers, body...); every file can also be
 * seen as text, which is the only view for files that are not requests.
 */
const FileDiff = ({ git, filePath, title, source, commitHash }) => {
  const { data, loading } = useGitQuery({
    invoke: git.invoke,
    action: 'diff',
    payload: { filePath, source, commitHash },
    version: git.version
  });
  const [showText, setShowText] = useState(false);

  const isRequest = Boolean(data?.oldParsed || data?.newParsed);
  const [oldLabel, newLabel] = LABELS[source];
  const asText = showText || !isRequest;

  return (
    <StyledWrapper data-testid="git-file-diff">
      <div className="diff-header">
        <span>{title}</span>
        {isRequest && (
          <button type="button" className="diff-toggle" onClick={() => setShowText(!showText)} data-testid="git-diff-toggle">
            {showText ? 'Show as request' : 'Show as text'}
          </button>
        )}
      </div>
      {loading && !data ? (
        <div className="diff-empty">Loading…</div>
      ) : !data ? (
        <div className="diff-empty">This change could not be loaded.</div>
      ) : asText ? (
        <TextDiff oldContent={data.oldContent} newContent={data.newContent} />
      ) : (
        <div className="diff-body">
          <EndpointVisualDiff oldData={data.oldParsed || {}} newData={data.newParsed || {}} leftLabel={oldLabel} rightLabel={newLabel} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default FileDiff;
