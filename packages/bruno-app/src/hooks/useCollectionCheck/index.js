import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { checkCollection } from '@usebruno/common';

// Things in the collection that will go wrong when a request is sent. Computed on this machine from what is
// already loaded; a variable of any global environment counts as defined.
const useCollectionCheck = (collection) => {
  const { items, environments, root } = collection || {};
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);

  return useMemo(() => {
    const externalVariableNames = (globalEnvironments || []).flatMap((environment) =>
      (environment.variables || []).map((variable) => variable.name));
    return checkCollection({ items, environments, root }, { externalVariableNames });
  }, [items, environments, root, globalEnvironments]);
};

export default useCollectionCheck;
