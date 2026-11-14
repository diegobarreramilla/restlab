import { useMemo, useState } from 'react';
import { compareResponses, listComparableSends } from 'utils/response-compare';
import StyledWrapper from './StyledWrapper';

const SIGNS = { added: '+', removed: '-', same: ' ' };
const HEADER_CHANGE_LABELS = { added: 'added', removed: 'removed', changed: 'changed' };

const describeSend = (send, isLatest) => {
  const time = new Date(send.timestamp).toLocaleTimeString();
  return `${time} · ${send.response.status}${isLatest ? ' · latest' : ''}`;
};

const SendPicker = ({ label, sends, value, onChange, testId }) => (
  <label className="flex items-center gap-2">
    {label}
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} data-testid={testId}>
      {sends.map((send, index) => (
        <option key={send.timestamp} value={send.timestamp}>{describeSend(send, index === 0)}</option>
      ))}
    </select>
  </label>
);

const BodyComparison = ({ body }) => {
  if (!body.comparable) {
    const what = body.reason === 'binary' ? 'The body is not text' : 'The bodies are too long to compare line by line';
    return <div className="compare-note" data-testid="response-compare-body-note">{what}; {body.identical ? 'it is the same in both.' : 'it differs.'}</div>;
  }
  if (body.identical) {
    return <div className="compare-note" data-testid="response-compare-body-note">The body is the same in both.</div>;
  }
  return (
    <pre className="compare-body" data-testid="response-compare-body">
      {body.rows.map((row, index) =>
        row.kind === 'gap' ? (
          <div key={index} className="body-line gap">{row.count} unchanged {row.count === 1 ? 'line' : 'lines'}</div>
        ) : (
          <div key={index} className={`body-line ${row.kind}`}>{SIGNS[row.kind]} {row.text}</div>
        )
      )}
    </pre>
  );
};

// Shows what changed between two answers of this request, taken from the sends the Timeline keeps.
const ResponseCompare = ({ collection, item }) => {
  const sends = useMemo(() => listComparableSends(collection.timeline, item.uid), [collection.timeline, item.uid]);
  const [picked, setPicked] = useState({});

  const after = sends.find((send) => send.timestamp === picked.after) || sends[0];
  const before = sends.find((send) => send.timestamp === picked.before) || sends.find((send) => send !== after);

  const comparison = useMemo(
    () => (before && after ? compareResponses(before.response, after.response) : null),
    [before, after]
  );

  if (!comparison) {
    return (
      <StyledWrapper data-testid="response-compare">
        <div className="compare-empty">Send this request at least twice to compare its answers.</div>
      </StyledWrapper>
    );
  }

  const { status, headers, body } = comparison;

  return (
    <StyledWrapper data-testid="response-compare">
      <div className="compare-pickers">
        <SendPicker label="Compare" sends={sends} value={after.timestamp} onChange={(timestamp) => setPicked({ ...picked, after: timestamp })} testId="response-compare-after" />
        <SendPicker label="with" sends={sends} value={before.timestamp} onChange={(timestamp) => setPicked({ ...picked, before: timestamp })} testId="response-compare-before" />
      </div>

      {comparison.identical ? (
        <div className="compare-note" data-testid="response-compare-identical">Both answers are the same: status, headers and body.</div>
      ) : (
        <>
          <div data-testid="response-compare-status">
            <div className="compare-section-title">Status</div>
            {status.changed ? (
              <><span className="status-before">{status.before}</span>{status.after}</>
            ) : (
              <span className="compare-note">{status.after}, the same in both.</span>
            )}
          </div>

          <div data-testid="response-compare-headers">
            <div className="compare-section-title">Headers</div>
            {headers.length === 0 ? (
              <span className="compare-note">The same in both.</span>
            ) : (
              headers.map((header) => (
                <div key={header.name} className="header-row" data-testid="response-compare-header">
                  <span className="header-change">{HEADER_CHANGE_LABELS[header.change]}</span>
                  <span>
                    <span className="header-name">{header.name}</span>{': '}
                    {header.before !== undefined ? <span className="header-before">{header.before}</span> : null}
                    {header.before !== undefined && header.after !== undefined ? ' ' : null}
                    {header.after}
                  </span>
                </div>
              ))
            )}
          </div>

          <div>
            <div className="compare-section-title">
              Body{body.comparable && !body.identical ? ` · ${body.added} added, ${body.removed} removed` : ''}
            </div>
            <BodyComparison body={body} />
          </div>
        </>
      )}
    </StyledWrapper>
  );
};

export default ResponseCompare;
