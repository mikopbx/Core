/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage */

const mergingCheckWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	fileID: null,
	filePath: '',
	initialize(fileID, filePath) {
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
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadError);
			UserMessage.showMultiString(globalTranslate.upd_UploadError);
			updatePBX.$submitButton.removeClass('loading');
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		}
		if (response === undefined || Object.keys(response).length === 0) {
			mergingCheckWorker.errorCounts += 1;
			return;
		}
		if (response.d_status === 'UPLOAD_COMPLETE') {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
			PbxApi.SystemUpgrade(mergingCheckWorker.filePath, updatePBX.cbAfterStartUpdate);
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		} else if (response.d_status !== undefined) {
			mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
			mergingCheckWorker.errorCounts = 0;
		} else {
			mergingCheckWorker.errorCounts += 1;
		}
	},
};