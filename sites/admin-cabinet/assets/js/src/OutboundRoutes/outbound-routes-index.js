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

/* global globalRootUrl */
const outboundRoutes = {
	initialize() {
		$('#routingTable').tableDnD({
			onDrop: outboundRoutes.cbOnDrop,
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});

		$('.rule-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}outbound-routes/modify/${id}`;
		});
	},
	cbOnDrop() {
		let priorityWasChanged = false;
		const priorityData = {};
		$('.rule-row').each((index, obj) => {
			const ruleId = $(obj).attr('id');
			const oldPriority = parseInt($(obj).attr('data-value'), 10);
			const newPriority = obj.rowIndex;
			if (oldPriority !== newPriority) {
				priorityWasChanged = true;
				priorityData[ruleId]=newPriority;
			}
		});
		if (priorityWasChanged) {
			$.api({
				on: 'now',
				url: `${globalRootUrl}outbound-routes/changePriority`,
				method: 'POST',
				data: priorityData,
			});
		}
	},
};

$(document).ready(() => {
	outboundRoutes.initialize();
});
