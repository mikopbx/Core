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
/* global globalWebAdminLanguage, globalTranslate, globalRootUrl, DynamicDropdownBuilder, TokenManager */


/**
 * The LanguageSelect object is responsible for changing system interface language
 *
 * @module LanguageSelect
 */
const LanguageSelect = {

    /**
     * Current language code
     * @type {string}
     */
    currentLanguage: '',

    /**
     * Initializes the LanguageSelect module with DynamicDropdownBuilder.
     */
    initialize() {
        // Set current language from global variable
        LanguageSelect.currentLanguage = globalWebAdminLanguage || 'en';

        // Get current language info to populate represent field
        LanguageSelect.getCurrentLanguageInfo((languageData) => {
            // Build dropdown using DynamicDropdownBuilder with represent data
            DynamicDropdownBuilder.buildDropdown('WEB_ADMIN_LANGUAGE', languageData, {
                apiUrl: '/pbxcore/api/v3/system:getAvailableLanguages',
                placeholder: 'Select language',
                cache: true, // Cache is ok for languages
                baseClasses: ['ui', 'dropdown'], // No 'selection' class for compact style
                additionalClasses: [], // No additional classes for login page
                templates: {
                    menu: LanguageSelect.customMenuTemplate
                },
                onResponse: LanguageSelect.handleApiResponse,
                onChange: LanguageSelect.onChangeLanguage
            });
        });
    },

    /**
     * Get current language info from API
     * @param {function} callback - Callback function to execute with language data
     */
    getCurrentLanguageInfo(callback) {
        // Make synchronous request to get available languages
        $.ajax({
            url: '/pbxcore/api/v3/system:getAvailableLanguages',
            method: 'GET',
            dataType: 'json',
            async: false, // Synchronous to get data before building dropdown
            success(response) {
                if (response && response.result && response.data) {
                    // Find current language in the list
                    const currentLang = response.data.find(lang => lang.code === LanguageSelect.currentLanguage);

                    if (currentLang) {
                        // Build represent field with flag (like networkfilterid pattern)
                        const represent = `<i class="flag ${currentLang.flag}"></i> ${currentLang.name}`;

                        callback({
                            WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage,
                            WEB_ADMIN_LANGUAGE_represent: represent
                        });
                        return;
                    }
                }

                // Fallback if language not found
                callback({
                    WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage
                });
            },
            error() {
                // Fallback on error
                callback({
                    WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage
                });
            }
        });
    },

    /**
     * Handle API response and transform to dropdown format
     * @param {object} response - API response
     * @returns {object} Fomantic UI compatible response
     */
    handleApiResponse(response) {
        if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
            return {
                success: true,
                results: response.data // Keep original structure with code, name, flag
            };
        }
        return {
            success: false,
            results: []
        };
    },

    /**
     * Custom menu template with "Help translate" link and flags
     * @param {object} response - Response object from Fomantic UI
     * @param {object} fields - Field mapping configuration
     * @returns {string} HTML for custom menu
     */
    customMenuTemplate(response, fields) {
        const values = response[fields.values] || [];
        let html = '';

        // Add "Help translate" link at the top
        html += `<a class="item" target="_blank" href="https://weblate.mikopbx.com/engage/mikopbx/">`;
        html += `<i class="pencil alternate icon"></i> ${globalTranslate.lang_HelpWithTranslateIt || 'Help with translation'}`;
        html += `</a>`;
        html += '<div class="divider"></div>';

        // Add language items with flags
        values.forEach(item => {
            const code = item.code || item.value;
            const name = item.name || item.text;
            const flag = item.flag || '';

            html += `<div class="item" data-value="${code}">`;
            html += `<i class="flag ${flag}"></i>`;
            html += name;
            html += '</div>';
        });

        return html;
    },

    /**
     * Handles the language change event.
     * @param {string} value - The selected language code.
     */
    onChangeLanguage(value) {
        // Prevent unnecessary reload if language hasn't changed
        if (value === LanguageSelect.currentLanguage) {
            return;
        }

        // Use REST API endpoint for language change
        $.ajax({
            url: '/pbxcore/api/v3/system:changeLanguage',
            data: JSON.stringify({language: value}),
            method: 'PATCH',
            contentType: 'application/json',
            dataType: 'json',
            success(response) {
                if (response !== undefined && response.result === true) {
                    // Update current language
                    LanguageSelect.currentLanguage = value;

                    // If new access token returned, update it in TokenManager
                    if (response.data && response.data.accessToken && window.TokenManager) {
                        window.TokenManager.setAccessToken(
                            response.data.accessToken,
                            response.data.expiresIn || 900
                        );
                    }

                    // Update dropdown with new represent if provided (like networkfilterid pattern)
                    if (response.data && response.data.WEB_ADMIN_LANGUAGE_represent) {
                        DynamicDropdownBuilder.updateExistingDropdown('WEB_ADMIN_LANGUAGE', response.data, {});
                    }

                    // Trigger ConfigDataChanged event
                    const event = document.createEvent('Event');
                    event.initEvent('ConfigDataChanged', false, true);
                    window.dispatchEvent(event);

                    // Reload page to apply new language
                    window.location.reload();
                }
            },
            error(xhr) {
                console.error('Language change failed:', xhr);
                // Revert dropdown to previous language
                const $dropdown = $('#WEB_ADMIN_LANGUAGE-dropdown');
                if ($dropdown.length) {
                    $dropdown.dropdown('set selected', LanguageSelect.currentLanguage);
                }
            }
        });
    },
};

// When the document is ready, initialize the language select dropdown
$(document).ready(() => {
    LanguageSelect.initialize();
});
