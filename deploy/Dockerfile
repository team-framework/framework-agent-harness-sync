FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY sync ./sync
COPY .codex ./.codex
COPY .claude ./.claude
COPY .agent ./.agent
COPY AGENTS.md CLAUDE.md ./

USER node
CMD ["npm", "run", "sync:webhook"]
