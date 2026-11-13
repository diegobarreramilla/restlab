import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InheritOption from './index';

describe('InheritOption', () => {
  it('is unchecked when asked to be and names the source environment', () => {
    render(<InheritOption sourceName="base" checked={false} onChange={() => {}} />);

    expect(screen.getByTestId('copy-environment-inherit-checkbox')).not.toBeChecked();
    expect(screen.getByTestId('copy-environment-inherit')).toHaveTextContent('base');
  });

  it('reports the new value when toggled', () => {
    const onChange = jest.fn();
    render(<InheritOption sourceName="base" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('copy-environment-inherit-checkbox'));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
