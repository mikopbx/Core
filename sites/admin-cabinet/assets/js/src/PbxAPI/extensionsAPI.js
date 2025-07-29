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

/* global globalRootUrl, sessionStorage, PbxApi */


/**
 * This module encapsulates a collection of functions related to extensions.
 *
 * @module Extensions
 */
const Extensions = {
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
                    // SECURITY: Sanitize name field to prevent XSS attacks in dropdown menus
                    // Use SecurityUtils to safely handle extension representations with icons
                    name: window.SecurityUtils ? window.SecurityUtils.sanitizeExtensionsApiContent(item.name) : item.name,
                    value: item.value,
                    type: item.type,
                    typeLocalized: item.typeLocalized,
                });
            });
        }

        return formattedResponse;
    },

    /**
     * Constructs dropdown settings for extensions with an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsWithEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'all'
                },
                cache: false,
                // throttle: 400,
                onResponse(response) {
                    return Extensions.formatDropdownResults(response, true);
                },
            },
            onChange(value) {
                if (parseInt(value, 10) === -1) $(this).dropdown('clear');
                if (cbOnChange !== null) cbOnChange(value);
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            // direction: 'downward',
            hideDividers: 'empty',
            templates: {
                menu: Extensions.customDropdownMenu,
            },
        };
    },

    /**
     * Constructs dropdown settings for extensions without an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsWithoutEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'all'
                },
                cache: false,
                onResponse(response) {
                    return Extensions.formatDropdownResults(response, false);
                },
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            hideDividers: 'empty',
            onChange(value) {
                if (cbOnChange !== null) cbOnChange(value);
            },
            templates: {
                menu: Extensions.customDropdownMenu,
            },
        };
    },

    /**
     * Constructs dropdown settings for routing extensions.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsForRouting(cbOnChange = null) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'routing'
                },
                cache: false,
                // throttle: 400,
                onResponse(response) {
                    return Extensions.formatDropdownResults(response, false);
                },
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            // direction: 'downward',
            hideDividers: 'empty',
            onChange(value) {
                if (cbOnChange !== null) cbOnChange(value);
            },
            templates: {
                menu: Extensions.customDropdownMenu,
            },
        };
    },

    /**
     * Constructs dropdown settings for routing extensions with exclusion support.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @param {string[]} excludeExtensions - Array of extension values to exclude from dropdown.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsForRoutingWithExclusion(cbOnChange = null, excludeExtensions = []) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'routing'
                },
                cache: false,
                // throttle: 400,
                onResponse(response) {
                    const formattedResponse = Extensions.formatDropdownResults(response, false);
                    
                    // Filter out excluded extensions
                    if (excludeExtensions.length > 0 && formattedResponse.results) {
                        formattedResponse.results = formattedResponse.results.filter(item => {
                            return !excludeExtensions.includes(item.value);
                        });
                    }
                    
                    return formattedResponse;
                },
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            // direction: 'downward',
            hideDividers: 'empty',
            onChange(value) {
                if (cbOnChange !== null) cbOnChange(value);
            },
            templates: {
                menu: Extensions.customDropdownMenu,
            },
        };
    },

    /**
     * Constructs dropdown settings for internal extensions without an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsOnlyInternalWithoutEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'internal'
                },
                cache: false,
                // throttle: 400,
                onResponse(response) {
                    return Extensions.formatDropdownResults(response, false);
                },
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            // direction: 'downward',
            hideDividers: 'empty',
            onChange(value) {
                if (cbOnChange !== null) cbOnChange(value);
            },
            templates: {
                menu: Extensions.customDropdownMenu,
            },
        };
    },

    /**
     * Constructs dropdown settings for internal extensions with an empty field.
     * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
     * @returns {Object} The dropdown settings.
     */
    getDropdownSettingsOnlyInternalWithEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: PbxApi.extensionsGetForSelect,
                urlData: {
                    type: 'internal'
                },
                cache: false,
                // throttle: 400,
                onResponse(response) {
                    return Extensions.formatDropdownResults(response, true);
                },
            },
            onChange(value) {
                if (parseInt(value, 10) === -1) $(this).dropdown('clear');
                if (cbOnChange !== null) cbOnChange(value);
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            // direction: 'downward',
            hideDividers: 'empty',
            templates: {
                menu: Extensions.customDropdownMenu,
            },

        };
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
    },

    /**
     * Fix HTML entities in dropdown text elements to properly display icons
     * Handles both single and double-escaped HTML entities
     * @param {string} selector - jQuery selector for dropdown text elements to fix
     * @param {number} delay - Delay in milliseconds before applying fix (default: 50)
     */
    fixDropdownHtmlEntities(selector = '.ui.dropdown .text', delay = 50) {
        setTimeout(() => {
            $(selector).each(function() {
                const $text = $(this);
                const currentText = $text.html();
                
                if (currentText && (currentText.includes('&lt;') || currentText.includes('&amp;lt;'))) {
                    let fixedText = currentText;
                    
                    // First, handle double-escaped entities (e.g., &amp;lt; -> &lt;)
                    if (currentText.includes('&amp;lt;')) {
                        fixedText = fixedText
                            .replace(/&amp;lt;/g, '&lt;')
                            .replace(/&amp;gt;/g, '&gt;')
                            .replace(/&amp;quot;/g, '&quot;');
                    }
                    
                    // Then restore HTML tags for icons only (safe tags) - handle nested icons
                    if (fixedText.includes('&lt;i') && fixedText.includes('&gt;')) {
                        fixedText = fixedText
                            // Fix opening i tags with any class
                            .replace(/&lt;i(\s+class="[^"]*")?&gt;/g, '<i$1>')
                            // Fix closing i tags
                            .replace(/&lt;\/i&gt;/g, '</i>');
                    }
                    
                    $text.html(fixedText);
                }
            });
        }, delay);
    },

    /**
     * Safely process extension representation text to handle HTML entities
     * @param {string} text - Text to process
     * @param {boolean} allowIcons - Whether to allow <i> tags for icons
     * @returns {string} Processed safe HTML
     */
    sanitizeExtensionRepresent(text, allowIcons = true) {
        if (!text) return '';
        
        // Handle double-escaped HTML entities first
        let fixedText = text;
        if (text.includes('&amp;lt;')) {
            fixedText = text
                .replace(/&amp;lt;/g, '&lt;')
                .replace(/&amp;gt;/g, '&gt;')
                .replace(/&amp;quot;/g, '&quot;');
        }
        
        // If we want to allow icons, convert safe icon tags back to HTML
        if (allowIcons && fixedText.includes('&lt;i') && fixedText.includes('&gt;')) {
            fixedText = fixedText
                // Fix opening i tags with any class
                .replace(/&lt;i(\s+class="[^"]*")?&gt;/g, '<i$1>')
                // Fix closing i tags
                .replace(/&lt;\/i&gt;/g, '</i>');
        }
        
        return fixedText;
    },

};