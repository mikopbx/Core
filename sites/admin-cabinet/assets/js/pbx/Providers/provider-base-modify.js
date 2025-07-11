"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  /**  
   * Constructor
   * @param {string} providerType - Type of provider (SIP or IAX)
   */
  function ProviderBase(providerType) {
    _classCallCheck(this, ProviderBase);

    this.providerType = providerType;
    this.$formObj = $('#save-provider-form');
    this.$secret = $('#secret');
    this.$additionalHostsDummy = $('#additional-hosts-table .dummy');
    this.$checkBoxes = $('#save-provider-form .checkbox');
    this.$accordions = $('#save-provider-form .ui.accordion');
    this.$dropDowns = $('#save-provider-form .ui.dropdown');
    this.$deleteRowButton = $('#additional-hosts-table .delete-row-button');
    this.$additionalHostInput = $('#additional-host input');
    this.hostRow = '#save-provider-form .host-row';
    this.hostInputValidation = new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      this.initializeUIComponents();
      this.initializeEventHandlers();
      this.initializeForm();
      this.updateVisibilityElements(); // Initialize all tooltip popups

      $('.popuped').popup();
      this.initializeClipboard(); // Prevent browser password manager for generated passwords

      this.$secret.on('focus', function () {
        $(this).attr('autocomplete', 'new-password');
      });
    }
    /**
     * Initialize UI components
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      this.$checkBoxes.checkbox();
      this.$dropDowns.dropdown();
      this.$accordions.accordion();
      this.updateHostsTableView();
    }
    /**
     * Initialize event handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var self = this; // Add new string to additional-hosts-table table

      this.$additionalHostInput.keypress(function (e) {
        if (e.which === 13) {
          self.cbOnCompleteHostAddress();
        }
      }); // Delete host from additional-hosts-table

      this.$deleteRowButton.on('click', function (e) {
        e.preventDefault();
        $(e.target).closest('tr').remove();
        self.updateHostsTableView();
        Form.dataChanged();
        return false;
      });
      $('#registration_type').on('change', function () {
        self.updateVisibilityElements(); // Remove all validation error prompts without clearing field values

        self.$formObj.find('.field').removeClass('error');
        self.$formObj.find('.ui.error.message').remove();
        self.$formObj.find('.prompt').remove(); // Update validation rules for dynamic fields

        Form.validateRules = self.getValidateRules(); // Mark form as changed to enable save button

        Form.dataChanged(); // Don't auto-submit, just check if form is valid to update UI

        setTimeout(function () {
          self.$formObj.form('is valid');
        }, 100);
      }); // Show/hide password toggle

      $('#show-hide-password').on('click', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var $icon = $button.find('i');

        if (self.$secret.attr('type') === 'password') {
          self.$secret.attr('type', 'text');
          $icon.removeClass('eye').addClass('eye slash');
        } else {
          self.$secret.attr('type', 'password');
          $icon.removeClass('eye slash').addClass('eye');
        }
      });
      $('#generate-new-password').on('click', function (e) {
        e.preventDefault();
        self.generatePassword();
      });
    }
    /**
     * Initialize clipboard functionality
     */

  }, {
    key: "initializeClipboard",
    value: function initializeClipboard() {
      var clipboard = new ClipboardJS('.clipboard');
      $('.clipboard').popup({
        on: 'manual'
      });
      clipboard.on('success', function (e) {
        $(e.trigger).popup('show');
        setTimeout(function () {
          $(e.trigger).popup('hide');
        }, 1500);
        e.clearSelection();
      });
      clipboard.on('error', function (e) {
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
      });
    }
    /**
     * Generate password using REST API
     */

  }, {
    key: "generatePassword",
    value: function generatePassword() {
      // For IAX use moderate password length (16 chars), for SIP use 16
      var length = 16;
      var self = this;
      PbxApi.PasswordGenerate(length, function (password) {
        // Use Fomantic UI Form API
        self.$formObj.form('set value', 'secret', password); // Update clipboard button attribute

        $('#elSecret .ui.button.clipboard').attr('data-clipboard-text', password); // Mark form as changed

        Form.dataChanged();
      });
    }
    /**
     * Updates the hosts table view based on the presence of additional hosts
     */

  }, {
    key: "updateHostsTableView",
    value: function updateHostsTableView() {
      if ($(this.hostRow).length === 0) {
        this.$additionalHostsDummy.show();
      } else {
        this.$additionalHostsDummy.hide();
      }
    }
    /**
     * Callback function when completing the host address input
     */

  }, {
    key: "cbOnCompleteHostAddress",
    value: function cbOnCompleteHostAddress() {
      var value = this.$formObj.form('get value', 'additional-host');

      if (value) {
        var validation = value.match(this.hostInputValidation); // Validate the input value

        if (validation === null || validation.length === 0) {
          this.$additionalHostInput.transition('shake');
          return;
        } // Check if the host address already exists


        if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
          var $tr = $('.host-row-tpl').last();
          var $clone = $tr.clone(true);
          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', value);
          $clone.find('.address').html(value);

          if ($(this.hostRow).last().length === 0) {
            $tr.after($clone);
          } else {
            $(this.hostRow).last().after($clone);
          }

          this.updateHostsTableView();
          Form.dataChanged();
        }

        this.$additionalHostInput.val('');
      }
    }
    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = this.$formObj.form('get values');
      var arrAdditionalHosts = [];
      $(this.hostRow).each(function (_, obj) {
        if ($(obj).attr('data-value')) {
          arrAdditionalHosts.push({
            address: $(obj).attr('data-value')
          });
        }
      });
      result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
      return result;
    }
    /**
     * Callback function to be called after the form has been sent
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm() {// Response handled by Form module
    }
    /**
     * Initialize the form with custom settings
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      var self = this;
      Form.$formObj = this.$formObj; // Prevent auto-submit on validation

      Form.$formObj.form({
        on: 'blur',
        inline: true,
        keyboardShortcuts: false,
        onSuccess: function onSuccess(event) {
          // Prevent auto-submit, only submit via button click
          if (event) {
            event.preventDefault();
          }

          return false;
        }
      });
      Form.url = "".concat(globalRootUrl, "providers/save/").concat(this.providerType.toLowerCase());
      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize();
    }
    /**
     * Get validation rules - must be implemented by subclasses
     * @abstract
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      throw new Error('getValidateRules must be implemented by subclass');
    }
    /**
     * Update visibility of elements - must be implemented by subclasses
     * @abstract
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {
      throw new Error('updateVisibilityElements must be implemented by subclass');
    }
    /**
     * Show informational message about password usage in "none" mode
     * @param {string} providerType - Provider type (sip or iax)
     */

  }, {
    key: "showPasswordInfoMessage",
    value: function showPasswordInfoMessage(providerType) {
      var $secretField = this.$secret.closest('.field');
      var messageKey = providerType === 'sip' ? 'pr_PasswordOptionalForNoneType' : 'iax_PasswordOptionalForNoneType'; // Remove existing info message

      $secretField.find('.ui.info.message').remove(); // Add info message

      var $infoMessage = $("\n            <div class=\"ui info message\">\n                <i class=\"info circle icon\"></i>\n                ".concat(globalTranslate[messageKey], "\n            </div>\n        "));
      $secretField.append($infoMessage);
    }
    /**
     * Hide informational message about password
     */

  }, {
    key: "hidePasswordInfoMessage",
    value: function hidePasswordInfoMessage() {
      this.$secret.closest('.field').find('.ui.info.message').remove();
    }
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(tooltipData) {
      if (!tooltipData) return '';
      var html = ''; // Add header if exists

      if (tooltipData.header) {
        html += "<div class=\"header\"><strong>".concat(tooltipData.header, "</strong></div>");
        html += '<div class="ui divider"></div>';
      } // Add description if exists


      if (tooltipData.description) {
        html += "<p>".concat(tooltipData.description, "</p>");
      } // Add list items if exist


      if (tooltipData.list && tooltipData.list.length > 0) {
        html += '<ul>';
        tooltipData.list.forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            // Header item without definition
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      } // Add additional lists (list2, list3, etc.)


      for (var i = 2; i <= 10; i++) {
        var listName = "list".concat(i);

        if (tooltipData[listName] && tooltipData[listName].length > 0) {
          html += '<ul>';
          tooltipData[listName].forEach(function (item) {
            if (typeof item === 'string') {
              html += "<li>".concat(item, "</li>");
            } else if (item.term && item.definition === null) {
              html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
            } else if (item.term && item.definition) {
              html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
            }
          });
          html += '</ul>';
        }
      } // Add warning if exists


      if (tooltipData.warning) {
        html += '<div class="ui orange message">';
        html += '<i class="exclamation triangle icon"></i>';

        if (tooltipData.warning.header) {
          html += "<strong>".concat(tooltipData.warning.header, ":</strong> ");
        }

        html += tooltipData.warning.text;
        html += '</div>';
      } // Add code examples if exist


      if (tooltipData.examples && tooltipData.examples.length > 0) {
        if (tooltipData.examplesHeader) {
          html += "<p><strong>".concat(tooltipData.examplesHeader, ":</strong></p>");
        }

        html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
        html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples with syntax highlighting for sections

        tooltipData.examples.forEach(function (line, index) {
          if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
            // Section header
            if (index > 0) html += '\n';
            html += "<span style=\"color: #0084b4; font-weight: bold;\">".concat(line, "</span>");
          } else if (line.includes('=')) {
            // Parameter line
            var _line$split = line.split('=', 2),
                _line$split2 = _slicedToArray(_line$split, 2),
                param = _line$split2[0],
                value = _line$split2[1];

            html += "\n<span style=\"color: #7a3e9d;\">".concat(param, "</span>=<span style=\"color: #cf4a4c;\">").concat(value, "</span>");
          } else {
            // Regular line
            html += line ? "\n".concat(line) : '';
          }
        });
        html += '</pre>';
        html += '</div>';
      } // Add note if exists


      if (tooltipData.note) {
        html += "<p><em>".concat(tooltipData.note, "</em></p>");
      }

      return html;
    }
  }]);

  return ProviderBase;
}(); // Export for use in other modules


window.ProviderBase = ProviderBase;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiaG9zdFJvdyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsInVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyIsInBvcHVwIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsIm9uIiwiYXR0ciIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJhY2NvcmRpb24iLCJ1cGRhdGVIb3N0c1RhYmxlVmlldyIsInNlbGYiLCJrZXlwcmVzcyIsImUiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwicHJldmVudERlZmF1bHQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiZmluZCIsInJlbW92ZUNsYXNzIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJzZXRUaW1lb3V0IiwiZm9ybSIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiJGljb24iLCJhZGRDbGFzcyIsImdlbmVyYXRlUGFzc3dvcmQiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsImxlbmd0aCIsIlBieEFwaSIsIlBhc3N3b3JkR2VuZXJhdGUiLCJwYXNzd29yZCIsInNob3ciLCJoaWRlIiwidmFsdWUiLCJ2YWxpZGF0aW9uIiwibWF0Y2giLCJ0cmFuc2l0aW9uIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsImFmdGVyIiwidmFsIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiYXJyQWRkaXRpb25hbEhvc3RzIiwiZWFjaCIsIl8iLCJvYmoiLCJwdXNoIiwiYWRkcmVzcyIsImFkZGl0aW9uYWxIb3N0cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbmxpbmUiLCJrZXlib2FyZFNob3J0Y3V0cyIsIm9uU3VjY2VzcyIsImV2ZW50IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInRvTG93ZXJDYXNlIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJpbml0aWFsaXplIiwiRXJyb3IiLCIkc2VjcmV0RmllbGQiLCJtZXNzYWdlS2V5IiwiJGluZm9NZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXBwZW5kIiwidG9vbHRpcERhdGEiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJmb3JFYWNoIiwiaXRlbSIsInRlcm0iLCJkZWZpbml0aW9uIiwiaSIsImxpc3ROYW1lIiwid2FybmluZyIsInRleHQiLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibGluZSIsImluZGV4IiwidHJpbSIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwic3BsaXQiLCJwYXJhbSIsIm5vdGUiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsWUFBWixFQUEwQjtBQUFBOztBQUN0QixTQUFLQSxZQUFMLEdBQW9CQSxZQUFwQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0JDLENB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QWhCLEVBQXNCO0FBQ2xCdEQsUUFBQUEsSUFBSSxxQkFBY2dDLFdBQVcsQ0FBQ3NCLElBQTFCLGNBQUo7QUFDSDs7QUFFRCxhQUFPdEQsSUFBUDtBQUNIOzs7O0tBR0w7OztBQUNBdUQsTUFBTSxDQUFDNUgsWUFBUCxHQUFzQkEsWUFBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3Jtc1xuICogQGNsYXNzIFByb3ZpZGVyQmFzZVxuICovXG5jbGFzcyBQcm92aWRlckJhc2UgeyBcbiAgICAvKiogIFxuICAgICAqIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFR5cGUgb2YgcHJvdmlkZXIgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gcHJvdmlkZXJUeXBlO1xuICAgICAgICB0aGlzLiRmb3JtT2JqID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpO1xuICAgICAgICB0aGlzLiRzZWNyZXQgPSAkKCcjc2VjcmV0Jyk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15ID0gJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15Jyk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducyA9ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIHRoaXMuJGRlbGV0ZVJvd0J1dHRvbiA9ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kZWxldGUtcm93LWJ1dHRvbicpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJCgnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcpO1xuICAgICAgICB0aGlzLmhvc3RSb3cgPSAnI3NhdmUtcHJvdmlkZXItZm9ybSAuaG9zdC1yb3cnO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICAgICAnZ20nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZVxuICAgICAgICB0aGlzLiRkZWxldGVSb3dCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgYWxsIHZhbGlkYXRpb24gZXJyb3IgcHJvbXB0cyB3aXRob3V0IGNsZWFyaW5nIGZpZWxkIHZhbHVlc1xuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZmluZCgnLnVpLmVycm9yLm1lc3NhZ2UnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgZm9yIGR5bmFtaWMgZmllbGRzXG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzZWxmLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3QgYXV0by1zdWJtaXQsIGp1c3QgY2hlY2sgaWYgZm9ybSBpcyB2YWxpZCB0byB1cGRhdGUgVUlcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZm9ybSgnaXMgdmFsaWQnKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlbGYuJHNlY3JldC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRzZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHNlbGYuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmQgdXNpbmcgUkVTVCBBUElcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKCkge1xuICAgICAgICAvLyBGb3IgSUFYIHVzZSBtb2RlcmF0ZSBwYXNzd29yZCBsZW5ndGggKDE2IGNoYXJzKSwgZm9yIFNJUCB1c2UgMTZcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gMTY7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgUGJ4QXBpLlBhc3N3b3JkR2VuZXJhdGUobGVuZ3RoLCAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBGb21hbnRpYyBVSSBGb3JtIEFQSVxuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnc2VjcmV0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiBhdHRyaWJ1dGVcbiAgICAgICAgICAgICQoJyNlbFNlY3JldCAudWkuYnV0dG9uLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBwYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGhvc3RzIHRhYmxlIHZpZXcgYmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIGFkZGl0aW9uYWwgaG9zdHNcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgaWYgKCQodGhpcy5ob3N0Um93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gY29tcGxldGluZyB0aGUgaG9zdCBhZGRyZXNzIGlucHV0XG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWRkaXRpb25hbC1ob3N0Jyk7XG5cbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cIiR7dmFsdWV9XCJdYCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gJCgnLmhvc3Qtcm93LXRwbCcpLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcy5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcy5ob3N0Um93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgY29uc3QgYXJyQWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQodGhpcy5ob3N0Um93KS5lYWNoKChfLCBvYmopID0+IHtcbiAgICAgICAgICAgIGlmICgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgYXJyQWRkaXRpb25hbEhvc3RzLnB1c2goeyBhZGRyZXNzOiAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gSlNPTi5zdHJpbmdpZnkoYXJyQWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybSgpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxlZCBieSBGb3JtIG1vZHVsZVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBhdXRvLXN1Ym1pdCBvbiB2YWxpZGF0aW9uXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSh7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgYXV0by1zdWJtaXQsIG9ubHkgc3VibWl0IHZpYSBidXR0b24gY2xpY2tcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS8ke3RoaXMucHJvdmlkZXJUeXBlLnRvTG93ZXJDYXNlKCl9YDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIC0gbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzXG4gICAgICogQGFic3RyYWN0XG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZ2V0VmFsaWRhdGVSdWxlcyBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgLSBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzZXNcbiAgICAgKiBAYWJzdHJhY3RcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3MnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG93IGluZm9ybWF0aW9uYWwgbWVzc2FnZSBhYm91dCBwYXNzd29yZCB1c2FnZSBpbiBcIm5vbmVcIiBtb2RlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFByb3ZpZGVyIHR5cGUgKHNpcCBvciBpYXgpXG4gICAgICovXG4gICAgc2hvd1Bhc3N3b3JkSW5mb01lc3NhZ2UocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIGNvbnN0ICRzZWNyZXRGaWVsZCA9IHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZUtleSA9IHByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyAncHJfUGFzc3dvcmRPcHRpb25hbEZvck5vbmVUeXBlJyA6ICdpYXhfUGFzc3dvcmRPcHRpb25hbEZvck5vbmVUeXBlJztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBpbmZvIG1lc3NhZ2VcbiAgICAgICAgJHNlY3JldEZpZWxkLmZpbmQoJy51aS5pbmZvLm1lc3NhZ2UnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBpbmZvIG1lc3NhZ2VcbiAgICAgICAgY29uc3QgJGluZm9NZXNzYWdlID0gJChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlW21lc3NhZ2VLZXldfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgJHNlY3JldEZpZWxkLmFwcGVuZCgkaW5mb01lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZGUgaW5mb3JtYXRpb25hbCBtZXNzYWdlIGFib3V0IHBhc3N3b3JkXG4gICAgICovXG4gICAgaGlkZVBhc3N3b3JkSW5mb01lc3NhZ2UoKSB7XG4gICAgICAgIHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwcyBmcm9tIHN0cnVjdHVyZWQgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICghdG9vbHRpcERhdGEpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmxpc3QgJiYgdG9vbHRpcERhdGEubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiwgbGlzdDMsIGV0Yy4pXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3ROYW1lID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0TmFtZV0gJiYgdG9vbHRpcERhdGFbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICB0b29sdGlwRGF0YVtsaXN0TmFtZV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3Ryb25nPiR7dG9vbHRpcERhdGEud2FybmluZy5oZWFkZXJ9Ojwvc3Ryb25nPiBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSB0b29sdGlwRGF0YS53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtOyBsaW5lLWhlaWdodDogMS40ZW07XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJvY2VzcyBleGFtcGxlcyB3aXRoIHN5bnRheCBoaWdobGlnaHRpbmcgZm9yIHNlY3Rpb25zXG4gICAgICAgICAgICB0b29sdGlwRGF0YS5leGFtcGxlcy5mb3JFYWNoKChsaW5lLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdbJykgJiYgbGluZS50cmltKCkuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwKSBodG1sICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMDA4NGI0OyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLmluY2x1ZGVzKCc9JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyYW1ldGVyIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgW3BhcmFtLCB2YWx1ZV0gPSBsaW5lLnNwbGl0KCc9JywgMik7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxcbjxzcGFuIHN0eWxlPVwiY29sb3I6ICM3YTNlOWQ7XCI+JHtwYXJhbX08L3NwYW4+PTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke3Rvb2x0aXBEYXRhLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUHJvdmlkZXJCYXNlID0gUHJvdmlkZXJCYXNlOyJdfQ==