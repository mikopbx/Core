"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
var managersTable = {
	initialize: function () {
		function initialize() {
			$('.user-row td').on('dblclick', function (e) {
				var id = $(e.target).closest('tr').attr('id');
				window.location = "".concat(globalRootUrl, "asterisk-managers/modify/").concat(id);
			});
		}

		return initialize;
	}()
};
$(document).ready(function () {
	managersTable.initialize();
});
//# sourceMappingURL=managers-index.js.map