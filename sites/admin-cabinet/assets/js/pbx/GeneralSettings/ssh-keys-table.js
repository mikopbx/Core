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

/* global globalTranslate, ClipboardJS, UserMessage */

/**
 * SSH Keys Table Management Module
 * Handles display and management of SSH authorized keys in a table format
 */
var sshKeysTable = {
  /**
   * Array of SSH keys
   * @type {Array<{key: string, comment: string}>}
   */
  keys: [],

  /**
   * jQuery object for the table container
   * @type {jQuery}
   */
  $container: null,

  /**
   * jQuery object for the hidden input field
   * @type {jQuery}
   */
  $hiddenField: null,

  /**
   * Clipboard instance for copy functionality
   * @type {ClipboardJS}
   */
  clipboard: null,

  /**
   * Initialize the SSH keys table
   * 
   * @param {string} containerId Container element ID
   * @param {string} fieldId Hidden field ID
   */
  initialize: function initialize(containerId, fieldId) {
    this.$container = $("#".concat(containerId));
    this.$hiddenField = $("#".concat(fieldId));

    if (this.$container.length === 0 || this.$hiddenField.length === 0) {
      return;
    } // Parse existing value from textarea/hidden field


    this.parseExistingKeys(); // Render the table

    this.renderTable(); // Initialize clipboard

    this.initializeClipboard(); // Bind event handlers

    this.bindEventHandlers();
  },

  /**
   * Parse existing SSH keys from the hidden field
   */
  parseExistingKeys: function parseExistingKeys() {
    var _this = this;

    var existingValue = this.$hiddenField.val();

    if (!existingValue) {
      return;
    }

    var lines = existingValue.split('\n');
    this.keys = [];
    lines.forEach(function (line) {
      line = line.trim();

      if (line && !line.startsWith('#')) {
        // Store the full key line
        _this.keys.push({
          key: line
        });
      }
    });
  },

  /**
   * Render the SSH keys table
   */
  renderTable: function renderTable() {
    var _this2 = this;

    var html = "\n            <table class=\"ui very basic table\" id=\"ssh-keys-list\">\n                <tbody>\n        "; // Show existing keys

    this.keys.forEach(function (keyData, index) {
      var truncated = _this2.truncateSSHKey(keyData.key);

      html += "\n                <tr data-index=\"".concat(index, "\">\n                    <td class=\"ssh-key-cell\">\n                        <code style=\"font-size: 0.9em;\">").concat(truncated, "</code>\n                    </td>\n                    <td class=\"right aligned collapsing\">\n                        <div class=\"ui tiny basic icon buttons action-buttons\">\n                            <a class=\"ui button copy-key-btn\" \n                               data-clipboard-text=\"").concat(_this2.escapeHtml(keyData.key), "\"\n                               data-variation=\"basic\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipCopyKey, "\">\n                                <i class=\"copy icon blue\"></i>\n                            </a>\n                            <a class=\"ui button delete-key-btn\" \n                               data-index=\"").concat(index, "\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </div>\n                    </td>\n                </tr>\n            ");
    }); // Add new key row (initially hidden, shown when add button clicked)

    html += "\n                <tr id=\"add-key-row\" style=\"display:none;\">\n                    <td colspan=\"2\">\n                        <div class=\"ui form\">\n                            <div class=\"field\">\n                                <textarea id=\"new-ssh-key\" rows=\"3\" \n                                    placeholder=\"".concat(globalTranslate.gs_SSHKeyPlaceholder, "\"></textarea>\n                            </div>\n                            <div class=\"ui mini buttons\">\n                                <button class=\"ui positive button\" id=\"save-key-btn\">\n                                    <i class=\"check icon\"></i> ").concat(globalTranslate.bt_Add, "\n                                </button>\n                                <button class=\"ui button\" id=\"cancel-key-btn\">\n                                    <i class=\"close icon\"></i> ").concat(globalTranslate.bt_Cancel, "\n                                </button>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n                <tr id=\"add-button-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"show-add-key-btn\">\n                            <i class=\"plus icon\"></i>\n                            ").concat(globalTranslate.gs_AddKey, "\n                        </button>\n                    </td>\n                </tr>\n                </tbody>\n            </table>\n        ");
    this.$container.html(html); // Initialize tooltips

    this.$container.find('[data-content]').popup();
  },

  /**
   * Truncate SSH key for display (preserves comment)
   * 
   * @param {string} key Full SSH key
   * @return {string} Truncated key with comment
   */
  truncateSSHKey: function truncateSSHKey(key) {
    if (!key || key.length < 50) {
      return key;
    }

    var parts = key.split(' ');

    if (parts.length >= 2) {
      var keyType = parts[0];
      var keyData = parts[1];
      var comment = parts.slice(2).join(' '); // Everything after key data is comment

      if (keyData.length > 40) {
        var truncated = keyData.substring(0, 20) + '...' + keyData.substring(keyData.length - 15); // Include comment if present

        return comment ? "".concat(keyType, " ").concat(truncated, " ").concat(comment) : "".concat(keyType, " ").concat(truncated);
      }
    }

    return key;
  },

  /**
   * Initialize clipboard functionality
   */
  initializeClipboard: function initializeClipboard() {
    if (this.clipboard) {
      this.clipboard.destroy();
    }

    this.clipboard = new ClipboardJS('.copy-key-btn');
    this.clipboard.on('success', function (e) {
      // Just visual feedback - change icon briefly
      var $icon = $(e.trigger).find('i');
      $icon.removeClass('copy').addClass('check green');
      setTimeout(function () {
        $icon.removeClass('check green').addClass('copy blue');
      }, 2000); // Clear selection

      e.clearSelection();
    });
    this.clipboard.on('error', function () {
      UserMessage.showError(globalTranslate.gs_CopyFailed);
    });
  },

  /**
   * Bind event handlers
   */
  bindEventHandlers: function bindEventHandlers() {
    var _this3 = this;

    // Show add key form
    this.$container.on('click', '#show-add-key-btn', function (e) {
      e.preventDefault();
      $('#add-key-row').show();
      $('#add-button-row').hide();
      $('#new-ssh-key').focus();
    }); // Save new key

    this.$container.on('click', '#save-key-btn', function (e) {
      e.preventDefault();

      _this3.addKey();
    }); // Cancel add key

    this.$container.on('click', '#cancel-key-btn', function (e) {
      e.preventDefault();

      _this3.cancelAddKey();
    }); // Delete key button

    this.$container.on('click', '.delete-key-btn', function (e) {
      e.preventDefault();
      var index = parseInt($(e.currentTarget).data('index'));

      _this3.deleteKey(index);
    }); // Enter key in input saves the key

    this.$container.on('keydown', '#new-ssh-key', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();

        _this3.addKey();
      } else if (e.key === 'Escape') {
        e.preventDefault();

        _this3.cancelAddKey();
      }
    });
  },

  /**
   * Cancel adding a new key
   */
  cancelAddKey: function cancelAddKey() {
    $('#new-ssh-key').val('');
    $('#add-key-row').hide();
    $('#add-button-row').show();
  },

  /**
   * Add a new SSH key or multiple keys
   */
  addKey: function addKey() {
    var _this4 = this;

    var $input = $('#new-ssh-key');
    var inputValue = $input.val().trim();

    if (!inputValue) {
      // Just close the form if empty
      this.cancelAddKey();
      return;
    } // Parse multiple keys (split by newlines and filter out empty lines and comments)


    var lines = inputValue.split('\n');
    var newKeys = [];
    var invalidKeys = [];
    var duplicateKeys = [];
    lines.forEach(function (line) {
      line = line.trim(); // Skip empty lines and comments

      if (!line || line.startsWith('#')) {
        return;
      } // Validate SSH key format


      if (!_this4.isValidSSHKey(line)) {
        invalidKeys.push(line.substring(0, 50) + (line.length > 50 ? '...' : ''));
        return;
      } // Check for duplicates


      if (_this4.keys.some(function (k) {
        return k.key === line;
      })) {
        duplicateKeys.push(_this4.truncateSSHKey(line));
        return;
      } // Check for duplicates within the new keys being added


      if (newKeys.some(function (k) {
        return k.key === line;
      })) {
        duplicateKeys.push(_this4.truncateSSHKey(line));
        return;
      }

      newKeys.push({
        key: line
      });
    }); // Show errors if any

    if (invalidKeys.length > 0) {
      var message = globalTranslate.gs_InvalidKeyFormat + ': ' + invalidKeys.join(', ');
      UserMessage.showError(message);
      $input.focus();
      return;
    }

    if (duplicateKeys.length > 0 && newKeys.length === 0) {
      var _message = globalTranslate.gs_KeyAlreadyExists + ': ' + duplicateKeys.join(', ');

      UserMessage.showError(_message);
      $input.focus();
      return;
    } // Add all valid new keys


    if (newKeys.length > 0) {
      var _this$keys;

      (_this$keys = this.keys).push.apply(_this$keys, newKeys); // Update hidden field


      this.updateHiddenField(); // Re-render table

      this.renderTable(); // Re-initialize clipboard for new buttons

      this.initializeClipboard(); // Show info about duplicates if any were skipped

      if (duplicateKeys.length > 0) {
        var _message2 = "".concat(globalTranslate.gs_KeysAdded, " ").concat(newKeys.length, " ").concat(globalTranslate.gs_Keys, ". ") + "".concat(globalTranslate.gs_SkippedDuplicates, ": ").concat(duplicateKeys.length);

        UserMessage.showInformation(_message2);
      }
    } else if (duplicateKeys.length > 0) {
      // All keys were duplicates
      var _message3 = globalTranslate.gs_AllKeysAlreadyExist;
      UserMessage.showError(_message3);
      $input.focus();
    }
  },

  /**
   * Delete an SSH key
   * 
   * @param {number} index Key index to delete
   */
  deleteKey: function deleteKey(index) {
    if (index < 0 || index >= this.keys.length) {
      return;
    } // Remove from array


    this.keys.splice(index, 1); // Update hidden field

    this.updateHiddenField(); // Re-render table

    this.renderTable(); // Re-initialize clipboard for remaining buttons

    this.initializeClipboard();
  },

  /**
   * Update the hidden field with current keys
   */
  updateHiddenField: function updateHiddenField() {
    var lines = this.keys.map(function (keyData) {
      return keyData.key;
    });
    this.$hiddenField.val(lines.join('\n')); // Trigger change event for form validation

    this.$hiddenField.trigger('change'); // Also trigger Form.checkValues() if it exists to enable save button

    if (typeof Form !== 'undefined' && Form.checkValues) {
      Form.checkValues();
    }
  },

  /**
   * Validate SSH key format
   * 
   * @param {string} key SSH key string
   * @return {boolean} True if valid
   */
  isValidSSHKey: function isValidSSHKey(key) {
    var sshKeyRegex = /^(ssh-rsa|ssh-dss|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+[=]{0,2}(\s+.+)?$/;
    return sshKeyRegex.test(key.trim());
  },

  /**
   * Escape HTML for safe display
   * 
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
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3Mvc3NoLWtleXMtdGFibGUuanMiXSwibmFtZXMiOlsic3NoS2V5c1RhYmxlIiwia2V5cyIsIiRjb250YWluZXIiLCIkaGlkZGVuRmllbGQiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwiY29udGFpbmVySWQiLCJmaWVsZElkIiwiJCIsImxlbmd0aCIsInBhcnNlRXhpc3RpbmdLZXlzIiwicmVuZGVyVGFibGUiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwiYmluZEV2ZW50SGFuZGxlcnMiLCJleGlzdGluZ1ZhbHVlIiwidmFsIiwibGluZXMiLCJzcGxpdCIsImZvckVhY2giLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJwdXNoIiwia2V5IiwiaHRtbCIsImtleURhdGEiLCJpbmRleCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiZXNjYXBlSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBDb3B5S2V5IiwiYnRfVG9vbFRpcERlbGV0ZSIsImdzX1NTSEtleVBsYWNlaG9sZGVyIiwiYnRfQWRkIiwiYnRfQ2FuY2VsIiwiZ3NfQWRkS2V5IiwiZmluZCIsInBvcHVwIiwicGFydHMiLCJrZXlUeXBlIiwiY29tbWVudCIsInNsaWNlIiwiam9pbiIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJDbGlwYm9hcmRKUyIsIm9uIiwiZSIsIiRpY29uIiwidHJpZ2dlciIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdzX0NvcHlGYWlsZWQiLCJwcmV2ZW50RGVmYXVsdCIsInNob3ciLCJoaWRlIiwiZm9jdXMiLCJhZGRLZXkiLCJjYW5jZWxBZGRLZXkiLCJwYXJzZUludCIsImN1cnJlbnRUYXJnZXQiLCJkYXRhIiwiZGVsZXRlS2V5IiwiJGlucHV0IiwiaW5wdXRWYWx1ZSIsIm5ld0tleXMiLCJpbnZhbGlkS2V5cyIsImR1cGxpY2F0ZUtleXMiLCJpc1ZhbGlkU1NIS2V5Iiwic29tZSIsImsiLCJtZXNzYWdlIiwiZ3NfSW52YWxpZEtleUZvcm1hdCIsImdzX0tleUFscmVhZHlFeGlzdHMiLCJ1cGRhdGVIaWRkZW5GaWVsZCIsImdzX0tleXNBZGRlZCIsImdzX0tleXMiLCJnc19Ta2lwcGVkRHVwbGljYXRlcyIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbEtleXNBbHJlYWR5RXhpc3QiLCJzcGxpY2UiLCJtYXAiLCJGb3JtIiwiY2hlY2tWYWx1ZXMiLCJzc2hLZXlSZWdleCIsInRlc3QiLCJ0ZXh0IiwicmVwbGFjZSIsIm0iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxJQUFJLEVBQUUsRUFMVzs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBWEs7O0FBYWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQWpCRzs7QUFtQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQXZCTTs7QUF5QmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQS9CaUIsc0JBK0JOQyxXQS9CTSxFQStCT0MsT0EvQlAsRUErQmdCO0FBQzdCLFNBQUtMLFVBQUwsR0FBa0JNLENBQUMsWUFBS0YsV0FBTCxFQUFuQjtBQUNBLFNBQUtILFlBQUwsR0FBb0JLLENBQUMsWUFBS0QsT0FBTCxFQUFyQjs7QUFFQSxRQUFJLEtBQUtMLFVBQUwsQ0FBZ0JPLE1BQWhCLEtBQTJCLENBQTNCLElBQWdDLEtBQUtOLFlBQUwsQ0FBa0JNLE1BQWxCLEtBQTZC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QUFsQixDQUEwQixRQUExQixFQU5nQixDQVFoQjs7QUFDQSxRQUFJLE9BQU9xQyxJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUNDLFdBQXhDLEVBQXFEO0FBQ2pERCxNQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSDtBQUNKLEdBbllnQjs7QUFxWWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJZixFQUFBQSxhQTNZaUIseUJBMllIbEQsR0EzWUcsRUEyWUU7QUFDZixRQUFNa0UsV0FBVyxHQUFHLDhIQUFwQjtBQUNBLFdBQU9BLFdBQVcsQ0FBQ0MsSUFBWixDQUFpQm5FLEdBQUcsQ0FBQ0gsSUFBSixFQUFqQixDQUFQO0FBQ0gsR0E5WWdCOztBQWdaakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFVBdFppQixzQkFzWk44RCxJQXRaTSxFQXNaQTtBQUNiLFFBQU1MLEdBQUcsR0FBRztBQUNSLFdBQUssT0FERztBQUVSLFdBQUssTUFGRztBQUdSLFdBQUssTUFIRztBQUlSLFdBQUssUUFKRztBQUtSLFdBQUs7QUFMRyxLQUFaO0FBT0EsV0FBT0ssSUFBSSxDQUFDQyxPQUFMLENBQWEsVUFBYixFQUF5QixVQUFBQyxDQUFDO0FBQUEsYUFBSVAsR0FBRyxDQUFDTyxDQUFELENBQVA7QUFBQSxLQUExQixDQUFQO0FBQ0g7QUEvWmdCLENBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgQ2xpcGJvYXJkSlMsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogU1NIIEtleXMgVGFibGUgTWFuYWdlbWVudCBNb2R1bGVcbiAqIEhhbmRsZXMgZGlzcGxheSBhbmQgbWFuYWdlbWVudCBvZiBTU0ggYXV0aG9yaXplZCBrZXlzIGluIGEgdGFibGUgZm9ybWF0XG4gKi9cbmNvbnN0IHNzaEtleXNUYWJsZSA9IHtcbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBTU0gga2V5c1xuICAgICAqIEB0eXBlIHtBcnJheTx7a2V5OiBzdHJpbmcsIGNvbW1lbnQ6IHN0cmluZ30+fVxuICAgICAqL1xuICAgIGtleXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjb250YWluZXI6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGhpZGRlbiBpbnB1dCBmaWVsZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGhpZGRlbkZpZWxkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBTU0gga2V5cyB0YWJsZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJJZCBDb250YWluZXIgZWxlbWVudCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIEhpZGRlbiBmaWVsZCBJRFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoY29udGFpbmVySWQsIGZpZWxkSWQpIHtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyID0gJChgIyR7Y29udGFpbmVySWR9YCk7XG4gICAgICAgIHRoaXMuJGhpZGRlbkZpZWxkID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLiRjb250YWluZXIubGVuZ3RoID09PSAwIHx8IHRoaXMuJGhpZGRlbkZpZWxkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQYXJzZSBleGlzdGluZyB2YWx1ZSBmcm9tIHRleHRhcmVhL2hpZGRlbiBmaWVsZFxuICAgICAgICB0aGlzLnBhcnNlRXhpc3RpbmdLZXlzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgdGhlIHRhYmxlXG4gICAgICAgIHRoaXMucmVuZGVyVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLmJpbmRFdmVudEhhbmRsZXJzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQYXJzZSBleGlzdGluZyBTU0gga2V5cyBmcm9tIHRoZSBoaWRkZW4gZmllbGRcbiAgICAgKi9cbiAgICBwYXJzZUV4aXN0aW5nS2V5cygpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmdWYWx1ZSA9IHRoaXMuJGhpZGRlbkZpZWxkLnZhbCgpO1xuICAgICAgICBpZiAoIWV4aXN0aW5nVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGluZXMgPSBleGlzdGluZ1ZhbHVlLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdGhpcy5rZXlzID0gW107XG4gICAgICAgIFxuICAgICAgICBsaW5lcy5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGxpbmUgJiYgIWxpbmUuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIGZ1bGwga2V5IGxpbmVcbiAgICAgICAgICAgICAgICB0aGlzLmtleXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGtleTogbGluZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgU1NIIGtleXMgdGFibGVcbiAgICAgKi9cbiAgICByZW5kZXJUYWJsZSgpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgXG4gICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlXCIgaWQ9XCJzc2gta2V5cy1saXN0XCI+XG4gICAgICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBleGlzdGluZyBrZXlzXG4gICAgICAgIHRoaXMua2V5cy5mb3JFYWNoKChrZXlEYXRhLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gdGhpcy50cnVuY2F0ZVNTSEtleShrZXlEYXRhLmtleSk7XG4gICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICA8dHIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInNzaC1rZXktY2VsbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGNvZGUgc3R5bGU9XCJmb250LXNpemU6IDAuOWVtO1wiPiR7dHJ1bmNhdGVkfTwvY29kZT5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5LWtleS1idG5cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHt0aGlzLmVzY2FwZUh0bWwoa2V5RGF0YS5rZXkpfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlLZXl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZS1rZXktYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcga2V5IHJvdyAoaW5pdGlhbGx5IGhpZGRlbiwgc2hvd24gd2hlbiBhZGQgYnV0dG9uIGNsaWNrZWQpXG4gICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1rZXktcm93XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvcm1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwibmV3LXNzaC1rZXlcIiByb3dzPVwiM1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19TU0hLZXlQbGFjZWhvbGRlcn1cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvblwiIGlkPVwic2F2ZS1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0FkZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b25cIiBpZD1cImNhbmNlbC1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1idXR0b24tcm93XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgYmFzaWMgYnV0dG9uXCIgaWQ9XCJzaG93LWFkZC1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwbHVzIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfQWRkS2V5fVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICB0aGlzLiRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheSAocHJlc2VydmVzIGNvbW1lbnQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXkgd2l0aCBjb21tZW50XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpOyAvLyBFdmVyeXRoaW5nIGFmdGVyIGtleSBkYXRhIGlzIGNvbW1lbnRcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleURhdGEubGVuZ3RoID4gNDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBrZXlEYXRhLnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyArIGtleURhdGEuc3Vic3RyaW5nKGtleURhdGEubGVuZ3RoIC0gMTUpO1xuICAgICAgICAgICAgICAgIC8vIEluY2x1ZGUgY29tbWVudCBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbW1lbnQgPyBgJHtrZXlUeXBlfSAke3RydW5jYXRlZH0gJHtjb21tZW50fWAgOiBgJHtrZXlUeXBlfSAke3RydW5jYXRlZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgdGhpcy5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNvcHkta2V5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSnVzdCB2aXN1YWwgZmVlZGJhY2sgLSBjaGFuZ2UgaWNvbiBicmllZmx5XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZS50cmlnZ2VyKS5maW5kKCdpJyk7XG4gICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29weScpLmFkZENsYXNzKCdjaGVjayBncmVlbicpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NoZWNrIGdyZWVuJykuYWRkQ2xhc3MoJ2NvcHkgYmx1ZScpO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIHNlbGVjdGlvblxuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGJpbmRFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBTaG93IGFkZCBrZXkgZm9ybVxuICAgICAgICB0aGlzLiRjb250YWluZXIub24oJ2NsaWNrJywgJyNzaG93LWFkZC1rZXktYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJyNhZGQta2V5LXJvdycpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNhZGQtYnV0dG9uLXJvdycpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNuZXctc3NoLWtleScpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBuZXcga2V5XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI3NhdmUta2V5LWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmFkZEtleSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbmNlbCBhZGQga2V5XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI2NhbmNlbC1rZXktYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuY2FuY2VsQWRkS2V5KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGtleSBidXR0b25cbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcuZGVsZXRlLWtleS1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludCgkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnaW5kZXgnKSk7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZUtleShpbmRleCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRW50ZXIga2V5IGluIGlucHV0IHNhdmVzIHRoZSBrZXlcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdrZXlkb3duJywgJyNuZXctc3NoLWtleScsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRLZXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsQWRkS2V5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGFkZGluZyBhIG5ldyBrZXlcbiAgICAgKi9cbiAgICBjYW5jZWxBZGRLZXkoKSB7XG4gICAgICAgICQoJyNuZXctc3NoLWtleScpLnZhbCgnJyk7XG4gICAgICAgICQoJyNhZGQta2V5LXJvdycpLmhpZGUoKTtcbiAgICAgICAgJCgnI2FkZC1idXR0b24tcm93Jykuc2hvdygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IFNTSCBrZXkgb3IgbXVsdGlwbGUga2V5c1xuICAgICAqL1xuICAgIGFkZEtleSgpIHtcbiAgICAgICAgY29uc3QgJGlucHV0ID0gJCgnI25ldy1zc2gta2V5Jyk7XG4gICAgICAgIGNvbnN0IGlucHV0VmFsdWUgPSAkaW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFpbnB1dFZhbHVlKSB7XG4gICAgICAgICAgICAvLyBKdXN0IGNsb3NlIHRoZSBmb3JtIGlmIGVtcHR5XG4gICAgICAgICAgICB0aGlzLmNhbmNlbEFkZEtleSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQYXJzZSBtdWx0aXBsZSBrZXlzIChzcGxpdCBieSBuZXdsaW5lcyBhbmQgZmlsdGVyIG91dCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHMpXG4gICAgICAgIGNvbnN0IGxpbmVzID0gaW5wdXRWYWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IG5ld0tleXMgPSBbXTtcbiAgICAgICAgY29uc3QgaW52YWxpZEtleXMgPSBbXTtcbiAgICAgICAgY29uc3QgZHVwbGljYXRlS2V5cyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgbGluZXMuZm9yRWFjaChsaW5lID0+IHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2tpcCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHNcbiAgICAgICAgICAgIGlmICghbGluZSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgU1NIIGtleSBmb3JtYXRcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkU1NIS2V5KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgaW52YWxpZEtleXMucHVzaChsaW5lLnN1YnN0cmluZygwLCA1MCkgKyAobGluZS5sZW5ndGggPiA1MCA/ICcuLi4nIDogJycpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBkdXBsaWNhdGVzXG4gICAgICAgICAgICBpZiAodGhpcy5rZXlzLnNvbWUoayA9PiBrLmtleSA9PT0gbGluZSkpIHtcbiAgICAgICAgICAgICAgICBkdXBsaWNhdGVLZXlzLnB1c2godGhpcy50cnVuY2F0ZVNTSEtleShsaW5lKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZHVwbGljYXRlcyB3aXRoaW4gdGhlIG5ldyBrZXlzIGJlaW5nIGFkZGVkXG4gICAgICAgICAgICBpZiAobmV3S2V5cy5zb21lKGsgPT4gay5rZXkgPT09IGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgZHVwbGljYXRlS2V5cy5wdXNoKHRoaXMudHJ1bmNhdGVTU0hLZXkobGluZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3S2V5cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZXJyb3JzIGlmIGFueVxuICAgICAgICBpZiAoaW52YWxpZEtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5nc19JbnZhbGlkS2V5Rm9ybWF0ICsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnOiAnICsgaW52YWxpZEtleXMuam9pbignLCAnKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICAgICRpbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZHVwbGljYXRlS2V5cy5sZW5ndGggPiAwICYmIG5ld0tleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLmdzX0tleUFscmVhZHlFeGlzdHMgKyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICc6ICcgKyBkdXBsaWNhdGVLZXlzLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICAkaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFsbCB2YWxpZCBuZXcga2V5c1xuICAgICAgICBpZiAobmV3S2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmtleXMucHVzaCguLi5uZXdLZXlzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgdGhpcy51cGRhdGVIaWRkZW5GaWVsZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZS1yZW5kZXIgdGFibGVcbiAgICAgICAgICAgIHRoaXMucmVuZGVyVGFibGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIG5ldyBidXR0b25zXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBpbmZvIGFib3V0IGR1cGxpY2F0ZXMgaWYgYW55IHdlcmUgc2tpcHBlZFxuICAgICAgICAgICAgaWYgKGR1cGxpY2F0ZUtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfS2V5c0FkZGVkfSAke25ld0tleXMubGVuZ3RofSAke2dsb2JhbFRyYW5zbGF0ZS5nc19LZXlzfS4gYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NraXBwZWREdXBsaWNhdGVzfTogJHtkdXBsaWNhdGVLZXlzLmxlbmd0aH1gO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChkdXBsaWNhdGVLZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFsbCBrZXlzIHdlcmUgZHVwbGljYXRlc1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxLZXlzQWxyZWFkeUV4aXN0O1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgICAgJGlucHV0LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhbiBTU0gga2V5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IEtleSBpbmRleCB0byBkZWxldGVcbiAgICAgKi9cbiAgICBkZWxldGVLZXkoaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLmtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBmcm9tIGFycmF5XG4gICAgICAgIHRoaXMua2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmaWVsZFxuICAgICAgICB0aGlzLnVwZGF0ZUhpZGRlbkZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1yZW5kZXIgdGFibGVcbiAgICAgICAgdGhpcy5yZW5kZXJUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIHJlbWFpbmluZyBidXR0b25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBoaWRkZW4gZmllbGQgd2l0aCBjdXJyZW50IGtleXNcbiAgICAgKi9cbiAgICB1cGRhdGVIaWRkZW5GaWVsZCgpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmtleXMubWFwKGtleURhdGEgPT4ga2V5RGF0YS5rZXkpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kaGlkZGVuRmllbGQudmFsKGxpbmVzLmpvaW4oJ1xcbicpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IGZvciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgdGhpcy4kaGlkZGVuRmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHNvIHRyaWdnZXIgRm9ybS5jaGVja1ZhbHVlcygpIGlmIGl0IGV4aXN0cyB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIFNTSCBrZXkgZm9ybWF0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBTU0gga2V5IHN0cmluZ1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdmFsaWRcbiAgICAgKi9cbiAgICBpc1ZhbGlkU1NIS2V5KGtleSkge1xuICAgICAgICBjb25zdCBzc2hLZXlSZWdleCA9IC9eKHNzaC1yc2F8c3NoLWRzc3xzc2gtZWQyNTUxOXxlY2RzYS1zaGEyLW5pc3RwMjU2fGVjZHNhLXNoYTItbmlzdHAzODR8ZWNkc2Etc2hhMi1uaXN0cDUyMSlcXHMrW0EtWmEtejAtOSsvXStbPV17MCwyfShcXHMrLispPyQvO1xuICAgICAgICByZXR1cm4gc3NoS2V5UmVnZXgudGVzdChrZXkudHJpbSgpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIGZvciBzYWZlIGRpc3BsYXlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfVxufTsiXX0=