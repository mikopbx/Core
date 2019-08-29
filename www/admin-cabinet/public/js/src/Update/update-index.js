/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global PbxApi, globalPBXVersion, globalTranslate, ConfigWorker,
globalPBXLicense, globalPBXLanguage, globalPBXVersion, showdown, UserMessage */

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
		PbxApi.SystemGetUpgradeStatus(upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
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
		} else if (response.d_status === 'DOWNLOAD_ERROR') {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
			UserMessage.showError(globalTranslate.upd_DownloadUpgradeError);
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
									ConfigWorker.stopConfigWorker();
									updatePBX.$submitButton.addClass('loading');
									updatePBX.upgradeInProgress = true;
									const data = $('input:file')[0].files[0];
									PbxApi.SystemUpgrade(data, updatePBX.cbAfterUploadFile);
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
			LICENSE: globalPBXLicense,
			PBXVER: globalPBXVersion,
			LANGUAGE: globalPBXLanguage,
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
					&& response.result.toUpperCase() === 'SUCCESS';
			},
			onSuccess(response) {
				const currentVerison = updatePBX.currentVersion.replace(/\D/g, '');
				response.firmware.forEach((obj) => {
					const version = obj.version.replace(/\D/g, '');
					if (version > currentVerison) {
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
								ConfigWorker.stopConfigWorker();
								const params = [];
								const $aLink = $(e.target).closest('a');
								params.updateLink = $aLink.attr('href');
								params.md5 = $aLink.attr('data-md5');
								params.size = $aLink.attr('data-size');
								$aLink.find('i').addClass('loading');
								updatePBX.upgradeInProgress = true;
								PbxApi.SystemUpgradeOnline(params);
								upgradeStatusLoopWorker.initialize();
								return true;
							},
						})
						.modal('show');
				});
			},
		});
	},
	cbAfterUploadFile(response) {
		if (response.length === 0 || response === false) {
			updatePBX.$submitButton.removeClass('loading');
			updatePBX.upgradeInProgress = false;
			UserMessage.showError(globalTranslate.upd_UploadError);
		} else if (response.function === 'upload_progress') {
			updatePBX.$progressBar.progress({
				percent: parseInt(response.percent, 10),
			});
			if (response.percent < 100) {
				updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
			} else {
				updatePBX.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
			}

		}
	},
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

