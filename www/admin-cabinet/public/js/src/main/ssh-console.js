/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2019
 *
 */

/* global globalSSHPort */

const sshConsole = {
	$menuLink: $('a[href$="/admin-cabinet/console/index/"]'),
	link: null,
	target: null,
	hide: false,
	initialize() {
		sshConsole.$menuLink.on('click', (e) => {
			e.preventDefault();
			window.open(sshConsole.link, sshConsole.target);
		});

		// Проверим возможность запуска SSH
		const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !(navigator.userAgent.match(/Opera|OPR\//));
		const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && navigator.userAgent && !navigator.userAgent.match('CriOS');
		if (isChrome) {
			sshConsole.detect(
				'chrome-extension://pnhechapfaindjhompbnflcldabbghjo',
				() => {
					sshConsole.link = `chrome-extension://pnhechapfaindjhompbnflcldabbghjo/html/nassh.html#root@${window.location.hostname}:${globalSSHPort}`;
					sshConsole.target = '_blank';
				},
				() => {
					sshConsole.link = 'https://chrome.google.com/webstore/detail/secure-shell/pnhechapfaindjhompbnflcldabbghjo';
					sshConsole.target = '_blank';
				},
			);
		} else if (isSafari) {
			sshConsole.link = `ssh://root@${window.location.hostname}:${globalSSHPort}`;
			sshConsole.target = '_top';
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
