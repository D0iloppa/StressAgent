/**
 * 웰러 ERP 로그인 및 페이지 순회 시나리오
 * 
 * 시나리오:
 * 1. WELLERP 사이트에 접속
 * 2. 로그인 수행 (환경변수에서 아이디/비밀번호 로드)
 * 3. 모니터링, 보고서 관리, 개발 업무보고 페이지 순회
 * 4. 각 페이지에서 모든 리소스 로드 및 JavaScript 실행 완료 대기
 */

module.exports = {
  name: "WELLERP Login and Page Traverse",
  run: async (page) => {
    const BASE_URL = 'http://121.136.244.39:18443/WELLERP/';
    const USERNAME = process.env.WELLERP_USERNAME || 'your_username';
    const PASSWORD = process.env.WELLERP_PASSWORD || 'your_password';

    // 콘솔 메시지 출력 (디버깅용)
    page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // 에러 출력
    page.on('error', (err) => {
      console.error(`[Browser Error] ${err.message}`);
    });

    // 1. 메인 페이지 접속
    console.log('[Scenario] 메인 페이지 접속 중...');
    const response = await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    console.log(`[Scenario] 페이지 로드 완료. 상태: ${response ? response.status() : 'unknown'}`);
    console.log(`[Scenario] 현재 URL: ${page.url()}`);

    // 2. 로그인 폼 확인 및 입력
    console.log('[Scenario] 로그인 정보 입력 중...');
    
    // 아이디 필드 확인 - 길게 대기
    try {
      await page.waitForSelector('#IdStr', { timeout: 20000 });
      console.log('[Scenario] 아이디 입력 필드 발견');
    } catch (e) {
      console.error(`[Scenario] 아이디 필드를 찾을 수 없음: ${e.message}`);
      // 페이지 HTML 일부 출력 (디버깅)
      const pageContent = await page.content();
      const idMatch = pageContent.match(/IdStr[\s\S]{0,100}/);
      if (idMatch) {
        console.log(`[Scenario] IdStr 관련 HTML: ${idMatch[0]}`);
      }
      throw e;
    }

    await page.click('#IdStr');
    await page.type('#IdStr', USERNAME, { delay: 50 });
    console.log('[Scenario] 아이디 입력 완료');

    // 비밀번호 입력
    await page.waitForSelector('#PwdStr', { timeout: 10000 });
    await page.click('#PwdStr');
    await page.type('#PwdStr', PASSWORD, { delay: 50 });
    console.log('[Scenario] 비밀번호 입력 완료');

    // 로그인 버튼 클릭
    console.log('[Scenario] 로그인 버튼 클릭 중...');
    await page.waitForSelector('#loginSubmit', { timeout: 10000 });
    
    // 로그인 클릭 후 네비게이션 완료 대기
    await Promise.all([
      page.click('#loginSubmit'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 })
    ]);

    console.log('[Scenario] 로그인 완료');
    console.log(`[Scenario] 로그인 후 URL: ${page.url()}`);

    // 3. 순회할 페이지 목록
    const pages = [
      {
        name: '모니터링',
        path: 'check/checkUrl.do'
      },
      {
        name: '보고서 관리',
        path: 'report/omReport.do'
      },
      {
        name: '개발 업무보고',
        path: 'task/devTaskMng.do'
      }
    ];

    // 4. 각 페이지 순회
    for (const pageInfo of pages) {
      try {
        const pageUrl = `${BASE_URL}${pageInfo.path}`;
        console.log(`[Scenario] ${pageInfo.name} 페이지 접속 중... (${pageUrl})`);
        
        // 페이지 접속 (모든 네트워크 요청 완료 대기)
        await page.goto(pageUrl, {
          waitUntil: 'networkidle2',
          timeout: 45000
        });

        // AJAX 요청 완료 대기 (최대 10초)
        await page.waitForFunction(
          () => {
            // jQuery AJAX 상태 확인
            if (typeof window.$ !== 'undefined') {
              return window.$.active === 0;
            }
            // Axios 상태 확인
            if (typeof window.axios !== 'undefined') {
              return true; // 간단한 확인
            }
            // 기본: 2초 대기
            return true;
          },
          { timeout: 10000 }
        ).catch(() => {
          // 타임아웃 해도 계속 진행
          console.log(`[Scenario] ${pageInfo.name} AJAX 완료 확인 시간 초과 (계속 진행)`);
        });

        // 페이지 콘텐츠가 로드될 때까지 추가 대기
        await page.waitForTimeout(1000);

        console.log(`[Scenario] ${pageInfo.name} 페이지 완료`);

      } catch (error) {
        console.warn(`[Scenario] ${pageInfo.name} 페이지 처리 중 오류: ${error.message}`);
        // 한 페이지 실패 시에도 계속 진행
      }
    }

    console.log('[Scenario] 모든 페이지 순회 완료');
  }
};
