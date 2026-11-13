import styled from 'styled-components';

// One color per lane, repeating. A lane keeps its color from the branch tip down to where it joins another.
const laneColors = (theme) => [
  theme.colors.accent,
  theme.colors.text.green,
  theme.colors.text.purple,
  theme.colors.text.yellow,
  theme.colors.text.danger,
  theme.textLink
];

const StyledWrapper = styled.svg`
  flex-shrink: 0;
  display: block;
  overflow: visible;

  path {
    fill: none;
    stroke-width: 1.5;
  }

  circle {
    stroke: ${(props) => props.theme.bg};
    stroke-width: 1.5;
    cursor: pointer;
  }

  ${(props) =>
    laneColors(props.theme)
      .map((color, index) => `.lane-${index} { stroke: ${color}; } circle.lane-${index} { fill: ${color}; stroke: ${props.theme.bg}; }`)
      .join('\n')}
`;

export const LANE_COLOR_COUNT = 6;

export default StyledWrapper;
