import { useState } from 'react';
import classnames from 'classnames';
import { relativeDate } from 'utils/common';
import { describeRepositoryFile } from 'utils/git-collection';
import useGitQuery from 'hooks/useGitQuery';
import FileRow from '../FileRow';
import FileDiff from '../FileDiff';
import StyledWrapper from './StyledWrapper';

const CommitFiles = ({ collection, git, commitHash }) => {
  const { data: files } = useGitQuery({ invoke: git.invoke, action: 'commit-files', payload: { commitHash }, version: git.version });
  const [selectedPath, setSelectedPath] = useState(null);

  if (!files) {
    return null;
  }

  const selected = files.find((file) => file.path === selectedPath);

  return (
    <div className="commit-files" data-testid="git-commit-files">
      {files.map((file) => {
        const { name, pathInCollection } = describeRepositoryFile(collection, git.overview, file.path);
        return (
          <FileRow
            key={file.path}
            name={name}
            path={pathInCollection}
            status={file.status}
            selected={file.path === selectedPath}
            onSelect={() => setSelectedPath(file.path === selectedPath ? null : file.path)}
          />
        );
      })}
      {selected && (
        <FileDiff
          git={git}
          filePath={selected.path}
          title={describeRepositoryFile(collection, git.overview, selected.path).name}
          source="commit"
          commitHash={commitHash}
        />
      )}
    </div>
  );
};

/** The commits that touched this collection, newest first. Opening one lists what it changed here. */
const History = ({ collection, git }) => {
  const { data: commits, loading } = useGitQuery({ invoke: git.invoke, action: 'history', version: git.version });
  const [openHash, setOpenHash] = useState(null);

  if (!commits) {
    return <StyledWrapper>{!loading && <div className="empty">The history could not be loaded.</div>}</StyledWrapper>;
  }

  if (!commits.length) {
    return (
      <StyledWrapper>
        <div className="empty" data-testid="git-no-history">No commits yet. Your first commit will appear here.</div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="git-history">
      {commits.map((commit) => (
        <div key={commit.hash}>
          <div
            className={classnames('commit', { open: openHash === commit.hash })}
            onClick={() => setOpenHash(openHash === commit.hash ? null : commit.hash)}
            data-testid="git-commit-row"
          >
            <span className="commit-message">{commit.message}</span>
            <span className="commit-meta">{commit.author}</span>
            <span className="commit-meta" title={commit.date}>{relativeDate(commit.date)}</span>
            <span className="commit-meta commit-hash">{commit.hash.slice(0, 7)}</span>
          </div>
          {openHash === commit.hash && <CommitFiles collection={collection} git={git} commitHash={commit.hash} />}
        </div>
      ))}
    </StyledWrapper>
  );
};

export default History;
