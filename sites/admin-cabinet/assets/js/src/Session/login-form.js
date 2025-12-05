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

/* global globalRootUrl,globalTranslate,Form,Config */

const loginForm = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#login-form'),

    /**
     * The jQuery object for the submit button.
     * @type {jQuery}
     */
    $submitButton: $('#submitbutton'),

    /**
     * The jQuery object for the password field.
     * @type {jQuery}
     */
    $passwordField: $('#password'),

    /**
     * The jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkBoxes: $('.checkbox'),

    /**
     * Passkey login button
     * @type {jQuery}
     */
    $passkeyButton: $('#passkey-login-button'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        login: {
            identifier: 'login',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.auth_ValidateLoginNotEmpty,
                },
            ],
        },
        password: {
            identifier: 'password',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.auth_ValidatePasswordNotEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the login form functionality.
     */
    initialize() {
        loginForm.checkPasskeySupport();
        loginForm.bindEvents();
        loginForm.initializeFormValidation();
        loginForm.$checkBoxes.checkbox();
    },

    /**
     * Check if browser supports WebAuthn and connection is secure
     * WebAuthn requires HTTPS or localhost
     * Hide passkey button and OR divider if not supported
     */
    checkPasskeySupport() {
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '[::1]';
        const isSecure = window.location.protocol === 'https:';
        const hasWebAuthn = window.PublicKeyCredential !== undefined;

        // Show passkey button only if:
        // 1. Browser supports WebAuthn AND
        // 2. Connection is HTTPS OR localhost
        if (!hasWebAuthn || (!isSecure && !isLocalhost)) {
            loginForm.$passkeyButton.hide();
            // Also hide the OR divider
            $('.ui.horizontal.divider').hide();
        }
    },

    /**
     * Bind form events
     */
    bindEvents() {
        // Prevent default form submission - we use AJAX only
        loginForm.$formObj.on('submit', (e) => {
            e.preventDefault();
            return false;
        });

        // Handle submit button click - password authentication via REST API
        loginForm.$submitButton.on('click', (e) => {
            e.preventDefault();
            loginForm.$formObj.form('validate form');
            if (loginForm.$formObj.form('is valid')) {
                loginForm.submitLogin();
            }
        });

        // Handle enter key on password field
        loginForm.$passwordField.on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                loginForm.$submitButton.click();
            }
        });

        // Handle passkey button click - usernameless authentication
        loginForm.$passkeyButton.on('click', (e) => {
            e.preventDefault();
            loginForm.authenticateWithPasskey();
        });

        // Clear error messages on input
        $('input').on('input', () => {
            $('.message.ajax').remove();
        });
    },

    /**
     * Submit login via REST API /pbxcore/api/v3/auth:login
     * Получает JWT access token и refresh token cookie
     */
    async submitLogin() {
        loginForm.$submitButton.addClass('loading disabled');
        $('.message.ajax').remove();

        try {
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:login',
                method: 'POST',
                dataType: 'json',
                data: {
                    login: $('#login').val(),
                    password: $('#password').val(),
                    rememberMe: $('#rememberMeCheckBox').is(':checked')
                }
            });

            console.log('[LOGIN] API Response:', {
                result: response.result,
                hasData: !!response.data,
                hasAccessToken: !!(response.data && response.data.accessToken),
                tokenLength: response.data?.accessToken?.length,
                expiresIn: response.data?.expiresIn
            });

            if (response.result && response.data && response.data.accessToken) {
                console.log('[LOGIN] Login successful, access token received');
                console.log('[LOGIN] Refresh cookie should be set, testing with immediate refresh...');

                // Test refresh token cookie by calling /auth:refresh immediately
                // This verifies the cookie is working before redirecting
                loginForm.testRefreshAndRedirect();
            } else {
                console.error('[LOGIN] Invalid response:', response);
                loginForm.showError(response.messages || { error: [globalTranslate.auth_WrongLoginPassword] });
            }
        } catch (error) {
            console.error('Login error:', error);

            // Distinguish network errors from authentication errors
            const status = error.status || 0;

            if (status === 0 || status >= 502) {
                // Network error or server unavailable (502, 503, 504)
                loginForm.showError({ error: [globalTranslate.auth_ServerUnavailable] });
            } else if (error.responseJSON && error.responseJSON.messages) {
                // API returned error with message (e.g., wrong password, rate limit)
                loginForm.showError(error.responseJSON.messages);
            } else {
                // Unknown error - show generic message
                loginForm.showError({ error: [globalTranslate.auth_WrongLoginPassword] });
            }
        } finally {
            loginForm.$submitButton.removeClass('loading disabled');
        }
    },

    /**
     * Test refresh token cookie and redirect if successful
     * Called immediately after login to verify cookie is set correctly
     */
    async testRefreshAndRedirect() {
        try {
            // Wait 100ms for browser to process Set-Cookie header
            // The cookie is set in the response, but browsers need time to store it
            // before it's available for the next request
            console.log('[LOGIN] Waiting for browser to process Set-Cookie header...');
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('[LOGIN] Calling /auth:refresh to test cookie...');
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:refresh',
                method: 'POST',
                dataType: 'json',
            });

            console.log('[LOGIN] Refresh response:', response);

            if (response.result && response.data && response.data.accessToken) {
                console.log('[LOGIN] Refresh successful! Cookie is working.');
                console.log('[LOGIN] Storing new access token and redirecting...');

                // Store the NEW access token from refresh
                TokenManager.setAccessToken(
                    response.data.accessToken,
                    response.data.expiresIn
                );

                // Redirect to user's configured home page from API response
                const redirectUrl = response.data.homePage || `${globalRootUrl}extensions/index`;
                window.location = redirectUrl;
            } else {
                console.error('[LOGIN] Refresh failed - cookie not working');
                loginForm.showError({ error: [globalTranslate.auth_RefreshTokenError || 'Refresh token error'] });
            }
        } catch (error) {
            console.error('[LOGIN] Refresh test failed:', error);
            loginForm.showError({ error: [globalTranslate.auth_RefreshTokenError || 'Refresh token error'] });
        }
    },

    /**
     * Authenticate user with Passkey (usernameless flow)
     * Browser will show all available passkeys for this domain
     */
    async authenticateWithPasskey() {
        // Show loading state
        loginForm.$submitButton.addClass('loading disabled');
        loginForm.$passkeyButton.addClass('loading disabled');
        $('.message.ajax').remove();

        try {
            // Get origin for WebAuthn
            const origin = window.location.origin;

            // Step 1: Get challenge from REST API (without login - usernameless)
            const startResponse = await $.ajax({
                url: '/pbxcore/api/v3/passkeys:authenticationStart',
                method: 'GET',
                data: { origin }, // No login parameter - usernameless authentication
            });

            if (!startResponse.result || !startResponse.data) {
                loginForm.$submitButton.removeClass('loading disabled');
                loginForm.$passkeyButton.removeClass('loading disabled');
                // Extract error message from response
                const errorMessage = startResponse.messages?.error?.[0] || globalTranslate.pk_LoginError;
                loginForm.showError([errorMessage]);
                return;
            }

            // Step 2: Call WebAuthn API - browser will show all available passkeys
            const publicKeyOptions = loginForm.prepareCredentialRequestOptions(startResponse.data);
            const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });

            // Step 3: Send assertion to REST API for verification
            const assertionData = loginForm.prepareAssertionData(assertion, startResponse.data);
            const finishResponse = await $.ajax({
                url: '/pbxcore/api/v3/passkeys:authenticationFinish',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(assertionData),
            });

            loginForm.$submitButton.removeClass('loading disabled');
            loginForm.$passkeyButton.removeClass('loading disabled');

            if (finishResponse.result) {
                // Start session via SessionController
                await loginForm.createSessionFromPasskey(finishResponse.data);
            } else {
                // Extract error messages from response
                const errorMessage = finishResponse.messages?.error?.[0] || globalTranslate.pk_LoginError;
                loginForm.showError([errorMessage]);
            }
        } catch (error) {
            loginForm.$submitButton.removeClass('loading disabled');
            loginForm.$passkeyButton.removeClass('loading disabled');
            console.error('Passkey authentication error:', error);

            // Check if user cancelled
            if (error.name === 'NotAllowedError') {
                // User cancelled - don't show error
                return;
            }

            // Extract error message from API response or use default
            let errorMessage = globalTranslate.pk_LoginError;
            if (error.responseJSON?.messages?.error?.[0]) {
                errorMessage = error.responseJSON.messages.error[0];
            } else if (error.message) {
                errorMessage = `${globalTranslate.pk_LoginError}: ${error.message}`;
            }

            loginForm.showError([errorMessage]);
        }
    },

    /**
     * Login with passkey authentication using sessionToken
     * SessionToken is exchanged for JWT tokens via REST API
     */
    async createSessionFromPasskey(authData) {
        try {
            // Check if remember me is selected
            const rememberMe = $('#rememberMeCheckBox').is(':checked');

            // Exchange sessionToken for JWT tokens via REST API
            const response = await $.ajax({
                url: '/pbxcore/api/v3/auth:login',
                method: 'POST',
                dataType: 'json',
                data: {
                    sessionToken: authData.sessionToken,
                    rememberMe: rememberMe
                }
            });

            if (response.result && response.data && response.data.accessToken) {
                console.log('[PASSKEY] Login successful, testing refresh cookie...');
                // Test refresh token cookie before redirect
                loginForm.testRefreshAndRedirect();
            } else {
                // Extract error message from response
                const errorMessage = response.messages?.error?.[0] || globalTranslate.pk_LoginError;
                loginForm.showError([errorMessage]);
            }
        } catch (error) {
            console.error('Passkey login error:', error);
            // Extract error message from API response or use default
            const errorMessage = error.responseJSON?.messages?.error?.[0] || globalTranslate.pk_LoginError;
            loginForm.showError([errorMessage]);
        }
    },

    /**
     * Prepare credential request options for WebAuthn API
     */
    prepareCredentialRequestOptions(serverData) {
        return {
            challenge: loginForm.base64urlToArrayBuffer(serverData.challenge),
            timeout: serverData.timeout || 60000,
            rpId: serverData.rpId,
            allowCredentials: serverData.allowCredentials.map(cred => ({
                type: 'public-key',
                id: loginForm.base64urlToArrayBuffer(cred.id),
            })),
            userVerification: serverData.userVerification || 'preferred',
        };
    },

    /**
     * Prepare assertion data to send to server
     */
    prepareAssertionData(assertion, serverData) {
        const response = assertion.response;

        return {
            sessionId: serverData.sessionId,
            credentialId: loginForm.arrayBufferToBase64url(assertion.rawId),
            authenticatorData: loginForm.arrayBufferToBase64url(response.authenticatorData),
            clientDataJSON: loginForm.arrayBufferToBase64url(response.clientDataJSON),
            signature: loginForm.arrayBufferToBase64url(response.signature),
            userHandle: response.userHandle ? loginForm.arrayBufferToBase64url(response.userHandle) : null,
        };
    },

    /**
     * Convert base64url string to ArrayBuffer
     */
    base64urlToArrayBuffer(base64url) {
        const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray.buffer;
    },

    /**
     * Convert ArrayBuffer to base64url string
     */
    arrayBufferToBase64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    /**
     * Show error message
     */
    showError(messages) {
        const errorHtml = Array.isArray(messages)
            ? messages.join('<br>')
            : (messages.error ? messages.error.join('<br>') : 'Unknown error');

        loginForm.$formObj.before(`<div class="ui error message ajax">${errorHtml}</div>`);
    },

    /**
     * Initialize form validation using Fomantic UI
     */
    initializeFormValidation() {
        loginForm.$formObj.form({
            fields: loginForm.validateRules,
            onSuccess(event) {
                // Prevent default form submission if event exists
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
            }
        });
    },
};

// When the document is ready, initialize the login form.
$(document).ready(() => {
    loginForm.initialize();
});
