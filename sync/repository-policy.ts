const excludedRepositories = new Set(["team-framework/framework-llm-wiki"]);

export function isExcludedFromHarnessSync(repository: string): boolean {
  return excludedRepositories.has(repository.toLowerCase());
}
