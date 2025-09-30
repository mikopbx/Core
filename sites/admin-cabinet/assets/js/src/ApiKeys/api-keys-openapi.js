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

/* global globalRootUrl, globalTranslate */

/**
 * API Keys OpenAPI/Stoplight Elements module
 * Handles the initialization and configuration of Stoplight Elements for API documentation
 */
const ApiKeysOpenAPI = {
    /**
     * jQuery object for the main container
     */
    $container: $('#elements-container'),

    /**
     * URL to the OpenAPI specification
     */
    specUrl: '/pbxcore/api/v3/openapi:getSpecification',

    /**
     * jQuery object for the main container
     */
    $mainContainer: $('#main-content-container'),

    /**
     * Initialize the OpenAPI documentation page
     */
    initialize() {
        ApiKeysOpenAPI.showLoading();
        ApiKeysOpenAPI.initializeElements();
    }, 

    /**
     * Show loading state
     */
    showLoading() {
        $('#elements-loading').show();
        ApiKeysOpenAPI.$container.hide();
    },

    /**
     * Show error state
     */
    showError(message) {
        $('#elements-loading').hide();
        ApiKeysOpenAPI.$container.html(`
            <div class="ui negative message">
                <div class="header">${globalTranslate.ak_SwaggerLoadError || 'Failed to load API documentation'}</div>
                <p>${message || globalTranslate.ak_SwaggerLoadErrorDesc || 'Please check your connection and try again.'}</p>
                <div class="ui blue button" onclick="ApiKeysOpenAPI.initialize()">
                    <i class="refresh icon"></i>
                    ${globalTranslate.ak_RetryLoad || 'Retry'}
                </div>
            </div>
        `).show();
    },

    /**
     * Initialize Stoplight Elements
     */
    initializeElements() {
        ApiKeysOpenAPI.$mainContainer.removeClass('container');
        $('.toc').hide();
        ApiKeysOpenAPI.$mainContainer.parent().removeClass('article');
        $('#page-header').hide();

        try {
            // Hide loading immediately as Elements will show its own loader
            $('#elements-loading').hide();
            ApiKeysOpenAPI.$container.show();

            // Create the Elements API component
            const apiElement = document.createElement('elements-api');

            // Set attributes
            apiElement.setAttribute('apiDescriptionUrl', ApiKeysOpenAPI.specUrl);
            apiElement.setAttribute('router', 'hash');
            apiElement.setAttribute('layout', 'sidebar');
            apiElement.setAttribute('hideInternal', 'false');
            apiElement.setAttribute('hideTryIt', 'false');
            apiElement.setAttribute('tryItCredentialsPolicy', 'include');

            // Clear container and append element
            const container = document.getElementById('elements-container');
            container.innerHTML = '';
            container.appendChild(apiElement);

            console.log('Stoplight Elements initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Stoplight Elements:', error);
            ApiKeysOpenAPI.showError(error.message);
        }
    },

    /**
     * Reload the OpenAPI documentation
     */
    reload() {
        ApiKeysOpenAPI.initialize();
    }
};

/**
 * Initialize when DOM is ready
 */
$(document).ready(() => {
    ApiKeysOpenAPI.initialize();
});