/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global PbxApi, ConfigWorker, globalTranslate, globalRootUrl */


const restoreWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	$submitButton: $('#submitbutton'),
	waitRestoreId: undefined,
	$progressBar: $('#restore-progress-bar'),
	restoreIsProcessing: false,
	$formObj: $('#backup-restore-form'),
	formAlreadyBuilded: false,
	initialize(waitRestoreId) {
		restoreWorker.waitRestoreId = waitRestoreId;
		// Запустим обновление статуса восстановления резервной копии
		restoreWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(restoreWorker.timeoutHandle);
		restoreWorker.worker();
	},
	worker() {
		PbxApi.BackupGetFilesList(restoreWorker.cbAfterGetFiles);
		restoreWorker.timeoutHandle = window.setTimeout(restoreWorker.worker, restoreWorker.timeOut);
	},
	cbAfterGetFiles(response) {
		if (response.length === 0 || response === false) {
			window.clearTimeout(restoreWorker.timeoutHandle);
			restoreWorker.$submitButton.removeClass('loading');
		} else {
			let percentOfTotal = 0;
			$.each(response, (key, value) => {
				restoreWorker.restoreIsProcessing = (value.pid_recover.length > 0) || restoreWorker.restoreIsProcessing;
				if (restoreWorker.waitRestoreId === undefined && value.pid_recover.length > 0) {
					restoreWorker.waitRestoreId = value.id;
				}
				if (restoreWorker.waitRestoreId === value.id && restoreWorker.restoreIsProcessing > 0) {
					percentOfTotal = 100 * (value.progress_recover / value.total);

					restoreWorker.$progressBar.progress({
						duration: value.progress_recover,
						total: value.total,
						percent: parseInt(percentOfTotal, 10),
						text: {
							active: '{value} of {total} done',
						},
					});

					if (value.progress_recover === value.total) {
						restoreWorker.$submitButton.removeClass('loading');
					}
				}

				// Построим форму с чекбоксами
				if (restoreWorker.waitRestoreId === value.id) {
					if (!restoreWorker.formAlreadyBuilded) {
						$.each(value.config, (configKey, configValue) => {
							if (configValue === '1') {
								const locLabel = `bkp_${configKey}`;
								let html = '<div class="ui segment"><div class="field"><div class="ui toggle checkbox">';
								html += `<input type="checkbox" name="${configKey}" checked = "checked" class="hidden"/>`;
								html += `<label>${globalTranslate[locLabel]}</label>`;
								html += '</div></div></div>';
								restoreWorker.$formObj.prepend(html);
							}
						});
						$('.checkbox').checkbox({
							onChange: restoreWorker.onChangeCheckbox,
						});
						restoreWorker.formAlreadyBuilded = true;
					}
				}
			});
			if (restoreWorker.restoreIsProcessing === false) {
				window.clearTimeout(restoreWorker.timeoutHandle);
			}
		}
	},
	/**
	 * При выключении всех чекбоксов отключить кнопку
	 */
	onChangeCheckbox() {
		const formResult = restoreWorker.$formObj.form('get values');
		const options = {};
		$.each(formResult, (key, value) => {
			if (value) {
				options[key] = '1';
			}
		});
		if (Object.entries(options).length === 0) {
			restoreWorker.$submitButton.addClass('disabled');
		} else {
			restoreWorker.$submitButton.removeClass('disabled');
		}
	},
};

const restoreBackup = {
	$progressBar: $('#restore-progress-bar'),
	$formObj: $('#backup-restore-form'),
	$submitButton: $('#submitbutton'),
	$deleteButton: $('#deletebutton'),
	$restoreModalForm: $('#restore-modal-form'),
	currentBackupId: window.location.pathname.split('/')[4],
	initialize() {
		restoreBackup.$restoreModalForm.modal();
		restoreBackup.$submitButton.on('click', (e) => {
			e.preventDefault();
			if (restoreWorker.restoreIsProcessing) return;
			const formResult = restoreBackup.$formObj.form('get values');
			const options = {};
			$.each(formResult, (key, value) => {
				if (value) {
					options[key] = '1';
				}
			});
			if (Object.entries(options).length > 0) {
				const params = {
					id: restoreBackup.currentBackupId,
					options,
				};
				restoreBackup.$restoreModalForm
					.modal({
						closable: false,
						onDeny: () => true,
						onApprove: () => {
							restoreWorker.$submitButton.addClass('loading');
							restoreWorker.restoreIsProcessing = true;
							ConfigWorker.stopConfigWorker();
							PbxApi.BackupRecover(params, restoreBackup.cbAfterRestore);
							return true;
						},
					})
					.modal('show');
			}
		});
		restoreBackup.$deleteButton.on('click', (e) => {
			e.preventDefault();
			if (restoreWorker.restoreIsProcessing) return;
			PbxApi.BackupDeleteFile(restoreBackup.currentBackupId, restoreBackup.cbAfterDeleteFile);
		});
		restoreWorker.initialize(restoreBackup.currentBackupId);
	},
	cbAfterRestore() {
		restoreWorker.initialize(restoreBackup.currentBackupId);
	},
	cbAfterDeleteFile(response) {
		if (response) {
			window.location = `${globalRootUrl}backup/index`;
		}
	},
};


$(document).ready(() => {
	restoreBackup.initialize();
});

