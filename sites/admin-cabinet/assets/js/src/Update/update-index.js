/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalPBXVersion, globalTranslate,
globalWebAdminLanguage, globalPBXVersion, showdown, UserMessage */

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
		PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
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


const upgradeStatusLoopWorker = {
	timeOut: 1000,
	timeOutHandle: '',
	iterations: 0,
	initialize() {
		upgradeStatusLoopWorker.iterations = 0;
		upgradeStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		upgradeStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		PbxApi.SystemGetFirmwareDownloadStatus(upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
	},
	cbRefreshUpgradeStatus(response) {
		upgradeStatusLoopWorker.iterations += 1;
		upgradeStatusLoopWorker.timeoutHandle =
			window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
		if (response.length === 0 || response === false) return;
		if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
			$('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
		} else if (response.d_status === 'DOWNLOAD_COMPLETE') {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
			$('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
			$('i.loading.redo').addClass('sync').removeClass('redo');
			PbxApi.SystemUpgrade(response.filePath, updatePBX.cbAfterStartUpdate);
		} else if (response.d_status === 'DOWNLOAD_ERROR') {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
			UserMessage.showMultiString(globalTranslate.upd_DownloadUpgradeError);
			$('i.loading.redo').addClass('redo').removeClass('loading');
		}
	},
};


const updatePBX = {
	$formObj: $('#upgrade-form'),
	$submitButton: $('#submitbutton'),
	$progressBar: $('#upload-progress-bar'),
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	currentVersion: globalPBXVersion,
	$restoreModalForm: $('#update-modal-form'),
	upgradeInProgress: false,
	converter: new showdown.Converter(),
	initialize() {
		updatePBX.$restoreModalForm.modal();
		updatePBX.$submitButton.addClass('disabled');
		$('input:text, .ui.button', '.ui.action.input').on('click', (e) => {
			$('input:file', $(e.target).parents()).click();
		});

		$('input:file', '.ui.action.input').on('change', (e) => {
			if (e.target.files[0] !== undefined) {
				const filename = e.target.files[0].name;
				$('input:text', $(e.target).parent()).val(filename);
				updatePBX.$submitButton.removeClass('disabled');
			}
		});
		updatePBX.$submitButton.on('click', (e) => {
			e.preventDefault();
			if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;

			updatePBX.$formObj
				.form({
					on: 'blur',
					fields: updatePBX.validateRules,
					onSuccess() {
						updatePBX.$restoreModalForm
							.modal({
								closable: false,
								onDeny: () => true,
								onApprove: () => {
									updatePBX.$submitButton.addClass('loading');
									updatePBX.upgradeInProgress = true;
									const data = $('input:file')[0].files[0];
									PbxApi.SystemUploadFile(data,updatePBX.cbResumableUploadFile);
									return true;
								},
							})
							.modal('show');
					},
				});
			updatePBX.$formObj.form('validate form');
		});
		const requestData = {
			TYPE: 'FIRMWARE',
			PBXVER: globalPBXVersion,
			LANGUAGE: globalWebAdminLanguage,
		};
		$.api({
			url: 'https://update.askozia.ru',
			on: 'now',
			method: 'POST',
			data: requestData,
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.result === 'SUCCESS';
			},
			onSuccess(response) {
				const currentVerison = updatePBX.currentVersion.replace(/\D/g, '');
				response.firmware.forEach((obj) => {
					const version = obj.version.replace(/\D/g, '');
					if (parseInt(version, 10) > parseInt(currentVerison, 10)) {
						updatePBX.AddNewVersionInformation(obj);
					}
				});

				$('a.redo').on('click', (e) => {
					e.preventDefault();
					if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
					updatePBX.$restoreModalForm
						.modal({
							closable: false,
							onDeny: () => true,
							onApprove: () => {
								const params = [];
								const $aLink = $(e.target).closest('a');
								params.updateLink = $aLink.attr('href');
								params.md5 = $aLink.attr('data-md5');
								params.size = $aLink.attr('data-size');
								$aLink.find('i').addClass('loading');
								updatePBX.upgradeInProgress = true;
								PbxApi.SystemDownloadNewFirmware(params, updatePBX.cbAfterStartDownloadFirmware);
								return true;
							},
						})
						.modal('show');
				});
			},
		});
	},
	/**
	 * Upload file by chunks
	 * @param response
	 */
	cbResumableUploadFile(action, params){
		switch (action) {
			case 'fileSuccess':
				updatePBX.checkStatusFileMerging(params.response);
				break;
			case 'uploadStart':
				updatePBX.$submitButton.addClass('loading');
				updatePBX.$progressBar.show();
				updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
				break;
			case 'progress':
				updatePBX.$progressBar.progress({
					percent: parseInt(params.percent, 10),
				});
				break;
			case 'error':
				updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
				updatePBX.$submitButton.removeClass('loading');
				UserMessage.showMultiString(globalTranslate.upd_UploadError);
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
			UserMessage.showMultiString(`${globalTranslate.upd_UploadError}`);
			return;
		}
		const json = JSON.parse(response);
		if (json === undefined || json.data === undefined) {
			UserMessage.showMultiString(`${globalTranslate.upd_UploadError}`);
			return;
		}
		const fileID = json.data.upload_id;
		const filePath = json.data.filename;
		mergingCheckWorker.initialize(fileID, filePath);
	},

	/**
	 * Callback after start PBX upgrading
	 * @param response
	 */
	cbAfterStartUpdate(response) {
		if (response.length === 0 || response === false) {
			UserMessage.showMultiString(globalTranslate.upd_UpgradeError);
		} else {
			updatePBX.$submitButton.removeClass('loading');
		}
	},
	/**
	 * After start online upgrade we have to wait an answer,
	 * and then start status check worker
	 */
	cbAfterStartDownloadFirmware(response) {
		if (response === true) {
			upgradeStatusLoopWorker.initialize();
		} else {
			updatePBX.upgradeInProgress = false;
			$('i.loading.redo').removeClass('loading');
		}
	},
	/**
	 * Add new block of update information on page
	 */
	AddNewVersionInformation(obj) {
		$('#online-updates-block').show();
		let markdownText = decodeURIComponent(obj.description);
		markdownText = markdownText.replace(/<br>/g, '\r');
		markdownText = markdownText.replace(/<br >/g, '\r');
		markdownText = markdownText.replace(/\* \*/g, '*');
		markdownText = markdownText.replace(/\*\*/g, '*');
		const html = updatePBX.converter.makeHtml(markdownText);
		const dymanicRow = `
			<tr class="update-row">
			<td class="center aligned">${obj.version}</td>
			<td>${html}</td>
			<td class="right aligned collapsing">
    		<div class="ui small basic icon buttons action-buttons">
    			<a href="${obj.href}" class="ui button redo popuped" 
    				data-content = "${globalTranslate.bt_ToolTipUpgradeOnline}"
					data-md5 ="${obj.md5}" data-size ="${obj.size}">
					<i class="icon redo blue"></i>
					<span class="percent"></span>
				</a>
				<a href="${obj.href}" class="ui button download popuped" 
					data-content = "${globalTranslate.bt_ToolTipDownload}"
					data-md5 ="${obj.md5}" data-size ="${obj.size}">
					<i class="icon download blue"></i>
				</a>
    		</div>   
	</tr>`;
		$('#updates-table tbody').append(dymanicRow);
		$('a.popuped').popup();
	},
};


$(document).ready(() => {
	updatePBX.initialize();
});

