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
    $('#content-frame').removeClass('grey').addClass('basic');

    try {
      // Hide loading immediately as Elements will show its own loader
      $('#elements-loading').hide();
      ApiKeysOpenAPI.$container.show(); // Create the Elements API component

      var apiElement = document.createElement('elements-api'); // Set attributes

      apiElement.setAttribute('apiDescriptionUrl', ApiKeysOpenAPI.specUrl);
      apiElement.setAttribute('router', 'hash');
      apiElement.setAttribute('layout', 'sidebar'); // Note: Don't set hideInternal or hideTryIt - they default to false (shown)
      // Boolean attributes: presence = true, absence = false

      apiElement.setAttribute('tryItCredentialsPolicy', 'include'); // Clear container and append element

      var container = document.getElementById('elements-container');
      container.innerHTML = '';
      container.appendChild(apiElement); // Override Stoplight Elements inline styles to remove max-width restriction

      ApiKeysOpenAPI.addCustomStyles();
      console.log('Stoplight Elements initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stoplight Elements:', error);
      ApiKeysOpenAPI.showError(error.message);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW9wZW5hcGkuanMiXSwibmFtZXMiOlsiQXBpS2V5c09wZW5BUEkiLCIkY29udGFpbmVyIiwiJCIsInNwZWNVcmwiLCIkbWFpbkNvbnRhaW5lciIsImluaXRpYWxpemUiLCJzaG93TG9hZGluZyIsImluaXRpYWxpemVFbGVtZW50cyIsInNob3ciLCJoaWRlIiwic2hvd0Vycm9yIiwibWVzc2FnZSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19Td2FnZ2VyTG9hZEVycm9yIiwiYWtfU3dhZ2dlckxvYWRFcnJvckRlc2MiLCJha19SZXRyeUxvYWQiLCJyZW1vdmVDbGFzcyIsInBhcmVudCIsImFkZENsYXNzIiwiYXBpRWxlbWVudCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInNldEF0dHJpYnV0ZSIsImNvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiaW5uZXJIVE1MIiwiYXBwZW5kQ2hpbGQiLCJhZGRDdXN0b21TdHlsZXMiLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJzdHlsZSIsImlkIiwidGV4dENvbnRlbnQiLCJoZWFkIiwiYXBwbHlGb3JjZWRTdHlsZXMiLCJyaWdodENvbHVtbiIsInF1ZXJ5U2VsZWN0b3IiLCJsZWZ0Q29sdW1uIiwibWF4V2lkdGgiLCJ3aWR0aCIsInNldFRpbWVvdXQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJtdXRhdGlvbnMiLCJlbGVtZW50c0NvbnRhaW5lciIsIm9ic2VydmUiLCJjaGlsZExpc3QiLCJzdWJ0cmVlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsImRpc2Nvbm5lY3QiLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtB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ZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBBUEkgS2V5cyBPcGVuQVBJL1N0b3BsaWdodCBFbGVtZW50cyBtb2R1bGVcbiAqIEhhbmRsZXMgdGhlIGluaXRpYWxpemF0aW9uIGFuZCBjb25maWd1cmF0aW9uIG9mIFN0b3BsaWdodCBFbGVtZW50cyBmb3IgQVBJIGRvY3VtZW50YXRpb25cbiAqL1xuY29uc3QgQXBpS2V5c09wZW5BUEkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1haW4gY29udGFpbmVyXG4gICAgICovXG4gICAgJGNvbnRhaW5lcjogJCgnI2VsZW1lbnRzLWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogVVJMIHRvIHRoZSBPcGVuQVBJIHNwZWNpZmljYXRpb25cbiAgICAgKi9cbiAgICBzcGVjVXJsOiAnL3BieGNvcmUvYXBpL3YzL29wZW5hcGk6Z2V0U3BlY2lmaWNhdGlvbicsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWFpbiBjb250YWluZXJcbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogJCgnI21haW4tY29udGVudC1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIE9wZW5BUEkgZG9jdW1lbnRhdGlvbiBwYWdlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0xvYWRpbmcoKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuaW5pdGlhbGl6ZUVsZW1lbnRzKCk7XG4gICAgfSwgXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZygpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5zaG93KCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGVycm9yIHN0YXRlXG4gICAgICovXG4gICAgc2hvd0Vycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgJCgnI2VsZW1lbnRzLWxvYWRpbmcnKS5oaWRlKCk7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRjb250YWluZXIuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkgZG9jdW1lbnRhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5ha19Td2FnZ2VyTG9hZEVycm9yRGVzYyB8fCAnUGxlYXNlIGNoZWNrIHlvdXIgY29ubmVjdGlvbiBhbmQgdHJ5IGFnYWluLid9PC9wPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIG9uY2xpY2s9XCJBcGlLZXlzT3BlbkFQSS5pbml0aWFsaXplKClcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJyZWZyZXNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1JldHJ5TG9hZCB8fCAnUmV0cnknfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTdG9wbGlnaHQgRWxlbWVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRWxlbWVudHMoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcbiAgICAgICAgJCgnLnRvYycpLmhpZGUoKTtcbiAgICAgICAgQXBpS2V5c09wZW5BUEkuJG1haW5Db250YWluZXIucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FydGljbGUnKTtcbiAgICAgICAgJCgnI3BhZ2UtaGVhZGVyJykuaGlkZSgpO1xuICAgICAgICAkKCcjY29udGVudC1mcmFtZScpLnJlbW92ZUNsYXNzKCdncmV5JykuYWRkQ2xhc3MoJ2Jhc2ljJyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEhpZGUgbG9hZGluZyBpbW1lZGlhdGVseSBhcyBFbGVtZW50cyB3aWxsIHNob3cgaXRzIG93biBsb2FkZXJcbiAgICAgICAgICAgICQoJyNlbGVtZW50cy1sb2FkaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuJGNvbnRhaW5lci5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgRWxlbWVudHMgQVBJIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgYXBpRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2VsZW1lbnRzLWFwaScpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FwaURlc2NyaXB0aW9uVXJsJywgQXBpS2V5c09wZW5BUEkuc3BlY1VybCk7XG4gICAgICAgICAgICBhcGlFbGVtZW50LnNldEF0dHJpYnV0ZSgncm91dGVyJywgJ2hhc2gnKTtcbiAgICAgICAgICAgIGFwaUVsZW1lbnQuc2V0QXR0cmlidXRlKCdsYXlvdXQnLCAnc2lkZWJhcicpO1xuICAgICAgICAgICAgLy8gTm90ZTogRG9uJ3Qgc2V0IGhpZGVJbnRlcm5hbCBvciBoaWRlVHJ5SXQgLSB0aGV5IGRlZmF1bHQgdG8gZmFsc2UgKHNob3duKVxuICAgICAgICAgICAgLy8gQm9vbGVhbiBhdHRyaWJ1dGVzOiBwcmVzZW5jZSA9IHRydWUsIGFic2VuY2UgPSBmYWxzZVxuICAgICAgICAgICAgYXBpRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RyeUl0Q3JlZGVudGlhbHNQb2xpY3knLCAnaW5jbHVkZScpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBjb250YWluZXIgYW5kIGFwcGVuZCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWxlbWVudHMtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYXBpRWxlbWVudCk7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgc3R5bGVzIHRvIHJlbW92ZSBtYXgtd2lkdGggcmVzdHJpY3Rpb25cbiAgICAgICAgICAgIEFwaUtleXNPcGVuQVBJLmFkZEN1c3RvbVN0eWxlcygpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU3RvcGxpZ2h0IEVsZW1lbnRzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBTdG9wbGlnaHQgRWxlbWVudHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgQXBpS2V5c09wZW5BUEkuc2hvd0Vycm9yKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjdXN0b20gQ1NTIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0IHN0eWxlc1xuICAgICAqIFVzZXMgTXV0YXRpb25PYnNlcnZlciBhbmQgZGVsYXllZCBmb3JjZWQgc3R5bGluZyB0byBlbnN1cmUgc3R5bGVzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgYWRkQ3VzdG9tU3R5bGVzKCkge1xuICAgICAgICAvLyBBZGQgc3R5bGUgdGFnIGltbWVkaWF0ZWx5XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUuaWQgPSAnc3RvcGxpZ2h0LWN1c3RvbS1zdHlsZXMnO1xuICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAgICAgICAgIC8qIFJlbW92ZSBjb250YWluZXIgbWF4LXdpZHRoIHRvIGFsbG93IGZ1bGwtd2lkdGggbGF5b3V0ICovXG4gICAgICAgICAgICAuc2wtcHktMTYge1xuICAgICAgICAgICAgICAgIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIE92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBpbmxpbmUgbWF4LXdpZHRoIGZvciBleGFtcGxlIGNvbHVtbiAqL1xuICAgICAgICAgICAgW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXSB7XG4gICAgICAgICAgICAgICAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBBZGp1c3QgbGVmdCBjb2x1bW4gd2lkdGggYWNjb3JkaW5nbHkgKi9cbiAgICAgICAgICAgIFtkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDUwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICBgO1xuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgICAgICAvLyBGb3JjZSBhcHBseSBpbmxpbmUgc3R5bGVzIHRvIG92ZXJyaWRlIFN0b3BsaWdodCBFbGVtZW50cyBkZWZhdWx0c1xuICAgICAgICBjb25zdCBhcHBseUZvcmNlZFN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0Q29sdW1uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwidHdvLWNvbHVtbi1yaWdodFwiXScpO1xuICAgICAgICAgICAgY29uc3QgbGVmdENvbHVtbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInR3by1jb2x1bW4tbGVmdFwiXScpO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNsLXB5LTE2W3N0eWxlKj1cIm1heC13aWR0aFwiXScpO1xuXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJpZ2h0Q29sdW1uKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUubWF4V2lkdGggPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgcmlnaHRDb2x1bW4uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxlZnRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICBsZWZ0Q29sdW1uLnN0eWxlLndpZHRoID0gJzUwJSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgc3R5bGVzIGFmdGVyIEVsZW1lbnRzIGxvYWRzIChtdWx0aXBsZSBhdHRlbXB0cyB0byBlbnN1cmUgdGhleSBzdGljaylcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgNTAwKTtcbiAgICAgICAgc2V0VGltZW91dChhcHBseUZvcmNlZFN0eWxlcywgMTAwMCk7XG4gICAgICAgIHNldFRpbWVvdXQoYXBwbHlGb3JjZWRTdHlsZXMsIDIwMDApO1xuXG4gICAgICAgIC8vIFdhdGNoIGZvciB3aGVuIGVsZW1lbnRzIGFwcGVhciBhbmQgcmVhcHBseSBzdHlsZXNcbiAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgICAgICAgICBhcHBseUZvcmNlZFN0eWxlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCBvYnNlcnZpbmcgdGhlIGNvbnRhaW5lciBmb3IgY2hhbmdlc1xuICAgICAgICBjb25zdCBlbGVtZW50c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbGVtZW50cy1jb250YWluZXInKTtcbiAgICAgICAgaWYgKGVsZW1lbnRzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGVsZW1lbnRzQ29udGFpbmVyLCB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVGaWx0ZXI6IFsnc3R5bGUnXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3Qgb2JzZXJ2ZXIgYWZ0ZXIgNSBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ic2VydmVyLmRpc2Nvbm5lY3QoKSwgNTAwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIHRoZSBPcGVuQVBJIGRvY3VtZW50YXRpb25cbiAgICAgKi9cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFwaUtleXNPcGVuQVBJLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==