import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  z-index: 20;
  top: 100%;
  min-width: 16rem;
  max-width: 28rem;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${(props) => props.theme.border.border1};
  background: ${(props) => props.theme.bg};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  pointer-events: none;

  .tooltip-message {
    font-size: 13px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .tooltip-line {
    margin-top: 2px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .tooltip-hash {
    font-family: ${(props) => props.theme.font?.codeFont || 'monospace'};
  }
`;

export default StyledWrapper;
