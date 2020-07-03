/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage */

const advicesWorker = {
	timeOut: 300000,
	timeOutHandle: '',
	$advices: $('#advices'),
	$advicesBellButton: $('#show-advices-button'),
	initialize() {
		advicesWorker.showPreviousAdvice();
		// Запустим получение новых советов
		advicesWorker.restartWorker();
		window.addEventListener('ConfigDataChanged', advicesWorker.cbOnDataChanged);
	},
	restartWorker() {
		window.clearTimeout(advicesWorker.timeoutHandle);
		advicesWorker.worker();
	},
	/**
	 * Обработка события смены языка или данных
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
		sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
		advicesWorker.restartWorker();
	},
	/**
	 * Показывает старые советы до получения обвноления со станции
	 */
	showPreviousAdvice() {
		const previousAdviceBell = sessionStorage.getItem(`previousAdviceBell${globalWebAdminLanguage}`);
		if (previousAdviceBell !== undefined) {
			advicesWorker.$advicesBellButton.html(previousAdviceBell);
		}
		const previousAdvice = sessionStorage.getItem(`previousAdvice${globalWebAdminLanguage}`);
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
	},
	cbAfterResponse(response) {
		if (response === undefined) return;
		advicesWorker.$advices.html('');
		if (response.success === true
			&& response.message !== undefined) {
			let htmlMessages = '';
			let countMessages = 0;
			let iconBellClass = '';
			htmlMessages += '<div class="ui relaxed divided list">';

			if (response.message.error !== undefined
				&& response.message.error.length > 0) {
				$.each(response.message.error, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="frown outline red icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small red header">${value}</div>`;
					htmlMessages += '</div>';
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.message.warning !== undefined
				&& response.message.warning.length > 0) {
				$.each(response.message.warning, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="meh outline yellow icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small header">${value}</div>`;
					htmlMessages += '</div>';
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.message.info !== undefined
				&& response.message.info.length > 0) {
				$.each(response.message.info, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="smile outline blue icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small header">${value}</div>`;
					htmlMessages += '</div>';
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}

			if (response.message.error !== undefined
				&& response.message.error.length > 0) {
				iconBellClass = 'red large icon bell';
			} else if (response.message.warning !== undefined
				&& response.message.warning.length > 0){
				iconBellClass = 'yellow icon bell';

			} else if (response.message.info !== undefined
				&& response.message.info.length > 0){
				iconBellClass = 'blue icon bell';
			}


			htmlMessages += '</div>';
			advicesWorker.$advices.html(htmlMessages);
			sessionStorage.setItem(`previousAdvice${globalWebAdminLanguage}`, htmlMessages);

			// // Проверим есть ли обновление системы
			// $('a[href="/admin-cabinet/update/index/"] > i').removeClass('loading');
			// if (response.message.info !== undefined
			// 	&& response.message.info.length > 0) {
			// 	$.each(response.message.info, (key, value) => {
			// 		if (value.indexOf('/admin-cabinet/update/index/') > -1) {
			// 			$('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
			// 		}
			// 	});
			// }
			advicesWorker.$advicesBellButton
				.html(`<i class="${iconBellClass}"></i>${countMessages}`)
				.popup({
					position: 'bottom left',
					popup: advicesWorker.$advices,
					delay: {
						show: 300,
						hide: 10000,
					},
				});
			advicesWorker.$advicesBellButton.find('i')
				.transition('set looping')
				.transition('pulse', '1000ms');
			sessionStorage.setItem(`previousAdviceBell${globalWebAdminLanguage}`, advicesWorker.$advicesBellButton.html());
			advicesWorker.timeoutHandle = window.setTimeout(
				advicesWorker.worker,
				advicesWorker.timeOut,
			);
		} else if (response.success === true
			&& response.message !== undefined
			&& response.message.length === 0) {
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
