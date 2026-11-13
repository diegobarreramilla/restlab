import { useState } from 'react';
import Button from 'ui/Button';
import { relativeDate } from 'utils/common';
import useGitQuery from 'hooks/useGitQuery';
import StyledWrapper from './StyledWrapper';

/** Put unfinished changes aside and bring them back later, for example to switch branch with a clean collection. */
const Stashes = ({ git }) => {
  const { overview, run } = git;
  const { data: stashes } = useGitQuery({ invoke: git.invoke, action: 'stash-list', version: git.version });
  const [message, setMessage] = useState('');

  const hasChanges = overview.staged.length + overview.unstaged.length > 0;

  const create = async () => {
    const { ok } = await run('stash-create', { message });
    if (ok) {
      setMessage('');
    }
  };

  return (
    <StyledWrapper data-testid="git-stashes">
      <div className="stash-form">
        <input
          className="stash-message"
          placeholder="Name for these changes (optional)"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          data-testid="git-stash-message"
        />
        <Button size="sm" variant="outline" onClick={create} disabled={!hasChanges} data-testid="git-stash-create">
          Put changes aside
        </Button>
      </div>
      <div className="hint">
        {hasChanges
          ? 'Putting changes aside takes every pending change in the repository out of the files until you bring it back.'
          : 'There are no pending changes to put aside.'}
      </div>

      {stashes?.map((stash) => (
        <div key={stash.hash} className="stash" data-testid="git-stash-row">
          <span className="stash-name">{stash.message}</span>
          <span className="stash-meta">{relativeDate(stash.date)}</span>
          <button type="button" className="stash-action" onClick={() => run('stash-apply', { index: stash.index })} data-testid="git-stash-apply">
            Bring back
          </button>
          <button type="button" className="stash-action danger" onClick={() => run('stash-drop', { index: stash.index })} data-testid="git-stash-drop">
            Delete
          </button>
        </div>
      ))}
      {stashes && !stashes.length && <div className="empty">Nothing put aside.</div>}
    </StyledWrapper>
  );
};

export default Stashes;
