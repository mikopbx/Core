"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
var DebuggerInfo = {
	$debugInfoDiv: $('#debug-info'),
	delta: 500,
	lastKeypressTime: 0,
	initialize: function () {
		function initialize() {
			DebuggerInfo.$debugInfoDiv.addClass('ui right very wide sidebar');
			window.$(document).on('keydown', function (event) {
				DebuggerInfo.keyHandler(event);
			});
		}

		return initialize;
	}(),
	UpdateContent: function () {
		function UpdateContent(newContent) {
			// let newHtml = `<h2>${globalTranslate.dbg_Header}</h2>`;
			// newHtml += newContent;
			DebuggerInfo.$debugInfoDiv.html(newContent);
		}

		return UpdateContent;
	}(),
	showSidebar: function () {
		function showSidebar() {
			if (DebuggerInfo.$debugInfoDiv.html().length === 0) return;
			$('#debug-info').sidebar({
				context: $('#main'),
				transition: 'overlay',
				dimPage: false
			}).sidebar('toggle');
		}

		return showSidebar;
	}(),
	keyHandler: function () {
		function keyHandler(event) {
			if (event.keyCode === 17) {
				var thisKeypressTime = new Date();

				if (thisKeypressTime - DebuggerInfo.lastKeypressTime <= DebuggerInfo.delta) {
					DebuggerInfo.showSidebar();
					thisKeypressTime = 0;
				}

				DebuggerInfo.lastKeypressTime = thisKeypressTime;
			}
		}

		return keyHandler;
	}()
}; // export default DebuggerInfo;
//# sourceMappingURL=debugger-info.js.map