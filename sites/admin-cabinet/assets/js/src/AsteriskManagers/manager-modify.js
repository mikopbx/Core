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

/* global globalRootUrl,globalTranslate, Form */

const manager = {
	$formObj: $('#save-ami-form'),
	$dropDowns: $('#save-ami-form .ui.dropdown'),
	$masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),
	$childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),
	$allCheckBoxes: $('#save-ami-form .list .checkbox'),
	$unCheckButton: $('.uncheck.button'),
	$username: $('#username'),
	originalName:'',
	validateRules: {
		username: {
			identifier: 'username',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.am_ValidationAMINameIsEmpty,
				},
				{
					type: 'existRule[username-error]',
					prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable,
				},
			],
		},
		secret: {
			identifier: 'secret',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.am_ValidationAMISecretIsEmpty,
				},
			],
		},
	},
	initialize() {
		manager.$dropDowns.dropdown();
		manager.$masterCheckBoxes
			.checkbox({
				// check all children
				onChecked() {
					const
						$childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
					$childCheckbox.checkbox('check');
				},
				// uncheck all children
				onUnchecked() {
					const
						$childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
					$childCheckbox.checkbox('uncheck');
				},
			});
		manager.$childrenCheckBoxes
			.checkbox({
				// Fire on load to set parent value
				fireOnInit: true,
				// Change parent state on each child checkbox change
				onChange() {
					const $listGroup = $(this).closest('.list');
					const $parentCheckbox = $listGroup.closest('.item').children('.checkbox');
					const $checkbox = $listGroup.find('.checkbox');
					let allChecked = true;
					let allUnchecked = true;
					// check to see if all other siblings are checked or unchecked
					$checkbox.each(function () {
						if ($(this).checkbox('is checked')) {
							allUnchecked = false;
						} else {
							allChecked = false;
						}
					});
					// set parent checkbox state, but dont trigger its onChange callback
					if (allChecked) {
						$parentCheckbox.checkbox('set checked');
					} else if (allUnchecked) {
						$parentCheckbox.checkbox('set unchecked');
					} else {
						$parentCheckbox.checkbox('set indeterminate');
					}
				},
			});
		manager.$unCheckButton.on('click', (e) => {
			e.preventDefault();
			manager.$allCheckBoxes.checkbox('uncheck');
		});
		manager.$username.on('change', (value)=>{
			const userId = manager.$formObj.form('get value','id');
			const newValue = manager.$formObj.form('get value','username');
			manager.checkAvailability(manager.originalName, newValue, 'username', userId);
		});
		manager.initializeForm();
		manager.originalName = manager.$formObj.form('get value','username');
	},
	/**
	 * Checks if username doesn't exist in database
	 * @param oldName
	 * @param newName
	 * @param cssClassName
	 * @param userId
	 * @returns {*}
	 */
	checkAvailability(oldName, newName, cssClassName = 'username', userId = '') {
		if (oldName === newName) {
			$(`.ui.input.${cssClassName}`).parent().removeClass('error');
			$(`#${cssClassName}-error`).addClass('hidden');
			return;
		}
		$.api({
			url: `${globalRootUrl}asterisk-managers/available/{value}`,
			stateContext: `.ui.input.${cssClassName}`,
			on: 'now',
			beforeSend(settings) {
				const result = settings;
				result.urlData = {
					value: newName,
				};
				return result;
			},
			onSuccess(response) {
				if (response.nameAvailable) {
					$(`.ui.input.${cssClassName}`).parent().removeClass('error');
					$(`#${cssClassName}-error`).addClass('hidden');
				} else if (userId.length > 0 && response.userId === userId) {
					$(`.ui.input.${cssClassName}`).parent().removeClass('error');
					$(`#${cssClassName}-error`).addClass('hidden');
				} else {
					$(`.ui.input.${cssClassName}`).parent().addClass('error');
					$(`#${cssClassName}-error`).removeClass('hidden');
				}
			},
		});
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = manager.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = manager.$formObj;
		Form.url = `${globalRootUrl}asterisk-managers/save`;
		Form.validateRules = manager.validateRules;
		Form.cbBeforeSendForm = manager.cbBeforeSendForm;
		Form.cbAfterSendForm = manager.cbAfterSendForm;
		Form.initialize();
	},

};

// Check uniqueness Username
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

$(document).ready(() => {
	manager.initialize();
});
