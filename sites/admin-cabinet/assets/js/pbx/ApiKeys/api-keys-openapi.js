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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzZXR1cFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJ3aW5kb3ciLCJzdG9wbGlnaHRTZWN1cml0eVNjaGVtZVByb3ZpZGVyIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJjb25zb2xlIiwibG9nIiwicmVtb3ZlQ2xhc3MiLCJwYXJlbnQiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiRXJyb3IiLCJhcGlFbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiY29udGFpbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJpbm5lckhUTUwiLCJhcHBlbmRDaGlsZCIsImFwaURlc2NyaXB0aW9uRG9jdW1lbnQiLCJhZGRDdXN0b21TdHlsZXMiLCJlcnJvciIsInN0YXR1c1RleHQiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBSk07O0FBTW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsMENBVFU7O0FBV25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQWRFOztBQWdCbkI7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLFVBbkJtQix3QkFtQk47QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBTCxJQUFBQSxjQUFjLENBQUNNLDJCQUFmO0FBRUFOLElBQUFBLGNBQWMsQ0FBQ08sV0FBZjtBQUNBUCxJQUFBQSxjQUFjLENBQUNRLGtCQUFmO0FBQ0gsR0E1QmtCOztBQThCbkI7QUFDSjtBQUNBO0FBQ0lELEVBQUFBLFdBakNtQix5QkFpQ0w7QUFDVkwsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJPLElBQXZCO0FBQ0FULElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQlMsSUFBMUI7QUFDSCxHQXBDa0I7O0FBc0NuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0F6Q21CLHFCQXlDVEMsT0F6Q1MsRUF5Q0E7QUFDZlYsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJRLElBQXZCO0FBQ0FWLElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQlksSUFBMUIsb0dBRThCQyxlQUFlLENBQUNDLG1CQUFoQixJQUF1QyxrQ0FGckUsd0NBR2FILE9BQU8sSUFBSUUsZUFBZSxDQUFD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dGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQVBJIEtleXMgT3BlbkFQSS9TdG9wbGlnaHQgRWxlbWVudHMgbW9kdWxlXG4gKiBIYW5kbGVzIHRoZSBpbml0aWFsaXphdGlvbiBhbmQgY29uZmlndXJhdGlvbiBvZiBTdG9wbGlnaHQgRWxlbWVudHMgZm9yIEFQSSBkb2N1bWVudGF0aW9uXG4gKi9cbmNvbnN0IEFwaUtleXNPcGVuQVBJID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRjb250YWluZXI6ICQoJyNlbGVtZW50cy1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIFVSTCB0byB0aGUgT3BlbkFQSSBzcGVjaWZpY2F0aW9uXG4gICAgICovXG4gICAgc3BlY1VybDogJy9wYnhjb3JlL2FwaS92My9vcGVuYXBpOmdldFNwZWNpZmljYXRpb24nLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyXG4gICAgICovXG4gICAgJG1haW5Db250YWluZXI6ICQoJyNtYWluLWNvbnRlbnQtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb24gcGFnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCB1cCBTdG9wbGlnaHQgRWxlbWVudHMgc2VjdXJpdHkgc2NoZW1lIHByb3ZpZGVyXG4gICAgICAgIC8vIFdIWTogU3RvcGxpZ2h0IEVsZW1lbnRzIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIGdldCBhdXRoIHRva2VucyBkeW5hbWljYWxseVxuICAgICAgICAvLyBUaGlzIGludGVncmF0ZXMgd2l0aCBUb2tlbk1hbmFnZXIgd2l0aG91dCBzdG9yaW5nIHRva2VucyBpbiBsb2NhbFN0b3JhZ2VcbiAgICAgICAgLy8gU2VjdXJpdHk6IFRva2VucyBzdGF5IGluIG1lbW9yeSBvbmx5LCBubyBsb2NhbFN0b3JhZ2UgcGVyc2lzdGVuY2VcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuc2V0dXBTZWN1cml0eVNjaGVtZVByb3ZpZGVyKCk7XG5cbiAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0xvYWRpbmcoKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZUVsZW1lbnRzKCk7XG4gICAgfSwgXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZygpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5zaG93KCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGVycm9yIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0Vycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkgZG9jdW1lbnRhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yRGVzYyB8fCAnUGxlYXNlIGNoZWNrIHlvdXIgY29ubmVjdGlvbiBhbmQgdHJ5IGFnYWluLid9PC9wPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIG9uY2xpY2s9XCJBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKClcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJyZWZyZXNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1JldHJ5TG9hZCB8fCAnUmV0cnknfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHVwIFN0b3BsaWdodCBFbGVtZW50cyBzZWN1cml0eSBzY2hlbWUgcHJvdmlkZXJcbiAgICAgKlxuICAgICAqIFdIWTogUHJvdmlkZXMgYXV0aGVudGljYXRpb24gdG9rZW5zIGR5bmFtaWNhbGx5IHRvIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAqIHdpdGhvdXQgc3RvcmluZyB0aGVtIGluIGxvY2FsU3RvcmFnZS4gVGhpcyBpbnRlZ3JhdGVzIHdpdGggVG9rZW5NYW5hZ2VyXG4gICAgICogZm9yIGJldHRlciBzZWN1cml0eSAodG9rZW5zIHN0YXkgaW4gbWVtb3J5IG9ubHkpLlxuICAgICAqL1xuICAgIHNldHVwU2VjdXJpdHlTY2hlbWVQcm92aWRlcigpIHtcbiAgICAgICAgd2luZG93LnN0b3BsaWdodFNlY3VyaXR5U2NoZW1lUHJvdmlkZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBUb2tlbk1hbmFnZXIgaXMgYXZhaWxhYmxlIGFuZCBoYXMgYW4gYWNjZXNzIHRva2VuXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIHNlY3VyaXR5IHNjaGVtZSB2YWx1ZXMgZm9yIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAgICAgICAgICAgIC8vIFRoZSBrZXkgJ2JlYXJlckF1dGgnIG1hdGNoZXMgdGhlIHNlY3VyaXR5IHNjaGVtZSBuYW1lIGluIE9wZW5BUEkgc3BlY1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICdiZWFyZXJBdXRoJzogVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm8gdG9rZW4gYXZhaWxhYmxlIC0gcmV0dXJuIG51bGwgdG8gZmFsbGJhY2sgdG8gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIHNlY3VyaXR5IHNjaGVtZSBwcm92aWRlciBjb25maWd1cmVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZUVsZW1lbnRzKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG4gICAgICAgICQoJy50b2MnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhcnRpY2xlJyk7XG4gICAgICAgICQoJyNwYWdlLWhlYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdiYXNpYycpO1xuXG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAgIC8vIEZldGNoIE9wZW5BUEkgc3BlY2lmaWNhdGlvbiB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHVzZSAkLmFqYXggaW5zdGVhZCBvZiBmZXRjaCB0byBnZXQgSldUIHRva2VuIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IEFwaUtleXNPcGVuQVBJLnNwZWNVcmwsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgdHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBPcGVuQVBJIHNwZWNpZmljYXRpb24gcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGltbWVkaWF0ZWx5IGFzIEVsZW1lbnRzIHdpbGwgc2hvdyBpdHMgb3duIGxvYWRlclxuICAgICAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLnNob3coKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBFbGVtZW50cyBBUEkgY29tcG9uZW50XG4gICAgICAgICAgICBjb25zdCBhcGlFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZWxlbWVudHMtYXBpJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIC0gcGFzcyBKU09OIGRpcmVjdGx5IGluc3RlYWQgb2YgVVJMIHRvIGF2b2lkIGF1dGggaXNzdWVzXG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgncm91dGVyJywgJ2hhc2gnKTtcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdsYXlvdXQnLCAnc2lkZWJhcicpO1xuICAgICAgICAgICAgLy8gTm90ZTogRG9uJ3Qgc2V0IGhpZGVJbnRlcm5hbCBvciBoaWRlVHJ5SXQgLSB0aGV5IGRlZmF1bHQgdG8gZmFsc2UgKHNob3duKVxuICAgICAgICAgICAgLy8gQm9vbGVhbiBhdHRyaWJ1dGVzOiBwcmVzZW5jZSA9IHRydWUsIGFic2VuY2UgPSBmYWxzZVxuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RyeUl0Q3JlZGVudGlhbHNQb2xpY3knLCAnaW5jbHVkZScpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBjb250YWluZXIgYW5kIGFwcGVuZCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYXBpRWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgc3BlY2lmaWNhdGlvbiBkb2N1bWVudCAobXVzdCBiZSBkb25lIGFmdGVyIGFwcGVuZENoaWxkKVxuICAgICAgICAgICAgYXBpRWxlbWVudC5hcGlEZXNjcmlwdGlvbkRvY3VtZW50ID0gcmVzcG9uc2U7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgc3R5bGVzIHRvIHJlbW92ZSBtYXgtd2lkdGggcmVzdHJpY3Rpb25cbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLmFkZEN1c3RvbVN0eWxlcygpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBTdG9wbGlnaHQgRWxlbWVudHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0Vycm9yKGVycm9yLm1lc3NhZ2UgfHwgZXJyb3Iuc3RhdHVzVGV4dCB8fCAnVW5rbm93biBlcnJvcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjdXN0b20gQ1NTIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0IHN0eWxlc1xuICAgICAqIFVzZXMgTXV0YXRpb25PYnNlcnZlciBhbmQgZGVsYXllZCBmb3JjZWQgc3R5bGluZyB0byBlbnN1cmUgc3R5bGVzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgYWRkQ3VzdG9tU3R5bGVzKCkge1xuICAgICAgICAvLyBBZGQgc3R5bGUgdGFnIGltbWVkaWF0ZWx5XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUuaWQgPSAnc3RvcGxpZ2h0LWN1c3RvbS1zdHlsZXMnO1xuICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAgICAgICAgIC8qIFJlbW92ZSBjb250YWluZXIgbWF4LXdpZHRoIHRvIGFsbG93IGZ1bGwtd2lkdGggbGF5b3V0ICovXG4gICAgICAgICAgICAuc2wtcHktMTYge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgbWF4LXdpZHRoIGZvciBleGFtcGxlIGNvbHVtbiAqL1xuICAgICAgICAgICAgW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXSB7XG4gICAgICAgICAgICAgICAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBBZGp1c3QgbGVmdCBjb2x1bW4gd2lkdGggYWNjb3JkaW5nbHkgKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICBgO1xuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgICAgICAvLyBGb3JjZSBhcHBseSBpbmxpbmUgc3R5bGVzIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0c1xuICAgICAgICBjb25zdCBhcHBseUZvcmNlZFN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0Q29sdW1uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXScpO1xuICAgICAgICAgICAgY29uc3QgbGVmdENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXScpO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNsLXB5LTE2W3N0eWxlKj1cIm1heC13aWR0aFwiXScpO1xuXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJpZ2h0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUubWF4V2lkdGggPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxlZnRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICBsZWZ0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgc3R5bGVzIGFmdGVyIEVsZW1lbnRzIGxvYWRzIChtdWx0aXBsZSBhdHRlbXB0cyB0byBlbnN1cmUgdGhleSBzdGljaylcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgNTAwKTtcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgMTAwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDIwMDApO1xuXG4gICAgICAgIC8vIFdhdGNoIGZvciB3aGVuIGVsZW1lbnRzIGFwcGVhciBhbmQgcmVhcHBseSBzdHlsZXNcbiAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgICAgICAgICBhcHBseUZvcmNlZFN0eWxlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCBvYnNlcnZpbmcgdGhlIGNvbnRhaW5lciBmb3IgY2hhbmdlc1xuICAgICAgICBjb25zdCBlbGVtZW50c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgaWYgKGVsZW1lbnRzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGVsZW1lbnRzQ29udGFpbmVyLCB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVGaWx0ZXI6IFsnc3R5bGUnXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3Qgb2JzZXJ2ZXIgYWZ0ZXIgNSBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ic2VydmVyLmRpc2Nvbm5lY3QoKSwgNTAwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb25cbiAgICAgKi9cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==