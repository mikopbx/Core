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
        // Shallow-clone options (and headers) so our header injection
        // and pre-dispatch setRequestHeader writes don't mutate the
        // caller's object. Eliminates aliasing leaks if the same
        // settings object is reused across multiple $.ajax calls.
        options = options ? Object.assign({}, options, {
          headers: Object.assign({}, options.headers)
        }) : {}; // Create jQuery Deferred to maintain compatibility with jQuery code.
        // We must expose a jqXHR-shaped object: callers (Semantic UI api,
        // dropdown queryRemote) call .abort() / .state() / .setRequestHeader()
        // on the return value. A bare Deferred().promise() lacks .abort()
        // which crashes Semantic UI's abort path with
        // "TypeError: e.abort is not a function" (see Sentry MIKOPBX-MHC).

        var deferred = $.Deferred();
        var pendingJqXHR = null;
        var aborted = false;
        window.tokenManagerReady.then(function () {
          // Caller already aborted before we got a chance to dispatch;
          // abort() has already rejected the deferred — nothing to do.
          if (aborted) {
            return;
          } // Add Authorization header


          if (self.accessToken && !options.headers.Authorization) {
            options.headers.Authorization = "Bearer ".concat(self.accessToken);
          } // Assign pendingJqXHR BEFORE chaining so a synchronous abort()
          // (e.g., from a settled-from-cache jqXHR) routes via the
          // post-dispatch branch instead of re-rejecting the deferred.


          pendingJqXHR = url ? originalAjax.call(_this2, url, options) : originalAjax.call(_this2, options); // Forward all callbacks (preserve `this` and full argument list).

          pendingJqXHR.done(function () {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            deferred.resolveWith(this, args);
          }).fail(function () {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            deferred.rejectWith(this, args);
          });
        })["catch"](function (error) {
          console.error('TokenManager initialization failed:', error);
          deferred.reject(error);
        });
        var jqXHRProxy = deferred.promise();

        jqXHRProxy.abort = function (statusText) {
          if (pendingJqXHR && typeof pendingJqXHR.abort === 'function') {
            pendingJqXHR.abort(statusText);
            return jqXHRProxy;
          } // Pre-dispatch abort: mark the request and reject the deferred
          // ourselves; the .then() callback will see `aborted` and skip
          // the originalAjax call entirely. statusText is forwarded to
          // listeners via rejectWith — no need to stash it separately.


          aborted = true;
          deferred.rejectWith(this, [null, 'abort', statusText || 'abort']);
          return jqXHRProxy;
        };

        jqXHRProxy.setRequestHeader = function (name, value) {
          if (pendingJqXHR && typeof pendingJqXHR.setRequestHeader === 'function') {
            pendingJqXHR.setRequestHeader(name, value);
            return jqXHRProxy;
          } // Pre-dispatch: stash header in (cloned) options so it ships
          // with the request once tokenManagerReady resolves.


          options.headers[name] = value;
          return jqXHRProxy;
        };

        jqXHRProxy.getResponseHeader = function (name) {
          return pendingJqXHR && typeof pendingJqXHR.getResponseHeader === 'function' ? pendingJqXHR.getResponseHeader(name) : null;
        };

        jqXHRProxy.getAllResponseHeaders = function () {
          return pendingJqXHR && typeof pendingJqXHR.getAllResponseHeaders === 'function' ? pendingJqXHR.getAllResponseHeaders() : '';
        }; // Defined as non-enumerable getters by design so the proxy
        // doesn't expose extra keys to `for…in` consumers (real jqXHR
        // exposes these as own enumerable properties; the proxy is
        // intentionally a stricter subset).


        Object.defineProperty(jqXHRProxy, 'readyState', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.readyState : 0;
          }
        });
        Object.defineProperty(jqXHRProxy, 'status', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.status : 0;
          }
        });
        Object.defineProperty(jqXHRProxy, 'statusText', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.statusText : '';
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseText', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseText : '';
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseJSON', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseJSON : undefined;
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseXML', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseXML : undefined;
          }
        });
        return jqXHRProxy;
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
    }); // Note: we deliberately do NOT wrap $.fn.api here. Semantic UI's
    // $.fn.api uses $.ajax() under the hood, so the wrapper above already
    // injects the Authorization header. A second wrapper that returned a
    // Deferred from beforeSend violates Semantic UI's contract (it expects
    // settings or false) and was the original source of the
    // "TypeError: e.abort is not a function" crashes in dropdown
    // queryRemote (see Sentry MIKOPBX-MHC and related groups).
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImhhc1Rva2VuIiwic3RhcnR1cFJlZnJlc2giLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJyZXNwb25zZSIsIiQiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJoZWFkZXJzIiwicmVzdWx0IiwiZGF0YSIsInNldEFjY2Vzc1Rva2VuIiwiZXhwaXJlc0luIiwiZXJyb3IiLCJ0b2tlbiIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsImNvbnNvbGUiLCJzZXR1cEdsb2JhbEFqYXgiLCJzZWxmIiwib3JpZ2luYWxBamF4Iiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInJlcXVlc3RVcmwiLCJpbmNsdWRlcyIsImFwcGx5IiwiYXJndW1lbnRzIiwidG9rZW5NYW5hZ2VyUmVhZHkiLCJPYmplY3QiLCJhc3NpZ24iLCJkZWZlcnJlZCIsIkRlZmVycmVkIiwicGVuZGluZ0pxWEhSIiwiYWJvcnRlZCIsInRoZW4iLCJBdXRob3JpemF0aW9uIiwiY2FsbCIsImRvbmUiLCJhcmdzIiwicmVzb2x2ZVdpdGgiLCJmYWlsIiwicmVqZWN0V2l0aCIsInJlamVjdCIsImpxWEhSUHJveHkiLCJwcm9taXNlIiwiYWJvcnQiLCJzdGF0dXNUZXh0Iiwic2V0UmVxdWVzdEhlYWRlciIsIm5hbWUiLCJ2YWx1ZSIsImdldFJlc3BvbnNlSGVhZGVyIiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJyZWFkeVN0YXRlIiwic3RhdHVzIiwicmVzcG9uc2VUZXh0IiwicmVzcG9uc2VKU09OIiwicmVzcG9uc2VYTUwiLCJkb2N1bWVudCIsImFqYXhFcnJvciIsImV2ZW50IiwieGhyIiwic2V0dGluZ3MiLCJpc0xvZ2luUGFnZSIsInBhdGhuYW1lIiwiYXN5bmMiLCJzdWNjZXNzIiwiX2pxWEhSIiwiZSIsImRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSIsImNvb2tpZSIsInByb3RvY29sIiwiaXNBdXRoZW50aWNhdGVkIiwiUHJvbWlzZSIsInJlc29sdmUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBTEk7O0FBT2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVhHOztBQWFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0FqQkc7O0FBbUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsS0F2QkU7O0FBeUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNVQyxFQUFBQSxVQW5DVyw4QkFtQ0U7QUFFZjtBQUNBLFFBQUksS0FBS0QsYUFBVCxFQUF3QjtBQUNwQixhQUFPLEtBQUtILFdBQUwsS0FBcUIsSUFBNUI7QUFDSCxLQUxjLENBT2Y7OztBQUNBLFFBQU1LLFFBQVEsR0FBRyxNQUFNLEtBQUtDLGNBQUwsRUFBdkI7O0FBR0EsUUFBSSxDQUFDRCxRQUFMLEVBQWU7QUFDWDtBQUNBRSxNQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBRUQsU0FBS04sYUFB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QSxZQUFZLENBQUNnQyxlQUFiLEcsQ0FFQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSSxPQUFPeEIsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUMvQjtBQUNBLE1BQUksQ0FBQ0EsTUFBTSxDQUFDaUMsaUJBQVosRUFBK0I7QUFFM0IsUUFBTXFDLFdBQVcsR0FBR3RFLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQnNFLFFBQWhCLENBQXlCekMsUUFBekIsQ0FBa0MsZ0JBQWxDLEtBQ0Q5QixNQUFNLENBQUNDLFFBQVAsQ0FBZ0JzRSxRQUFoQixDQUF5QnpDLFFBQXpCLENBQWtDLFdBQWxDLENBRG5COztBQUdBLFFBQUksQ0FBQ3dDLFdBQUwsRUFBa0I7QUFDZDtBQUNBO0FBQ0F0RSxNQUFBQSxNQUFNLENBQUNpQyxpQkFBUCxHQUEyQnpDLFlBQVksQ0FBQ0ssVUFBYixFQUEzQjtBQUNILEtBSkQsTUFJTztBQUNIO0FBQ0FHLE1BQUFBLE1BQU0sQ0FBQ2lDLGlCQUFQLEdBQTJCK0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCLElBQWhCLENBQTNCO0FBQ0g7QUFDSixHQWJELE1BYU8sQ0FDTjtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBUb2tlbk1hbmFnZXIgLSBtYW5hZ2VzIEpXVCBhdXRoZW50aWNhdGlvbiB0b2tlbnNcbiAqXG4gKiBTZWN1cml0eSBhcmNoaXRlY3R1cmU6XG4gKiAtIEFjY2VzcyB0b2tlbiAoSldULCAxNSBtaW4pIHN0b3JlZCBpbiBNRU1PUlkgKG5vdCBsb2NhbFN0b3JhZ2UgLSBYU1MgcHJvdGVjdGlvbilcbiAqIC0gUmVmcmVzaCB0b2tlbiAoMzAgZGF5cykgc3RvcmVkIGluIGh0dHBPbmx5IGNvb2tpZSAoWFNTIHByb3RlY3Rpb24pXG4gKiAtIFNpbGVudCByZWZyZXNoIHRpbWVyIHVwZGF0ZXMgYWNjZXNzIHRva2VuIGJlZm9yZSBleHBpcmF0aW9uXG4gKiAtIEFsbCBBSkFYIHJlcXVlc3RzIGF1dG9tYXRpY2FsbHkgaW5jbHVkZSBBdXRob3JpemF0aW9uOiBCZWFyZXIgaGVhZGVyXG4gKlxuICogQG1vZHVsZSBUb2tlbk1hbmFnZXJcbiAqL1xuY29uc3QgVG9rZW5NYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIEFjY2VzcyB0b2tlbiAoSldUKSBzdG9yZWQgaW4gbWVtb3J5IC0gTkVWRVIgaW4gbG9jYWxTdG9yYWdlL3Nlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAqL1xuICAgIGFjY2Vzc1Rva2VuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGltZXIgZm9yIHNpbGVudCB0b2tlbiByZWZyZXNoXG4gICAgICogQHR5cGUge251bWJlcnxudWxsfVxuICAgICAqL1xuICAgIHJlZnJlc2hUaW1lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSBzaW11bHRhbmVvdXMgcmVmcmVzaCBhdHRlbXB0c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzUmVmcmVzaGluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFRva2VuTWFuYWdlclxuICAgICAqIC0gQXR0ZW1wdHMgdG8gcmVmcmVzaCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBpZiBubyB2YWxpZCByZWZyZXNoIHRva2VuXG4gICAgICpcbiAgICAgKiBOb3RlOiBzZXR1cEdsb2JhbEFqYXgoKSBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBvbiBzY3JpcHQgbG9hZCxcbiAgICAgKiBub3QgaGVyZSwgdG8gZW5zdXJlIGl0J3MgYWN0aXZlIGJlZm9yZSBBTlkgQUpBWCByZXF1ZXN0cyBhcmUgbWFkZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIGF1dGhlbnRpY2F0aW9uIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFjY2Vzc1Rva2VuICE9PSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJ5IHRvIGdldCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgICAgY29uc3QgaGFzVG9rZW4gPSBhd2FpdCB0aGlzLnN0YXJ0dXBSZWZyZXNoKCk7XG5cblxuICAgICAgICBpZiAoIWhhc1Rva2VuKSB7XG4gICAgICAgICAgICAvLyBObyB2YWxpZCByZWZyZXNoIHRva2VuIOKGkiByZWRpcmVjdCB0byBsb2dpblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHVwIHJlZnJlc2ggLSBnZXQgbmV3IGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqIENhbGxlZCBvbiBwYWdlIGxvYWQgdG8gcmVzdG9yZSBhdXRoZW50aWNhdGlvbiBzdGF0ZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IHRydWUgaWYgcmVmcmVzaCBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgc3RhcnR1cFJlZnJlc2goKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNSZWZyZXNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHNlbmQgQXV0aG9yaXphdGlvbiBoZWFkZXIgKHVzaW5nIHJlZnJlc2ggY29va2llKVxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBhY2Nlc3MgdG9rZW4gaW4gbWVtb3J5IGFuZCBzY2hlZHVsZSBzaWxlbnQgcmVmcmVzaFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIEpXVCBhY2Nlc3MgdG9rZW5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZXhwaXJlc0luIFRva2VuIGxpZmV0aW1lIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBzZXRBY2Nlc3NUb2tlbih0b2tlbiwgZXhwaXJlc0luKSB7XG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbjtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTY2hlZHVsZSBzaWxlbnQgcmVmcmVzaCAyIG1pbnV0ZXMgYmVmb3JlIGV4cGlyYXRpb25cbiAgICAgICAgLy8gRGVmYXVsdDogOTAwcyAoMTUgbWluKSAtIDEyMHMgPSA3ODBzICgxMyBtaW4pXG4gICAgICAgIGNvbnN0IHJlZnJlc2hBdCA9IE1hdGgubWF4KChleHBpcmVzSW4gLSAxMjApLCA2MCkgKiAxMDAwO1xuXG5cbiAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2lsZW50UmVmcmVzaCgpO1xuICAgICAgICB9LCByZWZyZXNoQXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaWxlbnQgcmVmcmVzaCAtIHVwZGF0ZSBhY2Nlc3MgdG9rZW4gYmVmb3JlIGl0IGV4cGlyZXNcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGNhbGxlZCBieSB0aW1lciwgdHJhbnNwYXJlbnQgdG8gdXNlclxuICAgICAqL1xuICAgIGFzeW5jIHNpbGVudFJlZnJlc2goKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpbGVudCByZWZyZXNoIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdXAgZ2xvYmFsIEFKQVggaW50ZXJjZXB0b3JcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGFkZHMgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlciB0byBhbGwgQUpBWCByZXF1ZXN0c1xuICAgICAqIEhhbmRsZXMgNDAxIGVycm9ycyBieSBsb2dnaW5nIG91dFxuICAgICAqL1xuICAgIHNldHVwR2xvYmFsQWpheCgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgJC5hamF4XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWpheCA9ICQuYWpheDtcblxuICAgICAgICAvLyBXcmFwICQuYWpheCB0byB3YWl0IGZvciB0b2tlbiBpbml0aWFsaXphdGlvblxuICAgICAgICAkLmFqYXggPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoICQuYWpheCh1cmwsIG9wdGlvbnMpIGFuZCAkLmFqYXgob3B0aW9ucykgc2lnbmF0dXJlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1cmwgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHVybDtcbiAgICAgICAgICAgICAgICB1cmwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHMgKHRoZXkgdXNlIHJlZnJlc2ggY29va2llLCBub3QgYWNjZXNzIHRva2VuKVxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdFVybCA9IHVybCB8fCBvcHRpb25zLnVybCB8fCAnJztcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOnJlZnJlc2gnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGJlZm9yZSBwcm9jZWVkaW5nXG4gICAgICAgICAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2hhbGxvdy1jbG9uZSBvcHRpb25zIChhbmQgaGVhZGVycykgc28gb3VyIGhlYWRlciBpbmplY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBhbmQgcHJlLWRpc3BhdGNoIHNldFJlcXVlc3RIZWFkZXIgd3JpdGVzIGRvbid0IG11dGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAvLyBjYWxsZXIncyBvYmplY3QuIEVsaW1pbmF0ZXMgYWxpYXNpbmcgbGVha3MgaWYgdGhlIHNhbWVcbiAgICAgICAgICAgICAgICAvLyBzZXR0aW5ncyBvYmplY3QgaXMgcmV1c2VkIGFjcm9zcyBtdWx0aXBsZSAkLmFqYXggY2FsbHMuXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgPyBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGhlYWRlcnM6IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMuaGVhZGVycykgfSlcbiAgICAgICAgICAgICAgICAgICAgOiB7fTtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBqUXVlcnkgRGVmZXJyZWQgdG8gbWFpbnRhaW4gY29tcGF0aWJpbGl0eSB3aXRoIGpRdWVyeSBjb2RlLlxuICAgICAgICAgICAgICAgIC8vIFdlIG11c3QgZXhwb3NlIGEganFYSFItc2hhcGVkIG9iamVjdDogY2FsbGVycyAoU2VtYW50aWMgVUkgYXBpLFxuICAgICAgICAgICAgICAgIC8vIGRyb3Bkb3duIHF1ZXJ5UmVtb3RlKSBjYWxsIC5hYm9ydCgpIC8gLnN0YXRlKCkgLyAuc2V0UmVxdWVzdEhlYWRlcigpXG4gICAgICAgICAgICAgICAgLy8gb24gdGhlIHJldHVybiB2YWx1ZS4gQSBiYXJlIERlZmVycmVkKCkucHJvbWlzZSgpIGxhY2tzIC5hYm9ydCgpXG4gICAgICAgICAgICAgICAgLy8gd2hpY2ggY3Jhc2hlcyBTZW1hbnRpYyBVSSdzIGFib3J0IHBhdGggd2l0aFxuICAgICAgICAgICAgICAgIC8vIFwiVHlwZUVycm9yOiBlLmFib3J0IGlzIG5vdCBhIGZ1bmN0aW9uXCIgKHNlZSBTZW50cnkgTUlLT1BCWC1NSEMpLlxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgICAgICAgICAgIGxldCBwZW5kaW5nSnFYSFIgPSBudWxsO1xuICAgICAgICAgICAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGxlciBhbHJlYWR5IGFib3J0ZWQgYmVmb3JlIHdlIGdvdCBhIGNoYW5jZSB0byBkaXNwYXRjaDtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWJvcnQoKSBoYXMgYWxyZWFkeSByZWplY3RlZCB0aGUgZGVmZXJyZWQg4oCUIG5vdGhpbmcgdG8gZG8uXG4gICAgICAgICAgICAgICAgICAgIGlmIChhYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4gJiYgIW9wdGlvbnMuaGVhZGVycy5BdXRob3JpemF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBc3NpZ24gcGVuZGluZ0pxWEhSIEJFRk9SRSBjaGFpbmluZyBzbyBhIHN5bmNocm9ub3VzIGFib3J0KClcbiAgICAgICAgICAgICAgICAgICAgLy8gKGUuZy4sIGZyb20gYSBzZXR0bGVkLWZyb20tY2FjaGUganFYSFIpIHJvdXRlcyB2aWEgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vIHBvc3QtZGlzcGF0Y2ggYnJhbmNoIGluc3RlYWQgb2YgcmUtcmVqZWN0aW5nIHRoZSBkZWZlcnJlZC5cbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ0pxWEhSID0gdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICA/IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIHVybCwgb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogb3JpZ2luYWxBamF4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgY2FsbGJhY2tzIChwcmVzZXJ2ZSBgdGhpc2AgYW5kIGZ1bGwgYXJndW1lbnQgbGlzdCkuXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdKcVhIUlxuICAgICAgICAgICAgICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKC4uLmFyZ3MpIHsgZGVmZXJyZWQucmVzb2x2ZVdpdGgodGhpcywgYXJncyk7IH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmFpbChmdW5jdGlvbiAoLi4uYXJncykgeyBkZWZlcnJlZC5yZWplY3RXaXRoKHRoaXMsIGFyZ3MpOyB9KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBqcVhIUlByb3h5ID0gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgIGpxWEhSUHJveHkuYWJvcnQgPSBmdW5jdGlvbiAoc3RhdHVzVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVuZGluZ0pxWEhSICYmIHR5cGVvZiBwZW5kaW5nSnFYSFIuYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlbmRpbmdKcVhIUi5hYm9ydChzdGF0dXNUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFByZS1kaXNwYXRjaCBhYm9ydDogbWFyayB0aGUgcmVxdWVzdCBhbmQgcmVqZWN0IHRoZSBkZWZlcnJlZFxuICAgICAgICAgICAgICAgICAgICAvLyBvdXJzZWx2ZXM7IHRoZSAudGhlbigpIGNhbGxiYWNrIHdpbGwgc2VlIGBhYm9ydGVkYCBhbmQgc2tpcFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgb3JpZ2luYWxBamF4IGNhbGwgZW50aXJlbHkuIHN0YXR1c1RleHQgaXMgZm9yd2FyZGVkIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpc3RlbmVycyB2aWEgcmVqZWN0V2l0aCDigJQgbm8gbmVlZCB0byBzdGFzaCBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0V2l0aCh0aGlzLCBbbnVsbCwgJ2Fib3J0Jywgc3RhdHVzVGV4dCB8fCAnYWJvcnQnXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5zZXRSZXF1ZXN0SGVhZGVyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5zZXRSZXF1ZXN0SGVhZGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZW5kaW5nSnFYSFIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ganFYSFJQcm94eTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQcmUtZGlzcGF0Y2g6IHN0YXNoIGhlYWRlciBpbiAoY2xvbmVkKSBvcHRpb25zIHNvIGl0IHNoaXBzXG4gICAgICAgICAgICAgICAgICAgIC8vIHdpdGggdGhlIHJlcXVlc3Qgb25jZSB0b2tlbk1hbmFnZXJSZWFkeSByZXNvbHZlcy5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5nZXRSZXNwb25zZUhlYWRlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5nZXRSZXNwb25zZUhlYWRlciA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBwZW5kaW5nSnFYSFIuZ2V0UmVzcG9uc2VIZWFkZXIobmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGpxWEhSUHJveHkuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGVuZGluZ0pxWEhSICYmIHR5cGVvZiBwZW5kaW5nSnFYSFIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHBlbmRpbmdKcVhIUi5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIERlZmluZWQgYXMgbm9uLWVudW1lcmFibGUgZ2V0dGVycyBieSBkZXNpZ24gc28gdGhlIHByb3h5XG4gICAgICAgICAgICAgICAgLy8gZG9lc24ndCBleHBvc2UgZXh0cmEga2V5cyB0byBgZm9y4oCmaW5gIGNvbnN1bWVycyAocmVhbCBqcVhIUlxuICAgICAgICAgICAgICAgIC8vIGV4cG9zZXMgdGhlc2UgYXMgb3duIGVudW1lcmFibGUgcHJvcGVydGllczsgdGhlIHByb3h5IGlzXG4gICAgICAgICAgICAgICAgLy8gaW50ZW50aW9uYWxseSBhIHN0cmljdGVyIHN1YnNldCkuXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdyZWFkeVN0YXRlJywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIucmVhZHlTdGF0ZSA6IDA7IH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdzdGF0dXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5zdGF0dXMgOiAwOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAnc3RhdHVzVGV4dCcsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnN0YXR1c1RleHQgOiAnJzsgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoanFYSFJQcm94eSwgJ3Jlc3BvbnNlVGV4dCcsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnJlc3BvbnNlVGV4dCA6ICcnOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAncmVzcG9uc2VKU09OJywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIucmVzcG9uc2VKU09OIDogdW5kZWZpbmVkOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAncmVzcG9uc2VYTUwnLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5yZXNwb25zZVhNTCA6IHVuZGVmaW5lZDsgfSxcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUb2tlbk1hbmFnZXIgbm90IGluaXRpYWxpemVkIHlldCAtIHByb2NlZWQgd2l0aG91dCB0b2tlblxuICAgICAgICAgICAgLy8gKHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIG9uIGxvZ2luIHBhZ2UpXG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWxzbyBzZXQgdXAgZXJyb3IgaGFuZGxlclxuICAgICAgICAkKGRvY3VtZW50KS5hamF4RXJyb3IoKGV2ZW50LCB4aHIsIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdW5hdXRob3JpemVkIGVycm9yc1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBkb24ndCB0cmlnZ2VyIGxvZ291dCBsb29wXG4gICAgICAgICAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICAgICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vdGU6IHdlIGRlbGliZXJhdGVseSBkbyBOT1Qgd3JhcCAkLmZuLmFwaSBoZXJlLiBTZW1hbnRpYyBVSSdzXG4gICAgICAgIC8vICQuZm4uYXBpIHVzZXMgJC5hamF4KCkgdW5kZXIgdGhlIGhvb2QsIHNvIHRoZSB3cmFwcGVyIGFib3ZlIGFscmVhZHlcbiAgICAgICAgLy8gaW5qZWN0cyB0aGUgQXV0aG9yaXphdGlvbiBoZWFkZXIuIEEgc2Vjb25kIHdyYXBwZXIgdGhhdCByZXR1cm5lZCBhXG4gICAgICAgIC8vIERlZmVycmVkIGZyb20gYmVmb3JlU2VuZCB2aW9sYXRlcyBTZW1hbnRpYyBVSSdzIGNvbnRyYWN0IChpdCBleHBlY3RzXG4gICAgICAgIC8vIHNldHRpbmdzIG9yIGZhbHNlKSBhbmQgd2FzIHRoZSBvcmlnaW5hbCBzb3VyY2Ugb2YgdGhlXG4gICAgICAgIC8vIFwiVHlwZUVycm9yOiBlLmFib3J0IGlzIG5vdCBhIGZ1bmN0aW9uXCIgY3Jhc2hlcyBpbiBkcm9wZG93blxuICAgICAgICAvLyBxdWVyeVJlbW90ZSAoc2VlIFNlbnRyeSBNSUtPUEJYLU1IQyBhbmQgcmVsYXRlZCBncm91cHMpLlxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2dvdXQgLSBjbGVhciB0b2tlbnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICogLSBDYWxscyBSRVNUIEFQSSB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW5cbiAgICAgKiAtIENsZWFycyBhY2Nlc3MgdG9rZW4gZnJvbSBtZW1vcnlcbiAgICAgKiAtIERlbGV0ZXMgcmVmcmVzaFRva2VuIGNvb2tpZSBmcm9tIGJyb3dzZXJcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBwYWdlXG4gICAgICovXG4gICAgYXN5bmMgbG9nb3V0KCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgb24gbG9naW4gcGFnZSAtIHByZXZlbnQgcmVkaXJlY3QgbG9vcFxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgb24gbG9naW4gcGFnZSAtIGNsZWFyIHN0YXRlXG4gICAgICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBBSkFYIGVuZHBvaW50XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gZXhpc3RzIGJ1dCBpcyBleHBpcmVkXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGAsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKF9qcVhIUiwgc3RhdHVzLCBlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBsb2dvdXQgY2FsbHNcbiAgICAgICAgaWYgKCF0aGlzLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBlbmRwb2ludCBiZWZvcmUgcmVkaXJlY3RcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYCxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkIGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsbCBsb2dvdXQgZW5kcG9pbnQgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuIGluIFJlZGlzXG4gICAgICAgICAgICBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ291dCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5hY2Nlc3NUb2tlbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBJZiBBUEkgZmFpbHMgKGUuZy4sIDQwMSB3aXRoIGV4cGlyZWQgdG9rZW4pLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFyIHRoZSBjb29raWVcbiAgICAgICAgICAgIC8vIFVzZSBzZXJ2ZXItc2lkZSBzZXNzaW9uL2VuZCBlbmRwb2ludCBhcyBmYWxsYmFjayB0byBjbGVhciBodHRwT25seSBjb29raWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGxvY2FsIHN0YXRlXG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDUklUSUNBTDogUmVkaXJlY3QgdG8gL3Nlc3Npb24vZW5kIHdoaWNoIGNsZWFycyBodHRwT25seSBjb29raWUgc2VydmVyLXNpZGVcbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhdXRoZW50aWNhdGlvbiBsb29wIHdoZW4gcmVmcmVzaFRva2VuIGNvb2tpZSBleGlzdHMgYnV0IGlzIGV4cGlyZWRcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqXG4gICAgICogSU1QT1JUQU5UOiBodHRwT25seSBjb29raWVzIENBTk5PVCBiZSBkZWxldGVkIHZpYSBKYXZhU2NyaXB0IChkb2N1bWVudC5jb29raWUpLlxuICAgICAqIFRoZXkgY2FuIG9ubHkgYmUgY2xlYXJlZCBieSB0aGUgc2VydmVyIHZpYSBTZXQtQ29va2llIGhlYWRlci5cbiAgICAgKlxuICAgICAqIFRoZSAvYXV0aDpsb2dvdXQgZW5kcG9pbnQgaGFuZGxlcyBjb29raWUgZGVsZXRpb24gb24gc2VydmVyIHNpZGUuXG4gICAgICogVGhpcyBtZXRob2QgZXhpc3RzIGZvciBub24taHR0cE9ubHkgZmFsbGJhY2sgc2NlbmFyaW9zIG9ubHkuXG4gICAgICpcbiAgICAgKiBGb3IgaHR0cE9ubHkgY29va2llcywgd2UgcmVseSBvbjpcbiAgICAgKiAxLiBTZXJ2ZXItc2lkZSBjb29raWUgZGVsZXRpb24gaW4gL2F1dGg6bG9nb3V0IHJlc3BvbnNlXG4gICAgICogMi4gU2Vzc2lvbkNvbnRyb2xsZXIuZW5kQWN0aW9uKCkgd2hpY2ggYWxzbyBjbGVhcnMgdGhlIGNvb2tpZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSgpIHtcblxuICAgICAgICAvLyBOT1RFOiBUaGlzIHdvbid0IHdvcmsgZm9yIGh0dHBPbmx5IGNvb2tpZXMsIGJ1dCB0cnkgYW55d2F5IGZvciBub24taHR0cE9ubHkgZmFsbGJhY2tcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9LzsgU2FtZVNpdGU9U3RyaWN0JztcblxuICAgICAgICAvLyBGb3IgSFRUUFMgKHNlY3VyZSBmbGFnKVxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuICAgICAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9Lzsgc2VjdXJlOyBTYW1lU2l0ZT1TdHJpY3QnO1xuICAgICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBpcyBhdXRoZW50aWNhdGVkXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgYWNjZXNzIHRva2VuIGV4aXN0c1xuICAgICAqL1xuICAgIGlzQXV0aGVudGljYXRlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNjZXNzVG9rZW4gIT09IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlRva2VuTWFuYWdlciA9IFRva2VuTWFuYWdlcjtcblxuLy8gQ1JJVElDQUw6IFNldCB1cCBBSkFYIGludGVyY2VwdG9yIElNTUVESUFURUxZIG9uIHNjcmlwdCBsb2FkXG4vLyBUaGlzIGVuc3VyZXMgQUxMIEFKQVggcmVxdWVzdHMgd2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uXG4vLyBldmVuIGlmIHRoZXkncmUgZmlyZWQgYmVmb3JlICQoZG9jdW1lbnQpLnJlYWR5KClcblRva2VuTWFuYWdlci5zZXR1cEdsb2JhbEFqYXgoKTtcblxuLy8gQ1JJVElDQUw6IENyZWF0ZSB0b2tlbk1hbmFnZXJSZWFkeSBwcm9taXNlIElNTUVESUFURUxZXG4vLyBDaGVjayBpZiB3ZSdyZSBvbiBsb2dpbiBwYWdlIC0gaWYgbm90LCBzdGFydCBpbml0aWFsaXphdGlvbiByaWdodCBhd2F5XG4vLyBUaGlzIGVuc3VyZXMgdGhlIHByb21pc2UgZXhpc3RzIGJlZm9yZSBBTlkgb3RoZXIgc2NyaXB0IHJ1bnNcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zIG9uIHRoZSBzYW1lIHBhZ2VcbiAgICBpZiAoIXdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIE5vdCBsb2dpbiBwYWdlIC0gc3RhcnQgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAvLyBUaGlzIGhhcHBlbnMgQkVGT1JFICQoZG9jdW1lbnQpLnJlYWR5LCBlbnN1cmluZyB0b2tlbiBpcyByZWFkeSBBU0FQXG4gICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkgPSBUb2tlbk1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTG9naW4gcGFnZSAtIHJlc29sdmUgaW1tZWRpYXRlbHkgKG5vIGF1dGhlbnRpY2F0aW9uIG5lZWRlZClcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFByb21pc2UucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgfVxufVxuIl19