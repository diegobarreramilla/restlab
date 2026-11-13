import { useState } from 'react';
import classnames from 'classnames';
import { IconGitBranch, IconCaretDown, IconArrowDown, IconArrowUp, IconRefresh, IconCloudDownload } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import Button from 'ui/Button';
import useGitRepository from 'hooks/useGitRepository';
import Changes from './Changes';
import History from './History';
import Blame from './Blame';
import Stashes from './Stashes';
import StyledWrapper from './StyledWrapper';

const NEW_BRANCH_ID = 'git-new-branch';

/**
 * Version control for this collection. It only ever shows and touches the collection's own folder, even when
 * the repository around it holds more.
 */
const Git = ({ collection }) => {
  const git = useGitRepository(collection.pathname);
  const { overview, run, refresh } = git;
  const [view, setView] = useState('changes');
  const [isNamingBranch, setIsNamingBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [syncing, setSyncing] = useState(null);

  if (!overview) {
    return null;
  }

  if (!overview.gitAvailable) {
    return (
      <StyledWrapper>
        <div className="placeholder" data-testid="git-not-installed">
          <p>Git is not installed on this computer, or it is not on the PATH. Install it to keep the history of this collection.</p>
        </div>
      </StyledWrapper>
    );
  }

  if (!overview.isRepository) {
    return (
      <StyledWrapper>
        <div className="placeholder" data-testid="git-not-a-repository">
          <p>
            This collection is not under version control yet. A repository keeps every version of your requests on this
            computer, so you can see what changed, who changed it and go back.
          </p>
          <Button size="sm" onClick={() => run('init')} data-testid="git-init">
            Start tracking changes
          </Button>
        </div>
      </StyledWrapper>
    );
  }

  const sync = async (action) => {
    setSyncing(action);
    await run('sync', { action });
    setSyncing(null);
  };

  const createBranch = async () => {
    const { ok } = await run('checkout-branch', { branchName: branchName.trim(), create: true });
    if (ok) {
      setBranchName('');
      setIsNamingBranch(false);
    }
  };

  const branchItems = [
    {
      name: 'Switch branch',
      options: overview.branches.map((branch) => ({
        id: branch,
        label: branch,
        onClick: () => branch !== overview.currentBranch && run('checkout-branch', { branchName: branch })
      }))
    },
    { name: '', options: [{ id: NEW_BRANCH_ID, label: 'New branch…', onClick: () => setIsNamingBranch(true) }] }
  ];

  const pendingCount = overview.staged.length + overview.unstaged.length + overview.conflicted.length;
  const views = [
    { id: 'changes', label: pendingCount ? `Changes · ${pendingCount}` : 'Changes' },
    { id: 'history', label: 'History' },
    { id: 'requests', label: 'By request' },
    { id: 'stashes', label: 'Put aside' }
  ];

  return (
    <StyledWrapper data-testid="git-panel">
      <div className="git-bar">
        <MenuDropdown items={branchItems} selectedItemId={overview.currentBranch} data-testid="git-branch-menu">
          <button type="button" className="branch-button" data-testid="git-branch">
            <IconGitBranch size={14} strokeWidth={1.5} />
            <span className="branch-name">{overview.currentBranch || 'No branch'}</span>
            <IconCaretDown size={12} strokeWidth={2} />
          </button>
        </MenuDropdown>

        {overview.hasRemote && (
          <>
            <button type="button" className="bar-action" onClick={() => sync('pull')} disabled={Boolean(syncing)} title="Get the commits of the remote" data-testid="git-pull">
              <IconArrowDown size={14} strokeWidth={1.5} />
              Pull{overview.behind ? ` ${overview.behind}` : ''}
            </button>
            <button type="button" className="bar-action" onClick={() => sync('push')} disabled={Boolean(syncing)} title="Send your commits to the remote" data-testid="git-push">
              <IconArrowUp size={14} strokeWidth={1.5} />
              Push{overview.ahead ? ` ${overview.ahead}` : ''}
            </button>
            <button type="button" className="bar-action" onClick={() => sync('fetch')} disabled={Boolean(syncing)} title="Check the remote for new commits" data-testid="git-fetch">
              <IconCloudDownload size={14} strokeWidth={1.5} />
              Fetch
            </button>
          </>
        )}

        <span className="bar-spacer" />
        <button type="button" className="bar-action" onClick={refresh} title="Reload" data-testid="git-refresh">
          <IconRefresh size={14} strokeWidth={1.5} />
        </button>
      </div>

      {isNamingBranch && (
        <div className="new-branch">
          <input
            className="new-branch-name"
            placeholder="New branch name"
            value={branchName}
            autoFocus
            onChange={(event) => setBranchName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && branchName.trim()) createBranch();
              if (event.key === 'Escape') setIsNamingBranch(false);
            }}
            data-testid="git-new-branch-name"
          />
          <Button size="sm" onClick={createBranch} disabled={!branchName.trim()} data-testid="git-new-branch-create">
            Create branch
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsNamingBranch(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="views" role="tablist">
        {views.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={classnames('view', { active: view === id })}
            onClick={() => setView(id)}
            data-testid={`git-view-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'changes' && <Changes collection={collection} git={git} />}
      {view === 'history' && <History collection={collection} git={git} />}
      {view === 'requests' && <Blame collection={collection} git={git} />}
      {view === 'stashes' && <Stashes git={git} />}
    </StyledWrapper>
  );
};

export default Git;
