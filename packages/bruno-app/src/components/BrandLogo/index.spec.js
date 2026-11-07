import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import BrandLogo from './index';

describe('BrandLogo', () => {
  it('draws at the requested width and follows the surrounding text color', () => {
    const { container } = render(<BrandLogo width={48} />);

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toHaveAttribute('width', '48');
    expect(container.querySelectorAll('[stroke="currentColor"]').length).toBeGreaterThan(0);
  });

  it('is decorative, because the product name is always written next to it', () => {
    render(<BrandLogo width={18} />);

    expect(screen.getByTestId('brand-logo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is self-contained: no image file or fixed color to swap out', () => {
    const { container } = render(<BrandLogo width={18} />);

    expect(container.querySelector('image, img')).toBeNull();
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
