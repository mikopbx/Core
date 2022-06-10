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

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage, $, globalTranslate */

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
		$('#updatePasswordWindow #savePassword').on('click', advicesWorker.cbOnClickSavePassword);
	},
	restartWorker() {
		window.clearTimeout(advicesWorker.timeoutHandle);
		advicesWorker.worker();
	},
	/**
	 * Отправка формы обновления паролей SSH и Web.
	 */
	cbOnClickSavePassword(){
		$('#updatePasswordWindowResult').hide();
		let errors = '';
		let params = {};
		$.each(['WebAdminPassword', 'SSHPassword'], (key, value) => {
			if(!$(`#updatePasswordWindow #${value}`).is(":visible")){
				return;
			}
			let pass 	= $(`#${value}`).val();
			let passRep 	= $(`#${value}Repeat`).val();
			if( pass !== passRep){
				errors+='<li>'+globalTranslate[`pass_Check${value}DontMatch`]+'</li>';
			}else if(pass.trim() === ''){
				errors+='<li>'+globalTranslate[`pass_Check${value}Empty`]+'</li>';
			}else if(advicesWorker.checkPasswordOk(pass)){
				errors+=`<li>${globalTranslate['pass_Check${value}Simple']}</li>`;
			}else{
				params[value] = pass;
			}
		});
		if(errors.trim() !== ''){
			errors = `<ul class="ui list">${errors}</ul>`;
			advicesWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
		}else{
			advicesWorker.savePasswords(params);
		}
	},
	savePasswords(params){
		$.post('/admin-cabinet/general-settings/save', params, function( data ) {
			if(data.success === false){
				let errors = '';
				if(typeof data.passwordCheckFail !== 'undefined'){
					$.each(data.passwordCheckFail, (key, value) => {
						errors+='<li>'+globalTranslate[`pass_Check${value}Simple`]+'</li>';
					});
				}else{
					errors+='<li>'+globalTranslate['er_InternalServerError']+'</li>';
				}
				if(errors.trim() !== ''){
					advicesWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
				}
			}else{
				$('#updatePasswordWindow').modal({ closable : false, }).modal('hide')
				advicesWorker.restartWorker();
			}
		});
	},
	showPasswordError(header, body){
		$('#updatePasswordWindowResult div').html(header);
		$('#updatePasswordWindowResult p').html(body);
		$('#updatePasswordWindowResult').show();
	},
	checkPasswordOk(password) {
		let check1 = password.match(/[a-z]/) !== null;
		let check2 = password.match(/\d/) !== null;
		let check3 = password.match(/[A-Z]/) !== null;
		return check1 && check2 && check3 && (password.length > 6);
	},
	/**
	 * Обработка события смены языка или данных
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
		sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
		setTimeout(advicesWorker.restartWorker,3000);
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
		PbxApi.AdvicesGetList(advicesWorker.cbAfterResponse);
	},
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
				let needShow = false;
				$("#updatePasswordWindow div.miko-settings-container").hide();
				$.each(response.advices.needUpdate, (key, value) => {
					$(`#updatePasswordWindow #${value}-container`).show();
					needShow = true;
				});
				if(needShow){
					$('#updatePasswordWindow').modal({ closable : false, }).modal('show')
				}
			}

			if (response.advices.error !== undefined
				&& response.advices.error.length > 0) {
				$.each(response.advices.error, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="frown outline red icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small red header">${value}</div>`;
					htmlMessages += '</div>';
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.advices.warning !== undefined
				&& response.advices.warning.length > 0) {
				$.each(response.advices.warning, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="meh outline yellow icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small header">${value}</div>`;
					htmlMessages += '</div>';
					htmlMessages += '</div>';
					countMessages += 1;
				});
			}
			if (response.advices.info !== undefined
				&& response.advices.info.length > 0) {
				$.each(response.advices.info, (key, value) => {
					htmlMessages += '<div class="item">';
					htmlMessages += '<i class="smile outline blue icon"></i>';
					htmlMessages += '<div class="content">';
					htmlMessages += `<div class="ui small header">${value}</div>`;
					htmlMessages += '</div>';
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
