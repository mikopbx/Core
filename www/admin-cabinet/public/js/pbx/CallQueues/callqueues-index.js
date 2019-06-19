"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
var callqueueTable = {
	initialize: function () {
		function initialize() {
			$('.queue-row td').on('dblclick', function (e) {
				var id = $(e.target).closest('tr').attr('id');
				window.location = "".concat(globalRootUrl, "call-queues/modify/").concat(id);
			});
		}

		return initialize;
	}()
};
$(document).ready(function () {
	callqueueTable.initialize();
});
//# sourceMappingURL=callqueues-index.js.map