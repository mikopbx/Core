/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global globalRootUrl */

const conferenceTable = {
	initialize() {
		$('.record-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}conference-rooms/modify/${id}`;
		});
	},
};

$(document).ready(() => {
	conferenceTable.initialize();
});

