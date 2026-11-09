import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .migration-section {
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }

  .icon-box.migration {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.08)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.09)};

    svg {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  code.backup-path {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.text};
    background: none;
    padding: 0;
    overflow-wrap: anywhere;
  }

  .backup-path-action {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: ${(props) => props.theme.font.size.sm};
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
