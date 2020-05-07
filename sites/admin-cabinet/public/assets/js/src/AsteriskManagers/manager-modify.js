/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global globalRootUrl,globalTranslate, Form */

const manager = {
	$formObj: $('#save-ami-form'),
	$dropDowns: $('#save-ami-form .ui.dropdown'),
	$masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),
	$childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),
	$allCheckBoxes: $('#save-ami-form .list .checkbox'),
	$unCheckButton: $('.uncheck.button'),
	validateRules: {
		username: {
			identifier: 'username',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.am_ValidationAMINameIsEmpty,
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
		manager.initializeForm();
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


$(document).ready(() => {
	manager.initialize();
});
