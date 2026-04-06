/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, sessionStorage, SoundFilesAPI */

/**
 * Represents a sound files selector.
 *
 * @module SoundFilesSelector
 */
const SoundFilesSelector = {

    /**
     * Retrieves the dropdown settings with an empty field for sound files.
     * @param {function} cbOnChange - The onchange callback function.
     * @returns {object} - The dropdown settings.
     */
    getDropdownSettingsWithEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: SoundFilesAPI.endpoints.getForSelect,
                method: 'GET',
                beforeSend(settings) {
                    settings.data = { category: 'custom' };
                    return settings;
                },
                onResponse(response) {
                    return SoundFilesSelector.formatDropdownResults(response, true);
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

        };
    },

    /**
     * Retrieves the dropdown settings without an empty field for sound files.
     * @param {function} cbOnChange - The onchange callback function.
     * @returns {object} - The dropdown settings.
     */
    getDropdownSettingsWithoutEmpty(cbOnChange = null) {
        return {
            apiSettings: {
                url: SoundFilesAPI.endpoints.getForSelect,
                method: 'GET',
                beforeSend(settings) {
                    settings.data = { category: 'custom' };
                    return settings;
                },
                onResponse(response) {
                    return SoundFilesSelector.formatDropdownResults(response, false);
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
        };
    },

    
    /**
     * Formats the dropdown menu structure.
     * @param {object} response - The response data.
     * @param {boolean} addEmpty - Indicates if an empty field should be added to the results.
     * @returns {object} - The formatted response.
     */
    formatDropdownResults(response, addEmpty) {
        const formattedResponse = {
            success: false,
            results: [],
        };
        if (addEmpty) {
            formattedResponse.results.push({
                name: '-',
                value: -1
            });
        }

        if (response && response.result) {
            formattedResponse.success = true;
            $.each(response.data, (index, item) => {
                formattedResponse.results.push({
                    name: item.name,
                    value: item.value
                });
            });
        }
        return formattedResponse;
    },

    /**
     * Initialize a sound file dropdown selector.
     * @param {string} dropdownSelector - CSS selector for the dropdown element.
     * @param {string} inputSelector - CSS selector for the hidden input element.
     * @param {function} cbOnChange - Optional onchange callback function.
     */
    initialize(dropdownSelector, inputSelector, cbOnChange = null) {
        const $dropdown = $(dropdownSelector);
        const $input = $(inputSelector);

        if ($dropdown.length === 0) {
            console.warn(`SoundFilesSelector: Dropdown element not found: ${dropdownSelector}`);
            return;
        }

        $dropdown.dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty((value) => {
            if ($input.length > 0) {
                $input.val(value);
            }
            if (cbOnChange !== null) {
                cbOnChange(value);
            }
        }));
    },

    /**
     * Initialize sound file dropdown with HTML icons support (new method)
     * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
     * @param {function} cbOnChange - Optional onchange callback function
     */
    initializeWithIcons(fieldId, cbOnChange = null) {
        const dropdownSelector = `.${fieldId}-select`;
        const inputSelector = `input[name="${fieldId}"]`;
        const $dropdown = $(dropdownSelector);
        const $input = $(inputSelector);

        if ($dropdown.length === 0) {
            console.warn(`SoundFilesSelector: Dropdown element not found: ${dropdownSelector}`);
            return;
        }

        // Initialize dropdown with API loading and HTML support
        $dropdown.dropdown({
            apiSettings: {
                url: SoundFilesAPI.endpoints.getForSelect,
                method: 'GET',
                beforeSend(settings) {
                    settings.data = { category: 'custom' };
                    return settings;
                },
                onResponse(response) {
                    return SoundFilesSelector.formatDropdownResultsWithIcons(response, true);
                },
            },
            onChange(value) {
                if ($input.length > 0) {
                    $input.val(value);
                    // Trigger change event for audio player
                    $input.trigger('change');
                }
                if (cbOnChange !== null) {
                    cbOnChange(value);
                }
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: false,
            hideDividers: 'empty',
        });
    },

    /**
     * Set initial value with HTML icon for dropdown
     * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
     * @param {string} value - Option value
     * @param {string} htmlText - HTML text with icons
     */
    setInitialValueWithIcon(fieldId, value, htmlText) {
        const dropdownSelector = `.${fieldId}-select`;
        const $dropdown = $(dropdownSelector);
        
        if ($dropdown.length === 0) {
            console.warn(`SoundFilesSelector: Dropdown element not found: ${dropdownSelector}`);
            return;
        }

        const safeText = window.SecurityUtils ? 
            window.SecurityUtils.sanitizeForDisplay(htmlText, false) : 
            htmlText;
        
        // Set the value without disrupting API functionality
        $dropdown.dropdown('set value', value);
        
        // Update the display text with HTML content
        $dropdown.find('.text').removeClass('default').html(safeText);
        
        // Set hidden input value and trigger change event
        const $hiddenInput = $(`input[name="${fieldId}"]`);
        if ($hiddenInput.length > 0) {
            $hiddenInput.val(value).trigger('change');
        }
    },

    /**
     * Format dropdown results with HTML icons support
     * @param {object} response - The response data
     * @param {boolean} addEmpty - Indicates if an empty field should be added
     * @returns {object} - The formatted response
     */
    formatDropdownResultsWithIcons(response, addEmpty) {
        const formattedResponse = {
            success: false,
            results: [],
        };
        
        if (addEmpty) {
            formattedResponse.results.push({
                name: '-',
                value: -1,
                text: '-'
            });
        }

        if (response && response.result) {
            formattedResponse.success = true;
            $.each(response.data, (index, item) => {
                // Use strict sanitization for dropdown options from API
                const safeName = window.SecurityUtils ? 
                    window.SecurityUtils.sanitizeForDisplay(item.name, true) : 
                    item.name;
                    
                formattedResponse.results.push({
                    name: safeName,
                    value: item.value,
                    text: safeName
                });
            });
        }
        return formattedResponse;
    },
}