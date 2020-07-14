/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global sessionStorage, globalRootUrl,Config */

const PbxApi = {
	pbxPing: `${Config.pbxUrl}/pbxcore/api/system/ping`,
	pbxGetHistory: `${Config.pbxUrl}/pbxcore/api/cdr/get_history`, // Запрос истории звонков POST -d '{"number": "212", "start":"2018-01-01", "end":"2019-01-01"}'
	pbxGetSipRegistry: `${Config.pbxUrl}/pbxcore/api/sip/getRegistry`,
	pbxGetIaxRegistry: `${Config.pbxUrl}/pbxcore/api/iax/getRegistry`,
	pbxGetPeersStatus: `${Config.pbxUrl}/pbxcore/api/sip/getPeersStatuses`,
	pbxGetPeerStatus: `${Config.pbxUrl}/pbxcore/api/sip/getSipPeer`,
	pbxGetActiveCalls: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveCalls`, // Получить активные звонки,
	pbxGetActiveChannels: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveChannels`, // Получить активные звонки,
	systemUploadAudioFile: `${Config.pbxUrl}/pbxcore/api/system/uploadAudioFile`,
	systemRemoveAudioFile: `${Config.pbxUrl}/pbxcore/api/system/removeAudioFile`,
	systemReboot: `${Config.pbxUrl}/pbxcore/api/system/reboot`, // Рестарт ОС
	systemShutDown: `${Config.pbxUrl}/pbxcore/api/system/shutdown`, // Выключить машину
	systemGetBannedIp: `${Config.pbxUrl}/pbxcore/api/system/getBanIp`, // Получение забаненных ip
	systemUnBanIp: `${Config.pbxUrl}/pbxcore/api/system/unBanIp`, // Снятие бана IP адреса curl -X POST -d '{"ip": "172.16.156.1"}'
	systemGetInfo: `${Config.pbxUrl}/pbxcore/api/system/getInfo`, // Получение информации о системе
	systemSetDateTime: `${Config.pbxUrl}/pbxcore/api/system/setDate`, // curl -X POST -d '{"date": "2015.12.31-01:01:20"}',
	systemSendTestEmail: `${Config.pbxUrl}/pbxcore/api/system/sendMail`, // Отправить почту
	systemGetFileContent: `${Config.pbxUrl}/pbxcore/api/system/fileReadContent`, // Получить контент файла по имени
	systemStartLogsCapture: `${Config.pbxUrl}/pbxcore/api/system/startLog`,
	systemStopLogsCapture: `${Config.pbxUrl}/pbxcore/api/system/stopLog`,
	systemGetExternalIP: `${Config.pbxUrl}/pbxcore/api/system/getExternalIpInfo`,
	systemUpgrade: `${Config.pbxUrl}/pbxcore/api/system/upgrade`, // Обновление АТС файлом
	systemUpgradeOnline: `${Config.pbxUrl}/pbxcore/api/system/upgradeOnline`, // Обновление АТС онлайн
	systemGetUpgradeStatus: `${Config.pbxUrl}/pbxcore/api/system/statusUpgrade`, // Получение статуса обновления
	systemInstallModule: `${Config.pbxUrl}/pbxcore/api/system/uploadNewModule`,
	systemDeleteModule: `${Config.pbxUrl}/pbxcore/api/system/uninstallModule`,
	systemDisableModule: `${Config.pbxUrl}/pbxcore/api/system/disableModule`,
	systemEnableModule: `${Config.pbxUrl}/pbxcore/api/system/enableModule`,
	systemInstallStatusModule: `${Config.pbxUrl}/pbxcore/api/system/statusUploadingNewModule`,
	systemUploadFile: `${Config.pbxUrl}/pbxcore/api/upload/uploadResumable`, // curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/upload/uploadResumable
	systemStatusUploadFile: `${Config.pbxUrl}/pbxcore/api/upload/status`, // curl -X POST -d '{"id": "1531474060"}' http://127.0.0.1/pbxcore/api/upload/status;
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
		} catch (e) {
			//
		}
		return false;
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
	 * Разблокировка IP адреса в fail2ban
	 * @param callback
	 * @returns {boolean}
	 */
	SystemUnBanIp(data, callback) {
		$.api({
			url: PbxApi.systemUnBanIp,
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
	 * Обновляет настройки почты на сервере
	 * @param callback
	 */
	UpdateMailSettings(callback) {
		$.api({
			url: PbxApi.systemReloadSMTP,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
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
			data: JSON.stringify(data),
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
	 * Получить контент файла конфигурации с сервера
	 * @param $data
	 * @param callback
	 */
	GetFileContent($data, callback) {
		$.api({
			url: PbxApi.systemGetFileContent,
			on: 'now',
			method: 'POST',
			data: JSON.stringify($data),
			onSuccess(response) {
				if (response !== undefined) {
					callback(response);
				}
			},
		});
	},
	/**
	 * Обновляет системное время
	 * @param $data
	 */
	UpdateDateTime(data) {
		$.api({
			url: PbxApi.systemSetDateTime,
			on: 'now',
			method: 'POST',
			data: JSON.stringify(data),
		});
	},
	/**
	 * Получаем информацию о внешнем IP станции
	 * @param callback
	 */
	GetExternalIp(callback) {
		$.api({
			url: PbxApi.systemGetExternalIP,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError(errorMessage, element, xhr) {
				if (xhr.status === 403) {
					window.location = `${globalRootUrl}session/index`;
				}
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
	 * Выключение станции
	 */
	SystemShutDown() {
		$.api({
			url: PbxApi.systemShutDown,
			on: 'now',
		});
	},
	/**
	 * Запуск сборщика системных логов
	 */
	SystemStartLogsCapture() {
		sessionStorage.setItem('LogsCaptureStatus', 'started');
		setTimeout(() => {
			sessionStorage.setItem('LogsCaptureStatus', 'stopped');
		}, 5000);
		$.api({
			url: PbxApi.systemStartLogsCapture,
			on: 'now',
		});
	},
	/**
	 * Остановка сборщика системных логов
	 */
	SystemStopLogsCapture() {
		sessionStorage.setItem('LogsCaptureStatus', 'stopped');
		window.location = PbxApi.systemStopLogsCapture;
	},

	/**
	 * Загрузить на станцию файл обновления
	 * @param file - Тело загружаемого файла
	 * @param callback - функция для обработки результата
	 */
	SystemUpgrade(file, callback) {
		$.api({
			on: 'now',
			url: PbxApi.systemUpgrade,
			method: 'POST',
			cache: false,
			processData: false,
			contentType: false,
			beforeSend: (settings) => {
				const newSettings = settings;
				const now = parseInt(Date.now() / 1000, 10);
				newSettings.data = new FormData();
				newSettings.data.append(`upgrade_${now}`, file);
				return newSettings;
			},
			onResponse: response => response,
			successTest: response => !response.error || false, // change this
			onSuccess: (json) => {
				callback(json);
			},
			onFailure: (json) => {
				callback(json);
			},
			xhr: () => {
				const xhr = new window.XMLHttpRequest();
				// прогресс загрузки на сервер
				xhr.upload.addEventListener('progress', (evt) => {
					if (evt.lengthComputable) {
						const percentComplete = 100 * (evt.loaded / evt.total);
						const json = {
							function: 'upload_progress',
							percent: percentComplete,
						};
						// делать что-то...
						callback(json);
					}
				}, false);
				return xhr;
			},
		});
	},

	/**
	 * Upload audio file to PBX system
	 * @param file - blob body
	 * @param category - category {moh, custom, etc...}
	 * @param callback - callback function
	 */
	SystemUploadAudioFile(file, category, callback) {
		$.api({
			on: 'now',
			url: PbxApi.systemUploadAudioFile,
			method: 'POST',
			cache: false,
			processData: false,
			contentType: false,
			beforeSend: (settings) => {
				const extension = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2);
				const oldfileName = file.name.replace(`.${extension}`, '');
				const newFileName = `${oldfileName}_${parseInt(Date.now() / 1000, 10)}.${extension}`;
				const newSettings = settings;
				// const newFile = new File([file], newFileName);
				const blob = new Blob([file]);
				blob.lastModifiedDate = new Date();
				newSettings.data = new FormData();
				// newSettings.data.append(newFileName, newFile);
				newSettings.data.append('file', blob, newFileName);
				newSettings.data.append('category', category);
				return newSettings;
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
		});
	},
	/**
	 * Delete audio file from disk
	 * @param filePath - full path to the file
	 * @param callback - callback function
	 */
	SystemRemoveAudioFile(filePath, fileId, callback) {
		$.api({
			url: PbxApi.systemRemoveAudioFile,
			on: 'now',
			method: 'POST',
			data: `{"filename":"${filePath}"}`,
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(fileId);
			},
		});
	},

	/**
	 * Перезапуск модулей расширений
	 */
	SystemReloadModule(moduleName) {
		$.api({
			url: `${Config.pbxUrl}/pbxcore/api/modules/${moduleName}/reload`,
			on: 'now',
		});
	},
	/**
	 * Upload module as json with link by POST request
	 * @param params
	 * @param callback - функция колбека
	 */
	SystemInstallModule(params, callback) {
		$.api({
			url: PbxApi.systemInstallModule,
			on: 'now',
			method: 'POST',
			data: `{"uniqid":"${params.uniqid}","md5":"${params.md5}","size":"${params.size}","url":"${params.updateLink}"}`,
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
	 * Upload module as file by POST request
	 * @param file - Тело загружаемого файла
	 * @param callback - функция колбека
	 */
	SystemUploadModule(file, callback) {
		$.api({
			on: 'now',
			url: PbxApi.systemInstallModule,
			method: 'POST',
			cache: false,
			processData: false,
			contentType: false,
			beforeSend: (settings) => {
				const newSettings = settings;
				const now = parseInt(Date.now() / 1000, 10);
				newSettings.data = new FormData();
				newSettings.data.append(`module_install_${now}`, file);
				return newSettings;
			},
			successTest: PbxApi.successTest,
			onSuccess: (response) => {
				callback(response.data, true);
			},
			onFailure: (response) => {
				callback(response.data, false);
			},
			xhr: () => {
				const xhr = new window.XMLHttpRequest();
				// прогресс загрузки на сервер
				xhr.upload.addEventListener('progress', (evt) => {
					if (evt.lengthComputable) {
						const percentComplete = 100 * (evt.loaded / evt.total);
						const json = {
							function: 'upload_progress',
							percent: percentComplete,
						};
						// Show upload progress on bar
						callback(json, true);
					}
				}, false);
				return xhr;
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
			data: `{"uniqid":"${moduleName}","keepSettings":"${keepSettings}"}`,
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
	 * Проверка статуса установки модуля
	 * @param moduleName - uniqid модуля
	 * @param callback - функция для обработки результата
	 * @param failureCallback
	 */
	SystemGetModuleInstallStatus(moduleName, callback, failureCallback) {
		$.api({
			url: PbxApi.systemInstallStatusModule,
			on: 'now',
			timeout: 3000,
			method: 'POST',
			data: `{"uniqid":"${moduleName}"}`,
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
	 */
	SystemDisableModule(moduleName, callback) {
		$.api({
			url: PbxApi.systemDisableModule,
			on: 'now',
			method: 'POST',
			data: `{"uniqid":"${moduleName}"}`,
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
	 */
	SystemEnableModule(moduleName, callback) {
		$.api({
			url: PbxApi.systemEnableModule,
			on: 'now',
			method: 'POST',
			data: `{"uniqid":"${moduleName}"}`,
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
	 * Установка обновления PBX
	 *
	 */
	SystemUpgradeOnline(params, callback) {
		$.api({
			url: PbxApi.systemUpgradeOnline,
			on: 'now',
			method: 'POST',
			data: `{"md5":"${params.md5}","url":"${params.updateLink}"}`,
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
	 * Получение статуса обновления станции
	 */
	SystemGetUpgradeStatus(callback) {
		$.api({
			url: PbxApi.systemGetUpgradeStatus,
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
	 * Получение статуса закачки файла
	 */
	SystemGetStatusUploadFile(fileId, callback) {
		$.api({
			url: PbxApi.systemStatusUploadFile,
			on: 'now',
			method: 'POST',
			data: `{"id":"${fileId}"}`,
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

};

// export default PbxApi;
