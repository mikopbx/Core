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

/* global globalRootUrl, sessionStorage, PbxApi, globalTranslate, SecurityUtils */


/**
 * This module encapsulates a collection of functions related to extensions.
 *
 * @module Extensions
 */
const Extensions = {
    // Debounce timeout storage for different CSS classes
    debounceTimeouts: {},

    /**
     * Formats the dropdown results by adding necessary data.
     *
     * @param {Object} response - Response from the server.
     * @param {Boolean} addEmpty - A flag to decide if an empty object needs to be added to the result.
     * @return {Object} formattedResponse - The formatted response.
     */
    formatDropdownResults(response, addEmpty) {
        const formattedResponse = {
            success: false,
            results: [],
        };
        if (addEmpty) {
            formattedResponse.results.push({
                name: '-',
                value: -1,
                type: '',
                typeLocalized: '',
            });
        }

        if (response) {
            formattedResponse.success = true;
            $.each(response.data, (index, item) => {
                formattedResponse.results.push({
                    // Safely process name field - allow only specific icon patterns
                    name: SecurityUtils.sanitizeObjectRepresentations(item.name),
                    value: item.value,
                    type: item.type,
                    typeLocalized: item.typeLocalized,
                });
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
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: type
                },
                cache: false,
                onResponse: function(response) {
                    const formattedResponse = Extensions.formatDropdownResults(response, addEmpty);
                    
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
                menu: Extensions.customDropdownMenu,
            }
        };
    },

    /**
     * Constructs dropdown settings for extensions with an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsWithEmpty(cbOnChange = null) {
        return Extensions.getDropdownSettings({
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
        return Extensions.getDropdownSettings({
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
        return Extensions.getDropdownSettings({
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
        return Extensions.getDropdownSettings({
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
        return Extensions.getDropdownSettings({
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
        return Extensions.getDropdownSettings({
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
        
        // Clear existing timeout for this CSS class
        if (this.debounceTimeouts[cssClassName]) {
            clearTimeout(this.debounceTimeouts[cssClassName]);
        }
        
        // Set new timeout with 500ms debounce
        this.debounceTimeouts[cssClassName] = setTimeout(() => {
            $.api({
            url: PbxApi.extensionsAvailable,
            stateContext: `.ui.input.${cssClassName}`,
            on: 'now',
            urlData: {
                number: newNumber
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (response.data['available'] === true) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else if (userId.length > 0 && parseInt(response.data['userId']) === parseInt(userId)) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else {
                    $(`.ui.input.${cssClassName}`).parent().addClass('error');
                    let message = `${globalTranslate.ex_ThisNumberIsNotFree}:&nbsp`;
                    if (globalTranslate[response.data['represent']] !== undefined) {
                        message = globalTranslate[response.data['represent']];
                    } else {
                        message += response.data['represent'];
                    }
                    $(`#${cssClassName}-error`).removeClass('hidden').html(message);
                }
            },
            });
        }, 500); // 500ms debounce delay
    },

    /**
     * Gets phone extensions.
     * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
     */
    getPhoneExtensions(callBack) {
        $.api({
            url: PbxApi.extensionsGetForSelect,
            urlData: {
                type: 'phones'
            },
            on: 'now',
            onResponse(response) {
                return Extensions.formatDropdownResults(response, false);
            },
            onSuccess(response) {
                callBack(response);
            },
        });
    },
    
    /**
     * Gets extensions for select dropdown.
     * This method is used by out-of-work-time forms and other modules.
     * @param {Function} callBack - The function to call when the extensions have been retrieved.
     * @param {string} type - The type of extensions to retrieve (all, internal, phones, routing). Default: 'routing'
     */
    getForSelect(callBack, type = 'routing') {
        $.api({
            url: PbxApi.extensionsGetForSelect,
            urlData: {
                type: type
            },
            on: 'now',
            onResponse(response) {
                return Extensions.formatDropdownResults(response, false);
            },
            onSuccess(response) {
                callBack(response.results);
            },
            onError() {
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

        // Fetch phone representations using API call
        PbxApi.ExtensionsGetPhonesRepresent(numbers,
            (response) => {
                Extensions.cbAfterGetPhonesRepresent(response, htmlClass)
            }
        );
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
        PbxApi.ExtensionsGetPhonesRepresent(numbers, (response) => {
            {
                // Check if the response is valid and contains the required data
                if (response !== undefined
                    && response.result === true
                    && response.data[number] !== undefined) {
                    // Store the phone representation in session storage
                    sessionStorage.setItem(number, response.data[number].represent);
                }
            }
        })
    }
};


/**
 * Extensions API methods for V5.0 architecture (similar to ConferenceRooms pattern)
 * These methods provide clean REST API interface for extension data management
 * with proper POST/PUT support for create/update operations
 */
const ExtensionsAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/extensions/`,
    
    /**
     * Get all extension statuses
     * @param {function|object} callbackOrOptions - Either callback function or options object
     * @param {function} [callback] - Callback function when first param is options
     */
    getStatuses(callbackOrOptions, callback) {
        let options = {};
        let cb = callback;
        
        // Handle overloaded parameters
        if (typeof callbackOrOptions === 'function') {
            cb = callbackOrOptions;
        } else if (typeof callbackOrOptions === 'object') {
            options = callbackOrOptions;
            // callback must be provided as second parameter when first is options
            if (typeof callback !== 'function') {
                console.error('ExtensionsAPI.getStatuses: callback function required when options provided');
                return;
            }
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        if (options.simplified === true) {
            params.append('simplified', 'true');
        }
        
        const url = params.toString() 
            ? `${this.apiUrl}getStatuses?${params.toString()}`
            : `${this.apiUrl}getStatuses`;
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            cache: false, // Always get fresh status data
            onSuccess(response) {
                if (cb) cb(response);
            },
            onFailure(response) {
                if (cb) cb(response);
            },
            onError() {
                if (cb) cb({result: false, data: {}});
            }
        });
    },
    
    /**
     * Get status for specific extension
     * @param {string} extension - Extension number
     * @param {function} callback - Callback function to handle response
     */
    getStatus(extension, callback) {
        $.api({
            url: `${this.apiUrl}getStatus/${extension}`,
            method: 'GET',
            on: 'now',
            cache: false,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: null});
            }
        });
    },
    
    /**
     * Force status check for extension(s)
     * @param {string} extension - Extension number (optional, if not provided checks all)
     * @param {function} callback - Callback function to handle response
     */
    forceCheck(extension, callback) {
        const url = extension ? 
            `${this.apiUrl}forceCheck/${extension}` : 
            `${this.apiUrl}forceCheck`;
            
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            cache: false,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Get extension history
     * @param {string} extension - Extension number
     * @param {object} options - Options (limit, offset)
     * @param {function} callback - Callback function to handle response
     */
    getHistory(extension, options = {}, callback) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        
        const url = `${this.apiUrl}getHistory/${extension}` + 
                   (params.toString() ? `?${params.toString()}` : '');
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            cache: false,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Get extension statistics
     * @param {string} extension - Extension number
     * @param {object} options - Options (days)
     * @param {function} callback - Callback function to handle response
     */
    getStats(extension, options = {}, callback) {
        const params = new URLSearchParams();
        if (options.days) params.append('days', options.days);
        
        const url = `${this.apiUrl}getStats/${extension}` + 
                   (params.toString() ? `?${params.toString()}` : '');
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            cache: false,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: {}});
            }
        });
    },
};