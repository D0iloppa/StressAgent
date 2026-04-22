#!/usr/bin/env node

/**
 * StressAgent CLI Entry Point (Simplified)
 * 
 * config.yml 고정 사용
 * 모드 선택만 함: 단순 모드 vs 반복 모드
 */

// 환경변수 로드
require('dotenv').config();

const path = require('path');
const readline = require('readline');
const { parseConfig } = require('../src/configParser');
const { loadScenario } = require('../src/scenarioLoader');
const { executeWorkerPool } = require('../src/workerPool');
const MetricsCollector = require('../src/metricsCollector');
const { ProgressPrinter, saveResultAsJSON, saveResultAsCSV, printSimpleSummary } = require('../src/outputHandler');

const VERSION = '1.0.0';

/**
 * CLI 도움말 표시
 */
function showHelp() {
  console.log(`
StressAgent v${VERSION} - CLI 부하 테스트 도구

사용법:
  node bin/stressagent.js [옵션]

옵션:
  (기본값)        대화형 모드 선택 UI (단순 모드 또는 반복 모드)
  -s, --simple    단순 모드로 직접 실행 (모드 선택 UI 스킵)
  -r, --repeat    반복 모드로 직접 실행 (모드 선택 UI 스킵)
  -h, --help      도움말 표시
  -v, --version   버전 정보 표시

설정:
  • config.yml 파일을 자동으로 사용합니다
  • config.yml을 수정하여 테스트 대상 URL, 워커 수, 시나리오 등을 변경할 수 있습니다

예제:
  node bin/stressagent.js
  node bin/stressagent.js -s
  node bin/stressagent.js -r
`);
}

/**
 * 버전 정보 표시
 */
function showVersion() {
  console.log(`StressAgent v${VERSION}`);
}

/**
 * 배너 출력
 */
function printBanner(config, mode = 'simple', taskNum = null) {
  const width = 50;
  const title = 'StressAgent v' + VERSION;
  const modeText = mode === 'simple' ? '단순 작업 모드' : '반복 모드';
  
  console.log('\n┌' + '─'.repeat(width - 2) + '┐');
  console.log('│ ' + title.padEnd(width - 4) + ' │');
  console.log('├' + '─'.repeat(width - 2) + '┤');
  if (taskNum) {
    console.log('│ ' + `Task #${taskNum}`.padEnd(width - 4) + ' │');
  }
  console.log('│ ' + modeText.padEnd(width - 4) + ' │');
  console.log('│ URL: ' + (config.url.substring(0, width - 10) || '').padEnd(width - 10) + '│');
  console.log('└' + '─'.repeat(width - 2) + '┘\n');
}

/**
 * 사용자에게 모드를 선택하도록 프롬프트
 */
function promptMode() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n실행 모드를 선택하세요:');
    console.log('  1) 단순 작업 모드 - config 설정대로 1회 실행, 결과 저장');
    console.log('  2) 반복 모드     - 연속 반복 실행, 워커 수 랜덤, 결과 미저장\n');

    rl.question('선택 (1 또는 2, 기본값: 1): ', (answer) => {
      rl.close();
      const choice = answer.trim() || '1';
      resolve(choice === '2' ? 'repeat' : 'simple');
    });
  });
}

/**
 * 단순 작업 모드 실행
 */
async function runSimpleMode(config, scenario) {
  try {
    // 배너 출력
    printBanner(config, 'simple');

    // 메트릭 수집기 생성
    const metrics = new MetricsCollector();
    const totalRequests = config.workers * config.iterations;
    const progressPrinter = new ProgressPrinter(totalRequests, 1000);

    // 진행 상황 콜백
    const onProgress = (metrics) => {
      progressPrinter.update(metrics);
    };

    // 부하 테스트 실행
    console.log('🔄 부하 테스트 시작...\n');
    const startTime = Date.now();

    await executeWorkerPool(config, scenario, metrics, onProgress);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log(`\n⏱️  총 소요 시간: ${elapsedTime}s`);

    // 최종 결과 출력
    progressPrinter.printFinal(metrics);

    // 결과 저장
    console.log('💾 결과 저장 중...');
    const logsDir = path.resolve('./logs');
    const jsonPath = saveResultAsJSON(metrics, config, logsDir);
    console.log(`✓ JSON 결과 저장: ${jsonPath}`);

    const csvPath = saveResultAsCSV(metrics, config, logsDir);
    console.log(`✓ CSV 결과 저장: ${csvPath}\n`);

    console.log('✨ 부하 테스트 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 반복 모드 실행
 */
async function runRepeatMode(config, scenario) {
  try {
    // 배너 출력
    console.log('\n' + '='.repeat(60));
    console.log('🔄 반복 모드 시작 (무한 반복)');
    console.log('='.repeat(60) + '\n');

    // 워커 수의 최소/최대값 설정 (max/2 ~ max)
    const workerMin = Math.ceil(config.workers / 2);
    const workerMax = config.workers;

    let taskNum = 0;

    // 무한 반복 루프
    // eslint-disable-next-line no-constant-condition
    while (true) {
      taskNum++;

      // 랜덤 워커 수 할당
      const randomWorkers = Math.floor(Math.random() * (workerMax - workerMin + 1)) + workerMin;
      
      // 임시 설정 생성 (워커 수만 변경)
      const tempConfig = { ...config, workers: randomWorkers };

      // 배너 출력
      printBanner(tempConfig, 'repeat', taskNum);

      console.log(`워커 수: ${randomWorkers} | 반복 횟수: ${config.iterations}`);
      console.log('🔄 작업 시작...\n');

      const startTime = Date.now();

      // 메트릭 수집
      const metrics = new MetricsCollector();

      // 부하 테스트 실행 (진행 표시 없음)
      await executeWorkerPool(tempConfig, scenario, metrics, null);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(3);

      // 간단한 요약 정보만 출력
      printSimpleSummary(metrics, taskNum, elapsedTime);

      // 1초 대기 후 다음 task
      console.log('⏳ 1초 대기 중...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);

  // 헬프 또는 버전 옵션
  if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    showVersion();
    process.exit(0);
  }

  // 모드 옵션 추출
  let mode = null;
  if (args.includes('-s') || args.includes('--simple')) {
    mode = 'simple';
  } else if (args.includes('-r') || args.includes('--repeat')) {
    mode = 'repeat';
  }

  // config.yml 고정 사용
  const configPath = path.resolve('./config.yml');

  try {
    // 설정 파일 파싱
    console.log('📋 config.yml 로드 중...');
    const config = parseConfig(configPath);
    console.log('✓ 설정 파일 로드 완료\n');

    // 시나리오 파일 로드
    console.log('📜 시나리오 파일 로드 중...');
    const scenario = loadScenario(config.scenarioFile);
    console.log(`✓ 시나리오 로드 완료: ${scenario.name}\n`);

    // 모드 결정
    if (!mode) {
      mode = await promptMode();
    }

    // 모드에 따라 실행
    if (mode === 'repeat') {
      await runRepeatMode(config, scenario);
    } else {
      await runSimpleMode(config, scenario);
    }

  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}`);
    process.exit(1);
  }
}

// CLI 실행
main().catch((error) => {
  console.error(`\n❌ 예상치 못한 오류: ${error.message}`);
  process.exit(1);
});
