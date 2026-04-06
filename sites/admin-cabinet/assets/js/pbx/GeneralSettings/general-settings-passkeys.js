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
    } // Check if accessing via IP address (WebAuthn requires valid domain)


    if (this.isAccessingViaIpAddress()) {
      this.renderDomainRequiredMessage();
      return;
    }

    this.loadPasskeys();
    this.bindEventHandlers();
  },

  /**
   * Check if the current hostname is an IP address (IPv4 or IPv6)
   * WebAuthn requires a valid domain name, not an IP address
   * @returns {boolean} True if accessing via IP address
   */
  isAccessingViaIpAddress: function isAccessingViaIpAddress() {
    var hostname = window.location.hostname; // IPv4 pattern: xxx.xxx.xxx.xxx

    var ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/; // IPv6 patterns: [::1], [2001:db8::1], etc.
    // Also check for localhost IP representations

    var ipv6Pattern = /^(\[.*\]|::1|localhost)$/i; // Check for IPv6 without brackets (some browsers)

    var ipv6NoBrackets = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname) || ipv6NoBrackets.test(hostname);
  },

  /**
   * Render message when domain is required for Passkeys
   */
  renderDomainRequiredMessage: function renderDomainRequiredMessage() {
    var html = "\n            <div class=\"ui info message\">\n                <div class=\"header\">\n                    <i class=\"info circle icon\"></i>\n                    ".concat(globalTranslate.pk_DomainRequired, "\n                </div>\n                <p>").concat(globalTranslate.pk_DomainRequiredDescription, "</p>\n            </div>\n        ");
    this.$container.html(html);
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

    var $table = $('#passkeys-table tbody');
    var $emptyRow = $('#passkeys-empty-row');

    if (this.passkeys.length === 0) {
      // Show empty placeholder
      $table.find('tr:not(#passkeys-empty-row)').remove();
      $emptyRow.show();
    } else {
      // Hide empty placeholder
      $emptyRow.hide(); // Remove existing passkey rows (keep empty row)

      $table.find('tr:not(#passkeys-empty-row)').remove(); // Add passkey rows

      this.passkeys.forEach(function (passkey) {
        var lastUsed = passkey.last_used_at ? _this2.formatDate(passkey.last_used_at) : globalTranslate.pk_NeverUsed;
        var html = "\n                    <tr data-id=\"".concat(passkey.id, "\">\n                        <td class=\"passkey-cell\">\n                            <div style=\"margin-bottom: 0.3em;\">\n                                <strong>").concat(_this2.escapeHtml(passkey.name), "</strong>\n                            </div>\n                            <div style=\"font-size: 0.85em; color: rgba(0,0,0,.4);\">\n                                ").concat(globalTranslate.pk_ColumnLastUsed, ": ").concat(lastUsed, "\n                            </div>\n                        </td>\n                        <td class=\"right aligned collapsing\">\n                            <a class=\"ui basic icon button two-steps-delete delete-passkey-btn\"\n                               data-id=\"").concat(passkey.id, "\"\n                               data-content=\"").concat(globalTranslate.pk_Delete, "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </td>\n                    </tr>\n                ");
        $table.append(html);
      }); // Add button row

      var addButtonRow = "\n                <tr id=\"add-passkey-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"add-passkey-button\">\n                            <i class=\"plus icon\"></i>\n                            ".concat(globalTranslate.pk_AddPasskey, "\n                        </button>\n                    </td>\n                </tr>\n            ");
      $table.append(addButtonRow); // Initialize tooltips

      $table.find('[data-content]').popup();
    }
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
          console.error('WebAuthn registration error:', error); // Handle specific WebAuthn errors

          if (error.name === 'NotAllowedError') {
            // Check if it's a TLS certificate error (Chrome-specific)
            if (error.message && error.message.includes('TLS certificate')) {
              UserMessage.showError(globalTranslate.pk_TlsCertificateError);
            } else {
              // User cancelled the operation
              UserMessage.showError(globalTranslate.pk_RegisterCancelled);
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1wYXNza2V5cy5qcyJdLCJuYW1lcyI6WyJHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyIsIiRjb250YWluZXIiLCJwYXNza2V5cyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwid2luZG93IiwiUHVibGljS2V5Q3JlZGVudGlhbCIsInJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSIsImlzQWNjZXNzaW5nVmlhSXBBZGRyZXNzIiwicmVuZGVyRG9tYWluUmVxdWlyZWRNZXNzYWdlIiwibG9hZFBhc3NrZXlzIiwiYmluZEV2ZW50SGFuZGxlcnMiLCJob3N0bmFtZSIsImxvY2F0aW9uIiwiaXB2NFBhdHRlcm4iLCJpcHY2UGF0dGVybiIsImlwdjZOb0JyYWNrZXRzIiwidGVzdCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJwa19Eb21haW5SZXF1aXJlZCIsInBrX0RvbWFpblJlcXVpcmVkRGVzY3JpcHRpb24iLCJwa19Ob3RTdXBwb3J0ZWQiLCJQYXNza2V5c0FQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJyZW5kZXJUYWJsZSIsIiR0YWJsZSIsIiRlbXB0eVJvdyIsImZpbmQiLCJyZW1vdmUiLCJzaG93IiwiaGlkZSIsImZvckVhY2giLCJwYXNza2V5IiwibGFzdFVzZWQiLCJsYXN0X3VzZWRfYXQiLCJmb3JtYXREYXRlIiwicGtfTmV2ZXJVc2VkIiwiaWQiLCJlc2NhcGVIdG1sIiwibmFtZSIsInBrX0NvbHVtbkxhc3RVc2VkIiwicGtfRGVsZXRlIiwiYXBwZW5kIiwiYWRkQnV0dG9uUm93IiwicGtfQWRkUGFzc2tleSIsInBvcHVwIiwiZGF0ZVN0cmluZyIsImRhdGUiLCJEYXRlIiwidG9Mb2NhbGVTdHJpbmciLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInJlZ2lzdGVyTmV3UGFzc2tleSIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsInBhc3NrZXlJZCIsImN1cnJlbnRUYXJnZXQiLCJkZWxldGVQYXNza2V5IiwiZ2VuZXJhdGVQYXNza2V5TmFtZSIsInVhIiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwiYnJvd3NlciIsIm9zIiwiZGV2aWNlIiwiaW5kZXhPZiIsInRpbWVzdGFtcCIsInRvTG9jYWxlRGF0ZVN0cmluZyIsInBhc3NrZXlOYW1lIiwiJGJ1dHRvbiIsImFkZENsYXNzIiwicmVnaXN0cmF0aW9uU3RhcnQiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJwdWJsaWNLZXlPcHRpb25zIiwicHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMiLCJjcmVkZW50aWFsIiwiY3JlZGVudGlhbHMiLCJjcmVhdGUiLCJwdWJsaWNLZXkiLCJhdHRlc3RhdGlvbkRhdGEiLCJwcmVwYXJlQXR0ZXN0YXRpb25EYXRhIiwicmVnaXN0cmF0aW9uRmluaXNoIiwiZmluaXNoUmVzcG9uc2UiLCJlcnJvciIsImNvbnNvbGUiLCJtZXNzYWdlIiwiaW5jbHVkZXMiLCJzaG93RXJyb3IiLCJwa19UbHNDZXJ0aWZpY2F0ZUVycm9yIiwicGtfUmVnaXN0ZXJDYW5jZWxsZWQiLCJwa19SZWdpc3RlckVycm9yIiwic2VydmVyRGF0YSIsImNoYWxsZW5nZSIsImJhc2U2NHVybFRvQXJyYXlCdWZmZXIiLCJycCIsInVzZXIiLCJkaXNwbGF5TmFtZSIsInB1YktleUNyZWRQYXJhbXMiLCJhdXRoZW50aWNhdG9yU2VsZWN0aW9uIiwidGltZW91dCIsImF0dGVzdGF0aW9uIiwic2Vzc2lvbklkIiwiY3JlZGVudGlhbElkIiwiYXJyYXlCdWZmZXJUb0Jhc2U2NHVybCIsInJhd0lkIiwiYXR0ZXN0YXRpb25PYmplY3QiLCJjbGllbnREYXRhSlNPTiIsImRlbGV0ZVJlY29yZCIsImJhc2U2NHVybCIsInBhZGRpbmciLCJyZXBlYXQiLCJiYXNlNjQiLCJyZXBsYWNlIiwicmF3RGF0YSIsImF0b2IiLCJvdXRwdXRBcnJheSIsIlVpbnQ4QXJyYXkiLCJpIiwiY2hhckNvZGVBdCIsImJ1ZmZlciIsImJ5dGVzIiwiYmluYXJ5IiwiYnl0ZUxlbmd0aCIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsImJ0b2EiLCJ0ZXh0IiwibWFwIiwibSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsdUJBQXVCLEdBQUc7QUFDNUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBTGdCOztBQU81QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsRUFYa0I7O0FBYTVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQWpCaUI7O0FBbUI1QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF0QjRCLHdCQXNCZjtBQUNULFNBQUtILFVBQUwsR0FBa0JJLENBQUMsQ0FBQyxxQkFBRCxDQUFuQjs7QUFFQSxRQUFJLEtBQUtKLFVBQUwsQ0FBZ0JLLE1BQWhCLEtBQTJCLENBQS9CLEVBQWtDO0FBQzlCO0FBQ0gsS0FMUSxDQU9UOzs7QUFDQSxRQUFJLENBQUNDLE1BQU0sQ0FBQ0MsbUJBQVosRUFBaUM7QUFDN0IsV0FBS0Msd0JBQUw7QUFDQTtBQUNILEtBWFEsQ0FhVDs7O0FBQ0EsUUFBSSxLQUFLQyx1QkFBTCxFQUFKLEVBQW9DO0FBQ2hDLFdBQUtDLDJCQUFMO0FBQ0E7QUFDSDs7QUFFRCxTQUFLQyxZQUFMO0FBQ0EsU0FBS0MsaUJBQUw7QUFDSCxHQTNDMkI7O0FBNkM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lILEVBQUFBLHVCQWxENEIscUNBa0RGO0FBQ3RCLFFBQVFJLFFBQVIsR0FBcUJQLE1BQU0sQ0FB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IHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGFzc2tleXNBUEksIFVzZXJNZXNzYWdlLCBDbGlwYm9hcmRKUyAqL1xuXG4vKipcbiAqIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgbWFuYWdpbmcgUGFzc2tleXMgaW4gR2VuZXJhbCBTZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgR2VuZXJhbFNldHRpbmdzUGFzc2tleXNcbiAqL1xuY29uc3QgR2VuZXJhbFNldHRpbmdzUGFzc2tleXMgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHBhc3NrZXlzXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBhc3NrZXlzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIFBhc3NrZXlzIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyID0gJCgnI3Bhc3NrZXlzLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIGlmICh0aGlzLiRjb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBXZWJBdXRobiBpcyBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCF3aW5kb3cuUHVibGljS2V5Q3JlZGVudGlhbCkge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJVbnN1cHBvcnRlZE1lc3NhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGFjY2Vzc2luZyB2aWEgSVAgYWRkcmVzcyAoV2ViQXV0aG4gcmVxdWlyZXMgdmFsaWQgZG9tYWluKVxuICAgICAgICBpZiAodGhpcy5pc0FjY2Vzc2luZ1ZpYUlwQWRkcmVzcygpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckRvbWFpblJlcXVpcmVkTWVzc2FnZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aGUgY3VycmVudCBob3N0bmFtZSBpcyBhbiBJUCBhZGRyZXNzIChJUHY0IG9yIElQdjYpXG4gICAgICogV2ViQXV0aG4gcmVxdWlyZXMgYSB2YWxpZCBkb21haW4gbmFtZSwgbm90IGFuIElQIGFkZHJlc3NcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBhY2Nlc3NpbmcgdmlhIElQIGFkZHJlc3NcbiAgICAgKi9cbiAgICBpc0FjY2Vzc2luZ1ZpYUlwQWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgeyBob3N0bmFtZSB9ID0gd2luZG93LmxvY2F0aW9uO1xuXG4gICAgICAgIC8vIElQdjQgcGF0dGVybjogeHh4Lnh4eC54eHgueHh4XG4gICAgICAgIGNvbnN0IGlwdjRQYXR0ZXJuID0gL14oXFxkezEsM31cXC4pezN9XFxkezEsM30kLztcblxuICAgICAgICAvLyBJUHY2IHBhdHRlcm5zOiBbOjoxXSwgWzIwMDE6ZGI4OjoxXSwgZXRjLlxuICAgICAgICAvLyBBbHNvIGNoZWNrIGZvciBsb2NhbGhvc3QgSVAgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGlwdjZQYXR0ZXJuID0gL14oXFxbLipcXF18OjoxfGxvY2FsaG9zdCkkL2k7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIElQdjYgd2l0aG91dCBicmFja2V0cyAoc29tZSBicm93c2VycylcbiAgICAgICAgY29uc3QgaXB2Nk5vQnJhY2tldHMgPSAvXihbMC05YS1mQS1GXXswLDR9Oil7Miw3fVswLTlhLWZBLUZdezAsNH0kLztcblxuICAgICAgICByZXR1cm4gaXB2NFBhdHRlcm4udGVzdChob3N0bmFtZSlcbiAgICAgICAgICAgIHx8IGlwdjZQYXR0ZXJuLnRlc3QoaG9zdG5hbWUpXG4gICAgICAgICAgICB8fCBpcHY2Tm9CcmFja2V0cy50ZXN0KGhvc3RuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIG1lc3NhZ2Ugd2hlbiBkb21haW4gaXMgcmVxdWlyZWQgZm9yIFBhc3NrZXlzXG4gICAgICovXG4gICAgcmVuZGVyRG9tYWluUmVxdWlyZWRNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Eb21haW5SZXF1aXJlZH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wa19Eb21haW5SZXF1aXJlZERlc2NyaXB0aW9ufTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICB0aGlzLiRjb250YWluZXIuaHRtbChodG1sKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHVuc3VwcG9ydGVkIGJyb3dzZXIgbWVzc2FnZVxuICAgICAqL1xuICAgIHJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Ob3RTdXBwb3J0ZWR9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmh0bWwoaHRtbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgcGFzc2tleXMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBsb2FkUGFzc2tleXMoKSB7XG4gICAgICAgIFBhc3NrZXlzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXNza2V5cyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZW5kZXJUYWJsZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBwYXNza2V5cyB0YWJsZVxuICAgICAqL1xuICAgIHJlbmRlclRhYmxlKCkge1xuICAgICAgICBjb25zdCAkdGFibGUgPSAkKCcjcGFzc2tleXMtdGFibGUgdGJvZHknKTtcbiAgICAgICAgY29uc3QgJGVtcHR5Um93ID0gJCgnI3Bhc3NrZXlzLWVtcHR5LXJvdycpO1xuXG4gICAgICAgIGlmICh0aGlzLnBhc3NrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJHRhYmxlLmZpbmQoJ3RyOm5vdCgjcGFzc2tleXMtZW1wdHktcm93KScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJGVtcHR5Um93LnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZW1wdHkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICRlbXB0eVJvdy5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBwYXNza2V5IHJvd3MgKGtlZXAgZW1wdHkgcm93KVxuICAgICAgICAgICAgJHRhYmxlLmZpbmQoJ3RyOm5vdCgjcGFzc2tleXMtZW1wdHktcm93KScpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBBZGQgcGFzc2tleSByb3dzXG4gICAgICAgICAgICB0aGlzLnBhc3NrZXlzLmZvckVhY2goKHBhc3NrZXkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0VXNlZCA9IHBhc3NrZXkubGFzdF91c2VkX2F0XG4gICAgICAgICAgICAgICAgICAgID8gdGhpcy5mb3JtYXREYXRlKHBhc3NrZXkubGFzdF91c2VkX2F0KVxuICAgICAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wa19OZXZlclVzZWQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8dHIgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInBhc3NrZXktY2VsbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAwLjNlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3RoaXMuZXNjYXBlSHRtbChwYXNza2V5Lm5hbWUpfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgY29sb3I6IHJnYmEoMCwwLDAsLjQpO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Db2x1bW5MYXN0VXNlZH06ICR7bGFzdFVzZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1wYXNza2V5LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLnBrX0RlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgJHRhYmxlLmFwcGVuZChodG1sKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBBZGQgYnV0dG9uIHJvd1xuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uUm93ID0gYFxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1wYXNza2V5LXJvd1wiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBtaW5pIGJhc2ljIGJ1dHRvblwiIGlkPVwiYWRkLXBhc3NrZXktYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwbHVzIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfQWRkUGFzc2tleX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJHRhYmxlLmFwcGVuZChhZGRCdXR0b25Sb3cpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgICAgICAkdGFibGUuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRhdGVTdHJpbmcgLSBJU08gZGF0ZSBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZVxuICAgICAqL1xuICAgIGZvcm1hdERhdGUoZGF0ZVN0cmluZykge1xuICAgICAgICBpZiAoIWRhdGVTdHJpbmcpIHJldHVybiAnLSc7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGJpbmRFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBZGQgcGFzc2tleSBidXR0b24gKGRlbGVnYXRlZClcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcjYWRkLXBhc3NrZXktYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLnJlZ2lzdGVyTmV3UGFzc2tleSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChkZWxlZ2F0ZWQpXG4gICAgICAgIC8vIE9ubHkgdHJpZ2dlciBkZWxldGlvbiBvbiBzZWNvbmQgY2xpY2sgKHdoZW4gdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpcyByZW1vdmVkKVxuICAgICAgICB0aGlzLiRjb250YWluZXIub24oJ2NsaWNrJywgJy5kZWxldGUtcGFzc2tleS1idG46bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgcGFzc2tleUlkID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2lkJyk7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5kZWxldGVQYXNza2V5KHBhc3NrZXlJZCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNza2V5IG5hbWUgYmFzZWQgb24gYnJvd3NlciBhbmQgZGV2aWNlIGluZm9ybWF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gR2VuZXJhdGVkIHBhc3NrZXkgbmFtZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc2tleU5hbWUoKSB7XG4gICAgICAgIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgICAgbGV0IGJyb3dzZXIgPSAnQnJvd3Nlcic7XG4gICAgICAgIGxldCBvcyA9ICdVbmtub3duIE9TJztcbiAgICAgICAgbGV0IGRldmljZSA9ICcnO1xuXG4gICAgICAgIC8vIERldGVjdCBicm93c2VyXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdFZGcnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0VkZ2UnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0Nocm9tZScpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnQ2hyb21lJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdTYWZhcmknKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ1NhZmFyaSc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignRmlyZWZveCcpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnRmlyZWZveCc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignT3BlcmEnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ09QUicpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnT3BlcmEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IE9TXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdXaW4nKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdXaW5kb3dzJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdNYWMnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdtYWNPUyc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignTGludXgnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdMaW51eCc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignQW5kcm9pZCcpID4gLTEpIHtcbiAgICAgICAgICAgIG9zID0gJ0FuZHJvaWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ2lQaG9uZScpID4gLTEgfHwgdWEuaW5kZXhPZignaVBhZCcpID4gLTEpIHtcbiAgICAgICAgICAgIG9zID0gdWEuaW5kZXhPZignaVBob25lJykgPiAtMSA/ICdpUGhvbmUnIDogJ2lQYWQnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IGRldmljZSB0eXBlIGZvciBtb2JpbGVcbiAgICAgICAgaWYgKHVhLmluZGV4T2YoJ01vYmlsZScpID4gLTEgJiYgb3MgIT09ICdBbmRyb2lkJyAmJiBvcyAhPT0gJ2lQaG9uZScgJiYgb3MgIT09ICdpUGFkJykge1xuICAgICAgICAgICAgZGV2aWNlID0gJyBNb2JpbGUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgbmFtZVxuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xuICAgICAgICByZXR1cm4gYCR7YnJvd3Nlcn0gb24gJHtvc30ke2RldmljZX0gKCR7dGltZXN0YW1wfSlgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBuZXcgcGFzc2tleSB1c2luZyBXZWJBdXRoblxuICAgICAqL1xuICAgIGFzeW5jIHJlZ2lzdGVyTmV3UGFzc2tleSgpIHtcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNza2V5IG5hbWUgYmFzZWQgb24gYnJvd3Nlci9kZXZpY2VcbiAgICAgICAgY29uc3QgcGFzc2tleU5hbWUgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5nZW5lcmF0ZVBhc3NrZXlOYW1lKCk7XG5cbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNhZGQtcGFzc2tleS1idXR0b24nKTtcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBjaGFsbGVuZ2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFBhc3NrZXlzQVBJLnJlZ2lzdHJhdGlvblN0YXJ0KHBhc3NrZXlOYW1lLCBhc3luYyAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGVwIDI6IENhbGwgV2ViQXV0aG4gQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleU9wdGlvbnMgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5wcmVwYXJlQ3JlZGVudGlhbENyZWF0aW9uT3B0aW9ucyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3JlZGVudGlhbCA9IGF3YWl0IG5hdmlnYXRvci5jcmVkZW50aWFscy5jcmVhdGUoeyBwdWJsaWNLZXk6IHB1YmxpY0tleU9wdGlvbnMgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU3RlcCAzOiBTZW5kIGF0dGVzdGF0aW9uIHRvIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRlc3RhdGlvbkRhdGEgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5wcmVwYXJlQXR0ZXN0YXRpb25EYXRhKGNyZWRlbnRpYWwsIHJlc3BvbnNlLmRhdGEsIHBhc3NrZXlOYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBQYXNza2V5c0FQSS5yZWdpc3RyYXRpb25GaW5pc2goYXR0ZXN0YXRpb25EYXRhLCAoZmluaXNoUmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbmlzaFJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmxvYWRQYXNza2V5cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZmluaXNoUmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYkF1dGhuIHJlZ2lzdHJhdGlvbiBlcnJvcjonLCBlcnJvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNwZWNpZmljIFdlYkF1dGhuIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ05vdEFsbG93ZWRFcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBUTFMgY2VydGlmaWNhdGUgZXJyb3IgKENocm9tZS1zcGVjaWZpYylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5tZXNzYWdlICYmIGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ1RMUyBjZXJ0aWZpY2F0ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wa19UbHNDZXJ0aWZpY2F0ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlciBjYW5jZWxsZWQgdGhlIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUucGtfUmVnaXN0ZXJDYW5jZWxsZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5wa19SZWdpc3RlckVycm9yfTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdSZWdpc3RyYXRpb24gc3RhcnQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5wa19SZWdpc3RlckVycm9yfTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgY3JlZGVudGlhbCBjcmVhdGlvbiBvcHRpb25zIGZvciBXZWJBdXRobiBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2VydmVyRGF0YSAtIERhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBQdWJsaWNLZXlDcmVkZW50aWFsQ3JlYXRpb25PcHRpb25zXG4gICAgICovXG4gICAgcHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMoc2VydmVyRGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhbGxlbmdlOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKHNlcnZlckRhdGEuY2hhbGxlbmdlKSxcbiAgICAgICAgICAgIHJwOiBzZXJ2ZXJEYXRhLnJwLFxuICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGlkOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKHNlcnZlckRhdGEudXNlci5pZCksXG4gICAgICAgICAgICAgICAgbmFtZTogc2VydmVyRGF0YS51c2VyLm5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHNlcnZlckRhdGEudXNlci5kaXNwbGF5TmFtZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwdWJLZXlDcmVkUGFyYW1zOiBzZXJ2ZXJEYXRhLnB1YktleUNyZWRQYXJhbXMsXG4gICAgICAgICAgICBhdXRoZW50aWNhdG9yU2VsZWN0aW9uOiBzZXJ2ZXJEYXRhLmF1dGhlbnRpY2F0b3JTZWxlY3Rpb24sXG4gICAgICAgICAgICB0aW1lb3V0OiBzZXJ2ZXJEYXRhLnRpbWVvdXQgfHwgNjAwMDAsXG4gICAgICAgICAgICBhdHRlc3RhdGlvbjogc2VydmVyRGF0YS5hdHRlc3RhdGlvbiB8fCAnbm9uZScsXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgYXR0ZXN0YXRpb24gZGF0YSB0byBzZW5kIHRvIHNlcnZlclxuICAgICAqIEBwYXJhbSB7UHVibGljS2V5Q3JlZGVudGlhbH0gY3JlZGVudGlhbCAtIENyZWRlbnRpYWwgZnJvbSBXZWJBdXRoblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXJ2ZXJEYXRhIC0gT3JpZ2luYWwgc2VydmVyIGRhdGEgd2l0aCBzZXNzaW9uSWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc2tleU5hbWUgLSBHZW5lcmF0ZWQgcGFzc2tleSBuYW1lXG4gICAgICogQHJldHVybnMge29iamVjdH0gQXR0ZXN0YXRpb24gZGF0YVxuICAgICAqL1xuICAgIHByZXBhcmVBdHRlc3RhdGlvbkRhdGEoY3JlZGVudGlhbCwgc2VydmVyRGF0YSwgcGFzc2tleU5hbWUpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBjcmVkZW50aWFsLnJlc3BvbnNlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXNzaW9uSWQ6IHNlcnZlckRhdGEuc2Vzc2lvbklkLFxuICAgICAgICAgICAgY3JlZGVudGlhbElkOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGNyZWRlbnRpYWwucmF3SWQpLFxuICAgICAgICAgICAgbmFtZTogcGFzc2tleU5hbWUsXG4gICAgICAgICAgICBhdHRlc3RhdGlvbk9iamVjdDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5hdHRlc3RhdGlvbk9iamVjdCksXG4gICAgICAgICAgICBjbGllbnREYXRhSlNPTjogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5jbGllbnREYXRhSlNPTiksXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwYXNza2V5ICh3aXRob3V0IGNvbmZpcm1hdGlvbiAtIHVzaW5nIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNza2V5SWQgLSBJRCBvZiBwYXNza2V5IHRvIGRlbGV0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVBhc3NrZXkocGFzc2tleUlkKSB7XG4gICAgICAgIFBhc3NrZXlzQVBJLmRlbGV0ZVJlY29yZChwYXNza2V5SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmxvYWRQYXNza2V5cygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBiYXNlNjR1cmwgc3RyaW5nIHRvIEFycmF5QnVmZmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJhc2U2NHVybCAtIEJhc2U2NHVybCBlbmNvZGVkIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtBcnJheUJ1ZmZlcn1cbiAgICAgKi9cbiAgICBiYXNlNjR1cmxUb0FycmF5QnVmZmVyKGJhc2U2NHVybCkge1xuICAgICAgICBjb25zdCBwYWRkaW5nID0gJz0nLnJlcGVhdCgoNCAtIChiYXNlNjR1cmwubGVuZ3RoICUgNCkpICUgNCk7XG4gICAgICAgIGNvbnN0IGJhc2U2NCA9IGJhc2U2NHVybC5yZXBsYWNlKC8tL2csICcrJykucmVwbGFjZSgvXy9nLCAnLycpICsgcGFkZGluZztcbiAgICAgICAgY29uc3QgcmF3RGF0YSA9IHdpbmRvdy5hdG9iKGJhc2U2NCk7XG4gICAgICAgIGNvbnN0IG91dHB1dEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkocmF3RGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd0RhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIG91dHB1dEFycmF5W2ldID0gcmF3RGF0YS5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXRBcnJheS5idWZmZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQXJyYXlCdWZmZXIgdG8gYmFzZTY0dXJsIHN0cmluZ1xuICAgICAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGJ1ZmZlciAtIEFycmF5QnVmZmVyIHRvIGNvbnZlcnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBCYXNlNjR1cmwgZW5jb2RlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBhcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGJ1ZmZlcikge1xuICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIGxldCBiaW5hcnkgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5ieXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiYXNlNjQgPSB3aW5kb3cuYnRvYShiaW5hcnkpO1xuICAgICAgICByZXR1cm4gYmFzZTY0LnJlcGxhY2UoL1xcKy9nLCAnLScpLnJlcGxhY2UoL1xcLy9nLCAnXycpLnJlcGxhY2UoLz0vZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19