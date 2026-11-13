import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.75rem 0 0.25rem;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .section-action {
    padding: 0;
    background: transparent;
    border: none;
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .empty,
  .note {
    padding: 0 8px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .empty {
    margin-top: 0.75rem;
    font-size: 13px;
  }

  .note {
    margin-top: 0.5rem;
  }

  .note.commit-summary {
    margin-top: 1rem;
    color: ${(props) => props.theme.text};
  }

  .note.warning {
    color: ${(props) => props.theme.colors.text.warning};
  }

  .conflicts {
    margin-top: 0.75rem;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    background: ${(props) => rgba(props.theme.colors.text.danger, 0.08)};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .conflict-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
  }

  .commit-box {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 0.75rem;
    padding: 0 8px;
  }

  .commit-message {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
    resize: vertical;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default StyledWrapper;
