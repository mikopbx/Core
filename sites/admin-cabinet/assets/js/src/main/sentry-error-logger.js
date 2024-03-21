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


/* global Sentry, globalPBXVersion, globalPBXLicense,
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

Sentry.onLoad(() => {
    Sentry.init({
        dsn: 'https://07be0eff8a5c463fbac3e90ae5c7d039@sentry.miko.ru/1',
        release: `mikopbx@${globalPBXVersion}`,
        beforeSend(event, hint) {
            // Check if it is an exception, and if so, show the report dialog
            if (event.exception) {
                const error = hint.originalException;
                if (error && error.message && error.message.length > 0) {

                    // Log the error message to the console
                    console.error("Captured error:", error);

                    // Generate a hash from the error message
                    const s = error.message;
                    let hash = 0;
                    let i;
                    let chr;
                    for (i = 0; i < s.length; i++) {
                        chr = s.charCodeAt(i);
                        hash = ((hash << 5) - hash) + chr;
                        hash |= 0; // Convert to 32bit integer
                    }

                    // Show the Sentry report dialog
                    globalShowSentryReportDialog(hash, hint.eventId);
                }

            }
            // Return the event for Sentry to process
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