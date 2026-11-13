import StyledWrapper, { LANE_COLOR_COUNT } from './StyledWrapper';

export const ROW_HEIGHT = 28;
const LANE_WIDTH = 14;
const PADDING = 10;
const MIDDLE = ROW_HEIGHT / 2;

const laneX = (lane) => PADDING + lane * LANE_WIDTH;
const laneClass = (lane) => `lane-${lane % LANE_COLOR_COUNT}`;

// A line between two lanes bends smoothly; within one lane it is straight.
const curve = (fromX, fromY, toX, toY) =>
  fromX === toX ? `M ${fromX} ${fromY} L ${toX} ${toY}` : `M ${fromX} ${fromY} C ${fromX} ${(fromY + toY) / 2}, ${toX} ${(fromY + toY) / 2}, ${toX} ${toY}`;

/**
 * The slice of the commit graph that belongs to one row: the lines that pass, the ones that arrive at this
 * commit and leave it, and its node. Rows stacked on top of each other join into the whole graph.
 */
const CommitGraphCell = ({ row, laneCount, onHoverChange }) => {
  const nodeX = laneX(row.lane);

  return (
    <StyledWrapper width={PADDING * 2 + Math.max(laneCount - 1, 0) * LANE_WIDTH} height={ROW_HEIGHT} data-testid="git-graph-cell">
      {row.through.map((lane) => (
        <path key={`through-${lane}`} className={laneClass(lane)} d={curve(laneX(lane), 0, laneX(lane), ROW_HEIGHT)} />
      ))}
      {row.from.map((lane) => (
        <path key={`from-${lane}`} className={laneClass(lane)} d={curve(laneX(lane), 0, nodeX, MIDDLE)} />
      ))}
      {row.to.map((lane) => (
        <path key={`to-${lane}`} className={laneClass(lane === row.lane ? row.lane : lane)} d={curve(nodeX, MIDDLE, laneX(lane), ROW_HEIGHT)} />
      ))}
      <circle
        className={laneClass(row.lane)}
        cx={nodeX}
        cy={MIDDLE}
        r={row.commit.parents.length > 1 ? 3.5 : 4.5}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        data-testid="git-graph-node"
      />
    </StyledWrapper>
  );
};

export default CommitGraphCell;
