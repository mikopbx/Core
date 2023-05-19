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

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage, $, globalTranslate */

/**
 * Advices Worker module.
 * @module advicesWorker
 */
const advicesWorker = {
	/**
	 * Time in milliseconds before fetching new advices.
	 * @type {number}
	 */
	timeOut: 300000,

	/**
	 * Timeout handle for advices worker.
	 * @type {number}
	 */
	timeOutHandle: '',

	/**
	 * jQuery element for advices container.
	 * @type {jQuery}
	 */
	$advices: $('#advices'),

	/**
	 * jQuery element for advices bell button.
	 * @type {jQuery}
	 */
	$advicesBellButton: $('#show-advices-button'),

	/**
	 * Initializes the advices worker.
	 */
	initialize() {
		advicesWorker.showPreviousAdvice();
		// Let's initiate the retrieval of new advices.
		advicesWorker.restartWorker();
		window.addEventListener('ConfigDataChanged', advicesWorker.cbOnDataChanged);
	},

	/**
	 * Restarts the advices worker.
	 */
	restartWorker() {
		window.clearTimeout(advicesWorker.timeoutHandle);
		advicesWorker.worker();
	},

	/**
	 * Event handler for language or data change.
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
		sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
		setTimeout(advicesWorker.restartWorker,3000);
	},

	/**
	 * Shows old advice until receiving an update from the station.
	 */
	showPreviousAdvice() {
		const previousAdviceBell = sessionStorage.getItem(`previousAdviceBell${globalWebAdminLanguage}`);
		if (previousAdviceBell) {
			advicesWorker.$advicesBellButton.html(previousAdviceBell);
		}
		const previousAdvice = sessionStorage.getItem(`previousAdvice${globalWebAdminLanguage}`);
		if (previousAdvice) {
			advicesWorker.$advices.html(previousAdvice);
		}
	},

	/**
	 * Worker function for fetching advices.
	 */
	worker() {
		PbxApi.AdvicesGetList(advicesWorker.cbAfterResponse);
	},

	/**
	 * Callback function after receiving the response.
	 * @param {object} response - Response object from the API.
	 */
	cbAfterResponse(response) {
		if (response === false) {
			return;
		}
		advicesWorker.$advices.html('');
		if (response.advices !== undefined) {
			let htmlMessages = '';
			let countMessages = 0;
			let iconBellClass = '';
			htmlMessages += '<div class="ui relaxed divided list">';

			if (response.advices.needUpdate !== undefined
				&& response.advices.needUpdate.length > 0) {
				$(window).trigger('SecurityWarning', [response.advices]);
			}

			if (response.advices.error !== undefined
				&& response.advices.error.length > 0) {
				$.each(response.advices.error, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="frown outline red icon"></i>';
					htmlMessages += `<b>${value}</b>`;
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.advices.warning !== undefined
				&& response.advices.warning.length > 0) {
				$.each(response.advices.warning, (key, value) => {
					htmlMessages += '<div class="item yellow">';
					htmlMessages += '<i class="meh outline yellow icon"></i>';
					htmlMessages += `<b>${value}</b>`;
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.advices.info !== undefined
				&& response.advices.info.length > 0) {
				$.each(response.advices.info, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="smile outline blue icon"></i>';
					htmlMessages += `<b>${value}</b>`;
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}

			if (response.advices.error !== undefined
				&& response.advices.error.length > 0) {
				iconBellClass = 'red large icon bell';
			} else if (response.advices.warning !== undefined
				&& response.advices.warning.length > 0){
				iconBellClass = 'yellow icon bell';

			} else if (response.advices.info !== undefined
				&& response.advices.info.length > 0){
				iconBellClass = 'blue icon bell';
			}


			htmlMessages += '</div>';
			advicesWorker.$advices.html(htmlMessages);
			sessionStorage.setItem(`previousAdvice${globalWebAdminLanguage}`, htmlMessages);

			if (countMessages>0){
				advicesWorker.$advicesBellButton
					.html(`<i class="${iconBellClass}"></i>${countMessages}`)
					.popup({
						position: 'bottom left',
						popup: advicesWorker.$advices,
						delay: {
							show: 300,
							hide: 10000,
						},
						movePopup: false
					});
				advicesWorker.$advicesBellButton.find('i')
					.transition('set looping')
					.transition('pulse', '1000ms');
			} else {
				advicesWorker.$advicesBellButton
					.html(`<i class="grey icon bell"></i>`)
			}
			sessionStorage.setItem(`previousAdviceBell${globalWebAdminLanguage}`, advicesWorker.$advicesBellButton.html());
			advicesWorker.timeoutHandle = window.setTimeout(
				advicesWorker.worker,
				advicesWorker.timeOut,
			);
		} else if (response.success === true
			&& response.advices !== undefined
			&& response.advices.length === 0) {
			sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
			sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
			advicesWorker.$advicesBellButton
				.html('<i class="grey icon bell outline"></i>');
		}
	},
};

$(document).ready(() => {
	advicesWorker.initialize();
});
