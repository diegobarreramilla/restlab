import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResponseAlertsSection from './index';

jest.mock('../ResponseErrorsCard', () => ({ isCardFullPane }) => (
  <div data-testid="response-errors-card" data-full-pane={String(isCardFullPane)} />
));

const item = { uid: 'req-1', requestUid: 'run-1', unresolvedVariables: ['host'] };

const responsePaneErrors = (overrides = {}) => ({
  errors: [{ scriptType: 'test' }],
  isCardClosed: false,
  closeCard: jest.fn(),
  isCardFullPane: false,
  toggleCardFullPane: jest.fn(),
  ...overrides
});

const renderSection = (paneErrors, sectionItem = item, props = {}) => render(
  <Provider store={configureStore({ reducer: (state = { tabs: { tabs: [] } }) => state })}>
    <ThemeProvider>
      <ResponseAlertsSection item={sectionItem} collection={{ uid: 'col-1' }} responsePaneErrors={paneErrors} {...props} />
    </ThemeProvider>
  </Provider>
);

const renderedTestIds = (container) => Array.from(container.firstChild.children).map((child) => child.dataset.testid);

describe('ResponseAlertsSection', () => {
  it('renders the error card above the unresolved-variables info', () => {
    const { container } = renderSection(responsePaneErrors());
    expect(renderedTestIds(container)).toEqual(['response-errors-card', 'unresolved-variables-info']);
  });

  it('hides the info card while the errors card fills the pane', () => {
    const { container } = renderSection(responsePaneErrors({ isCardFullPane: true }));
    expect(renderedTestIds(container)).toEqual(['response-errors-card']);
    expect(screen.getByTestId('response-errors-card')).toHaveAttribute('data-full-pane', 'true');
  });

  it('renders nothing when there are no errors and no unresolved variables', () => {
    const { container } = renderSection(responsePaneErrors({ errors: [] }), { ...item, unresolvedVariables: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out the error card when there are no errors', () => {
    const { container } = renderSection(responsePaneErrors({ errors: [] }));
    expect(renderedTestIds(container)).toEqual(['unresolved-variables-info']);
  });

  it('leaves out the error card while it is closed', () => {
    const { container } = renderSection(responsePaneErrors({ isCardClosed: true }));
    expect(renderedTestIds(container)).toEqual(['unresolved-variables-info']);
  });

  describe('a failing status', () => {
    const failed = { uid: 'req-1', type: 'http-request', response: { status: 429, headers: { 'retry-after': '5' } } };
    const noErrors = () => responsePaneErrors({ errors: [] });

    it('is explained when the pane asks for it', () => {
      renderSection(noErrors(), failed, { explainsFailingStatus: true });
      expect(screen.getByTestId('failure-explanation')).toHaveTextContent('try again in 5 seconds');
    });

    it('is not explained elsewhere', () => {
      const { container } = renderSection(noErrors(), failed);
      expect(container).toBeEmptyDOMElement();
    });

    it('is not explained once dismissed, for a status with no rule, or for another protocol', () => {
      const cases = [
        { ...failed, failureExplanationDismissed: true },
        { ...failed, response: { status: 200, headers: {} } },
        { ...failed, response: { error: 'socket hang up' } },
        { ...failed, type: 'grpc-request' }
      ];
      for (const sectionItem of cases) {
        const { container, unmount } = renderSection(noErrors(), sectionItem, { explainsFailingStatus: true });
        expect(container).toBeEmptyDOMElement();
        unmount();
      }
    });

    it('gives way to the errors card when it fills the pane', () => {
      const { container } = renderSection(responsePaneErrors({ isCardFullPane: true }), failed, { explainsFailingStatus: true });
      expect(renderedTestIds(container)).toEqual(['response-errors-card']);
    });
  });
});
