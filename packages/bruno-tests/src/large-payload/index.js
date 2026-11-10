const express = require('express');
const router = express.Router();

const FILLER = 'bruno large payload ';
const DEFAULT_SIZE = 1024 * 1024;
const MAX_SIZE = 64 * 1024 * 1024;
const JSON_ITEM_PAYLOAD_LENGTH = 128;

function filler(length) {
  return FILLER.repeat(Math.ceil(length / FILLER.length)).slice(0, length);
}

const JSON_ITEM_PAYLOAD = filler(JSON_ITEM_PAYLOAD_LENGTH);

function jsonItem(id, payload) {
  return `{"id":${id},"name":"item-${id}","payload":"${payload}"}`;
}

// Builds a JSON array of small objects whose serialized length is exactly `size`
// bytes. The last item's `payload` absorbs the remainder, so the array is never
// trimmed into invalid JSON. Sizes below a single item fall back to `[]`.
function buildJsonPayload(size) {
  if (size <= 2) {
    return '[]';
  }

  const parts = [];
  let total = 2; // `[` + `]`
  let id = 1;

  while (true) {
    const item = jsonItem(id, JSON_ITEM_PAYLOAD);
    const separator = parts.length === 0 ? 0 : 1;

    if (total + separator + item.length > size) {
      break;
    }

    parts.push(item);
    total += separator + item.length;
    id++;
  }

  const remaining = size - total;

  if (parts.length === 0) {
    const minimal = jsonItem(1, '');
    if (2 + minimal.length > size) {
      return '[]';
    }
    parts.push(jsonItem(1, filler(size - 2 - minimal.length)));
  } else if (remaining > 0) {
    parts[parts.length - 1] = jsonItem(parts.length, filler(JSON_ITEM_PAYLOAD_LENGTH + remaining));
  }

  return `[${parts.join(',')}]`;
}

// Responds with `?size` bytes of plain text (default 1 MB, clamped to 0-64 MB).
// With `?type=json`, responds instead with a JSON array of small objects whose
// serialized length is exactly `size` bytes (or `[]` for sizes below 2 bytes).
// Useful for exercising large-response handling in the app and the sandboxes.
router.get('/', (req, res) => {
  const requested = parseInt(req.query.size, 10);
  const size = Math.min(Math.max(Number.isNaN(requested) ? DEFAULT_SIZE : requested, 0), MAX_SIZE);
  const type = String(req.query.type || '').toLowerCase();

  if (type === 'json') {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.send(buildJsonPayload(size));
    return;
  }

  res.setHeader('content-type', 'text/plain');
  res.send(filler(size));
});

module.exports = router;
