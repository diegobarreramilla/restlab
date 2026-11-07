import styled from 'styled-components';

// The status hues are blended with the theme's text color so the small labels keep at least 4.5:1
// contrast on the title bar in every theme (the raw light-theme orange only reaches about 3.2:1).
const StyledWrapper = styled.div`
  display: flex;
  align-items: baseline;
  margin-right: 12px;
  white-space: nowrap;
  cursor: default;
  opacity: 1;
  transform: none;
  animation: offline-label-in 240ms ease-out;

  &[data-state='leaving'] {
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 260ms ease-in, transform 260ms ease-in;
  }

  .label-stack {
    display: grid;
  }

  .offline-label,
  .restored-label {
    grid-area: 1 / 1;
    font-size: 10.5px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: opacity 320ms ease, transform 320ms ease;
  }

  .offline-label {
    color: color-mix(in srgb, ${(props) => props.theme.status.warning.text} 70%, ${(props) => props.theme.text});
  }

  .restored-label {
    color: color-mix(in srgb, ${(props) => props.theme.status.success.text} 70%, ${(props) => props.theme.text});
  }

  .offline-label[data-active='false'] {
    opacity: 0;
    transform: translateY(-3px);
  }

  .restored-label[data-active='false'] {
    opacity: 0;
    transform: translateY(3px);
  }

  .offline-detail {
    max-width: 140px;
    margin-left: 8px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.01em;
    color: color-mix(in srgb, ${(props) => props.theme.text} 75%, transparent);
    transition: opacity 240ms ease, max-width 320ms ease, margin-left 320ms ease;
  }

  .offline-detail[data-active='false'] {
    max-width: 0;
    margin-left: 0;
    opacity: 0;
  }

  @media (max-width: 900px) {
    .offline-detail {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    .offline-label,
    .restored-label,
    .offline-detail {
      animation: none;
      transition: none;
    }
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
