/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */

const OutOfWorkTimesTable = {
	initialize() {
		$('.frame-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}out-off-work-time/modify/${id}`;
		});
	},

};

$(document).ready(() => {
	OutOfWorkTimesTable.initialize();
});

