import { relativeDate } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const formatDate = (date) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** The basics of a commit, shown while the pointer is on its node in the graph. */
const CommitTooltip = ({ commit, left }) => (
  <StyledWrapper style={{ left }} role="tooltip" data-testid="git-commit-tooltip">
    <div className="tooltip-message">{commit.message}</div>
    <div className="tooltip-line">{commit.author}</div>
    <div className="tooltip-line">
      {formatDate(commit.date)} · {relativeDate(commit.date)}
    </div>
    <div className="tooltip-line">
      <span className="tooltip-hash">{commit.hash.slice(0, 7)}</span>
      {commit.refs.length > 0 && ` · ${commit.refs.join(', ')}`}
      {commit.parents.length > 1 && ' · merge'}
    </div>
  </StyledWrapper>
);

export default CommitTooltip;
