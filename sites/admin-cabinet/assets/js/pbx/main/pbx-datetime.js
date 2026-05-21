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

/* global Intl */

/**
 * Global date/time formatter that renders timestamps in the PBX server
 * timezone regardless of the browser's local timezone.
 *
 * Backend endpoints place TZ metadata under `data._meta`:
 *   { server_timezone: 'Europe/Moscow', server_timezone_offset: 10800 }
 * The numeric offset (seconds) is kept as a fallback for callers that
 * pre-date the IANA-name field.
 *
 * @module PbxDateTime
 */
var PbxDateTime = {
  serverTimezone: null,
  serverTimezoneOffset: 0,

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieC1kYXRldGltZS5qcyJdLCJuYW1lcyI6WyJQYnhEYXRlVGltZSIsInNlcnZlclRpbWV6b25lIiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJzZXRTZXJ2ZXJNZXRhIiwibWV0YSIsInNlcnZlcl90aW1lem9uZSIsImxlbmd0aCIsInNlcnZlcl90aW1lem9uZV9vZmZzZXQiLCJoYXNTZXJ2ZXJUaW1lem9uZSIsImZvcm1hdFNlcnZlclRpbWUiLCJ0aW1lc3RhbXAiLCJvcHRzIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJ3aXRoU2Vjb25kcyIsImRhdGUiLCJEYXRlIiwiSW50bCIsImZtdE9wdHMiLCJ0aW1lWm9uZSIsInllYXIiLCJtb250aCIsImRheSIsImhvdXIiLCJtaW51dGUiLCJob3VyMTIiLCJzZWNvbmQiLCJwYXJ0cyIsIkRhdGVUaW1lRm9ybWF0IiwiZm9ybWF0VG9QYXJ0cyIsInBhcnRzVG9Jc28iLCJlIiwiZm9ybWF0V2l0aE9mZnNldCIsImZvcm1hdEJyb3dzZXJUaW1lIiwiZCIsInl5eXkiLCJnZXRGdWxsWWVhciIsIm1tIiwiU3RyaW5nIiwiZ2V0TW9udGgiLCJwYWRTdGFydCIsImRkIiwiZ2V0RGF0ZSIsImhoIiwiZ2V0SG91cnMiLCJtaSIsImdldE1pbnV0ZXMiLCJzcyIsImdldFNlY29uZHMiLCJmb3JtYXRTZXJ2ZXJEYXRlU3RyaW5nIiwic2VydmVyU3RyIiwicmVwbGFjZSIsInNsaWNlIiwic2VydmVyU3RyaW5nVG9UaW1lc3RhbXAiLCJtYXRjaCIsIm1hcCIsInkiLCJtbyIsImgiLCJzIiwidXRjTXMiLCJVVEMiLCJNYXRoIiwiZmxvb3IiLCJnZXRTZXJ2ZXJUekxhYmVsIiwib2Zmc2V0IiwiZm9ybWF0T2Zmc2V0IiwiZ2V0QnJvd3NlclR6TGFiZWwiLCJuYW1lIiwicmVzb2x2ZWRPcHRpb25zIiwib2Zmc2V0U2VjIiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJidWlsZER1YWxUb29sdGlwIiwic2VydmVyVGltZSIsImJyb3dzZXJUaW1lIiwic2VydmVyTGFiZWwiLCJicm93c2VyTGFiZWwiLCJidWlsZER1YWxUb29sdGlwSHRtbCIsImVzY2FwZUh0bWwiLCJ1bmRlZmluZWQiLCJzaGlmdGVkIiwiZ2V0VVRDRnVsbFllYXIiLCJnZXRVVENNb250aCIsImdldFVUQ0RhdGUiLCJnZXRVVENIb3VycyIsImdldFVUQ01pbnV0ZXMiLCJnZXRVVENTZWNvbmRzIiwibG9va3VwIiwiZm9yRWFjaCIsInAiLCJ0eXBlIiwidmFsdWUiLCJiYXNlIiwic2lnbiIsImFicyIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFDaEJDLEVBQUFBLGNBQWMsRUFBRSxJQURBO0FBRWhCQyxFQUFBQSxvQkFBb0IsRUFBRSxDQUZOOztBQUloQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFiZ0IseUJBYUZDLElBYkUsRUFhSTtBQUNoQixRQUFJLENBQUNBLElBQUwsRUFBVztBQUNQO0FBQ0g7O0FBQ0QsUUFBSSxPQUFPQSxJQUFJLENBQUNDLGVBQVosS0FBZ0MsUUFBaEMsSUFBNENELElBQUksQ0FBQ0MsZUFBTCxDQUFxQkMsTUFBckIsR0FBOEIsQ0FBOUUsRUFBaUY7QUFDN0VOLE1BQUFBLFdBQVcsQ0FBQ0MsY0FBWixHQUE2QkcsSUFBSSxDQUFDQyxlQUFsQztBQUNIOztBQUNELFFBQUksT0FBT0QsSUFBSSxDQUFDRyxzQkFBWixLQUF1QyxRQUEzQyxFQUFxRDtBQUNqRFAsTUFBQUEsV0FBVyxDQUFDRSxvQkFBWixHQUFtQ0UsSUFBSSxDQUFDRyxzQkFBeEM7QUFD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RkQ7QUFHQSxRQUFNQyxJQUFJLGFBQU1MLE1BQU0sQ0FBQ25FLElBQWIsY0FBcUJtRSxNQUFNLENBQUNsRSxLQUE1QixjQUFxQ2tFLE1BQU0sQ0FBQ2pFLEdBQTVDLGNBQW1EaUUsTUFBTSxDQUFDaEUsSUFBMUQsY0FBa0VnRSxNQUFNLENBQUMvRCxNQUF6RSxDQUFWOztBQUNBLFFBQUksQ0FBQ1YsV0FBTCxFQUFrQjtBQUNkLGFBQU84RSxJQUFQO0FBQ0g7O0FBQ0QscUJBQVVBLElBQVYsY0FBa0JMLE1BQU0sQ0FBQzdELE1BQVAsSUFBaUIsSUFBbkM7QUFDSCxHQXhQZTtBQTBQaEJ3QyxFQUFBQSxZQTFQZ0Isd0JBMFBISSxTQTFQRyxFQTBQUTtBQUNwQixRQUFNdUIsSUFBSSxHQUFHdkIsU0FBUyxJQUFJLENBQWIsR0FBaUIsR0FBakIsR0FBdUIsR0FBcEM7QUFDQSxRQUFNd0IsR0FBRyxHQUFHaEMsSUFBSSxDQUFDZ0MsR0FBTCxDQUFTeEIsU0FBVCxDQUFaO0FBQ0EsUUFBTTNCLEVBQUUsR0FBR0wsTUFBTSxDQUFDd0IsSUFBSSxDQUFDQyxLQUFMLENBQVcrQixHQUFHLEdBQUcsSUFBakIsQ0FBRCxDQUFOLENBQStCdEQsUUFBL0IsQ0FBd0MsQ0FBeEMsRUFBMkMsR0FBM0MsQ0FBWDtBQUNBLFFBQU1ILEVBQUUsR0FBR0MsTUFBTSxDQUFDd0IsSUFBSSxDQUFDQyxLQUFMLENBQVkrQixHQUFHLEdBQUcsSUFBUCxHQUFlLEVBQTFCLENBQUQsQ0FBTixDQUFzQ3RELFFBQXRDLENBQStDLENBQS9DLEVBQWtELEdBQWxELENBQVg7QUFDQSxxQkFBVXFELElBQVYsU0FBaUJsRCxFQUFqQixjQUF1Qk4sRUFBdkI7QUFDSDtBQWhRZSxDQUFwQjtBQW1RQTBELE1BQU0sQ0FBQy9GLFdBQVAsR0FBcUJBLFdBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjYgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIEludGwgKi9cblxuLyoqXG4gKiBHbG9iYWwgZGF0ZS90aW1lIGZvcm1hdHRlciB0aGF0IHJlbmRlcnMgdGltZXN0YW1wcyBpbiB0aGUgUEJYIHNlcnZlclxuICogdGltZXpvbmUgcmVnYXJkbGVzcyBvZiB0aGUgYnJvd3NlcidzIGxvY2FsIHRpbWV6b25lLlxuICpcbiAqIEJhY2tlbmQgZW5kcG9pbnRzIHBsYWNlIFRaIG1ldGFkYXRhIHVuZGVyIGBkYXRhLl9tZXRhYDpcbiAqICAgeyBzZXJ2ZXJfdGltZXpvbmU6ICdFdXJvcGUvTW9zY293Jywgc2VydmVyX3RpbWV6b25lX29mZnNldDogMTA4MDAgfVxuICogVGhlIG51bWVyaWMgb2Zmc2V0IChzZWNvbmRzKSBpcyBrZXB0IGFzIGEgZmFsbGJhY2sgZm9yIGNhbGxlcnMgdGhhdFxuICogcHJlLWRhdGUgdGhlIElBTkEtbmFtZSBmaWVsZC5cbiAqXG4gKiBAbW9kdWxlIFBieERhdGVUaW1lXG4gKi9cbmNvbnN0IFBieERhdGVUaW1lID0ge1xuICAgIHNlcnZlclRpbWV6b25lOiBudWxsLFxuICAgIHNlcnZlclRpbWV6b25lT2Zmc2V0OiAwLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgc2VydmVyIHRpbWV6b25lIG1ldGFkYXRhIHB1Ymxpc2hlZCBpbiBBUEkgcmVzcG9uc2VzLlxuICAgICAqXG4gICAgICogQWNjZXB0cyBlaXRoZXI6XG4gICAgICogIC0gYHsgc2VydmVyX3RpbWV6b25lLCBzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0IH1gIChjYW5vbmljYWwgX21ldGEgZW52ZWxvcGUpXG4gICAgICogIC0gdGhlIG9sZGVyIGBzZXJ2ZXJUaW1lem9uZU9mZnNldGAgbnVtZXJpYyBmaWVsZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R8bnVsbH0gbWV0YVxuICAgICAqL1xuICAgIHNldFNlcnZlck1ldGEobWV0YSkge1xuICAgICAgICBpZiAoIW1ldGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG1ldGEuc2VydmVyX3RpbWV6b25lID09PSAnc3RyaW5nJyAmJiBtZXRhLnNlcnZlcl90aW1lem9uZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZSA9IG1ldGEuc2VydmVyX3RpbWV6b25lO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgbWV0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSBtZXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBJQU5BLWJhc2VkIGZvcm1hdHRpbmcgaXMgYXZhaWxhYmxlIChwcmVmZXJyZWQpLlxuICAgICAqXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGFzU2VydmVyVGltZXpvbmUoKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmUgPT09ICdzdHJpbmcnICYmIFBieERhdGVUaW1lLnNlcnZlclRpbWV6b25lLmxlbmd0aCA+IDA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBhIHVuaXggdGltZXN0YW1wIGFzIGEgZGF0ZS90aW1lIHN0cmluZyByZW5kZXJlZCBpbiBzZXJ2ZXIgVFouXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gc2Vjb25kcyBzaW5jZSBlcG9jaFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRzLndpdGhTZWNvbmRzPWZhbHNlXVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IGBZWVlZLU1NLUREIEhIOk1NWzpTU11gXG4gICAgICovXG4gICAgZm9ybWF0U2VydmVyVGltZSh0aW1lc3RhbXAsIG9wdHMgPSB7fSkge1xuICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZSh0aW1lc3RhbXApKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2l0aFNlY29uZHMgPSBvcHRzLndpdGhTZWNvbmRzID09PSB0cnVlO1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodGltZXN0YW1wICogMTAwMCk7XG5cbiAgICAgICAgaWYgKFBieERhdGVUaW1lLmhhc1NlcnZlclRpbWV6b25lKCkgJiYgdHlwZW9mIEludGwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtdE9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVab25lOiBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZSxcbiAgICAgICAgICAgICAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgICAgICBtb250aDogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICBkYXk6ICcyLWRpZ2l0JyxcbiAgICAgICAgICAgICAgICAgICAgaG91cjogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICBtaW51dGU6ICcyLWRpZ2l0JyxcbiAgICAgICAgICAgICAgICAgICAgaG91cjEyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICh3aXRoU2Vjb25kcykge1xuICAgICAgICAgICAgICAgICAgICBmbXRPcHRzLnNlY29uZCA9ICcyLWRpZ2l0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgnZW4tQ0EnLCBmbXRPcHRzKS5mb3JtYXRUb1BhcnRzKGRhdGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhEYXRlVGltZS5wYXJ0c1RvSXNvKHBhcnRzLCB3aXRoU2Vjb25kcyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbCB0aHJvdWdoIHRvIG9mZnNldC1iYXNlZCBwYXRoXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUGJ4RGF0ZVRpbWUuZm9ybWF0V2l0aE9mZnNldCh0aW1lc3RhbXAsIHdpdGhTZWNvbmRzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGEgdW5peCB0aW1lc3RhbXAgaW4gdGhlIGJyb3dzZXIncyBsb2NhbCBUWi4gVXNlZCBmb3IgdGhlXG4gICAgICogXCJ5b3VyIHRpbWVcIiBoYWxmIG9mIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIHNlY29uZHMgc2luY2UgZXBvY2hcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdHNdXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0cy53aXRoU2Vjb25kcz1mYWxzZV1cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZvcm1hdEJyb3dzZXJUaW1lKHRpbWVzdGFtcCwgb3B0cyA9IHt9KSB7XG4gICAgICAgIGlmICghTnVtYmVyLmlzRmluaXRlKHRpbWVzdGFtcCkpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3aXRoU2Vjb25kcyA9IG9wdHMud2l0aFNlY29uZHMgPT09IHRydWU7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgeXl5eSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IGhoID0gU3RyaW5nKGQuZ2V0SG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbWkgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGlmICghd2l0aFNlY29uZHMpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHt5eXl5fS0ke21tfS0ke2RkfSAke2hofToke21pfWA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3MgPSBTdHJpbmcoZC5nZXRTZWNvbmRzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHt5eXl5fS0ke21tfS0ke2RkfSAke2hofToke21pfToke3NzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBhIHNlcnZlci1zdXBwbGllZCBcIlktbS1kIEg6aTpzXCIgc3RyaW5nIChhbHJlYWR5IGluIHNlcnZlciBUWikuXG4gICAgICogVXNlZCBmb3IgZmllbGRzIHRoYXQgdGhlIGJhY2tlbmQgc2VyaWFsaXNlcyBhcyBhIHN0cmluZyBpbnN0ZWFkIG9mXG4gICAgICogYSB1bml4IHRpbWVzdGFtcCAoZS5nLiBQYXNza2V5cy5sYXN0X3VzZWRfYXQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlcnZlclN0clxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBzYW1lIHN0cmluZywgbm9ybWFsaXNlZCDigJQgYW5kIFwiXCIgZm9yIGVtcHR5IGlucHV0LlxuICAgICAqL1xuICAgIGZvcm1hdFNlcnZlckRhdGVTdHJpbmcoc2VydmVyU3RyKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VydmVyU3RyICE9PSAnc3RyaW5nJyB8fCBzZXJ2ZXJTdHIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlcnZlclN0ci5yZXBsYWNlKCdUJywgJyAnKS5zbGljZSgwLCAxOSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYSBzZXJ2ZXItc3VwcGxpZWQgXCJZLW0tZCBIOmk6c1wiIHN0cmluZyB0byBhIHVuaXggdGltZXN0YW1wLFxuICAgICAqIGludGVycHJldGluZyB0aGUgaW5wdXQgYXMgYWxyZWFkeS1pbi1zZXJ2ZXItVFouXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmVyU3RyXG4gICAgICogQHJldHVybnMge251bWJlcnxudWxsfSBVbml4IHRpbWVzdGFtcCAoc2Vjb25kcykgb3IgbnVsbCBvbiBwYXJzZSBmYWlsdXJlLlxuICAgICAqL1xuICAgIHNlcnZlclN0cmluZ1RvVGltZXN0YW1wKHNlcnZlclN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHNlcnZlclN0ciAhPT0gJ3N0cmluZycgfHwgc2VydmVyU3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF0Y2ggPSBzZXJ2ZXJTdHIubWF0Y2goL14oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KVsgVF0oXFxkezJ9KTooXFxkezJ9KTooXFxkezJ9KS8pO1xuICAgICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbLCB5LCBtbywgZCwgaCwgbWksIHNdID0gbWF0Y2gubWFwKE51bWJlcik7XG4gICAgICAgIGNvbnN0IHV0Y01zID0gRGF0ZS5VVEMoeSwgbW8gLSAxLCBkLCBoLCBtaSwgcyk7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHV0Y01zIC8gMTAwMCkgLSBQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZU9mZnNldDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvcnQgbGFiZWwgZm9yIHRoZSBzZXJ2ZXIgdGltZXpvbmUsIGUuZy4gXCJFdXJvcGUvTW9zY293IChVVEMrMDM6MDApXCIuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFNlcnZlclR6TGFiZWwoKSB7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IFBieERhdGVUaW1lLmZvcm1hdE9mZnNldChQYnhEYXRlVGltZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCk7XG4gICAgICAgIGlmIChQYnhEYXRlVGltZS5oYXNTZXJ2ZXJUaW1lem9uZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7UGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmV9IChVVEMke29mZnNldH0pYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYFVUQyR7b2Zmc2V0fWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3J0IGxhYmVsIGZvciB0aGUgYnJvd3NlciB0aW1lem9uZSwgZS5nLiBcIkFzaWEvQmFuZ2tvayAoVVRDKzA3OjAwKVwiLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRCcm93c2VyVHpMYWJlbCgpIHtcbiAgICAgICAgbGV0IG5hbWUgPSAnJztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5hbWUgPSBJbnRsLkRhdGVUaW1lRm9ybWF0KCkucmVzb2x2ZWRPcHRpb25zKCkudGltZVpvbmUgfHwgJyc7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5hbWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvZmZzZXRTZWMgPSAtbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjA7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IFBieERhdGVUaW1lLmZvcm1hdE9mZnNldChvZmZzZXRTZWMpO1xuICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke25hbWV9IChVVEMke29mZnNldH0pYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYFVUQyR7b2Zmc2V0fWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgdG9vbHRpcCBib2R5IHRoYXQgc2hvd3MgYm90aCBzZXJ2ZXIgYW5kIGJyb3dzZXIgcmVuZGVyaW5ncy5cbiAgICAgKiBOZXdsaW5lLXNlcGFyYXRlZCBmb3IgdXNlIGFzIGEgbmF0aXZlIGB0aXRsZT1cIuKAplwiYCBhdHRyaWJ1dGUgKGtlcHQgZm9yXG4gICAgICogYW55IGNhbGxlciB0aGF0IHdhbnRzIHRoZSBwbGFpbi10ZXh0IHZhcmlhbnQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGJ1aWxkRHVhbFRvb2x0aXAodGltZXN0YW1wLCBvcHRzID0ge30pIHtcbiAgICAgICAgY29uc3Qgc2VydmVyVGltZSA9IFBieERhdGVUaW1lLmZvcm1hdFNlcnZlclRpbWUodGltZXN0YW1wLCBvcHRzKTtcbiAgICAgICAgY29uc3QgYnJvd3NlclRpbWUgPSBQYnhEYXRlVGltZS5mb3JtYXRCcm93c2VyVGltZSh0aW1lc3RhbXAsIG9wdHMpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJMYWJlbCA9IFBieERhdGVUaW1lLmdldFNlcnZlclR6TGFiZWwoKTtcbiAgICAgICAgY29uc3QgYnJvd3NlckxhYmVsID0gUGJ4RGF0ZVRpbWUuZ2V0QnJvd3NlclR6TGFiZWwoKTtcbiAgICAgICAgcmV0dXJuIGBTZXJ2ZXI6ICR7c2VydmVyTGFiZWx9XFxuJHtzZXJ2ZXJUaW1lfVxcblxcbkJyb3dzZXI6ICR7YnJvd3NlckxhYmVsfVxcbiR7YnJvd3NlclRpbWV9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FtZSBhcyBidWlsZER1YWxUb29sdGlwIGJ1dCByZW5kZXJzIGFuIEhUTUwgc25pcHBldCBzdWl0YWJsZSBmb3IgYVxuICAgICAqIEZvbWFudGljIFVJIGBwb3B1cCh7IGh0bWw6IHRydWUgfSlgLiBMYWJlbHMgYXJlIHN0eWxlZCB3aXRoIGA8c21hbGw+YFxuICAgICAqIGFuZCBgPGI+YCBzbyB0aGUgcG9wdXAgYm9keSByZWFkcyBsaWtlIGEga2V5L3ZhbHVlIHRhYmxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c11cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MXG4gICAgICovXG4gICAgYnVpbGREdWFsVG9vbHRpcEh0bWwodGltZXN0YW1wLCBvcHRzID0ge30pIHtcbiAgICAgICAgY29uc3Qgc2VydmVyVGltZSA9IFBieERhdGVUaW1lLmVzY2FwZUh0bWwoUGJ4RGF0ZVRpbWUuZm9ybWF0U2VydmVyVGltZSh0aW1lc3RhbXAsIG9wdHMpKTtcbiAgICAgICAgY29uc3QgYnJvd3NlclRpbWUgPSBQYnhEYXRlVGltZS5lc2NhcGVIdG1sKFBieERhdGVUaW1lLmZvcm1hdEJyb3dzZXJUaW1lKHRpbWVzdGFtcCwgb3B0cykpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJMYWJlbCA9IFBieERhdGVUaW1lLmVzY2FwZUh0bWwoUGJ4RGF0ZVRpbWUuZ2V0U2VydmVyVHpMYWJlbCgpKTtcbiAgICAgICAgY29uc3QgYnJvd3NlckxhYmVsID0gUGJ4RGF0ZVRpbWUuZXNjYXBlSHRtbChQYnhEYXRlVGltZS5nZXRCcm93c2VyVHpMYWJlbCgpKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGJ4LWRhdGV0aW1lLXRvb2x0aXBcIj4nXG4gICAgICAgICAgICArIGA8ZGl2PjxzbWFsbD5TZXJ2ZXIgwrcgJHtzZXJ2ZXJMYWJlbH08L3NtYWxsPjwvZGl2PmBcbiAgICAgICAgICAgICsgYDxkaXY+PGI+JHtzZXJ2ZXJUaW1lfTwvYj48L2Rpdj5gXG4gICAgICAgICAgICArICc8ZGl2IHN0eWxlPVwiaGVpZ2h0OjRweFwiPjwvZGl2PidcbiAgICAgICAgICAgICsgYDxkaXY+PHNtYWxsPkJyb3dzZXIgwrcgJHticm93c2VyTGFiZWx9PC9zbWFsbD48L2Rpdj5gXG4gICAgICAgICAgICArIGA8ZGl2PiR7YnJvd3NlclRpbWV9PC9kaXY+YFxuICAgICAgICAgICAgKyAnPC9kaXY+J1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICBlc2NhcGVIdG1sKHMpIHtcbiAgICAgICAgaWYgKHMgPT09IG51bGwgfHwgcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZyhzKVxuICAgICAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpO1xuICAgIH0sXG5cbiAgICAvLyAtLS0tIGludGVybmFscyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIGZvcm1hdFdpdGhPZmZzZXQodGltZXN0YW1wLCB3aXRoU2Vjb25kcykge1xuICAgICAgICBjb25zdCBzaGlmdGVkID0gbmV3IERhdGUoKHRpbWVzdGFtcCArIFBieERhdGVUaW1lLnNlcnZlclRpbWV6b25lT2Zmc2V0KSAqIDEwMDApO1xuICAgICAgICBjb25zdCB5eXl5ID0gc2hpZnRlZC5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhzaGlmdGVkLmdldFVUQ01vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBkZCA9IFN0cmluZyhzaGlmdGVkLmdldFVUQ0RhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgaGggPSBTdHJpbmcoc2hpZnRlZC5nZXRVVENIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtaSA9IFN0cmluZyhzaGlmdGVkLmdldFVUQ01pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgaWYgKCF3aXRoU2Vjb25kcykge1xuICAgICAgICAgICAgcmV0dXJuIGAke3l5eXl9LSR7bW19LSR7ZGR9ICR7aGh9OiR7bWl9YDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzcyA9IFN0cmluZyhzaGlmdGVkLmdldFVUQ1NlY29uZHMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgcmV0dXJuIGAke3l5eXl9LSR7bW19LSR7ZGR9ICR7aGh9OiR7bWl9OiR7c3N9YDtcbiAgICB9LFxuXG4gICAgcGFydHNUb0lzbyhwYXJ0cywgd2l0aFNlY29uZHMpIHtcbiAgICAgICAgY29uc3QgbG9va3VwID0ge307XG4gICAgICAgIHBhcnRzLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICAgIGxvb2t1cFtwLnR5cGVdID0gcC52YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGJhc2UgPSBgJHtsb29rdXAueWVhcn0tJHtsb29rdXAubW9udGh9LSR7bG9va3VwLmRheX0gJHtsb29rdXAuaG91cn06JHtsb29rdXAubWludXRlfWA7XG4gICAgICAgIGlmICghd2l0aFNlY29uZHMpIHtcbiAgICAgICAgICAgIHJldHVybiBiYXNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtiYXNlfToke2xvb2t1cC5zZWNvbmQgfHwgJzAwJ31gO1xuICAgIH0sXG5cbiAgICBmb3JtYXRPZmZzZXQob2Zmc2V0U2VjKSB7XG4gICAgICAgIGNvbnN0IHNpZ24gPSBvZmZzZXRTZWMgPj0gMCA/ICcrJyA6ICctJztcbiAgICAgICAgY29uc3QgYWJzID0gTWF0aC5hYnMob2Zmc2V0U2VjKTtcbiAgICAgICAgY29uc3QgaGggPSBTdHJpbmcoTWF0aC5mbG9vcihhYnMgLyAzNjAwKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoTWF0aC5mbG9vcigoYWJzICUgMzYwMCkgLyA2MCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtzaWdufSR7aGh9OiR7bW19YDtcbiAgICB9LFxufTtcblxud2luZG93LlBieERhdGVUaW1lID0gUGJ4RGF0ZVRpbWU7XG4iXX0=