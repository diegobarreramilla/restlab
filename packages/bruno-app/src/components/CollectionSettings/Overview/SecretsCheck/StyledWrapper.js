import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-top: 1rem;
  font-size: ${(props) => props.theme.font.size.sm};

  .secrets-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    text-align: left;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .secrets-list {
    margin-top: 0.5rem;
    padding-left: 1.5rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .secrets-row {
    padding: 0.125rem 0;
    overflow-wrap: anywhere;
  }

  .secrets-location,
  .secrets-action {
    padding: 0;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .secrets-location:hover {
    text-decoration: underline;
  }

  .secrets-action {
    margin-left: 0.75rem;
    color: ${(props) => props.theme.textLink};

    &:hover {
      text-decoration: underline;
    }
  }

  .secrets-action:disabled {
    color: ${(props) => props.theme.colors.text.muted};
    cursor: not-allowed;
    text-decoration: none;
  }

  .secrets-action-all {
    display: block;
    margin: 0.5rem 0 0;
  }

  .secrets-field {
    color: ${(props) => props.theme.text};
  }

  .secrets-advice {
    margin-top: 0.5rem;
  }
`;

export default StyledWrapper;
