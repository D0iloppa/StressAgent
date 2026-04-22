/**
 * Metrics Collector
 * 
 * 부하 테스트 실행 중 성능 메트릭을 수집하고 통계를 계산하는 모듈
 */

/**
 * 메트릭 수집기
 */
class MetricsCollector {
  constructor() {
    // 요청별 데이터
    this.requests = [];
    
    // 에러 데이터
    this.errors = [];
    
    // 시작 시간
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 성공한 요청 기록
   * @param {number} responseTime - 응답 시간 (ms)
   * @param {number} workerId - 워커 ID
   * @param {number} iteration - 반복 번호
   * @param {string} url - 요청 URL
   */
  recordSuccess(responseTime, workerId, iteration, url) {
    this.requests.push({
      workerId,
      iteration,
      url,
      responseTime,
      status: 'success',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 실패한 요청 기록
   * @param {Error} error - 에러 객체
   * @param {number} workerId - 워커 ID
   * @param {number} iteration - 반복 번호
   * @param {string} url - 요청 URL
   */
  recordError(error, workerId, iteration, url) {
    const errorRecord = {
      workerId,
      iteration,
      url,
      type: error.name || 'Error',
      message: error.message,
      status: 'failure',
      timestamp: new Date().toISOString()
    };

    this.errors.push(errorRecord);
    this.requests.push(errorRecord);
  }

  /**
   * 응답 시간 분위수 계산
   * @param {number} p - 백분위수 (0-100)
   * @returns {number} 분위수 값 (ms)
   */
  getPercentile(p) {
    const successRequests = this.requests
      .filter(r => r.status === 'success')
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    if (successRequests.length === 0) return 0;

    const index = Math.ceil((p / 100) * successRequests.length) - 1;
    return successRequests[Math.max(0, index)];
  }

  /**
   * 성공한 요청들의 응답 시간 통계 계산
   * @returns {object} 통계 객체
   */
  calculateStats() {
    const successRequests = this.requests
      .filter(r => r.status === 'success')
      .map(r => r.responseTime);

    if (successRequests.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...successRequests].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = Math.round(sum / sorted.length);

    return {
      count: successRequests.length,
      min: Math.min(...successRequests),
      max: Math.max(...successRequests),
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: this.getPercentile(95),
      p99: this.getPercentile(99)
    };
  }

  /**
   * 요약 정보 생성
   * @returns {object} 요약 정보
   */
  getSummary() {
    const totalRequests = this.requests.length;
    const successCount = this.requests.filter(r => r.status === 'success').length;
    const failureCount = this.errors.length;
    const successRate = totalRequests > 0 
      ? Math.round((successCount / totalRequests) * 100) 
      : 0;

    return {
      totalRequests,
      successCount,
      failureCount,
      successRate: `${successRate}%`
    };
  }

  /**
   * 전체 리포트 생성
   * @param {object} config - 설정 객체
   * @returns {object} 리포트 객체
   */
  generateReport(config) {
    const stats = this.calculateStats();
    const summary = this.getSummary();
    const duration = this.endTime && this.startTime 
      ? ((this.endTime - this.startTime) / 1000).toFixed(3) + 's'
      : 'N/A';

    return {
      metadata: {
        url: config.url,
        workers: config.workers,
        iterations: config.iterations,
        startTime: this.startTime ? this.startTime.toISOString() : null,
        endTime: this.endTime ? this.endTime.toISOString() : null,
        duration
      },
      summary,
      responseTimes: stats,
      errors: this.errors,
      requests: this.requests
    };
  }
}

module.exports = MetricsCollector;
