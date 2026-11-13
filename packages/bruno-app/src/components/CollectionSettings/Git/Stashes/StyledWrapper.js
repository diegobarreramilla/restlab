import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-top: 0.75rem;

  .stash-form {
    display: flex;
    gap: 8px;
    padding: 0 8px;
  }

  .stash-message {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
  }

  .hint,
  .empty {
    margin-top: 0.5rem;
    padding: 0 8px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .stash {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 4px 8px;
    font-size: 13px;
  }

  .stash-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stash-meta {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .stash-action {
    padding: 0;
    background: transparent;
    border: none;
    font-size: 12px;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &.danger {
      color: ${(props) => props.theme.colors.text.danger};
    }

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;
