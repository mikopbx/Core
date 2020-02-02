/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */
const DialplanApplicationsTable = {
	initialize() {
		$('#custom-applications-table').DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				null,
				null,
				{orderable: false, searchable: false},
				{orderable: false, searchable: false},
			],
			order: [0, 'asc'],
			language: SemanticLocalization.dataTableLocalisation,
		});
		$('#add-new-button').appendTo($('div.eight.column:eq(0)'));

		$('.app-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}dialplan-applications/modify/${id}`;
		});
	},

};

$(document).ready(() => {
	DialplanApplicationsTable.initialize();
});

