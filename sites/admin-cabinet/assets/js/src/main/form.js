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

/* global globalRootUrl, globalTranslate */

/**
 * The Form object is responsible for sending forms data to backend
 *
 * @module Form
 */
const Form = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: '',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {},

    /**
     * Dirty check field, for checking if something on the form was changed
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty'),

    url: '',
    cbBeforeSendForm: '',
    cbAfterSendForm: '',
    $submitButton: $('#submitbutton'),
    $dropdownSubmit: $('#dropdownSubmit'),
    $submitModeInput: $('input[name="submitMode"]'),
    processData: true,
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    keyboardShortcuts: true,
    enableDirrity: true,
    afterSubmitIndexUrl: '',
    afterSubmitModifyUrl: '',
    oldFormValues: [],
    
    /**
     * REST API configuration
     * @type {object}
     */
    apiSettings: {
        /**
         * Enable REST API mode
         * @type {boolean}
         */
        enabled: false,
        
        /**
         * API object with methods (e.g., ConferenceRoomsAPI)
         * @type {object|null}
         */
        apiObject: null,
        
        /**
         * Method name for saving records
         * @type {string}
         */
        saveMethod: 'saveRecord',
        
        /**
         * HTTP method for API calls (can be overridden in cbBeforeSendForm)
         * @type {string|null}
         */
        httpMethod: null
    },
    initialize() {
        // Set up custom form validation rules
        Form.$formObj.form.settings.rules.notRegExp = Form.notRegExpValidateRule;
        Form.$formObj.form.settings.rules.specialCharactersExist = Form.specialCharactersExistValidateRule;

        if (Form.enableDirrity) {
            // Initialize dirrity if enabled
            Form.initializeDirrity();
        }

        // Handle click event on submit button
        Form.$submitButton.on('click', (e) => {
            e.preventDefault();
            if (Form.$submitButton.hasClass('loading')) return;
            if (Form.$submitButton.hasClass('disabled')) return;

            // Set up form validation and submit
            Form.$formObj
                .form({
                    on: 'blur',
                    fields: Form.validateRules,
                    onSuccess() {
                        // Call submitForm() on successful validation
                        Form.submitForm();
                    },
                    onFailure() {
                        // Add error class to form on validation failure
                        Form.$formObj.removeClass('error').addClass('error');
                    },
                });
            Form.$formObj.form('validate form');
        });

        // Handle dropdown submit
        if (Form.$dropdownSubmit.length > 0) {
            Form.$dropdownSubmit.dropdown({
                onChange: (value) => {
                    const translateKey = `bt_${value}`;
                    Form.$submitModeInput.val(value);
                    Form.$submitButton
                        .html(`<i class="save icon"></i> ${globalTranslate[translateKey]}`);
                    // Removed .click() to prevent automatic form submission
                    
                    // Save selected mode
                    Form.saveSubmitMode(value);
                },
            });
            
            // Restore saved submit mode
            Form.restoreSubmitMode();
        }

        // Prevent form submission on enter keypress
        Form.$formObj.on('submit', (e) => {
            e.preventDefault();
        });
    },

    /**
     * Initializes tracking of form changes.
     */
    initializeDirrity() {
        Form.saveInitialValues();
        Form.setEvents();
        Form.$submitButton.addClass('disabled');
        Form.$dropdownSubmit.addClass('disabled');
    },

    /**
     * Saves the initial form values for comparison.
     */
    saveInitialValues() {
        Form.oldFormValues = Form.$formObj.form('get values');
    },

    /**
     * Sets up event handlers for form objects.
     */
    setEvents() {
        Form.$formObj.find('input, select').change(() => {
            Form.checkValues();
        });
        Form.$formObj.find('input, textarea').on('keyup keydown blur', () => {
            Form.checkValues();
        });
        Form.$formObj.find('.ui.checkbox').on('click', () => {
            Form.checkValues();
        });
    },

    /**
     * Compares the old and new form values for changes.
     */
    checkValues() {
        const newFormValues = Form.$formObj.form('get values');
        if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
            Form.$submitButton.addClass('disabled');
            Form.$dropdownSubmit.addClass('disabled');
        } else {
            Form.$submitButton.removeClass('disabled');
            Form.$dropdownSubmit.removeClass('disabled');
        }
    },

    /**
     *  Changes the value of '$dirrtyField' to trigger
     *  the 'change' form event and enable submit button.
     */
    dataChanged() {
        if (Form.enableDirrity) {
            Form.$dirrtyField.val(Math.random());
            Form.$dirrtyField.trigger('change');
        }
    },

    /**
     * Submits the form to the server.
     */
    submitForm() {
        // Add 'loading' class to the submit button
        Form.$submitButton.addClass('loading');
        
        // Get form data
        let formData = Form.$formObj.form('get values');
        
        // Call cbBeforeSendForm
        const settings = { data: formData };
        const cbBeforeSendResult = Form.cbBeforeSendForm(settings);
        
        if (cbBeforeSendResult === false) {
            // If cbBeforeSendForm returns false, abort submission
            Form.$submitButton
                .transition('shake')
                .removeClass('loading');
            return;
        }
        
        // Update formData if cbBeforeSendForm modified it
        if (cbBeforeSendResult && cbBeforeSendResult.data) {
            formData = cbBeforeSendResult.data;
            
            // Trim string values, excluding sensitive fields
            $.each(formData, (index, value) => {
                if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
                if (typeof value === 'string') formData[index] = value.trim();
            });
        }
        
        // Choose submission method based on configuration
        if (Form.apiSettings.enabled && Form.apiSettings.apiObject) {
            // REST API submission
            const apiObject = Form.apiSettings.apiObject;
            const saveMethod = Form.apiSettings.saveMethod;
            
            if (apiObject && typeof apiObject[saveMethod] === 'function') {
                // If httpMethod is specified, pass it in the data
                if (Form.apiSettings.httpMethod) {
                    formData._method = Form.apiSettings.httpMethod;
                }
                
                apiObject[saveMethod](formData, (response) => {
                    Form.handleSubmitResponse(response);
                });
            } else {
                console.error('API object or method not found');
                Form.$submitButton
                    .transition('shake')
                    .removeClass('loading');
            }
        } else {
            // Traditional form submission
            $.api({
                url: Form.url,
                on: 'now',
                method: 'POST',
                processData: Form.processData,
                contentType: Form.contentType,
                keyboardShortcuts: Form.keyboardShortcuts,
                data: formData,
                onSuccess(response) {
                    Form.handleSubmitResponse(response);
                },
                onFailure(response) {
                    Form.$formObj.after(response);
                    Form.$submitButton
                        .transition('shake')
                        .removeClass('loading');
                }
            });
        }
    },
    
    /**
     * Handles the response after form submission (unified for both traditional and REST API)
     * @param {object} response - The response object
     */
    handleSubmitResponse(response) {
        // Remove loading state
        Form.$submitButton.removeClass('loading');
        
        // Remove any existing AJAX messages
        $('.ui.message.ajax').remove();
        
        // Check if submission was successful
        if (Form.checkSuccess(response)) {
            // Success
            // Dispatch 'ConfigDataChanged' event
            const event = new CustomEvent('ConfigDataChanged', {
                bubbles: false,
                cancelable: true
            });
            window.dispatchEvent(event);
            
            // Call cbAfterSendForm
            if (Form.cbAfterSendForm) {
                Form.cbAfterSendForm(response);
            }
            
            // Handle submit mode
            const submitMode = Form.$submitModeInput.val();
            const reloadPath = Form.getReloadPath(response);
            
            switch (submitMode) {
                case 'SaveSettings':
                    if (reloadPath.length > 0) {
                        window.location = globalRootUrl + reloadPath;
                    }
                    break;
                case 'SaveSettingsAndAddNew':
                    if (Form.afterSubmitModifyUrl.length > 1) {
                        window.location = Form.afterSubmitModifyUrl;
                    } else {
                        const emptyUrl = window.location.href.split('modify');
                        let action = 'modify';
                        let prefixData = emptyUrl[1].split('/');
                        if (prefixData.length > 0) {
                            action = action + prefixData[0];
                        }
                        if (emptyUrl.length > 1) {
                            window.location = `${emptyUrl[0]}${action}/`;
                        }
                    }
                    break;
                case 'SaveSettingsAndExit':
                    if (Form.afterSubmitIndexUrl.length > 1) {
                        window.location = Form.afterSubmitIndexUrl;
                    } else {
                        Form.redirectToAction('index');
                    }
                    break;
                default:
                    if (reloadPath.length > 0) {
                        window.location = globalRootUrl + reloadPath;
                    }
                    break;
            }
            
            // Re-initialize dirty checking if enabled
            if (Form.enableDirrity) {
                Form.initializeDirrity();
            }
        } else {
            // Error
            Form.$submitButton.transition('shake');
            
            // Show error messages
            if (response.messages) {
                if (response.messages.error) {
                    Form.showErrorMessages(response.messages.error);
                }
            } else if (response.message) {
                // Legacy format support
                $.each(response.message, (index, value) => {
                    if (index === 'error') {
                        Form.$formObj.after(`<div class="ui ${index} message ajax">${value}</div>`);
                    }
                });
            }
        }
    },
    /**
     * Checks if the response is successful
     */
    checkSuccess(response) {
        return !!(response.success || response.result);
    },

    /**
     * Extracts reload path from response.
     */
    getReloadPath(response) {
        if (response.reload !== undefined && response.reload.length > 0) {
            return response.reload;
        }
        return '';
    },

    /**
     * Function to redirect to a specific action ('modify' or 'index')
     */
    redirectToAction(actionName) {
        const baseUrl = window.location.href.split('modify')[0];
        window.location = `${baseUrl}${actionName}/`;
    },

    /**
     * Checks if the value does not match the regex pattern.
     * @param {string} value - The value to validate.
     * @param {RegExp} regex - The regex pattern to match against.
     * @returns {boolean} - True if the value does not match the regex, false otherwise.
     */
    notRegExpValidateRule(value, regex) {
        return value.match(regex) !== null;
    },

    /**
     * Checks if the value contains special characters.
     * @param {string} value - The value to validate.
     * @returns {boolean} - True if the value contains special characters, false otherwise.
     */
    specialCharactersExistValidateRule(value) {
        return value.match(/[()$^;#"><,.%№@!+=_]/) === null;
    },
    
    /**
     * Shows error messages (unified error display)
     * @param {string|array|object} errors - Error messages
     */
    showErrorMessages(errors) {
        if (Array.isArray(errors)) {
            const errorText = errors.join('<br>');
            Form.$formObj.after(`<div class="ui error message ajax">${errorText}</div>`);
        } else if (typeof errors === 'object') {
            // Field-specific errors
            $.each(errors, (field, message) => {
                const $field = Form.$formObj.find(`[name="${field}"]`);
                if ($field.length) {
                    $field.closest('.field').addClass('error');
                    $field.after(`<div class="ui pointing red label">${message}</div>`);
                }
            });
        } else {
            Form.$formObj.after(`<div class="ui error message ajax">${errors}</div>`);
        }
    },
    
    /**
     * Gets unique key for storing submit mode
     * @returns {string} - Unique key for localStorage
     */
    getSubmitModeKey() {
        // Use form ID or URL path for uniqueness
        const formId = Form.$formObj.attr('id') || '';
        const pathName = window.location.pathname.replace(/\//g, '_');
        return `submitMode_${formId || pathName}`;
    },
    
    /**
     * Saves submit mode to localStorage
     * @param {string} mode - Submit mode value
     */
    saveSubmitMode(mode) {
        try {
            localStorage.setItem(Form.getSubmitModeKey(), mode);
        } catch (e) {
            console.warn('Unable to save submit mode:', e);
        }
    },
    
    /**
     * Restores submit mode from localStorage
     */
    restoreSubmitMode() {
        try {
            const savedMode = localStorage.getItem(Form.getSubmitModeKey());
            if (savedMode && Form.$dropdownSubmit.length > 0) {
                // Check if the saved mode exists in dropdown options
                const dropdownValues = [];
                Form.$dropdownSubmit.find('.item').each(function() {
                    dropdownValues.push($(this).attr('data-value'));
                });
                
                if (dropdownValues.includes(savedMode)) {
                    // Set saved value
                    Form.$submitModeInput.val(savedMode);
                    Form.$dropdownSubmit.dropdown('set selected', savedMode);
                    
                    // Update button text
                    const translateKey = `bt_${savedMode}`;
                    Form.$submitButton.html(`<i class="save icon"></i> ${globalTranslate[translateKey]}`);
                }
            }
        } catch (e) {
            console.warn('Unable to restore submit mode:', e);
        }
    },

    /**
     * Auto-resize textarea based on content (similar to PHP BaseForm::addTextArea logic)
     * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
     * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
     */
    autoResizeTextArea(textareaSelector, areaWidth = null) {
        const $textareas = $(textareaSelector);
        
        $textareas.each(function() {
            const $textarea = $(this);
            const value = $textarea.val();
            const placeholder = $textarea.attr('placeholder') || '';
            
            // Calculate dynamic width if not provided
            let calculatedWidth = areaWidth;
            if (!calculatedWidth) {
                calculatedWidth = Form.calculateTextareaWidth($textarea);
            }
            
            let rows = 1;
            let strings = [];
            
            if (placeholder && placeholder.length > 0) {
                strings = placeholder.split('\n');
            }
            
            if (value && value.length > 0) {
                strings = value.split('\n');
            }
            
            strings.forEach(string => {
                rows += Math.ceil(string.length / calculatedWidth);
            });
            
            const finalRows = Math.max(rows, 2);
            $textarea.attr('rows', finalRows);
        });
    },

    /**
     * Calculate textarea width in characters based on actual CSS dimensions
     * @param {jQuery} $textarea - jQuery textarea element
     * @returns {number} - Approximate width in characters
     */
    calculateTextareaWidth($textarea) {
        // Create a temporary element to measure character width
        const $temp = $('<span>')
            .css({
                'font-family': $textarea.css('font-family'),
                'font-size': $textarea.css('font-size'),
                'font-weight': $textarea.css('font-weight'),
                'letter-spacing': $textarea.css('letter-spacing'),
                'visibility': 'hidden',
                'position': 'absolute',
                'white-space': 'nowrap'
            })
            .text('M') // Use 'M' as it's typically the widest character
            .appendTo('body');
        
        const charWidth = $temp.width();
        $temp.remove();
        
        // Get textarea's content width (excluding padding and borders)
        const textareaWidth = $textarea.innerWidth() - 
            parseInt($textarea.css('padding-left'), 10) - 
            parseInt($textarea.css('padding-right'), 10);
        
        // Calculate approximate character count, with a small buffer for accuracy
        const approximateCharWidth = Math.floor(textareaWidth / charWidth) - 2;
        
        // Ensure minimum width and reasonable maximum
        return Math.max(20, Math.min(approximateCharWidth, 200));
    },

    /**
     * Initialize auto-resize for textarea elements
     * @param {string} selector - CSS selector for textareas to auto-resize
     * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
     */
    initAutoResizeTextAreas(selector = 'textarea', areaWidth = null) {
        const $textareas = $(selector);
        
        // Initial resize
        Form.autoResizeTextArea($textareas, areaWidth);
        
        // Add event listeners for dynamic resizing
        $textareas.on('input paste keyup', function() {
            Form.autoResizeTextArea($(this), areaWidth);
        });
    }
};

// export default Form;
