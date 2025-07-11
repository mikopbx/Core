"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, PasswordScore */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
var ProviderIAX = /*#__PURE__*/function (_ProviderBase) {
  _inherits(ProviderIAX, _ProviderBase);

  var _super = _createSuper(ProviderIAX);

  function ProviderIAX() {
    _classCallCheck(this, ProviderIAX);

    return _super.call(this, 'IAX');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderIAX, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      _get(_getPrototypeOf(ProviderIAX.prototype), "initialize", this).call(this); // IAX-specific initialization


      this.initializeIaxWarningMessage();
      this.initializeRealtimeValidation(); // Re-validate form when receive_calls_without_auth changes

      $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function () {
        // Just check if field is valid without triggering submit
        var isValid = _this.$formObj.form('is valid', 'secret');

        if (!isValid) {
          _this.$formObj.form('validate field', 'secret');
        } // Mark form as changed


        Form.dataChanged();
      }); // Initialize field help tooltips

      this.initializeFieldTooltips();
    }
    /**
     * Initialize IAX warning message handling
     */

  }, {
    key: "initializeIaxWarningMessage",
    value: function initializeIaxWarningMessage() {
      var $warningMessage = $('#elReceiveCalls').next('.warning.message');
      var $checkboxInput = $('#receive_calls_without_auth'); // Function to update warning message state

      function updateWarningState() {
        if ($checkboxInput.prop('checked')) {
          $warningMessage.removeClass('hidden');
        } else {
          $warningMessage.addClass('hidden');
        }
      } // Initialize warning state


      updateWarningState(); // Handle checkbox changes

      $('#receive_calls_without_auth.checkbox').checkbox({
        onChecked: function onChecked() {
          $warningMessage.removeClass('hidden').transition('fade in');
        },
        onUnchecked: function onUnchecked() {
          $warningMessage.transition('fade out', function () {
            $warningMessage.addClass('hidden');
          });
        }
      });
    }
    /**
     * Initialize real-time validation feedback
     */

  }, {
    key: "initializeRealtimeValidation",
    value: function initializeRealtimeValidation() {
      var _this2 = this;

      // Enable inline validation for better UX
      this.$formObj.form('setting', 'inline', true); // Password strength indicator

      if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
        // Create progress bar for password strength if it doesn't exist
        var $passwordProgress = $('#password-strength-progress');

        if ($passwordProgress.length === 0) {
          var $secretField = this.$secret.closest('.field');
          $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
          $secretField.append($passwordProgress);
        } // Update password strength on input


        this.$secret.on('input', function () {
          PasswordScore.checkPassStrength({
            pass: _this2.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        });
      } // Add helper text for IAX-specific fields


      var $portField = $('#port').closest('.field');

      if ($portField.find('.ui.pointing.label').length === 0) {
        $portField.append('<div class="ui pointing label" style="display: none;">Default IAX port is 4569</div>');
      } // Show port helper on focus


      $('#port').on('focus', function () {
        var $label = $(this).closest('.field').find('.ui.pointing.label');

        if ($(this).val() === '' || $(this).val() === '4569') {
          $label.show();
        }
      }).on('blur', function () {
        $(this).closest('.field').find('.ui.pointing.label').hide();
      }); // Validate on blur for immediate feedback

      this.$formObj.find('input[type="text"], input[type="password"]').on('blur', function () {
        var fieldName = $(this).attr('name');
        var validateRules = this.getValidateRules();

        if (fieldName && validateRules[fieldName]) {
          this.$formObj.form('validate field', fieldName);
        }
      }.bind(this));
    }
    /**
     * Initialize field help tooltips
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      // Build tooltip data structures
      var registrationTypeData = {
        header: globalTranslate.iax_RegistrationTypeTooltip_header,
        list: [{
          term: globalTranslate.iax_RegistrationTypeTooltip_outbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_inbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_none,
          definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc
        }]
      };
      var receiveCallsData = {
        header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_header,
        description: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_desc,
        warning: {
          header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning_header,
          text: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning
        },
        list: [{
          term: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application,
          definition: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application_desc
        }]
      };
      var networkFilterData = {
        header: globalTranslate.iax_NetworkFilterTooltip_header,
        description: globalTranslate.iax_NetworkFilterTooltip_desc,
        list: [{
          term: globalTranslate.iax_NetworkFilterTooltip_inbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_outbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_none,
          definition: globalTranslate.iax_NetworkFilterTooltip_none_desc
        }]
      };
      var providerHostData = {
        header: globalTranslate.iax_ProviderHostTooltip_header,
        description: globalTranslate.iax_ProviderHostTooltip_desc,
        list: [globalTranslate.iax_ProviderHostTooltip_format_ip, globalTranslate.iax_ProviderHostTooltip_format_domain, globalTranslate.iax_ProviderHostTooltip_outbound_use, globalTranslate.iax_ProviderHostTooltip_none_use],
        note: globalTranslate.iax_ProviderHostTooltip_note
      };
      var portData = {
        header: globalTranslate.iax_PortTooltip_header,
        description: globalTranslate.iax_PortTooltip_desc,
        list: [globalTranslate.iax_PortTooltip_default, globalTranslate.iax_PortTooltip_info],
        note: globalTranslate.iax_PortTooltip_note
      };
      var manualAttributesData = {
        header: i18n('iax_ManualAttributesTooltip_header'),
        description: i18n('iax_ManualAttributesTooltip_desc'),
        list: [{
          term: i18n('iax_ManualAttributesTooltip_format'),
          definition: null
        }],
        examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
        examples: [
          'language = ru',
          'codecpriority = host',
          'trunktimestamps = yes',
          'trunk = yes'
        ],
        warning: {
          header: i18n('iax_ManualAttributesTooltip_warning_header'),
          text: i18n('iax_ManualAttributesTooltip_warning')
        }
      };
      var tooltipConfigs = {
        'registration_type': this.buildTooltipContent(registrationTypeData),
        'receive_calls_without_auth': this.buildTooltipContent(receiveCallsData),
        'network_filter': this.buildTooltipContent(networkFilterData),
        'provider_host': this.buildTooltipContent(providerHostData),
        'iax_port': this.buildTooltipContent(portData),
        'manual_attributes': this.buildTooltipContent(manualAttributesData)
      }; // Initialize tooltips for each field with info icon

      $('.field-info-icon').each(function (_, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var content = tooltipConfigs[fieldName];

        if (content) {
          $icon.popup({
            html: content,
            position: 'top right',
            hoverable: true,
            delay: {
              show: 300,
              hide: 100
            },
            variation: 'flowing'
          });
        }
      });
    }
    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var regType = $('#registration_type').val();

      switch (regType) {
        case 'outbound':
          return this.getOutboundRules();

        case 'inbound':
          return this.getInboundRules();

        case 'none':
          return this.getNoneRules();

        default:
          return this.getOutboundRules();
      }
    }
    /**
     * Get validation rules for outbound registration
     */

  }, {
    key: "getOutboundRules",
    value: function getOutboundRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        },
        secret: {
          identifier: 'secret',
          optional: true,
          rules: []
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        }
      };
    }
    /**
     * Get validation rules for inbound registration
     */

  }, {
    key: "getInboundRules",
    value: function getInboundRules() {
      var receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');
      var rules = {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        }
      }; // Secret is optional if receive_calls_without_auth is checked

      if (!receiveWithoutAuth) {
        rules.secret = {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }, {
            type: 'minLength[8]',
            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
          }]
        };
      } else {
        rules.secret = {
          identifier: 'secret',
          optional: true,
          rules: []
        };
      }

      return rules;
    }
    /**
     * Get validation rules for none registration
     */

  }, {
    key: "getNoneRules",
    value: function getNoneRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        },
        secret: {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }]
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        }
      };
    }
    /**
     * Update the visibility of elements based on the registration type
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {
      // Get element references
      var elHost = $('#elHost');
      var elUsername = $('#elUsername');
      var elSecret = $('#elSecret');
      var elPort = $('#elPort');
      var elReceiveCalls = $('#elReceiveCalls');
      var elNetworkFilter = $('#elNetworkFilter');
      var regType = $('#registration_type').val();
      var elUniqId = $('#uniqid');
      var genPassword = $('#generate-new-password');
      var valUserName = $('#username');
      var valSecret = this.$secret;
      var valPort = $('#port');
      var valQualify = $('#qualify');
      var copyButton = $('#elSecret .button.clipboard');
      var showHideButton = $('#show-hide-password'); // Get label text elements

      var labelHostText = $('#hostLabelText');
      var labelPortText = $('#portLabelText');
      var labelUsernameText = $('#usernameLabelText');
      var labelSecretText = $('#secretLabelText'); // Always enable qualify for IAX (NAT keepalive)

      if (valQualify.length > 0) {
        valQualify.prop('checked', true);
        valQualify.val('1');
      }

      valUserName.removeAttr('readonly'); // Hide any existing password info messages

      this.hidePasswordInfoMessage(); // Update element visibility based on registration type

      if (regType === 'outbound') {
        // OUTBOUND: We register to provider
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.hide();
        elNetworkFilter.hide(); // Network filter not relevant for outbound

        $('#networkfilterid').val('none'); // Reset to default
        // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Hide generate and copy buttons for outbound

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Update labels for outbound

        labelHostText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        labelPortText.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        labelUsernameText.text(globalTranslate.pr_ProviderLogin || 'Login');
        labelSecretText.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        valUserName.val(elUniqId.val());
        valUserName.attr('readonly', ''); // Auto-generate password for inbound registration if empty

        if (valSecret.val().trim() === '') {
          this.generatePassword();
        }

        elHost.show();
        elPort.hide();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter critical for inbound security
        // Remove validation prompt for hidden port field

        this.$formObj.form('remove prompt', 'port'); // Update required fields

        elHost.removeClass('required');
        elPort.removeClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Remove host validation error since it's optional for inbound

        this.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error'); // Show all buttons for inbound

        genPassword.show();
        copyButton.show();
        showHideButton.show();
        copyButton.attr('data-clipboard-text', valSecret.val()); // Update labels for inbound

        labelHostText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
        labelUsernameText.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        labelSecretText.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
      } else if (regType === 'none') {
        // NONE: Static peer-to-peer connection
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter critical for none type (no auth)
        // Show informational message for password field

        this.showPasswordInfoMessage('iax'); // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.removeClass('required'); // Password is optional in none mode
        // Hide generate and copy buttons

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Update labels for none (peer-to-peer)

        labelHostText.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        labelPortText.text(globalTranslate.pr_PeerPort || 'Peer Port');
        labelUsernameText.text(globalTranslate.pr_PeerUsername || 'Peer Username');
        labelSecretText.text(globalTranslate.pr_PeerPassword || 'Peer Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      }
    }
  }]);

  return ProviderIAX;
}(ProviderBase); // Initialize on document ready


$(document).ready(function () {
  var provider = new ProviderIAX();
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCIkIiwiY2hlY2tib3giLCJpc1ZhbGlkIiwiJGZvcm1PYmoiLCJmb3JtIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCIkd2FybmluZ01lc3NhZ2UiLCJuZXh0IiwiJGNoZWNrYm94SW5wdXQiLCJ1cGRhdGVXYXJuaW5nU3RhdGUiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJvblVuY2hlY2tlZCIsIiRzZWNyZXQiLCJsZW5ndGgiLCJQYXNzd29yZFNjb3JlIiwiJHBhc3N3b3JkUHJvZ3Jlc3MiLCIkc2VjcmV0RmllbGQiLCJjbG9zZXN0IiwiYXBwZW5kIiwib24iLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJ2YWwiLCJiYXIiLCJzZWN0aW9uIiwiJHBvcnRGaWVsZCIsImZpbmQiLCIkbGFiZWwiLCJzaG93IiwiaGlkZSIsImZpZWxkTmFtZSIsImF0dHIiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImJpbmQiLCJyZWdpc3RyYXRpb25UeXBlRGF0YSIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsInJlY2VpdmVDYWxsc0RhdGEiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjIiwid2FybmluZyIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzYyIsIm5ldHdvcmtGaWx0ZXJEYXRhIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlciIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2MiLCJwcm92aWRlckhvc3REYXRhIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZSIsIm5vdGUiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicG9ydERhdGEiLCJpYXhfUG9ydFRvb2x0aXBfaGVhZGVyIiwiaWF4X1BvcnRUb29sdGlwX2Rlc2MiLCJpYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCIsImlheF9Qb3J0VG9vbHRpcF9pbmZvIiwiaWF4X1BvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRXhhbXBsZXMiLCJpMThuIiwibWFudWFsQXR0cmlidXRlc0RhdGEiLCJleGFtcGxlc0hlYWRlciIsImV4YW1wbGVzIiwic3BsaXQiLCJ0b29sdGlwQ29uZmlncyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJlYWNoIiwiXyIsImVsZW1lbnQiLCIkaWNvbiIsImRhdGEiLCJjb250ZW50IiwicG9wdXAiLCJodG1sIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInZhcmlhdGlvbiIsInJlZ1R5cGUiLCJnZXRPdXRib3VuZFJ1bGVzIiwiZ2V0SW5ib3VuZFJ1bGVzIiwiZ2V0Tm9uZVJ1bGVzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwiaG9zdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicmVjZWl2ZVdpdGhvdXRBdXRoIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJlbEhvc3QiLCJlbFVzZXJuYW1lIiwiZWxTZWNyZXQiLCJlbFBvcnQiLCJlbFJlY2VpdmVDYWxscyIsImVsTmV0d29ya0ZpbHRlciIsImVsVW5pcUlkIiwiZ2VuUGFzc3dvcmQiLCJ2YWxVc2VyTmFtZSIsInZhbFNlY3JldCIsInZhbFBvcnQiLCJ2YWxRdWFsaWZ5IiwiY29weUJ1dHRvbiIsInNob3dIaWRlQnV0dG9uIiwibGFiZWxIb3N0VGV4dCIsImxhYmVsUG9ydFRleHQiLCJsYWJlbFVzZXJuYW1lVGV4dCIsImxhYmVsU2VjcmV0VGV4dCIsInJlbW92ZUF0dHIiLCJoaWRlUGFzc3dvcmRJbmZvTWVzc2FnZSIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJ0cmltIiwiZ2VuZXJhdGVQYXNzd29yZCIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUiLCJwcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIiwic2hvd1Bhc3N3b3JkSW5mb01lc3NhZ2UiLCJwcl9QZWVySG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclBvcnQiLCJwcl9QZWVyVXNlcm5hbWUiLCJwcl9QZWVyUGFzc3dvcmQiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiLCJpbml0aWFsaXplIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS0MsMkJBQUw7QUFD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LFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQYXNzd29yZFNjb3JlICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLXZhbGlkYXRlIGZvcm0gd2hlbiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBjaGFuZ2VzXG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KCdzZXR0aW5nJywgJ29uQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gSnVzdCBjaGVjayBpZiBmaWVsZCBpcyB2YWxpZCB3aXRob3V0IHRyaWdnZXJpbmcgc3VibWl0XG4gICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdpcyB2YWxpZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIGlmICghaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBJQVggd2FybmluZyBtZXNzYWdlIGhhbmRsaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCAkd2FybmluZ01lc3NhZ2UgPSAkKCcjZWxSZWNlaXZlQ2FsbHMnKS5uZXh0KCcud2FybmluZy5tZXNzYWdlJyk7XG4gICAgICAgIGNvbnN0ICRjaGVja2JveElucHV0ID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGdW5jdGlvbiB0byB1cGRhdGUgd2FybmluZyBtZXNzYWdlIHN0YXRlXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpIHtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3hJbnB1dC5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdhcm5pbmcgc3RhdGVcbiAgICAgICAgdXBkYXRlV2FybmluZ1N0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3ggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJykudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWFsLXRpbWUgdmFsaWRhdGlvbiBmZWVkYmFja1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSBpbmxpbmUgdmFsaWRhdGlvbiBmb3IgYmV0dGVyIFVYXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0dGluZycsICdpbmxpbmUnLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyIGZvciBwYXNzd29yZCBzdHJlbmd0aCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICBsZXQgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkc2VjcmV0RmllbGQgPSB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCc8ZGl2IGNsYXNzPVwidWkgdGlueSBwcm9ncmVzc1wiIGlkPVwicGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3NcIj48ZGl2IGNsYXNzPVwiYmFyXCI+PC9kaXY+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgJHNlY3JldEZpZWxkLmFwcGVuZCgkcGFzc3dvcmRQcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBzdHJlbmd0aCBvbiBpbnB1dFxuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWxwZXIgdGV4dCBmb3IgSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgaWYgKCRwb3J0RmllbGQuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkcG9ydEZpZWxkLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIGxhYmVsXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPkRlZmF1bHQgSUFYIHBvcnQgaXMgNDU2OTwvZGl2PicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHBvcnQgaGVscGVyIG9uIGZvY3VzXG4gICAgICAgICQoJyNwb3J0Jykub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpO1xuICAgICAgICAgICAgaWYgKCQodGhpcykudmFsKCkgPT09ICcnIHx8ICQodGhpcykudmFsKCkgPT09ICc0NTY5Jykge1xuICAgICAgICAgICAgICAgICRsYWJlbC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBvbiBibHVyIGZvciBpbW1lZGlhdGUgZmVlZGJhY2tcbiAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cInBhc3N3b3JkXCJdJykub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICQodGhpcykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiB2YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHsgXG4gICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgZGF0YSBzdHJ1Y3R1cmVzXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblR5cGVEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbmV0d29ya0ZpbHRlckRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcHJvdmlkZXJIb3N0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfdXNlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3J0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2luZm9cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBtYW51YWxBdHRyaWJ1dGVzRXhhbXBsZXMgPSBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXMnKTtcbiAgICAgICAgY29uc3QgbWFudWFsQXR0cmlidXRlc0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXInKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYycpLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCcpLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyJyksXG4gICAgICAgICAgICBleGFtcGxlczogbWFudWFsQXR0cmlidXRlc0V4YW1wbGVzID8gbWFudWFsQXR0cmlidXRlc0V4YW1wbGVzLnNwbGl0KCdcXG4nKSA6IFtdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyJyksXG4gICAgICAgICAgICAgICAgdGV4dDogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmcnKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgJ3JlZ2lzdHJhdGlvbl90eXBlJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHJlZ2lzdHJhdGlvblR5cGVEYXRhKSxcbiAgICAgICAgICAgICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChyZWNlaXZlQ2FsbHNEYXRhKSxcbiAgICAgICAgICAgICduZXR3b3JrX2ZpbHRlcic6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChuZXR3b3JrRmlsdGVyRGF0YSksXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChwcm92aWRlckhvc3REYXRhKSxcbiAgICAgICAgICAgICdpYXhfcG9ydCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChwb3J0RGF0YSksXG4gICAgICAgICAgICAnbWFudWFsX2F0dHJpYnV0ZXMnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQobWFudWFsQXR0cmlidXRlc0RhdGEpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBlYWNoIGZpZWxkIHdpdGggaW5mbyBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChfLCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHJlZ1R5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ291dGJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdpbmJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vbmVSdWxlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWNlaXZlV2l0aG91dEF1dGggPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VjcmV0IGlzIG9wdGlvbmFsIGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIGNoZWNrZWRcbiAgICAgICAgaWYgKCFyZWNlaXZlV2l0aG91dEF1dGgpIHtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyk7XG5cbiAgICAgICAgY29uc3QgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdmFsU2VjcmV0ID0gdGhpcy4kc2VjcmV0O1xuICAgICAgICBjb25zdCB2YWxQb3J0ID0gJCgnI3BvcnQnKTtcbiAgICAgICAgY29uc3QgdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIGNvbnN0IGNvcHlCdXR0b24gPSAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgY29uc3Qgc2hvd0hpZGVCdXR0b24gPSAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhYmVsIHRleHQgZWxlbWVudHNcbiAgICAgICAgY29uc3QgbGFiZWxIb3N0VGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsUG9ydFRleHQgPSAkKCcjcG9ydExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFVzZXJuYW1lVGV4dCA9ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFNlY3JldFRleHQgPSAkKCcjc2VjcmV0TGFiZWxUZXh0Jyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGlmICh2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgdmFsUXVhbGlmeS52YWwoJzEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQgaW5mbyBtZXNzYWdlc1xuICAgICAgICB0aGlzLmhpZGVQYXNzd29yZEluZm9NZXNzYWdlKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuaGlkZSgpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnbm9uZScpOyAvLyBSZXNldCB0byBkZWZhdWx0XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5oaWRlKCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBpbmJvdW5kIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdCBmb3IgaGlkZGVuIHBvcnQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGhvc3QgdmFsaWRhdGlvbiBlcnJvciBzaW5jZSBpdCdzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBhbGwgYnV0dG9ucyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWxTZWNyZXQudmFsKCkpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTsgXG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBjcml0aWNhbCBmb3Igbm9uZSB0eXBlIChubyBhdXRoKVxuXG4gICAgICAgICAgICAvLyBTaG93IGluZm9ybWF0aW9uYWwgbWVzc2FnZSBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkSW5mb01lc3NhZ2UoJ2lheCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnNcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBub25lIChwZWVyLXRvLXBlZXIpXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxQb3J0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==