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
      // PRE-FILL AUTHENTICATION TOKEN FOR SWAGGER/STOPLIGHT ELEMENTS
      // WHY: Stoplight Elements reads security values from localStorage.TryIt_securitySchemeValues
      // This allows "Try It" functionality to work without manual token input
      // See: https://github.com/stoplightio/elements/issues/1400
      //
      // SECURITY NOTE: We store the token in localStorage ONLY for OpenAPI testing convenience.
      // This is an exception to our security model where tokens are normally kept in memory only.
      // The token expires after 15 minutes anyway, and this is only for authenticated admin users.
      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        // OpenAPI spec defines security scheme as 'bearerAuth'
        // Store token with expiration timestamp for convenience
        var tokenData = {
          'bearerAuth': TokenManager.accessToken,
          'expiresAt': Date.now() + 15 * 60 * 1000 // 15 minutes from now

        };
        localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
          'bearerAuth': TokenManager.accessToken
        })); // Store full token data separately for our own expiration check

        localStorage.setItem('MikoPBX_OpenAPI_Token', JSON.stringify(tokenData));
        console.log('Pre-filled Bearer token for Try It functionality (expires in 15 min)');
      } else {
        // Check if we have a stored token that hasn't expired
        var storedData = localStorage.getItem('MikoPBX_OpenAPI_Token');

        if (storedData) {
          try {
            var _tokenData = JSON.parse(storedData); // Check if token is still valid


            if (_tokenData.expiresAt && Date.now() < _tokenData.expiresAt) {
              // Token is still valid - restore it for Stoplight Elements
              localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
                'bearerAuth': _tokenData.bearerAuth
              }));
              console.log('Restored previously stored Bearer token for Try It functionality');
            } else {
              // Token expired - clear it
              localStorage.removeItem('MikoPBX_OpenAPI_Token');
              localStorage.removeItem('TryIt_securitySchemeValues');
              console.log('Stored token expired - cleared');
            }
          } catch (e) {
            console.error('Failed to parse stored token:', e);
            localStorage.removeItem('MikoPBX_OpenAPI_Token');
          }
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJyZW1vdmVDbGFzcyIsInBhcmVudCIsImFkZENsYXNzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJ0b2tlbkRhdGEiLCJEYXRlIiwibm93IiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJjb25zb2xlIiwibG9nIiwic3RvcmVkRGF0YSIsImdldEl0ZW0iLCJwYXJzZSIsImV4cGlyZXNBdCIsImJlYXJlckF1dGgiLCJyZW1vdmVJdGVtIiwiZSIsImVycm9yIiwicmVzcG9uc2UiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJFcnJvciIsImFwaUVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJjb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImlubmVySFRNTCIsImFwcGVuZENoaWxkIiwiYXBpRGVzY3JpcHRpb25Eb2N1bWVudCIsImFkZEN1c3RvbVN0eWxlcyIsInN0YXR1c1RleHQiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBSk07O0FBTW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsMENBVFU7O0FBV25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQWRFOztBQWdCbkI7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLFVBbkJtQix3QkFtQk47QUFDVEwsSUFBQUEsY0FBYyxDQUFDTSxXQUFmO0FBQ0FOLElBQUFBLGNBQWMsQ0FBQ08sa0JBQWY7QUFDSCxHQXRCa0I7O0FBd0JuQjtBQUNKO0FBQ0E7QUFDSUQsRUFBQUEsV0EzQm1CLHlCQTJCTDtBQUNWSixJQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1Qk0sSUFBdkI7QUFDQVIsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCUSxJQUExQjtBQUNILEdBOUJrQjs7QUFnQ25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQW5DbUIscUJBbUNUQyxPQW5DUyxFQW1DQTtBQUNmVCxJQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1Qk8sSUFBdkI7QUFDQVQsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCVyxJQUExQixvR0FFOEJDLGVBQWUsQ0FBQ0MsbUJBQWhCLElBQXVDLGtDQUZyRSx3Q0FHYUgs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QyxJQUFBQSxVQUFVLENBQUNOLGlCQUFELEVBQW9CLEdBQXBCLENBQVY7QUFDQU0sSUFBQUEsVUFBVSxDQUFDTixpQkFBRCxFQUFvQixJQUFwQixDQUFWO0FBQ0FNLElBQUFBLFVBQVUsQ0FBQ04saUJBQUQsRUFBb0IsSUFBcEIsQ0FBVixDQWhEYyxDQWtEZDs7QUFDQSxRQUFNTyxRQUFRLEdBQUcsSUFBSUMsZ0JBQUosQ0FBcUIsVUFBQ0MsU0FBRCxFQUFlO0FBQ2pEVCxNQUFBQSxpQkFBaUI7QUFDcEIsS0FGZ0IsQ0FBakIsQ0FuRGMsQ0F1RGQ7O0FBQ0EsUUFBTVUsaUJBQWlCLEdBQUd4QixRQUFRLENBQUNJLGNBQVQsQ0FBd0Isb0JBQXhCLENBQTFCOztBQUNBLFFBQUlvQixpQkFBSixFQUF1QjtBQUNuQkgsTUFBQUEsUUFBUSxDQUFDSSxPQUFULENBQWlCRCxpQkFBakIsRUFBb0M7QUFDaENFLFFBQUFBLFNBQVMsRUFBRSxJQURxQjtBQUVoQ0MsUUFBQUEsT0FBTyxFQUFFLElBRnVCO0FBR2hDQyxRQUFBQSxVQUFVLEVBQUUsSUFIb0I7QUFJaENDLFFBQUFBLGVBQWUsRUFBRSxDQUFDLE9BQUQ7QUFKZSxPQUFwQyxFQURtQixDQVFuQjs7QUFDQVQsTUFBQUEsVUFBVSxDQUFDO0FBQUEsZUFBTUMsUUFBUSxDQUFDUyxVQUFULEVBQU47QUFBQSxPQUFELEVBQThCLElBQTlCLENBQVY7QUFDSDtBQUNKLEdBck9rQjs7QUF1T25CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxNQTFPbUIsb0JBME9WO0FBQ0w3RSxJQUFBQSxjQUFjLENBQUNLLFVBQWY7QUFDSDtBQTVPa0IsQ0FBdkI7QUErT0E7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUM0QyxRQUFELENBQUQsQ0FBWWdDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlFLEVBQUFBLGNBQWMsQ0FBQ0ssVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQVBJIEtleXMgT3BlbkFQSS9TdG9wbGlnaHQgRWxlbWVudHMgbW9kdWxlXG4gKiBIYW5kbGVzIHRoZSBpbml0aWFsaXphdGlvbiBhbmQgY29uZmlndXJhdGlvbiBvZiBTdG9wbGlnaHQgRWxlbWVudHMgZm9yIEFQSSBkb2N1bWVudGF0aW9uXG4gKi9cbmNvbnN0IEFwaUtleXNPcGVuQVBJID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRjb250YWluZXI6ICQoJyNlbGVtZW50cy1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIFVSTCB0byB0aGUgT3BlbkFQSSBzcGVjaWZpY2F0aW9uXG4gICAgICovXG4gICAgc3BlY1VybDogJy9wYnhjb3JlL2FwaS92My9vcGVuYXBpOmdldFNwZWNpZmljYXRpb24nLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyXG4gICAgICovXG4gICAgJG1haW5Db250YWluZXI6ICQoJyNtYWluLWNvbnRlbnQtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb24gcGFnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLnNob3dMb2FkaW5nKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemVFbGVtZW50cygpO1xuICAgIH0sIFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmcoKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuc2hvdygpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBlcnJvciBzdGF0ZVxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlKSB7XG4gICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kY29udGFpbmVyLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGRvY3VtZW50YXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MgfHwgJ1BsZWFzZSBjaGVjayB5b3VyIGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2Fpbi4nfTwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBvbmNsaWNrPVwiQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicmVmcmVzaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19SZXRyeUxvYWQgfHwgJ1JldHJ5J31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKS5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU3RvcGxpZ2h0IEVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZUVsZW1lbnRzKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG4gICAgICAgICQoJy50b2MnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhcnRpY2xlJyk7XG4gICAgICAgICQoJyNwYWdlLWhlYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdiYXNpYycpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBQUkUtRklMTCBBVVRIRU5USUNBVElPTiBUT0tFTiBGT1IgU1dBR0dFUi9TVE9QTElHSFQgRUxFTUVOVFNcbiAgICAgICAgICAgIC8vIFdIWTogU3RvcGxpZ2h0IEVsZW1lbnRzIHJlYWRzIHNlY3VyaXR5IHZhbHVlcyBmcm9tIGxvY2FsU3RvcmFnZS5UcnlJdF9zZWN1cml0eVNjaGVtZVZhbHVlc1xuICAgICAgICAgICAgLy8gVGhpcyBhbGxvd3MgXCJUcnkgSXRcIiBmdW5jdGlvbmFsaXR5IHRvIHdvcmsgd2l0aG91dCBtYW51YWwgdG9rZW4gaW5wdXRcbiAgICAgICAgICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL3N0b3BsaWdodGlvL2VsZW1lbnRzL2lzc3Vlcy8xNDAwXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gU0VDVVJJVFkgTk9URTogV2Ugc3RvcmUgdGhlIHRva2VuIGluIGxvY2FsU3RvcmFnZSBPTkxZIGZvciBPcGVuQVBJIHRlc3RpbmcgY29udmVuaWVuY2UuXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGV4Y2VwdGlvbiB0byBvdXIgc2VjdXJpdHkgbW9kZWwgd2hlcmUgdG9rZW5zIGFyZSBub3JtYWxseSBrZXB0IGluIG1lbW9yeSBvbmx5LlxuICAgICAgICAgICAgLy8gVGhlIHRva2VuIGV4cGlyZXMgYWZ0ZXIgMTUgbWludXRlcyBhbnl3YXksIGFuZCB0aGlzIGlzIG9ubHkgZm9yIGF1dGhlbnRpY2F0ZWQgYWRtaW4gdXNlcnMuXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbkFQSSBzcGVjIGRlZmluZXMgc2VjdXJpdHkgc2NoZW1lIGFzICdiZWFyZXJBdXRoJ1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRva2VuIHdpdGggZXhwaXJhdGlvbiB0aW1lc3RhbXAgZm9yIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAgICAgY29uc3QgdG9rZW5EYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgJ2V4cGlyZXNBdCc6IERhdGUubm93KCkgKyAoMTUgKiA2MCAqIDEwMDApIC8vIDE1IG1pbnV0ZXMgZnJvbSBub3dcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ1RyeUl0X3NlY3VyaXR5U2NoZW1lVmFsdWVzJywgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlblxuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGZ1bGwgdG9rZW4gZGF0YSBzZXBhcmF0ZWx5IGZvciBvdXIgb3duIGV4cGlyYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnTWlrb1BCWF9PcGVuQVBJX1Rva2VuJywgSlNPTi5zdHJpbmdpZnkodG9rZW5EYXRhKSk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUHJlLWZpbGxlZCBCZWFyZXIgdG9rZW4gZm9yIFRyeSBJdCBmdW5jdGlvbmFsaXR5IChleHBpcmVzIGluIDE1IG1pbiknKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhIHN0b3JlZCB0b2tlbiB0aGF0IGhhc24ndCBleHBpcmVkXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RvcmVkRGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdNaWtvUEJYX09wZW5BUElfVG9rZW4nKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcmVkRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW5EYXRhID0gSlNPTi5wYXJzZShzdG9yZWREYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdG9rZW4gaXMgc3RpbGwgdmFsaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbkRhdGEuZXhwaXJlc0F0ICYmIERhdGUubm93KCkgPCB0b2tlbkRhdGEuZXhwaXJlc0F0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gaXMgc3RpbGwgdmFsaWQgLSByZXN0b3JlIGl0IGZvciBTdG9wbGlnaHQgRWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnVHJ5SXRfc2VjdXJpdHlTY2hlbWVWYWx1ZXMnLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdiZWFyZXJBdXRoJzogdG9rZW5EYXRhLmJlYXJlckF1dGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Jlc3RvcmVkIHByZXZpb3VzbHkgc3RvcmVkIEJlYXJlciB0b2tlbiBmb3IgVHJ5IEl0IGZ1bmN0aW9uYWxpdHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gZXhwaXJlZCAtIGNsZWFyIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ01pa29QQlhfT3BlbkFQSV9Ub2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdUcnlJdF9zZWN1cml0eVNjaGVtZVZhbHVlcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdG9yZWQgdG9rZW4gZXhwaXJlZCAtIGNsZWFyZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHBhcnNlIHN0b3JlZCB0b2tlbjonLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdNaWtvUEJYX09wZW5BUElfVG9rZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggT3BlbkFQSSBzcGVjaWZpY2F0aW9uIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFdlIG5lZWQgdG8gdXNlICQuYWpheCBpbnN0ZWFkIG9mIGZldGNoIHRvIGdldCBKV1QgdG9rZW4gYXV0b21hdGljYWxseVxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogQXBpS2V5c09wZW5BUEkuc3BlY1VybCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiByZXNwb25zZSBpcyB2YWxpZFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCB0eXBlb2YgcmVzcG9uc2UgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIE9wZW5BUEkgc3BlY2lmaWNhdGlvbiByZWNlaXZlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIaWRlIGxvYWRpbmcgaW1tZWRpYXRlbHkgYXMgRWxlbWVudHMgd2lsbCBzaG93IGl0cyBvd24gbG9hZGVyXG4gICAgICAgICAgICAkKCcjZWxlbWVudHMtbG9hZGluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGhlIEVsZW1lbnRzIEFQSSBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbnN0IGFwaUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdlbGVtZW50cy1hcGknKTtcblxuICAgICAgICAgICAgLy8gU2V0IGF0dHJpYnV0ZXMgLSBwYXNzIEpTT04gZGlyZWN0bHkgaW5zdGVhZCBvZiBVUkwgdG8gYXZvaWQgYXV0aCBpc3N1ZXNcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdyb3V0ZXInLCAnaGFzaCcpO1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2xheW91dCcsICdzaWRlYmFyJyk7XG4gICAgICAgICAgICAvLyBOb3RlOiBEb24ndCBzZXQgaGlkZUludGVybmFsIG9yIGhpZGVUcnlJdCAtIHRoZXkgZGVmYXVsdCB0byBmYWxzZSAoc2hvd24pXG4gICAgICAgICAgICAvLyBCb29sZWFuIGF0dHJpYnV0ZXM6IHByZXNlbmNlID0gdHJ1ZSwgYWJzZW5jZSA9IGZhbHNlXG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgndHJ5SXRDcmVkZW50aWFsc1BvbGljeScsICdpbmNsdWRlJyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGNvbnRhaW5lciBhbmQgYXBwZW5kIGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChhcGlFbGVtZW50KTtcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBzcGVjaWZpY2F0aW9uIGRvY3VtZW50IChtdXN0IGJlIGRvbmUgYWZ0ZXIgYXBwZW5kQ2hpbGQpXG4gICAgICAgICAgICBhcGlFbGVtZW50LmFwaURlc2NyaXB0aW9uRG9jdW1lbnQgPSByZXNwb25zZTtcblxuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgU3RvcGxpZ2h0IEVsZW1lbnRzIGlubGluZSBzdHlsZXMgdG8gcmVtb3ZlIG1heC13aWR0aCByZXN0cmljdGlvblxuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuYWRkQ3VzdG9tU3R5bGVzKCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdG9wbGlnaHQgRWxlbWVudHMgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFN0b3BsaWdodCBFbGVtZW50czonLCBlcnJvcik7XG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS5zaG93RXJyb3IoZXJyb3IubWVzc2FnZSB8fCBlcnJvci5zdGF0dXNUZXh0IHx8ICdVbmtub3duIGVycm9yJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGN1c3RvbSBDU1MgdG8gb3ZlcnJpZGUgU3RvcGxpZ2h0IEVsZW1lbnRzIGRlZmF1bHQgc3R5bGVzXG4gICAgICogVXNlcyBNdXRhdGlvbk9ic2VydmVyIGFuZCBkZWxheWVkIGZvcmNlZCBzdHlsaW5nIHRvIGVuc3VyZSBzdHlsZXMgYXJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICBhZGRDdXN0b21TdHlsZXMoKSB7XG4gICAgICAgIC8vIEFkZCBzdHlsZSB0YWcgaW1tZWRpYXRlbHlcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICBzdHlsZS5pZCA9ICdzdG9wbGlnaHQtY3VzdG9tLXN0eWxlcyc7XG4gICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgICAgICAgICAgLyogUmVtb3ZlIGNvbnRhaW5lciBtYXgtd2lkdGggdG8gYWxsb3cgZnVsbC13aWR0aCBsYXlvdXQgKi9cbiAgICAgICAgICAgIC5zbC1weS0xNiB7XG4gICAgICAgICAgICAgICAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyogT3ZlcnJpZGUgU3RvcGxpZ2h0IEVsZW1lbnRzIGlubGluZSBtYXgtd2lkdGggZm9yIGV4YW1wbGUgY29sdW1uICovXG4gICAgICAgICAgICBbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLXJpZ2h0XCJdIHtcbiAgICAgICAgICAgICAgICBtYXgtd2lkdGg6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICB3aWR0aDogNTAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIEFkanVzdCBsZWZ0IGNvbHVtbiB3aWR0aCBhY2NvcmRpbmdseSAqL1xuICAgICAgICAgICAgW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1sZWZ0XCJdIHtcbiAgICAgICAgICAgICAgICB3aWR0aDogNTAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIGA7XG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG4gICAgICAgIC8vIEZvcmNlIGFwcGx5IGlubGluZSBzdHlsZXMgdG8gb3ZlcnJpZGUgU3RvcGxpZ2h0IEVsZW1lbnRzIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IGFwcGx5Rm9yY2VkU3R5bGVzID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmlnaHRDb2x1bW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJ0d28tY29sdW1uLXJpZ2h0XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBsZWZ0Q29sdW1uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1sZWZ0XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2wtcHktMTZbc3R5bGUqPVwibWF4LXdpZHRoXCJdJyk7XG5cbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWF4V2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmlnaHRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICByaWdodENvbHVtbi5zdHlsZS5tYXhXaWR0aCA9ICdub25lJztcbiAgICAgICAgICAgICAgICByaWdodENvbHVtbi5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGVmdENvbHVtbikge1xuICAgICAgICAgICAgICAgIGxlZnRDb2x1bW4uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSBzdHlsZXMgYWZ0ZXIgRWxlbWVudHMgbG9hZHMgKG11bHRpcGxlIGF0dGVtcHRzIHRvIGVuc3VyZSB0aGV5IHN0aWNrKVxuICAgICAgICBzZXRUaW1lb3V0KGFwcGx5Rm9yY2VkU3R5bGVzLCA1MDApO1xuICAgICAgICBzZXRUaW1lb3V0KGFwcGx5Rm9yY2VkU3R5bGVzLCAxMDAwKTtcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgMjAwMCk7XG5cbiAgICAgICAgLy8gV2F0Y2ggZm9yIHdoZW4gZWxlbWVudHMgYXBwZWFyIGFuZCByZWFwcGx5IHN0eWxlc1xuICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcbiAgICAgICAgICAgIGFwcGx5Rm9yY2VkU3R5bGVzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IG9ic2VydmluZyB0aGUgY29udGFpbmVyIGZvciBjaGFuZ2VzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VsZW1lbnRzLWNvbnRhaW5lcicpO1xuICAgICAgICBpZiAoZWxlbWVudHNDb250YWluZXIpIHtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUoZWxlbWVudHNDb250YWluZXIsIHtcbiAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUZpbHRlcjogWydzdHlsZSddXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gRGlzY29ubmVjdCBvYnNlcnZlciBhZnRlciA1IHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gb2JzZXJ2ZXIuZGlzY29ubmVjdCgpLCA1MDAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWxvYWQgdGhlIE9wZW5BUEkgZG9jdW1lbnRhdGlvblxuICAgICAqL1xuICAgIHJlbG9hZCgpIHtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZSgpO1xufSk7Il19