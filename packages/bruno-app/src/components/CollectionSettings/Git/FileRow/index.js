import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const STATUS_LETTERS = { new: 'A', added: 'A', modified: 'M', changed: 'M', renamed: 'R', deleted: 'D', conflicted: '!' };

/**
 * One changed file. A request is shown by its name with the file path beside it, because the name is what the
 * user recognizes. `actions` are text buttons that appear on hover: `[{ label, onClick, danger, testId }]`.
 */
const FileRow = ({ name, path, status, selected, onSelect, actions = [] }) => (
  <StyledWrapper
    $status={status}
    className={classnames({ selected })}
    onClick={onSelect}
    role="option"
    aria-selected={Boolean(selected)}
    title={`${path} (${status})`}
    data-testid="git-file-row"
  >
    <span className="file-status" data-testid="git-file-status">{STATUS_LETTERS[status] || 'M'}</span>
    <span className="file-name">{name}</span>
    <span className="file-path">{name === path ? '' : path}</span>
    <span className="file-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={classnames('file-action', { danger: action.danger })}
          onClick={(event) => {
            event.stopPropagation();
            action.onClick();
          }}
          data-testid={action.testId}
        >
          {action.label}
        </button>
      ))}
    </span>
  </StyledWrapper>
);

export default FileRow;
