const { parseBlamePorcelain, labelYmlLines, labelBruLines, summarizeBlameByField } = require('./git-blame');

const HASH_A = 'a'.repeat(40);
const HASH_B = 'b'.repeat(40);
const ZERO = '0'.repeat(40);

const porcelain = (entries) =>
  entries
    .map(({ hash, line, author, time, summary, content }) =>
      [`${hash} ${line} ${line} 1`, `author ${author}`, `author-time ${time}`, `summary ${summary}`, `filename x`, `\t${content}`].join('\n')
    )
    .join('\n') + '\n';

describe('parseBlamePorcelain', () => {
  it('returns one entry per line with its commit', () => {
    const lines = parseBlamePorcelain(porcelain([
      { hash: HASH_A, line: 1, author: 'Ana', time: 100, summary: 'first', content: 'http:' },
      { hash: HASH_B, line: 2, author: 'Luis', time: 200, summary: 'second', content: '  url: x' }
    ]));

    expect(lines).toEqual([
      { hash: HASH_A, line: 1, author: 'Ana', time: 100, summary: 'first', content: 'http:', uncommitted: false },
      { hash: HASH_B, line: 2, author: 'Luis', time: 200, summary: 'second', content: '  url: x', uncommitted: false }
    ]);
  });

  it('marks lines that are not committed yet', () => {
    const [line] = parseBlamePorcelain(porcelain([{ hash: ZERO, line: 1, author: 'Not Committed Yet', time: 300, summary: 'x', content: 'a: b' }]));

    expect(line.uncommitted).toBe(true);
  });

  it('returns nothing for empty output', () => {
    expect(parseBlamePorcelain('')).toEqual([]);
  });
});

describe('labelYmlLines', () => {
  it('names scalars by their path and list entries by their name', () => {
    const content = [
      'info:',
      '  name: list',
      'http:',
      '  method: GET',
      '  url: https://a.example.com',
      '  headers:',
      '    - name: Accept',
      '      value: "*/*"',
      '    - name: X-Key',
      '      value: abc',
      '  auth: none'
    ];

    expect(labelYmlLines(content)).toEqual([
      'info',
      'info.name',
      'http',
      'http.method',
      'http.url',
      'http.headers',
      'http.headers[Accept]',
      'http.headers[Accept]',
      'http.headers[X-Key]',
      'http.headers[X-Key]',
      'http.auth'
    ]);
  });

  it('keeps continuation and blank lines with the field above them', () => {
    expect(labelYmlLines(['docs: |-', '  first line', '', '  second line'])).toEqual(['docs', 'docs', 'docs', 'docs']);
  });
});

describe('labelBruLines', () => {
  it('names keys inside blocks and treats a body as one field', () => {
    const content = ['get {', '  url: https://a.example.com', '}', '', 'headers {', '  Accept: */*', '  ~Old: x', '}', 'body:json {', '  {', '    "a": 1', '  }', '}'];

    expect(labelBruLines(content)).toEqual([
      'get', 'get.url', 'get', '', 'headers', 'headers.Accept', 'headers.Old', 'headers', 'body:json', 'body:json', 'body:json', 'body:json', 'body:json'
    ]);
  });
});

describe('summarizeBlameByField', () => {
  it('reports the newest commit of each field', () => {
    const lines = parseBlamePorcelain(porcelain([
      { hash: HASH_A, line: 1, author: 'Ana', time: 100, summary: 'first', content: 'http:' },
      { hash: HASH_A, line: 2, author: 'Ana', time: 100, summary: 'first', content: '  headers:' },
      { hash: HASH_A, line: 3, author: 'Ana', time: 100, summary: 'first', content: '    - name: Accept' },
      { hash: HASH_B, line: 4, author: 'Luis', time: 200, summary: 'json only', content: '      value: application/json' }
    ]));

    const header = summarizeBlameByField(lines, 'list.yml').find((row) => row.field === 'http.headers[Accept]');

    expect(header).toMatchObject({ author: 'Luis', summary: 'json only', hash: HASH_B, firstLine: 3 });
  });

  it('uses the history order when two commits share the same second', () => {
    const lines = parseBlamePorcelain(porcelain([
      { hash: HASH_A, line: 1, author: 'Ana', time: 100, summary: 'first', content: '    - name: Accept' },
      { hash: HASH_B, line: 2, author: 'Luis', time: 100, summary: 'second', content: '      value: x' }
    ]));

    expect(summarizeBlameByField(lines, 'list.yml', [HASH_B, HASH_A])[0].author).toBe('Luis');
    expect(summarizeBlameByField(lines, 'list.yml', [HASH_A, HASH_B])[0].author).toBe('Ana');
  });

  it('lets an uncommitted line win over a newer committed one', () => {
    const lines = parseBlamePorcelain(porcelain([
      { hash: ZERO, line: 1, author: 'Not Committed Yet', time: 50, summary: 'x', content: 'url: a' },
      { hash: HASH_B, line: 2, author: 'Luis', time: 200, summary: 'second', content: '  more' }
    ]));

    expect(summarizeBlameByField(lines, 'list.yml')[0].uncommitted).toBe(true);
  });

  it('returns nothing for a file type it does not understand', () => {
    const lines = parseBlamePorcelain(porcelain([{ hash: HASH_A, line: 1, author: 'Ana', time: 1, summary: 's', content: 'x' }]));

    expect(summarizeBlameByField(lines, 'notes.txt')).toEqual([]);
  });
});
