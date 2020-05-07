/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalTranslate, Resumable, globalRootUrl, UserMessage */

const mergingCheckWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	fileID: null,
	isXML: false,
	initialize(fileID, isXML = false) {
		// Запустим обновление статуса провайдера
		mergingCheckWorker.fileID = fileID;
		mergingCheckWorker.isXML = isXML;
		mergingCheckWorker.restartWorker(fileID);
	},
	restartWorker() {
		window.clearTimeout(mergingCheckWorker.timeoutHandle);
		mergingCheckWorker.worker();
	},
	worker() {
		PbxApi.BackupStatusUpload(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
		mergingCheckWorker.timeoutHandle = window.setTimeout(
			mergingCheckWorker.worker,
			mergingCheckWorker.timeOut,
		);
	},
	cbAfterResponse(response) {
		if (mergingCheckWorker.errorCounts > 10) {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadError);
			UserMessage.showError(globalTranslate.bkp_UploadError);
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		}
		if (response === undefined || Object.keys(response).length === 0) {
			mergingCheckWorker.errorCounts += 1;
			return;
		}
		if (response.status_upload === 'COMPLETE') {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadComplete);
			if (mergingCheckWorker.isXML) {
				mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_SettingsRestoredWaitReboot);
				PbxApi.SystemReboot();
			} else {
				window.location.reload();
			}
		} else if (response.status_upload !== undefined) {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadProcessingFiles);
			mergingCheckWorker.errorCounts = 0;
		} else {
			mergingCheckWorker.errorCounts += 1;
		}
	},

};


const backupIndex = {
	$templateRow: $('#backup-template-row'),
	$dummy: $('#dummy-row'),
	$uploadButton: $('#uploadbtn'),
	$progressBar: $('#upload-progress-bar'),
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	$body: $('body'),
	resumable: null,
	initialize() {
		backupIndex.$progressBar.hide();
		PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
		backupIndex.$body.on('click', 'a.download', (e) => {
			e.preventDefault();
			const id = $(e.target).closest('a').attr('data-value');
			PbxApi.BackupDownloadFile(id);
		});
		backupIndex.$body.on('click', 'a.delete', (e) => {
			e.preventDefault();
			const id = $(e.target).closest('a').attr('data-value');
			PbxApi.BackupDeleteFile(id, backupIndex.cbAfterDeleteFile);
		});
		backupIndex.initializeResumable();
	},

	/**
	 * Коллбек после удаления файла бекапа
	 * @param response
	 */
	cbAfterDeleteFile(response) {
		if (response) {
			window.location = `${globalRootUrl}backup/index`;
		}
	},
	/**
	 * Обработка ответа BackupGetFilesList
	 * @param response
	 */
	cbBackupGetFilesListAfterResponse(response) {
		backupIndex.$dummy.show();
		if (response.length === 0 || response === false) {
			setTimeout(() => {
				PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
			}, 3000);
			return;
		}
		backupIndex.$dummy.hide();
		$.each(response, (key, value) => {
			let $newRow = $(`tr#${value.id}`);
			if ($newRow.length > 0) {
				$newRow.remove();
			}
			$newRow = backupIndex.$templateRow.clone();
			$newRow.attr('id', value.id);
			$newRow.addClass('backupIndex-file');
			const arhDate = new Date(1000 * value.date);
			$newRow.find('.create-date').html(arhDate.toLocaleString());
			$newRow.find('.file-size').html(`${value.size} MB`);
			if (value.pid.length + value.pid_recover.length > 0) {
				$newRow.find('a').each((index, obj) => {
					$(obj).remove();
				});
				const percentOfTotal = 100 * (value.progress / value.total);
				$newRow.find('.status').html(`<i class="spinner loading icon"></i> ${parseInt(percentOfTotal, 10)} %`);
				setTimeout(() => {
					PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
				}, 3000);
			} else {
				$newRow.find('a').each((index, obj) => {
					$(obj).attr('href', $(obj).attr('href') + value.id);
					$(obj).attr('data-value', value.id);
				});
				$newRow.find('.status').html('<i class="archive icon"></i>');
			}
			$newRow.appendTo('#existing-backup-files-table');
		});
	},
	/**
	 * Подключение обработчкика загрузки файлов по частям
	 */
	initializeResumable() {
		const r = new Resumable({
			target: PbxApi.backupUpload,
			testChunks: false,
			chunkSize: 30 * 1024 * 1024,
			maxFiles: 1,
			fileType: ['img', 'zip', 'xml'],
		});

		r.assignBrowse(document.getElementById('uploadbtn'));
		r.on('fileSuccess', (file, response) => {
			console.debug('fileSuccess', file);
			let isXML = false;
			if (file.file !== undefined && file.file.type !== undefined) {
				isXML = file.file.type === 'text/xml';
			}
			backupIndex.checkStatusFileMerging(response, isXML);
			backupIndex.$uploadButton.removeClass('loading');
		});
		r.on('fileProgress', (file) => {
			console.debug('fileProgress', file);
		});
		r.on('fileAdded', (file, event) => {
			r.upload();
			console.debug('fileAdded', event);
		});
		r.on('fileRetry', (file) => {
			console.debug('fileRetry', file);
		});
		r.on('fileError', (file, message) => {
			console.debug('fileError', file, message);
		});

		r.on('uploadStart', () => {
			console.debug('uploadStart');
			backupIndex.$uploadButton.addClass('loading');
			backupIndex.$progressBar.show();
			backupIndex.$progressBarLabel.text(globalTranslate.bkp_UploadInProgress);
		});
		r.on('complete', () => {
			console.debug('complete');
		});
		r.on('progress', () => {
			console.debug('progress');
			backupIndex.$progressBar.progress({
				percent: 100 * r.progress(),
			});
		});
		r.on('error', (message, file) => {
			console.debug('error', message, file);
			backupIndex.$progressBarLabel.text(globalTranslate.bkp_UploadError);
			backupIndex.$uploadButton.removeClass('loading');
			UserMessage.showError(`${globalTranslate.bkp_UploadError}<br>${message}`);
		});
		r.on('pause', () => {
			console.debug('pause');
		});
		r.on('cancel', () => {
			console.debug('cancel');
		});
	},
	/**
	 * Запуск процесса ожидания склеивания файла после загрузки на сервер
	 *
	 * @param response ответ функции /pbxcore/api/backup/upload
	 */
	checkStatusFileMerging(response, isXML) {
		if (response === undefined || PbxApi.tryParseJSON(response) === false) {
			UserMessage.showError(`${globalTranslate.bkp_UploadError}`);
			return;
		}
		const json = JSON.parse(response);
		if (json === undefined || json.data === undefined) {
			UserMessage.showError(`${globalTranslate.bkp_UploadError}`);
			return;
		}
		const fileID = json.data.backup_id;
		mergingCheckWorker.initialize(fileID, isXML);
	},

};


$(document).ready(() => {
	backupIndex.initialize();
});
