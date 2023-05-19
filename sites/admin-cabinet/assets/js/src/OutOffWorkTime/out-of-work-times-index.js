/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global globalRootUrl,$ */

const OutOfWorkTimesTable = {
	initialize() {
		$('.frame-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}out-off-work-time/modify/${id}`;
		});

		$('#time-frames-table').DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				null,
				{orderable: false},
				null,
				null,
				{orderable: false},
			],
			autoWidth: false,
			order: [1, 'asc'],
			language: SemanticLocalization.dataTableLocalisation,
			"drawCallback": function( settings ) {
				$("[data-content!=''][data-content]").popup();
			}
		});

		$('#add-new-button').appendTo($('div.eight.column:eq(0)'));

	},

};

$(document).ready(() => {
	OutOfWorkTimesTable.initialize();
});

