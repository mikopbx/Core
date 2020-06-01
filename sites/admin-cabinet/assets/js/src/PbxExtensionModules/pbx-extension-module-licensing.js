/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, UserMessage */

const licensing = {
	params: undefined,
	callback: undefined,
	captureFeature(params, callback) {
		licensing.params = params;
		licensing.callback = callback;
		$.api({
			url: `${globalRootUrl}licensing/captureFeatureForProductId`,
			on: 'now',
			method: 'POST',
			data: {
				licFeatureId: licensing.params.licFeatureId,
				licProductId: licensing.params.licProductId,
			},
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.success === true;
			},
			onSuccess: licensing.cbAfterFeatureCaptured,
			onFailure: licensing.cbAfterFailureFeatureCaptured,

		});
	},
	cbAfterFeatureCaptured() {
		licensing.callback(licensing.params);
	},
	cbAfterFailureFeatureCaptured(response) {
		if (response !== undefined
			&& Object.keys(response).length > 0
			&& response.message.length > 0) {
			UserMessage.showError(response.message);
		} else {
			UserMessage.showError(globalTranslate.ext_NoLicenseAvailable);
		}
		$('a.button').removeClass('disabled');
	},
};