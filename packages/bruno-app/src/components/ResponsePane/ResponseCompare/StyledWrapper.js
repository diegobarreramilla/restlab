import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  min-height: 0;
  overflow: auto;
  padding-bottom: 1rem;
  font-size: ${(props) => props.theme.font.size.sm};

  .compare-pickers {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  select {
    padding: 0.2rem 0.4rem;
    color: ${(props) => props.theme.text};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font: inherit;
    outline: none;
  }

  .compare-empty,
  .compare-note {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .compare-section-title {
    margin-bottom: 0.25rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .status-before {
    color: ${(props) => props.theme.colors.text.muted};
    text-decoration: line-through;
    margin-right: 0.4rem;
  }

  .header-row {
    display: flex;
    gap: 0.5rem;
    padding: 0.125rem 0;
    overflow-wrap: anywhere;
  }

  .header-change {
    flex: 0 0 4.5rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .header-name {
    font-weight: 500;
  }

  .header-before {
    color: ${(props) => props.theme.colors.text.muted};
    text-decoration: line-through;
  }

  .compare-body {
    margin: 0;
    overflow-x: auto;
    font-family: ${(props) => props.theme.font?.codeFont || 'monospace'};
    font-size: 12px;
    line-height: 1.5;
    white-space: pre;
    border: 1px solid ${(props) => props.theme.border.subtle};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .body-line {
    padding: 0 0.5rem;
  }

  .body-line.added {
    background: ${(props) => rgba(props.theme.colors.text.green, 0.14)};
  }

  .body-line.removed {
    background: ${(props) => rgba(props.theme.colors.text.danger, 0.14)};
  }

  .body-line.gap {
    color: ${(props) => props.theme.colors.text.muted};
    font-family: inherit;
    font-style: italic;
  }
`;

export default StyledWrapper;
