import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  margin-top: 0.75rem;
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: 6px;
  overflow: hidden;

  .diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .diff-toggle {
    padding: 0;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.textLink};
    font-size: 12px;
    cursor: pointer;
  }

  .diff-body {
    padding: 8px 10px;
  }

  .diff-empty {
    padding: 10px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .diff-text {
    margin: 0;
    max-height: 22rem;
    overflow: auto;
    font-family: ${(props) => props.theme.font?.codeFont || 'monospace'};
    font-size: 12px;
    line-height: 1.5;
    white-space: pre;
  }

  .diff-line.added {
    background: ${(props) => rgba(props.theme.colors.text.green, 0.14)};
  }

  .diff-line.removed {
    background: ${(props) => rgba(props.theme.colors.text.danger, 0.14)};
  }
`;

export default StyledWrapper;
