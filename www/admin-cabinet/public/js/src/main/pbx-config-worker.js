/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl, PbxApi */

const ConfigWorker = {
	timeOut: 5000,
	timeOutHandle: '',
	uiResetConfigurationChangesUrl: `${globalRootUrl}configuration-apply/resetConfigurationChanged/{appliedFunction}`,
	uiCheckConfigurationChangesUrl: `${globalRootUrl}configuration-apply/getNewConfigurationChanges`,
	$applyConfigurationButton: $('#apply-configuration-button'),
	$submitButton: $('#submitbutton'),
	stillWorking: false,
	initialize() {
		// Запустим обновление статуса провайдера
		ConfigWorker.restartWorker();
	},
	stopConfigWorker() {
		window.clearTimeout(ConfigWorker.timeoutHandle);
		ConfigWorker.stillWorking = false;
	},
	restartWorker() {
		ConfigWorker.stillWorking = false;
		window.clearTimeout(ConfigWorker.timeoutHandle);
		ConfigWorker.worker();
	},
	worker() {
		if (ConfigWorker.stillWorking) return;
		ConfigWorker.timeoutHandle = window.setTimeout(ConfigWorker.worker, ConfigWorker.timeOut);
		ConfigWorker.stillWorking = true;
		$.api({
			url: ConfigWorker.uiCheckConfigurationChangesUrl,
			on: 'now',
			onSuccess(response) {
				if (response !== undefined && response.changed === true) {
					localStorage.setItem('NeedApplyActions', response.actions);
					// Прпробуем сразу применять после сохранения
					// window.clearTimeout(ConfigWorker.timeoutHandle);
					ConfigWorker.applyConfigurationChanges();
				} else {
					ConfigWorker.$submitButton.removeClass('loading');
				}
				ConfigWorker.stillWorking = false;
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
				ConfigWorker.stillWorking = false;
			},
		});
	},
	cbAfterResponse(appliedFunction) {
		const needApplyActions = localStorage.getItem('NeedApplyActions');
		const newActionsArray = JSON.parse(needApplyActions).filter(e => e !== appliedFunction);
		localStorage.setItem('NeedApplyActions', JSON.stringify(newActionsArray));
		$.api({
			url: ConfigWorker.uiResetConfigurationChangesUrl,
			on: 'now',
			urlData: {
				appliedFunction,
			},
		});
		ConfigWorker.applyConfigurationChanges(); // Выполним следующую итерацию проверки изменений
	},
	applyConfigurationChanges() {
		const needApplyActions = JSON.parse(localStorage.getItem('NeedApplyActions'));
		if (needApplyActions.length > 0) {
			ConfigWorker.$submitButton.addClass('loading');
			const actionName = needApplyActions[0];
			PbxApi[actionName](ConfigWorker.cbAfterResponse);
		} else {
			ConfigWorker.$submitButton.removeClass('loading');
			// window.clearTimeout(ConfigWorker.timeoutHandle);
		}
	},

};


$(document).ready(() => {
	ConfigWorker.initialize();
});
