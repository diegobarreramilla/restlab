import styled from 'styled-components';

const StyledWrapper = styled.div`
  .commit {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;

    &:hover,
    &.open {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .commit-message {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .commit-meta {
    flex-shrink: 0;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .commit-hash {
    font-family: ${(props) => props.theme.font?.codeFont || 'monospace'};
  }

  .commit-files {
    margin: 2px 0 6px 16px;
    padding-left: 8px;
    border-left: 1px solid ${(props) => props.theme.border.border1};
  }

  .empty {
    margin-top: 0.75rem;
    padding: 0 8px;
    font-size: 13px;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
