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

/* global $, i18n, localStorage, EventBus, AdviceAPI, globalTranslate, SecurityUtils */

/**
 * GitLab-style update notification banner shown at the top of every page.
 *
 * Subscribes to the existing 'advice' EventBus channel (populated by
 * WorkerPrepareAdvice). Picks the single most-important advice item from
 * the `warning` (red) bucket only (info-bucket items are intentionally
 * skipped — see pickBannerItem) whose messageTpl matches one of the
 * recognised banner templates. User can "Install now",
 * "Remind me in 3 days" or dismiss — state lives in localStorage so new
 * versions automatically re-show the banner.
 */
var updateBanner = {
  /**
   * Banner container created in main.volt.
   * Resolved in initialize() — must not call $() at module-load time.
   */
  $banner: null,

  /** Advice templates surfaced by the banner. */
  bannerTemplates: ['adv_AvailableNewVersionPBX', 'adv_AvailableNewVersionModule', 'adv_SecurityPatchAvailable'],

  /** Remind-me-later duration for the "remind in 3 days" button. */
  remindLaterMs: 3 * 24 * 60 * 60 * 1000,
  initialize: function initialize() {
    updateBanner.$banner = $('#update-banner');

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
    var params = entry.messageParams || {}; // HTML-escaped copy for template substitution and the button href.

    var safeParams = SecurityUtils.escapeTemplateParams(params);
    var ver = params.ver ? $('<div>').text(params.ver).html() : '';
    var moduleName = params.module ? $('<div>').text(params.module).html() : ''; // Template-specific primary message + action URL.

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
          actionUrl = safeParams.url || '';
          break;
        }

      case 'adv_SecurityPatchAvailable':
        message = updateBanner.interpolate(globalTranslate.banner_SecurityPatchAvailable, {
          module: moduleName,
          ver: ver
        });
        actionUrl = safeParams.url || '';
        break;

      case 'adv_AvailableNewVersionModule':
        // Reuse existing translated template for in-banner copy.
        message = i18n(entry.messageTpl, safeParams);
        actionUrl = safeParams.url || '';
        break;

      default:
        message = i18n(entry.messageTpl, safeParams);
        actionUrl = safeParams.url || '';
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
    } catch (e) {// Storage disabled / quota exceeded — still hide current banner in-memory.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2UvdXBkYXRlLWJhbm5lci5qcyJdLCJuYW1lcyI6WyJ1cGRhdGVCYW5uZXIiLCIkYmFubmVyIiwiYmFubmVyVGVtcGxhdGVzIiwicmVtaW5kTGF0ZXJNcyIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJvbkFkdmljZSIsIkFkdmljZUFQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJhZHZpY2UiLCJ1bmRlZmluZWQiLCJyZW5kZXIiLCJpdGVtIiwicGlja0Jhbm5lckl0ZW0iLCJoaWRlIiwiaXNEaXNtaXNzZWQiLCJlbnRyeSIsImRyYXciLCJzZXZlcml0eSIsIndhcm5pbmdzIiwiQXJyYXkiLCJpc0FycmF5Iiwid2FybmluZyIsIndhcm5pbmdNYXRjaCIsImZpbmRGaXJzdEJ5VGVtcGxhdGUiLCJlbnRyaWVzIiwiaSIsImluZGV4T2YiLCJtZXNzYWdlVHBsIiwic2V2ZXJpdHlIaW50IiwibWVzc2FnZVBhcmFtcyIsInBhcmFtcyIsInNhZmVQYXJhbXMiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlVGVtcGxhdGVQYXJhbXMiLCJ2ZXIiLCJ0ZXh0IiwiaHRtbCIsIm1vZHVsZU5hbWUiLCJtb2R1bGUiLCJtZXNzYWdlIiwiYWN0aW9uVXJsIiwiaGludCIsInRwbCIsImdsb2JhbFRyYW5zbGF0ZSIsImJhbm5lcl9TZWN1cml0eVVwZGF0ZUNyaXRpY2FsIiwiYmFubmVyX1VwZGF0ZUF2YWlsYWJsZSIsImludGVycG9sYXRlIiwidXJsIiwiYmFubmVyX1NlY3VyaXR5UGF0Y2hBdmFpbGFibGUiLCJpMThuIiwiaW5zdGFsbExhYmVsIiwiYmFubmVyX0luc3RhbGxOb3ciLCJyZW1pbmRMYWJlbCIsImJhbm5lcl9SZW1pbmRJbjNEYXlzIiwiZGlzbWlzc0xhYmVsIiwiYmFubmVyX0Rpc21pc3MiLCJpbnN0YWxsQnV0dG9uIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImZpbmQiLCJvbiIsImRpc21pc3MiLCJlbXB0eSIsInVudGlsTXMiLCJrZXkiLCJzdG9yYWdlS2V5IiwicGF5bG9hZCIsInBlcm1hbmVudCIsInJlbWluZEF0IiwiRGF0ZSIsIm5vdyIsImxvY2FsU3RvcmFnZSIsInNldEl0ZW0iLCJKU09OIiwic3RyaW5naWZ5IiwiZSIsInJhdyIsImdldEl0ZW0iLCJzdGF0ZSIsInBhcnNlIiwidmVyc2lvbiIsInRlbXBsYXRlIiwidmFsdWVzIiwib3V0IiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJuYW1lIiwicmVwbGFjZSIsIlJlZ0V4cCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxJQUxROztBQU9qQjtBQUNBQyxFQUFBQSxlQUFlLEVBQUUsQ0FDYiw0QkFEYSxFQUViLCtCQUZhLEVBR2IsNEJBSGEsQ0FSQTs7QUFjakI7QUFDQUMsRUFBQUEsYUFBYSxFQUFFLElBQUksRUFBSixHQUFTLEVBQVQsR0FBYyxFQUFkLEdBQW1CLElBZmpCO0FBaUJqQkMsRUFBQUEsVUFqQmlCLHdCQWlCSjtBQUNUSixJQUFBQSxZQUFZLENBQUNDLE9BQWIsR0FBdUJJLENBQUMsQ0FBQyxnQkFBRCxDQUF4Qjs7QUFDQSxRQUFJTCxZQUFZLENBQUNDLE9BQWIsQ0FBcUJLLE1BQXJCLEtBQWdDLENBQXBDLEVBQXVDO0FBQ25DO0FBQ0g7O0FBQ0RDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQixRQUFuQixFQUE2QlIsWUFBWSxDQUFDUyxRQUExQzs7QUFDQSxRQUFJLE9BQU9DLFNB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QUFDN0IsYUFBTyxFQUFQO0FBQ0g7O0FBQ0QsUUFBTUcsTUFBTSxHQUFHZixLQUFLLENBQUNjLGFBQU4sSUFBdUIsRUFBdEM7QUFDQSxRQUFNbUQsT0FBTyxHQUFHbEQsTUFBTSxDQUFDSSxHQUFQLElBQWMsRUFBOUI7QUFDQSxRQUFNRyxVQUFVLEdBQUdQLE1BQU0sQ0FBQ1EsTUFBUCxJQUFpQixFQUFwQztBQUNBLHlDQUE4QnZCLEtBQUssQ0FBQ1ksVUFBcEMsY0FBa0RVLFVBQWxELGNBQWdFMkMsT0FBaEU7QUFDSCxHQXZPZ0I7O0FBeU9qQjtBQUNKO0FBQ0E7QUFDQTtBQUNJbEMsRUFBQUEsV0E3T2lCLHVCQTZPTG1DLFFBN09LLEVBNk9LQyxNQTdPTCxFQTZPYTtBQUMxQixRQUFJLE9BQU9ELFFBQVAsS0FBb0IsUUFBeEIsRUFBa0M7QUFDOUIsYUFBTyxFQUFQO0FBQ0g7O0FBQ0QsUUFBSUUsR0FBRyxHQUFHRixRQUFWO0FBQ0FHLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxNQUFNLElBQUksRUFBdEIsRUFBMEJJLE9BQTFCLENBQWtDLFVBQUNDLElBQUQsRUFBVTtBQUN4Q0osTUFBQUEsR0FBRyxHQUFHQSxHQUFHLENBQUNLLE9BQUosQ0FBWSxJQUFJQyxNQUFKLFlBQWVGLElBQWYsUUFBd0IsR0FBeEIsQ0FBWixFQUEwQ0wsTUFBTSxDQUFDSyxJQUFELENBQWhELENBQU47QUFDSCxLQUZEO0FBR0EsV0FBT0osR0FBUDtBQUNIO0FBdFBnQixDQUFyQjtBQXlQQXJGLENBQUMsQ0FBQzRGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsRyxFQUFBQSxZQUFZLENBQUNJLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjYgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGkxOG4sIGxvY2FsU3RvcmFnZSwgRXZlbnRCdXMsIEFkdmljZUFQSSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogR2l0TGFiLXN0eWxlIHVwZGF0ZSBub3RpZmljYXRpb24gYmFubmVyIHNob3duIGF0IHRoZSB0b3Agb2YgZXZlcnkgcGFnZS5cbiAqXG4gKiBTdWJzY3JpYmVzIHRvIHRoZSBleGlzdGluZyAnYWR2aWNlJyBFdmVudEJ1cyBjaGFubmVsIChwb3B1bGF0ZWQgYnlcbiAqIFdvcmtlclByZXBhcmVBZHZpY2UpLiBQaWNrcyB0aGUgc2luZ2xlIG1vc3QtaW1wb3J0YW50IGFkdmljZSBpdGVtIGZyb21cbiAqIHRoZSBgd2FybmluZ2AgKHJlZCkgYnVja2V0IG9ubHkgKGluZm8tYnVja2V0IGl0ZW1zIGFyZSBpbnRlbnRpb25hbGx5XG4gKiBza2lwcGVkIOKAlCBzZWUgcGlja0Jhbm5lckl0ZW0pIHdob3NlIG1lc3NhZ2VUcGwgbWF0Y2hlcyBvbmUgb2YgdGhlXG4gKiByZWNvZ25pc2VkIGJhbm5lciB0ZW1wbGF0ZXMuIFVzZXIgY2FuIFwiSW5zdGFsbCBub3dcIixcbiAqIFwiUmVtaW5kIG1lIGluIDMgZGF5c1wiIG9yIGRpc21pc3Mg4oCUIHN0YXRlIGxpdmVzIGluIGxvY2FsU3RvcmFnZSBzbyBuZXdcbiAqIHZlcnNpb25zIGF1dG9tYXRpY2FsbHkgcmUtc2hvdyB0aGUgYmFubmVyLlxuICovXG5jb25zdCB1cGRhdGVCYW5uZXIgPSB7XG4gICAgLyoqXG4gICAgICogQmFubmVyIGNvbnRhaW5lciBjcmVhdGVkIGluIG1haW4udm9sdC5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICovXG4gICAgJGJhbm5lcjogbnVsbCxcblxuICAgIC8qKiBBZHZpY2UgdGVtcGxhdGVzIHN1cmZhY2VkIGJ5IHRoZSBiYW5uZXIuICovXG4gICAgYmFubmVyVGVtcGxhdGVzOiBbXG4gICAgICAgICdhZHZfQXZhaWxhYmxlTmV3VmVyc2lvblBCWCcsXG4gICAgICAgICdhZHZfQXZhaWxhYmxlTmV3VmVyc2lvbk1vZHVsZScsXG4gICAgICAgICdhZHZfU2VjdXJpdHlQYXRjaEF2YWlsYWJsZScsXG4gICAgXSxcblxuICAgIC8qKiBSZW1pbmQtbWUtbGF0ZXIgZHVyYXRpb24gZm9yIHRoZSBcInJlbWluZCBpbiAzIGRheXNcIiBidXR0b24uICovXG4gICAgcmVtaW5kTGF0ZXJNczogMyAqIDI0ICogNjAgKiA2MCAqIDEwMDAsXG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lciA9ICQoJyN1cGRhdGUtYmFubmVyJyk7XG4gICAgICAgIGlmICh1cGRhdGVCYW5uZXIuJGJhbm5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2FkdmljZScsIHVwZGF0ZUJhbm5lci5vbkFkdmljZSk7XG4gICAgICAgIGlmICh0eXBlb2YgQWR2aWNlQVBJICE9PSAndW5kZWZpbmVkJyAmJiBBZHZpY2VBUEkuZ2V0TGlzdCkge1xuICAgICAgICAgICAgQWR2aWNlQVBJLmdldExpc3QodXBkYXRlQmFubmVyLm9uQWR2aWNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudEJ1cyAvIEFkdmljZUFQSSBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBvbkFkdmljZShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2VcbiAgICAgICAgICAgIHx8ICFyZXNwb25zZS5kYXRhIHx8IHJlc3BvbnNlLmRhdGEuYWR2aWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVCYW5uZXIucmVuZGVyKHJlc3BvbnNlLmRhdGEuYWR2aWNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBoaWdoZXN0LXNldmVyaXR5IHJlbGV2YW50IGFkdmljZSBpdGVtLCBvciBoaWRlIHRoZSBiYW5uZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFkdmljZSAtIHtlcnJvciwgd2FybmluZywgaW5mbywgbmVlZFVwZGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoYWR2aWNlKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSB1cGRhdGVCYW5uZXIucGlja0Jhbm5lckl0ZW0oYWR2aWNlKTtcbiAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVCYW5uZXIuaXNEaXNtaXNzZWQoaXRlbS5lbnRyeSkpIHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlQmFubmVyLmRyYXcoaXRlbS5zZXZlcml0eSwgaXRlbS5lbnRyeSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENob29zZSB0aGUgYmFubmVyIGVudHJ5IOKAlCBiYW5uZXIgc3VyZmFjZXMgT05MWSB3YXJuaW5nLWJ1Y2tldCBhZHZpY2VcbiAgICAgKiAoY3JpdGljYWwgUEJYIHVwZGF0ZXMsIHVuaW5zdGFsbGVkIHNlY3VyaXR5IG1vZHVsZXMsIHVwZGF0ZXMgb2YgaW5zdGFsbGVkXG4gICAgICogc2VjdXJpdHkgbW9kdWxlcykuIFJlZ3VsYXIgaW5mby1sZXZlbCB1cGRhdGVzIHN0YXkgaW4gdGhlIGJlbGwgcG9wdXAgYW5kXG4gICAgICogYXJlIGludGVudGlvbmFsbHkgc2tpcHBlZCBoZXJlIHRvIGF2b2lkIGJhbm5lciBub2lzZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHs/e3NldmVyaXR5OiBzdHJpbmcsIGVudHJ5OiBvYmplY3R9fVxuICAgICAqL1xuICAgIHBpY2tCYW5uZXJJdGVtKGFkdmljZSkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IEFycmF5LmlzQXJyYXkoYWR2aWNlLndhcm5pbmcpID8gYWR2aWNlLndhcm5pbmcgOiBbXTtcbiAgICAgICAgY29uc3Qgd2FybmluZ01hdGNoID0gdXBkYXRlQmFubmVyLmZpbmRGaXJzdEJ5VGVtcGxhdGUod2FybmluZ3MpO1xuICAgICAgICBpZiAod2FybmluZ01hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzZXZlcml0eTogJ3dhcm5pbmcnLCBlbnRyeTogd2FybmluZ01hdGNoIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIGZpbmRGaXJzdEJ5VGVtcGxhdGUoZW50cmllcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh1cGRhdGVCYW5uZXIuYmFubmVyVGVtcGxhdGVzLmluZGV4T2YoZW50cmllc1tpXS5tZXNzYWdlVHBsKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50cmllc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgc2V2ZXJpdHlIaW50KGVudHJ5KSB7XG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5tZXNzYWdlUGFyYW1zICYmIHR5cGVvZiBlbnRyeS5tZXNzYWdlUGFyYW1zLnNldmVyaXR5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGVudHJ5Lm1lc3NhZ2VQYXJhbXMuc2V2ZXJpdHk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdpbmZvJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYW5kIHNob3cgdGhlIGJhbm5lciBET00uIEJhbm5lciBpcyBhbHdheXMgcmVuZGVyZWQgaW4gd2FybmluZ1xuICAgICAqIChyZWQpIHN0eWxlIGJlY2F1c2UgcGlja0Jhbm5lckl0ZW0gb25seSByZXR1cm5zIHdhcm5pbmctYnVja2V0IGVudHJpZXMuXG4gICAgICogVGhlIGBzZXZlcml0eWAgcGFyYW1ldGVyIGlzIGtlcHQgZm9yIGZ1dHVyZSByZS1pbnRyb2R1Y3Rpb24gb2YgaW5mb1xuICAgICAqIGJhbm5lcnMgYnV0IGlzIGN1cnJlbnRseSBhbHdheXMgJ3dhcm5pbmcnLlxuICAgICAqL1xuICAgIGRyYXcoc2V2ZXJpdHksIGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IGVudHJ5Lm1lc3NhZ2VQYXJhbXMgfHwge307XG4gICAgICAgIC8vIEhUTUwtZXNjYXBlZCBjb3B5IGZvciB0ZW1wbGF0ZSBzdWJzdGl0dXRpb24gYW5kIHRoZSBidXR0b24gaHJlZi5cbiAgICAgICAgY29uc3Qgc2FmZVBhcmFtcyA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlVGVtcGxhdGVQYXJhbXMocGFyYW1zKTtcbiAgICAgICAgY29uc3QgdmVyID0gcGFyYW1zLnZlciA/ICQoJzxkaXY+JykudGV4dChwYXJhbXMudmVyKS5odG1sKCkgOiAnJztcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHBhcmFtcy5tb2R1bGUgPyAkKCc8ZGl2PicpLnRleHQocGFyYW1zLm1vZHVsZSkuaHRtbCgpIDogJyc7XG5cbiAgICAgICAgLy8gVGVtcGxhdGUtc3BlY2lmaWMgcHJpbWFyeSBtZXNzYWdlICsgYWN0aW9uIFVSTC5cbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIGxldCBhY3Rpb25Vcmw7XG4gICAgICAgIHN3aXRjaCAoZW50cnkubWVzc2FnZVRwbCkge1xuICAgICAgICAgICAgY2FzZSAnYWR2X0F2YWlsYWJsZU5ld1ZlcnNpb25QQlgnOiB7XG4gICAgICAgICAgICAgICAgLy8gc2V2ZXJpdHkgaGludCAnY3JpdGljYWwnIOKGkiBzdHJvbmdlciB3b3JkaW5nLCAnd2FybmluZycgKG9yIHVua25vd24pXG4gICAgICAgICAgICAgICAgLy8g4oaSIFwiaW1wb3J0YW50IHVwZGF0ZSBhdmFpbGFibGVcIiBjb3B5LlxuICAgICAgICAgICAgICAgIGNvbnN0IGhpbnQgPSB1cGRhdGVCYW5uZXIuc2V2ZXJpdHlIaW50KGVudHJ5KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0cGwgPSBoaW50ID09PSAnY3JpdGljYWwnXG4gICAgICAgICAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLmJhbm5lcl9TZWN1cml0eVVwZGF0ZUNyaXRpY2FsXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLmJhbm5lcl9VcGRhdGVBdmFpbGFibGU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IHVwZGF0ZUJhbm5lci5pbnRlcnBvbGF0ZSh0cGwsIHsgdmVyIH0pO1xuICAgICAgICAgICAgICAgIGFjdGlvblVybCA9IHNhZmVQYXJhbXMudXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYWR2X1NlY3VyaXR5UGF0Y2hBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB1cGRhdGVCYW5uZXIuaW50ZXJwb2xhdGUoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfU2VjdXJpdHlQYXRjaEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgeyBtb2R1bGU6IG1vZHVsZU5hbWUsIHZlciB9LFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gc2FmZVBhcmFtcy51cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhZHZfQXZhaWxhYmxlTmV3VmVyc2lvbk1vZHVsZSc6XG4gICAgICAgICAgICAgICAgLy8gUmV1c2UgZXhpc3RpbmcgdHJhbnNsYXRlZCB0ZW1wbGF0ZSBmb3IgaW4tYmFubmVyIGNvcHkuXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGkxOG4oZW50cnkubWVzc2FnZVRwbCwgc2FmZVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gc2FmZVBhcmFtcy51cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuKGVudHJ5Lm1lc3NhZ2VUcGwsIHNhZmVQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGFjdGlvblVybCA9IHNhZmVQYXJhbXMudXJsIHx8ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaW5zdGFsbExhYmVsID0gJCgnPGRpdj4nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfSW5zdGFsbE5vdykuaHRtbCgpO1xuICAgICAgICBjb25zdCByZW1pbmRMYWJlbCA9ICQoJzxkaXY+JykudGV4dChnbG9iYWxUcmFuc2xhdGUuYmFubmVyX1JlbWluZEluM0RheXMpLmh0bWwoKTtcbiAgICAgICAgY29uc3QgZGlzbWlzc0xhYmVsID0gJCgnPGRpdj4nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5iYW5uZXJfRGlzbWlzcykuaHRtbCgpO1xuXG4gICAgICAgIGNvbnN0IGluc3RhbGxCdXR0b24gPSBhY3Rpb25VcmxcbiAgICAgICAgICAgID8gYDxhIGhyZWY9XCIke2FjdGlvblVybH1cIiBjbGFzcz1cInVpIHNtYWxsIHByaW1hcnkgYnV0dG9uXCI+JHtpbnN0YWxsTGFiZWx9PC9hPmBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvbiB1cGRhdGUtYmFubmVyLWljb25cIj48L2k+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidXBkYXRlLWJhbm5lci1tZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVwZGF0ZS1iYW5uZXItYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICR7aW5zdGFsbEJ1dHRvbn1cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGJ1dHRvbiB1cGRhdGUtYmFubmVyLXJlbWluZFwiPiR7cmVtaW5kTGFiZWx9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1cGRhdGUtYmFubmVyLWNsb3NlXCIgYXJpYS1sYWJlbD1cIiR7ZGlzbWlzc0xhYmVsfVwiPiZ0aW1lczs8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuXG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBpbmZvIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHNldmVyaXR5IHx8ICd3YXJuaW5nJylcbiAgICAgICAgICAgIC5odG1sKGh0bWwpO1xuXG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyLmZpbmQoJy51cGRhdGUtYmFubmVyLXJlbWluZCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5kaXNtaXNzKGVudHJ5LCB1cGRhdGVCYW5uZXIucmVtaW5kTGF0ZXJNcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lci5maW5kKCcudXBkYXRlLWJhbm5lci1jbG9zZScpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5kaXNtaXNzKGVudHJ5LCBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGhpZGUoKSB7XG4gICAgICAgIHVwZGF0ZUJhbm5lci4kYmFubmVyLmFkZENsYXNzKCdoaWRkZW4nKS5lbXB0eSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQZXJzaXN0IGRpc21pc3MgZGVjaXNpb24ga2V5ZWQgYnkgbWVzc2FnZVRwbCArIHZlcnNpb24uXG4gICAgICogYG51bGxgIHVudGlsTXMgbWVhbnMgXCJkaXNtaXNzIHVudGlsIGEgZGlmZmVyZW50IHZlcnNpb25cIi5cbiAgICAgKi9cbiAgICBkaXNtaXNzKGVudHJ5LCB1bnRpbE1zKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHVwZGF0ZUJhbm5lci5zdG9yYWdlS2V5KGVudHJ5KTtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHVwZGF0ZUJhbm5lci5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB1bnRpbE1zID09PSBudWxsXG4gICAgICAgICAgICAgICAgPyB7IHBlcm1hbmVudDogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgOiB7IHJlbWluZEF0OiBEYXRlLm5vdygpICsgdW50aWxNcyB9O1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIFN0b3JhZ2UgZGlzYWJsZWQgLyBxdW90YSBleGNlZWRlZCDigJQgc3RpbGwgaGlkZSBjdXJyZW50IGJhbm5lciBpbi1tZW1vcnkuXG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlQmFubmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgaXNEaXNtaXNzZWQoZW50cnkpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gdXBkYXRlQmFubmVyLnN0b3JhZ2VLZXkoZW50cnkpO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCByYXc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByYXcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RhdGU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UocmF3KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5wZXJtYW5lbnQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZSAmJiB0eXBlb2Ygc3RhdGUucmVtaW5kQXQgPT09ICdudW1iZXInICYmIHN0YXRlLnJlbWluZEF0ID4gRGF0ZS5ub3coKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNtaXNzIGtleSBkZXBlbmRzIG9uIG1lc3NhZ2UgdGVtcGxhdGUgKyB2ZXJzaW9uIHNvIHVwZ3JhZGVzIHJlLXNob3cgdGhlIGJhbm5lci5cbiAgICAgKi9cbiAgICBzdG9yYWdlS2V5KGVudHJ5KSB7XG4gICAgICAgIGlmICghZW50cnkgfHwgIWVudHJ5Lm1lc3NhZ2VUcGwpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJhbXMgPSBlbnRyeS5tZXNzYWdlUGFyYW1zIHx8IHt9O1xuICAgICAgICBjb25zdCB2ZXJzaW9uID0gcGFyYW1zLnZlciB8fCAnJztcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHBhcmFtcy5tb2R1bGUgfHwgJyc7XG4gICAgICAgIHJldHVybiBgdXBkYXRlQmFubmVyRGlzbWlzc18ke2VudHJ5Lm1lc3NhZ2VUcGx9XyR7bW9kdWxlTmFtZX1fJHt2ZXJzaW9ufWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNpbXBsZSAlcGxhY2Vob2xkZXIlIGludGVycG9sYXRpb24g4oCUIGBzdHJgIGlzIGEgc2VydmVyLXByb3ZpZGVkIHRyYW5zbGF0ZWRcbiAgICAgKiB0ZW1wbGF0ZSB0aGF0IGlzIG5vdCByZW5kZXJlZCBhcyBIVE1MICh2YWx1ZXMgYWxyZWFkeSBlc2NhcGVkIGJ5IHRoZSBjYWxsZXIpLlxuICAgICAqL1xuICAgIGludGVycG9sYXRlKHRlbXBsYXRlLCB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBsZXQgb3V0ID0gdGVtcGxhdGU7XG4gICAgICAgIE9iamVjdC5rZXlzKHZhbHVlcyB8fCB7fSkuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICAgICAgb3V0ID0gb3V0LnJlcGxhY2UobmV3IFJlZ0V4cChgJSR7bmFtZX0lYCwgJ2cnKSwgdmFsdWVzW25hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICB1cGRhdGVCYW5uZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=