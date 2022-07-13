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
/* global sessionStorage, globalRootUrl, Config, Resumable */

const PbxApi = {
	pbxPing: `${Config.pbxUrl}/pbxcore/api/system/ping`,
	pbxGetHistory: `${Config.pbxUrl}/pbxcore/api/cdr/get_history`, // Запрос истории звонков POST -d '{"number": "212", "start":"2018-01-01", "end":"2019-01-01"}'
	pbxGetSipRegistry: `${Config.pbxUrl}/pbxcore/api/sip/getRegistry`,
	pbxGetIaxRegistry: `${Config.pbxUrl}/pbxcore/api/iax/getRegistry`,
	pbxGetPeersStatus: `${Config.pbxUrl}/pbxcore/api/sip/getPeersStatuses`,
	pbxGetPeerStatus: `${Config.pbxUrl}/pbxcore/api/sip/getSipPeer`,
	pbxGetActiveCalls: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveCalls`, // Получить активные звонки,
	pbxGetActiveChannels: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveChannels`, // Получить активные звонки,
	syslogPrepareLog: `${Config.pbxUrl}/pbxcore/api/syslog/prepareLog`,
	syslogStartLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/startLog`,
	syslogStopLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/stopLog`,
	syslogGetLogsList: `${Config.pbxUrl}/pbxcore/api/syslog/getLogsList`, //curl http://127.0.0.1/pbxcore/api/system/getLogsList
	syslogGetLogFromFile: `${Config.pbxUrl}/pbxcore/api/syslog/getLogFromFile`,
	syslogDownloadLogFile: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogFile`, //Download logfile by name
	syslogDownloadLogsArchive: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogsArchive`, // Ask for zipped logs and PCAP file
	systemReboot: `${Config.pbxUrl}/pbxcore/api/system/reboot`, // Рестарт ОС
	systemShutDown: `${Config.pbxUrl}/pbxcore/api/system/shutdown`, // Выключить машину
	systemGetBannedIp: `${Config.pbxUrl}/pbxcore/api/system/getBanIp`, // Получение забаненных ip
	systemUnBanIp: `${Config.pbxUrl}/pbxcore/api/system/unBanIp`, // Снятие бана IP адреса curl -X POST -d '{"ip": "172.16.156.1"}'
	systemGetDateTime: `${Config.pbxUrl}/pbxcore/api/system/getDate`,//curl http://172.16.156.223/pbxcore/api/system/getDate
	systemSetDateTime: `${Config.pbxUrl}/pbxcore/api/system/setDate`, // Set system date curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate
	systemSendTestEmail: `${Config.pbxUrl}/pbxcore/api/system/sendMail`, // Отправить почту
	systemRestoreDefaultSettings: `${Config.pbxUrl}/pbxcore/api/system/restoreDefault`, // Delete all system settings
	systemConvertAudioFile: `${Config.pbxUrl}/pbxcore/api/system/convertAudioFile`,
	updateMailSettings: `${Config.pbxUrl}/pbxcore/api/system/updateMailSettings`,
	systemUpgrade: `${Config.pbxUrl}/pbxcore/api/system/upgrade`, // Обновление АТС файлом
	systemInstallModule: `${Config.pbxUrl}/pbxcore/api/system/installNewModule`,
	systemGetModuleInstallationStatus: `${Config.pbxUrl}/pbxcore/api/system/statusOfModuleInstallation`,
	systemDeleteModule: `${Config.pbxUrl}/pbxcore/api/system/uninstallModule`,
	systemDisableModule: `${Config.pbxUrl}/pbxcore/api/system/disableModule`,
	systemEnableModule: `${Config.pbxUrl}/pbxcore/api/system/enableModule`,
	filesUploadFile: `${Config.pbxUrl}/pbxcore/api/files/uploadResumable`,
	filesStatusUploadFile: `${Config.pbxUrl}/pbxcore/api/files/statusUploadFile`,
	filesGetFileContent: `${Config.pbxUrl}/pbxcore/api/files/fileReadContent`, // Получить контент файла по имени
	filesRemoveAudioFile: `${Config.pbxUrl}/pbxcore/api/files/removeAudioFile`,
	filesDownloadNewFirmware: `${Config.pbxUrl}/pbxcore/api/files/downloadNewFirmware`, // Обновление АТС онлайн
	filesFirmwareDownloadStatus: `${Config.pbxUrl}/pbxcore/api/files/firmwareDownloadStatus`, // Получение статуса обновления
	filesDownloadNewModule: `${Config.pbxUrl}/pbxcore/api/files/downloadNewModule`,
	filesModuleDownloadStatus: `${Config.pbxUrl}/pbxcore/api/files/moduleDownloadStatus`,
	sysinfoGetInfo: `${Config.pbxUrl}/pbxcore/api/sysinfo/getInfo`, // Get system information
	sysinfoGetExternalIP: `${Config.pbxUrl}/pbxcore/api/sysinfo/getExternalIpInfo`, //Get external IP address,
	advicesGetList: `${Config.pbxUrl}/pbxcore/api/advices/getList`,
	licenseResetKey: `${Config.pbxUrl}/pbxcore/api/license/resetKey`,
	licenseProcessUserRequest: `${Config.pbxUrl}/pbxcore/api/license/processUserRequest`,
	licenseGetLicenseInfo: `${Config.pbxUrl}/pbxcore/api/license/getLicenseInfo`,
	licenseGetMikoPBXFeatureStatus: `${Config.pbxUrl}/pbxcore/api/license/getMikoPBXFeatureStatus`,
	licenseCaptureFeatureForProductId: `${Config.pbxUrl}/pbxcore/api/license/captureFeatureForProductId`,
	licenseSendPBXMetrics: `${Config.pbxUrl}/pbxcore/api/license/sendPBXMetrics`,

	/**
	 * Проверка ответа на JSON
	 * @param jsonString
	 * @returns {boolean|any}
	 */
	tryParseJSON(jsonString) {
		try {
			const o = JSON.parse(jsonString);

			// Handle non-exception-throwing cases:
			// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
			// but... JSON.parse(null) returns null, and typeof null === "object",
			// so we must check for that, too. Thankfully, null is falsey, so this suffices:
			if (o && typeof o === 'object') {
				return o;
			}
			return false;
		} catch (e) {
			return false;
		}
	},

	/**
	 * Проверка ответа PBX на успех
	 * @param response
	 */
	successTest(response) {
		return response !== undefined
			&& Object.keys(response).length > 0
			&& response.result !== undefined
			&& response.result === true;
	},

	/**
	 * Проверка связи с PBX
	 * @param callback
	 */
	PingPBX(callback) {
		$.api({
			url: PbxApi.pbxPing,
			on: 'now',
			dataType: 'text',
			timeout: 2000,
			onComplete(response) {
				if (response !== undefined
					&& response.toUpperCase() === 'PONG') {
					callback(true);
				} else {
					callback(false);
				}
			},
			onFailure() {
				callback(false);
			},
		});
	},
	/**
	 * Получение списка забанненых IP адресов
	 * @param callback
	 */
	SystemGetBannedIp(callback) {
		$.api({
			url: PbxApi.systemGetBannedIp,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Delete IP from fail2ban list
	 * @param ipAddress
	 * @param callback
	 * @returns {boolean}
	 */
	SystemUnBanIp(ipAddress, callback) {
		$.api({
			url: PbxApi.systemUnBanIp,
			on: 'now',
			method: 'POST',
			data: {ip: ipAddress},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Получение статуса регистрации пиров
	 * @param callback
	 * @returns {boolean}
	 */
	GetPeersStatus(callback) {
		$.api({
			url: PbxApi.pbxGetPeersStatus,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Получение статуса регистрации пира
	 * @param callback
	 * @returns {boolean}
	 */
	GetPeerStatus(data, callback) {
		$.api({
			url: PbxApi.pbxGetPeerStatus,
			on: 'now',
			method: 'POST',
			data: JSON.stringify(data),
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Получение статусов регистрации проовайдеров
	 * @param callback
	 */
	GetSipProvidersStatuses(callback) {
		$.api({
			url: PbxApi.pbxGetSipRegistry,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Получение статусов регистрации проовайдеров IAX
	 * @param callback
	 */
	GetIaxProvidersStatuses(callback) {
		$.api({
			url: PbxApi.pbxGetIaxRegistry,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Отпарвляет тестовое сообщение на почту
	 * @param data
	 */
	SendTestEmail(data, callback) {
		$.api({
			url: PbxApi.systemSendTestEmail,
			on: 'now',
			method: 'POST',
			data: data,
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response.data.message);
			},
		});
	},

	/**
	 * Получение статусов регистрации проовайдеров IAX
	 * @param callback
	 */
	UpdateMailSettings(callback) {
		$.api({
			url: PbxApi.updateMailSettings,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},

	/**
	 * Gets file content from server
	 * @param data
	 * @param callback
	 */
	GetFileContent(data, callback) {
		$.api({
			url: PbxApi.filesGetFileContent,
			on: 'now',
			method: 'POST',
			data: data,
			onSuccess(response) {
				if (response !== undefined) {
					callback(response);
				}
			},
		});
	},
	/**
	 * Get the linux datetime
	 */
	GetDateTime(callback) {
		$.api({
			url: PbxApi.systemGetDateTime,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Updates the linux datetime
	 * @param data
	 */
	UpdateDateTime(data) {
		$.api({
			url: PbxApi.systemSetDateTime,
			on: 'now',
			method: 'POST',
			data: data,
		});
	},
	/**
	 * Получаем информацию о внешнем IP станции
	 * @param callback
	 */
	GetExternalIp(callback) {
		$.api({
			url: PbxApi.sysinfoGetExternalIP,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Получение списка активных вызовов
	 * @param callback
	 */
	GetCurrentCalls(callback) {
		$.api({
			url: PbxApi.pbxGetActiveChannels,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				if (Object.keys(response).length > 0) {
					callback(response.data);
				} else {
					callback(false);
				}
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
			},
		});
	},
	/**
	 * Перезагрузка станции
	 */
	SystemReboot() {
		$.api({
			url: PbxApi.systemReboot,
			on: 'now',
		});
	},
	/**
	 * ShutDown MikoPBX
	 */
	SystemShutDown() {
		$.api({
			url: PbxApi.systemShutDown,
			on: 'now',
		});
	},
	/**
	 * Gets system information
	 * @param callback function
	 */
	SysInfoGetInfo(callback) {
		$.api({
			url: PbxApi.sysinfoGetInfo,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Start logs collection and pickup TCP packages
	 * @param callback function
	 */
	SyslogStartLogsCapture(callback) {
		$.api({
			url: PbxApi.syslogStartLogsCapture,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Start logs collection
	 * @param callback function
	 */
	SyslogPrepareLog(callback) {
		$.api({
			url: PbxApi.syslogPrepareLog,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Stop tcp dump and start making file for download
	 * @param callback function
	 */
	SyslogStopLogsCapture(callback) {
		sessionStorage.setItem('LogsCaptureStatus', 'stopped');
		$.api({
			url: PbxApi.syslogStopLogsCapture,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Gets logs files list
	 * @param callback function
	 */
	SyslogGetLogsList(callback) {
		$.api({
			url: PbxApi.syslogGetLogsList,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Get logfiles strings partially and filtered
	 * @param params
	 * @param callback function
	 */
	SyslogGetLogFromFile(params, callback) {
		$.api({
			url: PbxApi.syslogGetLogFromFile,
			on: 'now',
			method: 'POST',
			data: {
				filename: params.filename,
				filter: params.filter,
				lines: params.lines,
				offset: params.offset
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},

	/**
	 * Download logfile by name
	 * @param filename
	 * @param callback function
	 */
	SyslogDownloadLogFile(filename, callback) {
		$.api({
			url: PbxApi.syslogDownloadLogFile,
			on: 'now',
			method: 'POST',
			data: {filename},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure(response) {
				callback(false);
			},
			onError(response) {
				callback(false);
			},
		});
	},

	/**
	 * Ask for zipped logs and PCAP file
	 * @param filename
	 * @param callback function
	 */
	SyslogDownloadLogsArchive(filename, callback) {
		$.api({
			url: PbxApi.syslogDownloadLogsArchive,
			on: 'now',
			method: 'POST',
			data: {filename},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},
	/**
	 * Start system upgrade
	 * @param filePath  tempFile path for upgrade
	 * @param callback function
	 */
	SystemUpgrade(filePath, callback) {
		$.api({
			url: PbxApi.systemUpgrade,
			on: 'now',
			method: 'POST',
			data: {temp_filename:filePath},
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},

	/**
	 * Convert audio file to wav with 8000 bitrate
	 * @param filePath - uploaded file
	 * @param category - category {moh, custom, etc...}
	 * @param callback - callback function
	 */
	SystemConvertAudioFile(filePath, category, callback) {
		$.api({
			on: 'now',
			url: PbxApi.systemConvertAudioFile,
			method: 'POST',
			data: {temp_filename:filePath, category:category},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Deletes audio file from disk
	 * @param filePath - full path to the file
	 * @param fileId
	 * @param callback - callback function
	 */
	FilesRemoveAudioFile(filePath, fileId=null, callback=null) {
		$.api({
			url: PbxApi.filesRemoveAudioFile,
			on: 'now',
			method: 'POST',
			data: {filename:filePath},
			successTest: PbxApi.successTest,
			onSuccess() {
				if (callback!==null){
					callback(fileId);
				}

			},
		});
	},

	/**
	 * Install uploaded module
	 * @param filePath
	 * @param callback - функция колбека
	 */
	SystemInstallModule(filePath, callback) {
		$.api({
			url: PbxApi.systemInstallModule,
			on: 'now',
			method: 'POST',
			data: {
				filePath
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},

	/**
	 * Gets installation status
	 */
	SystemGetModuleInstallationStatus(filePath, callback) {
		$.api({
			url: PbxApi.systemGetModuleInstallationStatus,
			on: 'now',
			method: 'POST',
			data: {filePath:filePath},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Uploads module as json with link by POST request
	 * @param params
	 * @param callback - функция колбека
	 */
	FilesDownloadNewModule(params, callback) {
		$.api({
			url: PbxApi.filesDownloadNewModule,
			on: 'now',
			method: 'POST',
			data: {
				uniqid:params.uniqid,
				md5:params.md5,
				size:params.size,
				url:params.updateLink
			},
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},

	/**
	 * Удаление модуля расширения
	 *
	 * @param moduleName - id модуля
	 * @param keepSettings bool - сохранять ли настройки
	 * @param callback - функция колбека
	 */
	SystemDeleteModule(moduleName, keepSettings, callback) {
		$.api({
			url: PbxApi.systemDeleteModule,
			on: 'now',
			method: 'POST',
			data: {
				uniqid: moduleName,
				keepSettings: keepSettings
			},
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},
	/**
	 * Gets module download status
	 * @param moduleUniqueID
	 * @param callback
	 * @param failureCallback
	 */
	FilesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
		$.api({
			url: PbxApi.filesModuleDownloadStatus,
			on: 'now',
			timeout: 3000,
			method: 'POST',
			data: {uniqid:moduleUniqueID},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				failureCallback();
			},
			onError() {
				failureCallback();
			},
			onAbort() {
				failureCallback();
			},
		});
	},

	/**
	 * Disable pbxExtension module
	 * @param {*} moduleUniqueID
	 * @param {function(...[*]=)} callback
	 */
	SystemDisableModule(moduleUniqueID, callback) {
		$.api({
			url: PbxApi.systemDisableModule,
			on: 'now',
			method: 'POST',
			data: {uniqid:moduleUniqueID},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response, true);
			},
			onFailure(response) {
				callback(response, false);
			},
			onError(response) {
				callback(response, false);
			},

		});
	},
	/**
	 * Disable pbxExtension module
	 * @param {string} moduleUniqueID
	 * @param {function(...[*]=)} callback
	 */
	SystemEnableModule(moduleUniqueID, callback) {
		$.api({
			url: PbxApi.systemEnableModule,
			on: 'now',
			method: 'POST',
			data:  {uniqid:moduleUniqueID},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response, true);
			},
			onFailure(response) {
				callback(response, false);
			},
			onError(response) {
				callback(response, false);
			},

		});
	},
	/**
	 * Downloads new firmware from provided url
	 *
	 */
	FilesDownloadNewFirmware(params, callback) {
		$.api({
			url: PbxApi.filesDownloadNewFirmware,
			on: 'now',
			method: 'POST',
			data: {
				md5:params.md5,
				size:params.size,
				version:params.version,
				url:params.updateLink
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure(response) {
				callback(response);
			},
			onError(response) {
				callback(response);
			},
		});
	},

	/**
	 * Gets firmware download status
	 * @param {string} filename
	 * @param {function(*): (undefined)} callback
	 */
	FilesFirmwareDownloadStatus(filename, callback) {
		$.api({
			url: PbxApi.filesFirmwareDownloadStatus,
			on: 'now',
			method: 'POST',
			data: {filename},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Подключение обработчкика загрузки файлов по частям
	 */
	SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
		const r = new Resumable({
			target: PbxApi.filesUploadFile,
			testChunks: false,
			chunkSize: 3 * 1024 * 1024,
			maxFiles: 1,
			simultaneousUploads: 1,
			fileType: fileTypes,
		});

		r.assignBrowse(document.getElementById(buttonId));
		r.on('fileSuccess', (file, response) => {
			callback('fileSuccess', {file, response});
		});
		r.on('fileProgress', (file) => {
			callback('fileProgress', {file});
		});
		r.on('fileAdded', (file, event) => {
			r.upload();
			callback('fileAdded', {file, event});
		});
		r.on('fileRetry', (file) => {
			callback('fileRetry', {file});
		});
		r.on('fileError', (file, message) => {
			callback('fileError', {file, message});
		});
		r.on('uploadStart', () => {
			callback('uploadStart');
		});
		r.on('complete', () => {
			callback('complete');
		});
		r.on('progress', () => {
			const percent = 100 * r.progress();
			callback('progress', {percent});
		});
		r.on('error', (message, file) => {
			callback('error', {message, file});
		});
		r.on('pause', () => {
			callback('pause');
		});
		r.on('cancel', () => {
			callback('cancel');
		});
	},
	/**
	 * Enables upload by chunk resumable worker
	 */
	FilesUploadFile(file, callback) {
		const r = new Resumable({
			target: PbxApi.filesUploadFile,
			testChunks: false,
			chunkSize: 3 * 1024 * 1024,
			simultaneousUploads: 1,
			maxFiles: 1,
		});

		r.addFile(file);
		r.upload();
		r.on('fileSuccess', (file, response) => {
			callback('fileSuccess', {file, response});
		});
		r.on('fileProgress', (file) => {
			callback('fileProgress', {file});
		});
		r.on('fileAdded', (file, event) => {
			r.upload();
			callback('fileAdded', {file, event});
		});
		r.on('fileRetry', (file) => {
			callback('fileRetry', {file});
		});
		r.on('fileError', (file, message) => {
			callback('fileError', {file, message});
		});
		r.on('uploadStart', () => {
			callback('uploadStart');
		});
		r.on('complete', () => {
			callback('complete');
		});
		r.on('progress', () => {
			const percent = 100 * r.progress();
			callback('progress', {percent});
		});
		r.on('error', (message, file) => {
			callback('error', {message, file});
		});
		r.on('pause', () => {
			callback('pause');
		});
		r.on('cancel', () => {
			callback('cancel');
		});
	},

	/**
	 * Gets uploading status
	 */
	FilesGetStatusUploadFile(fileId, callback) {
		$.api({
			url: PbxApi.filesStatusUploadFile,
			on: 'now',
			method: 'POST',
			data: {id:fileId},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},
	/**
	 * Update WorkerApiCommands language
	 */
	SystemChangeCoreLanguage() {
		$.api({
			url: PbxApi.systemChangeCoreLanguage,
			on: 'now',
		});
	},
	/**
	 * Delete all system settings
	 */
	SystemRestoreDefaultSettings(callback) {
		$.api({
			url: PbxApi.systemRestoreDefaultSettings,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response.messages);
			},
		});
	},


	/**
	 * Makes the list of notifications about system, firewall, passwords, wrong settings
	 *
	 * @param callback
	 *
	 */
	AdvicesGetList(callback) {
		$.api({
			url: PbxApi.advicesGetList,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Reset license key settings
	 *
	 * @param callback
	 *
	 */
	LicenseResetLicenseKey(callback) {
		$.api({
			url: PbxApi.licenseResetKey,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Update license key, get new one, activate coupon
	 *
	 * @param formData
	 * @param callback
	 */
	LicenseProcessUserRequest(formData, callback) {
		$.api({
			url: PbxApi.licenseProcessUserRequest,
			on: 'now',
			method: 'POST',
			data: formData,
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response, true);
			},
			onFailure(response) {
				callback(response, false);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Get license information from license server
	 *
	 * @param callback
	 *
	 */
	LicenseGetLicenseInfo(callback) {
		$.api({
			url: PbxApi.licenseGetLicenseInfo,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onFailure(response) {
				callback(response);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Check whether license system works good or not
	 *
	 * @param callback
	 *
	 */
	LicenseGetMikoPBXFeatureStatus(callback) {
		$.api({
			url: PbxApi.licenseGetMikoPBXFeatureStatus,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response);
			},
			onError() {
				callback(false);
			},
		});
	},

	/**
	 * Tries to capture feature.
	 * If it fails we try to get trial and then try capture again.
	 *
	 * @param params
	 * @param callback
	 */
	LicenseCaptureFeatureForProductId(params, callback) {
		const licFeatureId = params.licFeatureId;
		const licProductId = params.licProductId;
		$.api({
			url: PbxApi.licenseCaptureFeatureForProductId,
			on: 'now',
			method: 'POST',
			data: {licFeatureId, licProductId},
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(params, true);
			},
			onFailure(response) {
				callback(response.messages, false);
			},
			onError() {
				callback('', false);
			},
		});
	},
	/**
	 * Sends PBX metrics
	 *
	 * @param callback
	 */
	LicenseSendPBXMetrics(callback) {
		$.api({
			url: PbxApi.licenseSendPBXMetrics,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure() {
				callback(false);
			},
			onError() {
				callback(false);
			},
		});
	},

};
