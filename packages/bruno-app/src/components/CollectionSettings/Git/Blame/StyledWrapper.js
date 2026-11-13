import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 3fr;
  gap: 16px;
  margin-top: 0.75rem;

  .request-filter {
    width: 100%;
    margin-bottom: 6px;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
  }

  .request {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    &:hover,
    &.selected {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .requests {
    max-height: 26rem;
    overflow-y: auto;
  }

  .empty {
    font-size: 13px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .heading {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .heading:not(:first-child) {
    margin-top: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  td {
    padding: 3px 12px 3px 0;
    vertical-align: baseline;
  }

  td.muted {
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
  }

  td.summary {
    width: 45%;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .commit {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 0;
    font-size: 13px;
    cursor: pointer;

    &:hover .commit-message,
    &.open .commit-message {
      text-decoration: underline;
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
`;

export default StyledWrapper;
