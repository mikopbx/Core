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

/* global globalTranslate, PasskeysAPI, UserMessage, ClipboardJS */

/**
 * GeneralSettingsPasskeys object is responsible for managing Passkeys in General Settings
 *
 * @module GeneralSettingsPasskeys
 */
var GeneralSettingsPasskeys = {
  /**
   * jQuery object for the container
   * @type {jQuery}
   */
  $container: null,

  /**
   * Array of passkeys
   * @type {Array}
   */
  passkeys: [],

  /**
   * Clipboard instance for copy functionality
   * @type {ClipboardJS}
   */
  clipboard: null,

  /**
   * Initialize the Passkeys management module
   */
  initialize: function initialize() {
    this.$container = $('#passkeys-container');

    if (this.$container.length === 0) {
      return;
    } // Check if WebAuthn is supported


    if (!window.PublicKeyCredential) {
      this.renderUnsupportedMessage();
      return;
    }

    this.loadPasskeys();
    this.bindEventHandlers();
  },

  /**
   * Render unsupported browser message
   */
  renderUnsupportedMessage: function renderUnsupportedMessage() {
    var html = "\n            <div class=\"ui warning message\">\n                <i class=\"warning icon\"></i>\n                ".concat(globalTranslate.pk_NotSupported, "\n            </div>\n        ");
    this.$container.html(html);
  },

  /**
   * Load passkeys from server
   */
  loadPasskeys: function loadPasskeys() {
    var _this = this;

    PasskeysAPI.getList(function (response) {
      if (response.result && response.data) {
        _this.passkeys = response.data;
      } else {
        _this.passkeys = [];
      }

      _this.renderTable();
    });
  },

  /**
   * Render the passkeys table
   */
  renderTable: function renderTable() {
    var _this2 = this;

    var html = "\n            <table class=\"ui very basic table\" id=\"passkeys-table\">\n                <tbody>\n        ";

    if (this.passkeys.length === 0) {
      // Show placeholder when no passkeys
      html += "\n                <tr id=\"passkeys-empty-row\">\n                    <td colspan=\"2\">\n                        <div class=\"ui placeholder segment\">\n                            <div class=\"ui icon header\">\n                                <i class=\"key icon\"></i>\n                                ".concat(globalTranslate.pk_NoPasskeys, "\n                            </div>\n                            <div class=\"inline\">\n                                <div class=\"ui text\">\n                                    ").concat(globalTranslate.pk_EmptyDescription, "\n                                </div>\n                            </div>\n                            <div style=\"margin-top: 1em;\">\n                                <a href=\"https://docs.mikopbx.com\" target=\"_blank\"\n                                   class=\"ui basic tiny button prevent-word-wrap\">\n                                    <i class=\"question circle outline icon\"></i>\n                                    ").concat(globalTranslate.pk_ReadDocs, "\n                                </a>\n                            </div>\n                            <div style=\"margin-top: 1em; text-align: center;\">\n                                <button type=\"button\" class=\"ui blue button prevent-word-wrap\" id=\"add-passkey-button\">\n                                    <i class=\"add circle icon\"></i>\n                                    ").concat(globalTranslate.pk_AddPasskey, "\n                                </button>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            ");
    } else {
      // Show existing passkeys
      this.passkeys.forEach(function (passkey) {
        var lastUsed = passkey.last_used_at ? _this2.formatDate(passkey.last_used_at) : globalTranslate.pk_NeverUsed || 'Never used';
        html += "\n                    <tr data-id=\"".concat(passkey.id, "\">\n                        <td class=\"passkey-cell\">\n                            <div style=\"margin-bottom: 0.3em;\">\n                                <strong>").concat(_this2.escapeHtml(passkey.name), "</strong>\n                            </div>\n                            <div style=\"font-size: 0.85em; color: rgba(0,0,0,.4);\">\n                                ").concat(globalTranslate.pk_ColumnLastUsed, ": ").concat(lastUsed, "\n                            </div>\n                        </td>\n                        <td class=\"right aligned collapsing\">\n                            <a class=\"ui basic icon button two-steps-delete delete-passkey-btn\"\n                               data-id=\"").concat(passkey.id, "\"\n                               data-content=\"").concat(globalTranslate.pk_Delete, "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </td>\n                    </tr>\n                ");
      }); // Add button row

      html += "\n                <tr id=\"add-passkey-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"add-passkey-button\">\n                            <i class=\"plus icon\"></i>\n                            ".concat(globalTranslate.pk_AddPasskey, "\n                        </button>\n                    </td>\n                </tr>\n            ");
    }

    html += "\n                </tbody>\n            </table>\n        ";
    this.$container.html(html); // Initialize tooltips

    this.$container.find('[data-content]').popup();
  },

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate: function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleString();
  },

  /**
   * Bind event handlers
   */
  bindEventHandlers: function bindEventHandlers() {
    // Add passkey button (delegated)
    this.$container.on('click', '#add-passkey-button', function (e) {
      e.preventDefault();
      GeneralSettingsPasskeys.registerNewPasskey();
    }); // Delete button (delegated)
    // Only trigger deletion on second click (when two-steps-delete class is removed)

    this.$container.on('click', '.delete-passkey-btn:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var passkeyId = $(e.currentTarget).data('id');
      GeneralSettingsPasskeys.deletePasskey(passkeyId);
    });
  },

  /**
   * Generate passkey name based on browser and device information
   * @returns {string} Generated passkey name
   */
  generatePasskeyName: function generatePasskeyName() {
    var ua = navigator.userAgent;
    var browser = 'Browser';
    var os = 'Unknown OS';
    var device = ''; // Detect browser

    if (ua.indexOf('Edg') > -1) {
      browser = 'Edge';
    } else if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
      browser = 'Opera';
    } // Detect OS


    if (ua.indexOf('Win') > -1) {
      os = 'Windows';
    } else if (ua.indexOf('Mac') > -1) {
      os = 'macOS';
    } else if (ua.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (ua.indexOf('Android') > -1) {
      os = 'Android';
    } else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
      os = ua.indexOf('iPhone') > -1 ? 'iPhone' : 'iPad';
    } // Detect device type for mobile


    if (ua.indexOf('Mobile') > -1 && os !== 'Android' && os !== 'iPhone' && os !== 'iPad') {
      device = ' Mobile';
    } // Build name


    var timestamp = new Date().toLocaleDateString();
    return "".concat(browser, " on ").concat(os).concat(device, " (").concat(timestamp, ")");
  },

  /**
   * Register new passkey using WebAuthn
   */
  registerNewPasskey: async function registerNewPasskey() {
    // Auto-generate passkey name based on browser/device
    var passkeyName = GeneralSettingsPasskeys.generatePasskeyName();
    var $button = $('#add-passkey-button');
    $button.addClass('loading disabled');

    try {
      // Step 1: Get challenge from server
      PasskeysAPI.registrationStart(passkeyName, async function (response) {
        if (!response.result) {
          $button.removeClass('loading disabled');
          UserMessage.showMultiString(response.messages);
          return;
        }

        try {
          // Step 2: Call WebAuthn API
          var publicKeyOptions = GeneralSettingsPasskeys.prepareCredentialCreationOptions(response.data);
          var credential = await navigator.credentials.create({
            publicKey: publicKeyOptions
          }); // Step 3: Send attestation to server

          var attestationData = GeneralSettingsPasskeys.prepareAttestationData(credential, response.data, passkeyName);
          PasskeysAPI.registrationFinish(attestationData, function (finishResponse) {
            $button.removeClass('loading disabled');

            if (finishResponse.result) {
              GeneralSettingsPasskeys.loadPasskeys();
            } else {
              UserMessage.showMultiString(finishResponse.messages);
            }
          });
        } catch (error) {
          $button.removeClass('loading disabled');
          console.error('WebAuthn registration error:', error); // Handle user cancellation gracefully

          if (error.name === 'NotAllowedError') {
            UserMessage.showError(globalTranslate.pk_RegisterCancelled || 'Registration was cancelled');
          } else {
            UserMessage.showError("".concat(globalTranslate.pk_RegisterError, ": ").concat(error.message));
          }
        }
      });
    } catch (error) {
      $button.removeClass('loading disabled');
      console.error('Registration start error:', error);
      UserMessage.showError("".concat(globalTranslate.pk_RegisterError, ": ").concat(error.message));
    }
  },

  /**
   * Prepare credential creation options for WebAuthn API
   * @param {object} serverData - Data from server
   * @returns {object} PublicKeyCredentialCreationOptions
   */
  prepareCredentialCreationOptions: function prepareCredentialCreationOptions(serverData) {
    return {
      challenge: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.challenge),
      rp: serverData.rp,
      user: {
        id: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.user.id),
        name: serverData.user.name,
        displayName: serverData.user.displayName
      },
      pubKeyCredParams: serverData.pubKeyCredParams,
      authenticatorSelection: serverData.authenticatorSelection,
      timeout: serverData.timeout || 60000,
      attestation: serverData.attestation || 'none'
    };
  },

  /**
   * Prepare attestation data to send to server
   * @param {PublicKeyCredential} credential - Credential from WebAuthn
   * @param {object} serverData - Original server data with sessionId
   * @param {string} passkeyName - Generated passkey name
   * @returns {object} Attestation data
   */
  prepareAttestationData: function prepareAttestationData(credential, serverData, passkeyName) {
    var response = credential.response;
    return {
      sessionId: serverData.sessionId,
      credentialId: GeneralSettingsPasskeys.arrayBufferToBase64url(credential.rawId),
      name: passkeyName,
      attestationObject: GeneralSettingsPasskeys.arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: GeneralSettingsPasskeys.arrayBufferToBase64url(response.clientDataJSON)
    };
  },

  /**
   * Delete passkey (without confirmation - using two-steps-delete mechanism)
   * @param {string} passkeyId - ID of passkey to delete
   */
  deletePasskey: function deletePasskey(passkeyId) {
    PasskeysAPI.deleteRecord(passkeyId, function (response) {
      if (response.result) {
        GeneralSettingsPasskeys.loadPasskeys();
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Convert base64url string to ArrayBuffer
   * @param {string} base64url - Base64url encoded string
   * @returns {ArrayBuffer}
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
   * @param {ArrayBuffer} buffer - ArrayBuffer to convert
   * @returns {string} Base64url encoded string
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
   * Escape HTML for safe display
   * @param {string} text Text to escape
   * @return {string} Escaped text
   */
  escapeHtml: function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }
}; // Initialize when document is ready

$(document).ready(function () {
  GeneralSettingsPasskeys.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1wYXNza2V5cy5qcyJdLCJuYW1lcyI6WyJHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyIsIiRjb250YWluZXIiLCJwYXNza2V5cyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwid2luZG93IiwiUHVibGljS2V5Q3JlZGVudGlhbCIsInJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSIsImxvYWRQYXNza2V5cyIsImJpbmRFdmVudEhhbmRsZXJzIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInBrX05vdFN1cHBvcnRlZCIsIlBhc3NrZXlzQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInJlbmRlclRhYmxlIiwicGtfTm9QYXNza2V5cyIsInBrX0VtcHR5RGVzY3JpcHRpb24iLCJwa19SZWFkRG9jcyIsInBrX0FkZFBhc3NrZXkiLCJmb3JFYWNoIiwicGFzc2tleSIsImxhc3RVc2VkIiwibGFzdF91c2VkX2F0IiwiZm9ybWF0RGF0ZSIsInBrX05ldmVyVXNlZCIsImlkIiwiZXNjYXBlSHRtbCIsIm5hbWUiLCJwa19Db2x1bW5MYXN0VXNlZCIsInBrX0RlbGV0ZSIsImZpbmQiLCJwb3B1cCIsImRhdGVTdHJpbmciLCJkYXRlIiwiRGF0ZSIsInRvTG9jYWxlU3RyaW5nIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZWdpc3Rlck5ld1Bhc3NrZXkiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJwYXNza2V5SWQiLCJjdXJyZW50VGFyZ2V0IiwiZGVsZXRlUGFzc2tleSIsImdlbmVyYXRlUGFzc2tleU5hbWUiLCJ1YSIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImJyb3dzZXIiLCJvcyIsImRldmljZSIsImluZGV4T2YiLCJ0aW1lc3RhbXAiLCJ0b0xvY2FsZURhdGVTdHJpbmciLCJwYXNza2V5TmFtZSIsIiRidXR0b24iLCJhZGRDbGFzcyIsInJlZ2lzdHJhdGlvblN0YXJ0IiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwicHVibGljS2V5T3B0aW9ucyIsInByZXBhcmVDcmVkZW50aWFsQ3JlYXRpb25PcHRpb25zIiwiY3JlZGVudGlhbCIsImNyZWRlbnRpYWxzIiwiY3JlYXRlIiwicHVibGljS2V5IiwiYXR0ZXN0YXRpb25EYXRhIiwicHJlcGFyZUF0dGVzdGF0aW9uRGF0YSIsInJlZ2lzdHJhdGlvbkZpbmlzaCIsImZpbmlzaFJlc3BvbnNlIiwiZXJyb3IiLCJjb25zb2xlIiwic2hvd0Vycm9yIiwicGtfUmVnaXN0ZXJDYW5jZWxsZWQiLCJwa19SZWdpc3RlckVycm9yIiwibWVzc2FnZSIsInNlcnZlckRhdGEiLCJjaGFsbGVuZ2UiLCJiYXNlNjR1cmxUb0FycmF5QnVmZmVyIiwicnAiLCJ1c2VyIiwiZGlzcGxheU5hbWUiLCJwdWJLZXlDcmVkUGFyYW1zIiwiYXV0aGVudGljYXRvclNlbGVjdGlvbiIsInRpbWVvdXQiLCJhdHRlc3RhdGlvbiIsInNlc3Npb25JZCIsImNyZWRlbnRpYWxJZCIsImFycmF5QnVmZmVyVG9CYXNlNjR1cmwiLCJyYXdJZCIsImF0dGVzdGF0aW9uT2JqZWN0IiwiY2xpZW50RGF0YUpTT04iLCJkZWxldGVSZWNvcmQiLCJiYXNlNjR1cmwiLCJwYWRkaW5nIiwicmVwZWF0IiwiYmFzZTY0IiwicmVwbGFjZSIsInJhd0RhdGEiLCJhdG9iIiwib3V0cHV0QXJyYXkiLCJVaW50OEFycmF5IiwiaSIsImNoYXJDb2RlQXQiLCJidWZmZXIiLCJieXRlcyIsImJpbmFyeSIsImJ5dGVMZW5ndGgiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJidG9hIiwidGV4dCIsIm1hcCIsIm0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUF6QixDQUFWO0FBQ0g7O0FBQ0QsUUFBTU4sTUFBTSxHQUFHakcsTUFBTSxDQUFDK0csSUFBUCxDQUFZSixNQUFaLENBQWY7QUFDQSxXQUFPVixNQUFNLENBQUNDLE9BQVAsQ0FBZSxLQUFmLEVBQXNCLEdBQXRCLEVBQTJCQSxPQUEzQixDQUFtQyxLQUFuQyxFQUEwQyxHQUExQyxFQUErQ0EsT0FBL0MsQ0FBdUQsSUFBdkQsRUFBNkQsRUFBN0QsQ0FBUDtBQUNILEdBdFgyQjs7QUF3WDVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXpFLEVBQUFBLFVBN1g0QixzQkE2WGpCdUYsSUE3WGlCLEVBNlhYO0FBQ2IsUUFBTUMsR0FBRyxHQUFHO0FBQ1IsV0FBSyxPQURHO0FBRVIsV0FBSyxNQUZHO0FBR1IsV0FBSyxNQUhHO0FBSVIsV0FBSyxRQUpHO0FBS1IsV0FBSztBQUxHLEtBQVo7QUFPQSxXQUFPRCxJQUFJLENBQUNkLE9BQUwsQ0FBYSxVQUFiLEVBQXlCLFVBQUFnQixDQUFDO0FBQUEsYUFBSUQsR0FBRyxDQUFDQyxDQUFELENBQVA7QUFBQSxLQUExQixDQUFQO0FBQ0g7QUF0WTJCLENBQWhDLEMsQ0F5WUE7O0FBQ0FwSCxDQUFDLENBQUNxSCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCM0gsRUFBQUEsdUJBQXVCLENBQUNJLFVBQXhCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBhc3NrZXlzQVBJLCBVc2VyTWVzc2FnZSwgQ2xpcGJvYXJkSlMgKi9cblxuLyoqXG4gKiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIG1hbmFnaW5nIFBhc3NrZXlzIGluIEdlbmVyYWwgU2V0dGluZ3NcbiAqXG4gKiBAbW9kdWxlIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzXG4gKi9cbmNvbnN0IEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjb250YWluZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBwYXNza2V5c1xuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwYXNza2V5czogW10sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBQYXNza2V5cyBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lciA9ICQoJyNwYXNza2V5cy1jb250YWluZXInKTtcblxuICAgICAgICBpZiAodGhpcy4kY29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgV2ViQXV0aG4gaXMgc3VwcG9ydGVkXG4gICAgICAgIGlmICghd2luZG93LlB1YmxpY0tleUNyZWRlbnRpYWwpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyVW5zdXBwb3J0ZWRNZXNzYWdlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRQYXNza2V5cygpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudEhhbmRsZXJzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB1bnN1cHBvcnRlZCBicm93c2VyIG1lc3NhZ2VcbiAgICAgKi9cbiAgICByZW5kZXJVbnN1cHBvcnRlZE1lc3NhZ2UoKSB7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfTm90U3VwcG9ydGVkfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHBhc3NrZXlzIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgbG9hZFBhc3NrZXlzKCkge1xuICAgICAgICBQYXNza2V5c0FQSS5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXNza2V5cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucGFzc2tleXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVuZGVyVGFibGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgcGFzc2tleXMgdGFibGVcbiAgICAgKi9cbiAgICByZW5kZXJUYWJsZSgpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgXG4gICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlXCIgaWQ9XCJwYXNza2V5cy10YWJsZVwiPlxuICAgICAgICAgICAgICAgIDx0Ym9keT5cbiAgICAgICAgYDtcblxuICAgICAgICBpZiAodGhpcy5wYXNza2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXIgd2hlbiBubyBwYXNza2V5c1xuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPHRyIGlkPVwicGFzc2tleXMtZW1wdHktcm93XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJrZXkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfTm9QYXNza2V5c31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5saW5lXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19FbXB0eURlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDogMWVtO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiaHR0cHM6Ly9kb2NzLm1pa29wYnguY29tXCIgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBiYXNpYyB0aW55IGJ1dHRvbiBwcmV2ZW50LXdvcmQtd3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJxdWVzdGlvbiBjaXJjbGUgb3V0bGluZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfUmVhZERvY3N9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDogMWVtOyB0ZXh0LWFsaWduOiBjZW50ZXI7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmx1ZSBidXR0b24gcHJldmVudC13b3JkLXdyYXBcIiBpZD1cImFkZC1wYXNza2V5LWJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJhZGQgY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19BZGRQYXNza2V5fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBleGlzdGluZyBwYXNza2V5c1xuICAgICAgICAgICAgdGhpcy5wYXNza2V5cy5mb3JFYWNoKChwYXNza2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdFVzZWQgPSBwYXNza2V5Lmxhc3RfdXNlZF9hdFxuICAgICAgICAgICAgICAgICAgICA/IHRoaXMuZm9ybWF0RGF0ZShwYXNza2V5Lmxhc3RfdXNlZF9hdClcbiAgICAgICAgICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucGtfTmV2ZXJVc2VkIHx8ICdOZXZlciB1c2VkJztcblxuICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8dHIgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInBhc3NrZXktY2VsbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAwLjNlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3RoaXMuZXNjYXBlSHRtbChwYXNza2V5Lm5hbWUpfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgY29sb3I6IHJnYmEoMCwwLDAsLjQpO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Db2x1bW5MYXN0VXNlZH06ICR7bGFzdFVzZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1wYXNza2V5LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLnBrX0RlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiByb3dcbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1wYXNza2V5LXJvd1wiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBtaW5pIGJhc2ljIGJ1dHRvblwiIGlkPVwiYWRkLXBhc3NrZXktYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwbHVzIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfQWRkUGFzc2tleX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIGA7XG5cbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmh0bWwoaHRtbCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICB0aGlzLiRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZGF0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkYXRlU3RyaW5nIC0gSVNPIGRhdGUgc3RyaW5nXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIGRhdGVcbiAgICAgKi9cbiAgICBmb3JtYXREYXRlKGRhdGVTdHJpbmcpIHtcbiAgICAgICAgaWYgKCFkYXRlU3RyaW5nKSByZXR1cm4gJy0nO1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0cmluZyk7XG4gICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQWRkIHBhc3NrZXkgYnV0dG9uIChkZWxlZ2F0ZWQpXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI2FkZC1wYXNza2V5LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5yZWdpc3Rlck5ld1Bhc3NrZXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiAoZGVsZWdhdGVkKVxuICAgICAgICAvLyBPbmx5IHRyaWdnZXIgZGVsZXRpb24gb24gc2Vjb25kIGNsaWNrICh3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZClcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcuZGVsZXRlLXBhc3NrZXktYnRuOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHBhc3NrZXlJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdpZCcpO1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuZGVsZXRlUGFzc2tleShwYXNza2V5SWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc2tleSBuYW1lIGJhc2VkIG9uIGJyb3dzZXIgYW5kIGRldmljZSBpbmZvcm1hdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEdlbmVyYXRlZCBwYXNza2V5IG5hbWVcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3NrZXlOYW1lKCkge1xuICAgICAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgICAgIGxldCBicm93c2VyID0gJ0Jyb3dzZXInO1xuICAgICAgICBsZXQgb3MgPSAnVW5rbm93biBPUyc7XG4gICAgICAgIGxldCBkZXZpY2UgPSAnJztcblxuICAgICAgICAvLyBEZXRlY3QgYnJvd3NlclxuICAgICAgICBpZiAodWEuaW5kZXhPZignRWRnJykgPiAtMSkge1xuICAgICAgICAgICAgYnJvd3NlciA9ICdFZGdlJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdDaHJvbWUnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0Nocm9tZSc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignU2FmYXJpJykgPiAtMSkge1xuICAgICAgICAgICAgYnJvd3NlciA9ICdTYWZhcmknO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0ZpcmVmb3gnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0ZpcmVmb3gnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ09wZXJhJykgPiAtMSB8fCB1YS5pbmRleE9mKCdPUFInKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ09wZXJhJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBPU1xuICAgICAgICBpZiAodWEuaW5kZXhPZignV2luJykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnV2luZG93cyc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignTWFjJykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnbWFjT1MnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0xpbnV4JykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnTGludXgnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0FuZHJvaWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdBbmRyb2lkJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdpUGhvbmUnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ2lQYWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9IHVhLmluZGV4T2YoJ2lQaG9uZScpID4gLTEgPyAnaVBob25lJyA6ICdpUGFkJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBkZXZpY2UgdHlwZSBmb3IgbW9iaWxlXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdNb2JpbGUnKSA+IC0xICYmIG9zICE9PSAnQW5kcm9pZCcgJiYgb3MgIT09ICdpUGhvbmUnICYmIG9zICE9PSAnaVBhZCcpIHtcbiAgICAgICAgICAgIGRldmljZSA9ICcgTW9iaWxlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIG5hbWVcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0xvY2FsZURhdGVTdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIGAke2Jyb3dzZXJ9IG9uICR7b3N9JHtkZXZpY2V9ICgke3RpbWVzdGFtcH0pYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgbmV3IHBhc3NrZXkgdXNpbmcgV2ViQXV0aG5cbiAgICAgKi9cbiAgICBhc3luYyByZWdpc3Rlck5ld1Bhc3NrZXkoKSB7XG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc2tleSBuYW1lIGJhc2VkIG9uIGJyb3dzZXIvZGV2aWNlXG4gICAgICAgIGNvbnN0IHBhc3NrZXlOYW1lID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuZ2VuZXJhdGVQYXNza2V5TmFtZSgpO1xuXG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjYWRkLXBhc3NrZXktYnV0dG9uJyk7XG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU3RlcCAxOiBHZXQgY2hhbGxlbmdlIGZyb20gc2VydmVyXG4gICAgICAgICAgICBQYXNza2V5c0FQSS5yZWdpc3RyYXRpb25TdGFydChwYXNza2V5TmFtZSwgYXN5bmMgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RlcCAyOiBDYWxsIFdlYkF1dGhuIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwdWJsaWNLZXlPcHRpb25zID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMucHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWwgPSBhd2FpdCBuYXZpZ2F0b3IuY3JlZGVudGlhbHMuY3JlYXRlKHsgcHVibGljS2V5OiBwdWJsaWNLZXlPcHRpb25zIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0ZXAgMzogU2VuZCBhdHRlc3RhdGlvbiB0byBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0ZXN0YXRpb25EYXRhID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMucHJlcGFyZUF0dGVzdGF0aW9uRGF0YShjcmVkZW50aWFsLCByZXNwb25zZS5kYXRhLCBwYXNza2V5TmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgUGFzc2tleXNBUEkucmVnaXN0cmF0aW9uRmluaXNoKGF0dGVzdGF0aW9uRGF0YSwgKGZpbmlzaFJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaW5pc2hSZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGZpbmlzaFJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJBdXRobiByZWdpc3RyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB1c2VyIGNhbmNlbGxhdGlvbiBncmFjZWZ1bGx5XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QWxsb3dlZEVycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wa19SZWdpc3RlckNhbmNlbGxlZCB8fCAnUmVnaXN0cmF0aW9uIHdhcyBjYW5jZWxsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUucGtfUmVnaXN0ZXJFcnJvcn06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUmVnaXN0cmF0aW9uIHN0YXJ0IGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUucGtfUmVnaXN0ZXJFcnJvcn06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGNyZWRlbnRpYWwgY3JlYXRpb24gb3B0aW9ucyBmb3IgV2ViQXV0aG4gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNlcnZlckRhdGEgLSBEYXRhIGZyb20gc2VydmVyXG4gICAgICogQHJldHVybnMge29iamVjdH0gUHVibGljS2V5Q3JlZGVudGlhbENyZWF0aW9uT3B0aW9uc1xuICAgICAqL1xuICAgIHByZXBhcmVDcmVkZW50aWFsQ3JlYXRpb25PcHRpb25zKHNlcnZlckRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYWxsZW5nZTogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihzZXJ2ZXJEYXRhLmNoYWxsZW5nZSksXG4gICAgICAgICAgICBycDogc2VydmVyRGF0YS5ycCxcbiAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBpZDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihzZXJ2ZXJEYXRhLnVzZXIuaWQpLFxuICAgICAgICAgICAgICAgIG5hbWU6IHNlcnZlckRhdGEudXNlci5uYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBzZXJ2ZXJEYXRhLnVzZXIuZGlzcGxheU5hbWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHViS2V5Q3JlZFBhcmFtczogc2VydmVyRGF0YS5wdWJLZXlDcmVkUGFyYW1zLFxuICAgICAgICAgICAgYXV0aGVudGljYXRvclNlbGVjdGlvbjogc2VydmVyRGF0YS5hdXRoZW50aWNhdG9yU2VsZWN0aW9uLFxuICAgICAgICAgICAgdGltZW91dDogc2VydmVyRGF0YS50aW1lb3V0IHx8IDYwMDAwLFxuICAgICAgICAgICAgYXR0ZXN0YXRpb246IHNlcnZlckRhdGEuYXR0ZXN0YXRpb24gfHwgJ25vbmUnLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGF0dGVzdGF0aW9uIGRhdGEgdG8gc2VuZCB0byBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge1B1YmxpY0tleUNyZWRlbnRpYWx9IGNyZWRlbnRpYWwgLSBDcmVkZW50aWFsIGZyb20gV2ViQXV0aG5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2VydmVyRGF0YSAtIE9yaWdpbmFsIHNlcnZlciBkYXRhIHdpdGggc2Vzc2lvbklkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3NrZXlOYW1lIC0gR2VuZXJhdGVkIHBhc3NrZXkgbmFtZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEF0dGVzdGF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwcmVwYXJlQXR0ZXN0YXRpb25EYXRhKGNyZWRlbnRpYWwsIHNlcnZlckRhdGEsIHBhc3NrZXlOYW1lKSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gY3JlZGVudGlhbC5yZXNwb25zZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXJ2ZXJEYXRhLnNlc3Npb25JZCxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxJZDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChjcmVkZW50aWFsLnJhd0lkKSxcbiAgICAgICAgICAgIG5hbWU6IHBhc3NrZXlOYW1lLFxuICAgICAgICAgICAgYXR0ZXN0YXRpb25PYmplY3Q6IEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuYXR0ZXN0YXRpb25PYmplY3QpLFxuICAgICAgICAgICAgY2xpZW50RGF0YUpTT046IEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuY2xpZW50RGF0YUpTT04pLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcGFzc2tleSAod2l0aG91dCBjb25maXJtYXRpb24gLSB1c2luZyB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc2tleUlkIC0gSUQgb2YgcGFzc2tleSB0byBkZWxldGVcbiAgICAgKi9cbiAgICBkZWxldGVQYXNza2V5KHBhc3NrZXlJZCkge1xuICAgICAgICBQYXNza2V5c0FQSS5kZWxldGVSZWNvcmQocGFzc2tleUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYmFzZTY0dXJsIHN0cmluZyB0byBBcnJheUJ1ZmZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlNjR1cmwgLSBCYXNlNjR1cmwgZW5jb2RlZCBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9XG4gICAgICovXG4gICAgYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihiYXNlNjR1cmwpIHtcbiAgICAgICAgY29uc3QgcGFkZGluZyA9ICc9Jy5yZXBlYXQoKDQgLSAoYmFzZTY0dXJsLmxlbmd0aCAlIDQpKSAlIDQpO1xuICAgICAgICBjb25zdCBiYXNlNjQgPSBiYXNlNjR1cmwucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKSArIHBhZGRpbmc7XG4gICAgICAgIGNvbnN0IHJhd0RhdGEgPSB3aW5kb3cuYXRvYihiYXNlNjQpO1xuICAgICAgICBjb25zdCBvdXRwdXRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJhd0RhdGEubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdEYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBvdXRwdXRBcnJheVtpXSA9IHJhd0RhdGEuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0QXJyYXkuYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IEFycmF5QnVmZmVyIHRvIGJhc2U2NHVybCBzdHJpbmdcbiAgICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWZmZXIgLSBBcnJheUJ1ZmZlciB0byBjb252ZXJ0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gQmFzZTY0dXJsIGVuY29kZWQgc3RyaW5nXG4gICAgICovXG4gICAgYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChidWZmZXIpIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgICAgICBsZXQgYmluYXJ5ID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMuYnl0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFzZTY0ID0gd2luZG93LmJ0b2EoYmluYXJ5KTtcbiAgICAgICAgcmV0dXJuIGJhc2U2NC5yZXBsYWNlKC9cXCsvZywgJy0nKS5yZXBsYWNlKC9cXC8vZywgJ18nKS5yZXBsYWNlKC89L2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIG0gPT4gbWFwW21dKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==