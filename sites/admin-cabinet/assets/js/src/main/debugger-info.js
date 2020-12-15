/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

const DebuggerInfo = {
	$debugInfoDiv: $('#debug-info'),
	delta: 500,
	lastKeypressTime: 0,
	initialize() {
		DebuggerInfo.$debugInfoDiv.addClass('ui right very wide sidebar');
		window.$(document).on('keydown', (event) => {
			DebuggerInfo.keyHandler(event);
		});
	},
	UpdateContent(newContent) {
		// let newHtml = `<h2>${globalTranslate.dbg_Header}</h2>`;
		// newHtml += newContent;
		DebuggerInfo.$debugInfoDiv.html(newContent);
	},
	showSidebar() {
		if (DebuggerInfo.$debugInfoDiv.html().length === 0) return;
		DebuggerInfo.$debugInfoDiv
			.sidebar({
				context: $('#main'),
				transition: 'overlay',
				dimPage: false,
			})
			.sidebar('toggle');
	},
	keyHandler(event) {
		if (event.keyCode === 17) {
			let thisKeypressTime = new Date();
			if (thisKeypressTime - DebuggerInfo.lastKeypressTime <= DebuggerInfo.delta) {
				DebuggerInfo.showSidebar();
				thisKeypressTime = 0;
			}
			DebuggerInfo.lastKeypressTime = thisKeypressTime;
		}
	},
};


// export default DebuggerInfo;
