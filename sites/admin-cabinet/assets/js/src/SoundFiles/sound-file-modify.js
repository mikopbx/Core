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

/* global globalRootUrl, globalTranslate, Form, PbxApi, sndPlayer, mergingCheckWorker */


const soundFileModify = {
	trashBin: [],
	$soundUploadButton: $('#upload-sound-file'),
	$soundFileInput: $('#file'),
	$soundFileName: $('#name'),
	$audioPlayer: $('#audio-player'),
	$submitButton: $('#submitbutton'),
	blob: window.URL || window.webkitURL,
	$formObj: $('#sound-file-form'),
	$dropDowns: $('#sound-file-form .dropdown'),
	validateRules: {
		description: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.sf_ValidationFileNameIsEmpty,
				},
			],
		},
		path: {
			identifier: 'path',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.sf_ValidationFileNotSelected,
				},
			],
		},
	},
	initialize() {
		soundFileModify.$dropDowns.dropdown();
		soundFileModify.initializeForm();

		soundFileModify.$soundUploadButton.on('click', (e) => {
			e.preventDefault();
			$('input:file', $(e.target).parents()).click();
		});

		soundFileModify.$soundFileInput.on('change', (e) => {
			const file = e.target.files[0];
			if (file === undefined) return;
			soundFileModify.$soundFileName.val(file.name.replace(/\.[^/.]+$/, ''));
			soundFileModify.blob = window.URL || window.webkitURL;
			const fileURL = soundFileModify.blob.createObjectURL(file);
			sndPlayer.UpdateSource(fileURL);
			PbxApi.FilesUploadFile(file, soundFileModify.cbUploadResumable);

		});
		window.addEventListener('ConfigDataChanged', soundFileModify.cbOnDataChanged);
	},

	/**
	 * We will drop all caches if data changes
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`${globalRootUrl}sound-files/getSoundFiles/custom`);
		sessionStorage.removeItem(`${globalRootUrl}sound-files/getSoundFiles/moh`);
	},

	/**
	 * Callback file upload with chunks and merge
	 * @param action
	 * @param params
	 */
	cbUploadResumable(action, params){
		switch (action) {
			case 'fileSuccess':
				const response = PbxApi.tryParseJSON(params.response);
				if (response !==false && response.data.filename!==undefined){
					soundFileModify.$soundFileName.val(params.file.fileName);
					soundFileModify.checkStatusFileMerging(params.response);
				} else {
					UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
				}

				break;
			case 'uploadStart':
				soundFileModify.$formObj.addClass('loading');
				break;
			case 'error':
				soundFileModify.$submitButton.removeClass('loading');
				soundFileModify.$formObj.removeClass('loading');
				UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
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
			UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
			return;
		}
		const json = JSON.parse(response);
		if (json === undefined || json.data === undefined) {
			UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
			return;
		}
		const fileID = json.data.upload_id;
		const filePath = json.data.filename;
		mergingCheckWorker.initialize(fileID, filePath);
	},
	/**
	 * After file converted to MP3 format
	 * @param filename
	 */
	cbAfterConvertFile(filename) {
		if (filename === false){
			UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
		} else {
			soundFileModify.trashBin.push(soundFileModify.$formObj.form('get value', 'path'));
			soundFileModify.$formObj.form('set value', 'path', filename);
			soundFileModify.$soundFileName.trigger('change');
			sndPlayer.UpdateSource(`/pbxcore/api/cdr/v2/playback?view=${filename}`);
			soundFileModify.$submitButton.removeClass('loading');
			soundFileModify.$formObj.removeClass('loading');

		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = soundFileModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		soundFileModify.trashBin.forEach((filepath) => {
			if (filepath) PbxApi.FilesRemoveAudioFile(filepath);
		});
		const event = document.createEvent('Event');
		event.initEvent('ConfigDataChanged', false, true);
		window.dispatchEvent(event);
	},
	initializeForm() {
		const category = soundFileModify.$formObj.form('get value', 'category');
		Form.$formObj = soundFileModify.$formObj;
		Form.url = `${globalRootUrl}sound-files/save`;
		Form.validateRules = soundFileModify.validateRules;
		Form.cbBeforeSendForm = soundFileModify.cbBeforeSendForm;
		Form.cbAfterSendForm = soundFileModify.cbAfterSendForm;
		Form.afterSubmitModifyUrl = `${globalRootUrl}sound-files/modify/${category}`;
		Form.afterSubmitIndexUrl = `${globalRootUrl}sound-files/index/#/${category}`;
		Form.initialize();
	},
};


$(document).ready(() => {
	soundFileModify.initialize();
});
