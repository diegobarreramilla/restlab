import styled from 'styled-components';

const StyledWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: ${(props) => props.theme.colors.text.muted};
  opacity: 0.7;
`;

export default StyledWrapper;
