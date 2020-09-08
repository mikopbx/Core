/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, ace, Form, PbxApi */

const customFile = {
	$formObj: $('#custom-file-form'),
	$typeSelectDropDown: $('#custom-file-form .type-select'),
	$appCode: $('#application-code'),
	$appCodeFromServer: $('#application-code-readonly'),
	editor: '',
	viewer: '',
	validateRules: {
		name: {
			identifier: 'filepath',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cf_ValidateNameIsEmpty,
				},
			],
		},
	},
	initialize() {
		customFile.$typeSelectDropDown.dropdown({
			onChange() {
				customFile.hideShowCode();
				customFile.getFileContentFromServer();
			},
		});

		customFile.initializeAce();
		customFile.initializeForm();
		customFile.getFileContentFromServer();
	},
	hideShowCode() {
		const aceHeight = window.innerHeight-500;
		const rowsCount = Math.round(aceHeight/16.3);
		$(window).load(function() {
			$('.application-code-readonly').css('min-height', `${aceHeight}px`);
			$('.application-code').css('min-height', `${aceHeight}px`);
		});
		const mode = customFile.$formObj.form('get value', 'mode');
		switch (mode) {
			case 'none':
				customFile.viewer.navigateFileStart();
				customFile.$appCodeFromServer.show();
				customFile.$appCode.hide();
				customFile.viewer.setOptions({
					maxLines: rowsCount,
				});
				customFile.viewer.resize()
				break;
			case 'append':
				customFile.$appCodeFromServer.show();
				customFile.viewer.navigateFileEnd();
				customFile.editor.setValue(customFile.$formObj.form('get value', 'content'));
				customFile.$appCode.show();
				break;
			case 'override':
				customFile.editor.navigateFileStart();
				customFile.$appCodeFromServer.hide();
				customFile.editor.setValue(customFile.$formObj.form('get value', 'content'));
				customFile.$appCode.show();
				customFile.editor.setOptions({
					maxLines: rowsCount,
				});
				customFile.editor.resize()
				break;
			default:
				break;
		}
	},
	cbGetFileContentFromServer(response) {
		if (response !== undefined) {
			const fileContent = decodeURIComponent(response.data.content);
			customFile.viewer.setValue(fileContent);
			customFile.hideShowCode();
		}
	},
	getFileContentFromServer() {
		const filePath = customFile.$formObj.form('get value', 'filepath');
		const mode = customFile.$formObj.form('get value', 'mode') !== 'override';
		const data = { filename: filePath, needOriginal: mode, needLogfile: false };
		PbxApi.GetFileContent(data, customFile.cbGetFileContentFromServer);
	},
	initializeAce() {
		const IniMode = ace.require('ace/mode/julia').Mode;
		customFile.viewer = ace.edit('application-code-readonly');
		customFile.viewer.session.setMode(new IniMode());
		customFile.viewer.setTheme('ace/theme/monokai');
		customFile.viewer.setOptions({
			showPrintMargin: false,
			readOnly: true
		});
		customFile.viewer.resize();

		customFile.editor = ace.edit('application-code');
		customFile.editor.setTheme('ace/theme/monokai');
		customFile.editor.session.setMode(new IniMode());
		customFile.editor.setOptions({
			showPrintMargin: false,
		});
		customFile.editor.resize();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = customFile.$formObj.form('get values');
		switch (customFile.$formObj.form('get value', 'mode')) {
			case 'append':
			case 'override':
				result.data.content = customFile.editor.getValue();
				break;
			default:
				result.data.content = '';
		}
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = customFile.$formObj;
		Form.url = `${globalRootUrl}custom-files/save`;
		Form.validateRules = customFile.validateRules;
		Form.cbBeforeSendForm = customFile.cbBeforeSendForm;
		Form.cbAfterSendForm = customFile.cbAfterSendForm;
		Form.enableDirrity = false;
		Form.initialize();
	},
};

$(document).ready(() => {
	customFile.initialize();
});

