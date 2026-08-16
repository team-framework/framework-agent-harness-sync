import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { syncHarnessInstallation } from "./github-app.ts";

const maxBodyBytes = 25 * 1024 * 1024;

export function verifyWebhookSignature(secret: string, body: Buffer, signature?: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isSyncEvent(event?: string, action?: string) {
  return (event === "installation" && action === "created")
    || (event === "installation_repositories" && action === "added");
}

async function readBody(request: AsyncIterable<Buffer>) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("payload too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createWebhookHandler({ config, fetchImpl = fetch }: any) {
  let queue = Promise.resolve();
  return async (request: any, response: any) => {
    const url = new URL(request.url, "http://localhost");
    const respond = (status: number, body: string) => { response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }); response.end(body); };
    if (request.method === "GET" && url.pathname === "/healthz") return respond(200, "ok\n");
    if (request.method !== "POST" || url.pathname !== config.webhookPath) return respond(404, "not found\n");
    try {
      const body = await readBody(request);
      if (!verifyWebhookSignature(config.webhookSecret, body, request.headers["x-hub-signature-256"])) return respond(401, "invalid signature\n");
      const event = request.headers["x-github-event"];
      const deliveryId = request.headers["x-github-delivery"];
      if (!event || !deliveryId) return respond(400, "missing GitHub headers\n");
      const payload = JSON.parse(body.toString("utf8"));
      if (event === "ping") return respond(200, "pong\n");
      if (!isSyncEvent(event, payload.action)) return respond(200, "ignored\n");
      const task = () => syncHarnessInstallation({ installationId: payload.installation?.id, config, sourceRoot: process.cwd(), fetchImpl });
      const result = queue.then(task, task);
      queue = result.then(() => undefined, () => undefined);
      await result;
      return respond(202, "harness sync accepted\n");
    } catch (error: any) {
      console.error(`Harness sync webhook failed: ${error.message}`);
      return respond(error.statusCode || 502, "sync failed\n");
    }
  };
}

export function loadWebhookConfig(env = process.env) {
  const required = (name: string) => { const value = env[name]?.trim(); if (!value) throw new Error(`${name} 환경변수가 필요해요.`); return value; };
  return {
    appId: required("HARNESS_SYNC_APP_CLIENT_ID"),
    privateKey: required("HARNESS_SYNC_APP_PRIVATE_KEY").replace(/\\n/g, "\n"),
    sourceRepository: required("HARNESS_SYNC_SOURCE_REPOSITORY"),
    webhookSecret: required("GITHUB_WEBHOOK_SECRET"),
    webhookHost: env.GITHUB_WEBHOOK_HOST?.trim() || "0.0.0.0",
    webhookPort: Number(env.GITHUB_WEBHOOK_PORT || 3006),
    webhookPath: env.GITHUB_WEBHOOK_PATH?.trim() || "/github/webhooks"
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadWebhookConfig();
  createServer(createWebhookHandler({ config })).listen(config.webhookPort, config.webhookHost);
}
