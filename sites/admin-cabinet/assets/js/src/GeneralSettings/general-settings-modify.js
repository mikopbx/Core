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


/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFilesSelector, $ */

/**
 * A module to handle modification of general settings.
 */
const generalSettingsModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#general-settings-form'),

    /**
     * jQuery object for the web admin password input field.
     * @type {jQuery}
     */
    $webAdminPassword: $('#WebAdminPassword'),

    /**
     * jQuery object for the ssh password input field.
     * @type {jQuery}
     */
    $sshPassword: $('#SSHPassword'),

    /**
     * jQuery object for the web ssh password input field.
     * @type {jQuery}
     */
    $disableSSHPassword: $('#SSHDisablePasswordLogins').parent('.checkbox'),

    /**
     * jQuery object for the SSH password fields
     * @type {jQuery}
     */
    $sshPasswordSegment: $('#only-if-password-enabled'),

    /**
     * If password set, it will be hided from web ui.
     */
    hiddenPassword: 'xxxxxxx',

    /**
     * jQuery object for the records retention period slider.
     * @type {jQuery}
     */
    $recordsSavePeriodSlider: $('#PBXRecordSavePeriodSlider'),

    /**
     * Possible period values for the records retention.
     */
    saveRecordsPeriod: ['30', '90', '180', '360', '1080', ''],

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
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
            rules: [],
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

    // Rules for the web admin password field when it not equal to hiddenPassword
    webAdminPasswordRules: [
        {
            type: 'empty',
            prompt: globalTranslate.gs_ValidateEmptyWebPassword,
        },
        {
            type: 'minLength[5]',
            prompt: globalTranslate.gs_ValidateWeakWebPassword,
        },
        {
            type: 'notRegExp',
            value: /[a-z]/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
        },
        {
            type: 'notRegExp',
            value: /\d/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
        },
        {
            type: 'notRegExp',
            value: /[A-Z]/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
        }
    ],
    // Rules for the SSH password field when SSH login through the password enabled, and it not equal to hiddenPassword
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
            type: 'notRegExp',
            value: /[a-z]/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
        },
        {
            type: 'notRegExp',
            value: /\d/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
        },
        {
            type: 'notRegExp',
            value: /[A-Z]/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
        }
    ],

    // Rules for the SSH password field when SSH login through the password disabled
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

    /**
     *  Initialize module with event bindings and component initializations.
     */
    initialize() {

        // When WebAdminPassword input is changed, recalculate the password strength
        generalSettingsModify.$webAdminPassword.on('keyup', () => {
            if (generalSettingsModify.$webAdminPassword.val() !== generalSettingsModify.hiddenPassword) {
                generalSettingsModify.initRules();
                PasswordScore.checkPassStrength({
                    pass: generalSettingsModify.$webAdminPassword.val(),
                    bar: $('.password-score'),
                    section: $('.password-score-section'),
                });
            }
        });

        // When SSHPassword input is changed, recalculate the password strength
        generalSettingsModify.$sshPassword.on('keyup', () => {
            if (generalSettingsModify.$sshPassword.val() !== generalSettingsModify.hiddenPassword) {
                generalSettingsModify.initRules();
                PasswordScore.checkPassStrength({
                    pass: generalSettingsModify.$sshPassword.val(),
                    bar: $('.ssh-password-score'),
                    section: $('.ssh-password-score-section'),
                });
            }
        });

        // Enable tab navigation with history support
        $('#general-settings-menu').find('.item').tab({
            history: true,
            historyType: 'hash',
        });

        // Enable dropdowns on the form
        $('#general-settings-form .dropdown').dropdown();

        // Enable checkboxes on the form
        $('#general-settings-form .checkbox').checkbox();

        // Enable table drag-n-drop functionality
        $('#audio-codecs-table, #video-codecs-table').tableDnD({
            onDrop() {
                // Trigger change event to acknowledge the modification
                Form.dataChanged();
            },
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle',
        });

        // Enable dropdown with sound file selection
        $('#general-settings-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Initialize records save period slider
        generalSettingsModify.$recordsSavePeriodSlider
            .slider({
                min: 0,
                max: 5,
                step: 1,
                smooth: true,
                interpretLabel: function (value) {
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

        // Initialize the form
        generalSettingsModify.initializeForm();

        // Initialize additional validation rules
        generalSettingsModify.initRules();

        // Show, hide ssh password segment
        generalSettingsModify.$disableSSHPassword.checkbox({
            'onChange': generalSettingsModify.showHideSSHPassword
        });
        generalSettingsModify.showHideSSHPassword();

        // Set the initial value for the records save period slider
        const recordSavePeriod = generalSettingsModify.$formObj.form('get value', 'PBXRecordSavePeriod');
        generalSettingsModify.$recordsSavePeriodSlider
            .slider('set value', generalSettingsModify.saveRecordsPeriod.indexOf(recordSavePeriod), false);

        // Add event listener to handle tab activation
        $(window).on('GS-ActivateTab', (event, nameTab) => {
            $('#general-settings-menu').find('.item').tab('change tab', nameTab);
        });
    },

    /**
     * Show, hide ssh password segment according to the value of use SSH password checkbox.
     */
    showHideSSHPassword(){
        if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
            generalSettingsModify.$sshPasswordSegment.hide();
        } else {
            generalSettingsModify.$sshPasswordSegment.show();
        }
        generalSettingsModify.initRules();
    },
    /**
     * Checks conditions for deleting all records.
     * Compares the value of the 'deleteAllInput' field with a phrase.
     * If they match, it triggers a system restore to default settings.
     */
    checkDeleteAllConditions() {

        // Get the value of 'deleteAllInput' field.
        const deleteAllInput = generalSettingsModify.$formObj.form('get value', 'deleteAllInput');

        // If the entered phrase matches the phrase in 'globalTranslate.gs_EnterDeleteAllPhrase',
        // call 'PbxApi.SystemRestoreDefaultSettings' to restore default settings.
        if (deleteAllInput === globalTranslate.gs_EnterDeleteAllPhrase) {
            PbxApi.SystemRestoreDefaultSettings(generalSettingsModify.cbAfterRestoreDefaultSettings);
        }
    },

    /**
     * Handle response after restoring default settings.
     * @param {boolean|string} response - Response from the server after restoring default settings.
     */
    cbAfterRestoreDefaultSettings(response) {

        // Check if the response is true, display a success message
        // otherwise, display the response message.
        if (response === true) {
            UserMessage.showInformation(globalTranslate.gs_AllSettingsDeleted);
        } else {
            UserMessage.showMultiString(response);
        }
    },

    /**
     * Handle event after the select save period slider is changed.
     * @param {number} value - The selected value from the slider.
     */
    cbAfterSelectSavePeriodSlider(value) {

        // Get the save period corresponding to the slider value.
        const savePeriod = generalSettingsModify.saveRecordsPeriod[value];

        // Set the form value for 'PBXRecordSavePeriod' to the selected save period.
        generalSettingsModify.$formObj.form('set value', 'PBXRecordSavePeriod', savePeriod);

        // Trigger change event to acknowledge the modification
        Form.dataChanged();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
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

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        $("#error-messages").remove();
        if (!response.success) {
            Form.$submitButton.removeClass('disabled');
            generalSettingsModify.generateErrorMessageHtml(response);
        } else {
            $('.password-validate').remove();
        }
        generalSettingsModify.checkDeleteAllConditions();
    },

    /**
     * The function collects an information message about a data saving error
     * @param response
     */
    generateErrorMessageHtml(response) {
        if (response.messages && response.messages.error) {
            const $div = $('<div>', { class: 'ui negative message', id: 'error-messages' });
            const $header = $('<div>', { class: 'header' }).text(globalTranslate.gs_ErrorSaveSettings);
            $div.append($header);
            const $ul = $('<ul>', { class: 'list' });
            const messagesSet = new Set();
            response.messages.error.forEach(errorArray => {
                errorArray.forEach(error => {
                    let textContent ='';
                    if(globalTranslate[error.message] === undefined){
                        textContent = error.message;
                    }else{
                        textContent = globalTranslate[error.message];
                    }
                    if (messagesSet.has(textContent)) {
                        return;
                    }
                    messagesSet.add(error.message);
                    $ul.append($('<li>').text(textContent));
                });
            });
            $div.append($ul);
            $('#submitbutton').before($div);
        }
    },

    /**
     * Initialize the validation rules of the form
     */
    initRules() {
        // SSHPassword
        if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
            Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesNoPass;
        } else if (generalSettingsModify.$sshPassword.val() === generalSettingsModify.hiddenPassword) {
            Form.validateRules.SSHPassword.rules = [];
        } else {
            Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesPass;
        }

        // WebAdminPassword
        if (generalSettingsModify.$webAdminPassword.val() === generalSettingsModify.hiddenPassword) {
            Form.validateRules.WebAdminPassword.rules = [];
        } else {
            Form.validateRules.WebAdminPassword.rules = generalSettingsModify.webAdminPasswordRules;
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = generalSettingsModify.$formObj;
        Form.url = `${globalRootUrl}general-settings/save`; // Form submission URL
        Form.validateRules = generalSettingsModify.validateRules; // Form validation rules
        Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    }
};

// When the document is ready, initialize the generalSettings management interface.
$(document).ready(() => {
    generalSettingsModify.initialize();
});