/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */

const FilesTable = {
	initialize() {
		$('#custom-files-table').DataTable({
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

		$('.file-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}custom-files/modify/${id}`;
		});
	},

};

$(document).ready(() => {
	FilesTable.initialize();
});

