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


/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFilesSelector, $ */

const generalSettingsModify = {
	$dirrtyField: $('#dirrty'),
	$formObj: $('#general-settings-form'),
	$webAdminPassword: $('#WebAdminPassword'),
	$recordsSavePeriodSlider:  $('#PBXRecordSavePeriodSlider'),
	saveRecordsPeriod:['30', '90', '180', '360', '1080',''],
	$sshPassword: $('#SSHPassword'),
	validateRules: { // generalSettingsModify.validateRules.SSHPassword.rules
		pbxname: {
			identifier: 'PBXName',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.gs_ValidateEmptyPBXName,
				},
			],
		},
		WebAdminPassword: {
			identifier: 'WebAdminPassword',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.gs_ValidateEmptyWebPassword,
				},
				{
					type: 'minLength[5]',
					prompt: globalTranslate.gs_ValidateWeakWebPassword,
				},
				{
					type   : 'notRegExp',
					value  : /[a-z]/,
					prompt : '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
				},
				{
					type   : 'notRegExp',
					value  : /\d/,
					prompt : '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
				},
				{
					type   : 'notRegExp',
					value  : /[A-Z]/,
					prompt : '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
				}
			],
		},
		WebAdminPasswordRepeat: {
			identifier: 'WebAdminPasswordRepeat',
			rules: [
				{
					type: 'match[WebAdminPassword]',
					prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent,
				},
			],
		},
		SSHPassword: {
			identifier: 'SSHPassword',
			rules: [],
		},
		SSHPasswordRepeat: {
			identifier: 'SSHPasswordRepeat',
			rules: [
				{
					type: 'match[SSHPassword]',
					prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent,
				},
			],
		},
		WEBPort: {
			identifier: 'WEBPort',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.gs_ValidateWEBPortOutOfRange,
				},
				{
					type: 'different[WEBHTTPSPort]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort,
				},
				{
					type: 'different[AJAMPortTLS]',
					prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamPort,
				},
				{
					type: 'different[AJAMPort]',
					prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamTLSPort,
				},
			],
		},
		WEBHTTPSPort: {
			identifier: 'WEBHTTPSPort',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortOutOfRange,
				},
				{
					type: 'different[WEBPort]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort,
				},
				{
					type: 'different[AJAMPortTLS]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamPort,
				},
				{
					type: 'different[AJAMPort]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamTLSPort,
				},
			],
		},
		AJAMPort: {
			identifier: 'AJAMPort',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange,
				},
				{
					type: 'different[AJAMPortTLS]',
					prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange,
				},
			],
		},
	},
	additionalSshValidRulesPass: [
		{
			type: 'empty',
			prompt: globalTranslate.gs_ValidateEmptySSHPassword,
		},
		{
			type: 'minLength[5]',
			prompt: globalTranslate.gs_ValidateWeakSSHPassword,
		},
		{
			type   : 'notRegExp',
			value  : /[a-z]/,
			prompt : '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' +globalTranslate.gs_PasswordNoLowSimvol
		},
		{
			type   : 'notRegExp',
			value  : /\d/,
			prompt : '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
		},
		{
			type   : 'notRegExp',
			value  : /[A-Z]/,
			prompt :'<b>' +  globalTranslate.gs_SSHPassword + '</b>: ' +globalTranslate.gs_PasswordNoUpperSimvol
		}
	],
	additionalSshValidRulesNoPass: [
		{
			type: 'empty',
			prompt: globalTranslate.gs_ValidateEmptySSHPassword,
		},
		{
			type: 'minLength[5]',
			prompt: globalTranslate.gs_ValidateWeakSSHPassword,
		}
	],
	initialize() {
		generalSettingsModify.$webAdminPassword.on('keyup', () => {
			PasswordScore.checkPassStrength({
				pass: generalSettingsModify.$webAdminPassword.val(),
				bar: $('.password-score'),
				section: $('.password-score-section'),
			});
		});
		generalSettingsModify.$sshPassword.on('keyup', () => {
			PasswordScore.checkPassStrength({
				pass: generalSettingsModify.$sshPassword.val(),
				bar: $('.ssh-password-score'),
				section: $('.ssh-password-score-section'),
			});
		});
		$('#general-settings-menu').find('.item').tab({
			history: true,
			historyType: 'hash',
		});
		$('#general-settings-form .checkbox').checkbox(
			{
				'onChange': generalSettingsModify.initRules
			}
		);
		$('#general-settings-form .dropdown').dropdown();

		$('#audio-codecs-table, #video-codecs-table').tableDnD({
			onDrop() {
				generalSettingsModify.$dirrtyField.val(Math.random());
				generalSettingsModify.$dirrtyField.trigger('change');
			},
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});

		$('#general-settings-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // PBXRecordSavePeriod
		generalSettingsModify.$recordsSavePeriodSlider
			.slider({
				min: 0,
				max: 5,
				step: 1,
				smooth: true,
				interpretLabel: function(value) {
					let labels = [
						globalTranslate.gs_Store1MonthOfRecords,
						globalTranslate.gs_Store3MonthsOfRecords,
						globalTranslate.gs_Store6MonthsOfRecords,
						globalTranslate.gs_Store1YearOfRecords,
						globalTranslate.gs_Store3YearsOfRecords,
						globalTranslate.gs_StoreAllPossibleRecords,
					];
					return labels[value];
				},
				onChange: generalSettingsModify.cbAfterSelectSavePeriodSlider,
			})
		;


		generalSettingsModify.initializeForm();

		const recordSavePeriod = generalSettingsModify.$formObj.form('get value', 'PBXRecordSavePeriod');
		generalSettingsModify.$recordsSavePeriodSlider
			.slider('set value', generalSettingsModify.saveRecordsPeriod.indexOf(recordSavePeriod), false);

		$(window).on('GS-ActivateTab', (event, nameTab) => {
			$('#general-settings-menu').find('.item').tab('change tab', nameTab);
		});
	},
	checkDeleteAllConditions(){
		const deleteAllInput = generalSettingsModify.$formObj.form('get value', 'deleteAllInput');
		if (deleteAllInput === globalTranslate.gs_EnterDeleteAllPhrase){
			PbxApi.SystemRestoreDefaultSettings(generalSettingsModify.cbAfterRestoreDefaultSettings);
		}

	},
	cbAfterRestoreDefaultSettings(response){
		if (response===true){
			UserMessage.showInformation(globalTranslate.gs_AllSettingsDeleted);
		} else {
			UserMessage.showMultiString(response);
		}
	},
	cbAfterSelectSavePeriodSlider(value){
		const savePeriod = generalSettingsModify.saveRecordsPeriod[value];
		generalSettingsModify.$formObj.form('set value', 'PBXRecordSavePeriod', savePeriod);
		generalSettingsModify.$dirrtyField.val(Math.random());
		generalSettingsModify.$dirrtyField.trigger('change');
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = generalSettingsModify.$formObj.form('get values');
		const arrCodecs = [];
		$('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each((index, obj) => {
			if ($(obj).attr('id')) {
				arrCodecs.push({
					codecId: $(obj).attr('id'),
					disabled: $(obj).find('.checkbox').checkbox('is unchecked'),
					priority: index,
				});
			}
		});
		result.data.codecs = JSON.stringify(arrCodecs);

		return result;
	},
	cbAfterSendForm(response) {
		if(!response.success){
			Form.$submitButton.removeClass('disabled');
		}else{
			$('.password-validate').remove();
		}
		generalSettingsModify.checkDeleteAllConditions();
	},
	initRules() {
		if($('#SSHDisablePasswordLogins').parent().checkbox('is checked')){
			generalSettingsModify.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesNoPass;
		}else{
			generalSettingsModify.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesPass;
		}
	},
	initializeForm() {
		generalSettingsModify.initRules();
		Form.$formObj 			= generalSettingsModify.$formObj;
		Form.url 				= `${globalRootUrl}general-settings/save`;
		Form.validateRules 		= generalSettingsModify.validateRules;
		Form.cbBeforeSendForm 	= generalSettingsModify.cbBeforeSendForm;
		Form.cbAfterSendForm 	= generalSettingsModify.cbAfterSendForm;
		Form.initialize();
	}
};

$(document).ready(() => {
	generalSettingsModify.initialize();
});