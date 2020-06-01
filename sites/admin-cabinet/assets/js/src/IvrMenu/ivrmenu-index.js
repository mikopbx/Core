/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */

const IvrMenuTable = {
	$ivrTable: $('#ivr-menu-table'),
	initialize() {
		$('.menu-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}ivr-menu/modify/${id}`;
		});

		IvrMenuTable.initializeDataTable();
	},

	/**
	 * Initialize data tables on table
	 */
	initializeDataTable() {
		IvrMenuTable.$ivrTable.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				null,
				null,
				null,
				null,
				null,
				{orderable: false, searchable: false},
			],
			order: [1, 'asc'],
			language: SemanticLocalization.dataTableLocalisation,
		});
		$('#add-new-button').appendTo($('div.eight.column:eq(0)'));
	},
};

$(document).ready(() => {
	IvrMenuTable.initialize();
});

