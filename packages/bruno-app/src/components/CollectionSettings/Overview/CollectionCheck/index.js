import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconStethoscope, IconChevronDown, IconChevronRight } from '@tabler/icons';
import useCollectionCheck from 'hooks/useCollectionCheck';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { findItemInCollection, getDefaultRequestPaneTab } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';

const MAX_ROWS = 50;

const Variable = ({ name }) => <span className="check-name">{`{{${name}}}`}</span>;

const describeFinding = (finding) => {
  switch (finding.kind) {
    case 'undefined-variable':
      return <>uses <Variable name={finding.name} />, which nothing defines</>;
    case 'variable-missing-in-environments':
      return <><Variable name={finding.name} /> is used by requests but missing in {finding.environments.join(', ')}</>;
    case 'empty-url':
      return 'has no URL';
    case 'duplicate-name':
      return <>{finding.count} requests are named <span className="check-name">{finding.name}</span></>;
    default:
      return null;
  }
};

// Appears only when something in the collection will go wrong on send, and says where.
const CollectionCheck = ({ collection }) => {
  const dispatch = useDispatch();
  const findings = useCollectionCheck(collection);
  const [isOpen, setIsOpen] = useState(false);

  if (!findings.length) {
    return null;
  }

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

  const canOpen = (finding) => finding.location.type !== 'collection';

  return (
    <StyledWrapper data-testid="collection-check">
      <button
        type="button"
        className="check-summary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-testid="collection-check-toggle"
      >
        <IconStethoscope size={16} strokeWidth={1.5} className="flex-shrink-0" />
        <span className="flex-1">{findings.length === 1 ? '1 thing to review in this collection' : `${findings.length} things to review in this collection`}</span>
        {isOpen ? <IconChevronDown size={14} strokeWidth={1.5} /> : <IconChevronRight size={14} strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div className="check-list" data-testid="collection-check-list">
          {findings.slice(0, MAX_ROWS).map((finding) => (
            <div key={`${finding.kind}|${finding.path.join('/')}|${finding.name}`} className="check-row" data-testid="collection-check-row">
              {canOpen(finding) ? (
                <button type="button" className="check-location" onClick={() => openLocation(finding)} data-testid="collection-check-open">
                  {finding.path.join(' / ') || collection.name}
                </button>
              ) : (
                finding.path.join(' / ')
              )}
              {' · '}
              {describeFinding(finding)}
            </div>
          ))}
          {findings.length > MAX_ROWS && <div className="check-row">and {findings.length - MAX_ROWS} more</div>}
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionCheck;
