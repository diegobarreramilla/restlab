import styled from 'styled-components';

// The warning hue is blended with the theme's text color so the small label keeps at least 4.5:1
// contrast on the title bar in every theme (the raw light-theme orange only reaches about 3.2:1).
const StyledWrapper = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-right: 12px;
  white-space: nowrap;
  cursor: default;
  animation: offline-label-in 240ms ease-out;

  .offline-label {
    font-size: 10.5px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: color-mix(in srgb, ${(props) => props.theme.status.warning.text} 70%, ${(props) => props.theme.text});
  }

  .offline-detail {
    font-size: 11px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.01em;
    color: color-mix(in srgb, ${(props) => props.theme.text} 75%, transparent);
  }

  @media (max-width: 900px) {
    .offline-detail {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @keyframes offline-label-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;
