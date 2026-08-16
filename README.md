# Framework Agent Harness

Framework 팀의 AI 에이전트 협업 규칙을 한 곳에서 관리하고, GitHub App을 통해 설치된 저장소에 Draft PR로 배포합니다.

## 관리하는 범위

- `AGENTS.md`, `CLAUDE.md`
- `.codex`, `.claude`, `.agent` SKILL
- GitHub Issue Form과 PR 템플릿
- `.gitattributes` 줄바꿈 규칙

## 어떻게 동작하나요?

1. 이 레포의 `main`에 협업 규칙 또는 템플릿 변경을 반영합니다.
2. GitHub Actions가 GitHub App이 설치된 레포 목록을 조회합니다.
3. 원본 레포·Fork·보관 레포·기본 브랜치가 없는 레포는 제외합니다.
4. 대상 레포마다 규칙과 템플릿 변경만 담은 Draft PR을 생성합니다.
5. 이미 열린 동기화 PR이 있다면 새 PR을 만들지 않고, 기존 PR이 머지되거나 닫힌 뒤 다음 동기화에서 다시 반영합니다.

기존 `AGENTS.md`와 `CLAUDE.md`는 덮어쓰지 않습니다. Framework 관리 영역만 갱신하므로, 각 제품의 고유 지시는 유지됩니다. 빈 레포도 초기 `.gitkeep` 커밋을 만든 뒤 Draft PR을 생성할 수 있습니다.

자세한 설정은 [하네스 자동 동기화](https://github.com/team-framework/framework-agent-harness-sync/blob/main/docs/HARNESS_SYNC.md)를 참고하세요.

## 확인

```bash
npm test
npm run typecheck
```
