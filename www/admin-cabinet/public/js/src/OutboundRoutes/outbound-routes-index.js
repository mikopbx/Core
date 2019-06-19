/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
const outboundRoutes = {
	initialize() {
		$('#routingTable').tableDnD({
			onDrop() {
				$('.rule-row').each((index, obj) => {
					const ruleId = $(obj).attr('id');
					const oldPriority = parseInt($(obj).attr('data-value'), 10);
					const newPriority = obj.rowIndex;
					if (oldPriority !== newPriority) {
						$.api({
							on: 'now',
							url: `${globalRootUrl}outbound-routes/changePriority/${ruleId}`,
							method: 'POST',
							data: {newPriority},
						});
					}
				});
			},
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});

		$('.rule-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}outbound-routes/modify/${id}`;
		});
	},
};

$(document).ready(() => {
	outboundRoutes.initialize();
});
