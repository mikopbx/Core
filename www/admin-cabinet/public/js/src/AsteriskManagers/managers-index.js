/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global globalRootUrl */

const managersTable = {
	initialize() {
		$('.user-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}asterisk-managers/modify/${id}`;
		});
	},
};

$(document).ready(() => {
	managersTable.initialize();
});

