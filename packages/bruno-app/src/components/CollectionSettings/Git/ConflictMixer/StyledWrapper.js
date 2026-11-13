import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-top: 0.75rem;
  padding: 0 8px;
  font-size: 13px;

  .mixer-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .mixer-part {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }

  .mixer-name {
    width: 10rem;
    flex-shrink: 0;
  }

  .mixer-sides {
    display: flex;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 6px;
    overflow: hidden;
  }

  .mixer-side {
    padding: 2px 10px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    cursor: pointer;

    &.chosen {
      background: ${(props) => props.theme.colors.accent};
      color: ${(props) => props.theme.colors.text.white};
    }
  }

  .mixer-why {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .mixer-why.undecided {
    color: ${(props) => props.theme.colors.text.warning};
  }

  .mixer-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 0.5rem;
  }
`;

export default StyledWrapper;
