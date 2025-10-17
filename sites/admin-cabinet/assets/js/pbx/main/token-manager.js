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

/* global globalRootUrl */

/**
 * TokenManager - manages JWT authentication tokens
 *
 * Security architecture:
 * - Access token (JWT, 15 min) stored in MEMORY (not localStorage - XSS protection)
 * - Refresh token (30 days) stored in httpOnly cookie (XSS protection)
 * - Silent refresh timer updates access token before expiration
 * - All AJAX requests automatically include Authorization: Bearer header
 *
 * @module TokenManager
 */
var TokenManager = {
  /**
   * Access token (JWT) stored in memory - NEVER in localStorage/sessionStorage
   * @type {string|null}
   */
  accessToken: null,

  /**
   * Timer for silent token refresh
   * @type {number|null}
   */
  refreshTimer: null,

  /**
   * Flag to prevent multiple simultaneous refresh attempts
   * @type {boolean}
   */
  isRefreshing: false,

  /**
   * Flag to prevent multiple initializations
   * @type {boolean}
   */
  isInitialized: false,

  /**
   * Initialize TokenManager
   * - Attempts to refresh access token using refresh token cookie
   * - Redirects to login if no valid refresh token
   *
   * Note: setupGlobalAjax() is called automatically on script load,
   * not here, to ensure it's active before ANY AJAX requests are made.
   *
   * @returns {Promise<boolean>} true if authentication successful
   */
  initialize: async function initialize() {
    console.log('TokenManager.initialize() called'); // Prevent multiple initializations

    if (this.isInitialized) {
      console.log('TokenManager already initialized, skipping');
      return this.accessToken !== null;
    } // Try to get access token using refresh token cookie


    var hasToken = await this.startupRefresh();
    console.log('Startup refresh result:', hasToken);

    if (!hasToken) {
      // No valid refresh token → redirect to login
      console.log('No valid token - redirecting to login');
      window.location = "".concat(globalRootUrl, "session/index");
      return false;
    }

    console.log('TokenManager initialized successfully');
    this.isInitialized = true;
    return true;
  },

  /**
   * Startup refresh - get new access token using refresh token cookie
   * Called on page load to restore authentication state
   *
   * @returns {Promise<boolean>} true if refresh successful
   */
  startupRefresh: async function startupRefresh() {
    console.log('TokenManager.startupRefresh() called');

    if (this.isRefreshing) {
      console.log('Already refreshing, skipping');
      return false;
    }

    this.isRefreshing = true;

    try {
      console.log('Calling /auth:refresh to get access token');
      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:refresh',
        method: 'POST',
        dataType: 'json',
        // Don't send Authorization header (using refresh cookie)
        headers: {}
      });
      console.log('Refresh response:', response);

      if (response.result && response.data && response.data.accessToken) {
        console.log('Got access token, expires in:', response.data.expiresIn);
        this.setAccessToken(response.data.accessToken, response.data.expiresIn);
        return true;
      } else {
        console.log('Refresh token expired or invalid - no accessToken in response');
        return false;
      }
    } catch (error) {
      console.log('Refresh failed:', error.status, error.statusText, error.responseJSON);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  },

  /**
   * Store access token in memory and schedule silent refresh
   *
   * @param {string} token JWT access token
   * @param {number} expiresIn Token lifetime in seconds
   */
  setAccessToken: function setAccessToken(token, expiresIn) {
    var _this = this;

    console.log('Setting access token, expires in:', expiresIn, 'seconds');
    this.accessToken = token; // Clear existing timer

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    } // Schedule silent refresh 2 minutes before expiration
    // Default: 900s (15 min) - 120s = 780s (13 min)


    var refreshAt = Math.max(expiresIn - 120, 60) * 1000;
    console.log('Silent refresh scheduled in:', refreshAt / 1000, 'seconds');
    this.refreshTimer = setTimeout(function () {
      _this.silentRefresh();
    }, refreshAt);
  },

  /**
   * Silent refresh - update access token before it expires
   * Automatically called by timer, transparent to user
   */
  silentRefresh: async function silentRefresh() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:refresh',
        method: 'POST',
        dataType: 'json',
        // Don't send Authorization header (using refresh cookie)
        headers: {}
      });

      if (response.result && response.data && response.data.accessToken) {
        this.setAccessToken(response.data.accessToken, response.data.expiresIn);
      } else {
        // Refresh failed → logout
        this.logout();
      }
    } catch (error) {
      console.error('Silent refresh failed:', error); // Refresh failed → logout

      this.logout();
    } finally {
      this.isRefreshing = false;
    }
  },

  /**
   * Set up global AJAX interceptor
   * Automatically adds Authorization: Bearer header to all AJAX requests
   * Handles 401 errors by logging out
   */
  setupGlobalAjax: function setupGlobalAjax() {
    var self = this; // Store original $.ajax

    var originalAjax = $.ajax; // Wrap $.ajax to wait for token initialization

    $.ajax = function (url, options) {
      var _this2 = this;

      // Handle both $.ajax(url, options) and $.ajax(options) signatures
      if (_typeof(url) === 'object') {
        options = url;
        url = undefined;
      } // Skip auth endpoints (they use refresh cookie, not access token)


      var requestUrl = url || options.url || '';

      if (requestUrl.includes('/auth:login') || requestUrl.includes('/auth:refresh')) {
        return originalAjax.apply(this, arguments);
      } // Wait for TokenManager initialization before proceeding


      if (window.tokenManagerReady) {
        // Create jQuery Deferred to maintain compatibility with jQuery code
        var deferred = $.Deferred();
        window.tokenManagerReady.then(function () {
          // Add Authorization header
          options = options || {};
          options.headers = options.headers || {};

          if (self.accessToken && !options.headers.Authorization) {
            options.headers.Authorization = "Bearer ".concat(self.accessToken);
          } // Call original $.ajax and forward its result to our deferred


          var jqXHR = url ? originalAjax.call(_this2, url, options) : originalAjax.call(_this2, options); // Forward all callbacks

          jqXHR.done(function () {
            return deferred.resolve.apply(deferred, arguments);
          }).fail(function () {
            return deferred.reject.apply(deferred, arguments);
          });
        })["catch"](function (error) {
          console.error('TokenManager initialization failed:', error);
          deferred.reject(error);
        });
        return deferred.promise();
      } // TokenManager not initialized yet - proceed without token
      // (this should only happen on login page)


      return originalAjax.apply(this, arguments);
    }; // Also set up error handler


    $(document).ajaxError(function (event, xhr, settings) {
      // Handle unauthorized errors
      if (xhr.status === 401) {
        // Check if we're on login page - don't trigger logout loop
        var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

        if (!isLoginPage) {
          // Token expired or invalid → logout
          self.logout();
        }
      }
    }); // Wrap Semantic UI $.api() if available
    // This is needed because some modules use $.api() instead of $.ajax()

    if ($.fn.api) {
      var originalApi = $.fn.api;

      $.fn.api = function (settings) {
        // Get settings
        var config = settings || {}; // Skip auth endpoints

        var url = config.url || '';

        if (url.includes('/auth:login') || url.includes('/auth:refresh')) {
          return originalApi.call(this, settings);
        } // Wrap beforeSend to add Authorization header


        var originalBeforeSend = config.beforeSend;

        config.beforeSend = function (settings) {
          var _this3 = this;

          // Wait for TokenManager if available
          if (window.tokenManagerReady) {
            var deferred = $.Deferred();
            window.tokenManagerReady.then(function () {
              // Add Authorization header
              settings.beforeXHR = function (xhr) {
                if (self.accessToken) {
                  xhr.setRequestHeader('Authorization', "Bearer ".concat(self.accessToken));
                }
              }; // Call original beforeSend if exists


              if (originalBeforeSend) {
                originalBeforeSend.call(_this3, settings);
              }

              deferred.resolve(settings);
            });
            return deferred.promise();
          } // Call original beforeSend


          if (originalBeforeSend) {
            return originalBeforeSend.call(this, settings);
          }

          return settings;
        };

        return originalApi.call(this, config);
      };
    }
  },

  /**
   * Logout - clear tokens and redirect to login
   * - Calls REST API to invalidate refresh token
   * - Clears access token from memory
   * - Deletes refreshToken cookie from browser
   * - Redirects to login page
   */
  logout: async function logout() {
    console.log('TokenManager.logout() called'); // Check if already on login page - prevent redirect loop

    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (isLoginPage) {
      console.log('Already on login page - clearing state and cookie'); // Already on login page - clear state

      this.accessToken = null;

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      } // CRITICAL: Clear httpOnly cookie via server-side AJAX endpoint
      // This prevents authentication loop when refreshToken exists but is expired


      $.ajax({
        url: "".concat(globalRootUrl, "session/end"),
        method: 'POST',
        async: false,
        // Synchronous to ensure cookie is cleared
        success: function success() {
          console.log('Cookie cleared via /session/end');
        },
        error: function error(_jqXHR, status, _error) {
          console.log('Error clearing cookie:', status, _error);
        }
      });
      return;
    } // Prevent multiple logout calls


    if (!this.accessToken) {
      console.log('No access token - clearing cookie via /session/end'); // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect

      try {
        $.ajax({
          url: "".concat(globalRootUrl, "session/end"),
          method: 'POST',
          async: false,
          // Synchronous to ensure cookie is cleared before redirect
          success: function success() {
            console.log('Cookie cleared via /session/end');
          }
        });
      } catch (e) {
        console.log('Error clearing cookie:', e);
      }

      window.location = "".concat(globalRootUrl, "session/index");
      return;
    }

    try {
      // Call logout endpoint to invalidate refresh token in Redis
      console.log('Calling /auth:logout API');
      await $.ajax({
        url: '/pbxcore/api/v3/auth:logout',
        method: 'POST',
        headers: {
          Authorization: "Bearer ".concat(this.accessToken)
        }
      });
      console.log('Logout API call successful');
    } catch (error) {
      console.log('Logout API error:', error.status, error.statusText); // If API fails (e.g., 401 with expired token), we still need to clear the cookie
      // Use server-side session/end endpoint as fallback to clear httpOnly cookie

      console.log('Using /session/end fallback to clear cookie');
    } // Clear local state


    this.accessToken = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    } // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
    // This prevents authentication loop when refreshToken cookie exists but is expired


    console.log('Redirecting to /session/end to clear cookie');
    window.location = "".concat(globalRootUrl, "session/end");
  },

  /**
   * Delete refreshToken cookie from browser
   *
   * IMPORTANT: httpOnly cookies CANNOT be deleted via JavaScript (document.cookie).
   * They can only be cleared by the server via Set-Cookie header.
   *
   * The /auth:logout endpoint handles cookie deletion on server side.
   * This method exists for non-httpOnly fallback scenarios only.
   *
   * For httpOnly cookies, we rely on:
   * 1. Server-side cookie deletion in /auth:logout response
   * 2. SessionController.endAction() which also clears the cookie
   */
  deleteRefreshTokenCookie: function deleteRefreshTokenCookie() {
    console.log('Attempting to delete refreshToken cookie (client-side)'); // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback

    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'; // For HTTPS (secure flag)

    if (window.location.protocol === 'https:') {
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
    }

    console.log('Client-side cookie deletion attempted (httpOnly cookies require server-side deletion)');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} true if access token exists
   */
  isAuthenticated: function isAuthenticated() {
    return this.accessToken !== null;
  }
}; // Export for use in other modules

window.TokenManager = TokenManager; // CRITICAL: Set up AJAX interceptor IMMEDIATELY on script load
// This ensures ALL AJAX requests wait for TokenManager initialization
// even if they're fired before $(document).ready()

TokenManager.setupGlobalAjax(); // CRITICAL: Create tokenManagerReady promise IMMEDIATELY
// Check if we're on login page - if not, start initialization right away
// This ensures the promise exists before ANY other script runs

if (typeof window !== 'undefined') {
  // Prevent multiple initializations on the same page
  if (!window.tokenManagerReady) {
    console.log('Creating tokenManagerReady promise');
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (!isLoginPage) {
      // Not login page - start TokenManager initialization immediately
      // This happens BEFORE $(document).ready, ensuring token is ready ASAP
      window.tokenManagerReady = TokenManager.initialize();
    } else {
      // Login page - resolve immediately (no authentication needed)
      window.tokenManagerReady = Promise.resolve(true);
    }
  } else {
    console.log('tokenManagerReady already exists, skipping initialization');
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImNvbnNvbGUiLCJsb2ciLCJoYXNUb2tlbiIsInN0YXJ0dXBSZWZyZXNoIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicmVzcG9uc2UiLCIkIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiaGVhZGVycyIsInJlc3VsdCIsImRhdGEiLCJleHBpcmVzSW4iLCJzZXRBY2Nlc3NUb2tlbiIsImVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlSlNPTiIsInRva2VuIiwiY2xlYXJUaW1lb3V0IiwicmVmcmVzaEF0IiwiTWF0aCIsIm1heCIsInNldFRpbWVvdXQiLCJzaWxlbnRSZWZyZXNoIiwibG9nb3V0Iiwic2V0dXBHbG9iYWxBamF4Iiwic2VsZiIsIm9yaWdpbmFsQWpheCIsIm9wdGlvbnMiLCJ1bmRlZmluZWQiLCJyZXF1ZXN0VXJsIiwiaW5jbHVkZXMiLCJhcHBseSIsImFyZ3VtZW50cyIsInRva2VuTWFuYWdlclJlYWR5IiwiZGVmZXJyZWQiLCJEZWZlcnJlZCIsInRoZW4iLCJBdXRob3JpemF0aW9uIiwianFYSFIiLCJjYWxsIiwiZG9uZSIsInJlc29sdmUiLCJmYWlsIiwicmVqZWN0IiwicHJvbWlzZSIsImRvY3VtZW50IiwiYWpheEVycm9yIiwiZXZlbnQiLCJ4aHIiLCJzZXR0aW5ncyIsImlzTG9naW5QYWdlIiwicGF0aG5hbWUiLCJmbiIsImFwaSIsIm9yaWdpbmFsQXBpIiwiY29uZmlnIiwib3JpZ2luYWxCZWZvcmVTZW5kIiwiYmVmb3JlU2VuZCIsImJlZm9yZVhIUiIsInNldFJlcXVlc3RIZWFkZXIiLCJhc3luYyIsInN1Y2Nlc3MiLCJfanFYSFIiLCJlIiwiZGVsZXRlUmVmcmVzaFRva2VuQ29va2llIiwiY29va2llIiwicHJvdG9jb2wiLCJpc0F1dGhlbnRpY2F0ZWQiLCJQcm9taXNlIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQUxJOztBQU9qQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFYRzs7QUFhakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLEtBakJHOztBQW1CakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEtBdkJFOztBQXlCakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDVUMsRUFBQUEsVUFuQ1csOEJBbUNFO0FBQ2ZDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGtDQUFaLEVBRGUsQ0FHZjs7QUFDQSxRQUFJLEtBQUtILGFBQVQsRUFBd0I7QUFDcEJFLE1BQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDRDQUFaO0FBQ0EsYUFBTyxLQUFLTixXQUFMLEtBQXFCLElBQTVCO0FBQ0gsS0FQYyxDQVNmOzs7QUFDQSxRQUFNTyxRQUFRLEdBQUcsTUFBTSxLQUFLQyxjQUFMLEVBQXZCO0FBRUFILElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHlCQUFaLEVBQXVDQyxRQUF2Qzs7QUFFQSxRQUFJLENBQUNBLFFBQUwsRUFBZTtBQUNYO0FBQ0FGLE1BQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHVDQUFaO0FBQ0FHLE1BQUFBLE1BQU0sQ0FBQ0MsUUFBUCxh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RkFBWjtBQUNILEdBNVpnQjs7QUE4WmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3RSxFQUFBQSxlQWxhaUIsNkJBa2FDO0FBQ2QsV0FBTyxLQUFLOUUsV0FBTCxLQUFxQixJQUE1QjtBQUNIO0FBcGFnQixDQUFyQixDLENBdWFBOztBQUNBUyxNQUFNLENBQUNWLFlBQVAsR0FBc0JBLFlBQXRCLEMsQ0FFQTtBQUNBO0FBQ0E7O0FBQ0FBLFlBQVksQ0FBQ29DLGVBQWIsRyxDQUVBO0FBQ0E7QUFDQTs7QUFDQSxJQUFJLE9BQU8xQixNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQy9CO0FBQ0EsTUFBSSxDQUFDQSxNQUFNLENBQUNtQyxpQkFBWixFQUErQjtBQUMzQnZDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG9DQUFaO0FBRUEsUUFBTXVELFdBQVcsR0FBR3BELE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQm9ELFFBQWhCLENBQXlCckIsUUFBekIsQ0FBa0MsZ0JBQWxDLEtBQ0RoQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JvRCxRQUFoQixDQUF5QnJCLFFBQXpCLENBQWtDLFdBQWxDLENBRG5COztBQUdBLFFBQUksQ0FBQ29CLFdBQUwsRUFBa0I7QUFDZDtBQUNBO0FBQ0FwRCxNQUFBQSxNQUFNLENBQUNtQyxpQkFBUCxHQUEyQjdDLFlBQVksQ0FBQ0ssVUFBYixFQUEzQjtBQUNILEtBSkQsTUFJTztBQUNIO0FBQ0FLLE1BQUFBLE1BQU0sQ0FBQ21DLGlCQUFQLEdBQTJCbUMsT0FBTyxDQUFDM0IsT0FBUixDQUFnQixJQUFoQixDQUEzQjtBQUNIO0FBQ0osR0FkRCxNQWNPO0FBQ0gvQyxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSwyREFBWjtBQUNIO0FBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG4vKipcbiAqIFRva2VuTWFuYWdlciAtIG1hbmFnZXMgSldUIGF1dGhlbnRpY2F0aW9uIHRva2Vuc1xuICpcbiAqIFNlY3VyaXR5IGFyY2hpdGVjdHVyZTpcbiAqIC0gQWNjZXNzIHRva2VuIChKV1QsIDE1IG1pbikgc3RvcmVkIGluIE1FTU9SWSAobm90IGxvY2FsU3RvcmFnZSAtIFhTUyBwcm90ZWN0aW9uKVxuICogLSBSZWZyZXNoIHRva2VuICgzMCBkYXlzKSBzdG9yZWQgaW4gaHR0cE9ubHkgY29va2llIChYU1MgcHJvdGVjdGlvbilcbiAqIC0gU2lsZW50IHJlZnJlc2ggdGltZXIgdXBkYXRlcyBhY2Nlc3MgdG9rZW4gYmVmb3JlIGV4cGlyYXRpb25cbiAqIC0gQWxsIEFKQVggcmVxdWVzdHMgYXV0b21hdGljYWxseSBpbmNsdWRlIEF1dGhvcml6YXRpb246IEJlYXJlciBoZWFkZXJcbiAqXG4gKiBAbW9kdWxlIFRva2VuTWFuYWdlclxuICovXG5jb25zdCBUb2tlbk1hbmFnZXIgPSB7XG4gICAgLyoqXG4gICAgICogQWNjZXNzIHRva2VuIChKV1QpIHN0b3JlZCBpbiBtZW1vcnkgLSBORVZFUiBpbiBsb2NhbFN0b3JhZ2Uvc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgYWNjZXNzVG9rZW46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lciBmb3Igc2lsZW50IHRva2VuIHJlZnJlc2hcbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgcmVmcmVzaFRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIHNpbXVsdGFuZW91cyByZWZyZXNoIGF0dGVtcHRzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNSZWZyZXNoaW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVG9rZW5NYW5hZ2VyXG4gICAgICogLSBBdHRlbXB0cyB0byByZWZyZXNoIGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqIC0gUmVkaXJlY3RzIHRvIGxvZ2luIGlmIG5vIHZhbGlkIHJlZnJlc2ggdG9rZW5cbiAgICAgKlxuICAgICAqIE5vdGU6IHNldHVwR2xvYmFsQWpheCgpIGlzIGNhbGxlZCBhdXRvbWF0aWNhbGx5IG9uIHNjcmlwdCBsb2FkLFxuICAgICAqIG5vdCBoZXJlLCB0byBlbnN1cmUgaXQncyBhY3RpdmUgYmVmb3JlIEFOWSBBSkFYIHJlcXVlc3RzIGFyZSBtYWRlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IHRydWUgaWYgYXV0aGVudGljYXRpb24gc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUb2tlbk1hbmFnZXIuaW5pdGlhbGl6ZSgpIGNhbGxlZCcpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUb2tlbk1hbmFnZXIgYWxyZWFkeSBpbml0aWFsaXplZCwgc2tpcHBpbmcnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFjY2Vzc1Rva2VuICE9PSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJ5IHRvIGdldCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgICAgY29uc3QgaGFzVG9rZW4gPSBhd2FpdCB0aGlzLnN0YXJ0dXBSZWZyZXNoKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1N0YXJ0dXAgcmVmcmVzaCByZXN1bHQ6JywgaGFzVG9rZW4pO1xuXG4gICAgICAgIGlmICghaGFzVG9rZW4pIHtcbiAgICAgICAgICAgIC8vIE5vIHZhbGlkIHJlZnJlc2ggdG9rZW4g4oaSIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTm8gdmFsaWQgdG9rZW4gLSByZWRpcmVjdGluZyB0byBsb2dpbicpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdUb2tlbk1hbmFnZXIgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHVwIHJlZnJlc2ggLSBnZXQgbmV3IGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqIENhbGxlZCBvbiBwYWdlIGxvYWQgdG8gcmVzdG9yZSBhdXRoZW50aWNhdGlvbiBzdGF0ZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IHRydWUgaWYgcmVmcmVzaCBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgc3RhcnR1cFJlZnJlc2goKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUb2tlbk1hbmFnZXIuc3RhcnR1cFJlZnJlc2goKSBjYWxsZWQnKTtcblxuICAgICAgICBpZiAodGhpcy5pc1JlZnJlc2hpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBbHJlYWR5IHJlZnJlc2hpbmcsIHNraXBwaW5nJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDYWxsaW5nIC9hdXRoOnJlZnJlc2ggdG8gZ2V0IGFjY2VzcyB0b2tlbicpO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2VuZCBBdXRob3JpemF0aW9uIGhlYWRlciAodXNpbmcgcmVmcmVzaCBjb29raWUpXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge31cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVmcmVzaCByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0dvdCBhY2Nlc3MgdG9rZW4sIGV4cGlyZXMgaW46JywgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlZnJlc2ggdG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkIC0gbm8gYWNjZXNzVG9rZW4gaW4gcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVmcmVzaCBmYWlsZWQ6JywgZXJyb3Iuc3RhdHVzLCBlcnJvci5zdGF0dXNUZXh0LCBlcnJvci5yZXNwb25zZUpTT04pO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBhY2Nlc3MgdG9rZW4gaW4gbWVtb3J5IGFuZCBzY2hlZHVsZSBzaWxlbnQgcmVmcmVzaFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIEpXVCBhY2Nlc3MgdG9rZW5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZXhwaXJlc0luIFRva2VuIGxpZmV0aW1lIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBzZXRBY2Nlc3NUb2tlbih0b2tlbiwgZXhwaXJlc0luKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nIGFjY2VzcyB0b2tlbiwgZXhwaXJlcyBpbjonLCBleHBpcmVzSW4sICdzZWNvbmRzJyk7XG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbjtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTY2hlZHVsZSBzaWxlbnQgcmVmcmVzaCAyIG1pbnV0ZXMgYmVmb3JlIGV4cGlyYXRpb25cbiAgICAgICAgLy8gRGVmYXVsdDogOTAwcyAoMTUgbWluKSAtIDEyMHMgPSA3ODBzICgxMyBtaW4pXG4gICAgICAgIGNvbnN0IHJlZnJlc2hBdCA9IE1hdGgubWF4KChleHBpcmVzSW4gLSAxMjApLCA2MCkgKiAxMDAwO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdTaWxlbnQgcmVmcmVzaCBzY2hlZHVsZWQgaW46JywgcmVmcmVzaEF0IC8gMTAwMCwgJ3NlY29uZHMnKTtcblxuICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zaWxlbnRSZWZyZXNoKCk7XG4gICAgICAgIH0sIHJlZnJlc2hBdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNpbGVudCByZWZyZXNoIC0gdXBkYXRlIGFjY2VzcyB0b2tlbiBiZWZvcmUgaXQgZXhwaXJlc1xuICAgICAqIEF1dG9tYXRpY2FsbHkgY2FsbGVkIGJ5IHRpbWVyLCB0cmFuc3BhcmVudCB0byB1c2VyXG4gICAgICovXG4gICAgYXN5bmMgc2lsZW50UmVmcmVzaCgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWZyZXNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHNlbmQgQXV0aG9yaXphdGlvbiBoZWFkZXIgKHVzaW5nIHJlZnJlc2ggY29va2llKVxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmV4cGlyZXNJblxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggZmFpbGVkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lsZW50IHJlZnJlc2ggZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIFJlZnJlc2ggZmFpbGVkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgIHRoaXMubG9nb3V0KCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCB1cCBnbG9iYWwgQUpBWCBpbnRlcmNlcHRvclxuICAgICAqIEF1dG9tYXRpY2FsbHkgYWRkcyBBdXRob3JpemF0aW9uOiBCZWFyZXIgaGVhZGVyIHRvIGFsbCBBSkFYIHJlcXVlc3RzXG4gICAgICogSGFuZGxlcyA0MDEgZXJyb3JzIGJ5IGxvZ2dpbmcgb3V0XG4gICAgICovXG4gICAgc2V0dXBHbG9iYWxBamF4KCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCAkLmFqYXhcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxBamF4ID0gJC5hamF4O1xuXG4gICAgICAgIC8vIFdyYXAgJC5hamF4IHRvIHdhaXQgZm9yIHRva2VuIGluaXRpYWxpemF0aW9uXG4gICAgICAgICQuYWpheCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggJC5hamF4KHVybCwgb3B0aW9ucykgYW5kICQuYWpheChvcHRpb25zKSBzaWduYXR1cmVzXG4gICAgICAgICAgICBpZiAodHlwZW9mIHVybCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gdXJsO1xuICAgICAgICAgICAgICAgIHVybCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2tpcCBhdXRoIGVuZHBvaW50cyAodGhleSB1c2UgcmVmcmVzaCBjb29raWUsIG5vdCBhY2Nlc3MgdG9rZW4pXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0VXJsID0gdXJsIHx8IG9wdGlvbnMudXJsIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOmxvZ2luJykgfHwgcmVxdWVzdFVybC5pbmNsdWRlcygnL2F1dGg6cmVmcmVzaCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQWpheC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gYmVmb3JlIHByb2NlZWRpbmdcbiAgICAgICAgICAgIGlmICh3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgalF1ZXJ5IERlZmVycmVkIHRvIG1haW50YWluIGNvbXBhdGliaWxpdHkgd2l0aCBqUXVlcnkgY29kZVxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4gJiYgIW9wdGlvbnMuaGVhZGVycy5BdXRob3JpemF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIG9yaWdpbmFsICQuYWpheCBhbmQgZm9yd2FyZCBpdHMgcmVzdWx0IHRvIG91ciBkZWZlcnJlZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqcVhIUiA9IHVybCA/IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIHVybCwgb3B0aW9ucykgOiBvcmlnaW5hbEFqYXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3J3YXJkIGFsbCBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICAgICAganFYSFIuZG9uZSgoLi4uYXJncykgPT4gZGVmZXJyZWQucmVzb2x2ZSguLi5hcmdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmFpbCgoLi4uYXJncykgPT4gZGVmZXJyZWQucmVqZWN0KC4uLmFyZ3MpKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRva2VuTWFuYWdlciBub3QgaW5pdGlhbGl6ZWQgeWV0IC0gcHJvY2VlZCB3aXRob3V0IHRva2VuXG4gICAgICAgICAgICAvLyAodGhpcyBzaG91bGQgb25seSBoYXBwZW4gb24gbG9naW4gcGFnZSlcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBbHNvIHNldCB1cCBlcnJvciBoYW5kbGVyXG4gICAgICAgICQoZG9jdW1lbnQpLmFqYXhFcnJvcigoZXZlbnQsIHhociwgc2V0dGluZ3MpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB1bmF1dGhvcml6ZWQgZXJyb3JzXG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgb24gbG9naW4gcGFnZSAtIGRvbid0IHRyaWdnZXIgbG9nb3V0IGxvb3BcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUb2tlbiBleHBpcmVkIG9yIGludmFsaWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ291dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV3JhcCBTZW1hbnRpYyBVSSAkLmFwaSgpIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBUaGlzIGlzIG5lZWRlZCBiZWNhdXNlIHNvbWUgbW9kdWxlcyB1c2UgJC5hcGkoKSBpbnN0ZWFkIG9mICQuYWpheCgpXG4gICAgICAgIGlmICgkLmZuLmFwaSkge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxBcGkgPSAkLmZuLmFwaTtcbiAgICAgICAgICAgICQuZm4uYXBpID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgc2V0dGluZ3NcbiAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBzZXR0aW5ncyB8fCB7fTtcblxuICAgICAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHNcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBjb25maWcudXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGlmICh1cmwuaW5jbHVkZXMoJy9hdXRoOmxvZ2luJykgfHwgdXJsLmluY2x1ZGVzKCcvYXV0aDpyZWZyZXNoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQXBpLmNhbGwodGhpcywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdyYXAgYmVmb3JlU2VuZCB0byBhZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbEJlZm9yZVNlbmQgPSBjb25maWcuYmVmb3JlU2VuZDtcbiAgICAgICAgICAgICAgICBjb25maWcuYmVmb3JlU2VuZCA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdhaXQgZm9yIFRva2VuTWFuYWdlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5iZWZvcmVYSFIgPSBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3NlbGYuYWNjZXNzVG9rZW59YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCBiZWZvcmVTZW5kIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbEJlZm9yZVNlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxCZWZvcmVTZW5kLmNhbGwodGhpcywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIG9yaWdpbmFsIGJlZm9yZVNlbmRcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsQmVmb3JlU2VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQmVmb3JlU2VuZC5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFwaS5jYWxsKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvZ291dCAtIGNsZWFyIHRva2VucyBhbmQgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgKiAtIENhbGxzIFJFU1QgQVBJIHRvIGludmFsaWRhdGUgcmVmcmVzaCB0b2tlblxuICAgICAqIC0gQ2xlYXJzIGFjY2VzcyB0b2tlbiBmcm9tIG1lbW9yeVxuICAgICAqIC0gRGVsZXRlcyByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqIC0gUmVkaXJlY3RzIHRvIGxvZ2luIHBhZ2VcbiAgICAgKi9cbiAgICBhc3luYyBsb2dvdXQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUb2tlbk1hbmFnZXIubG9nb3V0KCkgY2FsbGVkJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBvbiBsb2dpbiBwYWdlIC0gcHJldmVudCByZWRpcmVjdCBsb29wXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmIChpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FscmVhZHkgb24gbG9naW4gcGFnZSAtIGNsZWFyaW5nIHN0YXRlIGFuZCBjb29raWUnKTtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgb24gbG9naW4gcGFnZSAtIGNsZWFyIHN0YXRlXG4gICAgICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBBSkFYIGVuZHBvaW50XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gZXhpc3RzIGJ1dCBpcyBleHBpcmVkXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGAsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb29raWUgY2xlYXJlZCB2aWEgL3Nlc3Npb24vZW5kJyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKF9qcVhIUiwgc3RhdHVzLCBlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgY2xlYXJpbmcgY29va2llOicsIHN0YXR1cywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBsb2dvdXQgY2FsbHNcbiAgICAgICAgaWYgKCF0aGlzLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTm8gYWNjZXNzIHRva2VuIC0gY2xlYXJpbmcgY29va2llIHZpYSAvc2Vzc2lvbi9lbmQnKTtcbiAgICAgICAgICAgIC8vIENSSVRJQ0FMOiBDbGVhciBodHRwT25seSBjb29raWUgdmlhIHNlcnZlci1zaWRlIGVuZHBvaW50IGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWQgYmVmb3JlIHJlZGlyZWN0XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb29raWUgY2xlYXJlZCB2aWEgL3Nlc3Npb24vZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgY2xlYXJpbmcgY29va2llOicsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDYWxsIGxvZ291dCBlbmRwb2ludCB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW4gaW4gUmVkaXNcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDYWxsaW5nIC9hdXRoOmxvZ291dCBBUEknKTtcbiAgICAgICAgICAgIGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9nb3V0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmFjY2Vzc1Rva2VufWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2dvdXQgQVBJIGNhbGwgc3VjY2Vzc2Z1bCcpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0xvZ291dCBBUEkgZXJyb3I6JywgZXJyb3Iuc3RhdHVzLCBlcnJvci5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgIC8vIElmIEFQSSBmYWlscyAoZS5nLiwgNDAxIHdpdGggZXhwaXJlZCB0b2tlbiksIHdlIHN0aWxsIG5lZWQgdG8gY2xlYXIgdGhlIGNvb2tpZVxuICAgICAgICAgICAgLy8gVXNlIHNlcnZlci1zaWRlIHNlc3Npb24vZW5kIGVuZHBvaW50IGFzIGZhbGxiYWNrIHRvIGNsZWFyIGh0dHBPbmx5IGNvb2tpZVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIC9zZXNzaW9uL2VuZCBmYWxsYmFjayB0byBjbGVhciBjb29raWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGxvY2FsIHN0YXRlXG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDUklUSUNBTDogUmVkaXJlY3QgdG8gL3Nlc3Npb24vZW5kIHdoaWNoIGNsZWFycyBodHRwT25seSBjb29raWUgc2VydmVyLXNpZGVcbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhdXRoZW50aWNhdGlvbiBsb29wIHdoZW4gcmVmcmVzaFRva2VuIGNvb2tpZSBleGlzdHMgYnV0IGlzIGV4cGlyZWRcbiAgICAgICAgY29uc29sZS5sb2coJ1JlZGlyZWN0aW5nIHRvIC9zZXNzaW9uL2VuZCB0byBjbGVhciBjb29raWUnKTtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqXG4gICAgICogSU1QT1JUQU5UOiBodHRwT25seSBjb29raWVzIENBTk5PVCBiZSBkZWxldGVkIHZpYSBKYXZhU2NyaXB0IChkb2N1bWVudC5jb29raWUpLlxuICAgICAqIFRoZXkgY2FuIG9ubHkgYmUgY2xlYXJlZCBieSB0aGUgc2VydmVyIHZpYSBTZXQtQ29va2llIGhlYWRlci5cbiAgICAgKlxuICAgICAqIFRoZSAvYXV0aDpsb2dvdXQgZW5kcG9pbnQgaGFuZGxlcyBjb29raWUgZGVsZXRpb24gb24gc2VydmVyIHNpZGUuXG4gICAgICogVGhpcyBtZXRob2QgZXhpc3RzIGZvciBub24taHR0cE9ubHkgZmFsbGJhY2sgc2NlbmFyaW9zIG9ubHkuXG4gICAgICpcbiAgICAgKiBGb3IgaHR0cE9ubHkgY29va2llcywgd2UgcmVseSBvbjpcbiAgICAgKiAxLiBTZXJ2ZXItc2lkZSBjb29raWUgZGVsZXRpb24gaW4gL2F1dGg6bG9nb3V0IHJlc3BvbnNlXG4gICAgICogMi4gU2Vzc2lvbkNvbnRyb2xsZXIuZW5kQWN0aW9uKCkgd2hpY2ggYWxzbyBjbGVhcnMgdGhlIGNvb2tpZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0F0dGVtcHRpbmcgdG8gZGVsZXRlIHJlZnJlc2hUb2tlbiBjb29raWUgKGNsaWVudC1zaWRlKScpO1xuXG4gICAgICAgIC8vIE5PVEU6IFRoaXMgd29uJ3Qgd29yayBmb3IgaHR0cE9ubHkgY29va2llcywgYnV0IHRyeSBhbnl3YXkgZm9yIG5vbi1odHRwT25seSBmYWxsYmFja1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBTYW1lU2l0ZT1TdHJpY3QnO1xuXG4gICAgICAgIC8vIEZvciBIVFRQUyAoc2VjdXJlIGZsYWcpXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBzZWN1cmU7IFNhbWVTaXRlPVN0cmljdCc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnQ2xpZW50LXNpZGUgY29va2llIGRlbGV0aW9uIGF0dGVtcHRlZCAoaHR0cE9ubHkgY29va2llcyByZXF1aXJlIHNlcnZlci1zaWRlIGRlbGV0aW9uKScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY2Nlc3MgdG9rZW4gZXhpc3RzXG4gICAgICovXG4gICAgaXNBdXRoZW50aWNhdGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuVG9rZW5NYW5hZ2VyID0gVG9rZW5NYW5hZ2VyO1xuXG4vLyBDUklUSUNBTDogU2V0IHVwIEFKQVggaW50ZXJjZXB0b3IgSU1NRURJQVRFTFkgb24gc2NyaXB0IGxvYWRcbi8vIFRoaXMgZW5zdXJlcyBBTEwgQUpBWCByZXF1ZXN0cyB3YWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb25cbi8vIGV2ZW4gaWYgdGhleSdyZSBmaXJlZCBiZWZvcmUgJChkb2N1bWVudCkucmVhZHkoKVxuVG9rZW5NYW5hZ2VyLnNldHVwR2xvYmFsQWpheCgpO1xuXG4vLyBDUklUSUNBTDogQ3JlYXRlIHRva2VuTWFuYWdlclJlYWR5IHByb21pc2UgSU1NRURJQVRFTFlcbi8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBpZiBub3QsIHN0YXJ0IGluaXRpYWxpemF0aW9uIHJpZ2h0IGF3YXlcbi8vIFRoaXMgZW5zdXJlcyB0aGUgcHJvbWlzZSBleGlzdHMgYmVmb3JlIEFOWSBvdGhlciBzY3JpcHQgcnVuc1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gUHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnMgb24gdGhlIHNhbWUgcGFnZVxuICAgIGlmICghd2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyB0b2tlbk1hbmFnZXJSZWFkeSBwcm9taXNlJyk7XG5cbiAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vJyk7XG5cbiAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgLy8gTm90IGxvZ2luIHBhZ2UgLSBzdGFydCBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIC8vIFRoaXMgaGFwcGVucyBCRUZPUkUgJChkb2N1bWVudCkucmVhZHksIGVuc3VyaW5nIHRva2VuIGlzIHJlYWR5IEFTQVBcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFRva2VuTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2dpbiBwYWdlIC0gcmVzb2x2ZSBpbW1lZGlhdGVseSAobm8gYXV0aGVudGljYXRpb24gbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5ID0gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Rva2VuTWFuYWdlclJlYWR5IGFscmVhZHkgZXhpc3RzLCBza2lwcGluZyBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cbn1cbiJdfQ==