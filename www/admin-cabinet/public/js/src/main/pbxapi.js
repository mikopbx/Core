/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global localStorage, globalRootUrl,Config */

const PbxApi = {
	pbxPing: `${Config.pbxUrl}/pbxcore/api/system/ping`,
	pbxGetHistory: `${Config.pbxUrl}/pbxcore/api/cdr/get_history`, // Запрос истории звонков POST -d '{"number": "212", "start":"2018-01-01", "end":"2019-01-01"}'
	pbxGetSipRegistry: `${Config.pbxUrl}/pbxcore/api/sip/get_registry`,
	pbxGetIaxRegistry: `${Config.pbxUrl}/pbxcore/api/iax/get_registry`,
	pbxGetPeersStatus: `${Config.pbxUrl}/pbxcore/api/sip/get_peers_statuses`,
	pbxGetPeerStatus: `${Config.pbxUrl}/pbxcore/api/sip/get_sip_peer`,
	pbxGetActiveCalls: `${Config.pbxUrl}/pbxcore/api/cdr/get_active_calls`, // Получить активные звонки,
	pbxGetActiveChannels: `${Config.pbxUrl}/pbxcore/api/cdr/get_active_channels`, // Получить активные звонки,
	systemUploadAudioFile: `${Config.pbxUrl}/pbxcore/api/system/upload_audio_file`,
	systemRemoveAudioFile: `${Config.pbxUrl}/pbxcore/api/system/remove_audio_file`,
	systemReboot: `${Config.pbxUrl}/pbxcore/api/system/reboot`, // Рестарт ОС
	systemShutDown: `${Config.pbxUrl}/pbxcore/api/system/shutdown`, // Выключить машину
	systemGetBannedIp: `${Config.pbxUrl}/pbxcore/api/system/get_ban_ip`, // Получение забаненных ip
	systemUnBanIp: `${Config.pbxUrl}/pbxcore/api/system/unban_ip`, // Снятие бана IP адреса curl -X POST -d '{"ip": "172.16.156.1"}'
	systemGetInfo: `${Config.pbxUrl}/pbxcore/api/system/get_info`, // Получение информации о системе
	systemSetDateTime: `${Config.pbxUrl}/pbxcore/api/system/set_date`, // curl -X POST -d '{"date": "2015.12.31-01:01:20"}',
	systemSendTestEmail: `${Config.pbxUrl}/pbxcore/api/system/send_mail`, // Отправить почту
	systemGetFileContent: `${Config.pbxUrl}/pbxcore/api/system/file_read_content`, // Получить контент файла по имени
	systemStartLogsCapture: `${Config.pbxUrl}/pbxcore/api/system/start_log`,
	systemStopLogsCapture: `${Config.pbxUrl}/pbxcore/api/system/stop_log`,
	systemGetExternalIP: `${Config.pbxUrl}/pbxcore/api/system/get_external_ip_info`,
	systemUpgrade: `${Config.pbxUrl}/pbxcore/api/system/upgrade`, // Обновление АТС файлом
	systemUpgradeOnline: `${Config.pbxUrl}/pbxcore/api/system/upgrade_online`, // Обновление АТС онлайн
	systemGetUpgradeStatus: `${Config.pbxUrl}/pbxcore/api/system/status_upgrade`, // Получение статуса обновления
	systemInstallModule: `${Config.pbxUrl}/pbxcore/api/modules/upload`,
	systemDeleteModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/uninstall`,
	systemInstallStatusModule: `${Config.pbxUrl}/pbxcore/api/modules/{moduleName}/status`,
	backupGetFilesList: `${Config.pbxUrl}/pbxcore/api/backup/list`, // Получить список архивов
	backupDownloadFile: `${Config.pbxUrl}/pbxcore/api/backup/download`, // Получить архив /pbxcore/api/backup/download?id=backup_1530703760
	backupDeleteFile: `${Config.pbxUrl}/pbxcore/api/backup/remove`, // Удалить архив curl http://172.16.156.212/pbxcore/api/backup/remove?id=backup_1530714645
	backupRecover: `${Config.pbxUrl}/pbxcore/api/backup/recover`, // Восстановить архив curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
	backupStart: `${Config.pbxUrl}/pbxcore/api/backup/start`, // Начать архивирование curl -X POST -d '{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}' http://172.16.156.212/pbxcore/api/backup/start;
	backupStop: `${Config.pbxUrl}/pbxcore/api/backup/stop`, // Приостановить архивирование curl -X POST -d '{"id":"backup_1530703760"}' http://172.16.156.212/pbxcore/api/backup/start;
	backupUpload: `${Config.pbxUrl}/pbxcore/api/backup/upload`, // Загрузка файла на АТС curl -F "file=@backup_1530703760.zip" http://172.16.156.212/pbxcore/api/backup/upload;
	backupGetEstimatedSize: `${Config.pbxUrl}/pbxcore/api/backup/get_estimated_size`,
	backupStatusUpload: `${Config.pbxUrl}/pbxcore/api/backup/status_upload`, // curl 'http://172.16.156.223/pbxcore/api/backup/status_upload?backup_id=backup_1562746816'
	backupStartScheduled: `${Config.pbxUrl}/pbxcore/api/backup/start_scheduled`, // curl 'http://172.16.156.223/pbxcore/api/backup/start_scheduled'
	moduleDisable: `${globalRootUrl}pbx-extension-modules/disable/{moduleName}`,
	moduleEnable: `${globalRootUrl}pbx-extension-modules/enable/{moduleName}`,
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
			&& response.result.toUpperCase() === 'SUCCESS';
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
				if (response !== undefined) {
					callback(response);
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
			data: JSON.stringify(data),
			successTest: PbxApi.successTest,
			onSuccess() {
				callback(true);
			},
			onFailure(response) {
				callback(response.message);
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
			onSuccess(response) {
				if (Object.keys(response).length > 0) {
					callback(response);
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
		localStorage.setItem('LogsCaptureStatus', 'started');
		setTimeout(() => {
			localStorage.setItem('LogsCaptureStatus', 'stopped');
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
		localStorage.setItem('LogsCaptureStatus', 'stopped');
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
			data: `{'id':'${fileId}'}`,
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
	 * Загрузить на станцию файл записи
	 * @param file - Тело загружаемого файла
	 * @param callback - функция для обработки результата
	 */
	SystemUploadAudioFile(file, callback) {
		$.api({
			on: 'now',
			url: PbxApi.systemUploadAudioFile,
			method: 'POST',
			cache: false,
			processData: false,
			contentType: false,
			beforeSend: (settings) => {
				const extension = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2);
				const newFileName = `${parseInt(Date.now() / 1000, 10)}.${extension}`;
				const newSettings = settings;
				// const newFile = new File([file], newFileName);
				const blob = new Blob([file]);
				blob.lastModifiedDate = new Date();
				newSettings.data = new FormData();
				// newSettings.data.append(newFileName, newFile);
				newSettings.data.append('file', blob, newFileName);
				return newSettings;
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response.filename);
			},
		});
	},
	/**
	 * Получить список архивов
	 */
	SystemRemoveAudioFile(filePath) {
		$.api({
			url: PbxApi.systemRemoveAudioFile,
			on: 'now',
			method: 'POST',
			data: `{'filename':'${filePath}'}`,
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
						// Show upload progress on bar
						callback(json);
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
				callback(response);
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
	ModuleDisable(moduleName, callback) {
		$.api({
			url: PbxApi.moduleDisable,
			on: 'now',
			urlData: {
				moduleName,
			},
			successTest: PbxApi.successTest,
			onSuccess(response) {
				callback(response);
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
	 * Disable pbxExtension module
	 */
	ModuleEnable(moduleName, callback) {
		$.api({
			url: PbxApi.moduleEnable,
			on: 'now',
			urlData: {
				moduleName,
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
				callback(response);
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
