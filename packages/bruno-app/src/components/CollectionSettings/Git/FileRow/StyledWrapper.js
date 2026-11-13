import styled from 'styled-components';

const STATUS_COLORS = {
  new: (theme) => theme.colors.text.green,
  added: (theme) => theme.colors.text.green,
  modified: (theme) => theme.colors.text.yellow,
  changed: (theme) => theme.colors.text.yellow,
  renamed: (theme) => theme.colors.text.purple,
  deleted: (theme) => theme.colors.text.danger,
  conflicted: (theme) => theme.colors.text.danger
};

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 1.75rem;
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  &:hover,
  &.selected {
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
  }

  .file-status {
    flex-shrink: 0;
    width: 1rem;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => (STATUS_COLORS[props.$status] || STATUS_COLORS.modified)(props.theme)};
  }

  .file-name {
    flex-shrink: 0;
    max-width: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .file-actions {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    opacity: 0;
  }

  &:hover .file-actions,
  &.selected .file-actions,
  .file-actions:focus-within {
    opacity: 1;
  }

  .file-action {
    padding: 0;
    background: transparent;
    border: none;
    font-size: 12px;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &.danger {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }
`;

export default StyledWrapper;
