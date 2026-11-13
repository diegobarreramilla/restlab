import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import InheritanceHint from './index';

const renderHint = (environment) =>
  render(
    <ThemeProvider theme={themes.light}>
      <InheritanceHint environment={environment} />
    </ThemeProvider>
  );

describe('InheritanceHint', () => {
  it('names the parent in its tooltip', () => {
    renderHint({ name: 'dev', extends: 'base' });

    expect(screen.getByTestId('env-inheritance-hint')).toHaveAttribute('title', 'Inherits variables from base');
  });

  it.each([[undefined], [null], ['']])('renders nothing when extends is %p', (value) => {
    const { container } = renderHint({ name: 'dev', extends: value });

    expect(container).toBeEmptyDOMElement();
  });
});
