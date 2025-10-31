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
    // Prevent multiple initializations
    if (this.isInitialized) {
      return this.accessToken !== null;
    } // Try to get access token using refresh token cookie


    var hasToken = await this.startupRefresh();

    if (!hasToken) {
      // No valid refresh token → redirect to login
      window.location = "".concat(globalRootUrl, "session/index");
      return false;
    }

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
        return false;
      }
    } catch (error) {
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
   * - Deletes refreshToken cookie from browser
   * - Redirects to login page
   */
  logout: async function logout() {
    // Check if already on login page - prevent redirect loop
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (isLoginPage) {
      // Already on login page - clear state
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
        success: function success() {},
        error: function error(_jqXHR, status, _error) {}
      });
      return;
    } // Prevent multiple logout calls


    if (!this.accessToken) {
      // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect
      try {
        $.ajax({
          url: "".concat(globalRootUrl, "session/end"),
          method: 'POST',
          async: false,
          // Synchronous to ensure cookie is cleared before redirect
          success: function success() {}
        });
      } catch (e) {}

      window.location = "".concat(globalRootUrl, "session/index");
      return;
    }

    try {
      // Call logout endpoint to invalidate refresh token in Redis
      await $.ajax({
        url: '/pbxcore/api/v3/auth:logout',
        method: 'POST',
        headers: {
          Authorization: "Bearer ".concat(this.accessToken)
        }
      });
    } catch (error) {// If API fails (e.g., 401 with expired token), we still need to clear the cookie
      // Use server-side session/end endpoint as fallback to clear httpOnly cookie
    } // Clear local state


    this.accessToken = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    } // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
    // This prevents authentication loop when refreshToken cookie exists but is expired


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
    // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'; // For HTTPS (secure flag)

    if (window.location.protocol === 'https:') {
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
    }
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
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (!isLoginPage) {
      // Not login page - start TokenManager initialization immediately
      // This happens BEFORE $(document).ready, ensuring token is ready ASAP
      window.tokenManagerReady = TokenManager.initialize();
    } else {
      // Login page - resolve immediately (no authentication needed)
      window.tokenManagerReady = Promise.resolve(true);
    }
  } else {}
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImhhc1Rva2VuIiwic3RhcnR1cFJlZnJlc2giLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJyZXNwb25zZSIsIiQiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJoZWFkZXJzIiwicmVzdWx0IiwiZGF0YSIsInNldEFjY2Vzc1Rva2VuIiwiZXhwaXJlc0luIiwiZXJyb3IiLCJ0b2tlbiIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsImNvbnNvbGUiLCJzZXR1cEdsb2JhbEFqYXgiLCJzZWxmIiwib3JpZ2luYWxBamF4Iiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInJlcXVlc3RVcmwiLCJpbmNsdWRlcyIsImFwcGx5IiwiYXJndW1lbnRzIiwidG9rZW5NYW5hZ2VyUmVhZHkiLCJkZWZlcnJlZCIsIkRlZmVycmVkIiwidGhlbiIsIkF1dGhvcml6YXRpb24iLCJqcVhIUiIsImNhbGwiLCJkb25lIiwicmVzb2x2ZSIsImZhaWwiLCJyZWplY3QiLCJwcm9taXNlIiwiZG9jdW1lbnQiLCJhamF4RXJyb3IiLCJldmVudCIsInhociIsInNldHRpbmdzIiwic3RhdHVzIiwiaXNMb2dpblBhZ2UiLCJwYXRobmFtZSIsImZuIiwiYXBpIiwib3JpZ2luYWxBcGkiLCJjb25maWciLCJvcmlnaW5hbEJlZm9yZVNlbmQiLCJiZWZvcmVTZW5kIiwiYmVmb3JlWEhSIiwic2V0UmVxdWVzdEhlYWRlciIsImFzeW5jIiwic3VjY2VzcyIsIl9qcVhIUiIsImUiLCJkZWxldGVSZWZyZXNoVG9rZW5Db29raWUiLCJjb29r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SU87QUFDSDtBQUNBRyxNQUFBQSxNQUFNLENBQUNpQyxpQkFBUCxHQUEyQm9DLE9BQU8sQ0FBQzVCLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBM0I7QUFDSDtBQUNKLEdBYkQsTUFhTyxDQUNOO0FBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG4vKipcbiAqIFRva2VuTWFuYWdlciAtIG1hbmFnZXMgSldUIGF1dGhlbnRpY2F0aW9uIHRva2Vuc1xuICpcbiAqIFNlY3VyaXR5IGFyY2hpdGVjdHVyZTpcbiAqIC0gQWNjZXNzIHRva2VuIChKV1QsIDE1IG1pbikgc3RvcmVkIGluIE1FTU9SWSAobm90IGxvY2FsU3RvcmFnZSAtIFhTUyBwcm90ZWN0aW9uKVxuICogLSBSZWZyZXNoIHRva2VuICgzMCBkYXlzKSBzdG9yZWQgaW4gaHR0cE9ubHkgY29va2llIChYU1MgcHJvdGVjdGlvbilcbiAqIC0gU2lsZW50IHJlZnJlc2ggdGltZXIgdXBkYXRlcyBhY2Nlc3MgdG9rZW4gYmVmb3JlIGV4cGlyYXRpb25cbiAqIC0gQWxsIEFKQVggcmVxdWVzdHMgYXV0b21hdGljYWxseSBpbmNsdWRlIEF1dGhvcml6YXRpb246IEJlYXJlciBoZWFkZXJcbiAqXG4gKiBAbW9kdWxlIFRva2VuTWFuYWdlclxuICovXG5jb25zdCBUb2tlbk1hbmFnZXIgPSB7XG4gICAgLyoqXG4gICAgICogQWNjZXNzIHRva2VuIChKV1QpIHN0b3JlZCBpbiBtZW1vcnkgLSBORVZFUiBpbiBsb2NhbFN0b3JhZ2Uvc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgYWNjZXNzVG9rZW46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lciBmb3Igc2lsZW50IHRva2VuIHJlZnJlc2hcbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgcmVmcmVzaFRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIHNpbXVsdGFuZW91cyByZWZyZXNoIGF0dGVtcHRzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNSZWZyZXNoaW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVG9rZW5NYW5hZ2VyXG4gICAgICogLSBBdHRlbXB0cyB0byByZWZyZXNoIGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqIC0gUmVkaXJlY3RzIHRvIGxvZ2luIGlmIG5vIHZhbGlkIHJlZnJlc2ggdG9rZW5cbiAgICAgKlxuICAgICAqIE5vdGU6IHNldHVwR2xvYmFsQWpheCgpIGlzIGNhbGxlZCBhdXRvbWF0aWNhbGx5IG9uIHNjcmlwdCBsb2FkLFxuICAgICAqIG5vdCBoZXJlLCB0byBlbnN1cmUgaXQncyBhY3RpdmUgYmVmb3JlIEFOWSBBSkFYIHJlcXVlc3RzIGFyZSBtYWRlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IHRydWUgaWYgYXV0aGVudGljYXRpb24gc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGFzeW5jIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWNjZXNzVG9rZW4gIT09IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcnkgdG8gZ2V0IGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAgICBjb25zdCBoYXNUb2tlbiA9IGF3YWl0IHRoaXMuc3RhcnR1cFJlZnJlc2goKTtcblxuXG4gICAgICAgIGlmICghaGFzVG9rZW4pIHtcbiAgICAgICAgICAgIC8vIE5vIHZhbGlkIHJlZnJlc2ggdG9rZW4g4oaSIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0dXAgcmVmcmVzaCAtIGdldCBuZXcgYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICogQ2FsbGVkIG9uIHBhZ2UgbG9hZCB0byByZXN0b3JlIGF1dGhlbnRpY2F0aW9uIHN0YXRlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gdHJ1ZSBpZiByZWZyZXNoIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBhc3luYyBzdGFydHVwUmVmcmVzaCgpIHtcblxuICAgICAgICBpZiAodGhpcy5pc1JlZnJlc2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2VuZCBBdXRob3JpemF0aW9uIGhlYWRlciAodXNpbmcgcmVmcmVzaCBjb29raWUpXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge31cbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGFjY2VzcyB0b2tlbiBpbiBtZW1vcnkgYW5kIHNjaGVkdWxlIHNpbGVudCByZWZyZXNoXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gSldUIGFjY2VzcyB0b2tlblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBleHBpcmVzSW4gVG9rZW4gbGlmZXRpbWUgaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHNldEFjY2Vzc1Rva2VuKHRva2VuLCBleHBpcmVzSW4pIHtcbiAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IHRva2VuO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVmcmVzaFRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNjaGVkdWxlIHNpbGVudCByZWZyZXNoIDIgbWludXRlcyBiZWZvcmUgZXhwaXJhdGlvblxuICAgICAgICAvLyBEZWZhdWx0OiA5MDBzICgxNSBtaW4pIC0gMTIwcyA9IDc4MHMgKDEzIG1pbilcbiAgICAgICAgY29uc3QgcmVmcmVzaEF0ID0gTWF0aC5tYXgoKGV4cGlyZXNJbiAtIDEyMCksIDYwKSAqIDEwMDA7XG5cblxuICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zaWxlbnRSZWZyZXNoKCk7XG4gICAgICAgIH0sIHJlZnJlc2hBdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNpbGVudCByZWZyZXNoIC0gdXBkYXRlIGFjY2VzcyB0b2tlbiBiZWZvcmUgaXQgZXhwaXJlc1xuICAgICAqIEF1dG9tYXRpY2FsbHkgY2FsbGVkIGJ5IHRpbWVyLCB0cmFuc3BhcmVudCB0byB1c2VyXG4gICAgICovXG4gICAgYXN5bmMgc2lsZW50UmVmcmVzaCgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWZyZXNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHNlbmQgQXV0aG9yaXphdGlvbiBoZWFkZXIgKHVzaW5nIHJlZnJlc2ggY29va2llKVxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmV4cGlyZXNJblxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggZmFpbGVkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lsZW50IHJlZnJlc2ggZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIFJlZnJlc2ggZmFpbGVkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgIHRoaXMubG9nb3V0KCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCB1cCBnbG9iYWwgQUpBWCBpbnRlcmNlcHRvclxuICAgICAqIEF1dG9tYXRpY2FsbHkgYWRkcyBBdXRob3JpemF0aW9uOiBCZWFyZXIgaGVhZGVyIHRvIGFsbCBBSkFYIHJlcXVlc3RzXG4gICAgICogSGFuZGxlcyA0MDEgZXJyb3JzIGJ5IGxvZ2dpbmcgb3V0XG4gICAgICovXG4gICAgc2V0dXBHbG9iYWxBamF4KCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCAkLmFqYXhcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxBamF4ID0gJC5hamF4O1xuXG4gICAgICAgIC8vIFdyYXAgJC5hamF4IHRvIHdhaXQgZm9yIHRva2VuIGluaXRpYWxpemF0aW9uXG4gICAgICAgICQuYWpheCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggJC5hamF4KHVybCwgb3B0aW9ucykgYW5kICQuYWpheChvcHRpb25zKSBzaWduYXR1cmVzXG4gICAgICAgICAgICBpZiAodHlwZW9mIHVybCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gdXJsO1xuICAgICAgICAgICAgICAgIHVybCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2tpcCBhdXRoIGVuZHBvaW50cyAodGhleSB1c2UgcmVmcmVzaCBjb29raWUsIG5vdCBhY2Nlc3MgdG9rZW4pXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0VXJsID0gdXJsIHx8IG9wdGlvbnMudXJsIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOmxvZ2luJykgfHwgcmVxdWVzdFVybC5pbmNsdWRlcygnL2F1dGg6cmVmcmVzaCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQWpheC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gYmVmb3JlIHByb2NlZWRpbmdcbiAgICAgICAgICAgIGlmICh3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgalF1ZXJ5IERlZmVycmVkIHRvIG1haW50YWluIGNvbXBhdGliaWxpdHkgd2l0aCBqUXVlcnkgY29kZVxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4gJiYgIW9wdGlvbnMuaGVhZGVycy5BdXRob3JpemF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIG9yaWdpbmFsICQuYWpheCBhbmQgZm9yd2FyZCBpdHMgcmVzdWx0IHRvIG91ciBkZWZlcnJlZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqcVhIUiA9IHVybCA/IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIHVybCwgb3B0aW9ucykgOiBvcmlnaW5hbEFqYXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3J3YXJkIGFsbCBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICAgICAganFYSFIuZG9uZSgoLi4uYXJncykgPT4gZGVmZXJyZWQucmVzb2x2ZSguLi5hcmdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmFpbCgoLi4uYXJncykgPT4gZGVmZXJyZWQucmVqZWN0KC4uLmFyZ3MpKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRva2VuTWFuYWdlciBub3QgaW5pdGlhbGl6ZWQgeWV0IC0gcHJvY2VlZCB3aXRob3V0IHRva2VuXG4gICAgICAgICAgICAvLyAodGhpcyBzaG91bGQgb25seSBoYXBwZW4gb24gbG9naW4gcGFnZSlcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBbHNvIHNldCB1cCBlcnJvciBoYW5kbGVyXG4gICAgICAgICQoZG9jdW1lbnQpLmFqYXhFcnJvcigoZXZlbnQsIHhociwgc2V0dGluZ3MpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB1bmF1dGhvcml6ZWQgZXJyb3JzXG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgb24gbG9naW4gcGFnZSAtIGRvbid0IHRyaWdnZXIgbG9nb3V0IGxvb3BcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUb2tlbiBleHBpcmVkIG9yIGludmFsaWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ291dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV3JhcCBTZW1hbnRpYyBVSSAkLmFwaSgpIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBUaGlzIGlzIG5lZWRlZCBiZWNhdXNlIHNvbWUgbW9kdWxlcyB1c2UgJC5hcGkoKSBpbnN0ZWFkIG9mICQuYWpheCgpXG4gICAgICAgIGlmICgkLmZuLmFwaSkge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxBcGkgPSAkLmZuLmFwaTtcbiAgICAgICAgICAgICQuZm4uYXBpID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgc2V0dGluZ3NcbiAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBzZXR0aW5ncyB8fCB7fTtcblxuICAgICAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHNcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBjb25maWcudXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGlmICh1cmwuaW5jbHVkZXMoJy9hdXRoOmxvZ2luJykgfHwgdXJsLmluY2x1ZGVzKCcvYXV0aDpyZWZyZXNoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQXBpLmNhbGwodGhpcywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdyYXAgYmVmb3JlU2VuZCB0byBhZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbEJlZm9yZVNlbmQgPSBjb25maWcuYmVmb3JlU2VuZDtcbiAgICAgICAgICAgICAgICBjb25maWcuYmVmb3JlU2VuZCA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdhaXQgZm9yIFRva2VuTWFuYWdlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5iZWZvcmVYSFIgPSBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3NlbGYuYWNjZXNzVG9rZW59YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCBiZWZvcmVTZW5kIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbEJlZm9yZVNlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxCZWZvcmVTZW5kLmNhbGwodGhpcywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIG9yaWdpbmFsIGJlZm9yZVNlbmRcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsQmVmb3JlU2VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsQmVmb3JlU2VuZC5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFwaS5jYWxsKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvZ291dCAtIGNsZWFyIHRva2VucyBhbmQgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgKiAtIENhbGxzIFJFU1QgQVBJIHRvIGludmFsaWRhdGUgcmVmcmVzaCB0b2tlblxuICAgICAqIC0gQ2xlYXJzIGFjY2VzcyB0b2tlbiBmcm9tIG1lbW9yeVxuICAgICAqIC0gRGVsZXRlcyByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqIC0gUmVkaXJlY3RzIHRvIGxvZ2luIHBhZ2VcbiAgICAgKi9cbiAgICBhc3luYyBsb2dvdXQoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBvbiBsb2dpbiBwYWdlIC0gcHJldmVudCByZWRpcmVjdCBsb29wXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmIChpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBvbiBsb2dpbiBwYWdlIC0gY2xlYXIgc3RhdGVcbiAgICAgICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVmcmVzaFRpbWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENSSVRJQ0FMOiBDbGVhciBodHRwT25seSBjb29raWUgdmlhIHNlcnZlci1zaWRlIEFKQVggZW5kcG9pbnRcbiAgICAgICAgICAgIC8vIFRoaXMgcHJldmVudHMgYXV0aGVudGljYXRpb24gbG9vcCB3aGVuIHJlZnJlc2hUb2tlbiBleGlzdHMgYnV0IGlzIGV4cGlyZWRcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBhc3luYzogZmFsc2UsIC8vIFN5bmNocm9ub3VzIHRvIGVuc3VyZSBjb29raWUgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6ICgpID0+IHtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiAoX2pxWEhSLCBzdGF0dXMsIGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGxvZ291dCBjYWxsc1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIC8vIENSSVRJQ0FMOiBDbGVhciBodHRwT25seSBjb29raWUgdmlhIHNlcnZlci1zaWRlIGVuZHBvaW50IGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWQgYmVmb3JlIHJlZGlyZWN0XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDYWxsIGxvZ291dCBlbmRwb2ludCB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW4gaW4gUmVkaXNcbiAgICAgICAgICAgIGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9nb3V0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmFjY2Vzc1Rva2VufWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIElmIEFQSSBmYWlscyAoZS5nLiwgNDAxIHdpdGggZXhwaXJlZCB0b2tlbiksIHdlIHN0aWxsIG5lZWQgdG8gY2xlYXIgdGhlIGNvb2tpZVxuICAgICAgICAgICAgLy8gVXNlIHNlcnZlci1zaWRlIHNlc3Npb24vZW5kIGVuZHBvaW50IGFzIGZhbGxiYWNrIHRvIGNsZWFyIGh0dHBPbmx5IGNvb2tpZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgbG9jYWwgc3RhdGVcbiAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVmcmVzaFRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENSSVRJQ0FMOiBSZWRpcmVjdCB0byAvc2Vzc2lvbi9lbmQgd2hpY2ggY2xlYXJzIGh0dHBPbmx5IGNvb2tpZSBzZXJ2ZXItc2lkZVxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gY29va2llIGV4aXN0cyBidXQgaXMgZXhwaXJlZFxuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlZnJlc2hUb2tlbiBjb29raWUgZnJvbSBicm93c2VyXG4gICAgICpcbiAgICAgKiBJTVBPUlRBTlQ6IGh0dHBPbmx5IGNvb2tpZXMgQ0FOTk9UIGJlIGRlbGV0ZWQgdmlhIEphdmFTY3JpcHQgKGRvY3VtZW50LmNvb2tpZSkuXG4gICAgICogVGhleSBjYW4gb25seSBiZSBjbGVhcmVkIGJ5IHRoZSBzZXJ2ZXIgdmlhIFNldC1Db29raWUgaGVhZGVyLlxuICAgICAqXG4gICAgICogVGhlIC9hdXRoOmxvZ291dCBlbmRwb2ludCBoYW5kbGVzIGNvb2tpZSBkZWxldGlvbiBvbiBzZXJ2ZXIgc2lkZS5cbiAgICAgKiBUaGlzIG1ldGhvZCBleGlzdHMgZm9yIG5vbi1odHRwT25seSBmYWxsYmFjayBzY2VuYXJpb3Mgb25seS5cbiAgICAgKlxuICAgICAqIEZvciBodHRwT25seSBjb29raWVzLCB3ZSByZWx5IG9uOlxuICAgICAqIDEuIFNlcnZlci1zaWRlIGNvb2tpZSBkZWxldGlvbiBpbiAvYXV0aDpsb2dvdXQgcmVzcG9uc2VcbiAgICAgKiAyLiBTZXNzaW9uQ29udHJvbGxlci5lbmRBY3Rpb24oKSB3aGljaCBhbHNvIGNsZWFycyB0aGUgY29va2llXG4gICAgICovXG4gICAgZGVsZXRlUmVmcmVzaFRva2VuQ29va2llKCkge1xuXG4gICAgICAgIC8vIE5PVEU6IFRoaXMgd29uJ3Qgd29yayBmb3IgaHR0cE9ubHkgY29va2llcywgYnV0IHRyeSBhbnl3YXkgZm9yIG5vbi1odHRwT25seSBmYWxsYmFja1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBTYW1lU2l0ZT1TdHJpY3QnO1xuXG4gICAgICAgIC8vIEZvciBIVFRQUyAoc2VjdXJlIGZsYWcpXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBzZWN1cmU7IFNhbWVTaXRlPVN0cmljdCc7XG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY2Nlc3MgdG9rZW4gZXhpc3RzXG4gICAgICovXG4gICAgaXNBdXRoZW50aWNhdGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuVG9rZW5NYW5hZ2VyID0gVG9rZW5NYW5hZ2VyO1xuXG4vLyBDUklUSUNBTDogU2V0IHVwIEFKQVggaW50ZXJjZXB0b3IgSU1NRURJQVRFTFkgb24gc2NyaXB0IGxvYWRcbi8vIFRoaXMgZW5zdXJlcyBBTEwgQUpBWCByZXF1ZXN0cyB3YWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb25cbi8vIGV2ZW4gaWYgdGhleSdyZSBmaXJlZCBiZWZvcmUgJChkb2N1bWVudCkucmVhZHkoKVxuVG9rZW5NYW5hZ2VyLnNldHVwR2xvYmFsQWpheCgpO1xuXG4vLyBDUklUSUNBTDogQ3JlYXRlIHRva2VuTWFuYWdlclJlYWR5IHByb21pc2UgSU1NRURJQVRFTFlcbi8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBpZiBub3QsIHN0YXJ0IGluaXRpYWxpemF0aW9uIHJpZ2h0IGF3YXlcbi8vIFRoaXMgZW5zdXJlcyB0aGUgcHJvbWlzZSBleGlzdHMgYmVmb3JlIEFOWSBvdGhlciBzY3JpcHQgcnVuc1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gUHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnMgb24gdGhlIHNhbWUgcGFnZVxuICAgIGlmICghd2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG5cbiAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vJyk7XG5cbiAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgLy8gTm90IGxvZ2luIHBhZ2UgLSBzdGFydCBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIC8vIFRoaXMgaGFwcGVucyBCRUZPUkUgJChkb2N1bWVudCkucmVhZHksIGVuc3VyaW5nIHRva2VuIGlzIHJlYWR5IEFTQVBcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFRva2VuTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2dpbiBwYWdlIC0gcmVzb2x2ZSBpbW1lZGlhdGVseSAobm8gYXV0aGVudGljYXRpb24gbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5ID0gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICB9XG59XG4iXX0=