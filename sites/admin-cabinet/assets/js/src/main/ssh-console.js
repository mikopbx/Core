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
/* global globalRootUrl */

const sshConsole = {
	$menuLink: $(`a[href$="${globalRootUrl}console/index/"]`),
	link: null,
	target: null,
	hide: false,
	initialize() {
		if (!sshConsole.$menuLink){
			return;
		}
		let connectionAddress = sshConsole.$menuLink.attr('data-value');
		const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !(navigator.userAgent.match(/Opera|OPR\//));
		if (isChrome) {
			sshConsole.detect(
				'chrome-extension://iodihamcpbpeioajjeobimgagajmlibd',
				() => {
					sshConsole.link = `chrome-extension://iodihamcpbpeioajjeobimgagajmlibd/html/nassh.html#${connectionAddress}`;
					sshConsole.target = '_blank';
				},
				() => {
					sshConsole.link = 'https://chrome.google.com/webstore/detail/iodihamcpbpeioajjeobimgagajmlibd';
					sshConsole.target = '_blank';
				},
			);
			$('body').on('click', `a[href$="${globalRootUrl}console/index/"]`, (e) => {
				e.preventDefault();
				window.open(sshConsole.link, sshConsole.target);
			});
		} else {
			sshConsole.$menuLink.hide();
		}
	},
	detect(base, ifInstalled, ifNotInstalled) {
		$.get(`${base}/html/nassh.html`)
			.done(ifInstalled)
			.fail(ifNotInstalled);
	},
};


$(document).ready(() => {
	sshConsole.initialize();
});
