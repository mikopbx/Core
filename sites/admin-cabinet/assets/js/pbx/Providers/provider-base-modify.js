"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, PasswordScore, i18n, ProvidersAPI */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  // Class constants for selectors
  // Class constants for values

  /**
   * Constructor
   * @param {string} providerType - Type of provider (SIP or IAX)
   */
  function ProviderBase(providerType) {
    _classCallCheck(this, ProviderBase);

    this.providerType = providerType; // Cache jQuery objects

    this.$formObj = $(ProviderBase.SELECTORS.FORM);
    this.$secret = $(ProviderBase.SELECTORS.SECRET);
    this.$checkBoxes = $(ProviderBase.SELECTORS.CHECKBOXES);
    this.$accordions = $(ProviderBase.SELECTORS.ACCORDIONS);
    this.$dropDowns = $(ProviderBase.SELECTORS.DROPDOWNS);
    this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
    this.$networkFilterId = $(ProviderBase.SELECTORS.NETWORK_FILTER_ID);
    this.$showHidePassword = $(ProviderBase.SELECTORS.SHOW_HIDE_PASSWORD);
    this.$generatePassword = $(ProviderBase.SELECTORS.GENERATE_PASSWORD);
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
    this.$clipboard = $(ProviderBase.SELECTORS.CLIPBOARD);
    this.$popuped = $(ProviderBase.SELECTORS.POPUPED); // Host input validation regex

    this.hostInputValidation = new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      var providerId = $('#id').val() || '';
      var currentDescription = this.$description.val() || ''; // Update header immediately for better UX

      this.updatePageHeader(currentDescription); // Show loading state

      this.showLoadingState(); // Load provider data from REST API

      ProvidersAPI.getRecord(providerId, this.providerType, function (response) {
        _this.hideLoadingState();

        if (response.result && response.data) {
          _this.populateFormData(response.data);
        } else if (providerId && providerId !== 'new') {
          UserMessage.showMultiString(response.messages);
        } // Continue with initialization


        _this.initializeUIComponents();

        _this.initializeEventHandlers();

        _this.initializeForm();

        _this.updateVisibilityElements(); // Initialize tooltip popups and clipboard


        _this.$popuped.popup();

        _this.initializeClipboard(); // Prevent browser password manager for generated passwords


        _this.$secret.on('focus', function () {
          _this.$secret.attr('autocomplete', 'new-password');
        });
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
      this.initializeAccordion(); // Initialize dynamic dropdowns

      this.initializeRegistrationTypeDropdown(); // Initialize network filter dropdown

      this.initializeNetworkFilterDropdown();
    }
    /**
     * Initialize registration type dropdown dynamically
     */

  }, {
    key: "initializeRegistrationTypeDropdown",
    value: function initializeRegistrationTypeDropdown() {
      var _this2 = this,
          _options$find;

      var $field = $('#registration_type');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('registration-type-dropdown')) {
          $existingDropdown.addClass('registration-type-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange(value) {
            _this2.updateVisibilityElements(); // Clear validation errors


            _this2.$formObj.find('.field').removeClass('error');

            _this2.$formObj.find('.ui.error.message').remove();

            _this2.$formObj.find('.prompt').remove(); // Update validation rules


            Form.validateRules = _this2.getValidateRules();
            Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || ProviderBase.DEFAULTS.REGISTRATION_TYPE;
      var isIAX = this.providerType === 'IAX'; // Build options based on provider type

      var options = [{
        value: 'outbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_OUTBOUND' : 'sip_REG_TYPE_OUTBOUND'] || 'Outbound'
      }, {
        value: 'inbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_INBOUND' : 'sip_REG_TYPE_INBOUND'] || 'Inbound'
      }, {
        value: 'none',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_NONE' : 'sip_REG_TYPE_NONE'] || 'None'
      }]; // Create dropdown HTML

      var dropdownHtml = "\n            <div class=\"ui selection dropdown registration-type-dropdown\">\n                <input type=\"hidden\" name=\"registration_type\" id=\"registration_type\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find === void 0 ? void 0 : _options$find.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        "); // Replace the field

      $field.replaceWith(dropdownHtml); // Initialize dropdown

      $('.registration-type-dropdown').dropdown({
        onChange: function onChange(value) {
          _this2.updateVisibilityElements(); // Clear validation errors


          _this2.$formObj.find('.field').removeClass('error');

          _this2.$formObj.find('.ui.error.message').remove();

          _this2.$formObj.find('.prompt').remove(); // Update validation rules


          Form.validateRules = _this2.getValidateRules();
          Form.dataChanged();
        }
      });
    }
    /**
     * Initialize accordion with callbacks
     */

  }, {
    key: "initializeAccordion",
    value: function initializeAccordion() {
      var self = this;
      this.$accordions.accordion({
        onOpen: function onOpen() {
          // Update field visibility when accordion opens
          setTimeout(function () {
            if (typeof self.updateVisibilityElements === 'function') {
              self.updateVisibilityElements();
            }
          }, 50);
        }
      });
    }
    /**
     * Initialize network filter dropdown with simplified logic
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      if (this.$networkFilterId.length === 0) return; // Get current value from data attribute (set by populateFormData) or form value or default

      var currentValue = this.$networkFilterId.data('value') || this.$networkFilterId.val() || ProviderBase.DEFAULTS.NETWORK_FILTER; // Initialize with NetworkFiltersAPI using simplified approach

      NetworkFiltersAPI.initializeDropdown(this.$networkFilterId, {
        currentValue: currentValue,
        providerType: this.providerType,
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize event handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this3 = this;

      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Initialize password strength indicator

      this.initializePasswordStrengthIndicator(); // Show/hide password toggle

      this.$showHidePassword.on('click', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var $icon = $button.find('i');

        if (_this3.$secret.attr('type') === 'password') {
          // Show password
          $icon.removeClass('eye').addClass('eye slash');

          _this3.$secret.attr('type', 'text');
        } else {
          // Hide password
          $icon.removeClass('eye slash').addClass('eye');

          _this3.$secret.attr('type', 'password');
        }
      }); // Generate new password

      this.$generatePassword.on('click', function (e) {
        e.preventDefault();

        _this3.generatePassword();
      });
    }
    /**
     * Initialize clipboard functionality
     */

  }, {
    key: "initializeClipboard",
    value: function initializeClipboard() {
      var clipboard = new ClipboardJS(ProviderBase.SELECTORS.CLIPBOARD);
      this.$clipboard.popup({
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
        UserMessage.showError(globalTranslate.pr_ErrorOnProviderSave);
      });
    }
    /**
     * Generate a new password
     */

  }, {
    key: "generatePassword",
    value: function generatePassword() {
      var _this4 = this;

      PbxApi.PasswordGenerate(ProviderBase.DEFAULTS.PASSWORD_LENGTH, function (password) {
        if (password) {
          _this4.$secret.val(password);

          _this4.$secret.trigger('change');

          Form.dataChanged();

          _this4.$clipboard.attr('data-clipboard-text', password); // Update password strength indicator


          var $passwordProgress = $('#password-strength-progress');

          if ($passwordProgress.length > 0 && typeof PasswordScore !== 'undefined') {
            PasswordScore.checkPassStrength({
              pass: password,
              bar: $passwordProgress,
              section: $passwordProgress
            });
          }
        }
      });
    }
    /**
     * Initialize password strength indicator
     */

  }, {
    key: "initializePasswordStrengthIndicator",
    value: function initializePasswordStrengthIndicator() {
      var _this5 = this;

      // Password strength indicator
      if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
        // Create progress bar for password strength if it doesn't exist
        var $passwordProgress = $('#password-strength-progress');

        if ($passwordProgress.length === 0) {
          var $secretField = this.$secret.closest('.field');
          $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
          $secretField.append($passwordProgress);
        } // Initialize Semantic UI progress component


        $passwordProgress.progress({
          percent: 0,
          showActivity: false
        }); // Update password strength on input

        this.$secret.on('input', function () {
          PasswordScore.checkPassStrength({
            pass: _this5.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        });
      }
    }
    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {// Override in child classes
    }
    /**
     * Show password tooltip icon when in 'none' registration mode
     */

  }, {
    key: "showPasswordTooltip",
    value: function showPasswordTooltip() {
      this.$passwordTooltipIcon.show();
    }
    /**
     * Hide password tooltip icon
     */

  }, {
    key: "hidePasswordTooltip",
    value: function hidePasswordTooltip() {
      this.$passwordTooltipIcon.hide();
    }
    /**
     * Get validation rules based on provider settings
     * This method should be overridden in child classes
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      // Override in child classes
      return {};
    }
    /**
     * Initialize form with validation and callbacks
     * Note: This method is overridden in provider-modify.js to configure REST API
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj; // URL is not set here - child classes configure REST API

      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize();
    }
    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified settings
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings; // IMPORTANT: Don't overwrite result.data - it already contains processed checkbox values from Form.js
      // We should only add or modify specific fields
      // If result.data is not defined (shouldn't happen), initialize it

      if (!result.data) {
        result.data = this.$formObj.form('get values');
      } // Network filter value is automatically handled by form serialization


      return result;
    }
    /**
     * Callback after form submission
     * @param {object} response - Server response
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {// Can be overridden in child classes
    }
    /**
     * Show loading state for the form
     */

  }, {
    key: "showLoadingState",
    value: function showLoadingState() {
      this.$formObj.addClass('loading');
    }
    /**
     * Hide loading state for the form
     */

  }, {
    key: "hideLoadingState",
    value: function hideLoadingState() {
      this.$formObj.removeClass('loading');
    }
    /**
     * Populate form with data from API
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Common fields
      if (data.id) {
        $('#id').val(data.id);
      }

      if (data.description) {
        this.$description.val(data.description); // Update page header with provider name and type

        this.updatePageHeader(data.description);
      }

      if (data.note) {
        $('#note').val(data.note);
      } // Store network filter value for later initialization


      var networkFilterValue = data.networkfilterid || ProviderBase.DEFAULTS.NETWORK_FILTER; // Common provider fields

      $('#username').val(data.username || '');
      this.$secret.val(data.secret || '');
      $('#host').val(data.host || '');
      $('#registration_type').val(data.registration_type || ProviderBase.DEFAULTS.REGISTRATION_TYPE); // Store value in data attribute since select is empty and can't hold value

      this.$networkFilterId.data('value', networkFilterValue);
      $('#manualattributes').val(data.manualattributes || ''); // Set default ports based on provider type

      if (this.providerType === 'SIP') {
        $('#port').val(data.port || ProviderBase.DEFAULTS.SIP_PORT);
      } else if (this.providerType === 'IAX') {
        $('#port').val(data.port || ProviderBase.DEFAULTS.IAX_PORT);
      } // Common checkboxes - handle both string '1' and boolean true


      if (data.qualify === '1' || data.qualify === true) $('#qualify').prop('checked', true);
      if (data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true) $('#receive_calls_without_auth').prop('checked', true);
      if (data.noregister === '1' || data.noregister === true) $('#noregister').prop('checked', true); // Disabled state

      if (data.disabled === '1' || data.disabled === true) {
        $('#disabled').val('1');
      }
    }
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     * @deprecated Use TooltipBuilder.buildContent() instead
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(tooltipData) {
      return TooltipBuilder.buildContent(tooltipData);
    }
    /**
     * Update page header with provider name and type
     * @param {string} providerName - Provider name
     */

  }, {
    key: "updatePageHeader",
    value: function updatePageHeader(providerName) {
      var providerTypeText = this.providerType === 'SIP' ? 'SIP' : 'IAX';
      var headerText;

      if (providerName && providerName.trim() !== '') {
        // Existing provider with name
        headerText = "".concat(providerName, " (").concat(providerTypeText, ")");
      } else {
        // New provider or no name
        var newProviderText = globalTranslate.pr_NewProvider || 'New Provider';
        headerText = "".concat(newProviderText, " (").concat(providerTypeText, ")");
      } // Update main header content


      $('h1 .content').text(headerText);
    }
  }]);

  return ProviderBase;
}();

_defineProperty(ProviderBase, "SELECTORS", {
  FORM: '#save-provider-form',
  SECRET: '#secret',
  CHECKBOXES: '#save-provider-form .checkbox',
  ACCORDIONS: '#save-provider-form .ui.accordion',
  DROPDOWNS: '#save-provider-form .ui.dropdown',
  DESCRIPTION: '#description',
  NETWORK_FILTER_ID: '#networkfilterid',
  SHOW_HIDE_PASSWORD: '#show-hide-password',
  GENERATE_PASSWORD: '#generate-new-password',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
  CLIPBOARD: '.clipboard',
  POPUPED: '.popuped'
});

_defineProperty(ProviderBase, "DEFAULTS", {
  SIP_PORT: '5060',
  IAX_PORT: '4569',
  PASSWORD_LENGTH: 16,
  QUALIFY_FREQ: '60',
  REGISTRATION_TYPE: 'outbound',
  DTMF_MODE: 'auto',
  TRANSPORT: 'UDP',
  NETWORK_FILTER: 'none'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZHJvcERvd25zIiwiRFJPUERPV05TIiwiJGRlc2NyaXB0aW9uIiwiREVTQ1JJUFRJT04iLCIkbmV0d29ya0ZpbHRlcklkIiwiTkVUV09SS19GSUxURVJfSUQiLCIkc2hvd0hpZGVQYXNzd29yZCIsIlNIT1dfSElERV9QQVNTV09SRCIsIiRnZW5lcmF0ZVBhc3N3b3JkIiwiR0VORVJBVEVfUEFTU1dPUkQiLCIkcGFzc3dvcmRUb29sdGlwSWNvbiIsIlBBU1NXT1JEX1RPT0xUSVBfSUNPTiIsIiRjbGlwYm9hcmQiLCJDTElQQk9BUkQiLCIkcG9wdXBlZCIsIlBPUFVQRUQiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiUmVnRXhwIiwicHJvdmlkZXJJZCIsInZhbCIsImN1cnJlbnREZXNjcmlwdGlvbiIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzaG93TG9hZGluZ1N0YXRlIiwiUHJvdmlkZXJzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybURhdGEiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVFdmVudEhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJvbiIsImF0dHIiLCJjaGVja2JveCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24iLCJpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duIiwiJGZpZWxkIiwibGVuZ3RoIiwiJGV4aXN0aW5nRHJvcGRvd24iLCJjbG9zZXN0IiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJmaW5kIiwicmVtb3ZlQ2xhc3MiLCJyZW1vdmUiLCJGb3JtIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJkYXRhQ2hhbmdlZCIsImN1cnJlbnRWYWx1ZSIsIkRFRkFVTFRTIiwiUkVHSVNUUkFUSU9OX1RZUEUiLCJpc0lBWCIsIm9wdGlvbnMiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZHJvcGRvd25IdG1sIiwibyIsIm1hcCIsIm9wdCIsImpvaW4iLCJyZXBsYWNlV2l0aCIsInNlbGYiLCJhY2NvcmRpb24iLCJvbk9wZW4iLCJzZXRUaW1lb3V0IiwiTkVUV09SS19GSUxURVIiLCJOZXR3b3JrRmlsdGVyc0FQSSIsImluaXRpYWxpemVEcm9wZG93biIsImluaXRpYWxpemVQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImdlbmVyYXRlUGFzc3dvcmQiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsInNob3dFcnJvciIsInByX0Vycm9yT25Qcm92aWRlclNhdmUiLCJQYnhBcGkiLCJQYXNzd29yZEdlbmVyYXRlIiwiUEFTU1dPUkRfTEVOR1RIIiwicGFzc3dvcmQiLCIkcGFzc3dvcmRQcm9ncmVzcyIsIlBhc3N3b3JkU2NvcmUiLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiJHNlY3JldEZpZWxkIiwiYXBwZW5kIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5Iiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJpZCIsImRlc2NyaXB0aW9uIiwibm90ZSIsIm5ldHdvcmtGaWx0ZXJWYWx1ZSIsIm5ldHdvcmtmaWx0ZXJpZCIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInJlZ2lzdHJhdGlvbl90eXBlIiwibWFudWFsYXR0cmlidXRlcyIsInBvcnQiLCJTSVBfUE9SVCIsIklBWF9QT1JUIiwicXVhbGlmeSIsInByb3AiLCJyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCIsIm5vcmVnaXN0ZXIiLCJkaXNhYmxlZCIsInRvb2x0aXBEYXRhIiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlclR5cGVUZXh0IiwiaGVhZGVyVGV4dCIsInRyaW0iLCJuZXdQcm92aWRlclRleHQiLCJwcl9OZXdQcm92aWRlciIsIlFVQUxJRllfRlJFUSIsIkRUTUZfTU9ERSIsIlRSQU5TUE9SVCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGO0FBZ0JBOztBQVlBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FEc0IsQ0FFdEI7O0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJDLElBQXhCLENBQWpCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkcsTUFBeEIsQ0FBaEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CTCxDQUFDLENB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QUEsaUJBQWlCLEVBQUUsd0JBVEo7QUFVZkUsRUFBQUEscUJBQXFCLEVBQUUsd0JBVlI7QUFXZkUsRUFBQUEsU0FBUyxFQUFFLFlBWEk7QUFZZkUsRUFBQUEsT0FBTyxFQUFFO0FBWk0sQzs7Z0JBRmpCM0IsWSxjQWtCZ0I7QUFDZDRJLEVBQUFBLFFBQVEsRUFBRSxNQURJO0FBRWRDLEVBQUFBLFFBQVEsRUFBRSxNQUZJO0FBR2RqQyxFQUFBQSxlQUFlLEVBQUUsRUFISDtBQUlkZ0QsRUFBQUEsWUFBWSxFQUFFLElBSkE7QUFLZGpGLEVBQUFBLGlCQUFpQixFQUFFLFVBTEw7QUFNZGtGLEVBQUFBLFNBQVMsRUFBRSxNQU5HO0FBT2RDLEVBQUFBLFNBQVMsRUFBRSxLQVBHO0FBUWRwRSxFQUFBQSxjQUFjLEVBQUU7QUFSRixDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIFRvb2x0aXBCdWlsZGVyLCBQYXNzd29yZFNjb3JlLCBpMThuLCBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgRFJPUERPV05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nLFxuICAgICAgICBERVNDUklQVElPTjogJyNkZXNjcmlwdGlvbicsXG4gICAgICAgIE5FVFdPUktfRklMVEVSX0lEOiAnI25ldHdvcmtmaWx0ZXJpZCcsXG4gICAgICAgIFNIT1dfSElERV9QQVNTV09SRDogJyNzaG93LWhpZGUtcGFzc3dvcmQnLFxuICAgICAgICBHRU5FUkFURV9QQVNTV09SRDogJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnLFxuICAgICAgICBQQVNTV09SRF9UT09MVElQX0lDT046ICcucGFzc3dvcmQtdG9vbHRpcC1pY29uJyxcbiAgICAgICAgQ0xJUEJPQVJEOiAnLmNsaXBib2FyZCcsXG4gICAgICAgIFBPUFVQRUQ6ICcucG9wdXBlZCdcbiAgICB9O1xuXG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciB2YWx1ZXNcbiAgICBzdGF0aWMgREVGQVVMVFMgPSB7XG4gICAgICAgIFNJUF9QT1JUOiAnNTA2MCcsXG4gICAgICAgIElBWF9QT1JUOiAnNDU2OScsXG4gICAgICAgIFBBU1NXT1JEX0xFTkdUSDogMTYsXG4gICAgICAgIFFVQUxJRllfRlJFUTogJzYwJyxcbiAgICAgICAgUkVHSVNUUkFUSU9OX1RZUEU6ICdvdXRib3VuZCcsXG4gICAgICAgIERUTUZfTU9ERTogJ2F1dG8nLFxuICAgICAgICBUUkFOU1BPUlQ6ICdVRFAnLFxuICAgICAgICBORVRXT1JLX0ZJTFRFUjogJ25vbmUnXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFR5cGUgb2YgcHJvdmlkZXIgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gcHJvdmlkZXJUeXBlO1xuICAgICAgICAvLyBDYWNoZSBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRmb3JtT2JqID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkZPUk0pO1xuICAgICAgICB0aGlzLiRzZWNyZXQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuU0VDUkVUKTtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5DSEVDS0JPWEVTKTtcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5BQ0NPUkRJT05TKTtcbiAgICAgICAgdGhpcy4kZHJvcERvd25zID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkRST1BET1dOUyk7XG4gICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkRFU0NSSVBUSU9OKTtcbiAgICAgICAgdGhpcy4kbmV0d29ya0ZpbHRlcklkID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLk5FVFdPUktfRklMVEVSX0lEKTtcbiAgICAgICAgdGhpcy4kc2hvd0hpZGVQYXNzd29yZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5TSE9XX0hJREVfUEFTU1dPUkQpO1xuICAgICAgICB0aGlzLiRnZW5lcmF0ZVBhc3N3b3JkID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkdFTkVSQVRFX1BBU1NXT1JEKTtcbiAgICAgICAgdGhpcy4kcGFzc3dvcmRUb29sdGlwSWNvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QQVNTV09SRF9UT09MVElQX0lDT04pO1xuICAgICAgICB0aGlzLiRjbGlwYm9hcmQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0xJUEJPQVJEKTtcbiAgICAgICAgdGhpcy4kcG9wdXBlZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QT1BVUEVEKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgaW5wdXQgdmFsaWRhdGlvbiByZWdleFxuICAgICAgICB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24gPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgICAgICsgJyhcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKSdcbiAgICAgICAgICAgICsgJyhcXFxcLyhcXGR8WzEtMl1cXGR8M1swLTJdKSk/J1xuICAgICAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgICAgICdnbSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50RGVzY3JpcHRpb24gPSB0aGlzLiRkZXNjcmlwdGlvbi52YWwoKSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW1tZWRpYXRlbHkgZm9yIGJldHRlciBVWFxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudERlc2NyaXB0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRSZWNvcmQocHJvdmlkZXJJZCwgdGhpcy5wcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXJJZCAmJiBwcm92aWRlcklkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnRpbnVlIHdpdGggaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHBvcHVwcyBhbmQgY2xpcGJvYXJkXG4gICAgICAgICAgICB0aGlzLiRwb3B1cGVkLnBvcHVwKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVBY2NvcmRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHluYW1pYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bigpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIGR5bmFtaWNhbGx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygncmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcudWkuZXJyb3IubWVzc2FnZScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5wcm9tcHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5SRUdJU1RSQVRJT05fVFlQRTtcbiAgICAgICAgY29uc3QgaXNJQVggPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBvcHRpb25zIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdvdXRib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfT1VUQk9VTkQnIDogJ3NpcF9SRUdfVFlQRV9PVVRCT1VORCddIHx8ICdPdXRib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJvdW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9JTkJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfSU5CT1VORCddIHx8ICdJbmJvdW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ25vbmUnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX05PTkUnIDogJ3NpcF9SRUdfVFlQRV9OT05FJ10gfHwgJ05vbmUnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gcmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJyZWdpc3RyYXRpb25fdHlwZVwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgZmllbGRcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgICQoJy5yZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzXG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIHNpbXBsaWZpZWQgbG9naWNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKCkge1xuICAgICAgICBpZiAodGhpcy4kbmV0d29ya0ZpbHRlcklkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgZnJvbSBkYXRhIGF0dHJpYnV0ZSAoc2V0IGJ5IHBvcHVsYXRlRm9ybURhdGEpIG9yIGZvcm0gdmFsdWUgb3IgZGVmYXVsdFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSB0aGlzLiRuZXR3b3JrRmlsdGVySWQuZGF0YSgndmFsdWUnKSB8fCB0aGlzLiRuZXR3b3JrRmlsdGVySWQudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLk5FVFdPUktfRklMVEVSO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIE5ldHdvcmtGaWx0ZXJzQVBJIHVzaW5nIHNpbXBsaWZpZWQgYXBwcm9hY2hcbiAgICAgICAgTmV0d29ya0ZpbHRlcnNBUEkuaW5pdGlhbGl6ZURyb3Bkb3duKHRoaXMuJG5ldHdvcmtGaWx0ZXJJZCwge1xuICAgICAgICAgICAgY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiB0aGlzLnByb3ZpZGVyVHlwZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpO1xuICAgICAgICBcblxuICAgICAgICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgIHRoaXMuJHNob3dIaWRlUGFzc3dvcmQub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRidXR0b24uZmluZCgnaScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy4kc2VjcmV0LmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkXG4gICAgICAgIHRoaXMuJGdlbmVyYXRlUGFzc3dvcmQub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0xJUEJPQVJEKTtcbiAgICAgICAgdGhpcy4kY2xpcGJvYXJkLnBvcHVwKHtcbiAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnByX0Vycm9yT25Qcm92aWRlclNhdmUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBwYXNzd29yZFxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoKSB7XG4gICAgICAgIFBieEFwaS5QYXNzd29yZEdlbmVyYXRlKFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5QQVNTV09SRF9MRU5HVEgsIChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LnZhbChwYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRjbGlwYm9hcmQuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID4gMCAmJiB0eXBlb2YgUGFzc3dvcmRTY29yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXNzOiBwYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhcjogJHBhc3N3b3JkUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCkge1xuICAgICAgICAvLyBQYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwICYmIHR5cGVvZiBQYXNzd29yZFNjb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHByb2dyZXNzIGJhciBmb3IgcGFzc3dvcmQgc3RyZW5ndGggaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgbGV0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHNlY3JldEZpZWxkID0gdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzID0gJCgnPGRpdiBjbGFzcz1cInVpIHRpbnkgcHJvZ3Jlc3NcIiBpZD1cInBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzXCI+PGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRzZWNyZXRGaWVsZC5hcHBlbmQoJHBhc3N3b3JkUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHByb2dyZXNzIGNvbXBvbmVudFxuICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IDAsXG4gICAgICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBzdHJlbmd0aCBvbiBpbnB1dFxuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLmhpZGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvbiBhbmQgY2FsbGJhY2tzXG4gICAgICogTm90ZTogVGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBpbiBwcm92aWRlci1tb2RpZnkuanMgdG8gY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICAvLyBVUkwgaXMgbm90IHNldCBoZXJlIC0gY2hpbGQgY2xhc3NlcyBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlcyBmcm9tIEZvcm0uanNcbiAgICAgICAgLy8gV2Ugc2hvdWxkIG9ubHkgYWRkIG9yIG1vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHJlc3VsdC5kYXRhIGlzIG5vdCBkZWZpbmVkIChzaG91bGRuJ3QgaGFwcGVuKSwgaW5pdGlhbGl6ZSBpdFxuICAgICAgICBpZiAoIXJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB2YWx1ZSBpcyBhdXRvbWF0aWNhbGx5IGhhbmRsZWQgYnkgZm9ybSBzZXJpYWxpemF0aW9uXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgfVxuXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgJCgnI2lkJykudmFsKGRhdGEuaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi52YWwoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubm90ZSkge1xuICAgICAgICAgICAgJCgnI25vdGUnKS52YWwoZGF0YS5ub3RlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbmV0d29yayBmaWx0ZXIgdmFsdWUgZm9yIGxhdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJWYWx1ZSA9IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5ORVRXT1JLX0ZJTFRFUjtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBwcm92aWRlciBmaWVsZHNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykudmFsKGRhdGEudXNlcm5hbWUgfHwgJycpO1xuICAgICAgICB0aGlzLiRzZWNyZXQudmFsKGRhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgJCgnI2hvc3QnKS52YWwoZGF0YS5ob3N0IHx8ICcnKTtcbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlJFR0lTVFJBVElPTl9UWVBFKTtcbiAgICAgICAgLy8gU3RvcmUgdmFsdWUgaW4gZGF0YSBhdHRyaWJ1dGUgc2luY2Ugc2VsZWN0IGlzIGVtcHR5IGFuZCBjYW4ndCBob2xkIHZhbHVlXG4gICAgICAgIHRoaXMuJG5ldHdvcmtGaWx0ZXJJZC5kYXRhKCd2YWx1ZScsIG5ldHdvcmtGaWx0ZXJWYWx1ZSk7XG4gICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0cyBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgICQoJyNwb3J0JykudmFsKGRhdGEucG9ydCB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuU0lQX1BPUlQpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5JQVhfUE9SVCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBjaGVja2JveGVzIC0gaGFuZGxlIGJvdGggc3RyaW5nICcxJyBhbmQgYm9vbGVhbiB0cnVlXG4gICAgICAgIGlmIChkYXRhLnF1YWxpZnkgPT09ICcxJyB8fCBkYXRhLnF1YWxpZnkgPT09IHRydWUpICQoJyNxdWFsaWZ5JykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICBpZiAoZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gJzEnIHx8IGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09IHRydWUpICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgaWYgKGRhdGEubm9yZWdpc3RlciA9PT0gJzEnIHx8IGRhdGEubm9yZWdpc3RlciA9PT0gdHJ1ZSkgJCgnI25vcmVnaXN0ZXInKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlZCBzdGF0ZVxuICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoJyNkaXNhYmxlZCcpLnZhbCgnMScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwcyBmcm9tIHN0cnVjdHVyZWQgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgcmV0dXJuIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWUgYW5kIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJOYW1lIC0gUHJvdmlkZXIgbmFtZVxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VIZWFkZXIocHJvdmlkZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyVHlwZVRleHQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcgPyAnU0lQJyA6ICdJQVgnO1xuICAgICAgICBsZXQgaGVhZGVyVGV4dDtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm92aWRlck5hbWUgJiYgcHJvdmlkZXJOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIHByb3ZpZGVyIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke3Byb3ZpZGVyTmFtZX0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5ldyBwcm92aWRlciBvciBubyBuYW1lXG4gICAgICAgICAgICBjb25zdCBuZXdQcm92aWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfTmV3UHJvdmlkZXIgfHwgJ05ldyBQcm92aWRlcic7XG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7bmV3UHJvdmlkZXJUZXh0fSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgbWFpbiBoZWFkZXIgY29udGVudFxuICAgICAgICAkKCdoMSAuY29udGVudCcpLnRleHQoaGVhZGVyVGV4dCk7XG4gICAgfVxufSJdfQ==