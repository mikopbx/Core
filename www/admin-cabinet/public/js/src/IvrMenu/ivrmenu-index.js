/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */

const IvrMenuTable = {
	initialize() {
		$('.menu-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}ivr-menu/modify/${id}`;
		});
	},
};

$(document).ready(() => {
	IvrMenuTable.initialize();
});

