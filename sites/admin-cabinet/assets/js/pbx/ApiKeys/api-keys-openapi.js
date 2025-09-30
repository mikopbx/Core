"use strict";

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
  initializeElements: function initializeElements() {
    ApiKeysOpenAPI.$mainContainer.removeClass('container');
    $('.toc').hide();
    ApiKeysOpenAPI.$mainContainer.parent().removeClass('article');
    $('#page-header').hide();

    try {
      // Hide loading immediately as Elements will show its own loader
      $('#elements-loading').hide();
      ApiKeysOpenAPI.$container.show(); // Create the Elements API component

      var apiElement = document.createElement('elements-api'); // Set attributes

      apiElement.setAttribute('apiDescriptionUrl', ApiKeysOpenAPI.specUrl);
      apiElement.setAttribute('router', 'hash');
      apiElement.setAttribute('layout', 'sidebar');
      apiElement.setAttribute('hideInternal', 'false');
      apiElement.setAttribute('hideTryIt', 'false');
      apiElement.setAttribute('tryItCredentialsPolicy', 'include'); // Clear container and append element

      var container = document.getElementById('elements-container');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJyZW1vdmVDbGFzcyIsInBhcmVudCIsImFwaUVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJjb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImlubmVySFRNTCIsImFwcGVuZENoaWxkIiwiY29uc29sZSIsImxvZyIsImVycm9yIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUNuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FKTTs7QUFNbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSwwQ0FUVTs7QUFXbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLHlCQUFELENBZEU7O0FBZ0JuQjtBQUNKO0FBQ0E7QUFDSUcsRUFBQUEsVUFuQm1CLHdCQW1CTjtBQUNUTCxJQUFBQSxjQUFjLENBQUNNLFdBQWY7QUFDQU4sSUFBQUEsY0FBYyxDQUFDTyxrQkFBZjtBQUNI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c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIEFQSSBLZXlzIE9wZW5BUEkvU3RvcGxpZ2h0IEVsZW1lbnRzIG1vZHVsZVxuICogSGFuZGxlcyB0aGUgaW5pdGlhbGl6YXRpb24gYW5kIGNvbmZpZ3VyYXRpb24gb2YgU3RvcGxpZ2h0IEVsZW1lbnRzIGZvciBBUEkgZG9jdW1lbnRhdGlvblxuICovXG5jb25zdCBBcGlLZXlzT3BlbkFQSSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWFpbiBjb250YWluZXJcbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiAkKCcjZWxlbWVudHMtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBVUkwgdG8gdGhlIE9wZW5BUEkgc3BlY2lmaWNhdGlvblxuICAgICAqL1xuICAgIHNwZWNVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvb3BlbmFwaTpnZXRTcGVjaWZpY2F0aW9uJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtYWluIGNvbnRhaW5lclxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgT3BlbkFQSSBkb2N1bWVudGF0aW9uIHBhZ2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS5zaG93TG9hZGluZygpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplRWxlbWVudHMoKTtcbiAgICB9LCBcblxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nKCkge1xuICAgICAgICAkKCcjZWxlbWVudHMtbG9hZGluZycpLnNob3coKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZXJyb3Igc3RhdGVcbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZSkge1xuICAgICAgICAkKCcjZWxlbWVudHMtbG9hZGluZycpLmhpZGUoKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmFrX1N3YWdnZXJMb2FkRXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBkb2N1bWVudGF0aW9uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4ke21lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmFrX1N3YWdnZXJMb2FkRXJyb3JEZXNjIHx8ICdQbGVhc2UgY2hlY2sgeW91ciBjb25uZWN0aW9uIGFuZCB0cnkgYWdhaW4uJ308L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJsdWUgYnV0dG9uXCIgb25jbGljaz1cIkFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInJlZnJlc2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuYWtfUmV0cnlMb2FkIHx8ICdSZXRyeSd9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCkuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFN0b3BsaWdodCBFbGVtZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFbGVtZW50cygpIHtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJG1haW5Db250YWluZXIucmVtb3ZlQ2xhc3MoJ2NvbnRhaW5lcicpO1xuICAgICAgICAkKCcudG9jJykuaGlkZSgpO1xuICAgICAgICBBcGlLZXlzT3BlbkFQSS4kbWFpbkNvbnRhaW5lci5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYXJ0aWNsZScpO1xuICAgICAgICAkKCcjcGFnZS1oZWFkZXInKS5oaWRlKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEhpZGUgbG9hZGluZyBpbW1lZGlhdGVseSBhcyBFbGVtZW50cyB3aWxsIHNob3cgaXRzIG93biBsb2FkZXJcbiAgICAgICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgRWxlbWVudHMgQVBJIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgYXBpRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2VsZW1lbnRzLWFwaScpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FwaURlc2NyaXB0aW9uVXJsJywgQXBpS2V5c09wZW5BUEkuc3BlY1VybCk7XG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgncm91dGVyJywgJ2hhc2gnKTtcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdsYXlvdXQnLCAnc2lkZWJhcicpO1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2hpZGVJbnRlcm5hbCcsICdmYWxzZScpO1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2hpZGVUcnlJdCcsICdmYWxzZScpO1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RyeUl0Q3JlZGVudGlhbHNQb2xpY3knLCAnaW5jbHVkZScpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBjb250YWluZXIgYW5kIGFwcGVuZCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYXBpRWxlbWVudCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdG9wbGlnaHQgRWxlbWVudHMgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFN0b3BsaWdodCBFbGVtZW50czonLCBlcnJvcik7XG4gICAgICAgICAgICBBcGlLZXlzT3BlbkFQSS5zaG93RXJyb3IoZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb25cbiAgICAgKi9cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==