/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, PbxApi, Form, DebuggerInfo */

// custom form validation rule
$.fn.form.settings.rules.username = function (noregister, username) {
	if (username.length === 0 && noregister !== 'on') return false;
	return true;
};

const provider = {
	$formObj: $('#save-provider-form'),
	providerType: $('#providerType').val(),
	validateRules: {
		description: {
			identifier: 'description',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
				},
			],
		},
		host: {
			identifier: 'host',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
				},
			],
		},
		username: {
			identifier: 'username',
			rules: [
				{
					type: 'username[noregister, username]',
					prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
				},
			],
		},
		port: {
			identifier: 'port',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.pr_ValidationProviderPortRange,
				},
			],
		},
	},
	initialize() {
		$('.codecs, .checkbox').checkbox();
		$('.ui.accordion').accordion();
		$('.dropdown').dropdown();
		$('#qualify').checkbox({
			onChange() {
				if ($('#qualify').checkbox('is checked')) {
					$('#qualify-freq').removeClass('disabled');
				} else {
					$('#qualify-freq').addClass('disabled');
				}
			},
		});
		provider.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = provider.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = provider.$formObj;
		switch (provider.providerType) {
			case 'SIP':
				Form.url = `${globalRootUrl}providers/save/sip`;
				break;
			case 'IAX':
				Form.url = `${globalRootUrl}providers/save/iax`;
				break;
			default:
				return;
		}
		Form.validateRules = provider.validateRules;
		Form.cbBeforeSendForm = provider.cbBeforeSendForm;
		Form.cbAfterSendForm = provider.cbAfterSendForm;
		Form.initialize();
	},
};

const providersStatusLoopWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	$status: $('#status'),
	initialize() {
		// Запустим обновление статуса провайдера
		DebuggerInfo.initialize();
		providersStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		providersStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		switch (provider.providerType) {
			case 'SIP':
				PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
				break;
			case 'IAX':
				PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
				break;
			default:
		}
	},
	cbRefreshProvidersStatus(response) {
		providersStatusLoopWorker.timeoutHandle =
			window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
		if (response.length === 0 || response === false) return;
		let htmlTable = '<table class="ui very compact table">';
		$.each(response, (key, value) => {
			htmlTable += '<tr>';
			htmlTable += `<td>${value.id}</td>`;
			htmlTable += `<td>${value.state}</td>`;
			htmlTable += '</tr>';
		});
		htmlTable += '</table>';
		DebuggerInfo.UpdateContent(htmlTable);
		const uniqid = provider.$formObj.form('get value', 'uniqid');
		const result = $.grep(response, (e) => {
			const respid = e.id;
			return respid.toUpperCase() === uniqid.toUpperCase();
		});
		if (result.length === 0) {
			// not found
			providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
		} else if (result[0] !== undefined && result[0].state.toUpperCase() === 'REGISTERED') {
			providersStatusLoopWorker.$status.removeClass('grey').removeClass('yellow').addClass('green');
		} else if (result[0] !== undefined && result[0].state.toUpperCase() === 'OK') {
			providersStatusLoopWorker.$status.removeClass('grey').removeClass('green').addClass('yellow');
		} else {
			providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
		}

		if (providersStatusLoopWorker.$status.hasClass('green')) {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_Online);
		} else if (providersStatusLoopWorker.$status.hasClass('yellow')) {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_WithoutRegistration);
		} else {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_Offline);
		}
	},
};


$(document).ready(() => {
	provider.initialize();
	providersStatusLoopWorker.initialize();
});
