import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import ResponseCompare from './index';

const send = (timestamp, status, data, headers = {}) => ({
  type: 'request',
  itemUid: 'req-1',
  requestUid: `run-${timestamp}`,
  timestamp,
  data: { response: { status, data, headers } }
});

const renderCompare = (timeline) => render(
  <ThemeProvider>
    <ResponseCompare collection={{ uid: 'col-1', timeline }} item={{ uid: 'req-1' }} />
  </ThemeProvider>
);

describe('ResponseCompare', () => {
  it('asks for a second send when there is only one', () => {
    renderCompare([send(1, 200, { id: 1 })]);

    expect(screen.getByTestId('response-compare')).toHaveTextContent('Send this request at least twice');
  });

  it('compares the latest answer with the one before it', () => {
    renderCompare([
      send(1, 200, { name: 'first' }),
      send(2, 200, { name: 'Ada' }, { etag: 'a' }),
      send(3, 500, { name: 'Grace' }, { etag: 'b' })
    ]);

    expect(screen.getByTestId('response-compare-status')).toHaveTextContent('200500');
    expect(screen.getByTestId('response-compare-header')).toHaveTextContent('changedetag: a b');
    const body = screen.getByTestId('response-compare-body');
    expect(body).toHaveTextContent('- "name": "Ada"');
    expect(body).toHaveTextContent('+ "name": "Grace"');
    expect(body).not.toHaveTextContent('first');
  });

  it('compares with another earlier send when it is picked', () => {
    renderCompare([send(1, 200, { name: 'first' }), send(2, 200, { name: 'Ada' }), send(3, 200, { name: 'Grace' })]);

    fireEvent.change(screen.getByTestId('response-compare-before'), { target: { value: '1' } });

    expect(screen.getByTestId('response-compare-body')).toHaveTextContent('- "name": "first"');
  });

  it('says so when both answers are the same', () => {
    renderCompare([send(1, 200, { id: 1 }), send(2, 200, { id: 1 })]);

    expect(screen.getByTestId('response-compare-identical')).toBeInTheDocument();
    expect(screen.queryByTestId('response-compare-body')).not.toBeInTheDocument();
  });
});
