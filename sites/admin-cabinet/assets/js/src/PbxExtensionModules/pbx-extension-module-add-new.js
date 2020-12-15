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

/* global UserMessage, globalTranslate, PbxApi, upgradeStatusLoopWorker */ 

const addNewExtension = {
	$uploadButton: $('#add-new-button'),
	$progressBar: $('#upload-progress-bar'),
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	uploadInProgress: false,
	initialize() {
		addNewExtension.$progressBar.hide();
		PbxApi.SystemUploadFileAttachToBtn('add-new-button',['zip'], addNewExtension.cbResumableUploadFile);
	},
	/**
	 * Upload file by chunks
	 * @param action
	 * @param params
	 */
	cbResumableUploadFile(action, params){
		switch (action) {
			case 'fileSuccess':
				addNewExtension.checkStatusFileMerging(params.response);
				break;
			case 'uploadStart':
				addNewExtension.uploadInProgress = true;
				addNewExtension.$uploadButton.addClass('loading');
				addNewExtension.$progressBar.show();
				addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
				break;
			case 'progress':
				addNewExtension.$progressBar.progress({
					percent: parseInt(params.percent, 10),
				});
				break;
			case 'error':
				addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadError);
				addNewExtension.$uploadButton.removeClass('loading');
				UserMessage.showMultiString(globalTranslate.ext_UploadError);
				break;
			default:
		}
	},
	/**
	 * Wait for file ready to use
	 *
	 * @param response ответ функции /pbxcore/api/upload/status
	 */
	checkStatusFileMerging(response) {
		if (response === undefined || PbxApi.tryParseJSON(response) === false) {
			UserMessage.showMultiString(`${globalTranslate.ext_UploadError}`);
			return;
		}
		const json = JSON.parse(response);
		if (json === undefined || json.data === undefined) {
			UserMessage.showMultiString(`${globalTranslate.ext_UploadError}`);
			return;
		}
		const fileID = json.data.upload_id;
		const filePath = json.data.filename;
		mergingCheckWorker.initialize(fileID, filePath);
	},

};

const mergingCheckWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	fileID: null,
	filePath: '',
	initialize(fileID, filePath) {
		// Запустим обновление статуса провайдера
		mergingCheckWorker.fileID = fileID;
		mergingCheckWorker.filePath = filePath;
		mergingCheckWorker.restartWorker(fileID);
	},
	restartWorker() {
		window.clearTimeout(mergingCheckWorker.timeoutHandle);
		mergingCheckWorker.worker();
	},
	worker() {
		PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
		mergingCheckWorker.timeoutHandle = window.setTimeout(
			mergingCheckWorker.worker,
			mergingCheckWorker.timeOut,
		);
	},
	cbAfterResponse(response) {
		if (mergingCheckWorker.errorCounts > 10) {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadError);
			UserMessage.showMultiString(response, globalTranslate.ext_UploadError);
			addNewExtension.$uploadButton.removeClass('loading');
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		}
		if (response === undefined || Object.keys(response).length === 0) {
			mergingCheckWorker.errorCounts += 1;
			return;
		}
		if (response.d_status === 'UPLOAD_COMPLETE') {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_InstallationInProgress);
			PbxApi.SystemInstallModule(mergingCheckWorker.filePath, mergingCheckWorker.cbAfterModuleInstall);
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		} else if (response.d_status !== undefined) {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
			mergingCheckWorker.errorCounts = 0;
		} else {
			mergingCheckWorker.errorCounts += 1;
		}
	},
	cbAfterModuleInstall(response){
		if (response===true){
			window.location.reload();
		} else {
			UserMessage.showMultiString(response, globalTranslate.ext_InstallationError);
			addNewExtension.$uploadButton.removeClass('loading');
		}
	},
};

$(document).ready(() => {
	addNewExtension.initialize();
});
