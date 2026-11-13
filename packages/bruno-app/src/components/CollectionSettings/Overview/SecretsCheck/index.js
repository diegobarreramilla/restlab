import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconKey, IconChevronDown, IconChevronRight } from '@tabler/icons';
import useSecretFindings from 'hooks/useSecretFindings';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { markEnvironmentVariablesAsSecret, moveRequestValueToSecretVariable } from 'providers/ReduxStore/slices/collections/actions';
import { findItemInCollection, getDefaultRequestPaneTab } from 'utils/collections/index';
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

const isEnvironmentFinding = (finding) => finding.location.type === 'environment' && finding.location.uid;

// Names of the flagged variables, grouped by the environment that holds them.
const groupByEnvironment = (findings) => {
  const groups = new Map();
  for (const finding of findings.filter(isEnvironmentFinding)) {
    const names = groups.get(finding.location.uid) || [];
    names.push(finding.field);
    groups.set(finding.location.uid, names);
  }
  return groups;
};

// Appears only when something in the collection looks like a credential written in plain text, and says where.
// The values themselves are never shown.
const SecretsCheck = ({ collection }) => {
  const dispatch = useDispatch();
  const findings = useSecretFindings(collection);
  const [isOpen, setIsOpen] = useState(false);

  if (!findings.length) {
    return null;
  }

  const summary = findings.length === 1
    ? '1 value looks like a secret stored in plain text'
    : `${findings.length} values look like secrets stored in plain text`;

  const environmentFindings = findings.filter(isEnvironmentFinding);

  const openLocation = ({ location }) => {
    if (location.type === 'environment') {
      dispatch(addTab({ uid: `${collection.uid}-environment-settings`, collectionUid: collection.uid, type: 'environment-settings' }));
      return;
    }
    const item = location.uid ? findItemInCollection(collection, location.uid) : null;
    if (!item) {
      return;
    }
    if (location.type === 'folder') {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'folder-settings', pathname: item.pathname }));
    } else {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, requestPaneTab: getDefaultRequestPaneTab(item) }));
    }
  };

  const hasEnvironments = (collection.environments || []).length > 0;
  const canMoveToVariable = Boolean(collection.activeEnvironmentUid);
  const moveHint = hasEnvironments ? 'Select an environment first: the secret is stored in it' : 'Create an environment first: the secret is stored in it';

  const moveToSecretVariable = async (finding) => {
    try {
      await dispatch(moveRequestValueToSecretVariable({ collectionUid: collection.uid, itemUid: finding.location.uid, source: finding.source }));
    } catch (error) {
      toast.error(error.message || 'Could not move the value to a variable');
    }
  };

  const markAsSecret = async (groups) => {
    try {
      for (const [environmentUid, names] of groups) {
        await dispatch(markEnvironmentVariablesAsSecret({ collectionUid: collection.uid, environmentUid, names }));
      }
    } catch (error) {
      toast.error(error.message || 'Could not mark the variable as secret');
    }
  };

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
              <button type="button" className="secrets-location" onClick={() => openLocation(finding)} data-testid="secrets-check-open">
                {finding.path.join(' / ')}
              </button>
              {' · '}
              <span className="secrets-field">{finding.field}</span> · {KIND_LABELS[finding.kind]}
              {finding.source && finding.location.uid && (
                <button
                  type="button"
                  className="secrets-action"
                  onClick={() => moveToSecretVariable(finding)}
                  disabled={!canMoveToVariable}
                  title={canMoveToVariable ? undefined : moveHint}
                  data-testid="secrets-check-move"
                >
                  Move to secret variable
                </button>
              )}
              {isEnvironmentFinding(finding) && (
                <button
                  type="button"
                  className="secrets-action"
                  onClick={() => markAsSecret(groupByEnvironment([finding]))}
                  data-testid="secrets-check-mark"
                >
                  Mark as secret
                </button>
              )}
            </div>
          ))}
          {findings.length > MAX_ROWS && <div className="secrets-row">and {findings.length - MAX_ROWS} more</div>}
          {environmentFindings.length > 1 && (
            <button
              type="button"
              className="secrets-action secrets-action-all"
              onClick={() => markAsSecret(groupByEnvironment(findings))}
              data-testid="secrets-check-mark-all"
            >
              Mark all {environmentFindings.length} environment variables as secret
            </button>
          )}
          <div className="secrets-advice">
            A secret variable keeps its value in the secret store instead of the collection files, so it is not shared or committed with them.
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default SecretsCheck;
