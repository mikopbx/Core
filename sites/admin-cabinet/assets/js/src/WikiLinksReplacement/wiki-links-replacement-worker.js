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

/* global globalRootUrl, globalModuleUniqueId, $ */

const WikiLinksReplacementWorker = {
	timeOut: 300000,
	timeOutHandle: '',
	initialize() {
		WikiLinksReplacementWorker.restartWorker();
		window.addEventListener('ConfigDataChanged', WikiLinksReplacementWorker.cbOnDataChanged);
	},
	restartWorker() {
		window.clearTimeout(WikiLinksReplacementWorker.timeoutHandle);
		WikiLinksReplacementWorker.worker();
	},
	/**
	 * Handling the event of language or data change.
	 */
	cbOnDataChanged() {
		setTimeout(WikiLinksReplacementWorker.restartWorker,3000);
	},
	worker() {
		$.api({
			url: `${globalRootUrl}wiki-links/get-wiki-links-replacement`,
			on: 'now',
			data: { globalModuleUniqueId },
			method: 'POST',
			onSuccess: WikiLinksReplacementWorker.cbAfterResponse
		});
	},
	cbAfterResponse(response) {
		if (response === false) {
			return;
		}
		const arr = Object.entries(response.message);
		arr.forEach(([oldHref, newHref])  => {
			$(`a[href="${oldHref}"]`).attr('href', newHref);
		});
		WikiLinksReplacementWorker.timeoutHandle = window.setTimeout(
			WikiLinksReplacementWorker.worker,
			WikiLinksReplacementWorker.timeOut,
		);
	},
};

$(document).ready(() => {
	WikiLinksReplacementWorker.initialize();
});
