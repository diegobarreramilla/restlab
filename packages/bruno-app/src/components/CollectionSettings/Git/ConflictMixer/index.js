import { useState } from 'react';
import classnames from 'classnames';
import Button from 'ui/Button';
import useGitQuery from 'hooks/useGitQuery';
import { describeConflictPart, suggestConflictChoices } from 'utils/git-collection';
import StyledWrapper from './StyledWrapper';

const REASONS = {
  ours: 'only you changed it',
  theirs: 'only they changed it',
  both: 'both changed it'
};

const SIDES = [
  { id: 'ours', label: 'Mine' },
  { id: 'theirs', label: 'Theirs' }
];

/**
 * Settles a conflicted request part by part: the URL from one side, the headers from the other. Parts only
 * one side changed start on that side; parts both changed wait for a choice, and nothing is saved until every
 * part has one.
 */
const ConflictMixer = ({ git, filePath }) => {
  const { data } = useGitQuery({ invoke: git.invoke, action: 'conflict-parts', payload: { filePath }, version: git.version });
  // What the user picked, on top of the suggestions; kept per file so switching files starts clean.
  const [picked, setPicked] = useState({ filePath, choices: {} });

  if (!data?.mergeable || !data.parts.length) {
    return null;
  }

  const choices = { ...suggestConflictChoices(data.parts), ...(picked.filePath === filePath ? picked.choices : {}) };
  const undecided = data.parts.filter((part) => !choices[part.key]).length;
  const choose = (key, side) => setPicked({ filePath, choices: { ...(picked.filePath === filePath ? picked.choices : {}), [key]: side } });

  return (
    <StyledWrapper data-testid="git-conflict-mixer">
      <div className="mixer-title">Or mix both, part by part</div>
      {data.parts.map((part) => (
        <div key={part.key} className="mixer-part" data-testid="git-mixer-part">
          <span className="mixer-name">{describeConflictPart(part.key)}</span>
          <span className="mixer-sides" role="radiogroup" aria-label={describeConflictPart(part.key)}>
            {SIDES.map((side) => (
              <button
                key={side.id}
                type="button"
                role="radio"
                aria-checked={choices[part.key] === side.id}
                className={classnames('mixer-side', { chosen: choices[part.key] === side.id })}
                onClick={() => choose(part.key, side.id)}
                data-testid={`git-mixer-${side.id}`}
              >
                {side.label}
              </button>
            ))}
          </span>
          <span className={classnames('mixer-why', { undecided: !choices[part.key] })}>
            {choices[part.key] ? REASONS[part.changedBy] : `${REASONS[part.changedBy]}: choose one`}
          </span>
        </div>
      ))}
      <div className="mixer-footer">
        <Button
          size="sm"
          variant="outline"
          onClick={() => git.run('resolve-conflict-parts', { filePath, choices })}
          disabled={undecided > 0}
          data-testid="git-mixer-save"
        >
          Keep this mix
        </Button>
        {undecided > 0 && <span className="mixer-why">{undecided === 1 ? '1 part still needs a choice' : `${undecided} parts still need a choice`}</span>}
      </div>
    </StyledWrapper>
  );
};

export default ConflictMixer;
