import { IconBinaryTree2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

// A quiet marker for an environment that inherits variables from another one. It sits next to the name in
// the environment lists and says nothing unless the user hovers it.
const InheritanceHint = ({ environment }) => {
  if (typeof environment?.extends !== 'string' || !environment.extends) {
    return null;
  }

  return (
    <StyledWrapper title={`Inherits variables from ${environment.extends}`} data-testid="env-inheritance-hint">
      <IconBinaryTree2 size={12} strokeWidth={1.5} />
    </StyledWrapper>
  );
};

export default InheritanceHint;
