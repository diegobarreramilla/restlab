import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .migration-section {
    margin-top: 0.5rem;
    padding-top: 1.75rem;
    border-top: 1px solid ${(props) => props.theme.border.border};
  }

  .migration-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    border: 1px solid ${(props) => props.theme.border.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.background.surface};
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
  }

  .icon-box.migration {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.08)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.09)};

    svg {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .card-title-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }

  .card-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-weight: 500;
  }

  .format-badge {
    padding: 0.0625rem 0.5rem;
    border-radius: 999px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.yellow};
    background: ${(props) => rgba(props.theme.colors.text.yellow, 0.1)};

    &.done {
      color: ${(props) => props.theme.colors.text.green};
      background: ${(props) => rgba(props.theme.colors.text.green, 0.1)};
    }
  }

  .card-description {
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.55;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .backup-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-label {
    margin-bottom: 0.375rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .path-box {
    display: block;
    padding: 0.625rem 0.75rem;
    border: 1px solid ${(props) => props.theme.border.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.input.bg};
    font-family: ${(props) => props.theme.font.monospace};
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.6;
    color: ${(props) => props.theme.text};
    overflow-wrap: anywhere;
    user-select: text;
  }

  .meta-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      flex-shrink: 0;
      margin-top: 0.1875rem;
    }
  }

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding-top: 1rem;
    border-top: 1px solid ${(props) => props.theme.border.border};

    .spacer {
      flex: 1;
    }

    .confirm-text {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text};
      margin-right: 0.5rem;
    }
  }

  .ghost-action {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3125rem 0.625rem;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    font-family: inherit;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext};
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;

    &:hover {
      background: ${(props) => rgba(props.theme.text, 0.06)};
      color: ${(props) => props.theme.text};
    }

    &:focus-visible {
      outline: 1px solid ${(props) => props.theme.input.focusBorder};
    }

    &.danger {
      color: ${(props) => props.theme.colors.text.danger};

      &:hover {
        background: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }
`;

export default StyledWrapper;
