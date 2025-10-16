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
        console.log('TokenManager.initialize() called');

        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('TokenManager already initialized, skipping');
            return this.accessToken !== null;
        }

        // Try to get access token using refresh token cookie
        const hasToken = await this.startupRefresh();

        console.log('Startup refresh result:', hasToken);

        if (!hasToken) {
            // No valid refresh token → redirect to login
            console.log('No valid token - redirecting to login');
            window.location = `${globalRootUrl}session/index`;
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
    async startupRefresh() {
        console.log('TokenManager.startupRefresh() called');

        if (this.isRefreshing) {
            console.log('Already refreshing, skipping');
            return false;
        }

        this.isRefreshing = true;

        try {
            console.log('Calling /auth:refresh to get access token');
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:refresh',
                method: 'POST',
                dataType: 'json',
                // Don't send Authorization header (using refresh cookie)
                headers: {}
            });

            console.log('Refresh response:', response);

            if (response.result && response.data && response.data.accessToken) {
                console.log('Got access token, expires in:', response.data.expiresIn);
                this.setAccessToken(
                    response.data.accessToken,
                    response.data.expiresIn
                );
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
    setAccessToken(token, expiresIn) {
        console.log('Setting access token, expires in:', expiresIn, 'seconds');
        this.accessToken = token;

        // Update Stoplight Elements localStorage with new token
        // WHY: Elements reads from localStorage.TryIt_securitySchemeValues for "Try It" functionality
        // This keeps the token fresh after silent refresh (every 13 minutes)
        try {
            localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
                'bearerAuth': token
            }));
        } catch (e) {
            console.log('Failed to update localStorage for Stoplight Elements:', e);
        }

        // Clear existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // Schedule silent refresh 2 minutes before expiration
        // Default: 900s (15 min) - 120s = 780s (13 min)
        const refreshAt = Math.max((expiresIn - 120), 60) * 1000;

        console.log('Silent refresh scheduled in:', refreshAt / 1000, 'seconds');

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
                // Create jQuery Deferred to maintain compatibility with jQuery code
                const deferred = $.Deferred();

                window.tokenManagerReady.then(() => {
                    // Add Authorization header
                    options = options || {};
                    options.headers = options.headers || {};
                    if (self.accessToken && !options.headers.Authorization) {
                        options.headers.Authorization = `Bearer ${self.accessToken}`;
                    }

                    // Call original $.ajax and forward its result to our deferred
                    const jqXHR = url ? originalAjax.call(this, url, options) : originalAjax.call(this, options);

                    // Forward all callbacks
                    jqXHR.done((...args) => deferred.resolve(...args))
                         .fail((...args) => deferred.reject(...args));

                }).catch((error) => {
                    console.error('TokenManager initialization failed:', error);
                    deferred.reject(error);
                });

                return deferred.promise();
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

        // Wrap Semantic UI $.api() if available
        // This is needed because some modules use $.api() instead of $.ajax()
        if ($.fn.api) {
            const originalApi = $.fn.api;
            $.fn.api = function(settings) {
                // Get settings
                const config = settings || {};

                // Skip auth endpoints
                const url = config.url || '';
                if (url.includes('/auth:login') || url.includes('/auth:refresh')) {
                    return originalApi.call(this, settings);
                }

                // Wrap beforeSend to add Authorization header
                const originalBeforeSend = config.beforeSend;
                config.beforeSend = function(settings) {
                    // Wait for TokenManager if available
                    if (window.tokenManagerReady) {
                        const deferred = $.Deferred();

                        window.tokenManagerReady.then(() => {
                            // Add Authorization header
                            settings.beforeXHR = function(xhr) {
                                if (self.accessToken) {
                                    xhr.setRequestHeader('Authorization', `Bearer ${self.accessToken}`);
                                }
                            };

                            // Call original beforeSend if exists
                            if (originalBeforeSend) {
                                originalBeforeSend.call(this, settings);
                            }

                            deferred.resolve(settings);
                        });

                        return deferred.promise();
                    }

                    // Call original beforeSend
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
    async logout() {
        console.log('TokenManager.logout() called');

        // Check if already on login page - prevent redirect loop
        const isLoginPage = window.location.pathname.includes('/session/index') ||
                           window.location.pathname.includes('/session/');

        if (isLoginPage) {
            console.log('Already on login page - clearing state and cookie');
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
                    console.log('Cookie cleared via /session/end');
                },
                error: (_jqXHR, status, error) => {
                    console.log('Error clearing cookie:', status, error);
                }
            });
            return;
        }

        // Prevent multiple logout calls
        if (!this.accessToken) {
            console.log('No access token - clearing cookie via /session/end');
            // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect
            try {
                $.ajax({
                    url: `${globalRootUrl}session/end`,
                    method: 'POST',
                    async: false, // Synchronous to ensure cookie is cleared before redirect
                    success: () => {
                        console.log('Cookie cleared via /session/end');
                    }
                });
            } catch (e) {
                console.log('Error clearing cookie:', e);
            }
            window.location = `${globalRootUrl}session/index`;
            return;
        }

        try {
            // Call logout endpoint to invalidate refresh token in Redis
            console.log('Calling /auth:logout API');
            await $.ajax({
                url: '/pbxcore/api/v3/auth:logout',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });
            console.log('Logout API call successful');
        } catch (error) {
            console.log('Logout API error:', error.status, error.statusText);
            // If API fails (e.g., 401 with expired token), we still need to clear the cookie
            // Use server-side session/end endpoint as fallback to clear httpOnly cookie
            console.log('Using /session/end fallback to clear cookie');
        }

        // Clear local state
        this.accessToken = null;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
        // This prevents authentication loop when refreshToken cookie exists but is expired
        console.log('Redirecting to /session/end to clear cookie');
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
        console.log('Attempting to delete refreshToken cookie (client-side)');

        // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';

        // For HTTPS (secure flag)
        if (window.location.protocol === 'https:') {
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
        }

        console.log('Client-side cookie deletion attempted (httpOnly cookies require server-side deletion)');
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
        console.log('Creating tokenManagerReady promise');

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
        console.log('tokenManagerReady already exists, skipping initialization');
    }
}
