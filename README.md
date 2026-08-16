# Framework Agent Harness

Framework 팀의 AI 에이전트 협업 규칙을 한 곳에서 관리하고, GitHub App을 통해 설치된 저장소에 Draft PR로 배포합니다.

## 관리하는 범위

- `AGENTS.md`, `CLAUDE.md`
- `.codex`, `.claude`, `.agent` SKILL
- GitHub Issue Form과 PR 템플릿

## 어떻게 동작하나요?

1. 이 레포의 `main`에 협업 규칙 또는 템플릿 변경을 반영합니다.
2. GitHub Actions가 GitHub App이 설치된 레포 목록을 조회합니다.
3. 대상 레포마다 변경사항을 동기화하는 Draft PR을 생성합니다.
4. 이미 열린 동기화 PR이 있다면 새 PR을 만들지 않고, 기존 PR이 머지되거나 닫힌 뒤 다음 동기화에서 다시 반영합니다.

기존 `AGENTS.md`와 `CLAUDE.md`는 덮어쓰지 않습니다.
빈 레포지토리는 `.gitkeep` 커밋을 만든 뒤 동기화 PR을 생성할 수 있습니다.

자세한 설정은 [하네스 자동 동기화](https://github.com/team-framework/framework-agent-harness-sync/blob/main/docs/HARNESS_SYNC.md)를 참고하세요.
