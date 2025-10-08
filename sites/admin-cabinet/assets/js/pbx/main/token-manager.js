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
    // Try to get access token using refresh token cookie
    var hasToken = await this.startupRefresh();

    if (!hasToken) {
      // No valid refresh token → redirect to login
      window.location = "".concat(globalRootUrl, "session/index");
      return false;
    }

    return true;
  },

  /**
   * Startup refresh - get new access token using refresh token cookie
   * Called on page load to restore authentication state
   *
   * @returns {Promise<boolean>} true if refresh successful
   */
  startupRefresh: async function startupRefresh() {
    if (this.isRefreshing) {
      return false;
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
        return true;
      } else {
        console.log('Refresh token expired or invalid');
        return false;
      }
    } catch (error) {
      console.log('No valid refresh token:', error);
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

    this.accessToken = token; // Clear existing timer

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    } // Schedule silent refresh 2 minutes before expiration
    // Default: 900s (15 min) - 120s = 780s (13 min)


    var refreshAt = Math.max(expiresIn - 120, 60) * 1000;
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
   * - Redirects to login page
   */
  logout: async function logout() {
    // Check if already on login page - prevent redirect loop
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (isLoginPage) {
      // Already on login page - just clear state, no redirect
      this.accessToken = null;

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      return;
    } // Prevent multiple logout calls


    if (!this.accessToken) {
      window.location = "".concat(globalRootUrl, "session/index");
      return;
    }

    try {
      // Call logout endpoint to invalidate refresh token
      await $.ajax({
        url: '/pbxcore/api/v3/auth:logout',
        method: 'POST',
        headers: {
          Authorization: "Bearer ".concat(this.accessToken)
        }
      });
    } catch (error) {
      console.log('Logout error (ignored):', error);
    } // Clear local state


    this.accessToken = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    } // Redirect to login page


    window.location = "".concat(globalRootUrl, "session/index");
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
  var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

  if (!isLoginPage) {
    // Not login page - start TokenManager initialization immediately
    // This happens BEFORE $(document).ready, ensuring token is ready ASAP
    window.tokenManagerReady = TokenManager.initialize();
  } else {
    // Login page - resolve immediately (no authentication needed)
    window.tokenManagerReady = Promise.resolve(true);
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpbml0aWFsaXplIiwiaGFzVG9rZW4iLCJzdGFydHVwUmVmcmVzaCIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsInJlc3BvbnNlIiwiJCIsImFqYXgiLCJ1cmwiLCJtZXRob2QiLCJkYXRhVHlwZSIsImhlYWRlcnMiLCJyZXN1bHQiLCJkYXRhIiwic2V0QWNjZXNzVG9rZW4iLCJleHBpcmVzSW4iLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJ0b2tlbiIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsInNldHVwR2xvYmFsQWpheCIsInNlbGYiLCJvcmlnaW5hbEFqYXgiLCJvcHRpb25zIiwidW5kZWZpbmVkIiwicmVxdWVzdFVybCIsImluY2x1ZGVzIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJ0b2tlbk1hbmFnZXJSZWFkeSIsImRlZmVycmVkIiwiRGVmZXJyZWQiLCJ0aGVuIiwiQXV0aG9yaXphdGlvbiIsImpxWEhSIiwiY2FsbCIsImRvbmUiLCJyZXNvbHZlIiwiZmFpbCIsInJlamVjdCIsInByb21pc2UiLCJkb2N1bWVudCIsImFqYXhFcnJvciIsImV2ZW50IiwieGhyIiwic2V0dGluZ3MiLCJzdGF0dXMiLCJpc0xvZ2luUGFnZSIsInBhdGhuYW1lIiwiZm4iLCJhcGkiLCJvcmlnaW5hbEFwaSIsImNvbmZpZyIsIm9yaWdpbmFsQmVmb3JlU2VuZCIsImJlZm9yZVNlbmQiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiaXNBdXRoZW50aWNhdGVkIiwiUHJvbWlzZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QVAsR0FBMkI2QixPQUFPLENBQUNyQixPQUFSLENBQWdCLElBQWhCLENBQTNCO0FBQ0g7QUFDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbi8qKlxuICogVG9rZW5NYW5hZ2VyIC0gbWFuYWdlcyBKV1QgYXV0aGVudGljYXRpb24gdG9rZW5zXG4gKlxuICogU2VjdXJpdHkgYXJjaGl0ZWN0dXJlOlxuICogLSBBY2Nlc3MgdG9rZW4gKEpXVCwgMTUgbWluKSBzdG9yZWQgaW4gTUVNT1JZIChub3QgbG9jYWxTdG9yYWdlIC0gWFNTIHByb3RlY3Rpb24pXG4gKiAtIFJlZnJlc2ggdG9rZW4gKDMwIGRheXMpIHN0b3JlZCBpbiBodHRwT25seSBjb29raWUgKFhTUyBwcm90ZWN0aW9uKVxuICogLSBTaWxlbnQgcmVmcmVzaCB0aW1lciB1cGRhdGVzIGFjY2VzcyB0b2tlbiBiZWZvcmUgZXhwaXJhdGlvblxuICogLSBBbGwgQUpBWCByZXF1ZXN0cyBhdXRvbWF0aWNhbGx5IGluY2x1ZGUgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlclxuICpcbiAqIEBtb2R1bGUgVG9rZW5NYW5hZ2VyXG4gKi9cbmNvbnN0IFRva2VuTWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBBY2Nlc3MgdG9rZW4gKEpXVCkgc3RvcmVkIGluIG1lbW9yeSAtIE5FVkVSIGluIGxvY2FsU3RvcmFnZS9zZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBhY2Nlc3NUb2tlbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGZvciBzaWxlbnQgdG9rZW4gcmVmcmVzaFxuICAgICAqIEB0eXBlIHtudW1iZXJ8bnVsbH1cbiAgICAgKi9cbiAgICByZWZyZXNoVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgc2ltdWx0YW5lb3VzIHJlZnJlc2ggYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1JlZnJlc2hpbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBUb2tlbk1hbmFnZXJcbiAgICAgKiAtIEF0dGVtcHRzIHRvIHJlZnJlc2ggYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICogLSBSZWRpcmVjdHMgdG8gbG9naW4gaWYgbm8gdmFsaWQgcmVmcmVzaCB0b2tlblxuICAgICAqXG4gICAgICogTm90ZTogc2V0dXBHbG9iYWxBamF4KCkgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgb24gc2NyaXB0IGxvYWQsXG4gICAgICogbm90IGhlcmUsIHRvIGVuc3VyZSBpdCdzIGFjdGl2ZSBiZWZvcmUgQU5ZIEFKQVggcmVxdWVzdHMgYXJlIG1hZGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gdHJ1ZSBpZiBhdXRoZW50aWNhdGlvbiBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgICAgY29uc3QgaGFzVG9rZW4gPSBhd2FpdCB0aGlzLnN0YXJ0dXBSZWZyZXNoKCk7XG5cbiAgICAgICAgaWYgKCFoYXNUb2tlbikge1xuICAgICAgICAgICAgLy8gTm8gdmFsaWQgcmVmcmVzaCB0b2tlbiDihpIgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnR1cCByZWZyZXNoIC0gZ2V0IG5ldyBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiBDYWxsZWQgb24gcGFnZSBsb2FkIHRvIHJlc3RvcmUgYXV0aGVudGljYXRpb24gc3RhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIHJlZnJlc2ggc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGFzeW5jIHN0YXJ0dXBSZWZyZXNoKCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlZnJlc2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2VuZCBBdXRob3JpemF0aW9uIGhlYWRlciAodXNpbmcgcmVmcmVzaCBjb29raWUpXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge31cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlZnJlc2ggdG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05vIHZhbGlkIHJlZnJlc2ggdG9rZW46JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBhY2Nlc3MgdG9rZW4gaW4gbWVtb3J5IGFuZCBzY2hlZHVsZSBzaWxlbnQgcmVmcmVzaFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIEpXVCBhY2Nlc3MgdG9rZW5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZXhwaXJlc0luIFRva2VuIGxpZmV0aW1lIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBzZXRBY2Nlc3NUb2tlbih0b2tlbiwgZXhwaXJlc0luKSB7XG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbjtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTY2hlZHVsZSBzaWxlbnQgcmVmcmVzaCAyIG1pbnV0ZXMgYmVmb3JlIGV4cGlyYXRpb25cbiAgICAgICAgLy8gRGVmYXVsdDogOTAwcyAoMTUgbWluKSAtIDEyMHMgPSA3ODBzICgxMyBtaW4pXG4gICAgICAgIGNvbnN0IHJlZnJlc2hBdCA9IE1hdGgubWF4KChleHBpcmVzSW4gLSAxMjApLCA2MCkgKiAxMDAwO1xuXG4gICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNpbGVudFJlZnJlc2goKTtcbiAgICAgICAgfSwgcmVmcmVzaEF0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2lsZW50IHJlZnJlc2ggLSB1cGRhdGUgYWNjZXNzIHRva2VuIGJlZm9yZSBpdCBleHBpcmVzXG4gICAgICogQXV0b21hdGljYWxseSBjYWxsZWQgYnkgdGltZXIsIHRyYW5zcGFyZW50IHRvIHVzZXJcbiAgICAgKi9cbiAgICBhc3luYyBzaWxlbnRSZWZyZXNoKCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlZnJlc2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2VuZCBBdXRob3JpemF0aW9uIGhlYWRlciAodXNpbmcgcmVmcmVzaCBjb29raWUpXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge31cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBmYWlsZWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgICAgIHRoaXMubG9nb3V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaWxlbnQgcmVmcmVzaCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gUmVmcmVzaCBmYWlsZWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHVwIGdsb2JhbCBBSkFYIGludGVyY2VwdG9yXG4gICAgICogQXV0b21hdGljYWxseSBhZGRzIEF1dGhvcml6YXRpb246IEJlYXJlciBoZWFkZXIgdG8gYWxsIEFKQVggcmVxdWVzdHNcbiAgICAgKiBIYW5kbGVzIDQwMSBlcnJvcnMgYnkgbG9nZ2luZyBvdXRcbiAgICAgKi9cbiAgICBzZXR1cEdsb2JhbEFqYXgoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsICQuYWpheFxuICAgICAgICBjb25zdCBvcmlnaW5hbEFqYXggPSAkLmFqYXg7XG5cbiAgICAgICAgLy8gV3JhcCAkLmFqYXggdG8gd2FpdCBmb3IgdG9rZW4gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgJC5hamF4ID0gZnVuY3Rpb24odXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCAkLmFqYXgodXJsLCBvcHRpb25zKSBhbmQgJC5hamF4KG9wdGlvbnMpIHNpZ25hdHVyZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXJsID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB1cmw7XG4gICAgICAgICAgICAgICAgdXJsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTa2lwIGF1dGggZW5kcG9pbnRzICh0aGV5IHVzZSByZWZyZXNoIGNvb2tpZSwgbm90IGFjY2VzcyB0b2tlbilcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3RVcmwgPSB1cmwgfHwgb3B0aW9ucy51cmwgfHwgJyc7XG4gICAgICAgICAgICBpZiAocmVxdWVzdFVybC5pbmNsdWRlcygnL2F1dGg6bG9naW4nKSB8fCByZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpyZWZyZXNoJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIFRva2VuTWFuYWdlciBpbml0aWFsaXphdGlvbiBiZWZvcmUgcHJvY2VlZGluZ1xuICAgICAgICAgICAgaWYgKHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBqUXVlcnkgRGVmZXJyZWQgdG8gbWFpbnRhaW4gY29tcGF0aWJpbGl0eSB3aXRoIGpRdWVyeSBjb2RlXG4gICAgICAgICAgICAgICAgY29uc3QgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBBdXRob3JpemF0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5hY2Nlc3NUb2tlbiAmJiAhb3B0aW9ucy5oZWFkZXJzLkF1dGhvcml6YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVycy5BdXRob3JpemF0aW9uID0gYEJlYXJlciAke3NlbGYuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGwgb3JpZ2luYWwgJC5hamF4IGFuZCBmb3J3YXJkIGl0cyByZXN1bHQgdG8gb3VyIGRlZmVycmVkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpxWEhSID0gdXJsID8gb3JpZ2luYWxBamF4LmNhbGwodGhpcywgdXJsLCBvcHRpb25zKSA6IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcndhcmQgYWxsIGNhbGxiYWNrc1xuICAgICAgICAgICAgICAgICAgICBqcVhIUi5kb25lKCguLi5hcmdzKSA9PiBkZWZlcnJlZC5yZXNvbHZlKC4uLmFyZ3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5mYWlsKCguLi5hcmdzKSA9PiBkZWZlcnJlZC5yZWplY3QoLi4uYXJncykpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rva2VuTWFuYWdlciBpbml0aWFsaXphdGlvbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVG9rZW5NYW5hZ2VyIG5vdCBpbml0aWFsaXplZCB5ZXQgLSBwcm9jZWVkIHdpdGhvdXQgdG9rZW5cbiAgICAgICAgICAgIC8vICh0aGlzIHNob3VsZCBvbmx5IGhhcHBlbiBvbiBsb2dpbiBwYWdlKVxuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQWpheC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFsc28gc2V0IHVwIGVycm9yIGhhbmRsZXJcbiAgICAgICAgJChkb2N1bWVudCkuYWpheEVycm9yKChldmVudCwgeGhyLCBzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHVuYXV0aG9yaXplZCBlcnJvcnNcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSBvbiBsb2dpbiBwYWdlIC0gZG9uJ3QgdHJpZ2dlciBsb2dvdXQgbG9vcFxuICAgICAgICAgICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTG9naW5QYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRva2VuIGV4cGlyZWQgb3IgaW52YWxpZCDihpIgbG9nb3V0XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9nb3V0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXcmFwIFNlbWFudGljIFVJICQuYXBpKCkgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2Ugc29tZSBtb2R1bGVzIHVzZSAkLmFwaSgpIGluc3RlYWQgb2YgJC5hamF4KClcbiAgICAgICAgaWYgKCQuZm4uYXBpKSB7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEFwaSA9ICQuZm4uYXBpO1xuICAgICAgICAgICAgJC5mbi5hcGkgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEdldCBzZXR0aW5nc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IHNldHRpbmdzIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBhdXRoIGVuZHBvaW50c1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGNvbmZpZy51cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgaWYgKHVybC5pbmNsdWRlcygnL2F1dGg6bG9naW4nKSB8fCB1cmwuaW5jbHVkZXMoJy9hdXRoOnJlZnJlc2gnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBcGkuY2FsbCh0aGlzLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gV3JhcCBiZWZvcmVTZW5kIHRvIGFkZCBBdXRob3JpemF0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQmVmb3JlU2VuZCA9IGNvbmZpZy5iZWZvcmVTZW5kO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5iZWZvcmVTZW5kID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBBdXRob3JpemF0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmJlZm9yZVhIUiA9IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7c2VsZi5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIG9yaWdpbmFsIGJlZm9yZVNlbmQgaWYgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsQmVmb3JlU2VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEJlZm9yZVNlbmQuY2FsbCh0aGlzLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGwgb3JpZ2luYWwgYmVmb3JlU2VuZFxuICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxCZWZvcmVTZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxCZWZvcmVTZW5kLmNhbGwodGhpcywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQXBpLmNhbGwodGhpcywgY29uZmlnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9nb3V0IC0gY2xlYXIgdG9rZW5zIGFuZCByZWRpcmVjdCB0byBsb2dpblxuICAgICAqIC0gQ2FsbHMgUkVTVCBBUEkgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuXG4gICAgICogLSBDbGVhcnMgYWNjZXNzIHRva2VuIGZyb20gbWVtb3J5XG4gICAgICogLSBSZWRpcmVjdHMgdG8gbG9naW4gcGFnZVxuICAgICAqL1xuICAgIGFzeW5jIGxvZ291dCgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBvbiBsb2dpbiBwYWdlIC0gcHJldmVudCByZWRpcmVjdCBsb29wXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmIChpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBvbiBsb2dpbiBwYWdlIC0ganVzdCBjbGVhciBzdGF0ZSwgbm8gcmVkaXJlY3RcbiAgICAgICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVmcmVzaFRpbWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGxvZ291dCBjYWxsc1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsbCBsb2dvdXQgZW5kcG9pbnQgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuXG4gICAgICAgICAgICBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ291dCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5hY2Nlc3NUb2tlbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9nb3V0IGVycm9yIChpZ25vcmVkKTonLCBlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBsb2NhbCBzdGF0ZVxuICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVkaXJlY3QgdG8gbG9naW4gcGFnZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY2Nlc3MgdG9rZW4gZXhpc3RzXG4gICAgICovXG4gICAgaXNBdXRoZW50aWNhdGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuVG9rZW5NYW5hZ2VyID0gVG9rZW5NYW5hZ2VyO1xuXG4vLyBDUklUSUNBTDogU2V0IHVwIEFKQVggaW50ZXJjZXB0b3IgSU1NRURJQVRFTFkgb24gc2NyaXB0IGxvYWRcbi8vIFRoaXMgZW5zdXJlcyBBTEwgQUpBWCByZXF1ZXN0cyB3YWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb25cbi8vIGV2ZW4gaWYgdGhleSdyZSBmaXJlZCBiZWZvcmUgJChkb2N1bWVudCkucmVhZHkoKVxuVG9rZW5NYW5hZ2VyLnNldHVwR2xvYmFsQWpheCgpO1xuXG4vLyBDUklUSUNBTDogQ3JlYXRlIHRva2VuTWFuYWdlclJlYWR5IHByb21pc2UgSU1NRURJQVRFTFlcbi8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBpZiBub3QsIHN0YXJ0IGluaXRpYWxpemF0aW9uIHJpZ2h0IGF3YXlcbi8vIFRoaXMgZW5zdXJlcyB0aGUgcHJvbWlzZSBleGlzdHMgYmVmb3JlIEFOWSBvdGhlciBzY3JpcHQgcnVuc1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgLy8gTm90IGxvZ2luIHBhZ2UgLSBzdGFydCBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgLy8gVGhpcyBoYXBwZW5zIEJFRk9SRSAkKGRvY3VtZW50KS5yZWFkeSwgZW5zdXJpbmcgdG9rZW4gaXMgcmVhZHkgQVNBUFxuICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkgPSBUb2tlbk1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIExvZ2luIHBhZ2UgLSByZXNvbHZlIGltbWVkaWF0ZWx5IChubyBhdXRoZW50aWNhdGlvbiBuZWVkZWQpXG4gICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFByb21pc2UucmVzb2x2ZSh0cnVlKTtcbiAgICB9XG59XG4iXX0=