import styled from 'styled-components';

// Hidden values are shown in the theme's success hue blended with its text color, so the small
// monospace text keeps enough contrast in every theme.
const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  font-size: 12px;
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.bg};
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: 8px;
  overflow: hidden;

  .ctx-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 8px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .ctx-heading {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .ctx-title {
    font-size: 12.5px;
    font-weight: 600;
  }

  .ctx-summary {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    font-variant-numeric: tabular-nums;
  }

  .ctx-close {
    display: inline-flex;
    padding: 2px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .ctx-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 0;
  }

  .ctx-state {
    padding: 14px 12px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .ctx-state.is-error {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .ctx-section {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    &:last-of-type {
      border-bottom: none;
    }

    summary {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      list-style: none;
      user-select: none;

      &::-webkit-details-marker {
        display: none;
      }

      &::before {
        content: '';
        flex: none;
        width: 5px;
        height: 5px;
        margin-right: 2px;
        border-right: 1.5px solid ${(props) => props.theme.colors.text.muted};
        border-bottom: 1.5px solid ${(props) => props.theme.colors.text.muted};
        transform: translateY(-2px) rotate(-45deg);
        transition: transform 120ms ease;
      }

      &:hover .ctx-section-title {
        color: ${(props) => props.theme.brand};
      }

      &:focus-visible {
        outline: 1px solid ${(props) => props.theme.brand};
        outline-offset: -1px;
      }
    }

    &[open] summary::before {
      transform: translateY(-3px) rotate(45deg);
    }

    .ctx-section-title {
      flex: 1;
      min-width: 0;
      font-weight: 500;
      transition: color 120ms ease;
    }

    .ctx-section-meta {
      flex: none;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
      font-variant-numeric: tabular-nums;
    }

    .ctx-section-hidden {
      color: color-mix(in srgb, ${(props) => props.theme.status.success.text} 70%, ${(props) => props.theme.text});
    }
  }

  .ctx-section-text {
    margin: 0 12px 10px;
    padding: 8px 10px;
    max-height: 220px;
    overflow: auto;
    font-family: ${(props) => props.theme.font?.mono || 'ui-monospace, SFMono-Regular, Menlo, monospace'};
    font-size: 11.5px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    background: ${(props) => props.theme.codemirror.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 6px;
  }

  .ctx-hidden-value {
    padding: 0 3px;
    border-radius: 3px;
    background: ${(props) => props.theme.status.success.background};
    color: color-mix(in srgb, ${(props) => props.theme.status.success.text} 70%, ${(props) => props.theme.text});
  }

  .ctx-on-demand {
    padding: 10px 12px 12px;
    border-top: 1px solid ${(props) => props.theme.border.border1};

    .ctx-on-demand-title {
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.muted};
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      font-size: 11.5px;
      line-height: 1.45;
    }

    code {
      margin-right: 6px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .ctx-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }

  @media (prefers-reduced-motion: reduce) {
    .ctx-section summary::before,
    .ctx-section .ctx-section-title {
      transition: none;
    }
  }
`;

export default StyledWrapper;
