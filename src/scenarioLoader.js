/**
 * Scenario Loader
 * 
 * JavaScript 시나리오 파일을 동적으로 로드하고 검증하는 모듈
 */

const fs = require('fs');
const path = require('path');

/**
 * 시나리오 파일을 로드합니다.
 * @param {string} scenarioPath - 시나리오 파일의 절대 경로
 * @returns {object} 시나리오 객체 { name, run }
 * @throws {Error} 시나리오 파일이 없거나 형식이 잘못된 경우
 */
function loadScenario(scenarioPath) {
  // 파일 존재 확인
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`시나리오 파일을 찾을 수 없습니다: ${scenarioPath}`);
  }

  let scenario;

  try {
    // Node.js의 require 캐시 무시하고 로드
    // 같은 파일을 여러 번 로드할 수 있도록 캐시 삭제
    delete require.cache[require.resolve(scenarioPath)];
    scenario = require(scenarioPath);
  } catch (error) {
    throw new Error(`시나리오 파일 로드 오류: ${error.message}`);
  }

  // 시나리오 검증
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('시나리오는 객체여야 합니다');
  }

  if (!scenario.run || typeof scenario.run !== 'function') {
    throw new Error('시나리오에 "run" 함수가 필요합니다');
  }

  // 선택 항목 기본값
  scenario.name = scenario.name || path.basename(scenarioPath, '.js');

  return scenario;
}

/**
 * 모든 시나리오 파일을 로드합니다.
 * @param {string} scenarioDir - 시나리오 디렉터리 경로
 * @returns {array} 시나리오 객체 배열
 */
function loadAllScenarios(scenarioDir) {
  if (!fs.existsSync(scenarioDir)) {
    return [];
  }

  const files = fs.readdirSync(scenarioDir).filter(file => file.endsWith('.js'));
  const scenarios = [];

  for (const file of files) {
    try {
      const scenarioPath = path.join(scenarioDir, file);
      const scenario = loadScenario(scenarioPath);
      scenarios.push(scenario);
    } catch (error) {
      console.warn(`⚠️  시나리오 로드 실패 (${file}): ${error.message}`);
    }
  }

  return scenarios;
}

module.exports = {
  loadScenario,
  loadAllScenarios
};
