import { useState } from 'react';
import Button from 'ui/Button';
import useSecretFindings from 'hooks/useSecretFindings';
import { describeRepositoryFile } from 'utils/git-collection';
import FileRow from '../FileRow';
import FileDiff from '../FileDiff';
import StyledWrapper from './StyledWrapper';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const MAX_NAMES_IN_SUMMARY = 5;

// "ping, list users and 3 more": enough to recognize the commit without repeating the whole list.
const listNames = (names) => {
  const shown = names.slice(0, MAX_NAMES_IN_SUMMARY).join(', ');
  return names.length > MAX_NAMES_IN_SUMMARY ? `${shown} and ${names.length - MAX_NAMES_IN_SUMMARY} more` : shown;
};

/**
 * What is different from the last commit, in two lists like any Git client: what will go into the next commit
 * and what will not yet. Selecting a file shows its change below.
 */
const Changes = ({ collection, git }) => {
  const { overview, run } = git;
  const secretFindings = useSecretFindings(collection);
  const [selected, setSelected] = useState(null);
  const [discarding, setDiscarding] = useState(null);
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const { staged, unstaged, conflicted } = overview;
  const describe = (file) => describeRepositoryFile(collection, overview, file.path);
  const isSelected = (file, source) => selected?.path === file.path && selected?.source === source;
  const stillListed = selected && (selected.source === 'staged' ? staged : unstaged).some((file) => file.path === selected.path);

  const discard = async (file) => {
    if (discarding !== file.path) {
      setDiscarding(file.path);
      return;
    }
    setDiscarding(null);
    await run('discard', { files: [file.path] });
  };

  const commit = async () => {
    setIsCommitting(true);
    const { ok } = await run('commit', { message });
    setIsCommitting(false);
    if (ok) {
      setMessage('');
      setSelected(null);
    }
  };

  const hasNothing = !staged.length && !unstaged.length && !conflicted.length && !overview.isMerging;
  const selectedConflict = selected?.source === 'conflict' && conflicted.some((file) => file.path === selected.path);
  const canFinishMerge = overview.isMerging && !conflicted.length && !overview.conflictedOutsideCollection;

  return (
    <StyledWrapper data-testid="git-changes">
      {overview.isMerging && (
        <div className="conflicts" data-testid="git-conflicts">
          <div>
            {conflicted.length > 0
              ? `A merge stopped because both sides changed ${conflicted.length === 1 ? 'the same file' : 'the same files'}. Choose which version to keep for each one.`
              : overview.conflictedOutsideCollection > 0
                ? `Nothing is in conflict in this collection, but ${plural(overview.conflictedOutsideCollection, 'file')} elsewhere in the repository still ${overview.conflictedOutsideCollection === 1 ? 'is' : 'are'}.`
                : 'Every conflict is settled. Finish the merge to save the result.'}
          </div>
          <div className="conflict-actions">
            {canFinishMerge && (
              <Button size="sm" onClick={() => run('finish-merge')} data-testid="git-finish-merge">
                Finish merge
              </Button>
            )}
            <button type="button" className="section-action" onClick={() => run('abort-merge')} data-testid="git-abort-merge">
              Abort merge
            </button>
          </div>
        </div>
      )}

      {conflicted.length > 0 && (
        <>
          <div className="section-head">
            <span>In conflict · {conflicted.length}</span>
          </div>
          <div role="listbox" data-testid="git-conflicted-list">
            {conflicted.map((file) => {
              const { name, pathInCollection } = describe(file);
              return (
                <FileRow
                  key={file.path}
                  name={name}
                  path={pathInCollection}
                  status="conflicted"
                  selected={isSelected(file, 'conflict')}
                  onSelect={() => setSelected({ path: file.path, source: 'conflict', title: name })}
                  actions={[
                    { label: 'Keep mine', onClick: () => run('resolve-conflict', { filePath: file.path, side: 'ours' }), testId: 'git-keep-mine' },
                    { label: 'Take theirs', onClick: () => run('resolve-conflict', { filePath: file.path, side: 'theirs' }), testId: 'git-take-theirs' }
                  ]}
                />
              );
            })}
          </div>
          {selectedConflict && <FileDiff git={git} filePath={selected.path} title={selected.title} source="conflict" />}
        </>
      )}

      {hasNothing && <div className="empty" data-testid="git-no-changes">No changes. Everything in this collection is committed.</div>}
      {overview.tooManyFiles && <div className="note">There are too many changed files to list.</div>}

      {staged.length > 0 && (
        <>
          <div className="section-head">
            <span>Staged · {staged.length}</span>
            <button type="button" className="section-action" onClick={() => run('unstage', { files: staged.map((file) => file.path) })} data-testid="git-unstage-all">
              Unstage all
            </button>
          </div>
          <div role="listbox" data-testid="git-staged-list">
            {staged.map((file) => {
              const { name, pathInCollection } = describe(file);
              return (
                <FileRow
                  key={file.path}
                  name={name}
                  path={pathInCollection}
                  status={file.status}
                  selected={isSelected(file, 'staged')}
                  onSelect={() => setSelected({ path: file.path, source: 'staged', title: name })}
                  actions={[{ label: 'Unstage', onClick: () => run('unstage', { files: [file.path] }), testId: 'git-unstage' }]}
                />
              );
            })}
          </div>
        </>
      )}

      {unstaged.length > 0 && (
        <>
          <div className="section-head">
            <span>Changes · {unstaged.length}</span>
            <button type="button" className="section-action" onClick={() => run('stage', { files: unstaged.map((file) => file.path) })} data-testid="git-stage-all">
              Stage all
            </button>
          </div>
          <div role="listbox" data-testid="git-unstaged-list">
            {unstaged.map((file) => {
              const { name, pathInCollection } = describe(file);
              return (
                <FileRow
                  key={file.path}
                  name={name}
                  path={pathInCollection}
                  status={file.status}
                  selected={isSelected(file, 'unstaged')}
                  onSelect={() => setSelected({ path: file.path, source: 'unstaged', title: name })}
                  actions={[
                    { label: 'Stage', onClick: () => run('stage', { files: [file.path] }), testId: 'git-stage' },
                    {
                      label: discarding === file.path ? 'Discard for good?' : 'Discard',
                      onClick: () => discard(file),
                      danger: true,
                      testId: 'git-discard'
                    }
                  ]}
                />
              );
            })}
          </div>
        </>
      )}

      {staged.length > 0 && !overview.isMerging && (
        <>
          <div className="note commit-summary" data-testid="git-commit-summary">
            This commit will save {plural(staged.length, 'file')}: {listNames(staged.map((file) => describe(file).name))}.
            {unstaged.length > 0 && ` ${plural(unstaged.length, 'other change')} ${unstaged.length === 1 ? 'is' : 'are'} not staged and will stay out of it.`}
          </div>
          <div className="commit-box">
            <textarea
              className="commit-message"
              rows={2}
              placeholder="Describe what changed"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              data-testid="git-commit-message"
            />
            <Button size="sm" onClick={commit} disabled={!message.trim()} loading={isCommitting} data-testid="git-commit">
              Commit {plural(staged.length, 'file')}
            </Button>
          </div>
          {overview.stagedOutsideCollection > 0 && (
            <div className="note" data-testid="git-staged-outside">
              {plural(overview.stagedOutsideCollection, 'file')} staged elsewhere in this repository will be part of the commit too.
            </div>
          )}
          {secretFindings.length > 0 && (
            <div className="note warning" data-testid="git-commit-secrets">
              {secretFindings.length === 1 ? '1 value looks' : `${secretFindings.length} values look`} like a secret stored in plain text in this
              collection. Review {secretFindings.length === 1 ? 'it' : 'them'} in the Overview tab before committing.
            </div>
          )}
        </>
      )}

      {stillListed && selected.source !== 'conflict' && <FileDiff git={git} filePath={selected.path} title={selected.title} source={selected.source} />}
    </StyledWrapper>
  );
};

export default Changes;
