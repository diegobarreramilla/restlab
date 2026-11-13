import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 60rem;

  .git-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .branch-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 6px;
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .branch-name {
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .bar-action {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    cursor: pointer;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .bar-spacer {
    flex: 1;
  }

  .new-branch {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0.5rem;
  }

  .new-branch-name {
    width: 16rem;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
  }

  .views {
    display: flex;
    gap: 16px;
    margin-top: 0.75rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .view {
    padding: 4px 0;
    margin-bottom: -1px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 13px;
    cursor: pointer;

    &.active {
      color: ${(props) => props.theme.text};
      border-bottom-color: ${(props) => props.theme.colors.accent};
    }
  }

  .placeholder {
    max-width: 34rem;
    font-size: 13px;
    color: ${(props) => props.theme.colors.text.muted};

    p {
      margin-bottom: 0.75rem;
    }
  }
`;

export default StyledWrapper;
