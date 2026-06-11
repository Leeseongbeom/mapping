# 라스트워 시즌2 보급품 좌표 맵

라스트워 시즌2 보급품 좌표를 지도에서 확인하고, 사용한 보급품을 함께 관리하는 웹앱입니다. 일반 사용자는 보기만 할 수 있고, 관리자는 관리자 코드로 들어가 사용 좌표를 추가/취소할 수 있습니다.

현재 배포 URL:

- https://mapping-r84b.onrender.com

## 주요 기능

- `0,0`부터 `999,999`까지의 좌표 지도 표시
- 출처별 좌표 전환
  - `CptHedgehog`
  - `금고`
- 단계별 보급품 전환
  - CptHedgehog: 2~7단계
  - 금고: 1~6단계
- 남은 보급품과 사용한 보급품 분리 표시
- 지도 핀 클릭으로 사용/취소 처리
- 좌표 클릭 시 해당 위치로 이동하고 신호 펄스 표시
- 파란색/빨간색/보라색 핀 구분
  - 파란색: 남은 보급품
  - 빨간색: 사용한 보급품
  - 보라색: 보급품 목록에는 없지만 수기 입력된 보정 좌표
- 수기 입력 좌표 주변 9x9 빗금 영역 표시
- 건물 표시 토글
- 연소탄 9x9 임시 범위 표시
- 연맹 용광로 5x5 본체, 38x38 온도 범위 표시
- 연소탄으로 2개 이상 같이 먹기 좋은 좌표 추천
- 남은 보급품/사용한 보급품 목록 복사
- 관리자 모드에서 대량 사용 좌표 추가
- 상위 관리자 모드에서 사용 목록 변경 로그 열람, 버전 미리보기, 사용자 화면 반영
- 접속자/방문자 통계 표시

## 파일 구조

```text
.
├── index.html                  # 화면 구조
├── styles.css                  # 디자인과 반응형 레이아웃
├── app.js                      # 지도, 목록, 관리자 UI, 클라이언트 로직
├── server.js                   # Node 서버, API, 정적 파일 서빙
├── supply-data.js              # CptHedgehog 출처 보급품 좌표
├── geumgo-data.js              # 금고 출처 보급품 좌표와 원본 사용 표시
├── source-level-coordinates.txt# 출처별/단계별 좌표 정리 텍스트
├── supabase_schema.sql         # Supabase 테이블/RPC 생성 SQL
├── Dockerfile                  # Render Docker 배포용 설정
├── DEPLOY.md                   # 간단 배포 메모
└── data/                       # 로컬 실행 시 사용되는 저장 파일
```

## 좌표 데이터

앱에 반영된 정적 좌표는 아래 파일에 있습니다.

- CptHedgehog: `supply-data.js`
- 금고: `geumgo-data.js`
- 보기용 전체 정리: `source-level-coordinates.txt`

배포된 텍스트 파일:

- https://mapping-r84b.onrender.com/source-level-coordinates.txt

## 저장 구조

보급품 원본 좌표는 코드 파일에 정적으로 들어 있습니다. 사용자가 사용 처리한 좌표는 서버 저장소에 저장됩니다.

저장소 우선순위:

1. Supabase 환경변수가 있으면 Supabase 사용
2. Supabase 환경변수가 없으면 `data/used.json` 로컬 파일 사용

Supabase 저장값 예시:

```text
123,456       # CptHedgehog 3단계 호환 저장값
L4:123,456    # CptHedgehog 4단계
G3:123,456    # 금고 3단계
H:G3:123,456  # 금고 3단계 원본 사용표시를 관리자가 취소한 숨김값
```

`H:`로 시작하는 값은 원본 데이터에 이미 사용 표시되어 있던 좌표를 관리자가 미사용으로 되돌렸을 때 사용됩니다.

## 관리자 모드

일반 사용자는 보기, 검색, 줌, 이동, 복사만 가능합니다. 좌표 수정은 관리자 모드에서만 가능합니다.

관리자 모드에서 가능한 일:

- 지도에서 파란 핀 클릭: 사용 처리
- 지도에서 빨간 핀 클릭: 사용 취소
- 사용 목록 대량 추가
- 사용한 보급품 목록에서 개별 취소
- 현재 출처/단계 사용 전체 취소
- 접속자/방문자 통계 확인

관리자 코드는 서버 환경변수 `ADMIN_CODE`로 정합니다.

## 상위 관리자 모드

상위 관리자 코드는 서버 환경변수 `SUPER_ADMIN_CODE`로 정합니다. 기본값은 `lastwar2185`입니다.

상위 관리자 모드에서 가능한 일:

- 사용 목록 변경 로그 열람
- 변경 로그의 `변경 전` / `변경 후` 상태를 내 화면에서만 미리보기
- 선택한 로그의 `변경 후` 버전을 실제 사용자 화면에 반영
- 미리보기 중 `실시간 목록으로 돌아가기`

일반 관리자(`ADMIN_CODE`)는 좌표 수정은 가능하지만 변경 로그와 버전 반영 기능은 볼 수 없습니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm start
```

관리자 코드를 지정해서 실행:

```bash
ADMIN_CODE="원하는관리자암호" npm start
```

기본 포트는 `4174`입니다.

```text
http://127.0.0.1:4174
```

다른 포트로 실행:

```bash
PORT=4198 ADMIN_CODE="원하는관리자암호" SUPER_ADMIN_CODE="상위관리자암호" npm start
```

## Supabase 설정

Supabase를 쓰면 Render가 재시작되거나 재배포되어도 사용 좌표가 유지됩니다.

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase_schema.sql` 실행
3. Project URL 복사
4. `service_role` key 복사
5. Render 환경변수에 입력

필요 환경변수:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_TABLE=used_coordinates
SUPABASE_HISTORY_TABLE=used_history
ADMIN_CODE=원하는관리자암호
SUPER_ADMIN_CODE=상위관리자암호
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 프론트엔드 코드에 넣으면 안 됩니다.
- 이 앱은 서버에서만 service role key를 사용합니다.

## Render 배포

이 저장소는 Dockerfile이 있으므로 Render에서 Docker 기반으로 배포할 수 있습니다.

권장 설정:

```text
Environment: Docker
Branch: main
Dockerfile: Dockerfile
```

환경변수:

```text
ADMIN_CODE=원하는관리자암호
SUPER_ADMIN_CODE=상위관리자암호
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_TABLE=used_coordinates
SUPABASE_HISTORY_TABLE=used_history
```

Render 무료 플랜은 일정 시간 접속이 없으면 잠들 수 있습니다. 이 경우 첫 접속이 조금 느릴 수 있습니다.

## 좌표 수정 방법

### CptHedgehog 좌표 수정

`supply-data.js`에서 단계별 문자열을 수정합니다.

```js
export const SUPPLY_BY_LEVEL = {
  3: `
123,456 124,457
`,
};
```

### 금고 좌표 수정

`geumgo-data.js`에서 수정합니다.

- `GEUMGO_SUPPLY_BY_LEVEL`: 전체 보급품 좌표
- `GEUMGO_INITIAL_USED_BY_LEVEL`: 금고 원본에서 이미 사용 표시된 좌표

좌표는 `x,y` 형식으로 입력합니다.

## 배포 반영 순서

수정 후:

```bash
git status
git add .
git commit -m "작업 내용"
git push origin main
```

Render가 GitHub push를 감지하면 자동으로 재배포합니다.

## 검증 명령

배포 전에 최소한 아래를 확인합니다.

```bash
node --check app.js
node --check server.js
git diff --check
```

## 운영 팁

- 좌표가 보급품 목록에 없는데 사용 좌표로 추가되면 보라색 수기 보정 핀으로 표시됩니다.
- 보라색 핀 주변에는 9x9 빗금 영역이 표시되어, 잘못 적힌 좌표 근처의 보급품이 사용되었을 가능성을 판단할 수 있습니다.
- 연소탄 찍기와 용광로 찍기는 동시에 켜지지 않습니다. 하나를 켜면 다른 하나는 꺼집니다.
- `현재 단계 사용 전체 취소`는 현재 선택한 출처와 단계에만 적용됩니다.
- 변경 로그는 `used_history`에 저장됩니다. Supabase 운영 환경에서는 `supabase_schema.sql`을 한 번 실행해 테이블을 만들어야 합니다.
- `source-level-coordinates.txt`는 확인용 텍스트 파일입니다. 앱 데이터 자체는 `supply-data.js`, `geumgo-data.js`가 기준입니다.

## 주의사항

- `data/used.json`은 로컬 저장용입니다. Render 운영에서는 Supabase 사용을 권장합니다.
- 관리자 코드는 단순 암호 방식입니다. 링크를 아는 모든 사람이 접속할 수 있으므로 관리자 코드는 외부에 공유하지 마세요.
- GitHub 저장소를 private으로 바꿔도 Render가 해당 저장소 접근 권한을 유지하면 앱은 계속 작동합니다.
