/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
 *
 */

/* global globalRootUrl */

$(document).ready(() => {
	const isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');
	if (isMetricsSend === null) {
		$.api({
			url: `${globalRootUrl}send-metrics/index`,
			on: 'now',
			onSuccess() {
				sessionStorage.setItem('MetricsAlreadySent', 'true');
			},
		});
	}
});