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

/* global globalRootUrl, PbxApi, PbxApiClient, Config */

/**
 * WikiLinksAPI - REST API v3 client for wiki documentation links
 *
 * Provides a clean interface for retrieving documentation links based on
 * controller, action, and language context.
 *
 * @class WikiLinksAPI
 */
const WikiLinksAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/wiki-links',
    customMethods: {
        getLink: ':getLink'
    }
});

// Add utility methods to WikiLinksAPI
Object.assign(WikiLinksAPI, {
    /**
     * Get documentation link for current page
     *
     * @param {string} controller - Controller name in CamelCase format
     * @param {string} action - Action name (optional, defaults to 'index')
     * @param {string} moduleId - Module unique ID for module-specific docs (optional)
     * @param {function} callback - Callback function that receives the URL
     */
    getLink(controller, action = 'index', moduleId = '', callback) {
        // Handle different parameter combinations
        let actualCallback = callback;
        let actualModuleId = moduleId;

        // If third parameter is a function, it's the callback (no moduleId)
        if (typeof moduleId === 'function') {
            actualCallback = moduleId;
            actualModuleId = '';
        }

        const params = {
            controller: controller,
            action: action,
            language: Config.webAdminLanguage || 'en'
        };

        if (actualModuleId) {
            params.moduleId = actualModuleId;
        }

        return this.callCustomMethod('getLink', params, (response) => {
            if (response && response.result === true && response.data && response.data.url) {
                if (typeof actualCallback === 'function') {
                    actualCallback(response.data.url);
                }
            } else {
                // Fallback to base wiki URL if API fails
                const fallbackUrl = `https://wiki.mikopbx.com/${controller.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
                if (typeof actualCallback === 'function') {
                    actualCallback(fallbackUrl);
                }
            }
        }, 'GET');
    },

    /**
     * Open documentation in new tab
     *
     * @param {string} controller - Controller name
     * @param {string} action - Action name (optional)
     * @param {string} moduleId - Module unique ID (optional)
     */
    openDocumentation(controller, action = 'index', moduleId = '') {
        this.getLink(controller, action, moduleId, (url) => {
            window.open(url, '_blank');
        });
    },

    /**
     * Initialize wiki help link handlers
     * Sets up click handlers for all elements with 'wiki-help-link' class
     */
    initializeHelpLinks() {
        $(document).off('click', 'a.wiki-help-link');
        $(document).on('click', 'a.wiki-help-link', function(e) {
            e.preventDefault();

            const controller = $(this).data('controller');
            const action = $(this).data('action') || 'index';
            const moduleId = $(this).data('module-id') || '';

            WikiLinksAPI.openDocumentation(controller, action, moduleId);
        });
    }
});

// Initialize help links when document is ready
$(document).ready(() => {
    WikiLinksAPI.initializeHelpLinks();
});
