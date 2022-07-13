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

/* global globalSSHPort */

const sshConsole = {
	$menuLink: $('a[href$="/admin-cabinet/console/index/"]'),
	link: null,
	target: null,
	hide: false,
	initialize() {
		$('body').on('click', 'a[href$="/admin-cabinet/console/index/"]', (e) => {
			e.preventDefault();
			window.open(sshConsole.link, sshConsole.target);
		});
		// Проверим возможность запуска SSH
		const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !(navigator.userAgent.match(/Opera|OPR\//));
		//const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && navigator.userAgent && !navigator.userAgent.match('CriOS');
		if (isChrome) {
			sshConsole.detect(
				'chrome-extension://iodihamcpbpeioajjeobimgagajmlibd',
				() => {
					sshConsole.link = `ssh://root@${window.location.hostname}:${globalSSHPort}`;
					sshConsole.target = '_blank';
				},
				() => {
					sshConsole.link = 'https://chrome.google.com/webstore/detail/iodihamcpbpeioajjeobimgagajmlibd';
					sshConsole.target = '_blank';
				},
			);
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
