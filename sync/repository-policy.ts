const excludedRepositories = new Set([
  "team-framework/framework-llm-wiki",
  "team-framework/framework-llm-wiki-mcp"
]);

export function isExcludedFromHarnessSync(repository: string): boolean {
  return excludedRepositories.has(repository.toLowerCase());
}
