import { pathToFileURL } from "node:url";

export const syncPullRequestBody = `## 변경 내용

- Framework 공통 협업 파일 변경 반영
- 저장소 고유 지침과 관리 대상 밖 파일 유지

## 검증 결과

- 동기화 변경 파일 생성 완료
- 대상 저장소 검증 대기

## 머지 체크리스트

- [ ] 변경 범위 확인
- [ ] 대상 저장소 검증 완료
- [ ] 검증 결과 및 미검증 범위 기재

## 관련 이슈

- 관련 이슈 없음: 자동 하네스 동기화
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(syncPullRequestBody);
}
