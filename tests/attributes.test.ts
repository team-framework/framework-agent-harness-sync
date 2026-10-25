import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { applyHarnessFiles } from "../sync/apply.ts";
import { mergeManagedAttributes } from "../sync/attributes.ts";
import { syncItems } from "../sync/manifest.ts";

const source = await readFile(new URL("../.gitattributes", import.meta.url), "utf8");
const block = `# framework-collaboration-harness:start\n${source.trim()}\n# framework-collaboration-harness:end\n`;
const clientLfs = "apps/android/InnoLive/app/src/main/assets/privacy-face.onnx filter=lfs diff=lfs merge=lfs -text\n"
  + "apps/android/InnoLive/app/src/main/assets/privacy-face.tflite filter=lfs diff=lfs merge=lfs -text\n";
const aiLfs = "*.pt filter=lfs diff=lfs merge=lfs -text\n";
const staleBlock = "# framework-collaboration-harness:start\n*.old text\n# framework-collaboration-harness:end\n";

const cases = [
  { name: "파일이 없는 새 저장소", existing: undefined, expected: block },
  { name: "빈 파일", existing: "", expected: block },
  { name: "LFS 규칙만 있는 파일", existing: aiLfs, expected: aiLfs + block },
  { name: "마지막 개행이 없는 파일", existing: aiLfs.trimEnd(), expected: aiLfs + block },
  { name: "마커 없는 기존 하네스 파일", existing: source, expected: block + "\n" },
  { name: "innolive-client의 기존 규칙과 두 LFS 규칙", existing: source + clientLfs, expected: block + "\n" + clientLfs },
  { name: "innolive-ai의 기존 규칙과 LFS 규칙", existing: source + aiLfs, expected: block + "\n" + aiLfs },
  {
    name: "주석에서 마커를 언급하는 고유 내용",
    existing: "# example: # framework-collaboration-harness:start\n" + aiLfs + "# example: # framework-collaboration-harness:end\n",
    expected: "# example: # framework-collaboration-harness:start\n" + aiLfs + "# example: # framework-collaboration-harness:end\n" + block
  },
  {
    name: "닫는 마커가 없는 기존 내용",
    existing: "# framework-collaboration-harness:start\n" + aiLfs,
    expected: "# framework-collaboration-harness:start\n" + aiLfs + block
  },
  {
    name: "기존 규칙 사이의 주석·공백·CRLF·유사 규칙",
    existing: "# custom  \r\n- text=auto eol=lf\r\n" + aiLfs + " \r\n*.md       text eol=lf linguist-detectable\r\n*.json text eol=crlf\n# tail  ",
    expected: "# custom  \r\n" + block + aiLfs + " \r\n*.json text eol=crlf\n# tail  "
  },
  {
    name: "관리 블록 양쪽의 고유 내용과 동일한 규칙 보존",
    existing: "# before\n- text=auto eol=lf\n\n" + staleBlock + clientLfs + "\n# tail  ",
    expected: "# before\n- text=auto eol=lf\n\n" + block + clientLfs + "\n# tail  "
  },
  {
    name: "CRLF 관리 블록 뒤 빈 줄 보존",
    existing: staleBlock.replaceAll("\n", "\r\n") + "\r\n" + aiLfs,
    expected: block + "\r\n" + aiLfs
  }
];

for (const { name, existing, expected } of cases) {
  test(`.gitattributes 로컬 적용 및 재실행: ${name}`, async (t) => {
    const targetRoot = await mkdtemp(join(tmpdir(), "harness-attributes-"));
    t.after(() => rm(targetRoot, { recursive: true, force: true }));
    if (existing !== undefined) await writeFile(join(targetRoot, ".gitattributes"), existing);
    const options = {
      sourceRoot: process.cwd(),
      targetRoot,
      items: syncItems.filter((item) => item.destination === ".gitattributes")
    };

    await applyHarnessFiles(options);
    assert.equal(await readFile(join(targetRoot, ".gitattributes"), "utf8"), expected);
    await applyHarnessFiles(options);
    assert.equal(await readFile(join(targetRoot, ".gitattributes"), "utf8"), expected);
  });
}

test("원본 규칙이 바뀌어도 이전 하네스 규칙을 중복 없이 이전해요", () => {
  const updatedSource = "*.md text eol=lf\n";
  const expected = "# framework-collaboration-harness:start\n*.md text eol=lf\n# framework-collaboration-harness:end\n\n" + aiLfs;
  const merged = mergeManagedAttributes(source + aiLfs, updatedSource);
  assert.equal(merged, expected);
  assert.equal(mergeManagedAttributes(merged, updatedSource), expected);
});
