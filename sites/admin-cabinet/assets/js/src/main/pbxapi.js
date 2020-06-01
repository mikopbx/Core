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
	systemInstallModule: `${Config.pbxUrl}/pbxcore/api/modules/upload`,
	systemDeleteModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/uninstall`,
	systemDisableModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/disable`,
	systemEnableModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/enable`,
	systemInstallStatusModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/status`,
	backupGetFilesList: `${Config.pbxUrl}/pbxcore/api/backup/list`, // Получить список архивов
	backupDownloadFile: `${Config.pbxUrl}/pbxcore/api/backup/download`, // Получить архив /pbxcore/api/backup/download?id=backup_1530703760
	backupDeleteFile: `${Config.pbxUrl}/pbxcore/api/backup/remove`, // Удалить архив curl http://172.16.156.212/pbxcore/api/backup/remove?id=backup_1530714645
	backupRecover: `${Config.pbxUrl}/pbxcore/api/backup/recover`, // Восстановить архив curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
	backupStart: `${Config.pbxUrl}/pbxcore/api/backup/start`, // Начать архивирование curl -X POST -d '{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}' http://172.16.156.212/pbxcore/api/backup/start;
	backupStop: `${Config.pbxUrl}/pbxcore/api/backup/stop`, // Приостановить архивирование curl -X POST -d '{"id":"backup_1530703760"}' http://172.16.156.212/pbxcore/api/backup/start;
	backupUpload: `${Config.pbxUrl}/pbxcore/api/backup/upload`, // Загрузка файла на АТС curl -F "file=@backup_1530703760.zip" http://172.16.156.212/pbxcore/api/backup/upload;
	backupGetEstimatedSize: `${Config.pbxUrl}/pbxcore/api/backup/getEstimatedSize`,
	backupStatusUpload: `${Config.pbxUrl}/pbxcore/api/backup/status_upload`, // curl 'http://172.16.156.223/pbxcore/api/backup/status_upload?backup_id=backup_1562746816'
	backupStartScheduled: `${Config.pbxUrl}/pbxcore/api/backup/startScheduled`, // curl 'http://172.16.156.223/pbxcore/api/backup/startScheduled'
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
	 * Получить список архивов
	 */
	BackupGetFilesList(callback) {
		$.api({
			url: PbxApi.backupGetFilesList,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},
	/**
	 * Скачать файл архива по указанному ID
	 */
	BackupDownloadFile(fileId) {
		window.location = `${PbxApi.backupDownloadFile}?id=${fileId}`;
	},
	/**
	 * Удалить файл по указанному ID
	 * @param fileId - идентификатор файла с архивом
	 * @param callback - функция для обработки результата
	 */
	BackupDeleteFile(fileId, callback) {
		$.api({
			url: `${PbxApi.backupDeleteFile}?id={id}`,
			on: 'now',
			urlData: {
				id: fileId,
			},
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},
	/**
	 * Восстановить систему по указанному ID бекапа
	 * @param jsonParams - {"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}'
	 * @param callback - функция для обработки результата
	 */
	BackupRecover(jsonParams, callback) {
		$.api({
			url: PbxApi.backupRecover,
			method: 'POST',
			data: JSON.stringify(jsonParams),
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},
	/**
	 * Начало архивирование системы
	 * @param jsonParams -
	 * {
	 * 	"backup-config":"1",
	 * 	"backup-records":"1",
	 * 	"backup-cdr":"1",
	 * 	"backup-sound-files":"1"
	 * 	}
	 * @param callback - функция для обработки результата
	 */
	BackupStart(jsonParams, callback) {
		$.api({
			url: PbxApi.backupStart,
			on: 'now',
			method: 'POST',
			data: JSON.stringify(jsonParams),
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},
	/**
	 * Приостановить архивирование системы
	 * @param fileId - ИД с файлом архива
	 * @param callback - функция для обработки результата
	 */
	BackupStop(fileId, callback) {
		$.api({
			url: PbxApi.backupStop,
			on: 'now',
			method: 'POST',
			data: `{"id":"${fileId}"}`,
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},

	/**
	 * Получить размер файлов для бекапа
	 * @param callback - функция для обработки результата
	 */
	BackupGetEstimatedSize(callback) {
		$.api({
			url: PbxApi.backupGetEstimatedSize,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.data);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},

	/**
	 * Загрузить на станцию файл бекапа
	 * @param file - Тело загружаемого файла
	 * @param callback - функция для обработки результата
	 */
	BackupUpload(file, callback) {
		$.api({
			on: 'now',
			url: PbxApi.backupUpload,
			method: 'POST',
			cache: false,
			processData: false,
			contentType: false,
			beforeSend: (settings) => {
				const newSettings = settings;
				const now = parseInt(Date.now() / 1000, 10);
				newSettings.data = new FormData();
				newSettings.data.append(`backup_${now}`, file);
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
	 * Удалить файл по указанному ID
	 * @param fileId - идентификатор файла с архивом
	 * @param callback - функция для обработки результата
	 */
	BackupStatusUpload(fileId, callback) {
		$.api({
			url: `${PbxApi.backupStatusUpload}?backup_id={id}`,
			on: 'now',
			urlData: {
				id: fileId,
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
	},

	/**
	 * Запускает запланированное резервное копирование сразу
	 *
	 */
	BackupStartScheduled(callback) {
		$.api({
			url: PbxApi.backupStartScheduled,
			on: 'now',
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onError() {
				callback(false);
			},
			onFailure() {
				callback(false);
			},
		});
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
			urlData: {
				moduleName,
			},
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
			urlData: {
				moduleName,
			},
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
			urlData: {
				moduleName,
			},
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
			urlData: {
				moduleName,
			},
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
};

// export default PbxApi;
