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

/* global globalRootUrl,globalTranslate, Extensions, Form, SemanticLocalization, SoundFilesSelector */


$.fn.form.settings.rules.customNotEmptyIfActionRule = (value, action) => {
	if (value.length === 0 && $('#action').val() === action) {
		return false;
	}
	return true;
};

const outOfWorkTimeRecord = {
	$formObj: $('#save-outoffwork-form'),
	$defaultDropdown: $('#save-outoffwork-form .dropdown-default'),
	$rangeDaysStart: $('#range-days-start'),
	$rangeDaysEnd: $('#range-days-end'),
	$rangeTimeStart: $('#range-time-start'),
	$rangeTimeEnd: $('#range-time-end'),
	$date_from: $('#date_from'),
	$date_to: $('#date_to'),
	$time_to: $('#time_to'),
	$forwardingSelectDropdown: $('#save-outoffwork-form .forwarding-select'),
	validateRules: {
		audio_message_id: {
			identifier: 'audio_message_id',
			rules: [
				{
					type: 'customNotEmptyIfActionRule[playmessage]',
					prompt: globalTranslate.tf_ValidateAudioMessageEmpty,
				},
			],
		},
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'customNotEmptyIfActionRule[extension]',
					prompt: globalTranslate.tf_ValidateExtensionEmpty,
				},
			],
		},
		timefrom: {
			optional: true,
			identifier: 'time_from',
			rules: [{
				type: 'regExp',
				value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
				prompt: globalTranslate.tf_ValidateCheckTimeInterval,
			}],
		},
		timeto: {
			identifier: 'time_to',
			optional: true,
			rules: [{
				type: 'regExp',
				value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
				prompt: globalTranslate.tf_ValidateCheckTimeInterval,
			}],
		},
	},
	initialize() {
		outOfWorkTimeRecord.$defaultDropdown.dropdown();
		outOfWorkTimeRecord.$rangeDaysStart.calendar({
			firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
			text: SemanticLocalization.calendarText,
			endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
			type: 'date',
			inline: false,
			monthFirst: false,
			regExp: SemanticLocalization.regExp,
		});
		outOfWorkTimeRecord.$rangeDaysEnd.calendar({
			firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
			text: SemanticLocalization.calendarText,
			startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
			type: 'date',
			inline: false,
			monthFirst: false,
			regExp: SemanticLocalization.regExp,
			onChange: (newDateTo) => {
				let oldDateTo = outOfWorkTimeRecord.$date_to.attr('value');
				if (newDateTo !== null && oldDateTo !== '') {
					oldDateTo = new Date(oldDateTo * 1000);
					if ((newDateTo - oldDateTo) !== 0) {
						outOfWorkTimeRecord.$date_from.trigger('change');
					}
				}
			},
		});
		outOfWorkTimeRecord.$rangeTimeStart.calendar({
			firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
			text: SemanticLocalization.calendarText,
			endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
			type: 'time',
			inline: false,
			disableMinute: true,
			ampm: false,
		});
		outOfWorkTimeRecord.$rangeTimeEnd.calendar({
			firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
			text: SemanticLocalization.calendarText,
			startCalendar: outOfWorkTimeRecord.$rangeTimeStart,
			type: 'time',
			inline: false,
			disableMinute: true,
			ampm: false,
			onChange: (newTimeTo) => {
				let oldTimeTo = outOfWorkTimeRecord.$time_to.attr('value');
				if (newTimeTo !== null && oldTimeTo !== '') {
					oldTimeTo = new Date(oldTimeTo * 1000);
					if ((newTimeTo - oldTimeTo) !== 0) {
						outOfWorkTimeRecord.$time_to.trigger('change');
					}
				}
			},
		});
		$('#action')
			.dropdown({
				onChange() {
					outOfWorkTimeRecord.toggleDisabledFieldClass();
				},
			});
		$('#weekday_from')
			.dropdown({
				onChange() {
					const from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
					const to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');
					if (from < to || to === -1 || from === -1) {
						outOfWorkTimeRecord.$formObj.form('set value', 'weekday_to', from);
					}
				},
			});
		$('#weekday_to')
			.dropdown({
				onChange() {
					const from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
					const to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');
					if (to < from || from === -1) {
						outOfWorkTimeRecord.$formObj.form('set value', 'weekday_from', to);
					}
				},
			});

		$('#erase-dates').on('click', (e) => {
			outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
			outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear');
			outOfWorkTimeRecord.$formObj
				.form('set values', {
					date_from: '',
					date_to: '',
				});
			e.preventDefault();
		});

		$('#erase-weekdays').on('click', (e) => {
			outOfWorkTimeRecord.$formObj
				.form('set values', {
					weekday_from: -1,
					weekday_to: -1,
				});
			outOfWorkTimeRecord.$rangeDaysStart.trigger('change');
			e.preventDefault();
		});
		$('#erase-timeperiod').on('click', (e) => {
			outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
			outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
			outOfWorkTimeRecord.$time_to.trigger('change');
			e.preventDefault();
		});

		$('#save-outoffwork-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

		outOfWorkTimeRecord.initializeForm();
		outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsWithoutEmpty());
		outOfWorkTimeRecord.toggleDisabledFieldClass();
		outOfWorkTimeRecord.changeDateFormat();
	},
	/**
	 * Меняет представление даты начала и даты окончания из linuxtime в локальное представление
	 */
	changeDateFormat() {
		const dateFrom = outOfWorkTimeRecord.$date_from.attr('value');
		const dateTo = outOfWorkTimeRecord.$date_to.attr('value');
		if (dateFrom !== undefined && dateFrom.length > 0) {
			outOfWorkTimeRecord.$rangeDaysStart.calendar('set date', new Date(dateFrom * 1000));
			// outOfWorkTimeRecord.$formObj.form('set value', 'date_from', dateFrom);
		}
		if (dateTo !== undefined && dateTo.length > 0) {
			outOfWorkTimeRecord.$rangeDaysEnd.calendar('set date', new Date(dateTo * 1000));
			// outOfWorkTimeRecord.$formObj.form('set value', 'date_to', dateTo);
		}
	},
	toggleDisabledFieldClass() {
		if (outOfWorkTimeRecord.$formObj.form('get value', 'action') === 'extension') {
			$('#extension-group').show();
			$('#audio-file-group').hide();
			$('#audio_message_id').dropdown('clear');
		} else {
			$('#extension-group').hide();
			$('#audio-file-group').show();
			outOfWorkTimeRecord.$formObj.form('set value', 'extension', -1);
		}
	},
	/**
	 * Кастомная проверка полей формы, которые не получается сделать через валидацию
	 * @param result
	 * @returns {*}
	 */
	customValidateForm(result) {
		// Проверим поля даты
		if ((result.data.date_from !== '' && result.data.date_to === '')
			|| (result.data.date_to !== '' && result.data.date_from === '')) {
			$('.form .error.message').html(globalTranslate.tf_ValidateCheckDateInterval).show();
			Form.$submitButton.transition('shake').removeClass('loading disabled');
			return false;
		}
		// Проверим поля дней недели
		if ((result.data.weekday_from > 0 && result.data.weekday_to === '-1')
			|| (result.data.weekday_to > 0 && result.data.weekday_from === '-1')) {
			$('.form .error.message').html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
			Form.$submitButton.transition('shake').removeClass('loading disabled');
			return false;
		}
		// Проверим поля времени
		if ((result.data.time_from.length > 0 && result.data.time_to.length === 0)
			|| (result.data.time_to.length > 0 && result.data.time_from.length === 0)) {
			$('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
			Form.$submitButton.transition('shake').removeClass('loading disabled');

			return false;
		}
		// Проверим поля времени на соблюдение формату
		if ((result.data.time_from.length > 0 && result.data.time_to.length === 0)
			|| (result.data.time_to.length > 0 && result.data.time_from.length === 0)) {
			$('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
			Form.$submitButton.transition('shake').removeClass('loading disabled');

			return false;
		}

		// Проверим все поля
		if (result.data.time_from === ''
			&& result.data.time_to === ''
			&& result.data.weekday_from === '-1'
			&& result.data.weekday_to === '-1'
			&& result.data.date_from === ''
			&& result.data.date_to === '') {
			$('.form .error.message').html(globalTranslate.tf_ValidateNoRulesSelected).show();
			Form.$submitButton.transition('shake').removeClass('loading disabled');
			return false;
		}
		return result;
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		$('.form .error.message').html('').hide();
		result.data = outOfWorkTimeRecord.$formObj.form('get values');
		const dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');
		if (dateFrom !== null) {
			dateFrom.setHours(0, 0, 0, 0);
			result.data.date_from = Math.round(dateFrom.getTime() / 1000);
		}
		const dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
		if (dateTo !== null) {
			dateTo.setHours(23, 59, 59, 0);
			result.data.date_to = Math.round(dateTo.getTime() / 1000);
		}
		return outOfWorkTimeRecord.customValidateForm(result);
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = outOfWorkTimeRecord.$formObj;
		Form.url = `${globalRootUrl}out-off-work-time/save`;
		Form.validateRules = outOfWorkTimeRecord.validateRules;
		Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm;
		Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	outOfWorkTimeRecord.initialize();
});
