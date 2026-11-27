"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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

/* global Intl, moment */

/**
 * Global date/time formatter that renders timestamps in the PBX server
 * timezone regardless of the browser's local timezone.
 *
 * Backend endpoints place TZ metadata under `data._meta`:
 *   { server_timezone: 'Europe/Moscow', server_timezone_offset: 10800 }
 * The numeric offset (seconds) is kept as a fallback for callers that
 * pre-date the IANA-name field. Uncached responses may add
 * `server_now: 'YYYY-MM-DD HH:mm:ss'`, the PBX wall-clock time.
 *
 * @module PbxDateTime
 */
var PbxDateTime = {
  serverTimezone: null,
  serverTimezoneOffset: 0,

  /**
   * PBX wall-clock time from the last `server_now` and the browser time it arrived at.
   * @type {string|null}
   */
  serverNow: null,
  serverNowReceivedAt: 0,

  /**
   * Store server timezone metadata published in API responses.
   *
   * Accepts either:
   *  - `{ server_timezone, server_timezone_offset }` (canonical _meta envelope)
   *  - the older `serverTimezoneOffset` numeric field
   *
   * @param {object|null} meta
   */
  setServerMeta: function setServerMeta(meta) {
    if (!meta) {
      return;
    }

    if (typeof meta.server_timezone === 'string' && meta.server_timezone.length > 0) {
      PbxDateTime.serverTimezone = meta.server_timezone;
    }

    if (typeof meta.server_timezone_offset === 'number') {
      PbxDateTime.serverTimezoneOffset = meta.server_timezone_offset;
    }

    if (typeof meta.server_now === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(meta.server_now)) {
      PbxDateTime.serverNow = meta.server_now;
      PbxDateTime.serverNowReceivedAt = Date.now();
    }
  },

  /**
   * Current PBX wall-clock time as a moment, for calendar-day logic such as "today" in
   * date pickers. Its date and time fields carry the PBX time; the instant it represents
   * in the browser timezone is meaningless.
   *
   * Prefers `server_now` (independent of a wrong browser clock), then the server timezone
   * (date only: some browsers print midnight as hour 24), then the browser time.
   * Requires moment on the page.
   *
   * @returns {moment.Moment}
   */
  serverNowMoment: function serverNowMoment() {
    if (PbxDateTime.serverNow) {
      var now = moment(PbxDateTime.serverNow, 'YYYY-MM-DD HH:mm:ss', true);

      if (now.isValid()) {
        return now.add(Date.now() - PbxDateTime.serverNowReceivedAt, 'ms');
      }
    }

    if (PbxDateTime.hasServerTimezone() && typeof Intl !== 'undefined') {
      try {
        var parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: PbxDateTime.serverTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(new Date());
        var lookup = {};
        parts.forEach(function (p) {
          lookup[p.type] = p.value;
        });
        var today = moment("".concat(lookup.year, "-").concat(lookup.month, "-").concat(lookup.day), 'YYYY-MM-DD', true);

        if (today.isValid()) {
          return today;
        }
      } catch (e) {// Fall through to the browser time
      }
    }

    return moment();
  },

  /**
   * Whether IANA-based formatting is available (preferred).
   *
   * @returns {boolean}
   */
  hasServerTimezone: function hasServerTimezone() {
    return typeof PbxDateTime.serverTimezone === 'string' && PbxDateTime.serverTimezone.length > 0;
  },

  /**
   * Format a unix timestamp as a date/time string rendered in server TZ.
   *
   * @param {number} timestamp - seconds since epoch
   * @param {object} [opts]
   * @param {boolean} [opts.withSeconds=false]
   * @returns {string} `YYYY-MM-DD HH:MM[:SS]`
   */
  formatServerTime: function formatServerTime(timestamp) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!Number.isFinite(timestamp)) {
      return '';
    }

    var withSeconds = opts.withSeconds === true;
    var date = new Date(timestamp * 1000);

    if (PbxDateTime.hasServerTimezone() && typeof Intl !== 'undefined') {
      try {
        var fmtOpts = {
          timeZone: PbxDateTime.serverTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };

        if (withSeconds) {
          fmtOpts.second = '2-digit';
        }

        var parts = new Intl.DateTimeFormat('en-CA', fmtOpts).formatToParts(date);
        return PbxDateTime.partsToIso(parts, withSeconds);
      } catch (e) {// Fall through to offset-based path
      }
    }

    return PbxDateTime.formatWithOffset(timestamp, withSeconds);
  },

  /**
   * Format a unix timestamp in the browser's local TZ. Used for the
   * "your time" half of tooltips.
   *
   * @param {number} timestamp - seconds since epoch
   * @param {object} [opts]
   * @param {boolean} [opts.withSeconds=false]
   * @returns {string}
   */
  formatBrowserTime: function formatBrowserTime(timestamp) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!Number.isFinite(timestamp)) {
      return '';
    }

    var withSeconds = opts.withSeconds === true;
    var d = new Date(timestamp * 1000);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');

    if (!withSeconds) {
      return "".concat(yyyy, "-").concat(mm, "-").concat(dd, " ").concat(hh, ":").concat(mi);
    }

    var ss = String(d.getSeconds()).padStart(2, '0');
    return "".concat(yyyy, "-").concat(mm, "-").concat(dd, " ").concat(hh, ":").concat(mi, ":").concat(ss);
  },

  /**
   * Format a server-supplied "Y-m-d H:i:s" string (already in server TZ).
   * Used for fields that the backend serialises as a string instead of
   * a unix timestamp (e.g. Passkeys.last_used_at).
   *
   * @param {string} serverStr
   * @returns {string} The same string, normalised — and "" for empty input.
   */
  formatServerDateString: function formatServerDateString(serverStr) {
    if (typeof serverStr !== 'string' || serverStr.length === 0) {
      return '';
    }

    return serverStr.replace('T', ' ').slice(0, 19);
  },

  /**
   * Convert a server-supplied "Y-m-d H:i:s" string to a unix timestamp,
   * interpreting the input as already-in-server-TZ.
   *
   * @param {string} serverStr
   * @returns {number|null} Unix timestamp (seconds) or null on parse failure.
   */
  serverStringToTimestamp: function serverStringToTimestamp(serverStr) {
    if (typeof serverStr !== 'string' || serverStr.length === 0) {
      return null;
    }

    var match = serverStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);

    if (!match) {
      return null;
    }

    var _match$map = match.map(Number),
        _match$map2 = _slicedToArray(_match$map, 7),
        y = _match$map2[1],
        mo = _match$map2[2],
        d = _match$map2[3],
        h = _match$map2[4],
        mi = _match$map2[5],
        s = _match$map2[6];

    var utcMs = Date.UTC(y, mo - 1, d, h, mi, s);
    return Math.floor(utcMs / 1000) - PbxDateTime.serverTimezoneOffset;
  },

  /**
   * Short label for the server timezone, e.g. "Europe/Moscow (UTC+03:00)".
   *
   * @returns {string}
   */
  getServerTzLabel: function getServerTzLabel() {
    var offset = PbxDateTime.formatOffset(PbxDateTime.serverTimezoneOffset);

    if (PbxDateTime.hasServerTimezone()) {
      return "".concat(PbxDateTime.serverTimezone, " (UTC").concat(offset, ")");
    }

    return "UTC".concat(offset);
  },

  /**
   * Short label for the browser timezone, e.g. "Asia/Bangkok (UTC+07:00)".
   *
   * @returns {string}
   */
  getBrowserTzLabel: function getBrowserTzLabel() {
    var name = '';

    try {
      name = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {
      name = '';
    }

    var offsetSec = -new Date().getTimezoneOffset() * 60;
    var offset = PbxDateTime.formatOffset(offsetSec);

    if (name) {
      return "".concat(name, " (UTC").concat(offset, ")");
    }

    return "UTC".concat(offset);
  },

  /**
   * Build a tooltip body that shows both server and browser renderings.
   * Newline-separated for use as a native `title="…"` attribute (kept for
   * any caller that wants the plain-text variant).
   *
   * @param {number} timestamp
   * @param {object} [opts]
   * @returns {string}
   */
  buildDualTooltip: function buildDualTooltip(timestamp) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var serverTime = PbxDateTime.formatServerTime(timestamp, opts);
    var browserTime = PbxDateTime.formatBrowserTime(timestamp, opts);
    var serverLabel = PbxDateTime.getServerTzLabel();
    var browserLabel = PbxDateTime.getBrowserTzLabel();
    return "Server: ".concat(serverLabel, "\n").concat(serverTime, "\n\nBrowser: ").concat(browserLabel, "\n").concat(browserTime);
  },

  /**
   * Same as buildDualTooltip but renders an HTML snippet suitable for a
   * Fomantic UI `popup({ html: true })`. Labels are styled with `<small>`
   * and `<b>` so the popup body reads like a key/value table.
   *
   * @param {number} timestamp
   * @param {object} [opts]
   * @returns {string} HTML
   */
  buildDualTooltipHtml: function buildDualTooltipHtml(timestamp) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var serverTime = PbxDateTime.escapeHtml(PbxDateTime.formatServerTime(timestamp, opts));
    var browserTime = PbxDateTime.escapeHtml(PbxDateTime.formatBrowserTime(timestamp, opts));
    var serverLabel = PbxDateTime.escapeHtml(PbxDateTime.getServerTzLabel());
    var browserLabel = PbxDateTime.escapeHtml(PbxDateTime.getBrowserTzLabel());
    return '<div class="pbx-datetime-tooltip">' + "<div><small>Server \xB7 ".concat(serverLabel, "</small></div>") + "<div><b>".concat(serverTime, "</b></div>") + '<div style="height:4px"></div>' + "<div><small>Browser \xB7 ".concat(browserLabel, "</small></div>") + "<div>".concat(browserTime, "</div>") + '</div>';
  },
  escapeHtml: function escapeHtml(s) {
    if (s === null || s === undefined) {
      return '';
    }

    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  // ---- internals ---------------------------------------------------
  formatWithOffset: function formatWithOffset(timestamp, withSeconds) {
    var shifted = new Date((timestamp + PbxDateTime.serverTimezoneOffset) * 1000);
    var yyyy = shifted.getUTCFullYear();
    var mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    var dd = String(shifted.getUTCDate()).padStart(2, '0');
    var hh = String(shifted.getUTCHours()).padStart(2, '0');
    var mi = String(shifted.getUTCMinutes()).padStart(2, '0');

    if (!withSeconds) {
      return "".concat(yyyy, "-").concat(mm, "-").concat(dd, " ").concat(hh, ":").concat(mi);
    }

    var ss = String(shifted.getUTCSeconds()).padStart(2, '0');
    return "".concat(yyyy, "-").concat(mm, "-").concat(dd, " ").concat(hh, ":").concat(mi, ":").concat(ss);
  },
  partsToIso: function partsToIso(parts, withSeconds) {
    var lookup = {};
    parts.forEach(function (p) {
      lookup[p.type] = p.value;
    });
    var base = "".concat(lookup.year, "-").concat(lookup.month, "-").concat(lookup.day, " ").concat(lookup.hour, ":").concat(lookup.minute);

    if (!withSeconds) {
      return base;
    }

    return "".concat(base, ":").concat(lookup.second || '00');
  },
  formatOffset: function formatOffset(offsetSec) {
    var sign = offsetSec >= 0 ? '+' : '-';
    var abs = Math.abs(offsetSec);
    var hh = String(Math.floor(abs / 3600)).padStart(2, '0');
    var mm = String(Math.floor(abs % 3600 / 60)).padStart(2, '0');
    return "".concat(sign).concat(hh, ":").concat(mm);
  }
};
window.PbxDateTime = PbxDateTime;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieC1kYXRldGltZS5qcyJdLCJuYW1lcyI6WyJQYnhEYXRlVGltZSIsInNlcnZlclRpbWV6b25lIiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJzZXJ2ZXJOb3ciLCJzZXJ2ZXJOb3dSZWNlaXZlZEF0Iiwic2V0U2VydmVyTWV0YSIsIm1ldGEiLCJzZXJ2ZXJfdGltZXpvbmUiLCJsZW5ndGgiLCJzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0Iiwic2VydmVyX25vdyIsInRlc3QiLCJEYXRlIiwibm93Iiwic2VydmVyTm93TW9tZW50IiwibW9tZW50IiwiaXNWYWxpZCIsImFkZCIsImhhc1NlcnZlclRpbWV6b25lIiwiSW50bCIsInBhcnRzIiwiRGF0ZVRpbWVGb3JtYXQiLCJ0aW1lWm9uZSIsInllYXIiLCJtb250aCIsImRheSIsImZvcm1hdFRvUGFydHMiLCJsb29rdXAiLCJmb3JFYWNoIiwicCIsInR5cGUiLCJ2YWx1ZSIsInRvZGF5IiwiZSIsImZvcm1hdFNlcnZlclRpbWUiLCJ0aW1lc3RhbXAiLCJvcHRzIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJ3aXRoU2Vjb25kcyIsImRhdGUiLCJmbXRPcHRzIiwiaG91ciIsIm1pbnV0ZSIsImhvdXIxMiIsInNlY29uZCIsInBhcnRzVG9Jc28iLCJmb3JtYXRXaXRoT2Zmc2V0IiwiZm9ybWF0QnJvd3NlclRpbWUiLCJkIiwieXl5eSIsImdldEZ1bGxZZWFyIiwibW0iLCJTdHJpbmciLCJnZXRNb250aCIsInBhZFN0YXJ0IiwiZGQiLCJnZXREYXRlIiwiaGgiLCJnZXRIb3VycyIsIm1pIiwiZ2V0TWludXRlcyIsInNzIiwiZ2V0U2Vjb25kcyIsImZvcm1hdFNlcnZlckRhdGVTdHJpbmciLCJzZXJ2ZXJTdHIiLCJyZXBsYWNlIiwic2xpY2UiLCJzZXJ2ZXJTdHJpbmdUb1RpbWVzdGFtcCIsIm1hdGNoIiwibWFwIiwieSIsIm1vIiwiaCIsInMiLCJ1dGNNcyIsIlVUQyIsIk1hdGgiLCJmbG9vciIsImdldFNlcnZlclR6TGFiZWwiLCJvZmZzZXQiLCJmb3JtYXRPZmZzZXQiLCJnZXRCcm93c2VyVHpMYWJlbCIsIm5hbWUiLCJyZXNvbHZlZE9wdGlvbnMiLCJvZmZzZXRTZWMiLCJnZXRUaW1lem9uZU9mZnNldCIsImJ1aWxkRHVhbFRvb2x0aXAiLCJzZXJ2ZXJUaW1lIiwiYnJvd3NlclRpbWUiLCJzZXJ2ZXJMYWJlbCIsImJyb3dzZXJMYWJlbCIsImJ1aWxkRHVhbFRvb2x0aXBIdG1sIiwiZXNjYXBlSHRtbCIsInVuZGVmaW5lZCIsInNoaWZ0ZWQiLCJnZXRVVENGdWxsWWVhciIsImdldFVUQ01vbnRoIiwiZ2V0VVRDRGF0ZSIsImdldFVUQ0hvdXJzIiwiZ2V0VVRDTWludXRlcyIsImdldFVUQ1NlY29uZHMiLCJiYXNlIiwic2lnbiIsImFicyIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNoQkMsRUFBQUEsY0FBYyxFQUFFLElBREE7QUFFaEJDLEVBQUFBLG9CQUFvQixFQUFFLENBRk47O0FBSWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQVJLO0FBU2hCQyxFQUFBQSxtQkFBbUIsRUFBRSxDQVRMOztBQVdoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFwQmdCLHlCQW9CRkMsSUFwQkUsRUFvQkk7QUFDaEIsUUFBSSxDQUFDQSxJQUFMLEVBQVc7QUFDUDtBQUNIOztBQUNELFFBQUksT0FBT0EsSUFBSSxDQUFDQyxlQUFaLEtBQWdDLFFBQWhDLElBQTRDRCxJQUFJLENBQUNDLGVBQUws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UTtBQUNwQixRQUFNa0IsSUFBSSxHQUFHbEIsU0FBUyxJQUFJLENBQWIsR0FBaUIsR0FBakIsR0FBdUIsR0FBcEM7QUFDQSxRQUFNbUIsR0FBRyxHQUFHM0IsSUFBSSxDQUFDMkIsR0FBTCxDQUFTbkIsU0FBVCxDQUFaO0FBQ0EsUUFBTTNCLEVBQUUsR0FBR0wsTUFBTSxDQUFDd0IsSUFBSSxDQUFDQyxLQUFMLENBQVcwQixHQUFHLEdBQUcsSUFBakIsQ0FBRCxDQUFOLENBQStCakQsUUFBL0IsQ0FBd0MsQ0FBeEMsRUFBMkMsR0FBM0MsQ0FBWDtBQUNBLFFBQU1ILEVBQUUsR0FBR0MsTUFBTSxDQUFDd0IsSUFBSSxDQUFDQyxLQUFMLENBQVkwQixHQUFHLEdBQUcsSUFBUCxHQUFlLEVBQTFCLENBQUQsQ0FBTixDQUFzQ2pELFFBQXRDLENBQStDLENBQS9DLEVBQWtELEdBQWxELENBQVg7QUFDQSxxQkFBVWdELElBQVYsU0FBaUI3QyxFQUFqQixjQUF1Qk4sRUFBdkI7QUFDSDtBQXBUZSxDQUFwQjtBQXVUQXFELE1BQU0sQ0FBQ3pHLFdBQVAsR0FBcUJBLFdBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjYgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIEludGwsIG1vbWVudCAqL1xuXG4vKipcbiAqIEdsb2JhbCBkYXRlL3RpbWUgZm9ybWF0dGVyIHRoYXQgcmVuZGVycyB0aW1lc3RhbXBzIGluIHRoZSBQQlggc2VydmVyXG4gKiB0aW1lem9uZSByZWdhcmRsZXNzIG9mIHRoZSBicm93c2VyJ3MgbG9jYWwgdGltZXpvbmUuXG4gKlxuICogQmFja2VuZCBlbmRwb2ludHMgcGxhY2UgVFogbWV0YWRhdGEgdW5kZXIgYGRhdGEuX21ldGFgOlxuICogICB7IHNlcnZlcl90aW1lem9uZTogJ0V1cm9wZS9Nb3Njb3cnLCBzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0OiAxMDgwMCB9XG4gKiBUaGUgbnVtZXJpYyBvZmZzZXQgKHNlY29uZHMpIGlzIGtlcHQgYXMgYSBmYWxsYmFjayBmb3IgY2FsbGVycyB0aGF0XG4gKiBwcmUtZGF0ZSB0aGUgSUFOQS1uYW1lIGZpZWxkLiBVbmNhY2hlZCByZXNwb25zZXMgbWF5IGFkZFxuICogYHNlcnZlcl9ub3c6ICdZWVlZLU1NLUREIEhIOm1tOnNzJ2AsIHRoZSBQQlggd2FsbC1jbG9jayB0aW1lLlxuICpcbiAqIEBtb2R1bGUgUGJ4RGF0ZVRpbWVcbiAqL1xuY29uc3QgUGJ4RGF0ZVRpbWUgPSB7XG4gICAgc2VydmVyVGltZXpvbmU6IG51bGwsXG4gICAgc2VydmVyVGltZXpvbmVPZmZzZXQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBQQlggd2FsbC1jbG9jayB0aW1lIGZyb20gdGhlIGxhc3QgYHNlcnZlcl9ub3dgIGFuZCB0aGUgYnJvd3NlciB0aW1lIGl0IGFycml2ZWQgYXQuXG4gICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAqL1xuICAgIHNlcnZlck5vdzogbnVsbCxcbiAgICBzZXJ2ZXJOb3dSZWNlaXZlZEF0OiAwLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgc2VydmVyIHRpbWV6b25lIG1ldGFkYXRhIHB1Ymxpc2hlZCBpbiBBUEkgcmVzcG9uc2VzLlxuICAgICAqXG4gICAgICogQWNjZXB0cyBlaXRoZXI6XG4gICAgICogIC0gYHsgc2VydmVyX3RpbWV6b25lLCBzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0IH1gIChjYW5vbmljYWwgX21ldGEgZW52ZWxvcGUpXG4gICAgICogIC0gdGhlIG9sZGVyIGBzZXJ2ZXJUaW1lem9uZU9mZnNldGAgbnVtZXJpYyBmaWVsZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R8bnVsbH0gbWV0YVxuICAgICAqL1xuICAgIHNldFNlcnZlck1ldGEobWV0YSkge1xuICAgICAgICBpZiAoIW1ldGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG1ldGEuc2VydmVyX3RpbWV6b25lID09PSAnc3RyaW5nJyAmJiBtZXRhLnNlcnZlcl90aW1lem9uZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZSA9IG1ldGEuc2VydmVyX3RpbWV6b25lO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgbWV0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSBtZXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBtZXRhLnNlcnZlcl9ub3cgPT09ICdzdHJpbmcnICYmIC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0gXFxkezJ9OlxcZHsyfTpcXGR7Mn0kLy50ZXN0KG1ldGEuc2VydmVyX25vdykpIHtcbiAgICAgICAgICAgIFBieERhdGVUaW1lLnNlcnZlck5vdyA9IG1ldGEuc2VydmVyX25vdztcbiAgICAgICAgICAgIFBieERhdGVUaW1lLnNlcnZlck5vd1JlY2VpdmVkQXQgPSBEYXRlLm5vdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgUEJYIHdhbGwtY2xvY2sgdGltZSBhcyBhIG1vbWVudCwgZm9yIGNhbGVuZGFyLWRheSBsb2dpYyBzdWNoIGFzIFwidG9kYXlcIiBpblxuICAgICAqIGRhdGUgcGlja2Vycy4gSXRzIGRhdGUgYW5kIHRpbWUgZmllbGRzIGNhcnJ5IHRoZSBQQlggdGltZTsgdGhlIGluc3RhbnQgaXQgcmVwcmVzZW50c1xuICAgICAqIGluIHRoZSBicm93c2VyIHRpbWV6b25lIGlzIG1lYW5pbmdsZXNzLlxuICAgICAqXG4gICAgICogUHJlZmVycyBgc2VydmVyX25vd2AgKGluZGVwZW5kZW50IG9mIGEgd3JvbmcgYnJvd3NlciBjbG9jayksIHRoZW4gdGhlIHNlcnZlciB0aW1lem9uZVxuICAgICAqIChkYXRlIG9ubHk6IHNvbWUgYnJvd3NlcnMgcHJpbnQgbWlkbmlnaHQgYXMgaG91ciAyNCksIHRoZW4gdGhlIGJyb3dzZXIgdGltZS5cbiAgICAgKiBSZXF1aXJlcyBtb21lbnQgb24gdGhlIHBhZ2UuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bW9tZW50Lk1vbWVudH1cbiAgICAgKi9cbiAgICBzZXJ2ZXJOb3dNb21lbnQoKSB7XG4gICAgICAgIGlmIChQYnhEYXRlVGltZS5zZXJ2ZXJOb3cpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vdyA9IG1vbWVudChQYnhEYXRlVGltZS5zZXJ2ZXJOb3csICdZWVlZLU1NLUREIEhIOm1tOnNzJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAobm93LmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub3cuYWRkKERhdGUubm93KCkgLSBQYnhEYXRlVGltZS5zZXJ2ZXJOb3dSZWNlaXZlZEF0LCAnbXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoUGJ4RGF0ZVRpbWUuaGFzU2VydmVyVGltZXpvbmUoKSAmJiB0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgnZW4tQ0EnLCB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVab25lOiBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZSxcbiAgICAgICAgICAgICAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgICAgICBtb250aDogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICBkYXk6ICcyLWRpZ2l0JyxcbiAgICAgICAgICAgICAgICB9KS5mb3JtYXRUb1BhcnRzKG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvb2t1cCA9IHt9O1xuICAgICAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbG9va3VwW3AudHlwZV0gPSBwLnZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KGAke2xvb2t1cC55ZWFyfS0ke2xvb2t1cC5tb250aH0tJHtsb29rdXAuZGF5fWAsICdZWVlZLU1NLUREJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRvZGF5LmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9kYXk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIEZhbGwgdGhyb3VnaCB0byB0aGUgYnJvd3NlciB0aW1lXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1vbWVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIElBTkEtYmFzZWQgZm9ybWF0dGluZyBpcyBhdmFpbGFibGUgKHByZWZlcnJlZCkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNTZXJ2ZXJUaW1lem9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZSA9PT0gJ3N0cmluZycgJiYgUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmUubGVuZ3RoID4gMDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGEgdW5peCB0aW1lc3RhbXAgYXMgYSBkYXRlL3RpbWUgc3RyaW5nIHJlbmRlcmVkIGluIHNlcnZlciBUWi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBzZWNvbmRzIHNpbmNlIGVwb2NoXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRzXVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdHMud2l0aFNlY29uZHM9ZmFsc2VdXG4gICAgICogQHJldHVybnMge3N0cmluZ30gYFlZWVktTU0tREQgSEg6TU1bOlNTXWBcbiAgICAgKi9cbiAgICBmb3JtYXRTZXJ2ZXJUaW1lKHRpbWVzdGFtcCwgb3B0cyA9IHt9KSB7XG4gICAgICAgIGlmICghTnVtYmVyLmlzRmluaXRlKHRpbWVzdGFtcCkpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3aXRoU2Vjb25kcyA9IG9wdHMud2l0aFNlY29uZHMgPT09IHRydWU7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcblxuICAgICAgICBpZiAoUGJ4RGF0ZVRpbWUuaGFzU2VydmVyVGltZXpvbmUoKSAmJiB0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm10T3B0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGltZVpvbmU6IFBieERhdGVUaW1lLnNlcnZlclRpbWV6b25lLFxuICAgICAgICAgICAgICAgICAgICB5ZWFyOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoOiAnMi1kaWdpdCcsXG4gICAgICAgICAgICAgICAgICAgIGRheTogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICBob3VyOiAnMi1kaWdpdCcsXG4gICAgICAgICAgICAgICAgICAgIG1pbnV0ZTogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICBob3VyMTI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHdpdGhTZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZtdE9wdHMuc2Vjb25kID0gJzItZGlnaXQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KCdlbi1DQScsIGZtdE9wdHMpLmZvcm1hdFRvUGFydHMoZGF0ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBieERhdGVUaW1lLnBhcnRzVG9Jc28ocGFydHMsIHdpdGhTZWNvbmRzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsIHRocm91Z2ggdG8gb2Zmc2V0LWJhc2VkIHBhdGhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQYnhEYXRlVGltZS5mb3JtYXRXaXRoT2Zmc2V0KHRpbWVzdGFtcCwgd2l0aFNlY29uZHMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgYSB1bml4IHRpbWVzdGFtcCBpbiB0aGUgYnJvd3NlcidzIGxvY2FsIFRaLiBVc2VkIGZvciB0aGVcbiAgICAgKiBcInlvdXIgdGltZVwiIGhhbGYgb2YgdG9vbHRpcHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gc2Vjb25kcyBzaW5jZSBlcG9jaFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRzLndpdGhTZWNvbmRzPWZhbHNlXVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9ybWF0QnJvd3NlclRpbWUodGltZXN0YW1wLCBvcHRzID0ge30pIHtcbiAgICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUodGltZXN0YW1wKSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdpdGhTZWNvbmRzID0gb3B0cy53aXRoU2Vjb25kcyA9PT0gdHJ1ZTtcbiAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICBjb25zdCB5eXl5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBkZCA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgaGggPSBTdHJpbmcoZC5nZXRIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtaSA9IFN0cmluZyhkLmdldE1pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgaWYgKCF3aXRoU2Vjb25kcykge1xuICAgICAgICAgICAgcmV0dXJuIGAke3l5eXl9LSR7bW19LSR7ZGR9ICR7aGh9OiR7bWl9YDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzcyA9IFN0cmluZyhkLmdldFNlY29uZHMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgcmV0dXJuIGAke3l5eXl9LSR7bW19LSR7ZGR9ICR7aGh9OiR7bWl9OiR7c3N9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGEgc2VydmVyLXN1cHBsaWVkIFwiWS1tLWQgSDppOnNcIiBzdHJpbmcgKGFscmVhZHkgaW4gc2VydmVyIFRaKS5cbiAgICAgKiBVc2VkIGZvciBmaWVsZHMgdGhhdCB0aGUgYmFja2VuZCBzZXJpYWxpc2VzIGFzIGEgc3RyaW5nIGluc3RlYWQgb2ZcbiAgICAgKiBhIHVuaXggdGltZXN0YW1wIChlLmcuIFBhc3NrZXlzLmxhc3RfdXNlZF9hdCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmVyU3RyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHNhbWUgc3RyaW5nLCBub3JtYWxpc2VkIOKAlCBhbmQgXCJcIiBmb3IgZW1wdHkgaW5wdXQuXG4gICAgICovXG4gICAgZm9ybWF0U2VydmVyRGF0ZVN0cmluZyhzZXJ2ZXJTdHIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXJ2ZXJTdHIgIT09ICdzdHJpbmcnIHx8IHNlcnZlclN0ci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VydmVyU3RyLnJlcGxhY2UoJ1QnLCAnICcpLnNsaWNlKDAsIDE5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBhIHNlcnZlci1zdXBwbGllZCBcIlktbS1kIEg6aTpzXCIgc3RyaW5nIHRvIGEgdW5peCB0aW1lc3RhbXAsXG4gICAgICogaW50ZXJwcmV0aW5nIHRoZSBpbnB1dCBhcyBhbHJlYWR5LWluLXNlcnZlci1UWi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2ZXJTdHJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfG51bGx9IFVuaXggdGltZXN0YW1wIChzZWNvbmRzKSBvciBudWxsIG9uIHBhcnNlIGZhaWx1cmUuXG4gICAgICovXG4gICAgc2VydmVyU3RyaW5nVG9UaW1lc3RhbXAoc2VydmVyU3RyKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VydmVyU3RyICE9PSAnc3RyaW5nJyB8fCBzZXJ2ZXJTdHIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHNlcnZlclN0ci5tYXRjaCgvXihcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pWyBUXShcXGR7Mn0pOihcXGR7Mn0pOihcXGR7Mn0pLyk7XG4gICAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFssIHksIG1vLCBkLCBoLCBtaSwgc10gPSBtYXRjaC5tYXAoTnVtYmVyKTtcbiAgICAgICAgY29uc3QgdXRjTXMgPSBEYXRlLlVUQyh5LCBtbyAtIDEsIGQsIGgsIG1pLCBzKTtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IodXRjTXMgLyAxMDAwKSAtIFBieERhdGVUaW1lLnNlcnZlclRpbWV6b25lT2Zmc2V0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG9ydCBsYWJlbCBmb3IgdGhlIHNlcnZlciB0aW1lem9uZSwgZS5nLiBcIkV1cm9wZS9Nb3Njb3cgKFVUQyswMzowMClcIi5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0U2VydmVyVHpMYWJlbCgpIHtcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gUGJ4RGF0ZVRpbWUuZm9ybWF0T2Zmc2V0KFBieERhdGVUaW1lLnNlcnZlclRpbWV6b25lT2Zmc2V0KTtcbiAgICAgICAgaWYgKFBieERhdGVUaW1lLmhhc1NlcnZlclRpbWV6b25lKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZX0gKFVUQyR7b2Zmc2V0fSlgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgVVRDJHtvZmZzZXR9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvcnQgbGFiZWwgZm9yIHRoZSBicm93c2VyIHRpbWV6b25lLCBlLmcuIFwiQXNpYS9CYW5na29rIChVVEMrMDc6MDApXCIuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldEJyb3dzZXJUekxhYmVsKCkge1xuICAgICAgICBsZXQgbmFtZSA9ICcnO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbmFtZSA9IEludGwuRGF0ZVRpbWVGb3JtYXQoKS5yZXNvbHZlZE9wdGlvbnMoKS50aW1lWm9uZSB8fCAnJztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbmFtZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9mZnNldFNlYyA9IC1uZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDtcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gUGJ4RGF0ZVRpbWUuZm9ybWF0T2Zmc2V0KG9mZnNldFNlYyk7XG4gICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bmFtZX0gKFVUQyR7b2Zmc2V0fSlgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgVVRDJHtvZmZzZXR9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYSB0b29sdGlwIGJvZHkgdGhhdCBzaG93cyBib3RoIHNlcnZlciBhbmQgYnJvd3NlciByZW5kZXJpbmdzLlxuICAgICAqIE5ld2xpbmUtc2VwYXJhdGVkIGZvciB1c2UgYXMgYSBuYXRpdmUgYHRpdGxlPVwi4oCmXCJgIGF0dHJpYnV0ZSAoa2VwdCBmb3JcbiAgICAgKiBhbnkgY2FsbGVyIHRoYXQgd2FudHMgdGhlIHBsYWluLXRleHQgdmFyaWFudCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRzXVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgYnVpbGREdWFsVG9vbHRpcCh0aW1lc3RhbXAsIG9wdHMgPSB7fSkge1xuICAgICAgICBjb25zdCBzZXJ2ZXJUaW1lID0gUGJ4RGF0ZVRpbWUuZm9ybWF0U2VydmVyVGltZSh0aW1lc3RhbXAsIG9wdHMpO1xuICAgICAgICBjb25zdCBicm93c2VyVGltZSA9IFBieERhdGVUaW1lLmZvcm1hdEJyb3dzZXJUaW1lKHRpbWVzdGFtcCwgb3B0cyk7XG4gICAgICAgIGNvbnN0IHNlcnZlckxhYmVsID0gUGJ4RGF0ZVRpbWUuZ2V0U2VydmVyVHpMYWJlbCgpO1xuICAgICAgICBjb25zdCBicm93c2VyTGFiZWwgPSBQYnhEYXRlVGltZS5nZXRCcm93c2VyVHpMYWJlbCgpO1xuICAgICAgICByZXR1cm4gYFNlcnZlcjogJHtzZXJ2ZXJMYWJlbH1cXG4ke3NlcnZlclRpbWV9XFxuXFxuQnJvd3NlcjogJHticm93c2VyTGFiZWx9XFxuJHticm93c2VyVGltZX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYW1lIGFzIGJ1aWxkRHVhbFRvb2x0aXAgYnV0IHJlbmRlcnMgYW4gSFRNTCBzbmlwcGV0IHN1aXRhYmxlIGZvciBhXG4gICAgICogRm9tYW50aWMgVUkgYHBvcHVwKHsgaHRtbDogdHJ1ZSB9KWAuIExhYmVscyBhcmUgc3R5bGVkIHdpdGggYDxzbWFsbD5gXG4gICAgICogYW5kIGA8Yj5gIHNvIHRoZSBwb3B1cCBib2R5IHJlYWRzIGxpa2UgYSBrZXkvdmFsdWUgdGFibGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRzXVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUxcbiAgICAgKi9cbiAgICBidWlsZER1YWxUb29sdGlwSHRtbCh0aW1lc3RhbXAsIG9wdHMgPSB7fSkge1xuICAgICAgICBjb25zdCBzZXJ2ZXJUaW1lID0gUGJ4RGF0ZVRpbWUuZXNjYXBlSHRtbChQYnhEYXRlVGltZS5mb3JtYXRTZXJ2ZXJUaW1lKHRpbWVzdGFtcCwgb3B0cykpO1xuICAgICAgICBjb25zdCBicm93c2VyVGltZSA9IFBieERhdGVUaW1lLmVzY2FwZUh0bWwoUGJ4RGF0ZVRpbWUuZm9ybWF0QnJvd3NlclRpbWUodGltZXN0YW1wLCBvcHRzKSk7XG4gICAgICAgIGNvbnN0IHNlcnZlckxhYmVsID0gUGJ4RGF0ZVRpbWUuZXNjYXBlSHRtbChQYnhEYXRlVGltZS5nZXRTZXJ2ZXJUekxhYmVsKCkpO1xuICAgICAgICBjb25zdCBicm93c2VyTGFiZWwgPSBQYnhEYXRlVGltZS5lc2NhcGVIdG1sKFBieERhdGVUaW1lLmdldEJyb3dzZXJUekxhYmVsKCkpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwYngtZGF0ZXRpbWUtdG9vbHRpcFwiPidcbiAgICAgICAgICAgICsgYDxkaXY+PHNtYWxsPlNlcnZlciDCtyAke3NlcnZlckxhYmVsfTwvc21hbGw+PC9kaXY+YFxuICAgICAgICAgICAgKyBgPGRpdj48Yj4ke3NlcnZlclRpbWV9PC9iPjwvZGl2PmBcbiAgICAgICAgICAgICsgJzxkaXYgc3R5bGU9XCJoZWlnaHQ6NHB4XCI+PC9kaXY+J1xuICAgICAgICAgICAgKyBgPGRpdj48c21hbGw+QnJvd3NlciDCtyAke2Jyb3dzZXJMYWJlbH08L3NtYWxsPjwvZGl2PmBcbiAgICAgICAgICAgICsgYDxkaXY+JHticm93c2VyVGltZX08L2Rpdj5gXG4gICAgICAgICAgICArICc8L2Rpdj4nXG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIGVzY2FwZUh0bWwocykge1xuICAgICAgICBpZiAocyA9PT0gbnVsbCB8fCBzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nKHMpXG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7Jyk7XG4gICAgfSxcblxuICAgIC8vIC0tLS0gaW50ZXJuYWxzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgZm9ybWF0V2l0aE9mZnNldCh0aW1lc3RhbXAsIHdpdGhTZWNvbmRzKSB7XG4gICAgICAgIGNvbnN0IHNoaWZ0ZWQgPSBuZXcgRGF0ZSgodGltZXN0YW1wICsgUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmVPZmZzZXQpICogMTAwMCk7XG4gICAgICAgIGNvbnN0IHl5eXkgPSBzaGlmdGVkLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKHNoaWZ0ZWQuZ2V0VVRDTW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKHNoaWZ0ZWQuZ2V0VVRDRGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBoaCA9IFN0cmluZyhzaGlmdGVkLmdldFVUQ0hvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pID0gU3RyaW5nKHNoaWZ0ZWQuZ2V0VVRDTWludXRlcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBpZiAoIXdpdGhTZWNvbmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7eXl5eX0tJHttbX0tJHtkZH0gJHtoaH06JHttaX1gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNzID0gU3RyaW5nKHNoaWZ0ZWQuZ2V0VVRDU2Vjb25kcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICByZXR1cm4gYCR7eXl5eX0tJHttbX0tJHtkZH0gJHtoaH06JHttaX06JHtzc31gO1xuICAgIH0sXG5cbiAgICBwYXJ0c1RvSXNvKHBhcnRzLCB3aXRoU2Vjb25kcykge1xuICAgICAgICBjb25zdCBsb29rdXAgPSB7fTtcbiAgICAgICAgcGFydHMuZm9yRWFjaCgocCkgPT4ge1xuICAgICAgICAgICAgbG9va3VwW3AudHlwZV0gPSBwLnZhbHVlO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgYmFzZSA9IGAke2xvb2t1cC55ZWFyfS0ke2xvb2t1cC5tb250aH0tJHtsb29rdXAuZGF5fSAke2xvb2t1cC5ob3VyfToke2xvb2t1cC5taW51dGV9YDtcbiAgICAgICAgaWYgKCF3aXRoU2Vjb25kcykge1xuICAgICAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke2Jhc2V9OiR7bG9va3VwLnNlY29uZCB8fCAnMDAnfWA7XG4gICAgfSxcblxuICAgIGZvcm1hdE9mZnNldChvZmZzZXRTZWMpIHtcbiAgICAgICAgY29uc3Qgc2lnbiA9IG9mZnNldFNlYyA+PSAwID8gJysnIDogJy0nO1xuICAgICAgICBjb25zdCBhYnMgPSBNYXRoLmFicyhvZmZzZXRTZWMpO1xuICAgICAgICBjb25zdCBoaCA9IFN0cmluZyhNYXRoLmZsb29yKGFicyAvIDM2MDApKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhNYXRoLmZsb29yKChhYnMgJSAzNjAwKSAvIDYwKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgcmV0dXJuIGAke3NpZ259JHtoaH06JHttbX1gO1xuICAgIH0sXG59O1xuXG53aW5kb3cuUGJ4RGF0ZVRpbWUgPSBQYnhEYXRlVGltZTtcbiJdfQ==