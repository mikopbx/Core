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
	$formObj: $('#save-ami-form'), // Form object
	$dropDowns: $('#save-ami-form .ui.dropdown'), // Dropdown elements
	$masterCheckBoxes: $('#save-ami-form .list .master.checkbox'), // Master checkbox elements
	$childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),  // Child checkbox elements
	$allCheckBoxes: $('#save-ami-form .list .checkbox'), // All checkbox elements
	$unCheckButton: $('.uncheck.button'),  // Uncheck button element
	$username: $('#username'),  // Username input field
	originalName:'', // Original username value
	validateRules: {
		// Validation rules for the form fields
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
		// Initialize dropdowns
		manager.$dropDowns.dropdown();

		// Initialize master checkboxes
		manager.$masterCheckBoxes
			.checkbox({
				// Check all children
				onChecked() {
					const
						$childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
					$childCheckbox.checkbox('check');
				},
				// Uncheck all children
				onUnchecked() {
					const
						$childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
					$childCheckbox.checkbox('uncheck');
				},
			});

		// Initialize child checkboxes
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

					// Check if all other siblings are checked or unchecked
					$checkbox.each(function () {
						if ($(this).checkbox('is checked')) {
							allUnchecked = false;
						} else {
							allChecked = false;
						}
					});

					// Set parent checkbox state, but don't trigger its onChange callback
					if (allChecked) {
						$parentCheckbox.checkbox('set checked');
					} else if (allUnchecked) {
						$parentCheckbox.checkbox('set unchecked');
					} else {
						$parentCheckbox.checkbox('set indeterminate');
					}
				},
			});

		// Handle uncheck button click
		manager.$unCheckButton.on('click', (e) => {
			e.preventDefault();
			manager.$allCheckBoxes.checkbox('uncheck');
		});

		// Handle username change
		manager.$username.on('change', (value)=>{
			const userId = manager.$formObj.form('get value','id');
			const newValue = manager.$formObj.form('get value','username');
			manager.checkAvailability(manager.originalName, newValue, 'username', userId);
		});
		manager.initializeForm();
		manager.originalName = manager.$formObj.form('get value','username');
	},
	/**
	 * Checks if username
	 doesn't exist in the database
	 * @param {string} oldName - The old username
	 * @param {string} newName - The new username
	 * @param {string} cssClassName - The CSS class name
	 * @param {string} userId - The user ID
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
		// Callback function after sending the form
	},
	initializeForm() {
		// Initialize the form
		Form.$formObj = manager.$formObj;
		Form.url = `${globalRootUrl}asterisk-managers/save`;
		Form.validateRules = manager.validateRules;
		Form.cbBeforeSendForm = manager.cbBeforeSendForm;
		Form.cbAfterSendForm = manager.cbAfterSendForm;
		Form.initialize();
	},

};

// Custom form validation rule for checking uniqueness of username
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

$(document).ready(() => {
	manager.initialize();
});
