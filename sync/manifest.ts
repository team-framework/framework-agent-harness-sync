const issueTemplates = ["01-feat.yml", "02-fix.yml", "03-chore.yml", "04-refactor.yml"];

export type SyncItem = {
  id?: string;
  source: string;
  destination: string;
  mode?: string;
};

export const syncItems: SyncItem[] = [
  {
    id: "agents-instructions",
    source: "AGENTS.md",
    destination: "AGENTS.md",
    mode: "append-managed-instructions"
  },
  {
    id: "claude-instructions",
    source: "CLAUDE.md",
    destination: "CLAUDE.md",
    mode: "append-managed-instructions"
  },
  ...["codex", "claude", "agent"].map((tool) => ({
    id: tool + "-skills",
    source: "." + tool + "/skills",
    destination: "." + tool + "/skills"
  })),
  {
    id: "git-attributes",
    source: ".gitattributes",
    destination: ".gitattributes"
  },
  ...issueTemplates.map((name) => ({
    id: "issue-template-" + name,
    source: ".github/ISSUE_TEMPLATE/" + name,
    destination: ".github/ISSUE_TEMPLATE/" + name
  })),
  {
    id: "pull-request-template",
    source: ".github/pull_request_template.md",
    destination: ".github/pull_request_template.md"
  }
];

export const syncBranch = "harness-sync/framework-agent";
export const syncCommitMessage = "chore: 에이전트 협업 규칙 동기화";
export const syncPullRequestTitle = "chore: framework-agent-harness-sync";
