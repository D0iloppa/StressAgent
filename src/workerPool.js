/**
 * Worker Pool
 * 
 * n개의 워커를 생성하고 병렬로 관리하는 모듈
 */

const puppeteer = require('puppeteer');

/**
 * 각 워커가 실행할 작업
 * @param {number} workerId - 워커 ID
 * @param {object} config - 설정 객체
 * @param {object} scenario - 시나리오 객체
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @returns {Promise<void>}
 */
async function executeWorker(workerId, config, scenario, metrics) {
  let browser = null;

  try {
    // 브라우저 인스턴스 생성
    browser = await puppeteer.launch({
      headless: config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // 반복 실행
    for (let iteration = 0; iteration < config.iterations; iteration++) {
      let page = null;
      const startTime = Date.now();

      try {
        // 페이지 생성
        page = await browser.newPage();

        // 뷰포트 설정
        if (config.viewport) {
          await page.setViewport(config.viewport);
        }

        // 느린 동작 시뮬레이션
        if (config.slowMo > 0) {
          page.setDefaultTimeout(config.timeout);
          page.setDefaultNavigationTimeout(config.timeout);
        }

        // 시나리오 실행
        await scenario.run(page);

        // 성공 기록
        const responseTime = Date.now() - startTime;
        metrics.recordSuccess(responseTime, workerId, iteration, config.url);

      } catch (error) {
        // 에러 기록
        metrics.recordError(error, workerId, iteration, config.url);
      } finally {
        // 페이지 정리
        if (page) {
          try {
            await page.close();
          } catch (error) {
            console.warn(`⚠️  페이지 종료 오류 (Worker ${workerId}): ${error.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.error(`❌ 워커 ${workerId} 실패: ${error.message}`);
  } finally {
    // 브라우저 정리
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.warn(`⚠️  브라우저 종료 오류 (Worker ${workerId}): ${error.message}`);
      }
    }
  }
}

/**
 * Worker Pool 실행
 * @param {object} config - 설정 객체
 * @param {object} scenario - 시나리오 객체
 * @param {MetricsCollector} metrics - 메트릭 수집기
 * @param {Function} onProgress - 진행 상황 콜백 함수
 * @returns {Promise<void>}
 */
async function executeWorkerPool(config, scenario, metrics, onProgress) {
  // 시작 시간 기록
  metrics.startTime = new Date();

  // 모든 워커 Promise 생성
  const workerPromises = [];
  for (let i = 0; i < config.workers; i++) {
    const workerPromise = executeWorker(i, config, scenario, metrics)
      .then(() => {
        // 워커 완료 시 진행 상황 업데이트
        if (onProgress) {
          onProgress(metrics);
        }
      })
      .catch((error) => {
        console.error(`❌ 워커 ${i} 실행 오류: ${error.message}`);
      });

    workerPromises.push(workerPromise);
  }

  // 모든 워커 완료 대기
  await Promise.all(workerPromises);

  // 종료 시간 기록
  metrics.endTime = new Date();
}

module.exports = {
  executeWorker,
  executeWorkerPool
};
