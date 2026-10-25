import { mergeManagedInstructions } from "./instructions.ts";

export const MANAGED_ATTRIBUTES_MARKERS = {
  start: "# framework-collaboration-harness:start",
  end: "# framework-collaboration-harness:end"
};

// Keep the exact pre-marker rules even when the source rules change in the future.
const legacyHarnessLines = new Set([
  "- text=auto eol=lf",
  "*.md       text eol=lf linguist-detectable",
  "*.yaml     text eol=lf linguist-detectable",
  "*.yml      text eol=lf linguist-detectable",
  "*.json     text eol=lf linguist-detectable"
]);

export function mergeManagedAttributes(existing = "", attributes: string) {
  const markers = MANAGED_ATTRIBUTES_MARKERS;
  const lines = existing.split(/(?<=\n)/);
  let start = -1;
  let offset = 0;
  for (const line of lines) {
    const text = line.replace(/\r?\n$/, "");
    if (text === markers.start) start = offset;
    if (text === markers.end && start >= 0) {
      const end = offset + line.length;
      return existing.slice(0, start)
        + mergeManagedInstructions(existing.slice(start, end), attributes, markers)
        + existing.slice(end);
    }
    offset += line.length;
  }

  const block = mergeManagedInstructions("", attributes, markers);
  let inserted = false;
  // Retain line endings and whitespace for every line not owned by the harness.
  const migrated = lines.map((line) => {
    if (!legacyHarnessLines.has(line.replace(/\r?\n$/, ""))) return line;
    if (inserted) return "";
    inserted = true;
    return block;
  }).join("");

  if (inserted) return migrated;
  return `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${block}`;
}
