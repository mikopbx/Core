"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var ApiKeysOpenAPI = {
  /**
   * jQuery object for the main container.
   * Resolved in initialize() — must not call $() at module-load time.
   */
  $container: null,

  /**
   * URL to the OpenAPI specification
   */
  specUrl: '/pbxcore/api/v3/openapi:getSpecification',

  /**
   * jQuery object for the main container
   */
  $mainContainer: null,

  /**
   * Initialize the OpenAPI documentation page
   */
  initialize: function initialize() {
    ApiKeysOpenAPI.$container = $('#elements-container');
    ApiKeysOpenAPI.$mainContainer = $('#main-content-container'); // Set up Stoplight Elements security scheme provider
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
  showLoading: function showLoading() {
    $('#elements-loading').show();
    ApiKeysOpenAPI.$container.hide();
  },

  /**
   * Show error state
   */
  showError: function showError(message) {
    $('#elements-loading').hide();
    ApiKeysOpenAPI.$container.html("\n            <div class=\"ui negative message\">\n                <div class=\"header\">".concat(globalTranslate.ak_SwaggerLoadError || 'Failed to load API documentation', "</div>\n                <p>").concat(message || globalTranslate.ak_SwaggerLoadErrorDesc || 'Please check your connection and try again.', "</p>\n                <div class=\"ui blue button\" onclick=\"ApiKeysOpenAPI.initialize()\">\n                    <i class=\"refresh icon\"></i>\n                    ").concat(globalTranslate.ak_RetryLoad || 'Retry', "\n                </div>\n            </div>\n        ")).show();
  },

  /**
   * Set up Stoplight Elements security scheme provider
   *
   * WHY: Provides authentication tokens dynamically to Stoplight Elements
   * without storing them in localStorage. This integrates with TokenManager
   * for better security (tokens stay in memory only).
   */
  setupSecuritySchemeProvider: function setupSecuritySchemeProvider() {
    window.stoplightSecuritySchemeProvider = function () {
      // Check if TokenManager is available and has an access token
      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        // Return security scheme values for Stoplight Elements
        // The key 'bearerAuth' matches the security scheme name in OpenAPI spec
        return {
          'bearerAuth': TokenManager.accessToken
        };
      } // No token available - return null to fallback to localStorage


      return null;
    };

    console.log('Stoplight Elements security scheme provider configured');
  },

  /**
   * Initialize Stoplight Elements
   */
  initializeElements: async function initializeElements() {
    ApiKeysOpenAPI.$mainContainer.removeClass('container');
    $('.toc').hide();
    ApiKeysOpenAPI.$mainContainer.parent().removeClass('article');
    $('#page-header').hide();
    $('#content-frame').removeClass('grey').addClass('basic');

    try {
      // Fetch OpenAPI specification with authentication
      // We need to use $.ajax instead of fetch to get JWT token automatically
      var response = await $.ajax({
        url: ApiKeysOpenAPI.specUrl,
        method: 'GET',
        dataType: 'json'
      }); // Check if response is valid

      if (!response || _typeof(response) !== 'object') {
        throw new Error('Invalid OpenAPI specification received');
      } // WHY: Add current browser URL as first server option
      // This ensures "Try it" works without CORS/certificate issues
      // Works with any address: IP, hostname, localhost


      var currentUrl = window.location.origin; // Ensure servers array exists

      if (!response.servers) {
        response.servers = [];
      } // Check if current URL already in servers list


      var hasCurrentUrl = response.servers.some(function (server) {
        return server.url === currentUrl;
      }); // Add current URL as first server if not present

      if (!hasCurrentUrl) {
        response.servers.unshift({
          url: currentUrl,
          description: 'Current server (auto-detected from browser URL)'
        });
      } // Hide loading immediately as Elements will show its own loader


      $('#elements-loading').hide();
      ApiKeysOpenAPI.$container.show(); // Create the Elements API component

      var apiElement = document.createElement('elements-api'); // Set attributes - pass JSON directly instead of URL to avoid auth issues

      apiElement.setAttribute('router', 'hash');
      apiElement.setAttribute('layout', 'sidebar'); // Note: Don't set hideInternal or hideTryIt - they default to false (shown)
      // Boolean attributes: presence = true, absence = false

      apiElement.setAttribute('tryItCredentialsPolicy', 'include'); // Clear container and append element

      var container = document.getElementById('elements-container');
      container.innerHTML = '';
      container.appendChild(apiElement); // Set the specification document (must be done after appendChild)

      apiElement.apiDescriptionDocument = response; // Override Stoplight Elements inline styles to remove max-width restriction

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
  addCustomStyles: function addCustomStyles() {
    // Add style tag immediately
    var style = document.createElement('style');
    style.id = 'stoplight-custom-styles';
    style.textContent = "\n            /* Remove container max-width to allow full-width layout */\n            .sl-py-16 {\n                max-width: none !important;\n                width: 100% !important;\n            }\n\n            /* Override Stoplight Elements inline max-width for example column */\n            [data-testid=\"two-column-right\"] {\n                max-width: none !important;\n                width: 50% !important;\n            }\n\n            /* Adjust left column width accordingly */\n            [data-testid=\"two-column-left\"] {\n                width: 50% !important;\n            }\n        ";
    document.head.appendChild(style); // Force apply inline styles to override Stoplight Elements defaults

    var applyForcedStyles = function applyForcedStyles() {
      var rightColumn = document.querySelector('[data-testid="two-column-right"]');
      var leftColumn = document.querySelector('[data-testid="two-column-left"]');
      var container = document.querySelector('.sl-py-16[style*="max-width"]');

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
    }; // Apply styles after Elements loads (multiple attempts to ensure they stick)


    setTimeout(applyForcedStyles, 500);
    setTimeout(applyForcedStyles, 1000);
    setTimeout(applyForcedStyles, 2000); // Watch for when elements appear and reapply styles

    var observer = new MutationObserver(function (mutations) {
      applyForcedStyles();
    }); // Start observing the container for changes

    var elementsContainer = document.getElementById('elements-container');

    if (elementsContainer) {
      observer.observe(elementsContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      }); // Disconnect observer after 5 seconds

      setTimeout(function () {
        return observer.disconnect();
      }, 5000);
    }
  },

  /**
   * Reload the OpenAPI documentation
   */
  reload: function reload() {
    ApiKeysOpenAPI.initialize();
  }
};
/**
 * Initialize when DOM is ready
 */

$(document).ready(function () {
  ApiKeysOpenAPI.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwic3BlY1VybCIsIiRtYWluQ29udGFpbmVyIiwiaW5pdGlhbGl6ZSIsIiQiLCJzZXR1cFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJ3aW5kb3ciLCJzdG9wbGlnaHRTZWN1cml0eVNjaGVtZVByb3ZpZGVyIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJjb25zb2xlIiwibG9nIiwicmVtb3ZlQ2xhc3MiLCJwYXJlbnQiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiRXJyb3IiLCJjdXJyZW50VXJsIiwibG9jYXRpb24iLCJvcmlnaW4iLCJzZXJ2ZXJzIiwiaGFzQ3VycmVudFVybCIsInNvbWUiLCJzZXJ2ZXIiLCJ1bnNoaWZ0IiwiZGVzY3JpcHRpb24iLCJhcGlFbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiY29udGFpbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJpbm5lckhUTUwiLCJhcHBlbmRDaGlsZCIsImFwaURlc2NyaXB0aW9uRG9jdW1lbnQiLCJhZGRDdXN0b21TdHlsZXMiLCJlcnJvciIsInN0YXR1c1RleHQiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBTE87O0FBT25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsMENBVlU7O0FBWW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUFmRzs7QUFpQm5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXBCbUIsd0JBb0JOO0FBQ1RKLElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixHQUE0QkksQ0FBQyxDQUFDLHFCQUFELENBQTdCO0FBQ0FMLElBQUFBLGNBQWMsQ0FBQ0csY0FBZixHQUFnQ0UsQ0FBQyxDQUFDLHlCQUFELENBQWpDLENBRlMsQ0FJVDtBQUNBO0FBQ0E7QUFDQTs7QUFDQUwsSUFBQUEsY0FBYyxDQUFDTSwyQkFBZjtBQUVBTixJQUFBQSxjQUFjLENBQUNPLFdBQWY7QUFDQVAsSUFBQUEsY0FBYyxDQUFDUSxrQkFBZjtBQUNILEdBaENrQjs7QUFrQ25CO0FBQ0o7QUFDQTtBQUNJRCxFQUFBQSxXQXJDbUIseUJBcUNMO0FBQ1ZGLElBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCSSxJQUF2QjtBQUNBVCxJQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEJTLElBQTFCO0FBQ0gsR0F4Q2tCOztBQTBDbkI7QUFDSjtBQUNBO0FB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QjtBQUNwQixLQUZnQixDQUFqQixDQW5EYyxDQXVEZDs7QUFDQSxRQUFNVSxpQkFBaUIsR0FBR3pCLFFBQVEsQ0FBQ0ksY0FBVCxDQUF3QixvQkFBeEIsQ0FBMUI7O0FBQ0EsUUFBSXFCLGlCQUFKLEVBQXVCO0FBQ25CSCxNQUFBQSxRQUFRLENBQUNJLE9BQVQsQ0FBaUJELGlCQUFqQixFQUFvQztBQUNoQ0UsUUFBQUEsU0FBUyxFQUFFLElBRHFCO0FBRWhDQyxRQUFBQSxPQUFPLEVBQUUsSUFGdUI7QUFHaENDLFFBQUFBLFVBQVUsRUFBRSxJQUhvQjtBQUloQ0MsUUFBQUEsZUFBZSxFQUFFLENBQUMsT0FBRDtBQUplLE9BQXBDLEVBRG1CLENBUW5COztBQUNBVCxNQUFBQSxVQUFVLENBQUM7QUFBQSxlQUFNQyxRQUFRLENBQUNTLFVBQVQsRUFBTjtBQUFBLE9BQUQsRUFBOEIsSUFBOUIsQ0FBVjtBQUNIO0FBQ0osR0EzT2tCOztBQTZPbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE1BaFBtQixvQkFnUFY7QUFDTDNFLElBQUFBLGNBQWMsQ0FBQ0ksVUFBZjtBQUNIO0FBbFBrQixDQUF2QjtBQXFQQTtBQUNBO0FBQ0E7O0FBQ0FDLENBQUMsQ0FBQ3NDLFFBQUQsQ0FBRCxDQUFZaUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCNUUsRUFBQUEsY0FBYyxDQUFDSSxVQUFmO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBBUEkgS2V5cyBPcGVuQVBJL1N0b3BsaWdodCBFbGVtZW50cyBtb2R1bGVcbiAqIEhhbmRsZXMgdGhlIGluaXRpYWxpemF0aW9uIGFuZCBjb25maWd1cmF0aW9uIG9mIFN0b3BsaWdodCBFbGVtZW50cyBmb3IgQVBJIGRvY3VtZW50YXRpb25cbiAqL1xuY29uc3QgQXBpS2V5c09wZW5BUEkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVVJMIHRvIHRoZSBPcGVuQVBJIHNwZWNpZmljYXRpb25cbiAgICAgKi9cbiAgICBzcGVjVXJsOiAnL3BieGNvcmUvYXBpL3YzL29wZW5hcGk6Z2V0U3BlY2lmaWNhdGlvbicsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWFpbiBjb250YWluZXJcbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIE9wZW5BUEkgZG9jdW1lbnRhdGlvbiBwYWdlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lciA9ICQoJyNlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJG1haW5Db250YWluZXIgPSAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIFNldCB1cCBTdG9wbGlnaHQgRWxlbWVudHMgc2VjdXJpdHkgc2NoZW1lIHByb3ZpZGVyXG4gICAgICAgIC8vIFdIWTogU3RvcGxpZ2h0IEVsZW1lbnRzIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIGdldCBhdXRoIHRva2VucyBkeW5hbWljYWxseVxuICAgICAgICAvLyBUaGlzIGludGVncmF0ZXMgd2l0aCBUb2tlbk1hbmFnZXIgd2l0aG91dCBzdG9yaW5nIHRva2VucyBpbiBsb2NhbFN0b3JhZ2VcbiAgICAgICAgLy8gU2VjdXJpdHk6IFRva2VucyBzdGF5IGluIG1lbW9yeSBvbmx5LCBubyBsb2NhbFN0b3JhZ2UgcGVyc2lzdGVuY2VcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuc2V0dXBTZWN1cml0eVNjaGVtZVByb3ZpZGVyKCk7XG5cbiAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0xvYWRpbmcoKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZUVsZW1lbnRzKCk7XG4gICAgfSwgXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZygpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5zaG93KCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGVycm9yIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0Vycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkgZG9jdW1lbnRhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yRGVzYyB8fCAnUGxlYXNlIGNoZWNrIHlvdXIgY29ubmVjdGlvbiBhbmQgdHJ5IGFnYWluLid9PC9wPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIG9uY2xpY2s9XCJBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKClcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJyZWZyZXNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1JldHJ5TG9hZCB8fCAnUmV0cnknfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHVwIFN0b3BsaWdodCBFbGVtZW50cyBzZWN1cml0eSBzY2hlbWUgcHJvdmlkZXJcbiAgICAgKlxuICAgICAqIFdIWTogUHJvdmlkZXMgYXV0aGVudGljYXRpb24gdG9rZW5zIGR5bmFtaWNhbGx5IHRvIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAqIHdpdGhvdXQgc3RvcmluZyB0aGVtIGluIGxvY2FsU3RvcmFnZS4gVGhpcyBpbnRlZ3JhdGVzIHdpdGggVG9rZW5NYW5hZ2VyXG4gICAgICogZm9yIGJldHRlciBzZWN1cml0eSAodG9rZW5zIHN0YXkgaW4gbWVtb3J5IG9ubHkpLlxuICAgICAqL1xuICAgIHNldHVwU2VjdXJpdHlTY2hlbWVQcm92aWRlcigpIHtcbiAgICAgICAgd2luZG93LnN0b3BsaWdodFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBUb2tlbk1hbmFnZXIgaXMgYXZhaWxhYmxlIGFuZCBoYXMgYW4gYWNjZXNzIHRva2VuXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIHNlY3VyaXR5IHNjaGVtZSB2YWx1ZXMgZm9yIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAgICAgICAgICAgIC8vIFRoZSBrZXkgJ2JlYXJlckF1dGgnIG1hdGNoZXMgdGhlIHNlY3VyaXR5IHNjaGVtZSBuYW1lIGluIE9wZW5BUEkgc3BlY1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICdiZWFyZXJBdXRoJzogVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm8gdG9rZW4gYXZhaWxhYmxlIC0gcmV0dXJuIG51bGwgdG8gZmFsbGJhY2sgdG8gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIHNlY3VyaXR5IHNjaGVtZSBwcm92aWRlciBjb25maWd1cmVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZUVsZW1lbnRzKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG4gICAgICAgICQoJy50b2MnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhcnRpY2xlJyk7XG4gICAgICAgICQoJyNwYWdlLWhlYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdiYXNpYycpO1xuXG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAgIC8vIEZldGNoIE9wZW5BUEkgc3BlY2lmaWNhdGlvbiB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHVzZSAkLmFqYXggaW5zdGVhZCBvZiBmZXRjaCB0byBnZXQgSldUIHRva2VuIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IEFwaUtleXNPcGVuQVBJLnNwZWNVcmwsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgdHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBPcGVuQVBJIHNwZWNpZmljYXRpb24gcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV0hZOiBBZGQgY3VycmVudCBicm93c2VyIFVSTCBhcyBmaXJzdCBzZXJ2ZXIgb3B0aW9uXG4gICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgXCJUcnkgaXRcIiB3b3JrcyB3aXRob3V0IENPUlMvY2VydGlmaWNhdGUgaXNzdWVzXG4gICAgICAgICAgICAvLyBXb3JrcyB3aXRoIGFueSBhZGRyZXNzOiBJUCwgaG9zdG5hbWUsIGxvY2FsaG9zdFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG5cbiAgICAgICAgICAgIC8vIEVuc3VyZSBzZXJ2ZXJzIGFycmF5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5zZXJ2ZXJzKSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc2VydmVycyA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjdXJyZW50IFVSTCBhbHJlYWR5IGluIHNlcnZlcnMgbGlzdFxuICAgICAgICAgICAgY29uc3QgaGFzQ3VycmVudFVybCA9IHJlc3BvbnNlLnNlcnZlcnMuc29tZShzZXJ2ZXIgPT4gc2VydmVyLnVybCA9PT0gY3VycmVudFVybCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBjdXJyZW50IFVSTCBhcyBmaXJzdCBzZXJ2ZXIgaWYgbm90IHByZXNlbnRcbiAgICAgICAgICAgIGlmICghaGFzQ3VycmVudFVybCkge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnNlcnZlcnMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgIHVybDogY3VycmVudFVybCxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXJyZW50IHNlcnZlciAoYXV0by1kZXRlY3RlZCBmcm9tIGJyb3dzZXIgVVJMKSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGltbWVkaWF0ZWx5IGFzIEVsZW1lbnRzIHdpbGwgc2hvdyBpdHMgb3duIGxvYWRlclxuICAgICAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLnNob3coKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBFbGVtZW50cyBBUEkgY29tcG9uZW50XG4gICAgICAgICAgICBjb25zdCBhcGlFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZWxlbWVudHMtYXBpJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIC0gcGFzcyBKU09OIGRpcmVjdGx5IGluc3RlYWQgb2YgVVJMIHRvIGF2b2lkIGF1dGggaXNzdWVzXG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgncm91dGVyJywgJ2hhc2gnKTtcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdsYXlvdXQnLCAnc2lkZWJhcicpO1xuICAgICAgICAgICAgLy8gTm90ZTogRG9uJ3Qgc2V0IGhpZGVJbnRlcm5hbCBvciBoaWRlVHJ5SXQgLSB0aGV5IGRlZmF1bHQgdG8gZmFsc2UgKHNob3duKVxuICAgICAgICAgICAgLy8gQm9vbGVhbiBhdHRyaWJ1dGVzOiBwcmVzZW5jZSA9IHRydWUsIGFic2VuY2UgPSBmYWxzZVxuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RyeUl0Q3JlZGVudGlhbHNQb2xpY3knLCAnaW5jbHVkZScpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBjb250YWluZXIgYW5kIGFwcGVuZCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYXBpRWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgc3BlY2lmaWNhdGlvbiBkb2N1bWVudCAobXVzdCBiZSBkb25lIGFmdGVyIGFwcGVuZENoaWxkKVxuICAgICAgICAgICAgYXBpRWxlbWVudC5hcGlEZXNjcmlwdGlvbkRvY3VtZW50ID0gcmVzcG9uc2U7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgc3R5bGVzIHRvIHJlbW92ZSBtYXgtd2lkdGggcmVzdHJpY3Rpb25cbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLmFkZEN1c3RvbVN0eWxlcygpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBTdG9wbGlnaHQgRWxlbWVudHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0Vycm9yKGVycm9yLm1lc3NhZ2UgfHwgZXJyb3Iuc3RhdHVzVGV4dCB8fCAnVW5rbm93biBlcnJvcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjdXN0b20gQ1NTIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0IHN0eWxlc1xuICAgICAqIFVzZXMgTXV0YXRpb25PYnNlcnZlciBhbmQgZGVsYXllZCBmb3JjZWQgc3R5bGluZyB0byBlbnN1cmUgc3R5bGVzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgYWRkQ3VzdG9tU3R5bGVzKCkge1xuICAgICAgICAvLyBBZGQgc3R5bGUgdGFnIGltbWVkaWF0ZWx5XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUuaWQgPSAnc3RvcGxpZ2h0LWN1c3RvbS1zdHlsZXMnO1xuICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAgICAgICAgIC8qIFJlbW92ZSBjb250YWluZXIgbWF4LXdpZHRoIHRvIGFsbG93IGZ1bGwtd2lkdGggbGF5b3V0ICovXG4gICAgICAgICAgICAuc2wtcHktMTYge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgbWF4LXdpZHRoIGZvciBleGFtcGxlIGNvbHVtbiAqL1xuICAgICAgICAgICAgW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXSB7XG4gICAgICAgICAgICAgICAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBBZGp1c3QgbGVmdCBjb2x1bW4gd2lkdGggYWNjb3JkaW5nbHkgKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICBgO1xuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgICAgICAvLyBGb3JjZSBhcHBseSBpbmxpbmUgc3R5bGVzIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0c1xuICAgICAgICBjb25zdCBhcHBseUZvcmNlZFN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0Q29sdW1uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXScpO1xuICAgICAgICAgICAgY29uc3QgbGVmdENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXScpO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNsLXB5LTE2W3N0eWxlKj1cIm1heC13aWR0aFwiXScpO1xuXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJpZ2h0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUubWF4V2lkdGggPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxlZnRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICBsZWZ0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgc3R5bGVzIGFmdGVyIEVsZW1lbnRzIGxvYWRzIChtdWx0aXBsZSBhdHRlbXB0cyB0byBlbnN1cmUgdGhleSBzdGljaylcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgNTAwKTtcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgMTAwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDIwMDApO1xuXG4gICAgICAgIC8vIFdhdGNoIGZvciB3aGVuIGVsZW1lbnRzIGFwcGVhciBhbmQgcmVhcHBseSBzdHlsZXNcbiAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgICAgICAgICBhcHBseUZvcmNlZFN0eWxlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCBvYnNlcnZpbmcgdGhlIGNvbnRhaW5lciBmb3IgY2hhbmdlc1xuICAgICAgICBjb25zdCBlbGVtZW50c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgaWYgKGVsZW1lbnRzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGVsZW1lbnRzQ29udGFpbmVyLCB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVGaWx0ZXI6IFsnc3R5bGUnXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3Qgb2JzZXJ2ZXIgYWZ0ZXIgNSBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ic2VydmVyLmRpc2Nvbm5lY3QoKSwgNTAwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb25cbiAgICAgKi9cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==