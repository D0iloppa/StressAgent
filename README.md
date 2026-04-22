# StressAgent - CLI 부하 테스트 도구

실제 브라우저를 시뮬레이션하여 웹 페이지에 대한 현실적인 부하를 발생시키는 Node.js 기반 CLI 부하 테스트 도구입니다.

## 특징

- **실제 브라우저 렌더링**: Puppeteer 헤드리스 브라우저로 HTML, CSS, JavaScript를 포함한 전체 리소스 로드
- **병렬 워커 실행**: n개의 워커를 동시에 실행하여 현실적인 부하 시뮬레이션
- **유연한 시나리오**: JavaScript로 복잡한 사용자 행동 (클릭, 입력, 스크롤 등) 매크로 정의
- **상세 메트릭**: 응답 시간, 분위수(p50, p95, p99), 에러 분류, 실시간 통계
- **결과 저장**: CLI 진행 표시 + JSON 형식 로그 파일
- **단순한 설정**: YAML 기반 config로 쉬운 설정

## 요구사항

- Node.js >= 14.x
- npm >= 6.x

## 설치

```bash
# 저장소 클론
git clone <repository-url>
cd StressAgent

# 의존성 설치
npm install
```

## 빠른 시작

### 1. config.yml 작성

```yaml
# config.yml
url: "https://example.com"
workers: 5              # 동시 실행할 워커 수
iterations: 10          # 각 워커별 반복 횟수
scenarioFile: "./scenarios/example.js"  # 시나리오 파일 경로

# 선택 옵션
timeout: 30000          # 페이지 로드 타임아웃 (ms)
headless: true          # 헤드리스 모드 (기본값)
slowMo: 0               # 느린 동작 시뮬레이션 (ms)
```

### 2. 시나리오 파일 작성

```javascript
// scenarios/example.js
module.exports = {
  name: "Example Scenario",
  run: async (page) => {
    // 페이지 방문
    await page.goto('https://example.com', { 
      waitUntil: 'networkidle2' 
    });
    
    // 엘리먼트 클릭
    await page.click('button.login');
    
    // 텍스트 입력
    await page.type('input#username', 'testuser');
    await page.type('input#password', 'password123');
    
    // 대기
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }
};
```

### 3. 부하 테스트 실행

```bash
# config.yml을 기반으로 실행
node bin/stressagent.js config.yml

# 출력 예
# ┌─ StressAgent v1.0.0 ────────────────────┐
# │ 부하 테스트 시작                         │
# │ URL: https://example.com                │
# │ 워커 수: 5, 반복 횟수: 10               │
# └─────────────────────────────────────────┘
#
# [▓▓▓▓▓░░░░░░░░░░░░░░] 27%  (27/100)
# 누적 요청: 27 | 성공: 26 | 실패: 1
# 평균 응답시간: 2154ms | p95: 3821ms | p99: 4102ms
```

## 설정 파일 (config.yml)

### 필수 항목

| 항목 | 설명 | 예제 |
|------|------|------|
| `url` | 부하 테스트 대상 URL | `https://example.com` |
| `workers` | 동시 실행할 워커 수 | `5` |
| `iterations` | 각 워커별 반복 횟수 | `10` |
| `scenarioFile` | 시나리오 JavaScript 파일 경로 | `./scenarios/example.js` |

### 선택 항목

| 항목 | 기본값 | 설명 |
|------|--------|------|
| `timeout` | `30000` | 페이지 로드 타임아웃 (밀리초) |
| `headless` | `true` | 헤드리스 모드 (GUI 없음) |
| `slowMo` | `0` | 느린 동작 시뮬레이션 (밀리초) |
| `viewport` | `{ width: 1280, height: 720 }` | 브라우저 뷰포트 크기 |

## 시나리오 작성 가이드

시나리오는 JavaScript 모듈로, Puppeteer의 `Page` 객체를 활용합니다.

### 기본 구조

```javascript
module.exports = {
  name: "시나리오 이름 (선택사항)",
  run: async (page) => {
    // page는 Puppeteer Page 객체
    // 모든 Puppeteer Page API를 사용할 수 있음
  }
};
```

### 자주 사용되는 동작

```javascript
module.exports = {
  name: "Login and Browse",
  run: async (page) => {
    // 1. 페이지 방문
    await page.goto('https://example.com/login', {
      waitUntil: 'networkidle2'  // 모든 네트워크 요청 완료 대기
    });
    
    // 2. 폼 입력
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="password"]', 'password123');
    
    // 3. 클릭 후 네비게이션 대기
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // 4. 특정 엘리먼트 대기
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    
    // 5. 스크롤
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    // 6. 링크 클릭
    await page.click('a.product-link');
    
    // 7. 지연
    await page.waitForTimeout(1000);  // 1초 대기
  }
};
```

### 복잡한 예제: 장바구니 추가

```javascript
module.exports = {
  name: "Add to Cart Scenario",
  run: async (page) => {
    // 상품 목록 페이지 방문
    await page.goto('https://shop.example.com/products', {
      waitUntil: 'networkidle2'
    });
    
    // 첫 번째 상품 클릭
    await page.click('.product-item:first-child .title');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // 수량 입력
    await page.click('input[name="quantity"]');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('2');
    
    // 장바구니에 추가 버튼 클릭
    await Promise.all([
      page.click('button.add-to-cart'),
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
  }
};
```

## 결과 해석

### CLI 출력

```
┌─ StressAgent v1.0.0 ────────────────────┐
│ 부하 테스트 시작                         │
│ URL: https://example.com                │
│ 워커 수: 5, 반복 횟수: 10               │
│ 시나리오: Example Scenario              │
└─────────────────────────────────────────┘

[▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░] 50%  (50/100)
누적 요청: 50 | 성공: 48 | 실패: 2
평균 응답시간: 2154ms
분포: p50=1852ms | p95=3821ms | p99=4102ms
```

- **누적 요청**: 완료된 요청 수
- **성공/실패**: 정상 응답 vs 에러 발생
- **평균 응답시간**: 모든 요청의 평균 (밀리초)
- **분위수**:
  - **p50 (중앙값)**: 50%의 요청이 이 시간 이하
  - **p95**: 95%의 요청이 이 시간 이하 (느린 5%)
  - **p99**: 99%의 요청이 이 시간 이하 (매우 느린 1%)

### JSON 결과 파일

```bash
# 실행 후 로그 디렉터리 확인
ls -la logs/

# logs/result-2026-04-22T14-30-45-123Z.json
```

```json
{
  "metadata": {
    "url": "https://example.com",
    "workers": 5,
    "iterations": 10,
    "startTime": "2026-04-22T14:30:45.123Z",
    "endTime": "2026-04-22T14:31:02.456Z",
    "duration": "17.333s"
  },
  "summary": {
    "totalRequests": 50,
    "successCount": 48,
    "failureCount": 2,
    "successRate": "96%"
  },
  "responseTimes": {
    "min": 1205,
    "max": 4521,
    "mean": 2154,
    "median": 1852,
    "p95": 3821,
    "p99": 4102
  },
  "errors": [
    {
      "worker": 1,
      "iteration": 3,
      "type": "TimeoutError",
      "message": "Navigation timeout of 30000ms exceeded",
      "timestamp": "2026-04-22T14:30:52.456Z"
    }
  ],
  "requests": [
    {
      "worker": 0,
      "iteration": 1,
      "url": "https://example.com",
      "responseTime": 1852,
      "status": "success",
      "timestamp": "2026-04-22T14:30:48.456Z"
    }
  ]
}
```

## 사용 예제

### 예제 1: 간단한 페이지 로드 테스트

```bash
# config.yml
url: "https://example.com"
workers: 10
iterations: 5
scenarioFile: "./scenarios/simple-load.js"
timeout: 20000
```

```javascript
// scenarios/simple-load.js
module.exports = {
  name: "Simple Page Load",
  run: async (page) => {
    await page.goto(process.env.TEST_URL || 'https://example.com', {
      waitUntil: 'networkidle2'
    });
  }
};
```

```bash
# 실행
node bin/stressagent.js config.yml
```

### 예제 2: 로그인 흐름 테스트

```javascript
// scenarios/login-flow.js
module.exports = {
  name: "Login Flow Test",
  run: async (page) => {
    await page.goto('https://example.com/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="password"]', 'testpass123');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // 로그인 성공 확인
    await page.waitForSelector('.user-dashboard', { timeout: 5000 });
  }
};
```

### 예제 3: 다중 워커 높은 부하

```bash
# config.yml
url: "https://example.com"
workers: 50          # 50개 동시 워커
iterations: 20       # 각 워커당 20회 반복
scenarioFile: "./scenarios/heavy-load.js"
timeout: 45000
headless: true
```

## 트러블슈팅

### 문제 1: "TimeoutError: Navigation timeout exceeded"

**원인**: 페이지 로드 시간이 config의 `timeout` 설정을 초과

**해결책**:
```yaml
timeout: 60000  # 60초로 증가
```

### 문제 2: "Error: Target page, context or browser has been closed"

**원인**: 시나리오 실행 중 브라우저가 예기치 않게 종료

**해결책**:
- 시나리오에서 과도한 메모리 사용 피하기
- 워커 수 감소
- 긴 대기 시간 확인

### 문제 3: "Cannot find module './scenarios/...'"

**원인**: 시나리오 파일 경로가 잘못됨

**해결책**:
```yaml
scenarioFile: "./scenarios/example.js"  # 상대 경로 확인
# 또는 절대 경로 사용
scenarioFile: "/usr/local/StressAgent/scenarios/example.js"
```

### 문제 4: CPU/메모리 부족

**원인**: 너무 많은 동시 워커로 인한 리소스 부족

**해결책**:
```yaml
workers: 10  # 워커 수 감소
iterations: 5  # 반복 횟수 감소
```

```bash
# 시스템 리소스 확인
free -h    # 메모리
top        # CPU 사용률
```

## 성능 최적화 팁

1. **초기 워커 수**: 시스템의 CPU 코어 수 기준으로 시작 (예: 4코어 = 4-8 워커)
2. **반복 횟수**: 작은 수로 시작해 필요에 따라 증가 (예: 5-10)
3. **네트워크 대기**: `waitUntil` 옵션으로 불필요한 대기 최소화
4. **헤드리스 모드**: 항상 `headless: true` 사용 (성능 향상)
5. **시나리오 최적화**: 불필요한 `wait` 제거, 병렬 작업 활용

## 아키텍처 개요

```
CLI Entry Point (bin/stressagent.js)
    ↓
Config Parser (config.yml)
    ↓
Worker Pool Manager (Worker 생성/조율)
    ↓
Scenario Loader (scenarios/*.js)
    ↓
Browser Automation (Puppeteer)
    ↓
Results Aggregator (메트릭 수집)
    ↓
Output Handler (CLI + JSON 로그)
```

## 파일 구조

```
StressAgent/
├── bin/
│   └── stressagent.js                  # CLI 진입점
├── src/
│   ├── configParser.js                 # YAML 파서
│   ├── workerPool.js                   # Worker 관리
│   ├── scenarioLoader.js               # 시나리오 로더
│   ├── metricsCollector.js             # 메트릭 수집
│   └── outputHandler.js                # 결과 출력
├── scenarios/
│   ├── example.js                      # 기본 예제
│   ├── simple-load.js                  # 단순 로드 테스트
│   └── login-flow.js                   # 로그인 흐름
├── logs/                               # 결과 저장 (자동 생성)
├── config.yml                          # 설정 파일 (기본값)
├── package.json                        # 의존성
├── README.md                           # 이 파일
└── .gitignore
```

## 라이센스

MIT

## 기여

이슈 제출 및 풀 리퀘스트 환영합니다!

## 추가 지원

문제 발생 시:
1. [Issues](https://github.com/your-repo/issues)에서 기존 이슈 확인
2. 자세한 에러 메시지 및 config.yml 공유
3. 시스템 환경 정보 제공 (OS, Node.js 버전)
