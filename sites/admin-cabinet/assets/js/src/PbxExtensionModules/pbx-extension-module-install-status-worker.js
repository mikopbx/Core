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

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage */

/**
 * Monitors status of module installation
 *
 */
const installStatusLoopWorker = {
	timeOut: 1000,
	timeOutHandle: '',
	filePath: '',
	iterations: 0,
	oldPercent: '0',
	needEnableAfterInstall: false,
	initialize(filePath, needEnable=false) {
		installStatusLoopWorker.filePath = filePath;
		installStatusLoopWorker.iterations = 0;
		installStatusLoopWorker.needEnableAfterInstall = needEnable;
		installStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(installStatusLoopWorker.timeoutHandle);
		installStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(installStatusLoopWorker.timeoutHandle);
		PbxApi.SystemGetModuleInstallationStatus(
			installStatusLoopWorker.filePath,
			installStatusLoopWorker.cbAfterReceiveNewStatus
		);
	},
	cbAfterReceiveNewStatus(result, response) {
		installStatusLoopWorker.iterations += 1;
		installStatusLoopWorker.timeoutHandle =
			window.setTimeout(installStatusLoopWorker.worker, installStatusLoopWorker.timeOut);
		// Check installation status
		if (result === false
			&& installStatusLoopWorker.iterations < 50) {
			window.clearTimeout(installStatusLoopWorker.timeoutHandle);
		} else if (installStatusLoopWorker.iterations > 50
			|| response.i_status === 'INSTALLATION_ERROR'
			|| response.i_status === 'PROGRESS_FILE_NOT_FOUND'
		) {
			window.clearTimeout(installStatusLoopWorker.timeoutHandle);
			let errorMessage = (response.i_error !== undefined) ? response.i_error : '';
			errorMessage = errorMessage.replace(/\n/g, '<br>');
			UserMessage.showMultiString(errorMessage, globalTranslate.ext_InstallationError);
		} else if (response.i_status === 'INSTALLATION_IN_PROGRESS') {
			if (installStatusLoopWorker.oldPercent !== response.i_status_progress) {
				installStatusLoopWorker.iterations = 0;
			}
			installStatusLoopWorker.oldPercent = response.d_status_progress;
		} else if (response.i_status === 'INSTALLATION_COMPLETE') {
			if (installStatusLoopWorker.needEnableAfterInstall) {
				PbxApi.SystemEnableModule(
					installStatusLoopWorker.moduleUniqid,
					() => {
						window.location = `${globalRootUrl}pbx-extension-modules/index/`;
					},
				);
			} else {
				window.location = `${globalRootUrl}pbx-extension-modules/index/`;
			}
			window.clearTimeout(installStatusLoopWorker.timeoutHandle);
		}
	},
};
