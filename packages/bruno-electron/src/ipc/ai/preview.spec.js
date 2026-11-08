const { describePreview, countHiddenValues } = require('./preview');

describe('countHiddenValues', () => {
  it('counts plain and numbered placeholders', () => {
    expect(countHiddenValues('a=<redacted> b=\'<redacted:1>\' c=\'<redacted:2>\'')).toBe(3);
    expect(countHiddenValues('nothing here')).toBe(0);
  });
});

describe('describePreview', () => {
  const sections = [
    { id: 'instructions', kind: 'instructions', title: 'Instructions', text: 'Secrets come back as <redacted>, never as real values.' },
    { id: 'request', kind: 'context', title: 'The request', text: 'GET /items?api_key=<redacted>&token=<redacted>' },
    { id: 'message-0', kind: 'conversation', title: 'Your message', text: 'hello' }
  ];

  it('does not count the placeholder mentioned in the fixed instructions as a hidden value of the user', () => {
    const preview = describePreview(sections, []);

    expect(preview.sections.find((s) => s.id === 'instructions').hidden).toBe(0);
    expect(preview.sections.find((s) => s.id === 'request').hidden).toBe(2);
    expect(preview.totals.hidden).toBe(2);
  });

  it('reports sizes and the on-demand tools it was given', () => {
    const onDemand = [{ name: 'read_response', summary: 'x' }];
    const preview = describePreview(sections, onDemand);

    expect(preview.totals.characters).toBe(sections.reduce((n, s) => n + s.text.length, 0));
    expect(preview.totals.approximateTokens).toBe(Math.ceil(preview.totals.characters / 4));
    expect(preview.onDemand).toBe(onDemand);
  });
});
