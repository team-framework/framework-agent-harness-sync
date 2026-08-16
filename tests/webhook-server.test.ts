import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { isSyncEvent, verifyWebhookSignature } from "../sync/webhook-server.ts";

test("GitHub webhook HMAC-SHA256 서명을 검증해요", () => {
  const secret = "webhook-secret";
  const body = Buffer.from("payload");
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifyWebhookSignature(secret, body, signature), true);
  assert.equal(verifyWebhookSignature(secret, body, "sha256=invalid"), false);
});

test("설치 생성과 레포 추가 이벤트만 즉시 동기화해요", () => {
  assert.equal(isSyncEvent("installation", "created"), true);
  assert.equal(isSyncEvent("installation_repositories", "added"), true);
  assert.equal(isSyncEvent("installation", "deleted"), false);
  assert.equal(isSyncEvent("push", "created"), false);
});
