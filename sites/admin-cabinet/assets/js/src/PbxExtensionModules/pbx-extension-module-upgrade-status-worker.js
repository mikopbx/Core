/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage, extensionModules */

/**
 * Мониторинг статуса обновления или установки модуля
 *
 */
const upgradeStatusLoopWorker = {
	timeOut: 1000,
	timeOutHandle: '',
	moduleUniqid: '',
	iterations: 0,
	oldPercent: '0',
	needEnableAfterInstall: false,
	initialize(uniqid, needEnable) {
		upgradeStatusLoopWorker.moduleUniqid = uniqid;
		upgradeStatusLoopWorker.iterations = 0;
		upgradeStatusLoopWorker.needEnableAfterInstall = needEnable;
		upgradeStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		upgradeStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		PbxApi.FilesModuleDownloadStatus(
			upgradeStatusLoopWorker.moduleUniqid,
			upgradeStatusLoopWorker.cbRefreshModuleStatus,
			upgradeStatusLoopWorker.restartWorker,
		);
	},
	cbRefreshModuleStatus(response) {
		upgradeStatusLoopWorker.iterations += 1;
		upgradeStatusLoopWorker.timeoutHandle =
			window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
		// Check download status
		if (response === false
			&& upgradeStatusLoopWorker.iterations < 50) {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		} else if (upgradeStatusLoopWorker.iterations > 50
			|| response.d_status === 'DOWNLOAD_ERROR'
			|| response.d_status === 'NOT_FOUND'
		) {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
			let errorMessage = (response.d_error !== undefined) ? response.d_error : '';
			errorMessage = errorMessage.replace(/\n/g, '<br>');
			UserMessage.showMultiString(errorMessage, globalTranslate.ext_UpdateModuleError);
			$(`#${upgradeStatusLoopWorker.moduleUniqid}`).find('i').removeClass('loading');
			$('.new-module-row').find('i').addClass('download').removeClass('redo');
			$('a.button').removeClass('disabled');
		} else if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
			if (upgradeStatusLoopWorker.oldPercent !== response.d_status_progress) {
				upgradeStatusLoopWorker.iterations = 0;
			}
			$('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
			upgradeStatusLoopWorker.oldPercent = response.d_status_progress;
		} else if (response.d_status === 'DOWNLOAD_COMPLETE') {
			$('i.loading.redo').closest('a').find('.percent').text('100%');
			PbxApi.SystemInstallModule(response.filePath, upgradeStatusLoopWorker.cbAfterModuleInstall);
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		}
	},
	cbAfterModuleInstall(response) {
		if (response.length === 0 || response === false) {
			UserMessage.showMultiString(response,globalTranslate.ext_InstallationError);
		} else {
			// Check installation status
			$('a.button').removeClass('disabled');
			if (upgradeStatusLoopWorker.needEnableAfterInstall) {
				PbxApi.SystemEnableModule(
					upgradeStatusLoopWorker.moduleUniqid,
					() => {
						extensionModules.reloadModuleAndPage(upgradeStatusLoopWorker.moduleUniqid);
					},
				);
			} else {
				window.location = `${globalRootUrl}pbx-extension-modules/index/`;
			}
		}

	},
};
