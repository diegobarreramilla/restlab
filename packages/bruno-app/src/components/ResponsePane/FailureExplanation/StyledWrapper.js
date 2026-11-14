import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  line-height: 1.25rem;
  color: ${(props) => props.theme.colors.text.muted};

  &.boxed {
    padding: 0.75rem;
    color: ${(props) => props.theme.text};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.subtle};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .explanation-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .explanation-body {
    flex: 1;
    min-width: 0;
  }

  .explanation-action {
    margin-left: 0.5rem;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: ${(props) => props.theme.textLink};
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
    white-space: nowrap;
  }

  .close-button {
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
