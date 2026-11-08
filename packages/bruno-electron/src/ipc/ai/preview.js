// Shared by the chat and generation previews: the sections, with a size and a count of hidden
// values on each, plus the totals the interface shows.

const countHiddenValues = (text) => (String(text).match(/<redacted(?::\d+)?>/g) || []).length;

// Roughly four characters per token. It is a size hint, not a bill.
const approximateTokens = (characters) => Math.ceil(characters / 4);

// What the assistant may ask for while it answers, as the user should read it. Shared so that the chat
// and the generation preview describe the same tool the same way.
const describeReadResponseTool = (policy) => ({
  name: 'read_response',
  summary: policy.redactResponse
    ? 'Reads the structure of the last response: keys and types, never the values.'
    : 'Reads the body of the last response as it is.'
});

const SEARCH_VARIABLES_TOOL = {
  name: 'search_variables',
  summary: 'Looks up variables by name. It sees the value of any variable that is not marked secret.'
};

const describePreview = (sections, onDemand) => {
  const described = sections.map((section) => ({
    ...section,
    characters: section.text.length,
    // The instructions are fixed text that explains the placeholders. They are not data of the user.
    hidden: section.kind === 'instructions' ? 0 : countHiddenValues(section.text)
  }));
  const characters = described.reduce((total, section) => total + section.characters, 0);

  return {
    sections: described,
    onDemand,
    totals: {
      characters,
      approximateTokens: approximateTokens(characters),
      hidden: described.reduce((total, section) => total + section.hidden, 0)
    }
  };
};

module.exports = {
  countHiddenValues,
  approximateTokens,
  describeReadResponseTool,
  SEARCH_VARIABLES_TOOL,
  describePreview
};
