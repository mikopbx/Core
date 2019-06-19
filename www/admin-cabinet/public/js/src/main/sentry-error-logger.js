/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2019
 *
 */
/* global Sentry, globalPBXVersion, globalPBXLicense, globalLastSentryEventId, globalTranslate */

Sentry.onLoad(() => {
	function globalShowSentryReportDialog(sentryEventId) {

		const itIsKnownError = localStorage.getItem(`sentry_lastError${sentryEventId}`);
		if (itIsKnownError === null) {
			if (globalTranslate !== undefined && globalTranslate.length > 0) {
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
			localStorage.setItem(`sentry_lastError${sentryEventId}`, 'theFormHasAlreadySent');
		}
	}

	Sentry.init({
		dsn: 'https://a8d729459beb446eb3cbb9df997dcc7b@centry.miko.ru/1',
		release: `mikopbx@${globalPBXVersion}`,
		beforeSend(event, hint) {
			// Check if it is an exception, and if so, show the report dialog
			if (event.exception) {
				globalShowSentryReportDialog(event.event_id);
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
