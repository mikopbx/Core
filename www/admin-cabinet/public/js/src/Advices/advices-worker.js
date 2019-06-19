/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl, globalTranslate */

const advicesWorker = {
	timeOut: 300000,
	timeOutHandle: '',
	$advices: $('#advices'),
	initialize() {
		advicesWorker.showPreviousAdvice();
		// Запустим получение новых советов
		advicesWorker.restartWorker();
		window.addEventListener('ConfigDataChanged', advicesWorker.restartWorker);
	},
	restartWorker() {
		window.clearTimeout(advicesWorker.timeoutHandle);
		advicesWorker.worker();
	},
	/**
	 * Показывает старые советы до получения обвноления со станции
	 */
	showPreviousAdvice() {
		const previousAdvice = localStorage.getItem('previousAdvice');
		if (previousAdvice !== undefined) {
			advicesWorker.$advices.html(previousAdvice);
		}
	},
	worker() {
		$.api({
			url: `${globalRootUrl}advices/getAdvices`,
			on: 'now',
			onSuccess(response) {
				advicesWorker.cbAfterResponse(response);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
		advicesWorker.timeoutHandle = window.setTimeout(
			advicesWorker.worker,
			advicesWorker.timeOut,
		);
	},
	cbAfterResponse(response) {
		if (response === undefined) return;
		advicesWorker.$advices.html('');
		if (response.success === true
			&& response.message !== undefined
			&& response.message.length > 0) {
			let htmlMessages = '<div class="ui icon warning message">';
			htmlMessages += '<i class="warning icon"></i>';
			htmlMessages += '<div class="content">';
			htmlMessages += `<div class="header">${globalTranslate.adv_MessagesHeader}</div>`;
			htmlMessages += '<ul class="list">';
			$.each(response.message, (key, value) => {
				htmlMessages += `<li>${value}</li>`;
			});
			htmlMessages += '</ul>';
			htmlMessages += '</div>';
			htmlMessages += '</div>';
			advicesWorker.$advices.html(htmlMessages);
			localStorage.setItem('previousAdvice', htmlMessages);
		} else if (response.success === true
			&& response.message !== undefined
			&& response.message.length === 0) {
			localStorage.removeItem('previousAdvice');
		}
	},
};

$(document).ready(() => {
	advicesWorker.initialize();
});
