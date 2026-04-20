"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global $, i18n, localStorage, EventBus, AdviceAPI, globalTranslate */

/**
 * GitLab-style update notification banner shown at the top of every page.
 *
 * Subscribes to the existing 'advice' EventBus channel (populated by
 * WorkerPrepareAdvice). Picks the single most-important advice item from
 * the `warning` (red) and `info` (blue) buckets whose messageTpl matches
 * one of the recognised banner templates. User can "Install now",
 * "Remind me in 3 days" or dismiss — state lives in localStorage so new
 * versions automatically re-show the banner.
 */
var updateBanner = {
  /** Banner container created in main.volt. */
  $banner: $('#update-banner'),
  /** Advice templates surfaced by the banner. */
  bannerTemplates: ['adv_AvailableNewVersionPBX', 'adv_AvailableNewVersionModule', 'adv_SecurityPatchAvailable'],
  /** Remind-me-later duration for the "remind in 3 days" button. */
  remindLaterMs: 3 * 24 * 60 * 60 * 1000,
  initialize: function initialize() {
    if (updateBanner.$banner.length === 0) {
      return;
    }
    EventBus.subscribe('advice', updateBanner.onAdvice);
    if (typeof AdviceAPI !== 'undefined' && AdviceAPI.getList) {
      AdviceAPI.getList(updateBanner.onAdvice);
    }
  },
  /**
   * EventBus / AdviceAPI callback.
   * @param {object} response
   */
  onAdvice: function onAdvice(response) {
    if (!response || response.result === false || !response.data || response.data.advice === undefined) {
      return;
    }
    updateBanner.render(response.data.advice);
  },
  /**
   * Render the highest-severity relevant advice item, or hide the banner.
   * @param {object} advice - {error, warning, info, needUpdate}
   */
  render: function render(advice) {
    var item = updateBanner.pickBannerItem(advice);
    if (!item) {
      updateBanner.hide();
      return;
    }
    if (updateBanner.isDismissed(item.entry)) {
      updateBanner.hide();
      return;
    }
    updateBanner.draw(item.severity, item.entry);
  },
  /**
   * Choose the banner entry — banner surfaces ONLY warning-bucket advice
   * (critical PBX updates, uninstalled security modules, updates of installed
   * security modules). Regular info-level updates stay in the bell popup and
   * are intentionally skipped here to avoid banner noise.
   *
   * @returns {?{severity: string, entry: object}}
   */
  pickBannerItem: function pickBannerItem(advice) {
    var warnings = Array.isArray(advice.warning) ? advice.warning : [];
    var warningMatch = updateBanner.findFirstByTemplate(warnings);
    if (warningMatch) {
      return {
        severity: 'warning',
        entry: warningMatch
      };
    }
    return null;
  },
  findFirstByTemplate: function findFirstByTemplate(entries) {
    for (var i = 0; i < entries.length; i += 1) {
      if (updateBanner.bannerTemplates.indexOf(entries[i].messageTpl) !== -1) {
        return entries[i];
      }
    }
    return null;
  },
  severityHint: function severityHint(entry) {
    if (entry && entry.messageParams && typeof entry.messageParams.severity === 'string') {
      return entry.messageParams.severity;
    }
    return 'info';
  },
  /**
   * Build and show the banner DOM. Banner is always rendered in warning
   * (red) style because pickBannerItem only returns warning-bucket entries.
   * The `severity` parameter is kept for future re-introduction of info
   * banners but is currently always 'warning'.
   */
  draw: function draw(severity, entry) {
    var params = entry.messageParams || {};
    var ver = params.ver ? $('<div>').text(params.ver).html() : '';
    var moduleName = params.module ? $('<div>').text(params.module).html() : '';

    // Template-specific primary message + action URL.
    var message;
    var actionUrl;
    switch (entry.messageTpl) {
      case 'adv_AvailableNewVersionPBX':
        {
          // severity hint 'critical' → stronger wording, 'warning' (or unknown)
          // → "important update available" copy.
          var hint = updateBanner.severityHint(entry);
          var tpl = hint === 'critical' ? globalTranslate.banner_SecurityUpdateCritical : globalTranslate.banner_UpdateAvailable;
          message = updateBanner.interpolate(tpl, {
            ver: ver
          });
          actionUrl = params.url || '';
          break;
        }
      case 'adv_SecurityPatchAvailable':
        message = updateBanner.interpolate(globalTranslate.banner_SecurityPatchAvailable, {
          module: moduleName,
          ver: ver
        });
        actionUrl = params.url || '';
        break;
      case 'adv_AvailableNewVersionModule':
        // Reuse existing translated template for in-banner copy.
        message = i18n(entry.messageTpl, entry.messageParams);
        actionUrl = params.url || '';
        break;
      default:
        message = i18n(entry.messageTpl, entry.messageParams);
        actionUrl = params.url || '';
    }
    var installLabel = $('<div>').text(globalTranslate.banner_InstallNow).html();
    var remindLabel = $('<div>').text(globalTranslate.banner_RemindIn3Days).html();
    var dismissLabel = $('<div>').text(globalTranslate.banner_Dismiss).html();
    var installButton = actionUrl ? "<a href=\"".concat(actionUrl, "\" class=\"ui small primary button\">").concat(installLabel, "</a>") : '';
    var html = "\n            <i class=\"exclamation triangle icon update-banner-icon\"></i>\n            <div class=\"update-banner-message\">".concat(message, "</div>\n            <div class=\"update-banner-actions\">\n                ").concat(installButton, "\n                <button type=\"button\" class=\"ui small basic button update-banner-remind\">").concat(remindLabel, "</button>\n                <button type=\"button\" class=\"update-banner-close\" aria-label=\"").concat(dismissLabel, "\">&times;</button>\n            </div>\n        ");
    updateBanner.$banner.removeClass('hidden info warning').addClass(severity || 'warning').html(html);
    updateBanner.$banner.find('.update-banner-remind').on('click', function () {
      updateBanner.dismiss(entry, updateBanner.remindLaterMs);
    });
    updateBanner.$banner.find('.update-banner-close').on('click', function () {
      updateBanner.dismiss(entry, null);
    });
  },
  hide: function hide() {
    updateBanner.$banner.addClass('hidden').empty();
  },
  /**
   * Persist dismiss decision keyed by messageTpl + version.
   * `null` untilMs means "dismiss until a different version".
   */
  dismiss: function dismiss(entry, untilMs) {
    var key = updateBanner.storageKey(entry);
    if (!key) {
      updateBanner.hide();
      return;
    }
    try {
      var payload = untilMs === null ? {
        permanent: true
      } : {
        remindAt: Date.now() + untilMs
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      // Storage disabled / quota exceeded — still hide current banner in-memory.
    }
    updateBanner.hide();
  },
  isDismissed: function isDismissed(entry) {
    var key = updateBanner.storageKey(entry);
    if (!key) {
      return false;
    }
    var raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return false;
    }
    if (!raw) {
      return false;
    }
    var state;
    try {
      state = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (state && state.permanent === true) {
      return true;
    }
    if (state && typeof state.remindAt === 'number' && state.remindAt > Date.now()) {
      return true;
    }
    return false;
  },
  /**
   * Dismiss key depends on message template + version so upgrades re-show the banner.
   */
  storageKey: function storageKey(entry) {
    if (!entry || !entry.messageTpl) {
      return '';
    }
    var params = entry.messageParams || {};
    var version = params.ver || '';
    var moduleName = params.module || '';
    return "updateBannerDismiss_".concat(entry.messageTpl, "_").concat(moduleName, "_").concat(version);
  },
  /**
   * Simple %placeholder% interpolation — `str` is a server-provided translated
   * template that is not rendered as HTML (values already escaped by the caller).
   */
  interpolate: function interpolate(template, values) {
    if (typeof template !== 'string') {
      return '';
    }
    var out = template;
    Object.keys(values || {}).forEach(function (name) {
      out = out.replace(new RegExp("%".concat(name, "%"), 'g'), values[name]);
    });
    return out;
  }
};
$(document).ready(function () {
  updateBanner.initialize();
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWJhbm5lci5qcyIsIm5hbWVzIjpbInVwZGF0ZUJhbm5lciIsIiRiYW5uZXIiLCIkIiwiYmFubmVyVGVtcGxhdGVzIiwicmVtaW5kTGF0ZXJNcyIsImluaXRpYWxpemUiLCJsZW5ndGgiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm9uQWR2aWNlIiwiQWR2aWNlQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImFkdmljZSIsInVuZGVmaW5lZCIsInJlbmRlciIsIml0ZW0iLCJwaWNrQmFubmVySXRlbSIsImhpZGUiLCJpc0Rpc21pc3NlZCIsImVudHJ5IiwiZHJhdyIsInNldmVyaXR5Iiwid2FybmluZ3MiLCJBcnJheSIsImlzQXJyYXkiLCJ3YXJuaW5nIiwid2FybmluZ01hdGNoIiwiZmluZEZpcnN0QnlUZW1wbGF0ZSIsImVudHJpZXMiLCJpIiwiaW5kZXhPZiIsIm1lc3NhZ2VUcGwiLCJzZXZlcml0eUhpbnQiLCJtZXNzYWdlUGFyYW1zIiwicGFyYW1zIiwidmVyIiwidGV4dCIsImh0bWwiLCJtb2R1bGVOYW1lIiwibW9kdWxlIiwibWVzc2FnZSIsImFjdGlvblVybCIsImhpbnQiLCJ0cGwiLCJnbG9iYWxUcmFuc2xhdGUiLCJiYW5uZXJfU2VjdXJpdHlVcGRhdGVDcml0aWNhbCIsImJhbm5lcl9VcGRhdGVBdmFpbGFibGUiLCJpbnRlcnBvbGF0ZSIsInVybCIsImJhbm5lcl9TZWN1cml0eVBhdGNoQXZhaWxhYmxlIiwiaTE4biIsImluc3RhbGxMYWJlbCIsImJhbm5lcl9JbnN0YWxsTm93IiwicmVtaW5kTGFiZWwiLCJiYW5uZXJfUmVtaW5kSW4zRGF5cyIsImRpc21pc3NMYWJlbCIsImJhbm5lcl9EaXNtaXNzIiwiaW5zdGFsbEJ1dHRvbiIsImNvbmNhdCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJmaW5kIiwib24iLCJkaXNtaXNzIiwiZW1wdHkiLCJ1bnRpbE1zIiwia2V5Iiwic3RvcmFnZUtleSIsInBheWxvYWQiLCJwZXJtYW5lbnQiLCJyZW1pbmRBdCIsIkRhdGUiLCJub3ciLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImUiLCJyYXciLCJnZXRJdGVtIiwic3RhdGUiLCJwYXJzZSIsInZlcnNpb24iLCJ0ZW1wbGF0ZSIsInZhbHVlcyIsIm91dCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwibmFtZSIsInJlcGxhY2UiLCJSZWdFeHAiLCJkb2N1bWVudCIsInJlYWR5Il0sInNvdXJjZXMiOlsiLi4vLi4vc3JjL0FkdmljZS91cGRhdGUtYmFubmVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI2IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBpMThuLCBsb2NhbFN0b3JhZ2UsIEV2ZW50QnVzLCBBZHZpY2VBUEksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIEdpdExhYi1zdHlsZSB1cGRhdGUgbm90aWZpY2F0aW9uIGJhbm5lciBzaG93biBhdCB0aGUgdG9wIG9mIGV2ZXJ5IHBhZ2UuXG4gKlxuICogU3Vic2NyaWJlcyB0byB0aGUgZXhpc3RpbmcgJ2FkdmljZScgRXZlbnRCdXMgY2hhbm5lbCAocG9wdWxhdGVkIGJ5XG4gKiBXb3JrZXJQcmVwYXJlQWR2aWNlKS4gUGlja3MgdGhlIHNpbmdsZSBtb3N0LWltcG9ydGFudCBhZHZpY2UgaXRlbSBmcm9tXG4gKiB0aGUgYHdhcm5pbmdgIChyZWQpIGFuZCBgaW5mb2AgKGJsdWUpIGJ1Y2tldHMgd2hvc2UgbWVzc2FnZVRwbCBtYXRjaGVzXG4gKiBvbmUgb2YgdGhlIHJlY29nbmlzZWQgYmFubmVyIHRlbXBsYXRlcy4gVXNlciBjYW4gXCJJbnN0YWxsIG5vd1wiLFxuICogXCJSZW1pbmQgbWUgaW4gMyBkYXlzXCIgb3IgZGlzbWlzcyDigJQgc3RhdGUgbGl2ZXMgaW4gbG9jYWxTdG9yYWdlIHNvIG5ld1xuICogdmVyc2lvbnMgYXV0b21hdGljYWxseSByZS1zaG93IHRoZSBiYW5uZXIuXG4gKi9cbmNvbnN0IHVwZGF0ZUJhbm5lciA9IHtcbiAgICAvKiogQmFubmVyIGNvbnRhaW5lciBjcmVhdGVkIGluIG1haW4udm9sdC4gKi9cbiAgICAkYmFubmVyOiAkKCcjdXBkYXRlLWJhbm5lcicpLFxuXG4gICAgLyoqIEFkdmljZSB0ZW1wbGF0ZXMgc3VyZmFjZWQgYnkgdGhlIGJhbm5lci4gKi9cbiAgICBiYW5uZXJUZW1wbGF0ZXM6IFtcbiAgICAgICAgJ2Fkdl9BdmFpbGFibGVOZXdWZXJzaW9uUEJYJyxcbiAgICAgICAgJ2Fkdl9BdmFpbGFibGVOZXdWZXJzaW9uTW9kdWxlJyxcbiAgICAgICAgJ2Fkdl9TZWN1cml0eVBhdGNoQXZhaWxhYmxlJyxcbiAgICBdLFxuXG4gICAgLyoqIFJlbWluZC1tZS1sYXRlciBkdXJhdGlvbiBmb3IgdGhlIFwicmVtaW5kIGluIDMgZGF5c1wiIGJ1dHRvbi4gKi9cbiAgICByZW1pbmRMYXRlck1zOiAzICogMjQgKiA2MCAqIDYwICogMTAwMCxcblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh1cGRhdGVCYW5uZXIuJGJhbm5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2FkdmljZScsIHVwZGF0ZUJhbm5lci5vbkFkdmljZSk7XG4gICAgICAgIGlmICh0eXBlb2YgQWR2aWNlQVBJICE9PSAndW5kZWZpbmVkJyAmJiBBZHZpY2VBUEkuZ2V0TGlzdCkge1xuICAgICAgICAgICAgQWR2aWNlQVBJLmdldExpc3QodXBkYXRlQmFubmVyLm9uQWR2aWNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudEJ1cyAvIEFkdmljZUFQSSBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBvbkFkdmljZShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2VcbiAgICAgICAgICAgIHx8ICFyZXNwb25zZS5kYXRhIHx8IHJlc3BvbnNlLmRhdGEuYWR2aWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVCYW5uZXIucmVuZGVyKHJlc3BvbnNlLmRhdGEuYWR2aWNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBoaWdoZXN0LXNldmVyaXR5IHJlbGV2YW50IGFkdmljZSBpdGVtLCBvciBoaWRlIHRoZSBiYW5uZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFkdmljZSAtIHtlcnJvciwgd2FybmluZywgaW5mbywgbmVlZFVwZGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoYWR2aWNlKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSB1cGRhdGVCYW5uZXIucGlja0Jhbm5lckl0ZW0oYWR2aWNlKTtcbiAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVCYW5uZXIuaXNEaXNtaXNzZWQoaXRlbS5lbnRyeSkpIHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlQmFubmVyLmRyYXcoaXRlbS5zZXZlcml0eSwgaXRlbS5lbnRyeSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENob29zZSB0aGUgYmFubmVyIGVudHJ5IOKAlCBiYW5uZXIgc3VyZmFjZXMgT05MWSB3YXJuaW5nLWJ1Y2tldCBhZHZpY2VcbiAgICAgKiAoY3JpdGljYWwgUEJYIHVwZGF0ZXMsIHVuaW5zdGFsbGVkIHNlY3VyaXR5IG1vZHVsZXMsIHVwZGF0ZXMgb2YgaW5zdGFsbGVkXG4gICAgICogc2VjdXJpdHkgbW9kdWxlcykuIFJlZ3VsYXIgaW5mby1sZXZlbCB1cGRhdGVzIHN0YXkgaW4gdGhlIGJlbGwgcG9wdXAgYW5kXG4gICAgICogYXJlIGludGVudGlvbmFsbHkgc2tpcHBlZCBoZXJlIHRvIGF2b2lkIGJhbm5lciBub2lzZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHs/e3NldmVyaXR5OiBzdHJpbmcsIGVudHJ5OiBvYmplY3R9fVxuICAgICAqL1xuICAgIHBpY2tCYW5uZXJJdGVtKGFkdmljZSkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IEFycmF5LmlzQXJyYXkoYWR2aWNlLndhcm5pbmcpID8gYWR2aWNlLndhcm5pbmcgOiBbXTtcbiAgICAgICAgY29uc3Qgd2FybmluZ01hdGNoID0gdXBkYXRlQmFubmVyLmZpbmRGaXJzdEJ5VGVtcGxhdGUod2FybmluZ3MpO1xuICAgICAgICBpZiAod2FybmluZ01hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzZXZlcml0eTogJ3dhcm5pbmcnLCBlbnRyeTogd2FybmluZ01hdGNoIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIGZpbmRGaXJzdEJ5VGVtcGxhdGUoZW50cmllcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh1cGRhdGVCYW5uZXIuYmFubmVyVGVtcGxhdGVzLmluZGV4T2YoZW50cmllc1tpXS5tZXNzYWdlVHBsKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50cmllc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgc2V2ZXJpdHlIaW50KGVudHJ5KSB7XG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5tZXNzYWdlUGFyYW1zICYmIHR5cGVvZiBlbnRyeS5tZXNzYWdlUGFyYW1zLnNldmVyaXR5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGVudHJ5Lm1lc3NhZ2VQYXJhbXMuc2V2ZXJpdHk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdpbmZvJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYW5kIHNob3cgdGhlIGJhbm5lciBET00uIEJhbm5lciBpcyBhbHdheXMgcmVuZGVyZWQgaW4gd2FybmluZ1xuICAgICAqIChyZWQpIHN0eWxlIGJlY2F1c2UgcGlja0Jhbm5lckl0ZW0gb25seSByZXR1cm5zIHdhcm5pbmctYnVja2V0IGVudHJpZXMuXG4gICAgICogVGhlIGBzZXZlcml0eWAgcGFyYW1ldGVyIGlzIGtlcHQgZm9yIGZ1dHVyZSByZS1pbnRyb2R1Y3Rpb24gb2YgaW5mb1xuICAgICAqIGJhbm5lcnMgYnV0IGlzIGN1cnJlbnRseSBhbHdheXMgJ3dhcm5pbmcnLlxuICAgICAqL1xuICAgIGRyYXcoc2V2ZXJpdHksIGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IGVudHJ5Lm1lc3NhZ2VQYXJhbXMgfHwge307XG4gICAgICAgIGNvbnN0IHZlciA9IHBhcmFtcy52ZXIgPyAkKCc8ZGl2PicpLnRleHQocGFyYW1zLnZlcikuaHRtbCgpIDogJyc7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBwYXJhbXMubW9kdWxlID8gJCgnPGRpdj4nKS50ZXh0KHBhcmFtcy5tb2R1bGUpLmh0bWwoKSA6ICcnO1xuXG4gICAgICAgIC8vIFRlbXBsYXRlLXNwZWNpZmljIHByaW1hcnkgbWVzc2FnZSArIGFjdGlvbiBVUkwuXG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICBsZXQgYWN0aW9uVXJsO1xuICAgICAgICBzd2l0Y2ggKGVudHJ5Lm1lc3NhZ2VUcGwpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Fkdl9BdmFpbGFibGVOZXdWZXJzaW9uUEJYJzoge1xuICAgICAgICAgICAgICAgIC8vIHNldmVyaXR5IGhpbnQgJ2NyaXRpY2FsJyDihpIgc3Ryb25nZXIgd29yZGluZywgJ3dhcm5pbmcnIChvciB1bmtub3duKVxuICAgICAgICAgICAgICAgIC8vIOKGkiBcImltcG9ydGFudCB1cGRhdGUgYXZhaWxhYmxlXCIgY29weS5cbiAgICAgICAgICAgICAgICBjb25zdCBoaW50ID0gdXBkYXRlQmFubmVyLnNldmVyaXR5SGludChlbnRyeSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdHBsID0gaGludCA9PT0gJ2NyaXRpY2FsJ1xuICAgICAgICAgICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfU2VjdXJpdHlVcGRhdGVDcml0aWNhbFxuICAgICAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfVXBkYXRlQXZhaWxhYmxlO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB1cGRhdGVCYW5uZXIuaW50ZXJwb2xhdGUodHBsLCB7IHZlciB9KTtcbiAgICAgICAgICAgICAgICBhY3Rpb25VcmwgPSBwYXJhbXMudXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYWR2X1NlY3VyaXR5UGF0Y2hBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB1cGRhdGVCYW5uZXIuaW50ZXJwb2xhdGUoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfU2VjdXJpdHlQYXRjaEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgeyBtb2R1bGU6IG1vZHVsZU5hbWUsIHZlciB9LFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gcGFyYW1zLnVybCB8fCAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Fkdl9BdmFpbGFibGVOZXdWZXJzaW9uTW9kdWxlJzpcbiAgICAgICAgICAgICAgICAvLyBSZXVzZSBleGlzdGluZyB0cmFuc2xhdGVkIHRlbXBsYXRlIGZvciBpbi1iYW5uZXIgY29weS5cbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bihlbnRyeS5tZXNzYWdlVHBsLCBlbnRyeS5tZXNzYWdlUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25VcmwgPSBwYXJhbXMudXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bihlbnRyeS5tZXNzYWdlVHBsLCBlbnRyeS5tZXNzYWdlUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25VcmwgPSBwYXJhbXMudXJsIHx8ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaW5zdGFsbExhYmVsID0gJCgnPGRpdj4nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfSW5zdGFsbE5vdykuaHRtbCgpO1xuICAgICAgICBjb25zdCByZW1pbmRMYWJlbCA9ICQoJzxkaXY+JykudGV4dChnbG9iYWxUcmFuc2xhdGUuYmFubmVyX1JlbWluZEluM0RheXMpLmh0bWwoKTtcbiAgICAgICAgY29uc3QgZGlzbWlzc0xhYmVsID0gJCgnPGRpdj4nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfRGlzbWlzcykuaHRtbCgpO1xuXG4gICAgICAgIGNvbnN0IGluc3RhbGxCdXR0b24gPSBhY3Rpb25VcmxcbiAgICAgICAgICAgID8gYDxhIGhyZWY9XCIke2FjdGlvblVybH1cIiBjbGFzcz1cInVpIHNtYWxsIHByaW1hcnkgYnV0dG9uXCI+JHtpbnN0YWxsTGFiZWx9PC9hPmBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvbiB1cGRhdGUtYmFubmVyLWljb25cIj48L2k+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidXBkYXRlLWJhbm5lci1tZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVwZGF0ZS1iYW5uZXItYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICR7aW5zdGFsbEJ1dHRvbn1cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGJ1dHRvbiB1cGRhdGUtYmFubmVyLXJlbWluZFwiPiR7cmVtaW5kTGFiZWx9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1cGRhdGUtYmFubmVyLWNsb3NlXCIgYXJpYS1sYWJlbD1cIiR7ZGlzbWlzc0xhYmVsfVwiPiZ0aW1lczs8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuXG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBpbmZvIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHNldmVyaXR5IHx8ICd3YXJuaW5nJylcbiAgICAgICAgICAgIC5odG1sKGh0bWwpO1xuXG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyLmZpbmQoJy51cGRhdGUtYmFubmVyLXJlbWluZCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5kaXNtaXNzKGVudHJ5LCB1cGRhdGVCYW5uZXIucmVtaW5kTGF0ZXJNcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lci5maW5kKCcudXBkYXRlLWJhbm5lci1jbG9zZScpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5kaXNtaXNzKGVudHJ5LCBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGhpZGUoKSB7XG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyLmFkZENsYXNzKCdoaWRkZW4nKS5lbXB0eSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQZXJzaXN0IGRpc21pc3MgZGVjaXNpb24ga2V5ZWQgYnkgbWVzc2FnZVRwbCArIHZlcnNpb24uXG4gICAgICogYG51bGxgIHVudGlsTXMgbWVhbnMgXCJkaXNtaXNzIHVudGlsIGEgZGlmZmVyZW50IHZlcnNpb25cIi5cbiAgICAgKi9cbiAgICBkaXNtaXNzKGVudHJ5LCB1bnRpbE1zKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHVwZGF0ZUJhbm5lci5zdG9yYWdlS2V5KGVudHJ5KTtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB1bnRpbE1zID09PSBudWxsXG4gICAgICAgICAgICAgICAgPyB7IHBlcm1hbmVudDogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgOiB7IHJlbWluZEF0OiBEYXRlLm5vdygpICsgdW50aWxNcyB9O1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIFN0b3JhZ2UgZGlzYWJsZWQgLyBxdW90YSBleGNlZWRlZCDigJQgc3RpbGwgaGlkZSBjdXJyZW50IGJhbm5lciBpbi1tZW1vcnkuXG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlQmFubmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgaXNEaXNtaXNzZWQoZW50cnkpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gdXBkYXRlQmFubmVyLnN0b3JhZ2VLZXkoZW50cnkpO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCByYXc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByYXcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RhdGU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UocmF3KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5wZXJtYW5lbnQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZSAmJiB0eXBlb2Ygc3RhdGUucmVtaW5kQXQgPT09ICdudW1iZXInICYmIHN0YXRlLnJlbWluZEF0ID4gRGF0ZS5ub3coKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNtaXNzIGtleSBkZXBlbmRzIG9uIG1lc3NhZ2UgdGVtcGxhdGUgKyB2ZXJzaW9uIHNvIHVwZ3JhZGVzIHJlLXNob3cgdGhlIGJhbm5lci5cbiAgICAgKi9cbiAgICBzdG9yYWdlS2V5KGVudHJ5KSB7XG4gICAgICAgIGlmICghZW50cnkgfHwgIWVudHJ5Lm1lc3NhZ2VUcGwpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJhbXMgPSBlbnRyeS5tZXNzYWdlUGFyYW1zIHx8IHt9O1xuICAgICAgICBjb25zdCB2ZXJzaW9uID0gcGFyYW1zLnZlciB8fCAnJztcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHBhcmFtcy5tb2R1bGUgfHwgJyc7XG4gICAgICAgIHJldHVybiBgdXBkYXRlQmFubmVyRGlzbWlzc18ke2VudHJ5Lm1lc3NhZ2VUcGx9XyR7bW9kdWxlTmFtZX1fJHt2ZXJzaW9ufWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNpbXBsZSAlcGxhY2Vob2xkZXIlIGludGVycG9sYXRpb24g4oCUIGBzdHJgIGlzIGEgc2VydmVyLXByb3ZpZGVkIHRyYW5zbGF0ZWRcbiAgICAgKiB0ZW1wbGF0ZSB0aGF0IGlzIG5vdCByZW5kZXJlZCBhcyBIVE1MICh2YWx1ZXMgYWxyZWFkeSBlc2NhcGVkIGJ5IHRoZSBjYWxsZXIpLlxuICAgICAqL1xuICAgIGludGVycG9sYXRlKHRlbXBsYXRlLCB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBsZXQgb3V0ID0gdGVtcGxhdGU7XG4gICAgICAgIE9iamVjdC5rZXlzKHZhbHVlcyB8fCB7fSkuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICAgICAgb3V0ID0gb3V0LnJlcGxhY2UobmV3IFJlZ0V4cChgJSR7bmFtZX0lYCwgJ2cnKSwgdmFsdWVzW25hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICB1cGRhdGVCYW5uZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztFQUNqQjtFQUNBQyxPQUFPLEVBQUVDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztFQUU1QjtFQUNBQyxlQUFlLEVBQUUsQ0FDYiw0QkFBNEIsRUFDNUIsK0JBQStCLEVBQy9CLDRCQUE0QixDQUMvQjtFQUVEO0VBQ0FDLGFBQWEsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSTtFQUV0Q0MsVUFBVSxXQUFWQSxVQUFVQSxDQUFBLEVBQUc7SUFDVCxJQUFJTCxZQUFZLENBQUNDLE9BQU8sQ0FBQ0ssTUFBTSxLQUFLLENBQUMsRUFBRTtNQUNuQztJQUNKO0lBQ0FDLFFBQVEsQ0FBQ0MsU0FBUyxDQUFDLFFBQVEsRUFBRVIsWUFBWSxDQUFDUyxRQUFRLENBQUM7SUFDbkQsSUFBSSxPQUFPQyxTQUFTLEtBQUssV0FBVyxJQUFJQSxTQUFTLENBQUNDLE9BQU8sRUFBRTtNQUN2REQsU0FBUyxDQUFDQyxPQUFPLENBQUNYLFlBQVksQ0FBQ1MsUUFBUSxDQUFDO0lBQzVDO0VBQ0osQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lBLFFBQVEsV0FBUkEsUUFBUUEsQ0FBQ0csUUFBUSxFQUFFO0lBQ2YsSUFBSSxDQUFDQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsTUFBTSxLQUFLLEtBQUssSUFDbkMsQ0FBQ0QsUUFBUSxDQUFDRSxJQUFJLElBQUlGLFFBQVEsQ0FBQ0UsSUFBSSxDQUFDQyxNQUFNLEtBQUtDLFNBQVMsRUFBRTtNQUN6RDtJQUNKO0lBQ0FoQixZQUFZLENBQUNpQixNQUFNLENBQUNMLFFBQVEsQ0FBQ0UsSUFBSSxDQUFDQyxNQUFNLENBQUM7RUFDN0MsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lFLE1BQU0sV0FBTkEsTUFBTUEsQ0FBQ0YsTUFBTSxFQUFFO0lBQ1gsSUFBTUcsSUFBSSxHQUFHbEIsWUFBWSxDQUFDbUIsY0FBYyxDQUFDSixNQUFNLENBQUM7SUFDaEQsSUFBSSxDQUFDRyxJQUFJLEVBQUU7TUFDUGxCLFlBQVksQ0FBQ29CLElBQUksQ0FBQyxDQUFDO01BQ25CO0lBQ0o7SUFDQSxJQUFJcEIsWUFBWSxDQUFDcUIsV0FBVyxDQUFDSCxJQUFJLENBQUNJLEtBQUssQ0FBQyxFQUFFO01BQ3RDdEIsWUFBWSxDQUFDb0IsSUFBSSxDQUFDLENBQUM7TUFDbkI7SUFDSjtJQUNBcEIsWUFBWSxDQUFDdUIsSUFBSSxDQUFDTCxJQUFJLENBQUNNLFFBQVEsRUFBRU4sSUFBSSxDQUFDSSxLQUFLLENBQUM7RUFDaEQsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDSUgsY0FBYyxXQUFkQSxjQUFjQSxDQUFDSixNQUFNLEVBQUU7SUFDbkIsSUFBTVUsUUFBUSxHQUFHQyxLQUFLLENBQUNDLE9BQU8sQ0FBQ1osTUFBTSxDQUFDYSxPQUFPLENBQUMsR0FBR2IsTUFBTSxDQUFDYSxPQUFPLEdBQUcsRUFBRTtJQUNwRSxJQUFNQyxZQUFZLEdBQUc3QixZQUFZLENBQUM4QixtQkFBbUIsQ0FBQ0wsUUFBUSxDQUFDO0lBQy9ELElBQUlJLFlBQVksRUFBRTtNQUNkLE9BQU87UUFBRUwsUUFBUSxFQUFFLFNBQVM7UUFBRUYsS0FBSyxFQUFFTztNQUFhLENBQUM7SUFDdkQ7SUFDQSxPQUFPLElBQUk7RUFDZixDQUFDO0VBRURDLG1CQUFtQixXQUFuQkEsbUJBQW1CQSxDQUFDQyxPQUFPLEVBQUU7SUFDekIsS0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUdELE9BQU8sQ0FBQ3pCLE1BQU0sRUFBRTBCLENBQUMsSUFBSSxDQUFDLEVBQUU7TUFDeEMsSUFBSWhDLFlBQVksQ0FBQ0csZUFBZSxDQUFDOEIsT0FBTyxDQUFDRixPQUFPLENBQUNDLENBQUMsQ0FBQyxDQUFDRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNwRSxPQUFPSCxPQUFPLENBQUNDLENBQUMsQ0FBQztNQUNyQjtJQUNKO0lBQ0EsT0FBTyxJQUFJO0VBQ2YsQ0FBQztFQUVERyxZQUFZLFdBQVpBLFlBQVlBLENBQUNiLEtBQUssRUFBRTtJQUNoQixJQUFJQSxLQUFLLElBQUlBLEtBQUssQ0FBQ2MsYUFBYSxJQUFJLE9BQU9kLEtBQUssQ0FBQ2MsYUFBYSxDQUFDWixRQUFRLEtBQUssUUFBUSxFQUFFO01BQ2xGLE9BQU9GLEtBQUssQ0FBQ2MsYUFBYSxDQUFDWixRQUFRO0lBQ3ZDO0lBQ0EsT0FBTyxNQUFNO0VBQ2pCLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDSUQsSUFBSSxXQUFKQSxJQUFJQSxDQUFDQyxRQUFRLEVBQUVGLEtBQUssRUFBRTtJQUNsQixJQUFNZSxNQUFNLEdBQUdmLEtBQUssQ0FBQ2MsYUFBYSxJQUFJLENBQUMsQ0FBQztJQUN4QyxJQUFNRSxHQUFHLEdBQUdELE1BQU0sQ0FBQ0MsR0FBRyxHQUFHcEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDcUMsSUFBSSxDQUFDRixNQUFNLENBQUNDLEdBQUcsQ0FBQyxDQUFDRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUU7SUFDaEUsSUFBTUMsVUFBVSxHQUFHSixNQUFNLENBQUNLLE1BQU0sR0FBR3hDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQ3FDLElBQUksQ0FBQ0YsTUFBTSxDQUFDSyxNQUFNLENBQUMsQ0FBQ0YsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFOztJQUU3RTtJQUNBLElBQUlHLE9BQU87SUFDWCxJQUFJQyxTQUFTO0lBQ2IsUUFBUXRCLEtBQUssQ0FBQ1ksVUFBVTtNQUNwQixLQUFLLDRCQUE0QjtRQUFFO1VBQy9CO1VBQ0E7VUFDQSxJQUFNVyxJQUFJLEdBQUc3QyxZQUFZLENBQUNtQyxZQUFZLENBQUNiLEtBQUssQ0FBQztVQUM3QyxJQUFNd0IsR0FBRyxHQUFHRCxJQUFJLEtBQUssVUFBVSxHQUN6QkUsZUFBZSxDQUFDQyw2QkFBNkIsR0FDN0NELGVBQWUsQ0FBQ0Usc0JBQXNCO1VBQzVDTixPQUFPLEdBQUczQyxZQUFZLENBQUNrRCxXQUFXLENBQUNKLEdBQUcsRUFBRTtZQUFFUixHQUFHLEVBQUhBO1VBQUksQ0FBQyxDQUFDO1VBQ2hETSxTQUFTLEdBQUdQLE1BQU0sQ0FBQ2MsR0FBRyxJQUFJLEVBQUU7VUFDNUI7UUFDSjtNQUNBLEtBQUssNEJBQTRCO1FBQzdCUixPQUFPLEdBQUczQyxZQUFZLENBQUNrRCxXQUFXLENBQzlCSCxlQUFlLENBQUNLLDZCQUE2QixFQUM3QztVQUFFVixNQUFNLEVBQUVELFVBQVU7VUFBRUgsR0FBRyxFQUFIQTtRQUFJLENBQzlCLENBQUM7UUFDRE0sU0FBUyxHQUFHUCxNQUFNLENBQUNjLEdBQUcsSUFBSSxFQUFFO1FBQzVCO01BQ0osS0FBSywrQkFBK0I7UUFDaEM7UUFDQVIsT0FBTyxHQUFHVSxJQUFJLENBQUMvQixLQUFLLENBQUNZLFVBQVUsRUFBRVosS0FBSyxDQUFDYyxhQUFhLENBQUM7UUFDckRRLFNBQVMsR0FBR1AsTUFBTSxDQUFDYyxHQUFHLElBQUksRUFBRTtRQUM1QjtNQUNKO1FBQ0lSLE9BQU8sR0FBR1UsSUFBSSxDQUFDL0IsS0FBSyxDQUFDWSxVQUFVLEVBQUVaLEtBQUssQ0FBQ2MsYUFBYSxDQUFDO1FBQ3JEUSxTQUFTLEdBQUdQLE1BQU0sQ0FBQ2MsR0FBRyxJQUFJLEVBQUU7SUFDcEM7SUFFQSxJQUFNRyxZQUFZLEdBQUdwRCxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUNxQyxJQUFJLENBQUNRLGVBQWUsQ0FBQ1EsaUJBQWlCLENBQUMsQ0FBQ2YsSUFBSSxDQUFDLENBQUM7SUFDOUUsSUFBTWdCLFdBQVcsR0FBR3RELENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQ3FDLElBQUksQ0FBQ1EsZUFBZSxDQUFDVSxvQkFBb0IsQ0FBQyxDQUFDakIsSUFBSSxDQUFDLENBQUM7SUFDaEYsSUFBTWtCLFlBQVksR0FBR3hELENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQ3FDLElBQUksQ0FBQ1EsZUFBZSxDQUFDWSxjQUFjLENBQUMsQ0FBQ25CLElBQUksQ0FBQyxDQUFDO0lBRTNFLElBQU1vQixhQUFhLEdBQUdoQixTQUFTLGdCQUFBaUIsTUFBQSxDQUNiakIsU0FBUywyQ0FBQWlCLE1BQUEsQ0FBcUNQLFlBQVksWUFDdEUsRUFBRTtJQUVSLElBQU1kLElBQUkscUlBQUFxQixNQUFBLENBRStCbEIsT0FBTyxpRkFBQWtCLE1BQUEsQ0FFdENELGFBQWEscUdBQUFDLE1BQUEsQ0FDNERMLFdBQVcsb0dBQUFLLE1BQUEsQ0FDdEJILFlBQVksc0RBRW5GO0lBRUQxRCxZQUFZLENBQUNDLE9BQU8sQ0FDZjZELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNsQ0MsUUFBUSxDQUFDdkMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUMvQmdCLElBQUksQ0FBQ0EsSUFBSSxDQUFDO0lBRWZ4QyxZQUFZLENBQUNDLE9BQU8sQ0FBQytELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDQyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQU07TUFDakVqRSxZQUFZLENBQUNrRSxPQUFPLENBQUM1QyxLQUFLLEVBQUV0QixZQUFZLENBQUNJLGFBQWEsQ0FBQztJQUMzRCxDQUFDLENBQUM7SUFDRkosWUFBWSxDQUFDQyxPQUFPLENBQUMrRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQ0MsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFNO01BQ2hFakUsWUFBWSxDQUFDa0UsT0FBTyxDQUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQztJQUNyQyxDQUFDLENBQUM7RUFDTixDQUFDO0VBRURGLElBQUksV0FBSkEsSUFBSUEsQ0FBQSxFQUFHO0lBQ0hwQixZQUFZLENBQUNDLE9BQU8sQ0FBQzhELFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQ0ksS0FBSyxDQUFDLENBQUM7RUFDbkQsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lELE9BQU8sV0FBUEEsT0FBT0EsQ0FBQzVDLEtBQUssRUFBRThDLE9BQU8sRUFBRTtJQUNwQixJQUFNQyxHQUFHLEdBQUdyRSxZQUFZLENBQUNzRSxVQUFVLENBQUNoRCxLQUFLLENBQUM7SUFDMUMsSUFBSSxDQUFDK0MsR0FBRyxFQUFFO01BQ05yRSxZQUFZLENBQUNvQixJQUFJLENBQUMsQ0FBQztNQUNuQjtJQUNKO0lBQ0EsSUFBSTtNQUNBLElBQU1tRCxPQUFPLEdBQUdILE9BQU8sS0FBSyxJQUFJLEdBQzFCO1FBQUVJLFNBQVMsRUFBRTtNQUFLLENBQUMsR0FDbkI7UUFBRUMsUUFBUSxFQUFFQyxJQUFJLENBQUNDLEdBQUcsQ0FBQyxDQUFDLEdBQUdQO01BQVEsQ0FBQztNQUN4Q1EsWUFBWSxDQUFDQyxPQUFPLENBQUNSLEdBQUcsRUFBRVMsSUFBSSxDQUFDQyxTQUFTLENBQUNSLE9BQU8sQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQyxPQUFPUyxDQUFDLEVBQUU7TUFDUjtJQUFBO0lBRUpoRixZQUFZLENBQUNvQixJQUFJLENBQUMsQ0FBQztFQUN2QixDQUFDO0VBRURDLFdBQVcsV0FBWEEsV0FBV0EsQ0FBQ0MsS0FBSyxFQUFFO0lBQ2YsSUFBTStDLEdBQUcsR0FBR3JFLFlBQVksQ0FBQ3NFLFVBQVUsQ0FBQ2hELEtBQUssQ0FBQztJQUMxQyxJQUFJLENBQUMrQyxHQUFHLEVBQUU7TUFDTixPQUFPLEtBQUs7SUFDaEI7SUFDQSxJQUFJWSxHQUFHO0lBQ1AsSUFBSTtNQUNBQSxHQUFHLEdBQUdMLFlBQVksQ0FBQ00sT0FBTyxDQUFDYixHQUFHLENBQUM7SUFDbkMsQ0FBQyxDQUFDLE9BQU9XLENBQUMsRUFBRTtNQUNSLE9BQU8sS0FBSztJQUNoQjtJQUNBLElBQUksQ0FBQ0MsR0FBRyxFQUFFO01BQ04sT0FBTyxLQUFLO0lBQ2hCO0lBQ0EsSUFBSUUsS0FBSztJQUNULElBQUk7TUFDQUEsS0FBSyxHQUFHTCxJQUFJLENBQUNNLEtBQUssQ0FBQ0gsR0FBRyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxPQUFPRCxDQUFDLEVBQUU7TUFDUixPQUFPLEtBQUs7SUFDaEI7SUFDQSxJQUFJRyxLQUFLLElBQUlBLEtBQUssQ0FBQ1gsU0FBUyxLQUFLLElBQUksRUFBRTtNQUNuQyxPQUFPLElBQUk7SUFDZjtJQUNBLElBQUlXLEtBQUssSUFBSSxPQUFPQSxLQUFLLENBQUNWLFFBQVEsS0FBSyxRQUFRLElBQUlVLEtBQUssQ0FBQ1YsUUFBUSxHQUFHQyxJQUFJLENBQUNDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7TUFDNUUsT0FBTyxJQUFJO0lBQ2Y7SUFDQSxPQUFPLEtBQUs7RUFDaEIsQ0FBQztFQUVEO0FBQ0o7QUFDQTtFQUNJTCxVQUFVLFdBQVZBLFVBQVVBLENBQUNoRCxLQUFLLEVBQUU7SUFDZCxJQUFJLENBQUNBLEtBQUssSUFBSSxDQUFDQSxLQUFLLENBQUNZLFVBQVUsRUFBRTtNQUM3QixPQUFPLEVBQUU7SUFDYjtJQUNBLElBQU1HLE1BQU0sR0FBR2YsS0FBSyxDQUFDYyxhQUFhLElBQUksQ0FBQyxDQUFDO0lBQ3hDLElBQU1pRCxPQUFPLEdBQUdoRCxNQUFNLENBQUNDLEdBQUcsSUFBSSxFQUFFO0lBQ2hDLElBQU1HLFVBQVUsR0FBR0osTUFBTSxDQUFDSyxNQUFNLElBQUksRUFBRTtJQUN0Qyw4QkFBQW1CLE1BQUEsQ0FBOEJ2QyxLQUFLLENBQUNZLFVBQVUsT0FBQTJCLE1BQUEsQ0FBSXBCLFVBQVUsT0FBQW9CLE1BQUEsQ0FBSXdCLE9BQU87RUFDM0UsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0luQyxXQUFXLFdBQVhBLFdBQVdBLENBQUNvQyxRQUFRLEVBQUVDLE1BQU0sRUFBRTtJQUMxQixJQUFJLE9BQU9ELFFBQVEsS0FBSyxRQUFRLEVBQUU7TUFDOUIsT0FBTyxFQUFFO0lBQ2I7SUFDQSxJQUFJRSxHQUFHLEdBQUdGLFFBQVE7SUFDbEJHLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDSCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQ0ksT0FBTyxDQUFDLFVBQUNDLElBQUksRUFBSztNQUN4Q0osR0FBRyxHQUFHQSxHQUFHLENBQUNLLE9BQU8sQ0FBQyxJQUFJQyxNQUFNLEtBQUFqQyxNQUFBLENBQUsrQixJQUFJLFFBQUssR0FBRyxDQUFDLEVBQUVMLE1BQU0sQ0FBQ0ssSUFBSSxDQUFDLENBQUM7SUFDakUsQ0FBQyxDQUFDO0lBQ0YsT0FBT0osR0FBRztFQUNkO0FBQ0osQ0FBQztBQUVEdEYsQ0FBQyxDQUFDNkYsUUFBUSxDQUFDLENBQUNDLEtBQUssQ0FBQyxZQUFNO0VBQ3BCaEcsWUFBWSxDQUFDSyxVQUFVLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMiLCJpZ25vcmVMaXN0IjpbXX0=