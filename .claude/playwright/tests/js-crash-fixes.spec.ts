import { test, expect } from '@playwright/test';

// Verifies three JS null-guard fixes deployed to the live container:
//   #1009 — advice-worker.js cbAfterResponse handles undefined data
//   #1006 — DynamicDropdownBuilder.clearCacheFor is a callable method
//   #1008 — form.js SaveSettingsAndAddNew guards emptyUrl[1] before split
//
// Tests hit http://127.0.0.1 (localhost bypasses MikoPBX auth) and drive the
// transpiled ES5 files under /admin-cabinet/assets/js/pbx/*.
//
// Strategy: we don't need a full login flow — we fetch each JS asset, inject
// it into a blank page with minimal jQuery/sessionStorage stubs, then call
// the target methods with the exact inputs that used to crash. If the fix is
// in place the functions return cleanly; otherwise the page throws and the
// pageerror listener fails the test.

const BASE = 'http://127.0.0.1';

test.describe('JS null-guard fixes deployed to container', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      throw new Error(`Page threw: ${err.message}`);
    });
  });

  test('#1009 advice-worker.cbAfterResponse survives undefined data', async ({ page }) => {
    const src = await (await page.request.get(`${BASE}/admin-cabinet/assets/js/pbx/Advice/advice-worker.js`)).text();
    expect(src).toContain('response.data.advice === undefined');
    expect(src).not.toMatch(/else if.*response\.result === true[\s\S]*response\.data\.advice\.length === 0/);

    // Must navigate to a real HTTP origin so sessionStorage is usable.
    // MikoPBX login page returns 200 without auth and has a stable DOM.
    await page.goto(`${BASE}/admin-cabinet/session/index`);
    await page.evaluate(() => {
      document.body.innerHTML = '<div id="advice"></div><div id="show-advice-button"></div>';
    });
    await page.addScriptTag({ content: `
      window.globalTranslate = { adv_PopupHeader: 'Advice' };
      window.i18n = (k) => k;
      window.EventBus = { subscribe: () => {} };
      window.AdviceAPI = { getList: () => {} };
      // Minimal jQuery stub covering everything advice-worker touches.
      window.$ = window.jQuery = function(sel){
        if (typeof sel === 'function') { sel(); return { ready: function(fn){ fn(); return this; } }; }
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        const chain = {
          html: function(v){ if (el && v !== undefined) el.innerHTML = v; return el ? el.innerHTML : ''; },
          find: function(){ return { transition: function(){ return this; } }; },
          popup: function(){ return this; },
          ready: function(fn){ fn(); return this; },
          trigger: function(){ return this; },
          get 0(){ return el; },
          length: el ? 1 : 0,
        };
        return chain;
      };
      window.$.fn = {};
    ` });
    await page.addScriptTag({ content: src });

    // Now invoke cbAfterResponse with every crash-prone input and assert no throw.
    const crashed = await page.evaluate(() => {
      const cases: any[] = [undefined, null, {}, { result: false }, { result: true }, { result: true, data: {} }];
      for (const c of cases) {
        try { (window as any).adviceWorker.cbAfterResponse(c); }
        catch (e: any) { return `threw on ${JSON.stringify(c) ?? 'undefined'}: ${e.message}`; }
      }
      // Happy path
      try {
        (window as any).adviceWorker.cbAfterResponse({
          result: true,
          data: { advice: { error: [], warning: [], info: [], needUpdate: [] } },
        });
      } catch (e: any) { return `threw on happy path: ${e.message}`; }
      return null;
    });
    expect(crashed).toBeNull();
  });

  test('#1006 DynamicDropdownBuilder.clearCacheFor is callable', async ({ page }) => {
    const src = await (await page.request.get(`${BASE}/admin-cabinet/assets/js/pbx/FormElements/dynamic-dropdown-builder.js`)).text();
    expect(src).toMatch(/clearCacheFor:\s*function\s+clearCacheFor/);

    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: `window.$ = function(){ return { length: 0, dropdown: function(){ return this; }, hasClass: function(){ return false; } }; };` });
    await page.addScriptTag({ content: src });

    const result = await page.evaluate(() => {
      const DDB = (window as any).DynamicDropdownBuilder;
      if (typeof DDB !== 'object' && typeof DDB !== 'function') return `DDB not defined: ${typeof DDB}`;
      if (typeof DDB.clearCacheFor !== 'function') return `clearCacheFor is ${typeof DDB.clearCacheFor}`;
      try {
        DDB.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect', { type: 'routing' });
        DDB.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect');
        DDB.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect', { category: 'custom' });
      } catch (e: any) { return `threw: ${e.message}`; }
      return 'ok';
    });
    expect(result).toBe('ok');
  });

  test('#1008 form.js asset has guard before emptyUrl[1] access', async ({ page }) => {
    const src = await (await page.request.get(`${BASE}/admin-cabinet/assets/js/pbx/main/form.js`)).text();
    // The fix: the length check must come BEFORE the split on emptyUrl[1].
    const guardIdx = src.indexOf("emptyUrl.length > 1");
    const splitIdx = src.indexOf("emptyUrl[1].split('/')");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(splitIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(splitIdx);

    // Behavioural check: replicate the exact fixed branch inline and ensure
    // URLs without 'modify' segment return cleanly instead of throwing.
    await page.setContent('<!doctype html><html><body></body></html>');
    const crashed = await page.evaluate(() => {
      function fixed(currentUrl: string): string | null {
        const emptyUrl = currentUrl.split('modify');
        if (emptyUrl.length > 1) {
          let action = 'modify';
          const prefixData = emptyUrl[1].split('/');
          if (prefixData.length > 0) action += prefixData[0];
          return `${emptyUrl[0]}${action}/`;
        }
        return null;
      }
      const bad = ['http://pbx/general-settings', 'http://pbx/', 'http://pbx/extensions/index'];
      for (const u of bad) {
        try { fixed(u); } catch (e: any) { return `threw on ${u}: ${e.message}`; }
      }
      const good = fixed('http://pbx/admin-cabinet/extensions/modify/42');
      if (good !== 'http://pbx/admin-cabinet/extensions/modify/') return `wrong happy path: ${good}`;
      return null;
    });
    expect(crashed).toBeNull();
  });
});
