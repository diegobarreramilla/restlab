import { useState } from 'react';
import classnames from 'classnames';
import { flattenItems, isItemARequest } from 'utils/collections/index';
import { relativeDate } from 'utils/common';
import { describeBlameField, leafBlameFields, repositoryPathOfItem } from 'utils/git-collection';
import useGitQuery from 'hooks/useGitQuery';
import FileDiff from '../FileDiff';
import StyledWrapper from './StyledWrapper';

const RequestHistory = ({ git, filePath, title }) => {
  const { data: commits } = useGitQuery({ invoke: git.invoke, action: 'history', payload: { filePath }, version: git.version });
  const [openHash, setOpenHash] = useState(null);

  if (!commits?.length) {
    return null;
  }

  return (
    <>
      <div className="heading">History of this request</div>
      <div data-testid="git-request-history">
        {commits.map((commit) => (
          <div key={commit.hash}>
            <div
              className={classnames('commit', { open: openHash === commit.hash })}
              onClick={() => setOpenHash(openHash === commit.hash ? null : commit.hash)}
              data-testid="git-request-commit"
            >
              <span className="commit-message">{commit.message}</span>
              <span className="commit-meta">{commit.author}</span>
              <span className="commit-meta" title={commit.date}>{relativeDate(commit.date)}</span>
            </div>
            {openHash === commit.hash && <FileDiff git={git} filePath={filePath} title={title} source="commit" commitHash={commit.hash} />}
          </div>
        ))}
      </div>
    </>
  );
};

const FieldAuthors = ({ git, filePath }) => {
  const { data, loading } = useGitQuery({ invoke: git.invoke, action: 'blame', payload: { filePath }, version: git.version });

  if (!data) {
    return <div className="empty">{loading ? 'Loading…' : 'This request could not be read.'}</div>;
  }
  if (!data.tracked) {
    return <div className="empty" data-testid="git-blame-untracked">This request has not been committed yet, so it has no history.</div>;
  }

  return (
    <table data-testid="git-blame">
      <tbody>
        {leafBlameFields(data.fields).map((field) => (
          <tr key={field.field} data-testid="git-blame-row">
            <td>{describeBlameField(field.field)}</td>
            <td className="muted">{field.uncommitted ? 'You' : field.author}</td>
            <td className="muted">{field.uncommitted ? 'not committed yet' : relativeDate(new Date(field.time * 1000).toISOString())}</td>
            <td className="summary">{field.uncommitted ? '' : field.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Pick a request and see who last changed each part of it, and every commit that touched it. */
const Blame = ({ collection, git }) => {
  const [filter, setFilter] = useState('');
  const [selectedUid, setSelectedUid] = useState(null);

  const requests = flattenItems(collection.items)
    .filter((item) => isItemARequest(item) && item.pathname && repositoryPathOfItem(git.overview, item))
    .filter((item) => item.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const selected = requests.find((item) => item.uid === selectedUid);
  const filePath = selected ? repositoryPathOfItem(git.overview, selected) : null;

  return (
    <StyledWrapper data-testid="git-requests">
      <div>
        <input
          className="request-filter"
          placeholder="Find a request"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          data-testid="git-request-filter"
        />
        <div className="requests" role="listbox">
          {requests.map((item) => (
            <div
              key={item.uid}
              className={classnames('request', { selected: item.uid === selectedUid })}
              onClick={() => setSelectedUid(item.uid)}
              role="option"
              aria-selected={item.uid === selectedUid}
              data-testid="git-request-option"
            >
              {item.name}
            </div>
          ))}
          {!requests.length && <div className="empty">No requests.</div>}
        </div>
      </div>
      <div>
        {selected ? (
          <>
            <div className="heading">Last change to each part</div>
            <FieldAuthors git={git} filePath={filePath} />
            <RequestHistory git={git} filePath={filePath} title={selected.name} />
          </>
        ) : (
          <div className="empty">Choose a request to see who last changed each part of it.</div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Blame;
