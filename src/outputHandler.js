/**
 * Output Handler
 * 
 * 실시간 CLI 출력과 JSON 결과 저장을 담당하는 모듈
 */

const fs = require('fs');
const path = require('path');

/**
 * 진행률 바 표시
 * @param {number} current - 현재 진행도
 * @param {number} total - 전체 수
 * @param {number} width - 바의 너비 (문자)
 * @returns {string} 진행률 바
 */
function getProgressBar(current, total, width = 20) {
  const percentage = (current / total) * 100;
  const filledWidth = Math.round((width / 100) * percentage);
  const emptyWidth = width - filledWidth;

  const bar = '▓'.repeat(filledWidth) + '░'.repeat(emptyWidth);
  const percentStr = percentage.toFixed(0).padStart(3) + '%';

  return `[${bar}] ${percentStr}  (${current}/${total})`;
}

/**
 * 실시간 진행 상황 출력
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @param {number} totalRequests - 총 요청 수
 * @param {number} interval - 출력 간격 (밀리초)
 */
class ProgressPrinter {
  constructor(totalRequests, interval = 1000) {
    this.totalRequests = totalRequests;
    this.interval = interval;
    this.lastPrintTime = 0;
    this.lastRequestCount = 0;
  }

  /**
   * 진행 상황 업데이트 (조절된 출력)
   * @param {MetricsCollector} metrics - 메트릭 수집기
   */
  update(metrics) {
    const now = Date.now();
    const currentCount = metrics.requests.length;

    // 간격 조절: interval 밀리초마다만 출력
    if (now - this.lastPrintTime < this.interval) {
      return;
    }

    this.lastPrintTime = now;
    this.print(metrics, currentCount);
  }

  /**
   * 진행 상황 출력
   * @param {MetricsCollector} metrics - 메트릭 수집기
   * @param {number} currentCount - 현재 요청 수
   */
  print(metrics, currentCount) {
    const summary = metrics.getSummary();
    const stats = metrics.calculateStats();

    // ANSI 커서 위로 3줄 (이전 진행 표시 덮어쓰기)
    // 단순 방식: 매번 새로운 라인 출력 (더 간단함)
    // 실제 덮어쓰기를 원하면 readline 모듈 사용 필요

    console.log(`\n[${new Date().toLocaleTimeString('ko-KR')}]`);
    console.log(getProgressBar(currentCount, this.totalRequests));
    console.log(
      `누적 요청: ${currentCount} | 성공: ${summary.successCount} | 실패: ${summary.failureCount}`
    );

    if (stats.count > 0) {
      console.log(
        `평균 응답시간: ${stats.mean}ms | p95: ${stats.p95}ms | p99: ${stats.p99}ms`
      );
    }
  }

  /**
   * 최종 결과 출력
   * @param {MetricsCollector} metrics - 메트릭 수집기
   */
  printFinal(metrics) {
    const summary = metrics.getSummary();
    const stats = metrics.calculateStats();
    const duration = metrics.endTime && metrics.startTime
      ? ((metrics.endTime - metrics.startTime) / 1000).toFixed(3)
      : 'N/A';

    console.log('\n' + '='.repeat(60));
    console.log('✓ 부하 테스트 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 최종 결과:');
    console.log(`  총 요청 수: ${summary.totalRequests}`);
    console.log(`  성공: ${summary.successCount} | 실패: ${summary.failureCount}`);
    console.log(`  성공률: ${summary.successRate}`);
    console.log(`  소요 시간: ${duration}s`);

    console.log('\n⏱️  응답 시간 통계 (성공 요청만):');
    console.log(`  최소: ${stats.min}ms`);
    console.log(`  최대: ${stats.max}ms`);
    console.log(`  평균: ${stats.mean}ms`);
    console.log(`  중앙값 (p50): ${stats.median}ms`);
    console.log(`  p95: ${stats.p95}ms`);
    console.log(`  p99: ${stats.p99}ms`);

    if (summary.failureCount > 0) {
      console.log('\n⚠️  에러 분류:');
      const errorTypes = {};
      metrics.errors.forEach(err => {
        errorTypes[err.type] = (errorTypes[err.type] || 0) + 1;
      });
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}건`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

/**
 * 결과를 JSON 파일로 저장
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @param {object} config - 설정 객체
 * @param {string} logsDir - 로그 디렉터리 경로
 * @returns {string} 저장된 파일 경로
 */
function saveResultAsJSON(metrics, config, logsDir = './logs') {
  // 로그 디렉터리 생성
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // 리포트 생성
  const report = metrics.generateReport(config);

  // 파일명 생성 (타임스탬프 포함)
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', 'T');
  const filename = `result-${timestamp}.json`;
  const filepath = path.join(logsDir, filename);

  // 파일 저장
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');

  return filepath;
}

/**
 * 결과를 CSV 파일로 저장
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @param {object} config - 설정 객체
 * @param {string} logsDir - 로그 디렉터리 경로
 * @returns {string} 저장된 파일 경로
 */
function saveResultAsCSV(metrics, config, logsDir = './logs') {
  // 로그 디렉터리 생성
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // CSV 헤더
  const headers = ['WorkerId', 'Iteration', 'Status', 'ResponseTime(ms)', 'Timestamp', 'Type/Message'];
  const rows = [headers.join(',')];

  // 각 요청별 행 추가
  metrics.requests.forEach(req => {
    if (req.status === 'success') {
      rows.push([
        req.workerId,
        req.iteration,
        req.status,
        req.responseTime,
        req.timestamp,
        ''
      ].join(','));
    } else {
      rows.push([
        req.workerId,
        req.iteration,
        req.status,
        '',
        req.timestamp,
        `${req.type}: ${req.message}`
      ].join(','));
    }
  });

  // 파일명 생성
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', 'T');
  const filename = `result-${timestamp}.csv`;
  const filepath = path.join(logsDir, filename);

  // 파일 저장
  fs.writeFileSync(filepath, rows.join('\n'), 'utf-8');

  return filepath;
}

/**
 * 간단한 요약 정보 출력 (반복 모드용)
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @param {number} taskNum - 작업 번호
 * @param {string} elapsedTime - 소요 시간
 */
function printSimpleSummary(metrics, taskNum, elapsedTime) {
  const summary = metrics.getSummary();
  const stats = metrics.calculateStats();

  console.log('─'.repeat(60));
  console.log(`✓ Task #${taskNum} 완료`);
  console.log('─'.repeat(60));
  console.log(`  총 요청: ${summary.totalRequests} | 성공: ${summary.successCount} | 실패: ${summary.failureCount} | 성공률: ${summary.successRate}`);
  
  if (stats.count > 0) {
    console.log(`  응답시간: min=${stats.min}ms, max=${stats.max}ms, mean=${stats.mean}ms, p95=${stats.p95}ms`);
  }
  
  console.log(`  소요 시간: ${elapsedTime}s`);
  console.log('');
}

module.exports = {
  ProgressPrinter,
  getProgressBar,
  saveResultAsJSON,
  saveResultAsCSV,
  printSimpleSummary
};
