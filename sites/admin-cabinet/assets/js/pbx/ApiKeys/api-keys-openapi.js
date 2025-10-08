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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJyZW1vdmVDbGFzcyIsInBhcmVudCIsImFkZENsYXNzIiwicmVzcG9uc2UiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJFcnJvciIsImFwaUVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJjb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImlubmVySFRNTCIsImFwcGVuZENoaWxkIiwiYXBpRGVzY3JpcHRpb25Eb2N1bWVudCIsImFkZEN1c3RvbVN0eWxlcyIsImNvbnNvbGUiLCJsb2ciLCJlcnJvciIsInN0YXR1c1RleHQiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtB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LEVBQUUsSUFIb0I7QUFJaENDLFFBQUFBLGVBQWUsRUFBRSxDQUFDLE9BQUQ7QUFKZSxPQUFwQyxFQURtQixDQVFuQjs7QUFDQVQsTUFBQUEsVUFBVSxDQUFDO0FBQUEsZUFBTUMsUUFBUSxDQUFDUyxVQUFULEVBQU47QUFBQSxPQUFELEVBQThCLElBQTlCLENBQVY7QUFDSDtBQUNKLEdBbExrQjs7QUFvTG5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxNQXZMbUIsb0JBdUxWO0FBQ0w3RCxJQUFBQSxjQUFjLENBQUNLLFVBQWY7QUFDSDtBQXpMa0IsQ0FBdkI7QUE0TEE7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUN5QixRQUFELENBQUQsQ0FBWW1DLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlELEVBQUFBLGNBQWMsQ0FBQ0ssVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQVBJIEtleXMgT3BlbkFQSS9TdG9wbGlnaHQgRWxlbWVudHMgbW9kdWxlXG4gKiBIYW5kbGVzIHRoZSBpbml0aWFsaXphdGlvbiBhbmQgY29uZmlndXJhdGlvbiBvZiBTdG9wbGlnaHQgRWxlbWVudHMgZm9yIEFQSSBkb2N1bWVudGF0aW9uXG4gKi9cbmNvbnN0IEFwaUtleXNPcGVuQVBJID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRjb250YWluZXI6ICQoJyNlbGVtZW50cy1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIFVSTCB0byB0aGUgT3BlbkFQSSBzcGVjaWZpY2F0aW9uXG4gICAgICovXG4gICAgc3BlY1VybDogJy9wYnhjb3JlL2FwaS92My9vcGVuYXBpOmdldFNwZWNpZmljYXRpb24nLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyXG4gICAgICovXG4gICAgJG1haW5Db250YWluZXI6ICQoJyNtYWluLWNvbnRlbnQtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb24gcGFnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dMb2FkaW5nKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemVFbGVtZW50cygpO1xuICAgIH0sIFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmcoKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuc2hvdygpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBlcnJvciBzdGF0ZVxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGRvY3VtZW50YXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MgfHwgJ1BsZWFzZSBjaGVjayB5b3VyIGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2Fpbi4nfTwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBvbmNsaWNrPVwiQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicmVmcmVzaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19SZXRyeUxvYWQgfHwgJ1JldHJ5J31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKS5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZUVsZW1lbnRzKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG4gICAgICAgICQoJy50b2MnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhcnRpY2xlJyk7XG4gICAgICAgICQoJyNwYWdlLWhlYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdiYXNpYycpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZXRjaCBPcGVuQVBJIHNwZWNpZmljYXRpb24gd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byB1c2UgJC5hamF4IGluc3RlYWQgb2YgZmV0Y2ggdG8gZ2V0IEpXVCB0b2tlbiBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBBcGlLZXlzT3BlbkFQSS5zcGVjVXJsLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgT3BlbkFQSSBzcGVjaWZpY2F0aW9uIHJlY2VpdmVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhpZGUgbG9hZGluZyBpbW1lZGlhdGVseSBhcyBFbGVtZW50cyB3aWxsIHNob3cgaXRzIG93biBsb2FkZXJcbiAgICAgICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgRWxlbWVudHMgQVBJIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgYXBpRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2VsZW1lbnRzLWFwaScpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYXR0cmlidXRlcyAtIHBhc3MgSlNPTiBkaXJlY3RseSBpbnN0ZWFkIG9mIFVSTCB0byBhdm9pZCBhdXRoIGlzc3Vlc1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3JvdXRlcicsICdoYXNoJyk7XG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgnbGF5b3V0JywgJ3NpZGViYXInKTtcbiAgICAgICAgICAgIC8vIE5vdGU6IERvbid0IHNldCBoaWRlSW50ZXJuYWwgb3IgaGlkZVRyeUl0IC0gdGhleSBkZWZhdWx0IHRvIGZhbHNlIChzaG93bilcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gYXR0cmlidXRlczogcHJlc2VuY2UgPSB0cnVlLCBhYnNlbmNlID0gZmFsc2VcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCd0cnlJdENyZWRlbnRpYWxzUG9saWN5JywgJ2luY2x1ZGUnKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyIGFuZCBhcHBlbmQgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VsZW1lbnRzLWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGFwaUVsZW1lbnQpO1xuXG4gICAgICAgICAgICAvLyBTZXQgdGhlIHNwZWNpZmljYXRpb24gZG9jdW1lbnQgKG11c3QgYmUgZG9uZSBhZnRlciBhcHBlbmRDaGlsZClcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuYXBpRGVzY3JpcHRpb25Eb2N1bWVudCA9IHJlc3BvbnNlO1xuXG4gICAgICAgICAgICAvLyBPdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgaW5saW5lIHN0eWxlcyB0byByZW1vdmUgbWF4LXdpZHRoIHJlc3RyaWN0aW9uXG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS5hZGRDdXN0b21TdHlsZXMoKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1N0b3BsaWdodCBFbGVtZW50cyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dFcnJvcihlcnJvci5tZXNzYWdlIHx8IGVycm9yLnN0YXR1c1RleHQgfHwgJ1Vua25vd24gZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgY3VzdG9tIENTUyB0byBvdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgZGVmYXVsdCBzdHlsZXNcbiAgICAgKiBVc2VzIE11dGF0aW9uT2JzZXJ2ZXIgYW5kIGRlbGF5ZWQgZm9yY2VkIHN0eWxpbmcgdG8gZW5zdXJlIHN0eWxlcyBhcmUgYXBwbGllZFxuICAgICAqL1xuICAgIGFkZEN1c3RvbVN0eWxlcygpIHtcbiAgICAgICAgLy8gQWRkIHN0eWxlIHRhZyBpbW1lZGlhdGVseVxuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgIHN0eWxlLmlkID0gJ3N0b3BsaWdodC1jdXN0b20tc3R5bGVzJztcbiAgICAgICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAgICAgICAvKiBSZW1vdmUgY29udGFpbmVyIG1heC13aWR0aCB0byBhbGxvdyBmdWxsLXdpZHRoIGxheW91dCAqL1xuICAgICAgICAgICAgLnNsLXB5LTE2IHtcbiAgICAgICAgICAgICAgICBtYXgtd2lkdGg6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBPdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgaW5saW5lIG1heC13aWR0aCBmb3IgZXhhbXBsZSBjb2x1bW4gKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tcmlnaHRcIl0ge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiA1MCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyogQWRqdXN0IGxlZnQgY29sdW1uIHdpZHRoIGFjY29yZGluZ2x5ICovXG4gICAgICAgICAgICBbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLWxlZnRcIl0ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiA1MCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgYDtcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICAgICAgLy8gRm9yY2UgYXBwbHkgaW5saW5lIHN0eWxlcyB0byBvdmVycmlkZSBTdG9wbGlnaHQgRWxlbWVudHMgZGVmYXVsdHNcbiAgICAgICAgY29uc3QgYXBwbHlGb3JjZWRTdHlsZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByaWdodENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tcmlnaHRcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGxlZnRDb2x1bW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLWxlZnRcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zbC1weS0xNltzdHlsZSo9XCJtYXgtd2lkdGhcIl0nKTtcblxuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5tYXhXaWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyaWdodENvbHVtbikge1xuICAgICAgICAgICAgICAgIHJpZ2h0Q29sdW1uLnN0eWxlLm1heFdpZHRoID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIHJpZ2h0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsZWZ0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgbGVmdENvbHVtbi5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFwcGx5IHN0eWxlcyBhZnRlciBFbGVtZW50cyBsb2FkcyAobXVsdGlwbGUgYXR0ZW1wdHMgdG8gZW5zdXJlIHRoZXkgc3RpY2spXG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDUwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDEwMDApO1xuICAgICAgICBzZXRUaW1lb3V0KGFwcGx5Rm9yY2VkU3R5bGVzLCAyMDAwKTtcblxuICAgICAgICAvLyBXYXRjaCBmb3Igd2hlbiBlbGVtZW50cyBhcHBlYXIgYW5kIHJlYXBwbHkgc3R5bGVzXG4gICAgICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xuICAgICAgICAgICAgYXBwbHlGb3JjZWRTdHlsZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgb2JzZXJ2aW5nIHRoZSBjb250YWluZXIgZm9yIGNoYW5nZXNcbiAgICAgICAgY29uc3QgZWxlbWVudHNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgIGlmIChlbGVtZW50c0NvbnRhaW5lcikge1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShlbGVtZW50c0NvbnRhaW5lciwge1xuICAgICAgICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlRmlsdGVyOiBbJ3N0eWxlJ11cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBEaXNjb25uZWN0IG9ic2VydmVyIGFmdGVyIDUgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBvYnNlcnZlci5kaXNjb25uZWN0KCksIDUwMDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbG9hZCB0aGUgT3BlbkFQSSBkb2N1bWVudGF0aW9uXG4gICAgICovXG4gICAgcmVsb2FkKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKCk7XG59KTsiXX0=