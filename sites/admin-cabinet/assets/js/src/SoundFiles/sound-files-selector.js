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

/* global globalRootUrl, sessionStorage */

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
                url: `${globalRootUrl}sound-files/getSoundFiles/custom`,
                // cache: false,
                // throttle: 400,
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
                url: `${globalRootUrl}sound-files/getSoundFiles/custom`,
                // cache: false,
                // throttle: 400,
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

        if (response) {
            formattedResponse.success = true;
            $.each(response.results, (index, item) => {
                formattedResponse.results.push({
                    name: item.name,
                    value: item.value
                });
            });
        }
        return formattedResponse;
    },
}