import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import { IconInfoCircle, IconX } from '@tabler/icons';
import { addTab, updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { FAILURE_ACTION_LABELS } from 'utils/request-failures';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

// Says why the last send of a request failed, and takes the user to where the fix lives. `explanation` comes
// from `explainRequestFailure`; with `onDismiss` it is a card of its own that can be closed.
const FailureExplanation = ({ explanation, item, collection, onDismiss }) => {
  const dispatch = useDispatch();
  const { kind, text } = explanation;
  // A request shown outside its own tab (a runner result, a saved example) has no Auth or Settings to open.
  const hasRequestTab = useSelector((state) => state.tabs.tabs.some((tab) => tab.uid === item.uid));
  const action = explanation.action === 'preferences' || hasRequestTab ? explanation.action : null;

  const runAction = () => {
    if (action === 'preferences') {
      dispatch(addTab({ type: 'preferences', uid: `${collection.uid}-preferences`, collectionUid: collection.uid }));
      return;
    }
    dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: action }));
  };

  return (
    <StyledWrapper
      className={classnames(onDismiss ? 'boxed' : 'text-xs')}
      role="status"
      data-testid="failure-explanation"
      data-kind={kind}
    >
      <IconInfoCircle size={16} strokeWidth={1.5} className="explanation-icon" />
      <div className="explanation-body">
        {text}
        {action ? (
          <button type="button" className="explanation-action" onClick={runAction} data-testid="failure-explanation-action">
            {FAILURE_ACTION_LABELS[action]}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <ActionIcon
          size="xs"
          className="close-button"
          data-testid="failure-explanation-close"
          onClick={onDismiss}
          aria-label="Dismiss explanation"
        >
          <IconX size={16} strokeWidth={1.5} />
        </ActionIcon>
      ) : null}
    </StyledWrapper>
  );
};

export default FailureExplanation;
