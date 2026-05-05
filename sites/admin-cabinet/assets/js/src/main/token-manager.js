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
const TokenManager = {
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
    async initialize() {

        // Prevent multiple initializations
        if (this.isInitialized) {
            return this.accessToken !== null;
        }

        // Try to get access token using refresh token cookie
        const hasToken = await this.startupRefresh();


        if (!hasToken) {
            // No valid refresh token → redirect to login
            window.location = `${globalRootUrl}session/index`;
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
    async startupRefresh() {

        if (this.isRefreshing) {
            return false;
        }

        this.isRefreshing = true;

        try {
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:refresh',
                method: 'POST',
                dataType: 'json',
                // Don't send Authorization header (using refresh cookie)
                headers: {}
            });


            if (response.result && response.data && response.data.accessToken) {
                this.setAccessToken(
                    response.data.accessToken,
                    response.data.expiresIn
                );
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
    setAccessToken(token, expiresIn) {
        this.accessToken = token;

        // Clear existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // Schedule silent refresh 2 minutes before expiration
        // Default: 900s (15 min) - 120s = 780s (13 min)
        const refreshAt = Math.max((expiresIn - 120), 60) * 1000;


        this.refreshTimer = setTimeout(() => {
            this.silentRefresh();
        }, refreshAt);
    },

    /**
     * Silent refresh - update access token before it expires
     * Automatically called by timer, transparent to user
     */
    async silentRefresh() {
        if (this.isRefreshing) {
            return;
        }

        this.isRefreshing = true;

        try {
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:refresh',
                method: 'POST',
                dataType: 'json',
                // Don't send Authorization header (using refresh cookie)
                headers: {}
            });

            if (response.result && response.data && response.data.accessToken) {
                this.setAccessToken(
                    response.data.accessToken,
                    response.data.expiresIn
                );
            } else {
                // Refresh failed → logout
                this.logout();
            }
        } catch (error) {
            console.error('Silent refresh failed:', error);
            // Refresh failed → logout
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
    setupGlobalAjax() {
        const self = this;

        // Store original $.ajax
        const originalAjax = $.ajax;

        // Wrap $.ajax to wait for token initialization
        $.ajax = function(url, options) {
            // Handle both $.ajax(url, options) and $.ajax(options) signatures
            if (typeof url === 'object') {
                options = url;
                url = undefined;
            }

            // Skip auth endpoints (they use refresh cookie, not access token)
            const requestUrl = url || options.url || '';
            if (requestUrl.includes('/auth:login') || requestUrl.includes('/auth:refresh')) {
                return originalAjax.apply(this, arguments);
            }

            // Wait for TokenManager initialization before proceeding
            if (window.tokenManagerReady) {
                // Shallow-clone options (and headers) so our header injection
                // and pre-dispatch setRequestHeader writes don't mutate the
                // caller's object. Eliminates aliasing leaks if the same
                // settings object is reused across multiple $.ajax calls.
                options = options
                    ? Object.assign({}, options, { headers: Object.assign({}, options.headers) })
                    : {};

                // Create jQuery Deferred to maintain compatibility with jQuery code.
                // We must expose a jqXHR-shaped object: callers (Semantic UI api,
                // dropdown queryRemote) call .abort() / .state() / .setRequestHeader()
                // on the return value. A bare Deferred().promise() lacks .abort()
                // which crashes Semantic UI's abort path with
                // "TypeError: e.abort is not a function" (see Sentry MIKOPBX-MHC).
                const deferred = $.Deferred();
                let pendingJqXHR = null;
                let aborted = false;

                window.tokenManagerReady.then(() => {
                    // Caller already aborted before we got a chance to dispatch;
                    // abort() has already rejected the deferred — nothing to do.
                    if (aborted) {
                        return;
                    }

                    // Add Authorization header
                    if (self.accessToken && !options.headers.Authorization) {
                        options.headers.Authorization = `Bearer ${self.accessToken}`;
                    }

                    // Assign pendingJqXHR BEFORE chaining so a synchronous abort()
                    // (e.g., from a settled-from-cache jqXHR) routes via the
                    // post-dispatch branch instead of re-rejecting the deferred.
                    pendingJqXHR = url
                        ? originalAjax.call(this, url, options)
                        : originalAjax.call(this, options);

                    // Forward all callbacks (preserve `this` and full argument list).
                    pendingJqXHR
                        .done(function (...args) { deferred.resolveWith(this, args); })
                        .fail(function (...args) { deferred.rejectWith(this, args); });
                }).catch((error) => {
                    console.error('TokenManager initialization failed:', error);
                    deferred.reject(error);
                });

                const jqXHRProxy = deferred.promise();
                jqXHRProxy.abort = function (statusText) {
                    if (pendingJqXHR && typeof pendingJqXHR.abort === 'function') {
                        pendingJqXHR.abort(statusText);
                        return jqXHRProxy;
                    }
                    // Pre-dispatch abort: mark the request and reject the deferred
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
                    }
                    // Pre-dispatch: stash header in (cloned) options so it ships
                    // with the request once tokenManagerReady resolves.
                    options.headers[name] = value;
                    return jqXHRProxy;
                };
                jqXHRProxy.getResponseHeader = function (name) {
                    return pendingJqXHR && typeof pendingJqXHR.getResponseHeader === 'function'
                        ? pendingJqXHR.getResponseHeader(name)
                        : null;
                };
                jqXHRProxy.getAllResponseHeaders = function () {
                    return pendingJqXHR && typeof pendingJqXHR.getAllResponseHeaders === 'function'
                        ? pendingJqXHR.getAllResponseHeaders()
                        : '';
                };
                // Defined as non-enumerable getters by design so the proxy
                // doesn't expose extra keys to `for…in` consumers (real jqXHR
                // exposes these as own enumerable properties; the proxy is
                // intentionally a stricter subset).
                Object.defineProperty(jqXHRProxy, 'readyState', {
                    get() { return pendingJqXHR ? pendingJqXHR.readyState : 0; },
                });
                Object.defineProperty(jqXHRProxy, 'status', {
                    get() { return pendingJqXHR ? pendingJqXHR.status : 0; },
                });
                Object.defineProperty(jqXHRProxy, 'statusText', {
                    get() { return pendingJqXHR ? pendingJqXHR.statusText : ''; },
                });
                Object.defineProperty(jqXHRProxy, 'responseText', {
                    get() { return pendingJqXHR ? pendingJqXHR.responseText : ''; },
                });
                Object.defineProperty(jqXHRProxy, 'responseJSON', {
                    get() { return pendingJqXHR ? pendingJqXHR.responseJSON : undefined; },
                });
                Object.defineProperty(jqXHRProxy, 'responseXML', {
                    get() { return pendingJqXHR ? pendingJqXHR.responseXML : undefined; },
                });

                return jqXHRProxy;
            }

            // TokenManager not initialized yet - proceed without token
            // (this should only happen on login page)
            return originalAjax.apply(this, arguments);
        };

        // Also set up error handler
        $(document).ajaxError((event, xhr, settings) => {
            // Handle unauthorized errors
            if (xhr.status === 401) {
                // Check if we're on login page - don't trigger logout loop
                const isLoginPage = window.location.pathname.includes('/session/index') ||
                                   window.location.pathname.includes('/session/');

                if (!isLoginPage) {
                    // Token expired or invalid → logout
                    self.logout();
                }
            }
        });

        // Note: we deliberately do NOT wrap $.fn.api here. Semantic UI's
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
    async logout() {

        // Check if already on login page - prevent redirect loop
        const isLoginPage = window.location.pathname.includes('/session/index') ||
                           window.location.pathname.includes('/session/');

        if (isLoginPage) {
            // Already on login page - clear state
            this.accessToken = null;
            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }

            // CRITICAL: Clear httpOnly cookie via server-side AJAX endpoint
            // This prevents authentication loop when refreshToken exists but is expired
            $.ajax({
                url: `${globalRootUrl}session/end`,
                method: 'POST',
                async: false, // Synchronous to ensure cookie is cleared
                success: () => {
                },
                error: (_jqXHR, status, error) => {
                }
            });
            return;
        }

        // Prevent multiple logout calls
        if (!this.accessToken) {
            // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect
            try {
                $.ajax({
                    url: `${globalRootUrl}session/end`,
                    method: 'POST',
                    async: false, // Synchronous to ensure cookie is cleared before redirect
                    success: () => {
                    }
                });
            } catch (e) {
            }
            window.location = `${globalRootUrl}session/index`;
            return;
        }

        try {
            // Call logout endpoint to invalidate refresh token in Redis
            await $.ajax({
                url: '/pbxcore/api/v3/auth:logout',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });
        } catch (error) {
            // If API fails (e.g., 401 with expired token), we still need to clear the cookie
            // Use server-side session/end endpoint as fallback to clear httpOnly cookie
        }

        // Clear local state
        this.accessToken = null;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
        // This prevents authentication loop when refreshToken cookie exists but is expired
        window.location = `${globalRootUrl}session/end`;
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
    deleteRefreshTokenCookie() {

        // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';

        // For HTTPS (secure flag)
        if (window.location.protocol === 'https:') {
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
        }

    },

    /**
     * Check if user is authenticated
     * @returns {boolean} true if access token exists
     */
    isAuthenticated() {
        return this.accessToken !== null;
    }
};

// Export for use in other modules
window.TokenManager = TokenManager;

// CRITICAL: Set up AJAX interceptor IMMEDIATELY on script load
// This ensures ALL AJAX requests wait for TokenManager initialization
// even if they're fired before $(document).ready()
TokenManager.setupGlobalAjax();

// CRITICAL: Create tokenManagerReady promise IMMEDIATELY
// Check if we're on login page - if not, start initialization right away
// This ensures the promise exists before ANY other script runs
if (typeof window !== 'undefined') {
    // Prevent multiple initializations on the same page
    if (!window.tokenManagerReady) {

        const isLoginPage = window.location.pathname.includes('/session/index') ||
                           window.location.pathname.includes('/session/');

        if (!isLoginPage) {
            // Not login page - start TokenManager initialization immediately
            // This happens BEFORE $(document).ready, ensuring token is ready ASAP
            window.tokenManagerReady = TokenManager.initialize();
        } else {
            // Login page - resolve immediately (no authentication needed)
            window.tokenManagerReady = Promise.resolve(true);
        }
    } else {
    }
}
