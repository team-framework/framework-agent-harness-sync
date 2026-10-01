import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { applyHarnessFiles } from "../sync/apply.ts";
import { selectTargets } from "../sync/discover.ts";
import { renderSyncReport } from "../sync/report.ts";
import { syncItems, manualBootstrapItems } from "../sync/manifest.ts";
import { syncPullRequestBody } from "../sync/pr-body.ts";
import { validatePullRequest, validateReadiness } from "../.github/scripts/collaboration-policy.mjs";

test("설치된 활성 레포만 동기화 대상으로 선택해요", () => {
  const targets = selectTargets([
    { full_name: "team-framework/framework-agent-harness-sync", name: "framework-agent-harness-sync", default_branch: "main" },
    { full_name: "team-framework/innolive-client", name: "innolive-client", default_branch: "main" },
    { full_name: "team-framework/archived", name: "archived", default_branch: "main", archived: true },
    { full_name: "team-framework/fork", name: "fork", default_branch: "main", fork: true },
    { full_name: "team-framework/empty", name: "empty", default_branch: null }
  ], { sourceRepository: "team-framework/framework-agent-harness-sync" });

  assert.deepEqual(targets, [{
    repository: "team-framework/innolive-client",
    name: "innolive-client",
    baseBranch: "main"
  }]);
});

test("정본 위키와 MCP 저장소만 대소문자와 관계없이 동기화 대상에서 제외해요", () => {
  const repositories = [
    "team-framework/framework-llm-wiki",
    "TEAM-FRAMEWORK/Framework-LLM-Wiki",
    "team-framework/framework-llm-wiki-mcp",
    "TEAM-FRAMEWORK/Framework-LLM-Wiki-MCP",
    "team-framework/framework-llm-wiki-mcp-extra",
    "other-team/framework-llm-wiki",
    "other-team/framework-llm-wiki-mcp",
    "team-framework/another-wiki"
  ].map((full_name) => ({ full_name, name: full_name.split("/")[1], default_branch: "main" }));

  const targets = selectTargets(repositories, { sourceRepository: "team-framework/framework-agent-harness-sync" });

  assert.deepEqual(targets.map((target) => target.repository), [
    "other-team/framework-llm-wiki",
    "other-team/framework-llm-wiki-mcp",
    "team-framework/another-wiki",
    "team-framework/framework-llm-wiki-mcp-extra"
  ]);
});

test("관리 대상 파일만 복사하고 대상 레포의 다른 파일은 유지해요", async () => {
  const root = await mkdtemp(join(tmpdir(), "harness-sync-"));
  const source = join(root, "source");
  const target = join(root, "target");
  await mkdir(join(source, ".codex", "skills", "issue"), { recursive: true });
  await mkdir(join(target, ".codex", "skills", "custom"), { recursive: true });
  await writeFile(join(source, ".codex", "skills", "issue", "SKILL.md"), "source skill\\n");
  await writeFile(join(target, ".codex", "skills", "custom", "SKILL.md"), "custom skill\\n");

  await applyHarnessFiles({
    sourceRoot: source,
    targetRoot: target,
    items: [{
      source: ".codex/skills/issue",
      destination: ".codex/skills/issue"
    }]
  });

  assert.equal(await readFile(join(target, ".codex", "skills", "issue", "SKILL.md"), "utf8"), "source skill\\n");
  assert.equal(await readFile(join(target, ".codex", "skills", "custom", "SKILL.md"), "utf8"), "custom skill\\n");
});

test("모든 에이전트 스킬을 동기화해요", async () => {
  const root = await mkdtemp(join(tmpdir(), "harness-sync-"));
  const source = join(root, "source");
  const target = join(root, "target");
  await mkdir(join(source, ".codex", "skills", "wiki-update", "references"), { recursive: true });
  await writeFile(join(source, ".codex", "skills", "wiki-update", "SKILL.md"), "wiki update skill\n");
  await writeFile(join(source, ".codex", "skills", "wiki-update", "references", "conventions.md"), "conventions\n");

  await applyHarnessFiles({
    sourceRoot: source,
    targetRoot: target,
    items: [{ source: ".codex/skills", destination: ".codex/skills" }]
  });

  assert.equal(await readFile(join(target, ".codex", "skills", "wiki-update", "SKILL.md"), "utf8"), "wiki update skill\n");
  assert.equal(await readFile(join(target, ".codex", "skills", "wiki-update", "references", "conventions.md"), "utf8"), "conventions\n");
});

test("Framework Wiki Reader 스킬을 모든 에이전트 경로에 제공해요", async () => {
  const root = process.cwd();
  const paths = [".codex", ".claude", ".agent"].map((tool) => join(root, tool, "skills", "framework-wiki-reader", "SKILL.md"));
  const contents = await Promise.all(paths.map((skillPath) => readFile(skillPath, "utf8")));

  assert.equal(new Set(contents).size, 1);
  for (const content of contents) {
    assert.match(content, /name: framework-wiki-reader/);
    assert.match(content, /resolved_links/);
  }
});

test("기존 에이전트 지시를 보존하고 하네스 규칙만 갱신해요", async () => {
  const root = await mkdtemp(join(tmpdir(), "harness-sync-"));
  const source = join(root, "source");
  const target = join(root, "target");
  await mkdir(source, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(join(source, "AGENTS.md"), "# Framework 규칙\\n");
  await writeFile(join(target, "AGENTS.md"), "# 제품 고유 규칙\\n");

  const item = { source: "AGENTS.md", destination: "AGENTS.md", mode: "append-managed-instructions" };
  await applyHarnessFiles({ sourceRoot: source, targetRoot: target, items: [item] });
  await applyHarnessFiles({ sourceRoot: source, targetRoot: target, items: [item] });

  const instructions = await readFile(join(target, "AGENTS.md"), "utf8");
  assert.match(instructions, /제품 고유 규칙/);
  assert.match(instructions, /Framework 규칙/);
  assert.equal((instructions.match(/framework-collaboration-harness:start/g) || []).length, 1);
});

test("동기화 결과를 레포별 표로 만들어요", () => {
  const report = renderSyncReport([
    { repository: "team-framework/innolive-server", status: "existing_pr", detail: "#12" },
    { repository: "team-framework/innolive-client", status: "pr_created", detail: "#34" }
  ]);

  assert.match(report, /innolive-client/);
  assert.match(report, /Draft PR 생성/);
  assert.match(report, /기존 동기화 PR 대기/);
});

test("전체 동기화 후에도 저장소별 기존 기록 기준과 제품 파일 유지", async () => {
  const target = await mkdtemp(join(tmpdir(), "collaboration-rollout-"));
  await mkdir(join(target, ".github"), { recursive: true });
  const cutoff = '{"legacyPullRequestMaxNumber":42,"legacyIssueMaxNumber":41}\n';
  await writeFile(join(target, ".github", "collaboration-policy.json"), cutoff);
  await writeFile(join(target, "product.txt"), "existing product\n");
  await applyHarnessFiles({ sourceRoot: process.cwd(), targetRoot: target });
  await applyHarnessFiles({ sourceRoot: process.cwd(), targetRoot: target });
  assert.equal(await readFile(join(target, ".github", "collaboration-policy.json"), "utf8"), cutoff);
  assert.equal(await readFile(join(target, "product.txt"), "utf8"), "existing product\n");
  assert.equal(await readFile(join(target, "docs", "collaboration.md"), "utf8"), await readFile("docs/collaboration.md", "utf8"));
  for (const path of [".github/scripts/collaboration-policy.mjs", ".github/scripts/collaboration-policy.test.mjs"]) {
    assert.equal(await readFile(join(target, path), "utf8"), await readFile(path, "utf8"));
  }
  await assert.rejects(readFile(join(target, ".github/workflows/collaboration-policy.yml")), { code: "ENOENT" });
  await applyHarnessFiles({ sourceRoot: process.cwd(), targetRoot: target, items: manualBootstrapItems });
  assert.equal(await readFile(join(target, ".github/workflows/collaboration-policy.yml"), "utf8"), await readFile(".github/workflows/collaboration-policy.yml", "utf8"));
  assert.equal(syncItems.some(item => item.destination === ".github/collaboration-policy.json"), false);
});

test("자동 동기화 본문은 Draft 검사 통과, 미검증 상태의 Ready 머지 차단", () => {
  const pr = { title: "chore: framework-agent-harness-sync", body: syncPullRequestBody, head: { ref: "harness-sync/framework-agent" }, user: { login: "framework-harness-sync[bot]" }, draft: true };
  assert.deepEqual(validatePullRequest(pr).errors, []);
  assert.deepEqual(validateReadiness(pr).errors, []);
  assert.ok(validateReadiness({ ...pr, draft: false }).errors.length);
});
