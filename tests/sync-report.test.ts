import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseSyncResults, readSyncResults, renderSyncReport } from "../sync/report.ts";

const client = { repository: "team-framework/innolive-client", status: "pr_created", detail: "https://github.com/team-framework/innolive-client/pull/793" };
const ai = { repository: "team-framework/innolive-ai", status: "pr_created", detail: "https://github.com/team-framework/innolive-ai/pull/81" };

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "harness-report-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("동일 파일명의 아티팩트를 분리된 디렉터리에서 모두 보고", async (t) => {
  const root = await fixture(t);
  for (const result of [client, ai]) {
    const directory = join(root, `sync-result-${result.repository.split("/")[1]}`);
    await mkdir(directory);
    await writeFile(join(directory, "sync-result.json"), JSON.stringify(result) + "\n");
  }
  const results = await readSyncResults(root);
  assert.equal(results.length, 2);
  const report = execFileSync(process.execPath, ["--import", "tsx", "sync/report.ts", "--results-directory", root], { encoding: "utf8" });
  assert.match(report, /innolive-client.*793/);
  assert.match(report, /innolive-ai.*81/);
  const workflow = await readFile(".github/workflows/sync-harness.yml", "utf8");
  assert.match(workflow, /merge-multiple: false/);
});

test("단일 JSON과 여러 JSON 줄·빈 줄·CRLF를 지원", () => {
  assert.deepEqual(parseSyncResults(JSON.stringify(client, null, 2)), [client]);
  assert.deepEqual(parseSyncResults(["", JSON.stringify(client), "", JSON.stringify(ai), ""].join("\r\n")), [client, ai]);
});

test("기존 평면 결과와 중첩 JSONL 결과를 함께 읽고 다른 파일은 무시", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "sync-result.json"), JSON.stringify(client));
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "nested", "sync-result.json"), JSON.stringify(ai) + "\n" + JSON.stringify({ repository: "server", status: "skipped", detail: "관리자 확인 필요" }) + "\n");
  await writeFile(join(root, "README.txt"), "not JSON");
  const results = await readSyncResults(root);
  assert.equal(results.length, 3);
  assert.match(renderSyncReport(results), /server.*건너뜀.*관리자 확인 필요/);
});

test("손상된 JSON 꼬리는 조용히 버리지 않음", () => {
  assert.throws(() => parseSyncResults(JSON.stringify(ai) + '\nll/793"}\n'), SyntaxError);
});

test("write-result 재실행은 append 없이 긴 이전 결과를 완전히 덮어씀", async (t) => {
  const root = await fixture(t);
  const file = join(root, "nested", "sync-result.json");
  for (const result of [client, ai]) {
    execFileSync(process.execPath, ["--import", "tsx", "sync/write-result.ts", "--file", file, "--repository", result.repository, "--status", result.status, "--detail", result.detail]);
  }
  assert.equal(await readFile(file, "utf8"), JSON.stringify(ai) + "\n");
});

test("결과가 없는 디렉터리는 기존 빈 보고서 유지", async (t) => {
  const results = await readSyncResults(await fixture(t));
  assert.deepEqual(results, []);
  assert.match(renderSyncReport(results), /동기화 대상 레포가 없어요/);
});
