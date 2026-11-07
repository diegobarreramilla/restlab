import React from 'react';

// PLACEHOLDER MARK: there is no official RestLab logo yet. When it exists, replace the drawing
// below and keep `width` and `currentColor`, so the title bar, the welcome dialog and the error
// page follow the theme. The About window draws the same mark from bruno-electron/src/branding.js.
// The full list of places that carry the brand is in docs/branding.md.
const BrandLogo = ({ width }) => (
  <svg
    width={width}
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    data-testid="brand-logo"
  >
    <rect x="6" y="6" width="60" height="60" rx="16" stroke="currentColor" strokeWidth="4" />
    <path
      d="M26 52V20h13a9 9 0 0 1 0 18H26m13 0l10 14"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default BrandLogo;
