# 하네스 자동 동기화

`framework-agent-harness-sync`가 협업 가이드의 원본이에요. 원본이 바뀌면 설치된 GitHub App이 접근할 수 있는 레포를 찾고, 동기화 정책을 통과한 레포에 필요한 파일만 담은 Draft PR을 만들어요. App을 새 레포에 설치하거나 기존 설치 범위에 새 레포를 추가할 때도 같은 정책을 적용해요.

## App 권한과 동기화 정책

GitHub App 접근 권한은 해당 레포에서 GitHub API를 호출할 수 있는 범위예요. 하네스 동기화 대상은 `sync/repository-policy.ts`에서 별도로 결정해요. Actions의 대상 검색과 설치 webhook이 같은 `selectTargets`를 호출하므로, 두 경로에 같은 제외 정책을 적용해요.

`team-framework/framework-llm-wiki`는 자동 하네스 동기화에서 제외해요. Discord 봇이 승인된 위키 제안의 branch·commit·PR을 만들 때 이 App 권한을 사용하므로, App 설치 목록에서 위키를 제거하지 않아요. 기존 문서·권한·Discord PR 생성 경로도 바꾸지 않아요.

`team-framework/framework-llm-wiki-mcp`도 자동 동기화에서 제외해요. MCP 서비스 저장소는 기존 에이전트 지침과 스킬을 자체 관리해요. 자동 동기화가 서버 실행에 필요한 단계는 아니며, App 설치 권한과 저장소 파일은 그대로 유지해요. 열린 동기화 PR #19는 별도로 닫아요.

위키 #76은 App 권한을 추가한 뒤 공통 스킬 원본 변경이 전파되면서 생성됐어요. PR을 닫는 것만으로는 다음 실행을 막을 수 없으므로 중앙 정책에서 위키를 제외해요. 이미 있는 파일이나 PR을 이 필터가 자동 삭제하지는 않아요.

다른 레포는 기존 설치 범위와 source·archive·disabled·fork 제외 조건을 유지해요. 앞으로 App 권한만 필요한 레포를 추가할 때는 스킬 배포 여부도 이 정책에서 정해요.

## 동기화 대상

- `AGENTS.md`, `CLAUDE.md` (기존 내용은 보존하고 하네스 관리 섹션만 추가 또는 갱신)
- `.codex/skills/**` (참고 문서·스크립트 포함)
- `.claude/skills/**` (참고 문서·스크립트 포함)
- `.agent/skills/**` (참고 문서·스크립트 포함)
- `.gitattributes`
- `.github/ISSUE_TEMPLATE/{01-feat,02-fix,03-chore,04-refactor}.yml`
- `.github/pull_request_template.md`

GitHub App 설치 토큰은 GitHub Actions workflow 파일을 만들 수 없으므로 `.github/workflows/assign-issue-author.yml`은 자동 동기화 대상에서 제외해요. Discord 알림 코드, 배포 설정, 대상 레포의 고유 스킬도 동기화하지 않아요.

`AGENTS.md` 또는 `CLAUDE.md`가 이미 있는 대상 레포는 해당 파일을 덮어쓰지 않아요. `framework-collaboration-harness` 관리 마커 사이의 섹션만 갱신하므로 제품 고유 지시는 유지돼요.

같은 대상 레포에 열린 동기화 PR이 있으면 새 PR을 만들지 않아요. PR을 머지하거나 닫은 다음 실행에서 최신 원본으로 다시 동기화해요.

자동 동기화 PR은 작업 이슈가 없는 봇 작업이므로 일반 PR의 이슈 번호 규칙 대신 `chore: framework-agent-harness-sync` 제목을 사용해요.

## 최초 설정

GitHub App을 조직에 설치할 때는 우선 아래 세 레포만 선택해요.

- `innolive-client`
- `innolive-server`
- `innolive-ai`

이후 App 설치 범위를 바꾸면 다음 동기화에서 후보 목록에 반영돼요. 동기화 제외 정책에 있는 레포에는 스킬 PR을 만들지 않아요.

App에는 아래 Repository permissions가 필요해요.

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read-only

App은 `Installation`과 `Installation repositories` webhook을 구독해요. App의 Client ID는 이 레포 Variables의 `HARNESS_SYNC_APP_CLIENT_ID`에, private key는 Secrets의 `HARNESS_SYNC_APP_PRIVATE_KEY`에 넣어요. 설치 직후 동기화용 webhook 서비스는 다음 단계에서 이 레포에 배포하고, `HARNESS_SYNC_SOURCE_REPOSITORY=team-framework/framework-agent-harness-sync`를 사용해요.

설정 전에는 워크플로가 실패하지 않고 동기화를 건너뛰어요. 설정 후 빈 레포 하나에 App을 설치해 `chore: framework-agent-harness-sync` Draft PR이 생성되는지 확인해요. 기존 설치 레포는 Actions에서 **Sync Collaboration Harness**를 수동 실행해 최초 동기화를 할 수 있어요.

## 2026-09-29 위키 제외 검증

- TypeScript 검사와 테스트 13개 통과. canonical 이름과 대소문자가 섞인 위키 이름을 제외하고, `framework-llm-wiki-mcp`·다른 조직·유사 이름 저장소는 유지하는지 확인했어요.
- mock installation에 위키와 일반 저장소를 함께 넣어 위키의 GitHub API 읽기·쓰기 0회와 다른 저장소의 전체 스킬 Draft PR 생성을 확인했어요.
- 운영 App의 실제 설치 목록 5개를 읽어 같은 CLI로 필터링했어요. 위키만 제외하고 동기화 대상 4개를 유지했어요. App은 위키 접근과 Contents/PR write 권한을 그대로 가지고 있어요. 토큰·키는 출력하거나 저장소에 기록하지 않았어요.
- 위키 #76은 확인 당시 이미 닫혀 있었어요. 이 검증에서는 새 PR을 발행하거나 기존 PR을 수정하지 않았어요.

이 정책은 변경 PR을 main에 병합한 뒤 Actions에 적용돼요. 설치 webhook에는 이어지는 `Deploy Harness Sync Webhook` 배포가 완료되어야 적용돼요. 실제 설치 목록을 이용한 CLI 검증과 운영 배포 완료를 구분해요.

## 2026-09-30 MCP 저장소 제외 검증

- 저장소 이름을 정확히 비교해 정본 위키와 MCP 서비스 저장소만 제외하고, 다른 조직의 동명 저장소와 비슷한 이름의 저장소는 유지하는지 확인했어요.
- 설치 webhook 모의 실행에서 두 저장소에 대한 GitHub API 읽기·쓰기 요청이 없고 다른 저장소의 Draft PR은 생성되는지 확인했어요.
- TypeScript 검사와 테스트 13개를 통과했어요. 운영 반영에는 이 변경의 병합과 webhook 재배포가 필요해요.
