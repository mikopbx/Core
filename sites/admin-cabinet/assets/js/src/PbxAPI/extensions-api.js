/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, sessionStorage, PbxApi, globalTranslate, SecurityUtils, PbxApiClient, Config */

/**
 * ExtensionsAPI - REST API v3 client for extensions management
 *
 * Provides a clean interface for extensions operations using the new RESTful API.
 * Extensions serve as read-only aggregator of numbers from various sources:
 * - Employees (internal and mobile numbers)
 * - IVR Menus, Call Queues, Conference Rooms
 * - Dial Plan Applications, System extensions
 *
 * @class ExtensionsAPI
 */
const ExtensionsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/extensions',
    customMethods: {
        getForSelect: ':getForSelect',
        available: ':available',
        getPhonesRepresent: ':getPhonesRepresent',
        getPhoneRepresent: ':getPhoneRepresent'
    }
});

// Add utility methods and aliases to ExtensionsAPI using centralized utility
PbxApi.extendApiClient(ExtensionsAPI, {

    // Debounce timeout storage for different CSS classes
    debounceTimeouts: {},

    /**
     * Formats the dropdown results by adding necessary data.
     * @param {Object} response - Response from the server.
     * @param {Boolean} addEmpty - A flag to decide if an empty object needs to be added to the result.
     * @return {Object} formattedResponse - The formatted response.
     */
    formatDropdownResults(response, addEmpty) {
        // Use the centralized utility with security utils for name sanitization
        const formattedResponse = PbxApi.formatDropdownResults(response, {
            addEmpty: addEmpty,
            emptyText: '-',
            emptyValue: -1
        });

        // Apply security sanitization to names
        if (formattedResponse.results && typeof SecurityUtils !== 'undefined') {
            formattedResponse.results.forEach(item => {
                if (item.name) {
                    item.name = SecurityUtils.sanitizeObjectRepresentations(item.name);
                }
            });
        }

        return formattedResponse;
    },

    /**
     * Get dropdown settings for extensions (universal method)
     * This method is designed to work with SemanticUIDropdownComponent
     *
     * @param {function|object} onChangeCallback - Callback when selection changes OR options object
     * @param {object} options - Additional options (when first param is callback)
     * @return {object} Settings object for SemanticUIDropdownComponent
     */
    getDropdownSettings: function(onChangeCallback, options) {
        // Handle different parameter combinations
        let callback = onChangeCallback;
        let settings = options || {};

        // If first parameter is an object, treat it as options
        if (typeof onChangeCallback === 'object' && onChangeCallback !== null) {
            settings = onChangeCallback;
            callback = settings.onChange;
        }

        // Extract settings with defaults
        const type = settings.type || 'routing';
        const addEmpty = settings.addEmpty !== undefined ? settings.addEmpty : false;
        const excludeExtensions = settings.excludeExtensions || [];
        const clearOnEmpty = settings.clearOnEmpty !== undefined ? settings.clearOnEmpty : true;

        return {
            apiSettings: {
                url: ExtensionsAPI.endpoints.getForSelect,
                urlData: {
                    type: type
                },
                cache: false,
                onResponse: function(response) {
                    const formattedResponse = ExtensionsAPI.formatDropdownResults(response, addEmpty);

                    // Filter out excluded extensions if specified
                    if (excludeExtensions.length > 0 && formattedResponse.results) {
                        formattedResponse.results = formattedResponse.results.filter(item => {
                            return !excludeExtensions.includes(item.value);
                        });
                    }

                    return formattedResponse;
                }
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            hideDividers: 'empty',
            onChange: function(value, text, $choice) {
                // Handle empty value (-1) if clearOnEmpty is enabled
                if (clearOnEmpty && parseInt(value, 10) === -1) {
                    $(this).dropdown('clear');
                }

                // Call the provided callback if it exists
                if (typeof callback === 'function') {
                    callback(value, text, $choice);
                }
            },
            templates: {
                menu: ExtensionsAPI.customDropdownMenu,
            }
        };
    },

    /**
     * Constructs dropdown settings for extensions with an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsWithEmpty(cbOnChange = null) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'all',
            addEmpty: true,
            clearOnEmpty: true
        });
    },

    /**
     * Constructs dropdown settings for extensions without an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsWithoutEmpty(cbOnChange = null) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'all',
            addEmpty: false,
            clearOnEmpty: false
        });
    },

    /**
     * Constructs dropdown settings for routing extensions.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsForRouting(cbOnChange = null) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'routing',
            addEmpty: false,
            clearOnEmpty: false
        });
    },

    /**
     * Constructs dropdown settings for routing extensions with exclusion support.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @param {string[]} excludeExtensions - Array of extension values to exclude from dropdown.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsForRoutingWithExclusion(cbOnChange = null, excludeExtensions = []) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'routing',
            addEmpty: false,
            clearOnEmpty: false,
            excludeExtensions: excludeExtensions
        });
    },

    /**
     * Constructs dropdown settings for internal extensions without an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsOnlyInternalWithoutEmpty(cbOnChange = null) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'internal',
            addEmpty: false,
            clearOnEmpty: false
        });
    },

    /**
     * Constructs dropdown settings for internal extensions with an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsOnlyInternalWithEmpty(cbOnChange = null) {
        return this.getDropdownSettings({
            onChange: cbOnChange,
            type: 'internal',
            addEmpty: true,
            clearOnEmpty: true
        });
    },

    /**
     * Checks if the new extension number is available.
     * @param {string} oldNumber - The original extension number.
     * @param {string} newNumber - The new extension number to check.
     * @param {string} cssClassName - The CSS class name for the input element.
     * @param {string} userId - The ID of the user associated with the extension.
     */
    checkAvailability(oldNumber, newNumber, cssClassName = 'extension', userId = '') {
        if (oldNumber === newNumber || newNumber.length === 0) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }

        // Use centralized debounce utility
        if (!this.debouncedAvailabilityCheck) {
            this.debouncedAvailabilityCheck = {};
        }

        // Create debounced function for this CSS class if not exists
        if (!this.debouncedAvailabilityCheck[cssClassName]) {
            this.debouncedAvailabilityCheck[cssClassName] = PbxApi.debounce((number, className, userIdParam) => {
                // Show loading state
                $(`.ui.input.${className}`).addClass('loading');

                // Use v3 API through ExtensionsAPI with error handling
                ExtensionsAPI.available(number, (response) => {
                    $(`.ui.input.${className}`).removeClass('loading');

                    if (response && response.result === true && response.data) {
                        if (response.data['available'] === true) {
                            $(`.ui.input.${className}`).parent().removeClass('error');
                            $(`#${className}-error`).addClass('hidden');
                        } else if (userIdParam.length > 0 && parseInt(response.data['userId']) === parseInt(userIdParam)) {
                            $(`.ui.input.${className}`).parent().removeClass('error');
                            $(`#${className}-error`).addClass('hidden');
                        } else {
                            $(`.ui.input.${className}`).parent().addClass('error');
                            let message = `${globalTranslate.ex_ThisNumberIsNotFree}:&nbsp`;
                            if (globalTranslate[response.data['represent']] !== undefined) {
                                message = globalTranslate[response.data['represent']];
                            } else {
                                message += response.data['represent'];
                            }
                            $(`#${className}-error`).removeClass('hidden').html(message);
                        }
                    } else {
                        // Handle error response using centralized error handler
                        $(`.ui.input.${className}`).parent().addClass('error');
                        $(`#${className}-error`).removeClass('hidden').html(globalTranslate.ex_ThisNumberIsNotFree);

                        // Log the error for debugging
                        PbxApi.handleApiError('ExtensionsAPI.checkAvailability', response || 'No response');
                    }
                });
            }, 500); // 500ms debounce delay
        }

        // Call the debounced function
        this.debouncedAvailabilityCheck[cssClassName](newNumber, cssClassName, userId);
    },

    /**
     * Gets phone extensions.
     * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
     */
    getPhoneExtensions(callBack) {
        ExtensionsAPI.getForSelect('phones', (response) => {
            if (response && response.result === true) {
                const formattedResponse = this.formatDropdownResults(response, false);
                callBack(formattedResponse);
            } else {
                callBack({ success: false, results: [] });
            }
        });
    },

    /**
     * Gets extensions for select dropdown.
     * This method is used by out-of-work-time forms and other modules.
     * @param {Function} callBack - The function to call when the extensions have been retrieved.
     * @param {string} type - The type of extensions to retrieve (all, internal, phones, routing). Default: 'routing'
     */
    getForSelect(callBack, type = 'routing') {
        ExtensionsAPI.getForSelect(type, (response) => {
            if (response && response.result === true) {
                const formattedResponse = this.formatDropdownResults(response, false);
                callBack(formattedResponse.results);
            } else {
                callBack([]);
            }
        });
    },

    /**
     * Creates an HTML string for a custom dropdown menu.
     * @param {Object} response - The response containing dropdown menu options.
     * @param {Object} fields - The fields in the response to use for the menu options.
     * @returns {string} The HTML string for the custom dropdown menu.
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        let oldType = '';
        $.each(values, (index, option) => {
            if (option.type !== oldType) {
                oldType = option.type;
                html += '<div class="divider"></div>';
                html += '	<div class="header">';
                html += '	<i class="tags icon"></i>';
                html += option.typeLocalized;
                html += '</div>';
            }
            const maybeText = (option[fields.text]) ? `data-text="${option[fields.text]}"` : '';
            const maybeDisabled = (option[fields.disabled]) ? 'disabled ' : '';
            html += `<div class="${maybeDisabled}item" data-value="${option[fields.value]}"${maybeText}>`;
            html += option[fields.name];
            html += '</div>';
        });
        return html;
    },

    /**
     * Update phone representations for HTML elements with a specific class.
     *
     * @param {string} htmlClass - The HTML class to identify elements for update.
     */
    updatePhonesRepresent(htmlClass) {
        const $preprocessedObjects = $(`.${htmlClass}`);
        // Check if there are elements to process
        if ($preprocessedObjects.length === 0) {
            return;
        }

        const numbers = [];

        // Iterate through each element and update representations if available
        $preprocessedObjects.each((index, el) => {
            const number = $(el).text();
            const represent = sessionStorage.getItem(number);
            if (represent) {
                $(el).html(represent);
                $(el).removeClass(htmlClass);
            } else if (numbers.indexOf(number) === -1) {
                numbers.push(number);
            }
        });

        // Check if there are numbers to fetch representations for
        if (numbers.length === 0) {
            return;
        }

        // Fetch phone representations using v3 API
        ExtensionsAPI.getPhonesRepresent(numbers, (response) => {
            this.cbAfterGetPhonesRepresent(response, htmlClass);
        });
    },

    /**
     * Callback function executed after fetching phone representations.
     *
     * @param {Object} response - The response object from the API call.
     * @param {string} htmlClass - The HTML class for element identification.
     */
    cbAfterGetPhonesRepresent(response, htmlClass) {
        const $preprocessedObjects = $(`.${htmlClass}`);

        // Check if the response is valid and process elements accordingly
        if (response !== undefined && response.result === true) {
            $preprocessedObjects.each((index, el) => {
                const number = $(el).text();
                if (response.data[number] !== undefined) {
                    $(el).html(response.data[number].represent);
                    sessionStorage.setItem(number, response.data[number].represent);
                }
                $(el).removeClass(htmlClass);
            });
        }
    },

    /**
     * Update the representation of a phone number.
     *
     * @param {string} number - The phone number to update.
     */
    updatePhoneRepresent(number) {
        const numbers = [];
        numbers.push(number);
        ExtensionsAPI.getPhonesRepresent(numbers, (response) => {
            // Check if the response is valid and contains the required data
            if (response !== undefined
                && response.result === true
                && response.data[number] !== undefined) {
                // Store the phone representation in session storage
                sessionStorage.setItem(number, response.data[number].represent);
            }
        });
    },

    /**
     * Get extensions for select dropdown (alias for getForSelect custom method)
     * @param {string} type - Type of extensions ('all', 'internal', 'phones', 'routing')
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getForSelect(type = 'routing', callback) {
        try {
            // Support old signature where callback is the first parameter
            if (typeof type === 'function') {
                callback = type;
                type = 'routing';
            }

            const validation = PbxApi.validateApiParams({ type, callback }, {
                required: ['type', 'callback'],
                types: { type: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('ExtensionsAPI.getForSelect', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('getForSelect', { type }, callback);
        } catch (error) {
            return PbxApi.handleApiError('ExtensionsAPI.getForSelect', error, callback);
        }
    },

    /**
     * Check if extension number is available
     * @param {string} number - Extension number to check
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    available(number, callback) {
        try {
            const validation = PbxApi.validateApiParams({ number, callback }, {
                required: ['number', 'callback'],
                types: { number: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('ExtensionsAPI.available', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('available', { number }, callback, 'POST');
        } catch (error) {
            return PbxApi.handleApiError('ExtensionsAPI.available', error, callback);
        }
    },

    /**
     * Get phone representations for multiple numbers
     * @param {Array} numbers - Array of numbers
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getPhonesRepresent(numbers, callback) {
        try {
            const validation = PbxApi.validateApiParams({ numbers, callback }, {
                required: ['numbers', 'callback'],
                types: { callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('ExtensionsAPI.getPhonesRepresent', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('getPhonesRepresent', { numbers }, callback, 'POST');
        } catch (error) {
            return PbxApi.handleApiError('ExtensionsAPI.getPhonesRepresent', error, callback);
        }
    },

    /**
     * Get phone representation for single number
     * @param {string} number - Phone number
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getPhoneRepresent(number, callback) {
        try {
            const validation = PbxApi.validateApiParams({ number, callback }, {
                required: ['number', 'callback'],
                types: { number: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('ExtensionsAPI.getPhoneRepresent', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('getPhoneRepresent', { number }, callback, 'POST');
        } catch (error) {
            return PbxApi.handleApiError('ExtensionsAPI.getPhoneRepresent', error, callback);
        }
    }
});