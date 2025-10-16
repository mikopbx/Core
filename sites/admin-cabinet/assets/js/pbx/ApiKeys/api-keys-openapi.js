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
   * Initialize Stoplight Elements
   */
  initializeElements: async function initializeElements() {
    ApiKeysOpenAPI.$mainContainer.removeClass('container');
    $('.toc').hide();
    ApiKeysOpenAPI.$mainContainer.parent().removeClass('article');
    $('#page-header').hide();
    $('#content-frame').removeClass('grey').addClass('basic');

    try {
      // PRE-FILL AUTHENTICATION TOKEN
      // WHY: Stoplight Elements reads security values from localStorage.TryIt_securitySchemeValues
      // This allows "Try It" functionality to work without manual token input
      // See: https://github.com/stoplightio/elements/issues/1400
      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        // OpenAPI spec defines security scheme as 'bearerAuth'
        // Store token in format: { 'bearerAuth': 'token_value' }
        localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
          'bearerAuth': TokenManager.accessToken
        }));
        console.log('Pre-filled Bearer token for Try It functionality');
      } // Fetch OpenAPI specification with authentication
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJyZW1vdmVDbGFzcyIsInBhcmVudCIsImFkZENsYXNzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbnNvbGUiLCJsb2ciLCJyZXNwb25zZSIsImFqYXgiLCJ1cmwiLCJtZXRob2QiLCJkYXRhVHlwZSIsIkVycm9yIiwiYXBpRWxlbWVudCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInNldEF0dHJpYnV0ZSIsImNvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiaW5uZXJIVE1MIiwiYXBwZW5kQ2hpbGQiLCJhcGlEZXNjcmlwdGlvbkRvY3VtZW50IiwiYWRkQ3VzdG9tU3R5bGVzIiwiZXJyb3IiLCJzdGF0dXNUZXh0Iiwic3R5bGUiLCJpZCIsInRleHRDb250ZW50IiwiaGVhZCIsImFwcGx5Rm9yY2VkU3R5bGVzIiwicmlnaHRDb2x1bW4iLCJxdWVyeVNlbGVjdG9yIiwibGVmdENvbHVtbiIsIm1heFdpZHRoIiwid2lkdGgiLCJzZXRUaW1lb3V0Iiwib2JzZXJ2ZXIiLCJNdXRhdGlvbk9ic2VydmVyIiwibXV0YXRpb25zIiwiZWxlbWVudHNDb250YWluZXIiLCJvYnNlcnZlIiwiY2hpbGRMaXN0Iiwic3VidHJlZSIsImF0dHJpYnV0ZXMiLCJhdHRyaWJ1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Q0FBVixDQWhEYyxDQWtEZDs7QUFDQSxRQUFNTyxRQUFRLEdBQUcsSUFBSUMsZ0JBQUosQ0FBcUIsVUFBQ0MsU0FBRCxFQUFlO0FBQ2pEVCxNQUFBQSxpQkFBaUI7QUFDcEIsS0FGZ0IsQ0FBakIsQ0FuRGMsQ0F1RGQ7O0FBQ0EsUUFBTVUsaUJBQWlCLEdBQUd6QixRQUFRLENBQUNJLGNBQVQsQ0FBd0Isb0JBQXhCLENBQTFCOztBQUNBLFFBQUlxQixpQkFBSixFQUF1QjtBQUNuQkgsTUFBQUEsUUFBUSxDQUFDSSxPQUFULENBQWlCRCxpQkFBakIsRUFBb0M7QUFDaENFLFFBQUFBLFNBQVMsRUFBRSxJQURxQjtBQUVoQ0MsUUFBQUEsT0FBTyxFQUFFLElBRnVCO0FBR2hDQyxRQUFBQSxVQUFVLEVBQUUsSUFIb0I7QUFJaENDLFFBQUFBLGVBQWUsRUFBRSxDQUFDLE9BQUQ7QUFKZSxPQUFwQyxFQURtQixDQVFuQjs7QUFDQVQsTUFBQUEsVUFBVSxDQUFDO0FBQUEsZUFBTUMsUUFBUSxDQUFDUyxVQUFULEVBQU47QUFBQSxPQUFELEVBQThCLElBQTlCLENBQVY7QUFDSDtBQUNKLEdBL0xrQjs7QUFpTW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxNQXBNbUIsb0JBb01WO0FBQ0xuRSxJQUFBQSxjQUFjLENBQUNLLFVBQWY7QUFDSDtBQXRNa0IsQ0FBdkI7QUF5TUE7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUNpQyxRQUFELENBQUQsQ0FBWWlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBFLEVBQUFBLGNBQWMsQ0FBQ0ssVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQVBJIEtleXMgT3BlbkFQSS9TdG9wbGlnaHQgRWxlbWVudHMgbW9kdWxlXG4gKiBIYW5kbGVzIHRoZSBpbml0aWFsaXphdGlvbiBhbmQgY29uZmlndXJhdGlvbiBvZiBTdG9wbGlnaHQgRWxlbWVudHMgZm9yIEFQSSBkb2N1bWVudGF0aW9uXG4gKi9cbmNvbnN0IEFwaUtleXNPcGVuQVBJID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRjb250YWluZXI6ICQoJyNlbGVtZW50cy1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIFVSTCB0byB0aGUgT3BlbkFQSSBzcGVjaWZpY2F0aW9uXG4gICAgICovXG4gICAgc3BlY1VybDogJy9wYnhjb3JlL2FwaS92My9vcGVuYXBpOmdldFNwZWNpZmljYXRpb24nLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyXG4gICAgICovXG4gICAgJG1haW5Db250YWluZXI6ICQoJyNtYWluLWNvbnRlbnQtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb24gcGFnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dMb2FkaW5nKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemVFbGVtZW50cygpO1xuICAgIH0sIFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmcoKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuc2hvdygpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBlcnJvciBzdGF0ZVxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGRvY3VtZW50YXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MgfHwgJ1BsZWFzZSBjaGVjayB5b3VyIGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2Fpbi4nfTwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBvbmNsaWNrPVwiQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicmVmcmVzaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19SZXRyeUxvYWQgfHwgJ1JldHJ5J31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKS5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZUVsZW1lbnRzKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG4gICAgICAgICQoJy50b2MnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhcnRpY2xlJyk7XG4gICAgICAgICQoJyNwYWdlLWhlYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdiYXNpYycpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBQUkUtRklMTCBBVVRIRU5USUNBVElPTiBUT0tFTlxuICAgICAgICAgICAgLy8gV0hZOiBTdG9wbGlnaHQgRWxlbWVudHMgcmVhZHMgc2VjdXJpdHkgdmFsdWVzIGZyb20gbG9jYWxTdG9yYWdlLlRyeUl0X3NlY3VyaXR5U2NoZW1lVmFsdWVzXG4gICAgICAgICAgICAvLyBUaGlzIGFsbG93cyBcIlRyeSBJdFwiIGZ1bmN0aW9uYWxpdHkgdG8gd29yayB3aXRob3V0IG1hbnVhbCB0b2tlbiBpbnB1dFxuICAgICAgICAgICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vc3RvcGxpZ2h0aW8vZWxlbWVudHMvaXNzdWVzLzE0MDBcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuQVBJIHNwZWMgZGVmaW5lcyBzZWN1cml0eSBzY2hlbWUgYXMgJ2JlYXJlckF1dGgnXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgdG9rZW4gaW4gZm9ybWF0OiB7ICdiZWFyZXJBdXRoJzogJ3Rva2VuX3ZhbHVlJyB9XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ1RyeUl0X3NlY3VyaXR5U2NoZW1lVmFsdWVzJywgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlblxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUHJlLWZpbGxlZCBCZWFyZXIgdG9rZW4gZm9yIFRyeSBJdCBmdW5jdGlvbmFsaXR5Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZldGNoIE9wZW5BUEkgc3BlY2lmaWNhdGlvbiB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHVzZSAkLmFqYXggaW5zdGVhZCBvZiBmZXRjaCB0byBnZXQgSldUIHRva2VuIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IEFwaUtleXNPcGVuQVBJLnNwZWNVcmwsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgdHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBPcGVuQVBJIHNwZWNpZmljYXRpb24gcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGltbWVkaWF0ZWx5IGFzIEVsZW1lbnRzIHdpbGwgc2hvdyBpdHMgb3duIGxvYWRlclxuICAgICAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLnNob3coKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBFbGVtZW50cyBBUEkgY29tcG9uZW50XG4gICAgICAgICAgICBjb25zdCBhcGlFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZWxlbWVudHMtYXBpJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIC0gcGFzcyBKU09OIGRpcmVjdGx5IGluc3RlYWQgb2YgVVJMIHRvIGF2b2lkIGF1dGggaXNzdWVzXG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgncm91dGVyJywgJ2hhc2gnKTtcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdsYXlvdXQnLCAnc2lkZWJhcicpO1xuICAgICAgICAgICAgLy8gTm90ZTogRG9uJ3Qgc2V0IGhpZGVJbnRlcm5hbCBvciBoaWRlVHJ5SXQgLSB0aGV5IGRlZmF1bHQgdG8gZmFsc2UgKHNob3duKVxuICAgICAgICAgICAgLy8gQm9vbGVhbiBhdHRyaWJ1dGVzOiBwcmVzZW5jZSA9IHRydWUsIGFic2VuY2UgPSBmYWxzZVxuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RyeUl0Q3JlZGVudGlhbHNQb2xpY3knLCAnaW5jbHVkZScpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBjb250YWluZXIgYW5kIGFwcGVuZCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYXBpRWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgc3BlY2lmaWNhdGlvbiBkb2N1bWVudCAobXVzdCBiZSBkb25lIGFmdGVyIGFwcGVuZENoaWxkKVxuICAgICAgICAgICAgYXBpRWxlbWVudC5hcGlEZXNjcmlwdGlvbkRvY3VtZW50ID0gcmVzcG9uc2U7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgc3R5bGVzIHRvIHJlbW92ZSBtYXgtd2lkdGggcmVzdHJpY3Rpb25cbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLmFkZEN1c3RvbVN0eWxlcygpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBTdG9wbGlnaHQgRWxlbWVudHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0Vycm9yKGVycm9yLm1lc3NhZ2UgfHwgZXJyb3Iuc3RhdHVzVGV4dCB8fCAnVW5rbm93biBlcnJvcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjdXN0b20gQ1NTIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0IHN0eWxlc1xuICAgICAqIFVzZXMgTXV0YXRpb25PYnNlcnZlciBhbmQgZGVsYXllZCBmb3JjZWQgc3R5bGluZyB0byBlbnN1cmUgc3R5bGVzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgYWRkQ3VzdG9tU3R5bGVzKCkge1xuICAgICAgICAvLyBBZGQgc3R5bGUgdGFnIGltbWVkaWF0ZWx5XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUuaWQgPSAnc3RvcGxpZ2h0LWN1c3RvbS1zdHlsZXMnO1xuICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAgICAgICAgIC8qIFJlbW92ZSBjb250YWluZXIgbWF4LXdpZHRoIHRvIGFsbG93IGZ1bGwtd2lkdGggbGF5b3V0ICovXG4gICAgICAgICAgICAuc2wtcHktMTYge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgbWF4LXdpZHRoIGZvciBleGFtcGxlIGNvbHVtbiAqL1xuICAgICAgICAgICAgW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXSB7XG4gICAgICAgICAgICAgICAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBBZGp1c3QgbGVmdCBjb2x1bW4gd2lkdGggYWNjb3JkaW5nbHkgKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICBgO1xuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgICAgICAvLyBGb3JjZSBhcHBseSBpbmxpbmUgc3R5bGVzIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0c1xuICAgICAgICBjb25zdCBhcHBseUZvcmNlZFN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0Q29sdW1uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXScpO1xuICAgICAgICAgICAgY29uc3QgbGVmdENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXScpO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNsLXB5LTE2W3N0eWxlKj1cIm1heC13aWR0aFwiXScpO1xuXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJpZ2h0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUubWF4V2lkdGggPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxlZnRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICBsZWZ0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgc3R5bGVzIGFmdGVyIEVsZW1lbnRzIGxvYWRzIChtdWx0aXBsZSBhdHRlbXB0cyB0byBlbnN1cmUgdGhleSBzdGljaylcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgNTAwKTtcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgMTAwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDIwMDApO1xuXG4gICAgICAgIC8vIFdhdGNoIGZvciB3aGVuIGVsZW1lbnRzIGFwcGVhciBhbmQgcmVhcHBseSBzdHlsZXNcbiAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgICAgICAgICBhcHBseUZvcmNlZFN0eWxlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCBvYnNlcnZpbmcgdGhlIGNvbnRhaW5lciBmb3IgY2hhbmdlc1xuICAgICAgICBjb25zdCBlbGVtZW50c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgaWYgKGVsZW1lbnRzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGVsZW1lbnRzQ29udGFpbmVyLCB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVGaWx0ZXI6IFsnc3R5bGUnXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3Qgb2JzZXJ2ZXIgYWZ0ZXIgNSBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ic2VydmVyLmRpc2Nvbm5lY3QoKSwgNTAwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb25cbiAgICAgKi9cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==