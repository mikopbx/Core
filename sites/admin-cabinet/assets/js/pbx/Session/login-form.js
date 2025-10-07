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

/* global globalRootUrl,globalTranslate,Form,Config */
var loginForm = {
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
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidateLoginNotEmpty
      }]
    },
    password: {
      identifier: 'password',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidatePasswordNotEmpty
      }]
    }
  },

  /**
   * Initializes the login form functionality.
   */
  initialize: function initialize() {
    loginForm.checkPasskeySupport();
    loginForm.bindEvents();
    loginForm.initializeFormValidation();
    loginForm.$checkBoxes.checkbox();
  },

  /**
   * Check if browser supports WebAuthn and hide passkey button if not
   */
  checkPasskeySupport: function checkPasskeySupport() {
    if (window.PublicKeyCredential === undefined) {
      loginForm.$passkeyButton.hide();
    }
  },

  /**
   * Bind form events
   */
  bindEvents: function bindEvents() {
    // Prevent default form submission - we use AJAX only
    loginForm.$formObj.on('submit', function (e) {
      e.preventDefault();
      return false;
    }); // Handle submit button click - password authentication via REST API

    loginForm.$submitButton.on('click', function (e) {
      e.preventDefault();
      loginForm.$formObj.form('validate form');

      if (loginForm.$formObj.form('is valid')) {
        loginForm.submitLogin();
      }
    }); // Handle enter key on password field

    loginForm.$passwordField.on('keypress', function (e) {
      if (e.which === 13) {
        e.preventDefault();
        loginForm.$submitButton.click();
      }
    }); // Handle passkey button click - usernameless authentication

    loginForm.$passkeyButton.on('click', function (e) {
      e.preventDefault();
      loginForm.authenticateWithPasskey();
    }); // Clear error messages on input

    $('input').on('input', function () {
      $('.message.ajax').remove();
    });
  },

  /**
   * Submit login via REST API /pbxcore/api/v3/auth:login
   * Получает JWT access token и refresh token cookie
   */
  submitLogin: async function submitLogin() {
    loginForm.$submitButton.addClass('loading disabled');
    $('.message.ajax').remove();

    try {
      var _response$data, _response$data$access, _response$data2;

      var response = await $.ajax({
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
        tokenLength: (_response$data = response.data) === null || _response$data === void 0 ? void 0 : (_response$data$access = _response$data.accessToken) === null || _response$data$access === void 0 ? void 0 : _response$data$access.length,
        expiresIn: (_response$data2 = response.data) === null || _response$data2 === void 0 ? void 0 : _response$data2.expiresIn
      });

      if (response.result && response.data && response.data.accessToken) {
        // Save JWT in TokenManager (in memory, NOT localStorage!)
        console.log('[LOGIN] Storing access token in TokenManager...');
        TokenManager.setAccessToken(response.data.accessToken, response.data.expiresIn);
        console.log('[LOGIN] Token stored, redirecting...'); // Refresh token is already set in httpOnly cookie automatically
        // Redirect to home page

        window.location = "".concat(globalRootUrl, "extensions/index");
      } else {
        console.error('[LOGIN] Invalid response:', response);
        loginForm.showError(response.messages || {
          error: [globalTranslate.auth_WrongLoginPassword]
        });
      }
    } catch (error) {
      console.error('Login error:', error);

      if (error.responseJSON && error.responseJSON.messages) {
        loginForm.showError(error.responseJSON.messages);
      } else {
        loginForm.showError({
          error: [globalTranslate.auth_WrongLoginPassword]
        });
      }
    } finally {
      loginForm.$submitButton.removeClass('loading disabled');
    }
  },

  /**
   * Authenticate user with Passkey (usernameless flow)
   * Browser will show all available passkeys for this domain
   */
  authenticateWithPasskey: async function authenticateWithPasskey() {
    // Show loading state
    loginForm.$submitButton.addClass('loading disabled');
    loginForm.$passkeyButton.addClass('loading disabled');
    $('.message.ajax').remove();

    try {
      // Get origin for WebAuthn
      var origin = window.location.origin; // Step 1: Get challenge from REST API (without login - usernameless)

      var startResponse = await $.ajax({
        url: '/pbxcore/api/v3/passkeys:authenticationStart',
        method: 'GET',
        data: {
          origin: origin
        } // No login parameter - usernameless authentication

      });

      if (!startResponse.result || !startResponse.data) {
        loginForm.$submitButton.removeClass('loading disabled');
        loginForm.$passkeyButton.removeClass('loading disabled');
        loginForm.showError(startResponse.messages || [globalTranslate.pk_LoginError]);
        return;
      } // Step 2: Call WebAuthn API - browser will show all available passkeys


      var publicKeyOptions = loginForm.prepareCredentialRequestOptions(startResponse.data);
      var assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }); // Step 3: Send assertion to REST API for verification

      var assertionData = loginForm.prepareAssertionData(assertion, startResponse.data);
      var finishResponse = await $.ajax({
        url: '/pbxcore/api/v3/passkeys:authenticationFinish',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(assertionData)
      });
      loginForm.$submitButton.removeClass('loading disabled');
      loginForm.$passkeyButton.removeClass('loading disabled');

      if (finishResponse.result) {
        // Start session via SessionController
        await loginForm.createSessionFromPasskey(finishResponse.data);
      } else {
        loginForm.showError(finishResponse.messages || [globalTranslate.pk_LoginError]);
      }
    } catch (error) {
      loginForm.$submitButton.removeClass('loading disabled');
      loginForm.$passkeyButton.removeClass('loading disabled');
      console.error('Passkey authentication error:', error); // Check if user cancelled

      if (error.name === 'NotAllowedError') {
        // User cancelled - don't show error
        return;
      } // Real error - show message


      loginForm.showError(["".concat(globalTranslate.pk_LoginError, ": ").concat(error.message)]);
    }
  },

  /**
   * Login with passkey authentication using sessionToken
   * SessionToken is exchanged for JWT tokens via REST API
   */
  createSessionFromPasskey: async function createSessionFromPasskey(authData) {
    try {
      // Check if remember me is selected
      var rememberMe = $('#rememberMeCheckBox').is(':checked'); // Exchange sessionToken for JWT tokens via REST API

      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:login',
        method: 'POST',
        dataType: 'json',
        data: {
          sessionToken: authData.sessionToken,
          rememberMe: rememberMe
        }
      });

      if (response.result && response.data && response.data.accessToken) {
        // Save JWT in TokenManager (in memory, NOT localStorage!)
        TokenManager.setAccessToken(response.data.accessToken, response.data.expiresIn); // Refresh token is already set in httpOnly cookie automatically
        // Redirect to home page

        window.location = "".concat(globalRootUrl, "extensions/index");
      } else {
        loginForm.showError(response.messages || [globalTranslate.pk_LoginError]);
      }
    } catch (error) {
      console.error('Passkey login error:', error);
      loginForm.showError([globalTranslate.pk_LoginError]);
    }
  },

  /**
   * Prepare credential request options for WebAuthn API
   */
  prepareCredentialRequestOptions: function prepareCredentialRequestOptions(serverData) {
    return {
      challenge: loginForm.base64urlToArrayBuffer(serverData.challenge),
      timeout: serverData.timeout || 60000,
      rpId: serverData.rpId,
      allowCredentials: serverData.allowCredentials.map(function (cred) {
        return {
          type: 'public-key',
          id: loginForm.base64urlToArrayBuffer(cred.id)
        };
      }),
      userVerification: serverData.userVerification || 'preferred'
    };
  },

  /**
   * Prepare assertion data to send to server
   */
  prepareAssertionData: function prepareAssertionData(assertion, serverData) {
    var response = assertion.response;
    return {
      sessionId: serverData.sessionId,
      credentialId: loginForm.arrayBufferToBase64url(assertion.rawId),
      authenticatorData: loginForm.arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: loginForm.arrayBufferToBase64url(response.clientDataJSON),
      signature: loginForm.arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle ? loginForm.arrayBufferToBase64url(response.userHandle) : null
    };
  },

  /**
   * Convert base64url string to ArrayBuffer
   */
  base64urlToArrayBuffer: function base64urlToArrayBuffer(base64url) {
    var padding = '='.repeat((4 - base64url.length % 4) % 4);
    var base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray.buffer;
  },

  /**
   * Convert ArrayBuffer to base64url string
   */
  arrayBufferToBase64url: function arrayBufferToBase64url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';

    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    var base64 = window.btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  /**
   * Show error message
   */
  showError: function showError(messages) {
    var errorHtml = Array.isArray(messages) ? messages.join('<br>') : messages.error ? messages.error.join('<br>') : 'Unknown error';
    loginForm.$formObj.before("<div class=\"ui error message ajax\">".concat(errorHtml, "</div>"));
  },

  /**
   * Initialize form validation using Fomantic UI
   */
  initializeFormValidation: function initializeFormValidation() {
    loginForm.$formObj.form({
      fields: loginForm.validateRules,
      onSuccess: function onSuccess(event) {
        // Prevent default form submission if event exists
        if (event && event.preventDefault) {
          event.preventDefault();
        }
      }
    });
  }
}; // When the document is ready, initialize the login form.

$(document).ready(function () {
  loginForm.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwYXNzd29yZEZpZWxkIiwiJGNoZWNrQm94ZXMiLCIkcGFzc2tleUJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiY2hlY2tQYXNza2V5U3VwcG9ydCIsImJpbmRFdmVudHMiLCJpbml0aWFsaXplRm9ybVZhbGlkYXRpb24iLCJjaGVja2JveCIsIndpbmRvdyIsIlB1YmxpY0tleUNyZWRlbnRpYWwiLCJ1bmRlZmluZWQiLCJoaWRlIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJmb3JtIiwic3VibWl0TG9naW4iLCJ3aGljaCIsImNsaWNrIiwiYXV0aGVudGljYXRlV2l0aFBhc3NrZXkiLCJyZW1vdmUiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiZGF0YSIsInZhbCIsInJlbWVtYmVyTWUiLCJpcyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHQiLCJoYXNEYXRhIiwiaGFzQWNjZXNzVG9rZW4iLCJhY2Nlc3NUb2tlbiIsInRva2VuTGVuZ3RoIiwibGVuZ3RoIiwiZXhwaXJlc0luIiwiVG9rZW5NYW5hZ2VyIiwic2V0QWNjZXNzVG9rZW4iLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlcnJvciIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiYXV0aF9Xcm9uZ0xvZ2luUGFzc3dvcmQiLCJyZXNwb25zZUpTT04iLCJyZW1vdmVDbGFzcyIsIm9yaWdpbiIsInN0YXJ0UmVzcG9uc2UiLCJwa19Mb2dpbkVycm9yIiwicHVibGljS2V5T3B0aW9ucyIsInByZXBhcmVDcmVkZW50aWFsUmVxdWVzdE9wdGlvbnMiLCJhc3NlcnRpb24iLCJuYXZpZ2F0b3IiLCJjcmVkZW50aWFscyIsImdldCIsInB1YmxpY0tleSIsImFzc2VydGlvbkRhdGEiLCJwcmVwYXJlQXNzZXJ0aW9uRGF0YSIsImZpbmlzaFJlc3BvbnNlIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5IiwibmFtZSIsIm1lc3NhZ2UiLCJhdXRoRGF0YSIsInNlc3Npb25Ub2tlbiIsInNlcnZlckRhdGEiLCJjaGFsbGVuZ2UiLCJiYXNlNjR1cmxUb0FycmF5QnVmZmVyIiwidGltZW91dCIsInJwSWQiLCJhbGxvd0NyZWRlbnRpYWxzIiwibWFwIiwiY3JlZCIsImlkIiwidXNlclZlcmlmaWNhdGlvbiIsInNlc3Npb25JZCIsImNyZWRlbnRpYWxJZCIsImFycmF5QnVmZmVyVG9CYXNlNjR1cmwiLCJyYXdJZCIsImF1dGhlbnRpY2F0b3JEYXRhIiwiY2xpZW50RGF0YUpTT04iLCJzaWduYXR1cmUiLCJ1c2VySGFuZGxlIiwiYmFzZTY0dXJsIiwicGFkZGluZyIsInJlcGVhdCIsImJhc2U2NCIsInJlcGxhY2UiLCJyYXdEYXRhIiwiYXRvYiIsIm91dHB1dEFycmF5IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiYnVmZmVyIiwiYnl0ZXMiLCJiaW5hcnkiLCJieXRlTGVuZ3RoIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsImVycm9ySHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJiZWZvcmUiLCJmaWVsZHMiLCJvblN1Y2Nlc3MiLCJldmVudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QyxFQUEwQyxHQUExQyxFQUErQ0EsT0FBL0MsQ0FBdUQsSUFBdkQsRUFBNkQsRUFBN0QsQ0FBUDtBQUNILEdBOVVhOztBQWdWZDtBQUNKO0FBQ0E7QUFDSWhELEVBQUFBLFNBblZjLHFCQW1WSkMsUUFuVkksRUFtVk07QUFDaEIsUUFBTTZELFNBQVMsR0FBR0MsS0FBSyxDQUFDQyxPQUFOLENBQWMvRCxRQUFkLElBQ1pBLFFBQVEsQ0FBQ2dFLElBQVQsQ0FBYyxNQUFkLENBRFksR0FFWGhFLFFBQVEsQ0FBQ0YsS0FBVCxHQUFpQkUsUUFBUSxDQUFDRixLQUFULENBQWVrRSxJQUFmLENBQW9CLE1BQXBCLENBQWpCLEdBQStDLGVBRnREO0FBSUE1SCxJQUFBQSxTQUFTLENBQUNDLFFBQVYsQ0FBbUI0SCxNQUFuQixnREFBZ0VKLFNBQWhFO0FBQ0gsR0F6VmE7O0FBMlZkO0FBQ0o7QUFDQTtBQUNJckcsRUFBQUEsd0JBOVZjLHNDQThWYTtBQUN2QnBCLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQjRCLElBQW5CLENBQXdCO0FBQ3BCaUcsTUFBQUEsTUFBTSxFQUFFOUgsU0FBUyxDQUFDTyxhQURFO0FBRXBCd0gsTUFBQUEsU0FGb0IscUJBRVZDLEtBRlUsRUFFSDtBQUNiO0FBQ0EsWUFBSUEsS0FBSyxJQUFJQSxLQUFLLENBQUNwRyxjQUFuQixFQUFtQztBQUMvQm9HLFVBQUFBLEtBQUssQ0FBQ3BHLGNBQU47QUFDSDtBQUNKO0FBUG1CLEtBQXhCO0FBU0g7QUF4V2EsQ0FBbEIsQyxDQTJXQTs7QUFDQTFCLENBQUMsQ0FBQytILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsSSxFQUFBQSxTQUFTLENBQUNpQixVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSxGb3JtLENvbmZpZyAqL1xuXG5jb25zdCBsb2dpbkZvcm0gPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xvZ2luLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcGFzc3dvcmQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFzc3dvcmRGaWVsZDogJCgnI3Bhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBQYXNza2V5IGxvZ2luIGJ1dHRvblxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhc3NrZXlCdXR0b246ICQoJyNwYXNza2V5LWxvZ2luLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGxvZ2luOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbG9naW4nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmF1dGhfVmFsaWRhdGVMb2dpbk5vdEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Bhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRoX1ZhbGlkYXRlUGFzc3dvcmROb3RFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZ2luIGZvcm0gZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBsb2dpbkZvcm0uY2hlY2tQYXNza2V5U3VwcG9ydCgpO1xuICAgICAgICBsb2dpbkZvcm0uYmluZEV2ZW50cygpO1xuICAgICAgICBsb2dpbkZvcm0uaW5pdGlhbGl6ZUZvcm1WYWxpZGF0aW9uKCk7XG4gICAgICAgIGxvZ2luRm9ybS4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIFdlYkF1dGhuIGFuZCBoaWRlIHBhc3NrZXkgYnV0dG9uIGlmIG5vdFxuICAgICAqL1xuICAgIGNoZWNrUGFzc2tleVN1cHBvcnQoKSB7XG4gICAgICAgIGlmICh3aW5kb3cuUHVibGljS2V5Q3JlZGVudGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmQgZm9ybSBldmVudHNcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgZm9ybSBzdWJtaXNzaW9uIC0gd2UgdXNlIEFKQVggb25seVxuICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgYnV0dG9uIGNsaWNrIC0gcGFzc3dvcmQgYXV0aGVudGljYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICAgICAgaWYgKGxvZ2luRm9ybS4kZm9ybU9iai5mb3JtKCdpcyB2YWxpZCcpKSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnN1Ym1pdExvZ2luKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgb24gcGFzc3dvcmQgZmllbGRcbiAgICAgICAgbG9naW5Gb3JtLiRwYXNzd29yZEZpZWxkLm9uKCdrZXlwcmVzcycsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uY2xpY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHBhc3NrZXkgYnV0dG9uIGNsaWNrIC0gdXNlcm5hbWVsZXNzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLmF1dGhlbnRpY2F0ZVdpdGhQYXNza2V5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENsZWFyIGVycm9yIG1lc3NhZ2VzIG9uIGlucHV0XG4gICAgICAgICQoJ2lucHV0Jykub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VibWl0IGxvZ2luIHZpYSBSRVNUIEFQSSAvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpblxuICAgICAqINCf0L7Qu9GD0YfQsNC10YIgSldUIGFjY2VzcyB0b2tlbiDQuCByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqL1xuICAgIGFzeW5jIHN1Ym1pdExvZ2luKCkge1xuICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpbicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2luOiAkKCcjbG9naW4nKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICQoJyNwYXNzd29yZCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICByZW1lbWJlck1lOiAkKCcjcmVtZW1iZXJNZUNoZWNrQm94JykuaXMoJzpjaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gQVBJIFJlc3BvbnNlOicsIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3BvbnNlLnJlc3VsdCxcbiAgICAgICAgICAgICAgICBoYXNEYXRhOiAhIXJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgICAgICAgaGFzQWNjZXNzVG9rZW46ICEhKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbiksXG4gICAgICAgICAgICAgICAgdG9rZW5MZW5ndGg6IHJlc3BvbnNlLmRhdGE/LmFjY2Vzc1Rva2VuPy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgZXhwaXJlc0luOiByZXNwb25zZS5kYXRhPy5leHBpcmVzSW5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgSldUIGluIFRva2VuTWFuYWdlciAoaW4gbWVtb3J5LCBOT1QgbG9jYWxTdG9yYWdlISlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBTdG9yaW5nIGFjY2VzcyB0b2tlbiBpbiBUb2tlbk1hbmFnZXIuLi4nKTtcbiAgICAgICAgICAgICAgICBUb2tlbk1hbmFnZXIuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBUb2tlbiBzdG9yZWQsIHJlZGlyZWN0aW5nLi4uJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIHRva2VuIGlzIGFscmVhZHkgc2V0IGluIGh0dHBPbmx5IGNvb2tpZSBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0xPR0lOXSBJbnZhbGlkIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzIHx8IHsgZXJyb3I6IFtnbG9iYWxUcmFuc2xhdGUuYXV0aF9Xcm9uZ0xvZ2luUGFzc3dvcmRdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTG9naW4gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3IucmVzcG9uc2VKU09OICYmIGVycm9yLnJlc3BvbnNlSlNPTi5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoZXJyb3IucmVzcG9uc2VKU09OLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcih7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfV3JvbmdMb2dpblBhc3N3b3JkXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0aGVudGljYXRlIHVzZXIgd2l0aCBQYXNza2V5ICh1c2VybmFtZWxlc3MgZmxvdylcbiAgICAgKiBCcm93c2VyIHdpbGwgc2hvdyBhbGwgYXZhaWxhYmxlIHBhc3NrZXlzIGZvciB0aGlzIGRvbWFpblxuICAgICAqL1xuICAgIGFzeW5jIGF1dGhlbnRpY2F0ZVdpdGhQYXNza2V5KCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gR2V0IG9yaWdpbiBmb3IgV2ViQXV0aG5cbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMTogR2V0IGNoYWxsZW5nZSBmcm9tIFJFU1QgQVBJICh3aXRob3V0IGxvZ2luIC0gdXNlcm5hbWVsZXNzKVxuICAgICAgICAgICAgY29uc3Qgc3RhcnRSZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL3Bhc3NrZXlzOmF1dGhlbnRpY2F0aW9uU3RhcnQnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBvcmlnaW4gfSwgLy8gTm8gbG9naW4gcGFyYW1ldGVyIC0gdXNlcm5hbWVsZXNzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFzdGFydFJlc3BvbnNlLnJlc3VsdCB8fCAhc3RhcnRSZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHN0YXJ0UmVzcG9uc2UubWVzc2FnZXMgfHwgW2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdGVwIDI6IENhbGwgV2ViQXV0aG4gQVBJIC0gYnJvd3NlciB3aWxsIHNob3cgYWxsIGF2YWlsYWJsZSBwYXNza2V5c1xuICAgICAgICAgICAgY29uc3QgcHVibGljS2V5T3B0aW9ucyA9IGxvZ2luRm9ybS5wcmVwYXJlQ3JlZGVudGlhbFJlcXVlc3RPcHRpb25zKHN0YXJ0UmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBjb25zdCBhc3NlcnRpb24gPSBhd2FpdCBuYXZpZ2F0b3IuY3JlZGVudGlhbHMuZ2V0KHsgcHVibGljS2V5OiBwdWJsaWNLZXlPcHRpb25zIH0pO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDM6IFNlbmQgYXNzZXJ0aW9uIHRvIFJFU1QgQVBJIGZvciB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGFzc2VydGlvbkRhdGEgPSBsb2dpbkZvcm0ucHJlcGFyZUFzc2VydGlvbkRhdGEoYXNzZXJ0aW9uLCBzdGFydFJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgY29uc3QgZmluaXNoUmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9wYXNza2V5czphdXRoZW50aWNhdGlvbkZpbmlzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShhc3NlcnRpb25EYXRhKSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChmaW5pc2hSZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdGFydCBzZXNzaW9uIHZpYSBTZXNzaW9uQ29udHJvbGxlclxuICAgICAgICAgICAgICAgIGF3YWl0IGxvZ2luRm9ybS5jcmVhdGVTZXNzaW9uRnJvbVBhc3NrZXkoZmluaXNoUmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoZmluaXNoUmVzcG9uc2UubWVzc2FnZXMgfHwgW2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQYXNza2V5IGF1dGhlbnRpY2F0aW9uIGVycm9yOicsIGVycm9yKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdXNlciBjYW5jZWxsZWRcbiAgICAgICAgICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QWxsb3dlZEVycm9yJykge1xuICAgICAgICAgICAgICAgIC8vIFVzZXIgY2FuY2VsbGVkIC0gZG9uJ3Qgc2hvdyBlcnJvclxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVhbCBlcnJvciAtIHNob3cgbWVzc2FnZVxuICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihbYCR7Z2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3J9OiAke2Vycm9yLm1lc3NhZ2V9YF0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvZ2luIHdpdGggcGFzc2tleSBhdXRoZW50aWNhdGlvbiB1c2luZyBzZXNzaW9uVG9rZW5cbiAgICAgKiBTZXNzaW9uVG9rZW4gaXMgZXhjaGFuZ2VkIGZvciBKV1QgdG9rZW5zIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVNlc3Npb25Gcm9tUGFzc2tleShhdXRoRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVtZW1iZXIgbWUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGNvbnN0IHJlbWVtYmVyTWUgPSAkKCcjcmVtZW1iZXJNZUNoZWNrQm94JykuaXMoJzpjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEV4Y2hhbmdlIHNlc3Npb25Ub2tlbiBmb3IgSldUIHRva2VucyB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpbicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25Ub2tlbjogYXV0aERhdGEuc2Vzc2lvblRva2VuLFxuICAgICAgICAgICAgICAgICAgICByZW1lbWJlck1lOiByZW1lbWJlck1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBKV1QgaW4gVG9rZW5NYW5hZ2VyIChpbiBtZW1vcnksIE5PVCBsb2NhbFN0b3JhZ2UhKVxuICAgICAgICAgICAgICAgIFRva2VuTWFuYWdlci5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVmcmVzaCB0b2tlbiBpcyBhbHJlYWR5IHNldCBpbiBodHRwT25seSBjb29raWUgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGhvbWUgcGFnZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleGA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMgfHwgW2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQYXNza2V5IGxvZ2luIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yXSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBjcmVkZW50aWFsIHJlcXVlc3Qgb3B0aW9ucyBmb3IgV2ViQXV0aG4gQVBJXG4gICAgICovXG4gICAgcHJlcGFyZUNyZWRlbnRpYWxSZXF1ZXN0T3B0aW9ucyhzZXJ2ZXJEYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFsbGVuZ2U6IGxvZ2luRm9ybS5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKHNlcnZlckRhdGEuY2hhbGxlbmdlKSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IHNlcnZlckRhdGEudGltZW91dCB8fCA2MDAwMCxcbiAgICAgICAgICAgIHJwSWQ6IHNlcnZlckRhdGEucnBJZCxcbiAgICAgICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHNlcnZlckRhdGEuYWxsb3dDcmVkZW50aWFscy5tYXAoY3JlZCA9PiAoe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwdWJsaWMta2V5JyxcbiAgICAgICAgICAgICAgICBpZDogbG9naW5Gb3JtLmJhc2U2NHVybFRvQXJyYXlCdWZmZXIoY3JlZC5pZCksXG4gICAgICAgICAgICB9KSksXG4gICAgICAgICAgICB1c2VyVmVyaWZpY2F0aW9uOiBzZXJ2ZXJEYXRhLnVzZXJWZXJpZmljYXRpb24gfHwgJ3ByZWZlcnJlZCcsXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgYXNzZXJ0aW9uIGRhdGEgdG8gc2VuZCB0byBzZXJ2ZXJcbiAgICAgKi9cbiAgICBwcmVwYXJlQXNzZXJ0aW9uRGF0YShhc3NlcnRpb24sIHNlcnZlckRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhc3NlcnRpb24ucmVzcG9uc2U7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlc3Npb25JZDogc2VydmVyRGF0YS5zZXNzaW9uSWQsXG4gICAgICAgICAgICBjcmVkZW50aWFsSWQ6IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGFzc2VydGlvbi5yYXdJZCksXG4gICAgICAgICAgICBhdXRoZW50aWNhdG9yRGF0YTogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuYXV0aGVudGljYXRvckRhdGEpLFxuICAgICAgICAgICAgY2xpZW50RGF0YUpTT046IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKHJlc3BvbnNlLmNsaWVudERhdGFKU09OKSxcbiAgICAgICAgICAgIHNpZ25hdHVyZTogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2Uuc2lnbmF0dXJlKSxcbiAgICAgICAgICAgIHVzZXJIYW5kbGU6IHJlc3BvbnNlLnVzZXJIYW5kbGUgPyBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS51c2VySGFuZGxlKSA6IG51bGwsXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYmFzZTY0dXJsIHN0cmluZyB0byBBcnJheUJ1ZmZlclxuICAgICAqL1xuICAgIGJhc2U2NHVybFRvQXJyYXlCdWZmZXIoYmFzZTY0dXJsKSB7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSAnPScucmVwZWF0KCg0IC0gKGJhc2U2NHVybC5sZW5ndGggJSA0KSkgJSA0KTtcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gYmFzZTY0dXJsLnJlcGxhY2UoLy0vZywgJysnKS5yZXBsYWNlKC9fL2csICcvJykgKyBwYWRkaW5nO1xuICAgICAgICBjb25zdCByYXdEYXRhID0gd2luZG93LmF0b2IoYmFzZTY0KTtcbiAgICAgICAgY29uc3Qgb3V0cHV0QXJyYXkgPSBuZXcgVWludDhBcnJheShyYXdEYXRhLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmF3RGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgb3V0cHV0QXJyYXlbaV0gPSByYXdEYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dEFycmF5LmJ1ZmZlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBBcnJheUJ1ZmZlciB0byBiYXNlNjR1cmwgc3RyaW5nXG4gICAgICovXG4gICAgYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChidWZmZXIpIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgICAgICBsZXQgYmluYXJ5ID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMuYnl0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFzZTY0ID0gd2luZG93LmJ0b2EoYmluYXJ5KTtcbiAgICAgICAgcmV0dXJuIGJhc2U2NC5yZXBsYWNlKC9cXCsvZywgJy0nKS5yZXBsYWNlKC9cXC8vZywgJ18nKS5yZXBsYWNlKC89L2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICovXG4gICAgc2hvd0Vycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGNvbnN0IGVycm9ySHRtbCA9IEFycmF5LmlzQXJyYXkobWVzc2FnZXMpXG4gICAgICAgICAgICA/IG1lc3NhZ2VzLmpvaW4oJzxicj4nKVxuICAgICAgICAgICAgOiAobWVzc2FnZXMuZXJyb3IgPyBtZXNzYWdlcy5lcnJvci5qb2luKCc8YnI+JykgOiAnVW5rbm93biBlcnJvcicpO1xuXG4gICAgICAgIGxvZ2luRm9ybS4kZm9ybU9iai5iZWZvcmUoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4ke2Vycm9ySHRtbH08L2Rpdj5gKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gdXNpbmcgRm9tYW50aWMgVUlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybVZhbGlkYXRpb24oKSB7XG4gICAgICAgIGxvZ2luRm9ybS4kZm9ybU9iai5mb3JtKHtcbiAgICAgICAgICAgIGZpZWxkczogbG9naW5Gb3JtLnZhbGlkYXRlUnVsZXMsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgZm9ybSBzdWJtaXNzaW9uIGlmIGV2ZW50IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChldmVudCAmJiBldmVudC5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBsb2dpbiBmb3JtLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGxvZ2luRm9ybS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==