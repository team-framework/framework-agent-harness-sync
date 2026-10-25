import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const branch = "harness-sync/framework-agent";
const script = resolve("sync/check-branch.sh");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "harness-branch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, "remote.git");
  const target = join(root, "target");
  const git = (...args: string[]) => execFileSync("git", ["-C", target, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  execFileSync("git", ["init", "--bare", "-b", "main", remote]);
  execFileSync("git", ["clone", remote, target], { stdio: "pipe" });
  git("config", "user.name", "test");
  git("config", "user.email", "test@example.com");
  await writeFile(join(target, "product.txt"), "product\n");
  git("add", ".");
  git("commit", "-m", "initial");
  git("push", "origin", "main");
  const check = () => spawnSync("bash", [script, target, branch], { encoding: "utf8" });
  return { root, remote, target, git, check };
}

test("동기화 브랜치가 없으면 생성하고 일반 push 가능", async (t) => {
  const { git, check } = await fixture(t);
  assert.equal(check().status, 0);
  git("switch", "-c", branch);
  git("commit", "--allow-empty", "-m", "sync");
  git("push", "origin", `HEAD:${branch}`);
  assert.equal(git("rev-parse", `origin/${branch}`), git("rev-parse", "HEAD"));
});

test("main에 포함된 잔존 브랜치는 삭제 없이 일반 push 및 재실행 가능", async (t) => {
  const { target, git, check } = await fixture(t);
  const oldTip = git("rev-parse", "HEAD");
  git("push", "origin", `HEAD:${branch}`);
  git("commit", "--allow-empty", "-m", "base advanced");
  git("push", "origin", "main");
  // Match the workflow: apply files before checking remote branch ancestry.
  await writeFile(join(target, ".gitattributes"), "*.md text eol=lf\n");
  assert.equal(check().status, 0);
  assert.equal(git("rev-parse", "FETCH_HEAD"), oldTip);
  assert.equal(await readFile(join(target, ".gitattributes"), "utf8"), "*.md text eol=lf\n");
  git("switch", "-c", branch);
  git("add", ".gitattributes");
  git("commit", "-m", "sync");
  git("push", "origin", `HEAD:${branch}`);
  assert.equal(check().status, 0);
  assert.equal(git("status", "--porcelain"), "");
  git("merge-base", "--is-ancestor", oldTip, "HEAD");
});

test("기본 브랜치에 없는 잔존 커밋은 건너뜀 상태로 반환하고 보존", async (t) => {
  const { git, check } = await fixture(t);
  git("switch", "-c", branch);
  git("commit", "--allow-empty", "-m", "unmerged sync");
  const remoteTip = git("rev-parse", "HEAD");
  git("push", "origin", `HEAD:${branch}`);
  git("switch", "main");
  git("commit", "--allow-empty", "-m", "base advanced");
  const baseTip = git("rev-parse", "HEAD");
  assert.equal(check().status, 3);
  assert.equal(check().status, 3);
  assert.equal(git("rev-parse", "HEAD"), baseTip);
  assert.equal(git("ls-remote", "--heads", "origin", `refs/heads/${branch}`).split(/\s/)[0], remoteTip);
});

test("원격 조회 실패는 브랜치 없음이나 안전한 건너뜀으로 숨기지 않음", async (t) => {
  const { root, git, check } = await fixture(t);
  git("remote", "set-url", "origin", join(root, "missing.git"));
  const result = check();
  assert.notEqual(result.status, 0);
  assert.notEqual(result.status, 3);
});

test("워크플로는 전체 이력으로 잔존 브랜치를 확인하고 삭제·강제 push 없이 결과 기록", async () => {
  const workflow = await readFile(".github/workflows/sync-harness.yml", "utf8");
  assert.match(workflow, /path: target\n\s+persist-credentials: false\n\s+fetch-depth: 0/);
  assert.match(workflow, /bash source\/sync\/check-branch\.sh target "\$branch"/);
  assert.match(workflow, /--status skipped --detail/);
  assert.doesNotMatch(workflow, /git[^\n]*push[^\n]*(--delete|--force|\s-f\s)/);
});
