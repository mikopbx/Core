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

/* global globalRootUrl,globalTranslate, Form */


/**
 * Object for managing outbound route settings
 *
 * @module outboundRoute
 */
const outboundRoute = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#outbound-route-form'),

    $providerDropDown: $('#providerid'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        rulename: {
            identifier: 'rulename',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseEnterRuleName,
                },
            ],
        },
        provider: {
            identifier: 'providerid',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseSelectProvider,
                },
            ],
        },
        numberbeginswith: {
            identifier: 'numberbeginswith',
            rules: [
                {
                    type: 'regExp',
                    value: '/^(|[0-9#+\\*()\\[\\-\\]\\{\\}|]{1,64})$/',
                    prompt: globalTranslate.or_ValidateBeginPattern,
                },
            ],
        },
        restnumbers: {
            identifier: 'restnumbers',
            optional: true,
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.or_ValidateRestNumbers,
                },
            ],
        },
        trimfrombegin: {
            identifier: 'trimfrombegin',
            optional: true,
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.or_ValidateTrimFromBegin,
                },
            ],
        },

        prepend: {
            identifier: 'prepend',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '/^[0-9#w+]{0,20}$/',
                    prompt: globalTranslate.or_ValidatePrepend,
                },
            ],
        },
    },

    /**
     * Initializes the outbound route form.
     */
    initialize() {
        outboundRoute.$providerDropDown.dropdown();
        outboundRoute.initializeForm();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = outboundRoute.$formObj.form('get values');
        return result;
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
        Form.$formObj = outboundRoute.$formObj;
        Form.url = `${globalRootUrl}outbound-routes/save`; // Form submission URL
        Form.validateRules = outboundRoute.validateRules; // Form validation rules
        Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = outboundRoute.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 *  Initialize outbound route settings form on document ready
 */
$(document).ready(() => {
    outboundRoute.initialize();
});

