/**
 * Turns `git blame` on a request file into "who last changed each field".
 *
 * Git only knows lines. A request file is line-oriented enough (`.yml` and `.bru` alike) that every line
 * belongs to one field, so each line is labelled with the field it sits in and the newest line of a field
 * decides who changed that field last.
 */

const UNCOMMITTED_HASH = /^0+$/;

/** Parses `git blame --line-porcelain` into one entry per line of the file. */
const parseBlamePorcelain = (output) => {
  const lines = [];
  let current = null;

  for (const raw of String(output || '').split('\n')) {
    const header = /^([0-9a-f]{40}) \d+ (\d+)/.exec(raw);
    if (header) {
      current = { hash: header[1], line: Number(header[2]), author: '', time: 0, summary: '' };
    } else if (!current) {
      continue;
    } else if (raw.startsWith('author ')) {
      current.author = raw.slice('author '.length);
    } else if (raw.startsWith('author-time ')) {
      current.time = Number(raw.slice('author-time '.length));
    } else if (raw.startsWith('summary ')) {
      current.summary = raw.slice('summary '.length);
    } else if (raw.startsWith('\t')) {
      lines.push({ ...current, content: raw.slice(1), uncommitted: UNCOMMITTED_HASH.test(current.hash) });
      current = null;
    }
  }

  return lines;
};

/** The field each line of a `.yml` request belongs to: `http.url`, `http.headers[Accept]`... */
const labelYmlLines = (contentLines) => {
  const stack = [];
  let lastLabel = '';

  return contentLines.map((line) => {
    const match = /^(\s*)(-\s+)?([A-Za-z0-9_.$-]+):\s*(.*)$/.exec(line);
    if (!match || line.trim().startsWith('#')) {
      return lastLabel;
    }

    const [, indentText, dash, key, value] = match;
    const indent = indentText.length;
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (dash) {
      // A list entry is named after its `name`, so a header stays one field across its name and value lines.
      const itemName = key === 'name' && value ? value.replace(/^["']|["']$/g, '') : key;
      stack.push({ indent, key: `[${itemName}]`, isItem: true });
      lastLabel = stack.map((entry) => entry.key).join('.').replace(/\.\[/g, '[');
      stack.push({ indent: indent + dash.length, key, hidden: true });
      return lastLabel;
    }

    stack.push({ indent, key });
    const insideItem = stack.some((entry) => entry.isItem);
    const visible = insideItem ? stack.slice(0, stack.findIndex((entry) => entry.isItem) + 1) : stack;
    lastLabel = visible.map((entry) => entry.key).join('.').replace(/\.\[/g, '[');
    return lastLabel;
  });
};

/** The field each line of a `.bru` request belongs to: `get.url`, `headers.Accept`, `body:json`... */
const labelBruLines = (contentLines) => {
  let block = '';
  let lastLabel = '';

  return contentLines.map((line) => {
    const open = /^([A-Za-z0-9:_.-]+)\s*\{\s*$/.exec(line);
    if (open) {
      block = open[1];
      lastLabel = block;
      return lastLabel;
    }
    if (/^\}\s*$/.test(line)) {
      const label = block;
      block = '';
      lastLabel = '';
      return label;
    }
    if (!block) {
      return '';
    }
    const entry = /^\s+~?([^:\s][^:]*):/.exec(line);
    // Bodies, scripts and docs are free text: the whole block is one field.
    const isKeyValueBlock = !/^(body|script|tests|docs|example)/.test(block);
    if (entry && isKeyValueBlock) {
      lastLabel = `${block}.${entry[1].trim()}`;
    } else if (!lastLabel.startsWith(block)) {
      lastLabel = block;
    }
    return lastLabel;
  });
};

const labelLines = (contentLines, filePath) => {
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return labelYmlLines(contentLines);
  if (filePath.endsWith('.bru')) return labelBruLines(contentLines);
  return contentLines.map(() => '');
};

/**
 * One row per field, in file order: the commit that last touched any line of it.
 * Uncommitted lines win over committed ones, so a field being edited shows as not committed yet.
 */
const summarizeBlameByField = (blameLines, filePath, newestFirstHashes = []) => {
  const labels = labelLines(blameLines.map((line) => line.content), filePath);
  const fields = new Map();
  // Two commits made within the same second carry the same time, so the history order decides when it is known.
  const position = new Map(newestFirstHashes.map((hash, index) => [hash, index]));
  const isMoreRecent = (line, known) => {
    if (position.has(line.hash) && position.has(known.hash)) {
      return position.get(line.hash) < position.get(known.hash);
    }
    return line.time > known.time;
  };

  blameLines.forEach((line, index) => {
    const field = labels[index];
    if (!field) return;
    const known = fields.get(field);
    const isNewer = !known || (line.uncommitted && !known.uncommitted) || (!known.uncommitted && isMoreRecent(line, known));
    if (isNewer) {
      fields.set(field, {
        field,
        hash: line.hash,
        author: line.author,
        time: line.time,
        summary: line.summary,
        uncommitted: line.uncommitted,
        firstLine: known ? known.firstLine : line.line
      });
    }
  });

  return [...fields.values()];
};

module.exports = { parseBlamePorcelain, labelYmlLines, labelBruLines, summarizeBlameByField };
