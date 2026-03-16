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
/* global globalWebAdminLanguage, TokenManager */

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
     * jQuery selector for language dropdown
     * @type {jQuery}
     */
    $dropdown: null,

    /**
     * Initializes the LanguageSelect module with static language list from server
     */
    initialize() {
        // Set current language from global variable
        LanguageSelect.currentLanguage = globalWebAdminLanguage || 'en';

        // Initialize Fomantic UI dropdown with static list (already rendered in template)
        LanguageSelect.$dropdown = $('#language-selector');

        if (LanguageSelect.$dropdown.length === 0) {
            return; // No dropdown found
        }

        // Initialize dropdown with onChange handler
        LanguageSelect.$dropdown.dropdown({
            onChange: LanguageSelect.onChangeLanguage
        });
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

        // On login page (no auth token) — skip API call, use ?lang= parameter directly
        if (!window.TokenManager || typeof window.TokenManager.getAccessToken !== 'function' || !window.TokenManager.getAccessToken()) {
            localStorage.setItem('mikopbx-preferred-language', value);
            window.location.href = `${window.location.pathname}?lang=${encodeURIComponent(value)}`;
            return;
        }

        // Use REST API endpoint for language change (requires authentication)
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

                    // Trigger ConfigDataChanged event
                    const event = document.createEvent('Event');
                    event.initEvent('ConfigDataChanged', false, true);
                    window.dispatchEvent(event);

                    // Reload page to apply new language
                    window.location.reload();
                }
            },
            error(xhr) {
                if (xhr.status === 401 || xhr.status === 403) {
                    // Not authenticated (login page) — save preference locally
                    // and reload with language parameter for server-side rendering
                    localStorage.setItem('mikopbx-preferred-language', value);
                    window.location.href = `${window.location.pathname}?lang=${encodeURIComponent(value)}`;
                    return;
                }
                console.error('Language change failed:', xhr);
                // Revert dropdown to previous language
                if (LanguageSelect.$dropdown && LanguageSelect.$dropdown.length) {
                    LanguageSelect.$dropdown.dropdown('set selected', LanguageSelect.currentLanguage);
                }
            }
        });
    },
};

// When the document is ready, initialize the language select dropdown
$(document).ready(() => {
    LanguageSelect.initialize();
});
