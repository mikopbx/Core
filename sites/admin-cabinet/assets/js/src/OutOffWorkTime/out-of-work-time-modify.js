/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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


/**
 * Object for managing Out-of-Work Time settings
 *
 * @module outOfWorkTimeRecord
 */
const outOfWorkTimeRecord = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
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


    /**
     * Additional condition for the time interval
     * @type {array}
     */
    additionalTimeIntervalRules: [{
        type: 'regExp',
        value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval,
    }],

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
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
        calUrl: {
            identifier: 'calUrl',
            rules: [
                {
                    type   : 'customNotEmptyIfCalType',
                    prompt : globalTranslate.tf_ValidateCalUri
                }
            ]
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

    /**
     * Initializes the out of work time record form.
     */
    initialize() {
        // Initialize tab behavior for the out-time-modify-menu
        $('#out-time-modify-menu .item').tab();

        // Initialize the default dropdown
        outOfWorkTimeRecord.$defaultDropdown.dropdown();

        // Initialize the calendar for range days start
        outOfWorkTimeRecord.$rangeDaysStart.calendar({
            // Calendar configuration options
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
            type: 'date',
            inline: false,
            monthFirst: false,
            regExp: SemanticLocalization.regExp,
        });

        // Initialize the calendar for range days end
        outOfWorkTimeRecord.$rangeDaysEnd.calendar({
            // Calendar configuration options
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
            type: 'date',
            inline: false,
            monthFirst: false,
            regExp: SemanticLocalization.regExp,
            onChange: (newDateTo) => {
                // Handle the change event for range time end
                let oldDateTo = outOfWorkTimeRecord.$date_to.attr('value');
                if (newDateTo !== null && oldDateTo !== '') {
                    oldDateTo = new Date(oldDateTo * 1000);
                    if ((newDateTo - oldDateTo) !== 0) {
                        outOfWorkTimeRecord.$date_from.trigger('change');
                        Form.dataChanged();
                    }
                }
            },
        });

        // Initialize the calendar for range time start
        outOfWorkTimeRecord.$rangeTimeStart.calendar({
            // Calendar configuration options
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
            type: 'time',
            inline: false,
            disableMinute: true,
            ampm: false,
        });

        // Initialize the calendar for range time end
        outOfWorkTimeRecord.$rangeTimeEnd.calendar({
            // Calendar configuration options
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            type: 'time',
            inline: false,
            disableMinute: true,
            ampm: false,
            onChange: (newTimeTo) => {
                // Handle the change event for range time end
                let oldTimeTo = outOfWorkTimeRecord.$time_to.attr('value');
                if (newTimeTo !== null && oldTimeTo !== '') {
                    oldTimeTo = new Date(oldTimeTo * 1000);
                    if ((newTimeTo - oldTimeTo) !== 0) {
                        outOfWorkTimeRecord.$time_to.trigger('change');
                        Form.dataChanged();
                    }
                }
            },
        });

        // Initialize the action dropdown
        $('#action')
            .dropdown({
                onChange() {
                    // Handle the change event for the action dropdown
                    outOfWorkTimeRecord.toggleDisabledFieldClass();
                },
            });
        // Initialize the calType dropdown
        $('#calType')
            .dropdown({
                onChange() {
                    // Handle the change event for the action dropdown
                    outOfWorkTimeRecord.toggleDisabledFieldClass();
                },
            });

        // Initialize the weekday_from dropdown
        $('#weekday_from')
            .dropdown({
                onChange() {
                    // Handle the change event for the weekday_from dropdown
                    const from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
                    const to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');
                    if (from < to || to === -1 || from === -1) {
                        outOfWorkTimeRecord.$formObj.form('set value', 'weekday_to', from);
                    }
                },
            });

        // Initialize the weekday_to dropdown
        $('#weekday_to')
            .dropdown({
                onChange() {
                    // Handle the change event for the weekday_to dropdown
                    const from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
                    const to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');
                    if (to < from || from === -1) {
                        outOfWorkTimeRecord.$formObj.form('set value', 'weekday_from', to);
                    }
                },
            });

        // Bind click event to erase-dates button
        $('#erase-dates').on('click', (e) => {
            // Handle the click event for erase-dates button
            outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
            outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear');
            outOfWorkTimeRecord.$formObj
                .form('set values', {
                    date_from: '',
                    date_to: '',
                });
            e.preventDefault();
        });

        // Bind click event to erase-weekdays button
        $('#erase-weekdays').on('click', (e) => {
            // Handle the click event for erase-weekdays button
            outOfWorkTimeRecord.$formObj
                .form('set values', {
                    weekday_from: -1,
                    weekday_to: -1,
                });
            outOfWorkTimeRecord.$rangeDaysStart.trigger('change');
            e.preventDefault();
        });

        // Bind click event to erase-timeperiod button
        $('#erase-timeperiod').on('click', (e) => {
            // Handle the click event for erase-timeperiod button
            outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
            outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
            outOfWorkTimeRecord.$time_to.trigger('change');
            e.preventDefault();
        });

        // Initialize audio-message-select dropdown
        $('#save-outoffwork-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Change the date format from linuxtime to local representation
        outOfWorkTimeRecord.changeDateFormat();

        // Initialize the form
        outOfWorkTimeRecord.initializeForm();

        // Initialize the forwardingSelectDropdown
        outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsWithoutEmpty());

        // Toggle disabled field class based on action value
        outOfWorkTimeRecord.toggleDisabledFieldClass();

        // Bind checkbox change event for inbound rules table
        $('#inbound-rules-table .ui.checkbox').checkbox({
            onChange: function () {
                let newState = 'unchecked';
                // Handle the change event for inbound rules table checkbox
                if ($(this).parent().checkbox('is checked')) {
                    newState = 'checked';
                }
                let did = $(this).parent().attr('data-did');
                let filter = '#inbound-rules-table .ui.checkbox[data-context-id=' + $(this).parent().attr('data-context-id') + ']';
                if(did !== '' && newState === 'checked'){
                    filter = filter + '.ui.checkbox[data-did='+did+']';
                }else if(did === '' && newState === 'unchecked'){
                    filter = filter + '.ui.checkbox[data-did=""]';
                }
                $(filter).checkbox('set '+newState);
            }
        });

        // Bind checkbox change event for allowRestriction checkbox
        $('#allowRestriction').parent().checkbox({
            onChange: outOfWorkTimeRecord.changeRestriction
        });

        // Call changeRestriction method
        outOfWorkTimeRecord.changeRestriction();
    },

    /**
     * Changes the visibility of the 'rules' tab based on the checked status of the 'allowRestriction' checkbox.
     */
    changeRestriction() {
        if ($('#allowRestriction').parent().checkbox('is checked')) {
            $("a[data-tab='rules']").show();
        } else {
            $("a[data-tab='rules']").hide();
        }
    },

    /**
     * Converts the date format from linuxtime to the local representation.
     */
    changeDateFormat() {
        const dateFrom = outOfWorkTimeRecord.$date_from.attr('value');
        const dateTo = outOfWorkTimeRecord.$date_to.attr('value');
        const currentOffset = new Date().getTimezoneOffset();
        const serverOffset = parseInt(outOfWorkTimeRecord.$formObj.form('get value', 'serverOffset'));
        const offsetDiff = serverOffset + currentOffset;
        if (dateFrom !== undefined && dateFrom.length > 0) {
            const dateFromInBrowserTZ = dateFrom * 1000 + offsetDiff * 60 * 1000;
            outOfWorkTimeRecord.$rangeDaysStart.calendar('set date', new Date(dateFromInBrowserTZ));
        }
        if (dateTo !== undefined && dateTo.length > 0) {
            const dateToInBrowserTZ = dateTo * 1000 + offsetDiff * 60 * 1000;
            outOfWorkTimeRecord.$rangeDaysEnd.calendar('set date', new Date(dateToInBrowserTZ));
        }
    },

    /**
     * Toggles the visibility of certain field groups based on the selected action value.
     */
    toggleDisabledFieldClass() {
        if(outOfWorkTimeRecord.$formObj.form('get value', 'action') === 'extension') {
            $('#extension-group').show();
            $('#audio-file-group').hide();
            $('#audio_message_id').dropdown('clear');
        }else{
            $('#extension-group').hide();
            $('#audio-file-group').show();
            outOfWorkTimeRecord.$formObj.form('set value', 'extension', -1);
        }
        if(outOfWorkTimeRecord.$formObj.form('get value', 'calType') === 'none'){
            $('#call-type-main-tab').show();
            $('#call-type-calendar-tab').hide();
        }else{
            $('#call-type-main-tab').hide();
            $('#call-type-calendar-tab').show();
        }
    },

    /**
     * Custom form validation for validating specific fields in a form.
     *
     * @param {Object} result - The result object containing form data.
     * @returns {boolean|Object} Returns false if validation fails, or the result object if validation passes.
     */
    customValidateForm(result) {
        // Check date fields
        if ((result.data.date_from !== '' && result.data.date_to === '')
            || (result.data.date_to !== '' && result.data.date_from === '')) {
            $('.form .error.message').html(globalTranslate.tf_ValidateCheckDateInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');
            return false;
        }

        // Check weekday fields
        if ((result.data.weekday_from > 0 && result.data.weekday_to === '-1')
            || (result.data.weekday_to > 0 && result.data.weekday_from === '-1')) {
            $('.form .error.message').html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');
            return false;
        }

        // Check time fields
        if ((result.data.time_from.length > 0 && result.data.time_to.length === 0)
            || (result.data.time_to.length > 0 && result.data.time_from.length === 0)) {
            $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');

            return false;
        }

        // Check time field format
        if ((result.data.time_from.length > 0 && result.data.time_to.length === 0)
            || (result.data.time_to.length > 0 && result.data.time_from.length === 0)) {
            $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');

            return false;
        }

        // Check all fields
        if ($('#calType').parent().dropdown('get value') === 'none'
            && result.data.time_from === ''
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

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        $('.form .error.message').html('').hide();
        result.data = outOfWorkTimeRecord.$formObj.form('get values');
        const dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');
        const dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
        const currentOffset = new Date().getTimezoneOffset();
        const serverOffset = parseInt(outOfWorkTimeRecord.$formObj.form('get value', 'serverOffset'));
        const offsetDiff = serverOffset + currentOffset;

        if($('#calType').parent().dropdown('get value') === 'none'){
            Form.validateRules.timefrom.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
            Form.validateRules.timeto.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
        } else {
            Form.validateRules.timefrom.rules = [];
            Form.validateRules.timeto.rules = [];
        }

        if (dateFrom) {
            dateFrom.setHours(0, 0, 0, 0);
            result.data.date_from = Math.floor(dateFrom.getTime()/1000) - offsetDiff * 60;
        }
        if (dateTo) {
            dateTo.setHours(23, 59, 59, 0);
            result.data.date_to = Math.floor(dateTo.getTime()/1000) - offsetDiff * 60;
        }
        return outOfWorkTimeRecord.customValidateForm(result);
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {

    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = outOfWorkTimeRecord.$formObj;
        Form.url = `${globalRootUrl}out-off-work-time/save`; // Form submission URL
        Form.validateRules = outOfWorkTimeRecord.validateRules; // Form validation rules
        Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Custom form validation rule that checks if a value is not empty based on a specific action.
 *
 * @param {string} value - The value to be validated.
 * @param {string} action - The action to compare against.
 * @returns {boolean} Returns true if the value is not empty or the action does not match, false otherwise.
 */
$.fn.form.settings.rules.customNotEmptyIfActionRule = (value, action) => {
    if (value.length === 0 && $('#action').val() === action) {
        return false;
    }
    return true;
};

/**
 * Custom form validation rule that checks if a value is not empty based on a specific action.
 *
 * @param {string} value - The value to be validated.
 * @returns {boolean} Returns true if the value is not empty or the action does not match, false otherwise.
 */
$.fn.form.settings.rules.customNotEmptyIfCalType = (value) => {
    if ($('#calType').val() === 'none') {
        return true;
    }
    try {
        let url = new URL(value);
    } catch (_) {
        return false;
    }
    return true;
};


/**
 *  Initialize out of work form on document ready
 */
$(document).ready(() => {
    outOfWorkTimeRecord.initialize();
});
