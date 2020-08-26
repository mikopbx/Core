/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */


/* global Sentry, globalPBXVersion, globalPBXLicense,
globalLastSentryEventId, globalTranslate, localStorage */

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
			Sentry.showReportDialog({ eventId: sentryEventId });
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
					const s = error.message;
					let hash = 0;
					let i;
					let chr;
					for (i = 0; i < s.length; i++) {
						chr = s.charCodeAt(i);
						hash = ((hash << 5) - hash) + chr;
						hash |= 0; // Convert to 32bit integer
					}
					globalShowSentryReportDialog(hash, hint.eventId);
				}

			}
			return event;
		},
	});

	Sentry.configureScope((scope) => {
		scope.setUser({ id: globalPBXLicense });
		scope.setTag('library', 'web-interface');
	});

	if (globalLastSentryEventId) {
		globalShowSentryReportDialog(globalLastSentryEventId);
	}
});

