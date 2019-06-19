/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global PbxApi, ConfigWorker, globalRootUrl */

const backupCreateWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	$submitButton: $('#submitbutton'),
	$stopCreateBackup: $('#stopbackupbutton'),
	waitBackupId: '',
	$progressBar: $('#backup-progress-bar'),
	backupIsPreparing: false,
	initialize(waitBackupId) {
		backupCreateWorker.waitBackupId = waitBackupId;
		// Запустим обновление статуса создания резервной копии
		backupCreateWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(backupCreateWorker.timeoutHandle);
		backupCreateWorker.worker();
	},
	worker() {
		PbxApi.BackupGetFilesList(backupCreateWorker.cbAfterGetFiles);
		backupCreateWorker.timeoutHandle = window.setTimeout(
			backupCreateWorker.worker,
			backupCreateWorker.timeOut,
		);
	},
	cbAfterGetFiles(response) {
		if (response.length === 0 || response === false) {
			window.clearTimeout(backupCreateWorker.timeoutHandle);
			backupCreateWorker.$submitButton.show();
			backupCreateWorker.$submitButton.removeClass('loading');
			backupCreateWorker.$stopCreateBackup.hide();
		} else {
			// ["0": {
			// 		"date": "1530715058",
			// 		"size": 13.66,
			// 		"progress": 10,
			// 		"total": 32,
			// 		"config": {
			// 			"backup-config": "1",
			// 			"backup-records": "1",
			// 			"backup-cdr": "1",
			// 			"backup-sound-files": "1"
			// 		},
			// 		"pid": "",
			// 		"id": "backup_1530715058"
			// }]
			let percentOfTotal = 0;
			$.each(response, (key, value) => {
				if (backupCreateWorker.waitBackupId === '' && value.pid.length > 0) {
					backupCreateWorker.waitBackupId = value.id;
				}
				if (backupCreateWorker.waitBackupId === value.id) {
					backupCreateWorker.$submitButton.hide();
					backupCreateWorker.$stopCreateBackup
						.attr('data-value', backupCreateWorker.waitBackupId)
						.show();
					percentOfTotal = 100 * (value.progress / value.total);

					backupCreateWorker.$progressBar.progress({
						duration: value.progress,
						total: value.total,
						percent: parseInt(percentOfTotal, 10),
						text: {
							active: '{value} of {total} done',
						},
					});
					if (value.total === value.progress && backupCreateWorker.backupIsPreparing) {
						window.location = `${globalRootUrl}/backup/index`;
					}
					backupCreateWorker.backupIsPreparing = (value.pid.length > 0);
				}
			});
			if (backupCreateWorker.backupIsPreparing === false) {
				backupCreateWorker.$submitButton.show();
				backupCreateWorker.$stopCreateBackup.hide();
				backupCreateWorker.$submitButton.removeClass('loading');
				window.clearTimeout(backupCreateWorker.timeoutHandle);
			}
		}
	},
};

const createBackup = {
	$formObj: $('#backup-create-form'),
	$submitButton: $('#submitbutton'),
	$stopCreateBackup: $('#stopbackupbutton'),
	initialize() {
		createBackup.$submitButton.addClass('loading');
		createBackup.$stopCreateBackup.hide();
		$('.checkbox').checkbox();
		createBackup.$submitButton.on('click', (e) => {
			e.preventDefault();
			createBackup.$formObj
				.form({
					on: 'blur',
					fields: createBackup.validateRules,
					onSuccess() {
						const formData = createBackup.$formObj.form('get values');
						const sendData = {};
						Object.keys(formData).forEach((key) => {
							sendData[key] = (formData[key] === 'on') ? '1' : '0';
						});
						backupCreateWorker.backupIsPreparing = true;
						createBackup.$submitButton.addClass('loading');
						PbxApi.BackupStart(sendData, createBackup.cbAfterSendForm);
						ConfigWorker.stopConfigWorker();
					},
				});
			createBackup.$formObj.form('validate form');
		});
		createBackup.$stopCreateBackup.on('click', (e) => {
			e.preventDefault();
			const id = $(e.target).closest('button').attr('data-value');
			PbxApi.BackupStop(id, createBackup.cbAfterSendForm);
		});
		backupCreateWorker.initialize('');
		PbxApi.BackupGetEstimatedSize(createBackup.cbAfterGetEstimatedSize);
	},
	cbAfterSendForm(response) {
		if (response.length === 0 || response === false) {
			createBackup.$submitButton.removeClass('loading');
		} else {
			backupCreateWorker.initialize(response);
		}
	},
	cbAfterGetEstimatedSize(response) {
		if (response.length === 0 || response === false) return;
		$.each(response, (key, value) => {
			const $el = $(`#${key}`).parent().find('label');
			if ($el !== undefined) {
				$el.html(`${$el.html()} ( ${value} Mb )`);
			}
		});
	},
};


$(document).ready(() => {
	createBackup.initialize();
});

