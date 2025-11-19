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
  initialize: function initialize() {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzZXR1cFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJ3aW5kb3ciLCJzdG9wbGlnaHRTZWN1cml0eVNjaGVtZVByb3ZpZGVyIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJjb25zb2xlIiwibG9nIiwicmVtb3ZlQ2xhc3MiLCJwYXJlbnQiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiRXJyb3IiLCJjdXJyZW50VXJsIiwibG9jYXRpb24iLCJvcmlnaW4iLCJzZXJ2ZXJzIiwiaGFzQ3VycmVudFVybCIsInNvbWUiLCJzZXJ2ZXIiLCJ1bnNoaWZ0IiwiZGVzY3JpcHRpb24iLCJhcGlFbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiY29udGFpbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJpbm5lckhUTUwiLCJhcHBlbmRDaGlsZCIsImFwaURlc2NyaXB0aW9uRG9jdW1lbnQiLCJhZGRDdXN0b21TdHlsZXMiLCJlcnJvciIsInN0YXR1c1RleHQiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBSk07O0FBTW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsMENBVFU7O0FBV25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQWRFOztBQWdCbkI7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLFVBbkJtQix3QkFtQk47QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBTCxJQUFBQSxjQUFjLENBQUNNLDJCQUFmO0FBRUFOLElBQUFBLGNBQWMsQ0FBQ08sV0FBZjtBQUNBUCxJQUFBQSxjQUFjLENBQUNRLGtCQUFmO0FBQ0gsR0E1QmtCOztBQThCbkI7QUFDSjtBQUNBO0FBQ0lELEVBQUFBLFdBakNtQix5QkFpQ0w7QUFDVkwsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJPLElBQXZCO0FBQ0FULElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQlMsSUFBMUI7QUFDSCxHQXBDa0I7O0FBc0NuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0F6Q21CLHFCQXlDVEMsT0F6Q1MsRUF5Q0E7QUFDZlYsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJRLElBQXZCO0FBQ0FWLElB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Qjs7QUFDQSxRQUFJcUIsaUJBQUosRUFBdUI7QUFDbkJILE1BQUFBLFFBQVEsQ0FBQ0ksT0FBVCxDQUFpQkQsaUJBQWpCLEVBQW9DO0FBQ2hDRSxRQUFBQSxTQUFTLEVBQUUsSUFEcUI7QUFFaENDLFFBQUFBLE9BQU8sRUFBRSxJQUZ1QjtBQUdoQ0MsUUFBQUEsVUFBVSxFQUFFLElBSG9CO0FBSWhDQyxRQUFBQSxlQUFlLEVBQUUsQ0FBQyxPQUFEO0FBSmUsT0FBcEMsRUFEbUIsQ0FRbkI7O0FBQ0FULE1BQUFBLFVBQVUsQ0FBQztBQUFBLGVBQU1DLFFBQVEsQ0FBQ1MsVUFBVCxFQUFOO0FBQUEsT0FBRCxFQUE4QixJQUE5QixDQUFWO0FBQ0g7QUFDSixHQXZPa0I7O0FBeU9uQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsTUE1T21CLG9CQTRPVjtBQUNMM0UsSUFBQUEsY0FBYyxDQUFDSyxVQUFmO0FBQ0g7QUE5T2tCLENBQXZCO0FBaVBBO0FBQ0E7QUFDQTs7QUFDQUgsQ0FBQyxDQUFDeUMsUUFBRCxDQUFELENBQVlpQyxLQUFaLENBQWtCLFlBQU07QUFDcEI1RSxFQUFBQSxjQUFjLENBQUNLLFVBQWY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIEFQSSBLZXlzIE9wZW5BUEkvU3RvcGxpZ2h0IEVsZW1lbnRzIG1vZHVsZVxuICogSGFuZGxlcyB0aGUgaW5pdGlhbGl6YXRpb24gYW5kIGNvbmZpZ3VyYXRpb24gb2YgU3RvcGxpZ2h0IEVsZW1lbnRzIGZvciBBUEkgZG9jdW1lbnRhdGlvblxuICovXG5jb25zdCBBcGlLZXlzT3BlbkFQSSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWFpbiBjb250YWluZXJcbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiAkKCcjZWxlbWVudHMtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBVUkwgdG8gdGhlIE9wZW5BUEkgc3BlY2lmaWNhdGlvblxuICAgICAqL1xuICAgIHNwZWNVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvb3BlbmFwaTpnZXRTcGVjaWZpY2F0aW9uJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgT3BlbkFQSSBkb2N1bWVudGF0aW9uIHBhZ2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgdXAgU3RvcGxpZ2h0IEVsZW1lbnRzIHNlY3VyaXR5IHNjaGVtZSBwcm92aWRlclxuICAgICAgICAvLyBXSFk6IFN0b3BsaWdodCBFbGVtZW50cyB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBnZXQgYXV0aCB0b2tlbnMgZHluYW1pY2FsbHlcbiAgICAgICAgLy8gVGhpcyBpbnRlZ3JhdGVzIHdpdGggVG9rZW5NYW5hZ2VyIHdpdGhvdXQgc3RvcmluZyB0b2tlbnMgaW4gbG9jYWxTdG9yYWdlXG4gICAgICAgIC8vIFNlY3VyaXR5OiBUb2tlbnMgc3RheSBpbiBtZW1vcnkgb25seSwgbm8gbG9jYWxTdG9yYWdlIHBlcnNpc3RlbmNlXG4gICAgICAgIEFwaUtleXNPcGVuQVBJLnNldHVwU2VjdXJpdHlTY2hlbWVQcm92aWRlcigpO1xuXG4gICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dMb2FkaW5nKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemVFbGVtZW50cygpO1xuICAgIH0sIFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmcoKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuc2hvdygpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBlcnJvciBzdGF0ZVxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGRvY3VtZW50YXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MgfHwgJ1BsZWFzZSBjaGVjayB5b3VyIGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2Fpbi4nfTwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBvbmNsaWNrPVwiQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicmVmcmVzaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19SZXRyeUxvYWQgfHwgJ1JldHJ5J31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKS5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCB1cCBTdG9wbGlnaHQgRWxlbWVudHMgc2VjdXJpdHkgc2NoZW1lIHByb3ZpZGVyXG4gICAgICpcbiAgICAgKiBXSFk6IFByb3ZpZGVzIGF1dGhlbnRpY2F0aW9uIHRva2VucyBkeW5hbWljYWxseSB0byBTdG9wbGlnaHQgRWxlbWVudHNcbiAgICAgKiB3aXRob3V0IHN0b3JpbmcgdGhlbSBpbiBsb2NhbFN0b3JhZ2UuIFRoaXMgaW50ZWdyYXRlcyB3aXRoIFRva2VuTWFuYWdlclxuICAgICAqIGZvciBiZXR0ZXIgc2VjdXJpdHkgKHRva2VucyBzdGF5IGluIG1lbW9yeSBvbmx5KS5cbiAgICAgKi9cbiAgICBzZXR1cFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIoKSB7XG4gICAgICAgIHdpbmRvdy5zdG9wbGlnaHRTZWN1cml0eVNjaGVtZVByb3ZpZGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgVG9rZW5NYW5hZ2VyIGlzIGF2YWlsYWJsZSBhbmQgaGFzIGFuIGFjY2VzcyB0b2tlblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiBzZWN1cml0eSBzY2hlbWUgdmFsdWVzIGZvciBTdG9wbGlnaHQgRWxlbWVudHNcbiAgICAgICAgICAgICAgICAvLyBUaGUga2V5ICdiZWFyZXJBdXRoJyBtYXRjaGVzIHRoZSBzZWN1cml0eSBzY2hlbWUgbmFtZSBpbiBPcGVuQVBJIHNwZWNcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vIHRva2VuIGF2YWlsYWJsZSAtIHJldHVybiBudWxsIHRvIGZhbGxiYWNrIHRvIGxvY2FsU3RvcmFnZVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1N0b3BsaWdodCBFbGVtZW50cyBzZWN1cml0eSBzY2hlbWUgcHJvdmlkZXIgY29uZmlndXJlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAqL1xuICAgIGFzeW5jIGluaXRpYWxpemVFbGVtZW50cygpIHtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJG1haW5Db250YWluZXIucmVtb3ZlQ2xhc3MoJ2NvbnRhaW5lcicpO1xuICAgICAgICAkKCcudG9jJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYXJ0aWNsZScpO1xuICAgICAgICAkKCcjcGFnZS1oZWFkZXInKS5oaWRlKCk7XG4gICAgICAgICQoJyNjb250ZW50LWZyYW1lJykucmVtb3ZlQ2xhc3MoJ2dyZXknKS5hZGRDbGFzcygnYmFzaWMnKTtcblxuICAgICAgICB0cnkge1xuXG4gICAgICAgICAgICAvLyBGZXRjaCBPcGVuQVBJIHNwZWNpZmljYXRpb24gd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byB1c2UgJC5hamF4IGluc3RlYWQgb2YgZmV0Y2ggdG8gZ2V0IEpXVCB0b2tlbiBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBBcGlLZXlzT3BlbkFQSS5zcGVjVXJsLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgT3BlbkFQSSBzcGVjaWZpY2F0aW9uIHJlY2VpdmVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdIWTogQWRkIGN1cnJlbnQgYnJvd3NlciBVUkwgYXMgZmlyc3Qgc2VydmVyIG9wdGlvblxuICAgICAgICAgICAgLy8gVGhpcyBlbnN1cmVzIFwiVHJ5IGl0XCIgd29ya3Mgd2l0aG91dCBDT1JTL2NlcnRpZmljYXRlIGlzc3Vlc1xuICAgICAgICAgICAgLy8gV29ya3Mgd2l0aCBhbnkgYWRkcmVzczogSVAsIGhvc3RuYW1lLCBsb2NhbGhvc3RcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuXG4gICAgICAgICAgICAvLyBFbnN1cmUgc2VydmVycyBhcnJheSBleGlzdHNcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uuc2VydmVycykge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnNlcnZlcnMgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY3VycmVudCBVUkwgYWxyZWFkeSBpbiBzZXJ2ZXJzIGxpc3RcbiAgICAgICAgICAgIGNvbnN0IGhhc0N1cnJlbnRVcmwgPSByZXNwb25zZS5zZXJ2ZXJzLnNvbWUoc2VydmVyID0+IHNlcnZlci51cmwgPT09IGN1cnJlbnRVcmwpO1xuXG4gICAgICAgICAgICAvLyBBZGQgY3VycmVudCBVUkwgYXMgZmlyc3Qgc2VydmVyIGlmIG5vdCBwcmVzZW50XG4gICAgICAgICAgICBpZiAoIWhhc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zZXJ2ZXJzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGN1cnJlbnRVcmwsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudCBzZXJ2ZXIgKGF1dG8tZGV0ZWN0ZWQgZnJvbSBicm93c2VyIFVSTCknXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhpZGUgbG9hZGluZyBpbW1lZGlhdGVseSBhcyBFbGVtZW50cyB3aWxsIHNob3cgaXRzIG93biBsb2FkZXJcbiAgICAgICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgRWxlbWVudHMgQVBJIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgYXBpRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2VsZW1lbnRzLWFwaScpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYXR0cmlidXRlcyAtIHBhc3MgSlNPTiBkaXJlY3RseSBpbnN0ZWFkIG9mIFVSTCB0byBhdm9pZCBhdXRoIGlzc3Vlc1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3JvdXRlcicsICdoYXNoJyk7XG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgnbGF5b3V0JywgJ3NpZGViYXInKTtcbiAgICAgICAgICAgIC8vIE5vdGU6IERvbid0IHNldCBoaWRlSW50ZXJuYWwgb3IgaGlkZVRyeUl0IC0gdGhleSBkZWZhdWx0IHRvIGZhbHNlIChzaG93bilcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gYXR0cmlidXRlczogcHJlc2VuY2UgPSB0cnVlLCBhYnNlbmNlID0gZmFsc2VcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCd0cnlJdENyZWRlbnRpYWxzUG9saWN5JywgJ2luY2x1ZGUnKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyIGFuZCBhcHBlbmQgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VsZW1lbnRzLWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGFwaUVsZW1lbnQpO1xuXG4gICAgICAgICAgICAvLyBTZXQgdGhlIHNwZWNpZmljYXRpb24gZG9jdW1lbnQgKG11c3QgYmUgZG9uZSBhZnRlciBhcHBlbmRDaGlsZClcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuYXBpRGVzY3JpcHRpb25Eb2N1bWVudCA9IHJlc3BvbnNlO1xuXG4gICAgICAgICAgICAvLyBPdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgaW5saW5lIHN0eWxlcyB0byByZW1vdmUgbWF4LXdpZHRoIHJlc3RyaWN0aW9uXG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS5hZGRDdXN0b21TdHlsZXMoKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1N0b3BsaWdodCBFbGVtZW50cyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dFcnJvcihlcnJvci5tZXNzYWdlIHx8IGVycm9yLnN0YXR1c1RleHQgfHwgJ1Vua25vd24gZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgY3VzdG9tIENTUyB0byBvdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgZGVmYXVsdCBzdHlsZXNcbiAgICAgKiBVc2VzIE11dGF0aW9uT2JzZXJ2ZXIgYW5kIGRlbGF5ZWQgZm9yY2VkIHN0eWxpbmcgdG8gZW5zdXJlIHN0eWxlcyBhcmUgYXBwbGllZFxuICAgICAqL1xuICAgIGFkZEN1c3RvbVN0eWxlcygpIHtcbiAgICAgICAgLy8gQWRkIHN0eWxlIHRhZyBpbW1lZGlhdGVseVxuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgIHN0eWxlLmlkID0gJ3N0b3BsaWdodC1jdXN0b20tc3R5bGVzJztcbiAgICAgICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAgICAgICAvKiBSZW1vdmUgY29udGFpbmVyIG1heC13aWR0aCB0byBhbGxvdyBmdWxsLXdpZHRoIGxheW91dCAqL1xuICAgICAgICAgICAgLnNsLXB5LTE2IHtcbiAgICAgICAgICAgICAgICBtYXgtd2lkdGg6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBPdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgaW5saW5lIG1heC13aWR0aCBmb3IgZXhhbXBsZSBjb2x1bW4gKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tcmlnaHRcIl0ge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiA1MCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyogQWRqdXN0IGxlZnQgY29sdW1uIHdpZHRoIGFjY29yZGluZ2x5ICovXG4gICAgICAgICAgICBbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLWxlZnRcIl0ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiA1MCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgYDtcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICAgICAgLy8gRm9yY2UgYXBwbHkgaW5saW5lIHN0eWxlcyB0byBvdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgZGVmYXVsdHNcbiAgICAgICAgY29uc3QgYXBwbHlGb3JjZWRTdHlsZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByaWdodENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tcmlnaHRcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGxlZnRDb2x1bW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLWxlZnRcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zbC1weS0xNltzdHlsZSo9XCJtYXgtd2lkdGhcIl0nKTtcblxuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5tYXhXaWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyaWdodENvbHVtbikge1xuICAgICAgICAgICAgICAgIHJpZ2h0Q29sdW1uLnN0eWxlLm1heFdpZHRoID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIHJpZ2h0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsZWZ0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgbGVmdENvbHVtbi5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFwcGx5IHN0eWxlcyBhZnRlciBFbGVtZW50cyBsb2FkcyAobXVsdGlwbGUgYXR0ZW1wdHMgdG8gZW5zdXJlIHRoZXkgc3RpY2spXG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDUwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDEwMDApO1xuICAgICAgICBzZXRUaW1lb3V0KGFwcGx5Rm9yY2VkU3R5bGVzLCAyMDAwKTtcblxuICAgICAgICAvLyBXYXRjaCBmb3Igd2hlbiBlbGVtZW50cyBhcHBlYXIgYW5kIHJlYXBwbHkgc3R5bGVzXG4gICAgICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xuICAgICAgICAgICAgYXBwbHlGb3JjZWRTdHlsZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgb2JzZXJ2aW5nIHRoZSBjb250YWluZXIgZm9yIGNoYW5nZXNcbiAgICAgICAgY29uc3QgZWxlbWVudHNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgIGlmIChlbGVtZW50c0NvbnRhaW5lcikge1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShlbGVtZW50c0NvbnRhaW5lciwge1xuICAgICAgICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlRmlsdGVyOiBbJ3N0eWxlJ11cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBEaXNjb25uZWN0IG9ic2VydmVyIGFmdGVyIDUgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBvYnNlcnZlci5kaXNjb25uZWN0KCksIDUwMDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbG9hZCB0aGUgT3BlbkFQSSBkb2N1bWVudGF0aW9uXG4gICAgICovXG4gICAgcmVsb2FkKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKCk7XG59KTsiXX0=