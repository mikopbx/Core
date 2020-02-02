/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Extensions,Form  */

// Проверка нет ли ошибки занятого другой учеткой номера
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

const callQueue = {
	defaultExtension: '',
	$number: $('#extension'),
	$dirrtyField: $('#dirrty'),
	AvailableMembersList: [],
	$formObj: $('#queue-form'),
	$errorMessages: $('#form-error-messages'),
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cq_ValidateNameEmpty,
				},
			],
		},
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cq_ValidateExtensionEmpty,
				},
				{
					type: 'existRule[extension-error]',
					prompt: globalTranslate.cq_ValidateExtensionDouble,
				},
			],
		},
	},
	initialize() {
		Extensions.getPhoneExtensions(callQueue.setAvailableQueueMembers);
		callQueue.defaultExtension = $('#extension').val();
		$('.ui.accordion').accordion();

		$('.dropdown').dropdown();

		$('.checkbox').checkbox();

		$('.periodic-announce-sound-id-select').dropdown({
			onChange(value) {
				if (parseInt(value, 10) === -1) $(this).dropdown('clear');
				// console.log(value);
			},
		});
		$('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
		Extensions.fixBugDropdownIcon();
		// Динамическая прововерка свободен ли внутренний номер
		callQueue.$number.on('change', () => {
			const newNumber = callQueue.$formObj.form('get value', 'extension');
			Extensions.checkAvailability(callQueue.defaultNumber, newNumber);
		});

		callQueue.initializeDragAndDropExtensionTableRows();

		// Удаление строки из таблицы участников очереди
		$('.delete-row-button').on('click', (e) => {
			$(e.target).closest('tr').remove();
			callQueue.reinitializeExtensionSelect();
			callQueue.updateExtensionTableView();
			callQueue.$dirrtyField.val(Math.random());
			callQueue.$dirrtyField.trigger('change');
			e.preventDefault();
			return false;
		});

		callQueue.initializeForm();
	},
	setAvailableQueueMembers(arrResult) {
		$.each(arrResult.results, (index, extension) => {
			callQueue.AvailableMembersList.push({
				number: extension.value,
				callerid: extension.name,
			});
		});
		callQueue.reinitializeExtensionSelect();
		callQueue.updateExtensionTableView();
	},
	// Вернуть список доступных членов очереди
	getAvailableQueueMembers() {
		const result = [];
		callQueue.AvailableMembersList.forEach((member) => {
			if ($(`.member-row#${member.number}`).length === 0) {
				result.push({
					name: member.callerid,
					value: member.number,
				});
			}
		});
		// result.sort((a, b) => ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)));
		return result;
	},
	// Пересобрать членов очереди с учетом уже выбранных
	reinitializeExtensionSelect() {
		$('#extensionselect').dropdown({
			action: 'hide',
			forceSelection: false,
			onChange(value, text) {
				if (value) {
					const $tr = $('.member-row-tpl').last();
					const $clone = $tr.clone(true);
					$clone
						.removeClass('member-row-tpl')
						.addClass('member-row')
						.show();
					$clone.attr('id', value);
					$clone.find('.number').html(value);
					$clone.find('.callerid').html(text);
					if ($('.member-row').last().length === 0) {
						$tr.after($clone);
					} else {
						$('.member-row').last().after($clone);
					}

					callQueue.reinitializeExtensionSelect();
					callQueue.updateExtensionTableView();
					callQueue.$dirrtyField.val(Math.random());
					callQueue.$dirrtyField.trigger('change');
				}
			},
			values: callQueue.getAvailableQueueMembers(),

		});
	}, // Включить возможность перетаскивания элементов таблицы участников очереди

	initializeDragAndDropExtensionTableRows() {
		$('#extensionsTable').tableDnD({
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
			onDrop: () => {
				callQueue.$dirrtyField.val(Math.random());
				callQueue.$dirrtyField.trigger('change');
			},
		});
	},

	// Отобразить заглушку если в таблице 0 строк
	updateExtensionTableView() {
		const dummy = `<tr class="dummy"><td colspan="4" class="center aligned">${globalTranslate.cq_AddQueueMembers}</td></tr>`;

		if ($('.member-row').length === 0) {
			$('#extensionsTable tbody').append(dummy);
		} else {
			$('.dummy').remove();
		}
	},
	cbBeforeSendForm(settings) {
		let result = settings;
		result.data = callQueue.$formObj.form('get values');
		const arrMembers = [];
		$('.member-row').each((index, obj) => {
			if ($(obj).attr('id')) {
				arrMembers.push({
					number: $(obj).attr('id'),
					priority: index,
				});
			}
		});
		if (arrMembers.length === 0) {
			result = false;
			callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
			callQueue.$formObj.addClass('error');
		} else {
			result.data.members = JSON.stringify(arrMembers);
		}

		return result;
	},
	cbAfterSendForm() {
		callQueue.defaultNumber = callQueue.$number.val();
	},
	initializeForm() {
		Form.$formObj = callQueue.$formObj;
		Form.url = `${globalRootUrl}call-queues/save`;
		Form.validateRules = callQueue.validateRules;
		Form.cbBeforeSendForm = callQueue.cbBeforeSendForm;
		Form.cbAfterSendForm = callQueue.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	callQueue.initialize();
});

