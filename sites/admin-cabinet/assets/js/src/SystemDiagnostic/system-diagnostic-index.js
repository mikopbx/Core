/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 */
/* global sessionStorage, ace, PbxApi */

const systemDiagnostic = {
	$tabMenuItems: $('#system-diagnostic-menu .item'),
	initialize() {
		systemDiagnostic.$tabMenuItems.tab();
		systemDiagnostic.$tabMenuItems.tab('change tab', 'show-log');
	},
};

$(document).ready(() => {
	systemDiagnostic.initialize();
});

