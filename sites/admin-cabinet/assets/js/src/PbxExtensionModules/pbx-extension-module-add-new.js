/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global UserMessage, globalTranslate, PbxApi, upgradeStatusLoopWorker, mergingCheckWorker */

/**
 * Process push to button install new module from ZIP file
 *
 * @type {{checkStatusFileMerging(*=): void, uploadInProgress: boolean, initialize(): void, $uploadButton: (*|jQuery|HTMLElement), $progressBar: (*|jQuery|HTMLElement), $progressBarLabel: (*|jQuery), cbResumableUploadFile(*, *): void}}
 */
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


$(document).ready(() => {
	addNewExtension.initialize();
});
