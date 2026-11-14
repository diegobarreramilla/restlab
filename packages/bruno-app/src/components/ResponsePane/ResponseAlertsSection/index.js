import React from 'react';
import { useDispatch } from 'react-redux';
import classnames from 'classnames';
import ResponseErrorsCard from '../ResponseErrorsCard';
import UnresolvedVariablesInfo from '../UnresolvedVariablesInfo';
import FailureExplanation from '../FailureExplanation';
import { dismissFailureExplanation } from 'providers/ReduxStore/slices/collections';
import { explainRequestFailure } from 'utils/request-failures';
import StyledWrapper from './StyledWrapper';

const HTTP_REQUEST_TYPES = ['http-request', 'graphql-request'];

// A request that got an answer shows its body as usual, so the reason for a failing status goes in a card
// above it. A request that got no answer explains itself next to its error message instead.
const explainFailingStatus = (item) => {
  const response = item.response;
  if (!HTTP_REQUEST_TYPES.includes(item.type)) return null;
  if (!response || response.error || item.failureExplanationDismissed) return null;
  return explainRequestFailure({ status: response.status, headers: response.headers, method: item.requestSent?.method });
};

const ResponseAlertsSection = ({ item, collection, responsePaneErrors, explainsFailingStatus = false }) => {
  const dispatch = useDispatch();
  const { errors, isCardClosed, closeCard, isCardFullPane, toggleCardFullPane } = responsePaneErrors;
  const showsErrorsCard = errors.length > 0 && !isCardClosed;
  const showsUnresolvedVariables = !isCardFullPane && item.unresolvedVariables?.length > 0;

  const failureExplanation = explainsFailingStatus && !isCardFullPane ? explainFailingStatus(item) : null;

  if (!showsErrorsCard && !showsUnresolvedVariables && !failureExplanation) return null;

  return (
    <StyledWrapper className={classnames({ 'full-pane': isCardFullPane })}>
      {showsErrorsCard && (
        <ResponseErrorsCard
          key={`${item.uid}-${item.requestUid}`}
          errors={errors}
          item={item}
          collection={collection}
          isCardFullPane={isCardFullPane}
          onToggleCardFullPane={toggleCardFullPane}
          onClose={closeCard}
        />
      )}
      {showsUnresolvedVariables && <UnresolvedVariablesInfo item={item} collection={collection} />}
      {failureExplanation && (
        <FailureExplanation
          explanation={failureExplanation}
          item={item}
          collection={collection}
          onDismiss={() => dispatch(dismissFailureExplanation({ collectionUid: collection.uid, itemUid: item.uid }))}
        />
      )}
    </StyledWrapper>
  );
};

export default ResponseAlertsSection;
