import { useMemo } from 'react';
import { findSecretsInCollection } from '@usebruno/common';

// Credentials stored in plain text in the collection. Computed here, on this machine, from what is already loaded.
const useSecretFindings = (collection) => {
  const { items, environments, root } = collection || {};
  return useMemo(() => findSecretsInCollection({ items, environments, root }), [items, environments, root]);
};

export default useSecretFindings;
