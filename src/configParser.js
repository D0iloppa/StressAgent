/**
 * Config Parser
 * 
 * YAML 파일을 파싱하고 설정을 검증하는 모듈
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

/**
 * 설정 파일을 파싱합니다.
 * @param {string} configPath - 설정 파일 경로
 * @returns {object} 파싱된 설정 객체
 * @throws {Error} 설정 파일이 없거나 필수 항목이 없을 경우
 */
function parseConfig(configPath) {
  // 파일 존재 확인
  if (!fs.existsSync(configPath)) {
    throw new Error(`설정 파일을 찾을 수 없습니다: ${configPath}`);
  }

  // YAML 파일 읽기
  const fileContent = fs.readFileSync(configPath, 'utf-8');
  let config;

  try {
    config = YAML.parse(fileContent);
  } catch (error) {
    throw new Error(`YAML 파일 파싱 오류: ${error.message}`);
  }

  // 필수 항목 검증
  const requiredFields = ['url', 'workers', 'iterations', 'scenarioFile'];
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(`필수 설정 항목이 없습니다: ${missingFields.join(', ')}`);
  }

  // 타입 검증
  if (typeof config.url !== 'string') {
    throw new Error('url은 문자열이어야 합니다');
  }

  if (!Number.isInteger(config.workers) || config.workers < 1) {
    throw new Error('workers는 1 이상의 정수여야 합니다');
  }

  if (!Number.isInteger(config.iterations) || config.iterations < 1) {
    throw new Error('iterations는 1 이상의 정수여야 합니다');
  }

  if (typeof config.scenarioFile !== 'string') {
    throw new Error('scenarioFile은 문자열이어야 합니다');
  }

  // 시나리오 파일 존재 확인
  const scenarioPath = path.resolve(config.scenarioFile);
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`시나리오 파일을 찾을 수 없습니다: ${scenarioPath}`);
  }

  // 선택 항목 기본값 설정
  config.timeout = config.timeout || 30000;
  config.headless = config.headless !== false; // 기본값: true
  config.slowMo = config.slowMo || 0;
  config.viewport = config.viewport || { width: 1280, height: 720 };
  config.logLevel = config.logLevel || 'info';

  // 타입 검증 (선택 항목)
  if (!Number.isInteger(config.timeout) || config.timeout < 1) {
    throw new Error('timeout은 1 이상의 정수여야 합니다');
  }

  if (typeof config.headless !== 'boolean') {
    throw new Error('headless는 boolean이어야 합니다');
  }

  if (!Number.isInteger(config.slowMo) || config.slowMo < 0) {
    throw new Error('slowMo는 0 이상의 정수여야 합니다');
  }

  // 경로를 절대경로로 변환
  config.scenarioFile = scenarioPath;

  return config;
}

module.exports = {
  parseConfig
};
