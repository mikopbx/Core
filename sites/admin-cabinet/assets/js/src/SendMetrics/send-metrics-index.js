/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global sessionStorage, PbxApi */
const sendMetrics = {
	initialize(){
		const isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');
		if (isMetricsSend === null) {
			PbxApi.LicenseSendPBXMetrics(sendMetrics.cbAfterMetricsSent);

		}
	},
	cbAfterMetricsSent(result){
		if (result===true){
			sessionStorage.setItem('MetricsAlreadySent', 'true');
		}
	}
}
$(document).ready(() => {
	sendMetrics.initialize();
});