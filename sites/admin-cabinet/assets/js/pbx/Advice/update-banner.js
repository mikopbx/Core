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
    var params = entry.messageParams || {};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2UvdXBkYXRlLWJhbm5lci5qcyJdLCJuYW1lcyI6WyJ1cGRhdGVCYW5uZXIiLCIkYmFubmVyIiwiYmFubmVyVGVtcGxhdGVzIiwicmVtaW5kTGF0ZXJNcyIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJvbkFkdmljZSIsIkFkdmljZUFQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJhZHZpY2UiLCJ1bmRlZmluZWQiLCJyZW5kZXIiLCJpdGVtIiwicGlja0Jhbm5lckl0ZW0iLCJoaWRlIiwiaXNEaXNtaXNzZWQiLCJlbnRyeSIsImRyYXciLCJzZXZlcml0eSIsIndhcm5pbmdzIiwiQXJyYXkiLCJpc0FycmF5Iiwid2FybmluZyIsIndhcm5pbmdNYXRjaCIsImZpbmRGaXJzdEJ5VGVtcGxhdGUiLCJlbnRyaWVzIiwiaSIsImluZGV4T2YiLCJtZXNzYWdlVHBsIiwic2V2ZXJpdHlIaW50IiwibWVzc2FnZVBhcmFtcyIsInBhcmFtcyIsInZlciIsInRleHQiLCJodG1sIiwibW9kdWxlTmFtZSIsIm1vZHVsZSIsIm1lc3NhZ2UiLCJhY3Rpb25VcmwiLCJoaW50IiwidHBsIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYmFubmVyX1NlY3VyaXR5VXBkYXRlQ3JpdGljYWwiLCJiYW5uZXJfVXBkYXRlQXZhaWxhYmxlIiwiaW50ZXJwb2xhdGUiLCJ1cmwiLCJiYW5uZXJfU2VjdXJpdHlQYXRjaEF2YWlsYWJsZSIsImkxOG4iLCJpbnN0YWxsTGFiZWwiLCJiYW5uZXJfSW5zdGFsbE5vdyIsInJlbWluZExhYmVsIiwiYmFubmVyX1JlbWluZEluM0RheXMiLCJkaXNtaXNzTGFiZWwiLCJiYW5uZXJfRGlzbWlzcyIsImluc3RhbGxCdXR0b24iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZmluZCIsIm9uIiwiZGlzbWlzcyIsImVtcHR5IiwidW50aWxNcyIsImtleSIsInN0b3JhZ2VLZXkiLCJwYXlsb2FkIiwicGVybWFuZW50IiwicmVtaW5kQXQiLCJEYXRlIiwibm93IiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJlIiwicmF3IiwiZ2V0SXRlbSIsInN0YXRlIiwicGFyc2UiLCJ2ZXJzaW9uIiwidGVtcGxhdGUiLCJ2YWx1ZXMiLCJvdXQiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsIm5hbWUiLCJyZXBsYWNlIiwiUmVnRXhwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxJQUxROztBQU9qQjtBQUNBQyxFQUFBQSxlQUFlLEVBQUUsQ0FDYiw0QkFEYSxFQUViLCtCQUZhLEVBR2IsNEJBSGEsQ0FSQTs7QUFjakI7QUFDQUMsRUFBQUEsYUFBYSxFQUFFLElBQUksRUFBSixHQUFTLEVBQVQsR0FBYyxFQUFkLEdBQW1CLElBZmpCO0FBaUJqQkMsRUFBQUEsVUFqQmlCLHdCQWlCSjtBQUNUSixJQUFBQSxZQUFZLENBQUNDLE9BQWIsR0FBdUJJLENBQUMsQ0FBQyxnQkFBRCxDQUF4Qjs7QUFDQSxRQUFJTCxZQUFZLENBQUNDLE9BQWIsQ0FBcUJLLE1BQXJCLEtBQWdDLENBQXBDLEVBQXVDO0FBQ25DO0FBQ0g7O0FBQ0RDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQixRQUFuQixFQUE2QlIsWUFBWSxDQUFDUyxRQUExQzs7QUFDQSxRQUFJLE9BQU9DLFNBQVAsS0FBcUIsV0FBckIsSUFBb0NBLFNBQVMsQ0FBQ0MsT0FBbEQsRUFBMkQ7QUFDdkRELE1BQUFB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QWMsRUFBOUI7QUFDQSxRQUFNRyxVQUFVLEdBQUdKLE1BQU0sQ0FBQ0ssTUFBUCxJQUFpQixFQUFwQztBQUNBLHlDQUE4QnBCLEtBQUssQ0FBQ1ksVUFBcEMsY0FBa0RPLFVBQWxELGNBQWdFMkMsT0FBaEU7QUFDSCxHQXJPZ0I7O0FBdU9qQjtBQUNKO0FBQ0E7QUFDQTtBQUNJbEMsRUFBQUEsV0EzT2lCLHVCQTJPTG1DLFFBM09LLEVBMk9LQyxNQTNPTCxFQTJPYTtBQUMxQixRQUFJLE9BQU9ELFFBQVAsS0FBb0IsUUFBeEIsRUFBa0M7QUFDOUIsYUFBTyxFQUFQO0FBQ0g7O0FBQ0QsUUFBSUUsR0FBRyxHQUFHRixRQUFWO0FBQ0FHLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxNQUFNLElBQUksRUFBdEIsRUFBMEJJLE9BQTFCLENBQWtDLFVBQUNDLElBQUQsRUFBVTtBQUN4Q0osTUFBQUEsR0FBRyxHQUFHQSxHQUFHLENBQUNLLE9BQUosQ0FBWSxJQUFJQyxNQUFKLFlBQWVGLElBQWYsUUFBd0IsR0FBeEIsQ0FBWixFQUEwQ0wsTUFBTSxDQUFDSyxJQUFELENBQWhELENBQU47QUFDSCxLQUZEO0FBR0EsV0FBT0osR0FBUDtBQUNIO0FBcFBnQixDQUFyQjtBQXVQQWxGLENBQUMsQ0FBQ3lGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIvRixFQUFBQSxZQUFZLENBQUNJLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjYgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGkxOG4sIGxvY2FsU3RvcmFnZSwgRXZlbnRCdXMsIEFkdmljZUFQSSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogR2l0TGFiLXN0eWxlIHVwZGF0ZSBub3RpZmljYXRpb24gYmFubmVyIHNob3duIGF0IHRoZSB0b3Agb2YgZXZlcnkgcGFnZS5cbiAqXG4gKiBTdWJzY3JpYmVzIHRvIHRoZSBleGlzdGluZyAnYWR2aWNlJyBFdmVudEJ1cyBjaGFubmVsIChwb3B1bGF0ZWQgYnlcbiAqIFdvcmtlclByZXBhcmVBZHZpY2UpLiBQaWNrcyB0aGUgc2luZ2xlIG1vc3QtaW1wb3J0YW50IGFkdmljZSBpdGVtIGZyb21cbiAqIHRoZSBgd2FybmluZ2AgKHJlZCkgYW5kIGBpbmZvYCAoYmx1ZSkgYnVja2V0cyB3aG9zZSBtZXNzYWdlVHBsIG1hdGNoZXNcbiAqIG9uZSBvZiB0aGUgcmVjb2duaXNlZCBiYW5uZXIgdGVtcGxhdGVzLiBVc2VyIGNhbiBcIkluc3RhbGwgbm93XCIsXG4gKiBcIlJlbWluZCBtZSBpbiAzIGRheXNcIiBvciBkaXNtaXNzIOKAlCBzdGF0ZSBsaXZlcyBpbiBsb2NhbFN0b3JhZ2Ugc28gbmV3XG4gKiB2ZXJzaW9ucyBhdXRvbWF0aWNhbGx5IHJlLXNob3cgdGhlIGJhbm5lci5cbiAqL1xuY29uc3QgdXBkYXRlQmFubmVyID0ge1xuICAgIC8qKlxuICAgICAqIEJhbm5lciBjb250YWluZXIgY3JlYXRlZCBpbiBtYWluLnZvbHQuXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqL1xuICAgICRiYW5uZXI6IG51bGwsXG5cbiAgICAvKiogQWR2aWNlIHRlbXBsYXRlcyBzdXJmYWNlZCBieSB0aGUgYmFubmVyLiAqL1xuICAgIGJhbm5lclRlbXBsYXRlczogW1xuICAgICAgICAnYWR2X0F2YWlsYWJsZU5ld1ZlcnNpb25QQlgnLFxuICAgICAgICAnYWR2X0F2YWlsYWJsZU5ld1ZlcnNpb25Nb2R1bGUnLFxuICAgICAgICAnYWR2X1NlY3VyaXR5UGF0Y2hBdmFpbGFibGUnLFxuICAgIF0sXG5cbiAgICAvKiogUmVtaW5kLW1lLWxhdGVyIGR1cmF0aW9uIGZvciB0aGUgXCJyZW1pbmQgaW4gMyBkYXlzXCIgYnV0dG9uLiAqL1xuICAgIHJlbWluZExhdGVyTXM6IDMgKiAyNCAqIDYwICogNjAgKiAxMDAwLFxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdXBkYXRlQmFubmVyLiRiYW5uZXIgPSAkKCcjdXBkYXRlLWJhbm5lcicpO1xuICAgICAgICBpZiAodXBkYXRlQmFubmVyLiRiYW5uZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdhZHZpY2UnLCB1cGRhdGVCYW5uZXIub25BZHZpY2UpO1xuICAgICAgICBpZiAodHlwZW9mIEFkdmljZUFQSSAhPT0gJ3VuZGVmaW5lZCcgJiYgQWR2aWNlQVBJLmdldExpc3QpIHtcbiAgICAgICAgICAgIEFkdmljZUFQSS5nZXRMaXN0KHVwZGF0ZUJhbm5lci5vbkFkdmljZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXZlbnRCdXMgLyBBZHZpY2VBUEkgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlXG4gICAgICovXG4gICAgb25BZHZpY2UocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlXG4gICAgICAgICAgICB8fCAhcmVzcG9uc2UuZGF0YSB8fCByZXNwb25zZS5kYXRhLmFkdmljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlQmFubmVyLnJlbmRlcihyZXNwb25zZS5kYXRhLmFkdmljZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgaGlnaGVzdC1zZXZlcml0eSByZWxldmFudCBhZHZpY2UgaXRlbSwgb3IgaGlkZSB0aGUgYmFubmVyLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhZHZpY2UgLSB7ZXJyb3IsIHdhcm5pbmcsIGluZm8sIG5lZWRVcGRhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKGFkdmljZSkge1xuICAgICAgICBjb25zdCBpdGVtID0gdXBkYXRlQmFubmVyLnBpY2tCYW5uZXJJdGVtKGFkdmljZSk7XG4gICAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAgICAgdXBkYXRlQmFubmVyLmhpZGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXBkYXRlQmFubmVyLmlzRGlzbWlzc2VkKGl0ZW0uZW50cnkpKSB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZUJhbm5lci5kcmF3KGl0ZW0uc2V2ZXJpdHksIGl0ZW0uZW50cnkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaG9vc2UgdGhlIGJhbm5lciBlbnRyeSDigJQgYmFubmVyIHN1cmZhY2VzIE9OTFkgd2FybmluZy1idWNrZXQgYWR2aWNlXG4gICAgICogKGNyaXRpY2FsIFBCWCB1cGRhdGVzLCB1bmluc3RhbGxlZCBzZWN1cml0eSBtb2R1bGVzLCB1cGRhdGVzIG9mIGluc3RhbGxlZFxuICAgICAqIHNlY3VyaXR5IG1vZHVsZXMpLiBSZWd1bGFyIGluZm8tbGV2ZWwgdXBkYXRlcyBzdGF5IGluIHRoZSBiZWxsIHBvcHVwIGFuZFxuICAgICAqIGFyZSBpbnRlbnRpb25hbGx5IHNraXBwZWQgaGVyZSB0byBhdm9pZCBiYW5uZXIgbm9pc2UuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7P3tzZXZlcml0eTogc3RyaW5nLCBlbnRyeTogb2JqZWN0fX1cbiAgICAgKi9cbiAgICBwaWNrQmFubmVySXRlbShhZHZpY2UpIHtcbiAgICAgICAgY29uc3Qgd2FybmluZ3MgPSBBcnJheS5pc0FycmF5KGFkdmljZS53YXJuaW5nKSA/IGFkdmljZS53YXJuaW5nIDogW107XG4gICAgICAgIGNvbnN0IHdhcm5pbmdNYXRjaCA9IHVwZGF0ZUJhbm5lci5maW5kRmlyc3RCeVRlbXBsYXRlKHdhcm5pbmdzKTtcbiAgICAgICAgaWYgKHdhcm5pbmdNYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc2V2ZXJpdHk6ICd3YXJuaW5nJywgZW50cnk6IHdhcm5pbmdNYXRjaCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICBmaW5kRmlyc3RCeVRlbXBsYXRlKGVudHJpZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodXBkYXRlQmFubmVyLmJhbm5lclRlbXBsYXRlcy5pbmRleE9mKGVudHJpZXNbaV0ubWVzc2FnZVRwbCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudHJpZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIHNldmVyaXR5SGludChlbnRyeSkge1xuICAgICAgICBpZiAoZW50cnkgJiYgZW50cnkubWVzc2FnZVBhcmFtcyAmJiB0eXBlb2YgZW50cnkubWVzc2FnZVBhcmFtcy5zZXZlcml0eSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBlbnRyeS5tZXNzYWdlUGFyYW1zLnNldmVyaXR5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnaW5mbyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGFuZCBzaG93IHRoZSBiYW5uZXIgRE9NLiBCYW5uZXIgaXMgYWx3YXlzIHJlbmRlcmVkIGluIHdhcm5pbmdcbiAgICAgKiAocmVkKSBzdHlsZSBiZWNhdXNlIHBpY2tCYW5uZXJJdGVtIG9ubHkgcmV0dXJucyB3YXJuaW5nLWJ1Y2tldCBlbnRyaWVzLlxuICAgICAqIFRoZSBgc2V2ZXJpdHlgIHBhcmFtZXRlciBpcyBrZXB0IGZvciBmdXR1cmUgcmUtaW50cm9kdWN0aW9uIG9mIGluZm9cbiAgICAgKiBiYW5uZXJzIGJ1dCBpcyBjdXJyZW50bHkgYWx3YXlzICd3YXJuaW5nJy5cbiAgICAgKi9cbiAgICBkcmF3KHNldmVyaXR5LCBlbnRyeSkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBlbnRyeS5tZXNzYWdlUGFyYW1zIHx8IHt9O1xuICAgICAgICBjb25zdCB2ZXIgPSBwYXJhbXMudmVyID8gJCgnPGRpdj4nKS50ZXh0KHBhcmFtcy52ZXIpLmh0bWwoKSA6ICcnO1xuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gcGFyYW1zLm1vZHVsZSA/ICQoJzxkaXY+JykudGV4dChwYXJhbXMubW9kdWxlKS5odG1sKCkgOiAnJztcblxuICAgICAgICAvLyBUZW1wbGF0ZS1zcGVjaWZpYyBwcmltYXJ5IG1lc3NhZ2UgKyBhY3Rpb24gVVJMLlxuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgbGV0IGFjdGlvblVybDtcbiAgICAgICAgc3dpdGNoIChlbnRyeS5tZXNzYWdlVHBsKSB7XG4gICAgICAgICAgICBjYXNlICdhZHZfQXZhaWxhYmxlTmV3VmVyc2lvblBCWCc6IHtcbiAgICAgICAgICAgICAgICAvLyBzZXZlcml0eSBoaW50ICdjcml0aWNhbCcg4oaSIHN0cm9uZ2VyIHdvcmRpbmcsICd3YXJuaW5nJyAob3IgdW5rbm93bilcbiAgICAgICAgICAgICAgICAvLyDihpIgXCJpbXBvcnRhbnQgdXBkYXRlIGF2YWlsYWJsZVwiIGNvcHkuXG4gICAgICAgICAgICAgICAgY29uc3QgaGludCA9IHVwZGF0ZUJhbm5lci5zZXZlcml0eUhpbnQoZW50cnkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRwbCA9IGhpbnQgPT09ICdjcml0aWNhbCdcbiAgICAgICAgICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUuYmFubmVyX1NlY3VyaXR5VXBkYXRlQ3JpdGljYWxcbiAgICAgICAgICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUuYmFubmVyX1VwZGF0ZUF2YWlsYWJsZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdXBkYXRlQmFubmVyLmludGVycG9sYXRlKHRwbCwgeyB2ZXIgfSk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gcGFyYW1zLnVybCB8fCAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2Fkdl9TZWN1cml0eVBhdGNoQXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdXBkYXRlQmFubmVyLmludGVycG9sYXRlKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuYmFubmVyX1NlY3VyaXR5UGF0Y2hBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgICAgIHsgbW9kdWxlOiBtb2R1bGVOYW1lLCB2ZXIgfSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGFjdGlvblVybCA9IHBhcmFtcy51cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhZHZfQXZhaWxhYmxlTmV3VmVyc2lvbk1vZHVsZSc6XG4gICAgICAgICAgICAgICAgLy8gUmV1c2UgZXhpc3RpbmcgdHJhbnNsYXRlZCB0ZW1wbGF0ZSBmb3IgaW4tYmFubmVyIGNvcHkuXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGkxOG4oZW50cnkubWVzc2FnZVRwbCwgZW50cnkubWVzc2FnZVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gcGFyYW1zLnVybCB8fCAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGkxOG4oZW50cnkubWVzc2FnZVRwbCwgZW50cnkubWVzc2FnZVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgYWN0aW9uVXJsID0gcGFyYW1zLnVybCB8fCAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGluc3RhbGxMYWJlbCA9ICQoJzxkaXY+JykudGV4dChnbG9iYWxUcmFuc2xhdGUuYmFubmVyX0luc3RhbGxOb3cpLmh0bWwoKTtcbiAgICAgICAgY29uc3QgcmVtaW5kTGFiZWwgPSAkKCc8ZGl2PicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmJhbm5lcl9SZW1pbmRJbjNEYXlzKS5odG1sKCk7XG4gICAgICAgIGNvbnN0IGRpc21pc3NMYWJlbCA9ICQoJzxkaXY+JykudGV4dChnbG9iYWxUcmFuc2xhdGUuYmFubmVyX0Rpc21pc3MpLmh0bWwoKTtcblxuICAgICAgICBjb25zdCBpbnN0YWxsQnV0dG9uID0gYWN0aW9uVXJsXG4gICAgICAgICAgICA/IGA8YSBocmVmPVwiJHthY3Rpb25Vcmx9XCIgY2xhc3M9XCJ1aSBzbWFsbCBwcmltYXJ5IGJ1dHRvblwiPiR7aW5zdGFsbExhYmVsfTwvYT5gXG4gICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgIGNvbnN0IGh0bWwgPSBgXG4gICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb24gdXBkYXRlLWJhbm5lci1pY29uXCI+PC9pPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVwZGF0ZS1iYW5uZXItbWVzc2FnZVwiPiR7bWVzc2FnZX08L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1cGRhdGUtYmFubmVyLWFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAke2luc3RhbGxCdXR0b259XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBidXR0b24gdXBkYXRlLWJhbm5lci1yZW1pbmRcIj4ke3JlbWluZExhYmVsfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidXBkYXRlLWJhbm5lci1jbG9zZVwiIGFyaWEtbGFiZWw9XCIke2Rpc21pc3NMYWJlbH1cIj4mdGltZXM7PC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcblxuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gaW5mbyB3YXJuaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhzZXZlcml0eSB8fCAnd2FybmluZycpXG4gICAgICAgICAgICAuaHRtbChodG1sKTtcblxuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lci5maW5kKCcudXBkYXRlLWJhbm5lci1yZW1pbmQnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuZGlzbWlzcyhlbnRyeSwgdXBkYXRlQmFubmVyLnJlbWluZExhdGVyTXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdXBkYXRlQmFubmVyLiRiYW5uZXIuZmluZCgnLnVwZGF0ZS1iYW5uZXItY2xvc2UnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuZGlzbWlzcyhlbnRyeSwgbnVsbCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBoaWRlKCkge1xuICAgICAgICB1cGRhdGVCYW5uZXIuJGJhbm5lci5hZGRDbGFzcygnaGlkZGVuJykuZW1wdHkoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGVyc2lzdCBkaXNtaXNzIGRlY2lzaW9uIGtleWVkIGJ5IG1lc3NhZ2VUcGwgKyB2ZXJzaW9uLlxuICAgICAqIGBudWxsYCB1bnRpbE1zIG1lYW5zIFwiZGlzbWlzcyB1bnRpbCBhIGRpZmZlcmVudCB2ZXJzaW9uXCIuXG4gICAgICovXG4gICAgZGlzbWlzcyhlbnRyeSwgdW50aWxNcykge1xuICAgICAgICBjb25zdCBrZXkgPSB1cGRhdGVCYW5uZXIuc3RvcmFnZUtleShlbnRyeSk7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICB1cGRhdGVCYW5uZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gdW50aWxNcyA9PT0gbnVsbFxuICAgICAgICAgICAgICAgID8geyBwZXJtYW5lbnQ6IHRydWUgfVxuICAgICAgICAgICAgICAgIDogeyByZW1pbmRBdDogRGF0ZS5ub3coKSArIHVudGlsTXMgfTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBTdG9yYWdlIGRpc2FibGVkIC8gcXVvdGEgZXhjZWVkZWQg4oCUIHN0aWxsIGhpZGUgY3VycmVudCBiYW5uZXIgaW4tbWVtb3J5LlxuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZUJhbm5lci5oaWRlKCk7XG4gICAgfSxcblxuICAgIGlzRGlzbWlzc2VkKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHVwZGF0ZUJhbm5lci5zdG9yYWdlS2V5KGVudHJ5KTtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmF3O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmF3ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmF3KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0YXRlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RhdGUgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUucGVybWFuZW50ID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUgJiYgdHlwZW9mIHN0YXRlLnJlbWluZEF0ID09PSAnbnVtYmVyJyAmJiBzdGF0ZS5yZW1pbmRBdCA+IERhdGUubm93KCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzbWlzcyBrZXkgZGVwZW5kcyBvbiBtZXNzYWdlIHRlbXBsYXRlICsgdmVyc2lvbiBzbyB1cGdyYWRlcyByZS1zaG93IHRoZSBiYW5uZXIuXG4gICAgICovXG4gICAgc3RvcmFnZUtleShlbnRyeSkge1xuICAgICAgICBpZiAoIWVudHJ5IHx8ICFlbnRyeS5tZXNzYWdlVHBsKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyYW1zID0gZW50cnkubWVzc2FnZVBhcmFtcyB8fCB7fTtcbiAgICAgICAgY29uc3QgdmVyc2lvbiA9IHBhcmFtcy52ZXIgfHwgJyc7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBwYXJhbXMubW9kdWxlIHx8ICcnO1xuICAgICAgICByZXR1cm4gYHVwZGF0ZUJhbm5lckRpc21pc3NfJHtlbnRyeS5tZXNzYWdlVHBsfV8ke21vZHVsZU5hbWV9XyR7dmVyc2lvbn1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaW1wbGUgJXBsYWNlaG9sZGVyJSBpbnRlcnBvbGF0aW9uIOKAlCBgc3RyYCBpcyBhIHNlcnZlci1wcm92aWRlZCB0cmFuc2xhdGVkXG4gICAgICogdGVtcGxhdGUgdGhhdCBpcyBub3QgcmVuZGVyZWQgYXMgSFRNTCAodmFsdWVzIGFscmVhZHkgZXNjYXBlZCBieSB0aGUgY2FsbGVyKS5cbiAgICAgKi9cbiAgICBpbnRlcnBvbGF0ZSh0ZW1wbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG91dCA9IHRlbXBsYXRlO1xuICAgICAgICBPYmplY3Qua2V5cyh2YWx1ZXMgfHwge30pLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgICAgIG91dCA9IG91dC5yZXBsYWNlKG5ldyBSZWdFeHAoYCUke25hbWV9JWAsICdnJyksIHZhbHVlc1tuYW1lXSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgdXBkYXRlQmFubmVyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19