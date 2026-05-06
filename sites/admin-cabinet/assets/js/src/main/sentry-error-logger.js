/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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


/* global Sentry, jQuery, globalPBXVersion, globalPBXLicense,
globalLastSentryEventId, globalTranslate, localStorage */

/**
 * Shows the Sentry report dialog for error reporting.
 * @param {string} hash - Hash value for identifying the error.
 * @param {string} sentryEventId - Sentry event ID for the error.
 */
function globalShowSentryReportDialog(hash, sentryEventId) {
    const itIsKnownError = localStorage.getItem(`sentry_lastError${hash}`);
    if (itIsKnownError === null) {
        if (typeof {globalTranslate} !== "undefined"
            && Object.keys(globalTranslate).length > 0) {
            Sentry.showReportDialog({
                eventId: sentryEventId,
                title: globalTranslate.sntry_Title,
                subtitle: globalTranslate.sntry_Subtitle,
                subtitle2: globalTranslate.sntry_Subtitle2,
                labelComments: globalTranslate.sntry_LabelComments,
                labelClose: globalTranslate.sntry_LabelClose,
                labelSubmit: globalTranslate.sntry_LabelSubmit,
                errorGeneric: globalTranslate.sntry_ErrorGeneric,
                errorFormEntry: globalTranslate.sntry_ErrorFormEntry,
                successMessage: globalTranslate.sntry_SuccessMessage,

            });
        } else {
            Sentry.showReportDialog({eventId: sentryEventId});
        }
        localStorage.setItem(`sentry_lastError${hash}`, 'theFormHasAlreadySent');
    }
}

// Issue #1056: jQuery.Event objects escape to window.onerror as non-Error
// throws. Each event carries a unique jQuery22<cacheId> property, so Sentry
// produces a fresh fingerprint for every page load — Sentry MIKOPBX-MHA/MHD/
// MHE/MHJ/MHP. These keys uniquely identify a jQuery.Event payload (jqXHR
// and DOMException don't have them).
const NON_ERROR_EVENT_KEYS = [
    'isTrigger',
    'isDefaultPrevented',
    'isImmediatePropagationStopped',
];

const NON_ERROR_EVENT_VALUE_RE =
    /Object captured as exception with keys:[^\n]*\b(isTrigger|isDefaultPrevented)\b/;

/**
 * Detect a jQuery.Event-shaped object passed as a thrown value.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isJQueryEventThrow(value) {
    if (!value || typeof value !== 'object' || value instanceof Error) {
        return false;
    }
    for (let i = 0; i < NON_ERROR_EVENT_KEYS.length; i += 1) {
        if (NON_ERROR_EVENT_KEYS[i] in value) {
            return true;
        }
    }
    return false;
}

/**
 * Convert a jQuery.Event-shaped throwable into a real Error so it gets a
 * stable Sentry fingerprint and a usable stack trace.
 *
 * @param {Object} jqEvent
 * @returns {Error}
 */
function wrapJQueryEventAsError(jqEvent) {
    const type = (jqEvent && jqEvent.type) || 'unknown';
    const targetId = jqEvent && jqEvent.target && jqEvent.target.id;
    const targetTag = jqEvent && jqEvent.target && jqEvent.target.tagName;
    const targetDescr = targetId ? `#${targetId}` : (targetTag || 'unknown');
    const wrapped = new Error(
        `jQuery.Event escaped as throw: type=${type} target=${targetDescr}`
    );
    wrapped.name = 'JQueryEventThrow';
    return wrapped;
}

// Slot 1 — jQuery dispatch wrapper. All synchronous throws originating
// inside a jQuery event callback (.on, .trigger, $.event.dispatch chain)
// pass through this function. Converting the throw value here gives Sentry
// a stable fingerprint regardless of the actual call site.
//
// Idempotent (guarded by __mikopbxDispatchPatched). Tries multiple hooks
// because jQuery may load AFTER this script (AssetProvider loads the Sentry
// bundle in the head, jQuery later in semantic collection).
function patchJQueryDispatchOnce() {
    if (typeof jQuery === 'undefined' || !jQuery.event || !jQuery.event.dispatch) {
        return false;
    }
    if (jQuery.event.__mikopbxDispatchPatched) {
        return true;
    }
    const original = jQuery.event.dispatch;
    jQuery.event.dispatch = function patchedDispatch() {
        try {
            return original.apply(this, arguments);
        } catch (err) {
            if (isJQueryEventThrow(err)) {
                // Re-throw a real Error so window.onerror / Sentry GlobalHandlers
                // see a stable, groupable exception instead of jQuery's internal
                // event object. The original payload is still discarded — nobody
                // upstream catches a jQuery.Event throw and acts on it.
                throw wrapJQueryEventAsError(err);
            }
            throw err;
        }
    };
    jQuery.event.__mikopbxDispatchPatched = true;
    return true;
}

if (!patchJQueryDispatchOnce()) {
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchJQueryDispatchOnce, { once: true });
    }
    window.addEventListener('load', patchJQueryDispatchOnce, { once: true });
}

// Slot 2 — capture-phase listener. Runs BEFORE Sentry's GlobalHandlers,
// preserves the browser-native ErrorEvent (filename/lineno/colno) and emits
// one stable diagnostic event so we can localise the throw site without
// access to the affected host.
//
// Throttled per pageload to one event per minute — observed footprint is
// ~5/day per host, this is far above what we need to diagnose.
const PROBE_THROTTLE_MS = 60_000;
let lastProbeAt = 0;

/**
 * Strip query string and hash from a URL-ish string. Prevents tokens / OAuth
 * codes / session params from leaking into Sentry extras (issue #1056 review).
 *
 * @param {string} value
 * @returns {string|null}
 */
function stripUrlSecrets(value) {
    if (!value || typeof value !== 'string') return null;
    return value.split('?')[0].split('#')[0];
}

window.addEventListener('error', (e) => {
    try {
        const ex = e && e.error;
        if (!isJQueryEventThrow(ex)) {
            return;
        }
        if (typeof Sentry === 'undefined' || typeof Sentry.captureMessage !== 'function') {
            return;
        }
        const now = Date.now();
        if (now - lastProbeAt < PROBE_THROTTLE_MS) {
            return;
        }
        lastProbeAt = now;
        Sentry.captureMessage('non-Error throw escaped to GlobalHandlers (jQuery.Event)', {
            level: 'warning',
            fingerprint: ['non-error-jquery-event'],
            tags: {
                probe: 'non-error-jquery-event',
                // pathname only — URL search/hash may carry secrets.
                page: window.location.pathname,
            },
            extra: {
                // Sanitised: e.filename can be the page URL with query string
                // for inline scripts. Sentry already records the page URL via
                // request context, and the SDK supplies user-agent automatically,
                // so we don't duplicate either of them here.
                filename: stripUrlSecrets(e.filename),
                lineno: e.lineno,
                colno: e.colno,
                browserMessage: e.message,
                eventType: ex.type,
                // Object.keys returns property names only — no values are read,
                // so a key named "password" wouldn't expose the value, but the
                // limit caps the surface anyway.
                eventKeys: Object.keys(ex).slice(0, 12),
                isTrigger: ex.isTrigger,
                isDefaultPrevented: ex.isDefaultPrevented,
                targetTag: ex.target && ex.target.tagName,
                targetId: ex.target && ex.target.id,
                currentTargetTag: ex.currentTarget && ex.currentTarget.tagName,
                namespace: ex.namespace,
            },
        });
    } catch (_diagFailed) {
        // Diagnostics must never throw.
    }
}, true);

Sentry.onLoad(() => {
    Sentry.init({
        dsn: 'https://07be0eff8a5c463fbac3e90ae5c7d039@sentry.miko.ru/1',
        release: `mikopbx@${globalPBXVersion}`,

        // SDK-level guard — runs before beforeSend, matches against the
        // synthesized "Object captured as exception with keys: …" message
        // that Sentry emits when the original throwable was lost.
        ignoreErrors: [NON_ERROR_EVENT_VALUE_RE],

        beforeSend(event, hint) {
            const ex = hint && hint.originalException;

            // Slot 3 — last-resort filter. By the time we reach here,
            // Slots 1 and 2 should have intercepted the throw, but a Promise
            // rejection or a third-party script could still bypass them.
            if (isJQueryEventThrow(ex)) {
                return null;
            }
            const synthValue =
                event.exception && event.exception.values
                && event.exception.values[0] && event.exception.values[0].value;
            if (synthValue && NON_ERROR_EVENT_VALUE_RE.test(synthValue)) {
                return null;
            }

            // Original report-dialog logic for genuine Error instances.
            if (event.exception && ex && ex.message && ex.message.length > 0) {
                console.error('Captured error:', ex);

                const s = ex.message;
                let hash = 0;
                let chr;
                for (let i = 0; i < s.length; i += 1) {
                    chr = s.charCodeAt(i);
                    hash = ((hash << 5) - hash) + chr;
                    hash |= 0;
                }
                globalShowSentryReportDialog(hash, hint.eventId);
            }
            return event;
        },
    });

    Sentry.configureScope((scope) => {
        scope.setUser({id: globalPBXLicense});
        scope.setTag('library', 'web-interface');
    });

    if (globalLastSentryEventId) {
        globalShowSentryReportDialog(globalLastSentryEventId);
    }
});
