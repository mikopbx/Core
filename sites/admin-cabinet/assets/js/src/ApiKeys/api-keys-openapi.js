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
        // Set up Stoplight Elements security scheme provider
        // WHY: Stoplight Elements will call this function to get auth tokens dynamically
        // This integrates with TokenManager without storing tokens in localStorage
        // Security: Tokens stay in memory only, no localStorage persistence
        ApiKeysOpenAPI.setupSecuritySchemeProvider();

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
     * Set up Stoplight Elements security scheme provider
     *
     * WHY: Provides authentication tokens dynamically to Stoplight Elements
     * without storing them in localStorage. This integrates with TokenManager
     * for better security (tokens stay in memory only).
     */
    setupSecuritySchemeProvider() {
        window.stoplightSecuritySchemeProvider = () => {
            // Check if TokenManager is available and has an access token
            if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
                // Return security scheme values for Stoplight Elements
                // The key 'bearerAuth' matches the security scheme name in OpenAPI spec
                return {
                    'bearerAuth': TokenManager.accessToken
                };
            }

            // No token available - return null to fallback to localStorage
            return null;
        };

        console.log('Stoplight Elements security scheme provider configured');
    },

    /**
     * Initialize Stoplight Elements
     */
    async initializeElements() {
        ApiKeysOpenAPI.$mainContainer.removeClass('container');
        $('.toc').hide();
        ApiKeysOpenAPI.$mainContainer.parent().removeClass('article');
        $('#page-header').hide();
        $('#content-frame').removeClass('grey').addClass('basic');

        try {

            // Fetch OpenAPI specification with authentication
            // We need to use $.ajax instead of fetch to get JWT token automatically
            const response = await $.ajax({
                url: ApiKeysOpenAPI.specUrl,
                method: 'GET',
                dataType: 'json'
            });

            // Check if response is valid
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid OpenAPI specification received');
            }

            // Hide loading immediately as Elements will show its own loader
            $('#elements-loading').hide();
            ApiKeysOpenAPI.$container.show();

            // Create the Elements API component
            const apiElement = document.createElement('elements-api');

            // Set attributes - pass JSON directly instead of URL to avoid auth issues
            apiElement.setAttribute('router', 'hash');
            apiElement.setAttribute('layout', 'sidebar');
            // Note: Don't set hideInternal or hideTryIt - they default to false (shown)
            // Boolean attributes: presence = true, absence = false
            apiElement.setAttribute('tryItCredentialsPolicy', 'include');

            // Clear container and append element
            const container = document.getElementById('elements-container');
            container.innerHTML = '';
            container.appendChild(apiElement);

            // Set the specification document (must be done after appendChild)
            apiElement.apiDescriptionDocument = response;

            // Override Stoplight Elements inline styles to remove max-width restriction
            ApiKeysOpenAPI.addCustomStyles();

            console.log('Stoplight Elements initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Stoplight Elements:', error);
            ApiKeysOpenAPI.showError(error.message || error.statusText || 'Unknown error');
        }
    },

    /**
     * Add custom CSS to override Stoplight Elements default styles
     * Uses MutationObserver and delayed forced styling to ensure styles are applied
     */
    addCustomStyles() {
        // Add style tag immediately
        const style = document.createElement('style');
        style.id = 'stoplight-custom-styles';
        style.textContent = `
            /* Remove container max-width to allow full-width layout */
            .sl-py-16 {
                max-width: none !important;
                width: 100% !important;
            }

            /* Override Stoplight Elements inline max-width for example column */
            [data-testid="two-column-right"] {
                max-width: none !important;
                width: 50% !important;
            }

            /* Adjust left column width accordingly */
            [data-testid="two-column-left"] {
                width: 50% !important;
            }
        `;
        document.head.appendChild(style);

        // Force apply inline styles to override Stoplight Elements defaults
        const applyForcedStyles = () => {
            const rightColumn = document.querySelector('[data-testid="two-column-right"]');
            const leftColumn = document.querySelector('[data-testid="two-column-left"]');
            const container = document.querySelector('.sl-py-16[style*="max-width"]');

            if (container) {
                container.style.maxWidth = '100%';
                container.style.width = '100%';
            }

            if (rightColumn) {
                rightColumn.style.maxWidth = 'none';
                rightColumn.style.width = '50%';
            }

            if (leftColumn) {
                leftColumn.style.width = '50%';
            }
        };

        // Apply styles after Elements loads (multiple attempts to ensure they stick)
        setTimeout(applyForcedStyles, 500);
        setTimeout(applyForcedStyles, 1000);
        setTimeout(applyForcedStyles, 2000);

        // Watch for when elements appear and reapply styles
        const observer = new MutationObserver((mutations) => {
            applyForcedStyles();
        });

        // Start observing the container for changes
        const elementsContainer = document.getElementById('elements-container');
        if (elementsContainer) {
            observer.observe(elementsContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });

            // Disconnect observer after 5 seconds
            setTimeout(() => observer.disconnect(), 5000);
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