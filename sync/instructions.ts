export const MANAGED_INSTRUCTIONS_START = "<!-- framework-collaboration-harness:start -->";
export const MANAGED_INSTRUCTIONS_END = "<!-- framework-collaboration-harness:end -->";

export function mergeManagedInstructions(existing = "", instructions, markers = {
  start: MANAGED_INSTRUCTIONS_START,
  end: MANAGED_INSTRUCTIONS_END
}) {
  const block = `${markers.start}\n${instructions.trim()}\n${markers.end}\n`;
  const start = existing.indexOf(markers.start);
  const end = existing.indexOf(markers.end, start);

  if (start >= 0 && end >= start) {
    return `${existing.slice(0, start)}${block}${existing.slice(end + markers.end.length).replace(/^\r?\n/, "")}`;
  }

  return existing.length === 0 ? block : `${existing.replace(/\s*$/, "")}\n\n${block}`;
}
