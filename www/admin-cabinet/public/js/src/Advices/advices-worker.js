/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, globalPBXLanguage */

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
		const previousAdvice = localStorage.getItem(`previousAdvice${globalPBXLanguage}`);
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
			&& response.message !== undefined) {
			let htmlMessages = '';
			if (response.message.error !== undefined
				&& response.message.error.length > 0) {
				htmlMessages += '<div class="ui icon error message">';
				htmlMessages += '<i class="x icon"></i>';
				htmlMessages += '<div class="content">';
				htmlMessages += `<div class="header">${globalTranslate.adv_MessagesHeaderError}</div>`;
				htmlMessages += '<ul class="list">';
				$.each(response.message.error, (key, value) => {
					htmlMessages += `<li>${value}</li>`;
				});
				htmlMessages += '</ul>';
				htmlMessages += '</div>';
				htmlMessages += '</div>';
			} else if (response.message.warning !== undefined
				&& response.message.warning.length > 0) {
				htmlMessages += '<div class="ui icon warning message">';
				htmlMessages += '<i class="warning icon"></i>';
				htmlMessages += '<div class="content">';
				htmlMessages += `<div class="header">${globalTranslate.adv_MessagesHeader}</div>`;
				htmlMessages += '<ul class="list">';
				$.each(response.message.warning, (key, value) => {
					htmlMessages += `<li>${value}</li>`;
				});
				htmlMessages += '</ul>';
				htmlMessages += '</div>';
				htmlMessages += '</div>';
			} else if (response.message.info !== undefined
				&& response.message.info.length > 0) {
				htmlMessages += '<div class="ui icon info message">';
				htmlMessages += '<i class="info icon"></i>';
				htmlMessages += '<div class="content">';
				htmlMessages += `<div class="header">${globalTranslate.adv_MessagesHeader}</div>`;
				htmlMessages += '<ul class="list">';
				$.each(response.message.info, (key, value) => {
					htmlMessages += `<li>${value}</li>`;
				});
				htmlMessages += '</ul>';
				htmlMessages += '</div>';
				htmlMessages += '</div>';
			}
			advicesWorker.$advices.html(htmlMessages);
			localStorage.setItem(`previousAdvice${globalPBXLanguage}`, htmlMessages);

			// Проверим есть ли обновление системы
			$('a[href="/admin-cabinet/update/index/"] > i').removeClass('loading');
			if (response.message.info !== undefined
				&& response.message.info.length > 0) {
				$.each(response.message.info, (key, value) => {
					if (value.indexOf('/admin-cabinet/update/index/') > -1) {
						$('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
					}
				});
			}
		} else if (response.success === true
			&& response.message !== undefined
			&& response.message.length === 0) {
			localStorage.removeItem(`previousAdvice${globalPBXLanguage}`);
		}
	},
};

$(document).ready(() => {
	advicesWorker.initialize();
});
