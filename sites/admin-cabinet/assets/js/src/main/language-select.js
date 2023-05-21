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
/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/


/**
 * The LanguageSelect object is responsible for changing system interface menu
 *
 * @module LanguageSelect
 */
const LanguageSelect = {

    /**
     * Array to store possible language keys.
     */
    possibleLanguages: [],

    /**
     * Language selector DOM element.
     * @type {jQuery}
     */
    $selector: $('#web-admin-language-selector'),

    /**
     * Initializes the LanguageSelect object.
     */
    initialize() {
        if (LanguageSelect.$selector === undefined) {
            // If language selector DOM element is not found, return
            return;
        }

        // Initialize the language selector dropdown
        LanguageSelect.$selector.dropdown({
            values: LanguageSelect.prepareMenu(),  // Set dropdown values using the prepared menu
            templates: {
                menu: LanguageSelect.customDropdownMenu, // Use custom dropdown menu template
            },
            onChange: LanguageSelect.onChangeLanguage,  // Handle language change event
        });
    },

    /**
     * Prepares the dropdown menu for the language selector.
     * @returns {Array} The prepared menu items.
     */
    prepareMenu() {

        const resArray = [];    // Array to store menu items
        const objectAvailableLanguages = JSON.parse(globalAvailableLanguages);  // Parse available languages JSON

        // Iterate over available languages and prepare dropdown menu items
        $.each(objectAvailableLanguages, (key, value) => {
            const v = {
                name: value,
                value: key,
            };
            if (key === globalWebAdminLanguage) {
                v.selected = true;  // Set 'selected' property for the current language
            }
            resArray.push(v); // Add menu item to the array
            LanguageSelect.possibleLanguages.push(key); // Add language key to possibleLanguages array
        });
        return resArray; // Return the prepared menu
    },

    /**
     * Returns the flag icon HTML for a given language key.
     * @param {string} langKey - The language key.
     * @returns {string} The flag icon HTML.
     */
    getFlagIcon(langKey) {
        const arFlags = {
            // Object mapping language keys to flag icons
            // Add more entries as needed
            en: '<i class="united kingdom flag"></i>',
            ru: '<i class="russia flag"></i>',
            de: '<i class="germany flag"></i>',
            es: '<i class="spain flag"></i>',
            el: '<i class="greece flag"></i>',
            pt: '<i class="portugal flag"></i>',
            pt_BR: '<i class="brazil flag"></i>',
            fr: '<i class="france flag"></i>',
            uk: '<i class="ukraine flag"></i>',
            ka: '<i class="georgia flag"></i>',
            it: '<i class="italy flag"></i>',
            da: '<i class="netherlands flag"></i>',
            pl: '<i class="poland flag"></i>',
            sv: '<i class="sweden flag"></i>',
            cs: '<i class="czech republic flag"></i>',
            tr: '<i class="turkey flag"></i>',
            ja: '<i class="japan flag"></i>',
            vi: '<i class="vietnam flag"></i>',
            zh_Hans: '<i class="china flag"></i>',
            az: '<i class="azerbaijan flag"></i>',
        };
        if (langKey in arFlags) {
            // Return the flag icon for the given language key
            return arFlags[langKey];
        }
        return ''; // Return empty string if the flag icon is not found
    },

    /**
     * Custom dropdown menu template.
     * @param {object} response - The dropdown menu response.
     * @param {object} fields - The dropdown menu fields.
     * @returns {string} The HTML for the custom dropdown menu.
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        $.each(values, (index, option) => {
            if (html === '') {
                html += `<a class="item" target="_blank" href="https://weblate.mikopbx.com/engage/mikopbx/"><i class="pencil alternate icon"></i> ${globalTranslate.lang_HelpWithTranslateIt}</a>`;
                html += '<div class="divider"></div>';
            }
            html += `<div class="item" data-value="${option[fields.value]}">`;
            html += LanguageSelect.getFlagIcon(option[fields.value]);
            html += option[fields.name];
            html += '</div>';
        });
        return html;
    },

    /**
     * Handles the language change event.
     * @param {string} value - The selected language value.
     */
    onChangeLanguage(value) {
        if (value === globalWebAdminLanguage) {
            return;
        }
        if (!LanguageSelect.possibleLanguages.includes(value)) {
            LanguageSelect.$selector.dropdown("set selected", globalWebAdminLanguage);
            return;
        }
        $.api({
            url: `${globalRootUrl}session/changeLanguage/`,
            data: {newLanguage: value},
            method: 'POST',
            on: 'now',
            onSuccess(response) {
                if (response !== undefined && response.success === true) {
                    const event = document.createEvent('Event');
                    event.initEvent('ConfigDataChanged', false, true);
                    window.dispatchEvent(event);
                    window.location.reload();
                }
            },
        });
    },
};

// When the document is ready, initialize the language select dropdown
$(document).ready(() => {
    LanguageSelect.initialize();
});
