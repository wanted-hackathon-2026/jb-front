@README.md

스택·디렉터리 구조·모바일 전용 규칙·역할 분담은 위 README 가 정본이다. 여기엔 그 문서에
없는 것만 적는다.

## 백엔드 참조 — `../jb-backend`

Spring Boot 4.1 / Java 25, JPA + Flyway + MySQL. **읽기 전용이다** — 이 레포에서 여는
세션은 백엔드 파일을 고치거나 커밋하지 않는다(`.claude/settings.local.json` 에서 차단).

API 계약이 필요하면 **소스를 직접 읽는다.** 엔드포인트 목록이나 응답 필드를 이 문서에
베껴 적지 않는다 — 베껴 적은 순간 백엔드가 바뀌어도 아무도 고치지 않아 조용히 거짓말이
된다. 읽는 순서:

1. `src/main/java/com/jachwibangjeongsig/jb/**` 의 컨트롤러·DTO — 실제 요청/응답 모양
2. `src/main/resources/db/migration/*.sql` — **스키마 정본은 Flyway 마이그레이션이다**
   (엔티티 클래스가 아니라)

없는 건 없는 것이다. 응답 모양을 추측해서 프론트에 도메인 타입을 만들지 말고 먼저 묻는다
(점수 산식·도메인 모델은 백엔드 몫 — README '역할 분담').

참조 전에 로컬 클론이 낡지 않았는지 확인한다:

```bash
git -C ../jb-backend log -1 --date=short --format='%ad %h %s'
```

오래됐으면 pull 이 필요하다고 알린다 — 임의로 pull 하지 않는다.

로컬 기동(백엔드): `docker compose up -d` (MySQL 3306) 후 `./gradlew bootRun`.

## 이 레포 작업 규칙

- 커밋 전 `npm run type-check` 와 `npm run format` 을 돌린다.
- 백엔드 응답 타입을 손으로 둘 때는 출처를 주석에 박는다:
  `// 출처: UserController.java:42 (jb-backend <커밋해시>)`.
  백엔드에 springdoc 이 들어가면 이 방식을 버리고 OpenAPI → 타입 생성으로 갈아탄다.
