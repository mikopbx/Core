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

/* global globalRootUrl, PbxApi, PbxApiClient, Config */

/**
 * WikiLinksAPI - REST API v3 client for wiki documentation links
 *
 * Provides a clean interface for retrieving documentation links based on
 * controller, action, and language context.
 *
 * @class WikiLinksAPI
 */
var WikiLinksAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/wiki-links',
  customMethods: {
    getLink: ':getLink'
  }
}); // Add utility methods to WikiLinksAPI

Object.assign(WikiLinksAPI, {
  /**
   * Get documentation link for current page
   *
   * @param {string} controller - Controller name in CamelCase format
   * @param {string} action - Action name (optional, defaults to 'index')
   * @param {string} moduleId - Module unique ID for module-specific docs (optional)
   * @param {function} callback - Callback function that receives the URL
   */
  getLink: function getLink(controller) {
    var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'index';
    var moduleId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    var callback = arguments.length > 3 ? arguments[3] : undefined;
    // Handle different parameter combinations
    var actualCallback = callback;
    var actualModuleId = moduleId; // If third parameter is a function, it's the callback (no moduleId)

    if (typeof moduleId === 'function') {
      actualCallback = moduleId;
      actualModuleId = '';
    }

    var params = {
      controller: controller,
      action: action,
      language: Config.webAdminLanguage || 'en'
    };

    if (actualModuleId) {
      params.moduleId = actualModuleId;
    }

    return this.callCustomMethod('getLink', params, function (response) {
      if (response && response.result === true && response.data && response.data.url) {
        if (typeof actualCallback === 'function') {
          actualCallback(response.data.url);
        }
      } else {
        // Fallback to base wiki URL if API fails
        var fallbackUrl = "https://wiki.mikopbx.com/".concat(controller.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());

        if (typeof actualCallback === 'function') {
          actualCallback(fallbackUrl);
        }
      }
    }, 'GET');
  },

  /**
   * Open documentation in new tab
   *
   * @param {string} controller - Controller name
   * @param {string} action - Action name (optional)
   * @param {string} moduleId - Module unique ID (optional)
   */
  openDocumentation: function openDocumentation(controller) {
    var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'index';
    var moduleId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    this.getLink(controller, action, moduleId, function (url) {
      window.open(url, '_blank');
    });
  },

  /**
   * Initialize wiki help link handlers
   * Sets up click handlers for all elements with 'wiki-help-link' class
   */
  initializeHelpLinks: function initializeHelpLinks() {
    $(document).off('click', 'a.wiki-help-link');
    $(document).on('click', 'a.wiki-help-link', function (e) {
      e.preventDefault();
      var controller = $(this).data('controller');
      var action = $(this).data('action') || 'index';
      var moduleId = $(this).data('module-id') || '';
      WikiLinksAPI.openDocumentation(controller, action, moduleId);
    });
  }
}); // Initialize help links when document is ready

$(document).ready(function () {
  WikiLinksAPI.initializeHelpLinks();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvd2lraS1saW5rcy1hcGkuanMiXSwibmFtZXMiOlsiV2lraUxpbmtzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiZ2V0TGluayIsIk9iamVjdCIsImFzc2lnbiIsImNvbnRyb2xsZXIiLCJhY3Rpb24iLCJtb2R1bGVJZCIsImNhbGxiYWNrIiwiYWN0dWFsQ2FsbGJhY2siLCJhY3R1YWxNb2R1bGVJZCIsInBhcmFtcyIsImxhbmd1YWdlIiwiQ29uZmlnIiwid2ViQWRtaW5MYW5ndWFnZSIsImNhbGxDdXN0b21NZXRob2QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cmwiLCJmYWxsYmFja1VybCIsInJlcGxhY2UiLCJ0b0xvd2VyQ2FzZSIsIm9wZW5Eb2N1bWVudGF0aW9uIiwid2luZG93Iiwib3BlbiIsImluaXRpYWxpemVIZWxwTGlua3MiLCIkIiwiZG9jdW1lbnQiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2xDQyxFQUFBQSxRQUFRLEVBQUUsNEJBRHdCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsT0FBTyxFQUFFO0FBREU7QUFGbUIsQ0FBakIsQ0FBckIsQyxDQU9BOztBQUNBQyxNQUFNLENBQUNDLE1BQVAsQ0FBY04sWUFBZCxFQUE0QjtBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLE9BVHdCLG1CQVNoQkcsVUFUZ0IsRUFTdUM7QUFBQSxR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O0FBU0g7QUF6RXVCLENBQTVCLEUsQ0E0RUE7O0FBQ0FvQixDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZSyxLQUFaLENBQWtCLFlBQU07QUFDcEJuQyxFQUFBQSxZQUFZLENBQUM0QixtQkFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBQYnhBcGlDbGllbnQsIENvbmZpZyAqL1xuXG4vKipcbiAqIFdpa2lMaW5rc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3Igd2lraSBkb2N1bWVudGF0aW9uIGxpbmtzXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIHJldHJpZXZpbmcgZG9jdW1lbnRhdGlvbiBsaW5rcyBiYXNlZCBvblxuICogY29udHJvbGxlciwgYWN0aW9uLCBhbmQgbGFuZ3VhZ2UgY29udGV4dC5cbiAqXG4gKiBAY2xhc3MgV2lraUxpbmtzQVBJXG4gKi9cbmNvbnN0IFdpa2lMaW5rc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL3dpa2ktbGlua3MnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0TGluazogJzpnZXRMaW5rJ1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgdXRpbGl0eSBtZXRob2RzIHRvIFdpa2lMaW5rc0FQSVxuT2JqZWN0LmFzc2lnbihXaWtpTGlua3NBUEksIHtcbiAgICAvKipcbiAgICAgKiBHZXQgZG9jdW1lbnRhdGlvbiBsaW5rIGZvciBjdXJyZW50IHBhZ2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sbGVyIC0gQ29udHJvbGxlciBuYW1lIGluIENhbWVsQ2FzZSBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQWN0aW9uIG5hbWUgKG9wdGlvbmFsLCBkZWZhdWx0cyB0byAnaW5kZXgnKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVJZCAtIE1vZHVsZSB1bmlxdWUgSUQgZm9yIG1vZHVsZS1zcGVjaWZpYyBkb2NzIChvcHRpb25hbClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIFVSTFxuICAgICAqL1xuICAgIGdldExpbmsoY29udHJvbGxlciwgYWN0aW9uID0gJ2luZGV4JywgbW9kdWxlSWQgPSAnJywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBwYXJhbWV0ZXIgY29tYmluYXRpb25zXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICBsZXQgYWN0dWFsTW9kdWxlSWQgPSBtb2R1bGVJZDtcblxuICAgICAgICAvLyBJZiB0aGlyZCBwYXJhbWV0ZXIgaXMgYSBmdW5jdGlvbiwgaXQncyB0aGUgY2FsbGJhY2sgKG5vIG1vZHVsZUlkKVxuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZUlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IG1vZHVsZUlkO1xuICAgICAgICAgICAgYWN0dWFsTW9kdWxlSWQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIsXG4gICAgICAgICAgICBhY3Rpb246IGFjdGlvbixcbiAgICAgICAgICAgIGxhbmd1YWdlOiBDb25maWcud2ViQWRtaW5MYW5ndWFnZSB8fCAnZW4nXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGFjdHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICBwYXJhbXMubW9kdWxlSWQgPSBhY3R1YWxNb2R1bGVJZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldExpbmsnLCBwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudXJsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZS5kYXRhLnVybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBiYXNlIHdpa2kgVVJMIGlmIEFQSSBmYWlsc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrVXJsID0gYGh0dHBzOi8vd2lraS5taWtvcGJ4LmNvbS8ke2NvbnRyb2xsZXIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKX1gO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soZmFsbGJhY2tVcmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ0dFVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBPcGVuIGRvY3VtZW50YXRpb24gaW4gbmV3IHRhYlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRyb2xsZXIgLSBDb250cm9sbGVyIG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQWN0aW9uIG5hbWUgKG9wdGlvbmFsKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVJZCAtIE1vZHVsZSB1bmlxdWUgSUQgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG9wZW5Eb2N1bWVudGF0aW9uKGNvbnRyb2xsZXIsIGFjdGlvbiA9ICdpbmRleCcsIG1vZHVsZUlkID0gJycpIHtcbiAgICAgICAgdGhpcy5nZXRMaW5rKGNvbnRyb2xsZXIsIGFjdGlvbiwgbW9kdWxlSWQsICh1cmwpID0+IHtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB3aWtpIGhlbHAgbGluayBoYW5kbGVyc1xuICAgICAqIFNldHMgdXAgY2xpY2sgaGFuZGxlcnMgZm9yIGFsbCBlbGVtZW50cyB3aXRoICd3aWtpLWhlbHAtbGluaycgY2xhc3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSGVscExpbmtzKCkge1xuICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ2NsaWNrJywgJ2Eud2lraS1oZWxwLWxpbmsnKTtcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ2Eud2lraS1oZWxwLWxpbmsnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSAkKHRoaXMpLmRhdGEoJ2NvbnRyb2xsZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZGF0YSgnYWN0aW9uJykgfHwgJ2luZGV4JztcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZUlkID0gJCh0aGlzKS5kYXRhKCdtb2R1bGUtaWQnKSB8fCAnJztcblxuICAgICAgICAgICAgV2lraUxpbmtzQVBJLm9wZW5Eb2N1bWVudGF0aW9uKGNvbnRyb2xsZXIsIGFjdGlvbiwgbW9kdWxlSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuLy8gSW5pdGlhbGl6ZSBoZWxwIGxpbmtzIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBXaWtpTGlua3NBUEkuaW5pdGlhbGl6ZUhlbHBMaW5rcygpO1xufSk7XG4iXX0=