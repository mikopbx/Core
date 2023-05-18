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

/* global globalRootUrl,globalTranslate, Extensions, Form */

// Если выбран вариант переадресации на номер, а сам номер не выбран
//
$.fn.form.settings.rules.extensionRule = function (value) {
	if (($('#action').val() === 'extension') &&
		(value === -1 || value === '')) {
		return false;
	}
	return true;
};

const incomingRoutes = {
	$formObj: $('#default-rule-form'),
	$actionDropdown: $('#action'),
	validateRules: {
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'extensionRule',
					prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
				},
			],
		},
	},
	initialize() {
		$('#routingTable').tableDnD({
			onDrop: incomingRoutes.cbOnDrop,
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});

		incomingRoutes.$actionDropdown.dropdown({
			onChange: incomingRoutes.toggleDisabledFieldClass
		});

		incomingRoutes.toggleDisabledFieldClass();

		incomingRoutes.initializeForm();
		$('.forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting());

		$('.rule-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}incoming-routes/modify/${id}`;
		});
	},
	cbOnDrop() {
		let priorityWasChanged = false;
		const priorityData = {};
		$('.rule-row').each((index, obj) => {
			const ruleId = $(obj).attr('id');
			const oldPriority = parseInt($(obj).attr('data-value'), 10);
			const newPriority = obj.rowIndex;
			if (oldPriority !== newPriority) {
				priorityWasChanged = true;
				priorityData[ruleId] = newPriority;
			}
		});
		if (priorityWasChanged) {
			$.api({
				on: 'now',
				url: `${globalRootUrl}incoming-routes/changePriority`,
				method: 'POST',
				data: priorityData,
			});
		}
	},
	toggleDisabledFieldClass() {
		if (incomingRoutes.$formObj.form('get value', 'action') === 'extension') {
			$('#extension-group').show();
		} else {
			$('#extension-group').hide();
			$('#extension').dropdown('clear');
		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = incomingRoutes.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = incomingRoutes.$formObj;
		Form.url = `${globalRootUrl}incoming-routes/save`;
		Form.validateRules = incomingRoutes.validateRules;
		Form.cbBeforeSendForm = incomingRoutes.cbBeforeSendForm;
		Form.cbAfterSendForm = incomingRoutes.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	incomingRoutes.initialize();
});
