// Offered where an environment is copied: the copy can start empty and inherit from the source, so changing
// the source later changes the copy too. Unchecked by default, which keeps the plain "copy" behavior.
const InheritOption = ({ sourceName, checked, onChange }) => (
  <label className="flex items-start gap-2 mt-3 cursor-pointer" data-testid="copy-environment-inherit">
    <input
      type="checkbox"
      className="mt-1 w-3.5 h-3.5 flex-shrink-0"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      data-testid="copy-environment-inherit-checkbox"
    />
    <span className="text-xs">
      Inherit variables from <span className="font-medium">{sourceName}</span> instead of copying them
      <span className="block opacity-60">The new environment starts empty and only holds what you change.</span>
    </span>
  </label>
);

export default InheritOption;
