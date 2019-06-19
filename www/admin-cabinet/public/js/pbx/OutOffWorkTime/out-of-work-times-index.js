"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
var OutOfWorkTimesTable = {
	initialize: function () {
		function initialize() {
			$('.frame-row td').on('dblclick', function (e) {
				var id = $(e.target).closest('tr').attr('id');
				window.location = "".concat(globalRootUrl, "out-off-work-time/modify/").concat(id);
			});
		}

		return initialize;
	}()
};
$(document).ready(function () {
	OutOfWorkTimesTable.initialize();
});
//# sourceMappingURL=out-of-work-times-index.js.map