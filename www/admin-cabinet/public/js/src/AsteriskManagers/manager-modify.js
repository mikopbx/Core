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
		$('.network-filter-select').dropdown();
		$('.list .master.checkbox')
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
		$('.list .child.checkbox')
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
		$('.uncheck.button').on('click', (e) => {
			e.preventDefault();
			$('.checkbox').checkbox('uncheck');
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
