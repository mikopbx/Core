/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global globalRootUrl, SemanticLocalization */

const callQueuesTable = {
	$queuesTable: $('#queues-table'),
	initialize() {
		$('.queue-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}call-queues/modify/${id}`;
		});
		callQueuesTable.initializeDataTable();
	},
	/**
	 * Initialize data tables on table
	 */
	initializeDataTable() {
		callQueuesTable.$queuesTable.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
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
	callQueuesTable.initialize();
});

