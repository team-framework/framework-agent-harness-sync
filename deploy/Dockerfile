FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY sync ./sync
COPY .codex ./.codex
COPY .claude ./.claude
COPY .agent ./.agent
COPY .github ./.github
COPY AGENTS.md CLAUDE.md .gitattributes ./

RUN chmod -R a+rX /app

USER node
CMD ["npm", "run", "sync:webhook"]
