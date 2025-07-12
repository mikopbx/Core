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
        examples: ['language = ru', 'codecpriority = host', 'trunktimestamps = yes', 'trunk = yes'],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCIkIiwiY2hlY2tib3giLCJpc1ZhbGlkIiwiJGZvcm1PYmoiLCJmb3JtIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCIkd2FybmluZ01lc3NhZ2UiLCJuZXh0IiwiJGNoZWNrYm94SW5wdXQiLCJ1cGRhdGVXYXJuaW5nU3RhdGUiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJvblVuY2hlY2tlZCIsIiRzZWNyZXQiLCJsZW5ndGgiLCJQYXNzd29yZFNjb3JlIiwiJHBhc3N3b3JkUHJvZ3Jlc3MiLCIkc2VjcmV0RmllbGQiLCJjbG9zZXN0IiwiYXBwZW5kIiwib24iLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJ2YWwiLCJiYXIiLCJzZWN0aW9uIiwiJHBvcnRGaWVsZCIsImZpbmQiLCIkbGFiZWwiLCJzaG93IiwiaGlkZSIsImZpZWxkTmFtZSIsImF0dHIiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImJpbmQiLCJyZWdpc3RyYXRpb25UeXBlRGF0YSIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsInJlY2VpdmVDYWxsc0RhdGEiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjIiwid2FybmluZyIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzYyIsIm5ldHdvcmtGaWx0ZXJEYXRhIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlciIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2MiLCJwcm92aWRlckhvc3REYXRhIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZSIsIm5vdGUiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicG9ydERhdGEiLCJpYXhfUG9ydFRvb2x0aXBfaGVhZGVyIiwiaWF4X1BvcnRUb29sdGlwX2Rlc2MiLCJpYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCIsImlheF9Qb3J0VG9vbHRpcF9pbmZvIiwiaWF4X1BvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRGF0YSIsImkxOG4iLCJleGFtcGxlc0hlYWRlciIsImV4YW1wbGVzIiwidG9vbHRpcENvbmZpZ3MiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiZWFjaCIsIl8iLCJlbGVtZW50IiwiJGljb24iLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwiaHRtbCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJ2YXJpYXRpb24iLCJyZWdUeXBlIiwiZ2V0T3V0Ym91bmRSdWxlcyIsImdldEluYm91bmRSdWxlcyIsImdldE5vbmVSdWxlcyIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0Iiwib3B0aW9uYWwiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsInJlY2VpdmVXaXRob3V0QXV0aCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiZWxIb3N0IiwiZWxVc2VybmFtZSIsImVsU2VjcmV0IiwiZWxQb3J0IiwiZWxSZWNlaXZlQ2FsbHMiLCJlbE5ldHdvcmtGaWx0ZXIiLCJlbFVuaXFJZCIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCJ2YWxQb3J0IiwidmFsUXVhbGlmeSIsImNvcHlCdXR0b24iLCJzaG93SGlkZUJ1dHRvbiIsImxhYmVsSG9zdFRleHQiLCJsYWJlbFBvcnRUZXh0IiwibGFiZWxVc2VybmFtZVRleHQiLCJsYWJlbFNlY3JldFRleHQiLCJyZW1vdmVBdHRyIiwiaGlkZVBhc3N3b3JkSW5mb01lc3NhZ2UiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1Byb3ZpZGVyUG9ydCIsInByX1Byb3ZpZGVyTG9naW4iLCJwcl9Qcm92aWRlclBhc3N3b3JkIiwidHJpbSIsImdlbmVyYXRlUGFzc3dvcmQiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJwcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIiwicHJfQXV0aGVudGljYXRpb25QYXNzd29yZCIsInNob3dQYXNzd29yZEluZm9NZXNzYWdlIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwiUHJvdmlkZXJCYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSIsInByb3ZpZGVyIiwiaW5pdGlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRix5QkFBYztBQUFBOztBQUFBLDZCQUNKLEtBREk7QUFFYjtBQUVEO0FBQ0o7QUFDQTs7Ozs7V0FDSSxzQkFBYTtBQUFBOztBQUNULGtGQURTLENBR1Q7OztBQUNBLFdBQUtDLDJCQUFMO0FBQ0EsV0FBS0MsNEJBQUwsR0FMUyxDQU9UOztBQUNBQyxNQUFB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TUFBTSxDQUFDcEgsUUFBUCxDQUFnQixVQUFoQjtBQUNBa0gsUUFBQUEsVUFBVSxDQUFDbEgsUUFBWCxDQUFvQixVQUFwQjtBQUNBbUgsUUFBQUEsUUFBUSxDQUFDcEgsV0FBVCxDQUFxQixVQUFyQixFQWhCMkIsQ0FnQk87QUFFbEM7O0FBQ0F5SCxRQUFBQSxXQUFXLENBQUNuRyxJQUFaO0FBQ0F3RyxRQUFBQSxVQUFVLENBQUN4RyxJQUFYO0FBQ0F5RyxRQUFBQSxjQUFjLENBQUMxRyxJQUFmLEdBckIyQixDQXVCM0I7O0FBQ0EyRyxRQUFBQSxhQUFhLENBQUNqRixJQUFkLENBQW1CakIsZUFBZSxDQUFDa0gsc0JBQWhCLElBQTBDLGNBQTdEO0FBQ0FmLFFBQUFBLGFBQWEsQ0FBQ2xGLElBQWQsQ0FBbUJqQixlQUFlLENBQUNtSCxXQUFoQixJQUErQixXQUFsRDtBQUNBZixRQUFBQSxpQkFBaUIsQ0FBQ25GLElBQWxCLENBQXVCakIsZUFBZSxDQUFDb0gsZUFBaEIsSUFBbUMsZUFBMUQ7QUFDQWYsUUFBQUEsZUFBZSxDQUFDcEYsSUFBaEIsQ0FBcUJqQixlQUFlLENBQUNxSCxlQUFoQixJQUFtQyxlQUF4RCxFQTNCMkIsQ0E2QjNCOztBQUNBLFlBQUl2QixPQUFPLENBQUM3RyxHQUFSLE9BQWtCLEVBQWxCLElBQXdCNkcsT0FBTyxDQUFDN0csR0FBUixPQUFrQixHQUE5QyxFQUFtRDtBQUMvQzZHLFVBQUFBLE9BQU8sQ0FBQzdHLEdBQVIsQ0FBWSxNQUFaO0FBQ0g7QUFDSjtBQUNKOzs7O0VBN2pCcUJxSSxZLEdBZ2tCMUI7OztBQUNBakssQ0FBQyxDQUFDa0ssUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSXZLLFdBQUosRUFBakI7QUFDQXVLLEVBQUFBLFFBQVEsQ0FBQ0MsVUFBVDtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFBhc3N3b3JkU2NvcmUgKi9cblxuLyoqXG4gKiBJQVggcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJJQVhcbiAqL1xuY2xhc3MgUHJvdmlkZXJJQVggZXh0ZW5kcyBQcm92aWRlckJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKCkgeyBcbiAgICAgICAgc3VwZXIoJ0lBWCcpOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBKdXN0IGNoZWNrIGlmIGZpZWxkIGlzIHZhbGlkIHdpdGhvdXQgdHJpZ2dlcmluZyBzdWJtaXRcbiAgICAgICAgICAgIGNvbnN0IGlzVmFsaWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2lzIHZhbGlkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2UgaGFuZGxpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIGNvbnN0ICR3YXJuaW5nTWVzc2FnZSA9ICQoJyNlbFJlY2VpdmVDYWxscycpLm5leHQoJy53YXJuaW5nLm1lc3NhZ2UnKTtcbiAgICAgICAgY29uc3QgJGNoZWNrYm94SW5wdXQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSB3YXJuaW5nIG1lc3NhZ2Ugc3RhdGVcbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlV2FybmluZ1N0YXRlKCkge1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveElucHV0LnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2FybmluZyBzdGF0ZVxuICAgICAgICB1cGRhdGVXYXJuaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveCBjaGFuZ2VzXG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS50cmFuc2l0aW9uKCdmYWRlIG91dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZlZWRiYWNrXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIGlubGluZSB2YWxpZGF0aW9uIGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXR0aW5nJywgJ2lubGluZScsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICAgIGlmICh0aGlzLiRzZWNyZXQubGVuZ3RoID4gMCAmJiB0eXBlb2YgUGFzc3dvcmRTY29yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBiYXIgZm9yIHBhc3N3b3JkIHN0cmVuZ3RoIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIGxldCAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJyNwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzZWNyZXRGaWVsZCA9IHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJzxkaXYgY2xhc3M9XCJ1aSB0aW55IHByb2dyZXNzXCIgaWQ9XCJwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzc1wiPjxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkc2VjcmV0RmllbGQuYXBwZW5kKCRwYXNzd29yZFByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoIG9uIGlucHV0XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiB0aGlzLiRzZWNyZXQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJHBhc3N3b3JkUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICRwYXNzd29yZFByb2dyZXNzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlbHBlciB0ZXh0IGZvciBJQVgtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBpZiAoJHBvcnRGaWVsZC5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRwb3J0RmllbGQuYXBwZW5kKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgbGFiZWxcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+RGVmYXVsdCBJQVggcG9ydCBpcyA0NTY5PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgcG9ydCBoZWxwZXIgb24gZm9jdXNcbiAgICAgICAgJCgnI3BvcnQnKS5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJyk7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS52YWwoKSA9PT0gJycgfHwgJCh0aGlzKS52YWwoKSA9PT0gJzQ1NjknKSB7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uIGJsdXIgZm9yIGltbWVkaWF0ZSBmZWVkYmFja1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwicGFzc3dvcmRcIl0nKS5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lICYmIHZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkgeyBcbiAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBuZXR3b3JrRmlsdGVyRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwcm92aWRlckhvc3REYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV91c2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvcnREYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfaW5mb1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG1hbnVhbEF0dHJpYnV0ZXNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyJyksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MnKSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcicpLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnbGFuZ3VhZ2UgPSBydScsXG4gICAgICAgICAgICAgICAgJ2NvZGVjcHJpb3JpdHkgPSBob3N0JyxcbiAgICAgICAgICAgICAgICAndHJ1bmt0aW1lc3RhbXBzID0geWVzJyxcbiAgICAgICAgICAgICAgICAndHJ1bmsgPSB5ZXMnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyJyksXG4gICAgICAgICAgICAgICAgdGV4dDogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmcnKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgJ3JlZ2lzdHJhdGlvbl90eXBlJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHJlZ2lzdHJhdGlvblR5cGVEYXRhKSxcbiAgICAgICAgICAgICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChyZWNlaXZlQ2FsbHNEYXRhKSxcbiAgICAgICAgICAgICduZXR3b3JrX2ZpbHRlcic6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChuZXR3b3JrRmlsdGVyRGF0YSksXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChwcm92aWRlckhvc3REYXRhKSxcbiAgICAgICAgICAgICdpYXhfcG9ydCc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChwb3J0RGF0YSksXG4gICAgICAgICAgICAnbWFudWFsX2F0dHJpYnV0ZXMnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQobWFudWFsQXR0cmlidXRlc0RhdGEpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBlYWNoIGZpZWxkIHdpdGggaW5mbyBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChfLCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHJlZ1R5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ291dGJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdpbmJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vbmVSdWxlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWNlaXZlV2l0aG91dEF1dGggPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VjcmV0IGlzIG9wdGlvbmFsIGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIGNoZWNrZWRcbiAgICAgICAgaWYgKCFyZWNlaXZlV2l0aG91dEF1dGgpIHtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyk7XG5cbiAgICAgICAgY29uc3QgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdmFsU2VjcmV0ID0gdGhpcy4kc2VjcmV0O1xuICAgICAgICBjb25zdCB2YWxQb3J0ID0gJCgnI3BvcnQnKTtcbiAgICAgICAgY29uc3QgdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIGNvbnN0IGNvcHlCdXR0b24gPSAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgY29uc3Qgc2hvd0hpZGVCdXR0b24gPSAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhYmVsIHRleHQgZWxlbWVudHNcbiAgICAgICAgY29uc3QgbGFiZWxIb3N0VGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsUG9ydFRleHQgPSAkKCcjcG9ydExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFVzZXJuYW1lVGV4dCA9ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFNlY3JldFRleHQgPSAkKCcjc2VjcmV0TGFiZWxUZXh0Jyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGlmICh2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgdmFsUXVhbGlmeS52YWwoJzEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQgaW5mbyBtZXNzYWdlc1xuICAgICAgICB0aGlzLmhpZGVQYXNzd29yZEluZm9NZXNzYWdlKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuaGlkZSgpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnbm9uZScpOyAvLyBSZXNldCB0byBkZWZhdWx0XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5oaWRlKCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBpbmJvdW5kIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdCBmb3IgaGlkZGVuIHBvcnQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGhvc3QgdmFsaWRhdGlvbiBlcnJvciBzaW5jZSBpdCdzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBhbGwgYnV0dG9ucyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWxTZWNyZXQudmFsKCkpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTsgXG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBjcml0aWNhbCBmb3Igbm9uZSB0eXBlIChubyBhdXRoKVxuXG4gICAgICAgICAgICAvLyBTaG93IGluZm9ybWF0aW9uYWwgbWVzc2FnZSBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkSW5mb01lc3NhZ2UoJ2lheCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnNcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBub25lIChwZWVyLXRvLXBlZXIpXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxQb3J0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==