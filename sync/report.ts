import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const statusText = {
  no_changes: "변경 없음",
  existing_pr: "기존 동기화 PR 대기",
  pr_created: "Draft PR 생성",
  skipped: "건너뜀"
};

export function renderSyncReport(results) {
  if (results.length === 0) {
    return "## 협업 하네스 동기화\n\nGitHub App 설정이 없거나 동기화 대상 레포가 없어요.";
  }

  const rows = results
    .sort((left, right) => left.repository.localeCompare(right.repository))
    .map((result) => "| " + result.repository + " | " + (statusText[result.status] || result.status) + " | " + (result.detail || "-") + " |");

  return [
    "## 협업 하네스 동기화",
    "",
    "| 대상 레포 | 결과 | 상세 |",
    "| --- | --- | --- |",
    ...rows
  ].join("\n");
}

export function parseSyncResults(content: string) {
  try {
    return [JSON.parse(content)];
  } catch {
    // Accept older newline-delimited results without hiding damaged JSON.
    return content.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  }
}

export async function readSyncResults(directory: string): Promise<any[]> {
  const files = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(files.map(async (file) => {
    const path = join(directory, file.name);
    // Keep artifact directories separate: every target uses sync-result.json.
    if (file.isDirectory()) return readSyncResults(path);
    if (file.isFile() && file.name.endsWith(".json")) {
      return parseSyncResults(await readFile(path, "utf8"));
    }
    return [];
  }));
  return results.flat();
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const resultsDirectory = argument("--results-directory");
  if (!resultsDirectory) throw new Error("사용법: tsx sync/report.ts --results-directory <directory>");

  console.log(renderSyncReport(await readSyncResults(resultsDirectory)));
}
