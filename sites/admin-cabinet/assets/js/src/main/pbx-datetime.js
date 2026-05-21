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
const PbxDateTime = {
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
    setServerMeta(meta) {
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
    hasServerTimezone() {
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
    formatServerTime(timestamp, opts = {}) {
        if (!Number.isFinite(timestamp)) {
            return '';
        }
        const withSeconds = opts.withSeconds === true;
        const date = new Date(timestamp * 1000);

        if (PbxDateTime.hasServerTimezone() && typeof Intl !== 'undefined') {
            try {
                const fmtOpts = {
                    timeZone: PbxDateTime.serverTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                };
                if (withSeconds) {
                    fmtOpts.second = '2-digit';
                }
                const parts = new Intl.DateTimeFormat('en-CA', fmtOpts).formatToParts(date);
                return PbxDateTime.partsToIso(parts, withSeconds);
            } catch (e) {
                // Fall through to offset-based path
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
    formatBrowserTime(timestamp, opts = {}) {
        if (!Number.isFinite(timestamp)) {
            return '';
        }
        const withSeconds = opts.withSeconds === true;
        const d = new Date(timestamp * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        if (!withSeconds) {
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
        }
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    },

    /**
     * Format a server-supplied "Y-m-d H:i:s" string (already in server TZ).
     * Used for fields that the backend serialises as a string instead of
     * a unix timestamp (e.g. Passkeys.last_used_at).
     *
     * @param {string} serverStr
     * @returns {string} The same string, normalised — and "" for empty input.
     */
    formatServerDateString(serverStr) {
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
    serverStringToTimestamp(serverStr) {
        if (typeof serverStr !== 'string' || serverStr.length === 0) {
            return null;
        }
        const match = serverStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
        if (!match) {
            return null;
        }
        const [, y, mo, d, h, mi, s] = match.map(Number);
        const utcMs = Date.UTC(y, mo - 1, d, h, mi, s);
        return Math.floor(utcMs / 1000) - PbxDateTime.serverTimezoneOffset;
    },

    /**
     * Short label for the server timezone, e.g. "Europe/Moscow (UTC+03:00)".
     *
     * @returns {string}
     */
    getServerTzLabel() {
        const offset = PbxDateTime.formatOffset(PbxDateTime.serverTimezoneOffset);
        if (PbxDateTime.hasServerTimezone()) {
            return `${PbxDateTime.serverTimezone} (UTC${offset})`;
        }
        return `UTC${offset}`;
    },

    /**
     * Short label for the browser timezone, e.g. "Asia/Bangkok (UTC+07:00)".
     *
     * @returns {string}
     */
    getBrowserTzLabel() {
        let name = '';
        try {
            name = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (e) {
            name = '';
        }
        const offsetSec = -new Date().getTimezoneOffset() * 60;
        const offset = PbxDateTime.formatOffset(offsetSec);
        if (name) {
            return `${name} (UTC${offset})`;
        }
        return `UTC${offset}`;
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
    buildDualTooltip(timestamp, opts = {}) {
        const serverTime = PbxDateTime.formatServerTime(timestamp, opts);
        const browserTime = PbxDateTime.formatBrowserTime(timestamp, opts);
        const serverLabel = PbxDateTime.getServerTzLabel();
        const browserLabel = PbxDateTime.getBrowserTzLabel();
        return `Server: ${serverLabel}\n${serverTime}\n\nBrowser: ${browserLabel}\n${browserTime}`;
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
    buildDualTooltipHtml(timestamp, opts = {}) {
        const serverTime = PbxDateTime.escapeHtml(PbxDateTime.formatServerTime(timestamp, opts));
        const browserTime = PbxDateTime.escapeHtml(PbxDateTime.formatBrowserTime(timestamp, opts));
        const serverLabel = PbxDateTime.escapeHtml(PbxDateTime.getServerTzLabel());
        const browserLabel = PbxDateTime.escapeHtml(PbxDateTime.getBrowserTzLabel());
        return (
            '<div class="pbx-datetime-tooltip">'
            + `<div><small>Server · ${serverLabel}</small></div>`
            + `<div><b>${serverTime}</b></div>`
            + '<div style="height:4px"></div>'
            + `<div><small>Browser · ${browserLabel}</small></div>`
            + `<div>${browserTime}</div>`
            + '</div>'
        );
    },

    escapeHtml(s) {
        if (s === null || s === undefined) {
            return '';
        }
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ---- internals ---------------------------------------------------

    formatWithOffset(timestamp, withSeconds) {
        const shifted = new Date((timestamp + PbxDateTime.serverTimezoneOffset) * 1000);
        const yyyy = shifted.getUTCFullYear();
        const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(shifted.getUTCDate()).padStart(2, '0');
        const hh = String(shifted.getUTCHours()).padStart(2, '0');
        const mi = String(shifted.getUTCMinutes()).padStart(2, '0');
        if (!withSeconds) {
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
        }
        const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    },

    partsToIso(parts, withSeconds) {
        const lookup = {};
        parts.forEach((p) => {
            lookup[p.type] = p.value;
        });
        const base = `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}`;
        if (!withSeconds) {
            return base;
        }
        return `${base}:${lookup.second || '00'}`;
    },

    formatOffset(offsetSec) {
        const sign = offsetSec >= 0 ? '+' : '-';
        const abs = Math.abs(offsetSec);
        const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
        const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
        return `${sign}${hh}:${mm}`;
    },
};

window.PbxDateTime = PbxDateTime;
