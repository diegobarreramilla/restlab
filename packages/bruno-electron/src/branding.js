// The product identity used by the main process. The renderer keeps its own copy of the name in
// bruno-app/src/utils/branding; keep APP_NAME in sync.
const APP_NAME = 'RestLab';

// PLACEHOLDER MARK: there is no official RestLab logo yet. Replace this drawing when it exists,
// together with bruno-app/src/components/BrandLogo. See docs/branding.md for the full list.
const logoMarkSvg = (width) => `<svg width="${width}" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`
  + '<rect x="6" y="6" width="60" height="60" rx="16" stroke="currentColor" stroke-width="4"/>'
  + '<path d="M26 52V20h13a9 9 0 0 1 0 18H26m13 0l10 14" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
  + '</svg>';

module.exports = { APP_NAME, logoMarkSvg };
