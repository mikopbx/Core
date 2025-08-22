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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, PasswordWidget */

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
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
    this.$popuped = $(ProviderBase.SELECTORS.POPUPED); // Track if this is a new provider (not existing in database)

    this.isNewProvider = false; // Host input validation regex

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
      var currentDescription = this.$description.val() || ''; // Determine if this is a new provider
      // New providers have empty ID or 'new' as ID in the URL

      this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Update header immediately for better UX

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

        _this.updateVisibilityElements(); // Initialize tooltip popups


        _this.$popuped.popup(); // Prevent browser password manager for generated passwords


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
      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Initialize password widget

      this.initializePasswordWidget();
    }
    /**
     * Initialize password widget with default configuration
     */

  }, {
    key: "initializePasswordWidget",
    value: function initializePasswordWidget() {
      // Initialize the password widget with default configuration
      if (this.$secret.length > 0) {
        // Hide legacy HTML buttons - PasswordWidget will manage its own buttons
        $('.clipboard').hide();
        $('#show-hide-password').hide(); // Default configuration for providers - will be updated based on registration type

        var widget = PasswordWidget.init(this.$secret, {
          validation: PasswordWidget.VALIDATION.SOFT,
          generateButton: true,
          showPasswordButton: true,
          // Will be updated based on registration type
          clipboardButton: true,
          // Keep copy button for all modes
          showStrengthBar: true,
          showWarnings: true,
          validateOnInput: true,
          checkOnLoad: false,
          // Don't validate on load, let updateVisibilityElements handle it
          minScore: 60,
          generateLength: 32 // Provider passwords should be 32 chars for better security

        }); // Store widget instance for later use

        this.passwordWidget = widget; // Update visibility elements now that widget is initialized
        // This will apply the correct configuration based on registration type

        if (typeof this.updateVisibilityElements === 'function') {
          this.updateVisibilityElements();
        }
      }
    }
    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {// Override in child classes to configure PasswordWidget based on registration type
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
      // These checkboxes use standard HTML checkbox behavior


      $('#qualify').prop('checked', data.qualify === '1' || data.qualify === true);
      $('#receive_calls_without_auth').prop('checked', data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true);
      $('#noregister').prop('checked', data.noregister === '1' || data.noregister === true); // Disabled state - this is a hidden field, not a checkbox

      $('#disabled').val(data.disabled ? '1' : '0');
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
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZHJvcERvd25zIiwiRFJPUERPV05TIiwiJGRlc2NyaXB0aW9uIiwiREVTQ1JJUFRJT04iLCIkbmV0d29ya0ZpbHRlcklkIiwiTkVUV09SS19GSUxURVJfSUQiLCIkcGFzc3dvcmRUb29sdGlwSWNvbiIsIlBBU1NXT1JEX1RPT0xUSVBfSUNPTiIsIiRwb3B1cGVkIiwiUE9QVVBFRCIsImlzTmV3UHJvdmlkZXIiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiUmVnRXhwIiwicHJvdmlkZXJJZCIsInZhbCIsImN1cnJlbnREZXNjcmlwdGlvbiIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzaG93TG9hZGluZ1N0YXRlIiwiUHJvdmlkZXJzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybURhdGEiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVFdmVudEhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsIm9uIiwiYXR0ciIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJpbml0aWFsaXplQWNjb3JkaW9uIiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93biIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCIkZmllbGQiLCJsZW5ndGgiLCIkZXhpc3RpbmdEcm9wZG93biIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsImFkZENsYXNzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsImZpbmQiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImRhdGFDaGFuZ2VkIiwiY3VycmVudFZhbHVlIiwiREVGQVVMVFMiLCJSRUdJU1RSQVRJT05fVFlQRSIsImlzSUFYIiwib3B0aW9ucyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJkcm9wZG93bkh0bWwiLCJvIiwibWFwIiwib3B0Iiwiam9pbiIsInJlcGxhY2VXaXRoIiwic2VsZiIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJORVRXT1JLX0ZJTFRFUiIsIk5ldHdvcmtGaWx0ZXJzQVBJIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiaGlkZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwicGFzc3dvcmRXaWRnZXQiLCJzaG93IiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJpbml0aWFsaXplIiwic2V0dGluZ3MiLCJmb3JtIiwiaWQiLCJkZXNjcmlwdGlvbiIsIm5vdGUiLCJuZXR3b3JrRmlsdGVyVmFsdWUiLCJuZXR3b3JrZmlsdGVyaWQiLCJ1c2VybmFtZSIsInNlY3JldCIsImhvc3QiLCJyZWdpc3RyYXRpb25fdHlwZSIsIm1hbnVhbGF0dHJpYnV0ZXMiLCJwb3J0IiwiU0lQX1BPUlQiLCJJQVhfUE9SVCIsInByb3AiLCJxdWFsaWZ5IiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJub3JlZ2lzdGVyIiwiZGlzYWJsZWQiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJUeXBlVGV4dCIsImhlYWRlclRleHQiLCJ0cmltIiwibmV3UHJvdmlkZXJUZXh0IiwicHJfTmV3UHJvdmlkZXIiLCJQQVNTV09SRF9MRU5HVEgiLCJRVUFMSUZZX0ZSRVEiLCJEVE1GX01PREUiLCJUUkFOU1BPUlQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFk7QUFDRjtBQWFBOztBQVlBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FEc0IsQ0FFdEI7O0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJDLElBQXhCLENBQWpCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkcsTUFBeEIsQ0FBaEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CTCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkssVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CUCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1Qk8sVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCVCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlMsU0FBeEIsQ0FBbkI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CWCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1Qlcs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QUFzQitELFVBQXRCO0FBQ0g7Ozs7OztnQkFwYkN2SSxZLGVBRWlCO0FBQ2ZLLEVBQUFBLElBQUksRUFBRSxxQkFEUztBQUVmRSxFQUFBQSxNQUFNLEVBQUUsU0FGTztBQUdmRSxFQUFBQSxVQUFVLEVBQUUsK0JBSEc7QUFJZkUsRUFBQUEsVUFBVSxFQUFFLG1DQUpHO0FBS2ZFLEVBQUFBLFNBQVMsRUFBRSxrQ0FMSTtBQU1mRSxFQUFBQSxXQUFXLEVBQUUsY0FORTtBQU9mRSxFQUFBQSxpQkFBaUIsRUFBRSxrQkFQSjtBQVFmRSxFQUFBQSxxQkFBcUIsRUFBRSx3QkFSUjtBQVNmRSxFQUFBQSxPQUFPLEVBQUU7QUFUTSxDOztnQkFGakJyQixZLGNBZWdCO0FBQ2QySCxFQUFBQSxRQUFRLEVBQUUsTUFESTtBQUVkQyxFQUFBQSxRQUFRLEVBQUUsTUFGSTtBQUdkZSxFQUFBQSxlQUFlLEVBQUUsRUFISDtBQUlkQyxFQUFBQSxZQUFZLEVBQUUsSUFKQTtBQUtkdkUsRUFBQUEsaUJBQWlCLEVBQUUsVUFMTDtBQU1kd0UsRUFBQUEsU0FBUyxFQUFFLE1BTkc7QUFPZEMsRUFBQUEsU0FBUyxFQUFFLEtBUEc7QUFRZDFELEVBQUFBLGNBQWMsRUFBRTtBQVJGLEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIENsaXBib2FyZEpTLCBOZXR3b3JrRmlsdGVyc0FQSSwgVG9vbHRpcEJ1aWxkZXIsIFBhc3N3b3JkU2NvcmUsIGkxOG4sIFByb3ZpZGVyc0FQSSwgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgRFJPUERPV05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nLFxuICAgICAgICBERVNDUklQVElPTjogJyNkZXNjcmlwdGlvbicsXG4gICAgICAgIE5FVFdPUktfRklMVEVSX0lEOiAnI25ldHdvcmtmaWx0ZXJpZCcsXG4gICAgICAgIFBBU1NXT1JEX1RPT0xUSVBfSUNPTjogJy5wYXNzd29yZC10b29sdGlwLWljb24nLFxuICAgICAgICBQT1BVUEVEOiAnLnBvcHVwZWQnXG4gICAgfTtcblxuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3IgdmFsdWVzXG4gICAgc3RhdGljIERFRkFVTFRTID0ge1xuICAgICAgICBTSVBfUE9SVDogJzUwNjAnLFxuICAgICAgICBJQVhfUE9SVDogJzQ1NjknLFxuICAgICAgICBQQVNTV09SRF9MRU5HVEg6IDE2LFxuICAgICAgICBRVUFMSUZZX0ZSRVE6ICc2MCcsXG4gICAgICAgIFJFR0lTVFJBVElPTl9UWVBFOiAnb3V0Ym91bmQnLFxuICAgICAgICBEVE1GX01PREU6ICdhdXRvJyxcbiAgICAgICAgVFJBTlNQT1JUOiAnVURQJyxcbiAgICAgICAgTkVUV09SS19GSUxURVI6ICdub25lJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5GT1JNKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlNFQ1JFVCk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0hFQ0tCT1hFUyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQUNDT1JESU9OUyk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5EUk9QRE9XTlMpO1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ERVNDUklQVElPTik7XG4gICAgICAgIHRoaXMuJG5ldHdvcmtGaWx0ZXJJZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ORVRXT1JLX0ZJTFRFUl9JRCk7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUEFTU1dPUkRfVE9PTFRJUF9JQ09OKTtcbiAgICAgICAgdGhpcy4kcG9wdXBlZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QT1BVUEVEKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXIgKG5vdCBleGlzdGluZyBpbiBkYXRhYmFzZSlcbiAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBIb3N0IGlucHV0IHZhbGlkYXRpb24gcmVnZXhcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICAgICAnZ20nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgY3VycmVudERlc2NyaXB0aW9uID0gdGhpcy4kZGVzY3JpcHRpb24udmFsKCkgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlclxuICAgICAgICAvLyBOZXcgcHJvdmlkZXJzIGhhdmUgZW1wdHkgSUQgb3IgJ25ldycgYXMgSUQgaW4gdGhlIFVSTFxuICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSAhcHJvdmlkZXJJZCB8fCBwcm92aWRlcklkID09PSAnJyB8fCBwcm92aWRlcklkID09PSAnbmV3JztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW1tZWRpYXRlbHkgZm9yIGJldHRlciBVWFxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudERlc2NyaXB0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRSZWNvcmQocHJvdmlkZXJJZCwgdGhpcy5wcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXJJZCAmJiBwcm92aWRlcklkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnRpbnVlIHdpdGggaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHBvcHVwc1xuICAgICAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdmb2N1cycsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkeW5hbWljIGRyb3Bkb3duc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gZHluYW1pY2FsbHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3JlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlJFR0lTVFJBVElPTl9UWVBFO1xuICAgICAgICBjb25zdCBpc0lBWCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnSUFYJztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIG9wdGlvbnMgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ291dGJvdW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9PVVRCT1VORCcgOiAnc2lwX1JFR19UWVBFX09VVEJPVU5EJ10gfHwgJ091dGJvdW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luYm91bmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX0lOQk9VTkQnIDogJ3NpcF9SRUdfVFlQRV9JTkJPVU5EJ10gfHwgJ0luYm91bmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnbm9uZScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfTk9ORScgOiAnc2lwX1JFR19UWVBFX05PTkUnXSB8fCAnTm9uZScgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIEhUTUxcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biByZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInJlZ2lzdHJhdGlvbl90eXBlXCIgaWQ9XCJyZWdpc3RyYXRpb25fdHlwZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj4ke29wdC50ZXh0fTwvZGl2PmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXBsYWNlIHRoZSBmaWVsZFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgJCgnLnJlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnVpLmVycm9yLm1lc3NhZ2UnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5wcm9tcHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFjY29yZGlvbiB3aXRoIGNhbGxiYWNrc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2NvcmRpb24oKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zLmFjY29yZGlvbih7XG4gICAgICAgICAgICBvbk9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IHdoZW4gYWNjb3JkaW9uIG9wZW5zXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggc2ltcGxpZmllZCBsb2dpY1xuICAgICAqL1xuICAgIGluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKSB7XG4gICAgICAgIGlmICh0aGlzLiRuZXR3b3JrRmlsdGVySWQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBmcm9tIGRhdGEgYXR0cmlidXRlIChzZXQgYnkgcG9wdWxhdGVGb3JtRGF0YSkgb3IgZm9ybSB2YWx1ZSBvciBkZWZhdWx0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IHRoaXMuJG5ldHdvcmtGaWx0ZXJJZC5kYXRhKCd2YWx1ZScpIHx8IHRoaXMuJG5ldHdvcmtGaWx0ZXJJZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuTkVUV09SS19GSUxURVI7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggTmV0d29ya0ZpbHRlcnNBUEkgdXNpbmcgc2ltcGxpZmllZCBhcHByb2FjaFxuICAgICAgICBOZXR3b3JrRmlsdGVyc0FQSS5pbml0aWFsaXplRHJvcGRvd24odGhpcy4kbmV0d29ya0ZpbHRlcklkLCB7XG4gICAgICAgICAgICBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBwcm92aWRlclR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciB3aGVuIHByb3ZpZGVyIG5hbWUgY2hhbmdlc1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICB0aGlzLmluaXRpYWxpemVQYXNzd29yZFdpZGdldCgpO1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHBhc3N3b3JkIHdpZGdldCB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEhpZGUgbGVnYWN5IEhUTUwgYnV0dG9ucyAtIFBhc3N3b3JkV2lkZ2V0IHdpbGwgbWFuYWdlIGl0cyBvd24gYnV0dG9uc1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgcHJvdmlkZXJzIC0gd2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KHRoaXMuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBXaWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gS2VlcCBjb3B5IGJ1dHRvbiBmb3IgYWxsIG1vZGVzXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IGZhbHNlLCAvLyBEb24ndCB2YWxpZGF0ZSBvbiBsb2FkLCBsZXQgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIgLy8gUHJvdmlkZXIgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IGVsZW1lbnRzIG5vdyB0aGF0IHdpZGdldCBpcyBpbml0aWFsaXplZFxuICAgICAgICAgICAgLy8gVGhpcyB3aWxsIGFwcGx5IHRoZSBjb3JyZWN0IGNvbmZpZ3VyYXRpb24gYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzIHRvIGNvbmZpZ3VyZSBQYXNzd29yZFdpZGdldCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHBhc3N3b3JkIHRvb2x0aXAgaWNvbiB3aGVuIGluICdub25lJyByZWdpc3RyYXRpb24gbW9kZVxuICAgICAqL1xuICAgIHNob3dQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uaGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uIGFuZCBjYWxsYmFja3NcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBvdmVycmlkZGVuIGluIHByb3ZpZGVyLW1vZGlmeS5qcyB0byBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIC8vIFVSTCBpcyBub3Qgc2V0IGhlcmUgLSBjaGlsZCBjbGFzc2VzIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzIGZyb20gRm9ybS5qc1xuICAgICAgICAvLyBXZSBzaG91bGQgb25seSBhZGQgb3IgbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgcmVzdWx0LmRhdGEgaXMgbm90IGRlZmluZWQgKHNob3VsZG4ndCBoYXBwZW4pLCBpbml0aWFsaXplIGl0XG4gICAgICAgIGlmICghcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIHZhbHVlIGlzIGF1dG9tYXRpY2FsbHkgaGFuZGxlZCBieSBmb3JtIHNlcmlhbGl6YXRpb25cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBDb21tb24gZmllbGRzXG4gICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAkKCcjaWQnKS52YWwoZGF0YS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uLnZhbChkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWUgYW5kIHR5cGVcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5ub3RlKSB7XG4gICAgICAgICAgICAkKCcjbm90ZScpLnZhbChkYXRhLm5vdGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBuZXR3b3JrIGZpbHRlciB2YWx1ZSBmb3IgbGF0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgY29uc3QgbmV0d29ya0ZpbHRlclZhbHVlID0gZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLk5FVFdPUktfRklMVEVSO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHByb3ZpZGVyIGZpZWxkc1xuICAgICAgICAkKCcjdXNlcm5hbWUnKS52YWwoZGF0YS51c2VybmFtZSB8fCAnJyk7XG4gICAgICAgIHRoaXMuJHNlY3JldC52YWwoZGF0YS5zZWNyZXQgfHwgJycpO1xuICAgICAgICAkKCcjaG9zdCcpLnZhbChkYXRhLmhvc3QgfHwgJycpO1xuICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuUkVHSVNUUkFUSU9OX1RZUEUpO1xuICAgICAgICAvLyBTdG9yZSB2YWx1ZSBpbiBkYXRhIGF0dHJpYnV0ZSBzaW5jZSBzZWxlY3QgaXMgZW1wdHkgYW5kIGNhbid0IGhvbGQgdmFsdWVcbiAgICAgICAgdGhpcy4kbmV0d29ya0ZpbHRlcklkLmRhdGEoJ3ZhbHVlJywgbmV0d29ya0ZpbHRlclZhbHVlKTtcbiAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnRzIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5TSVBfUE9SVCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLnZhbChkYXRhLnBvcnQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLklBWF9QT1JUKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIGNoZWNrYm94ZXMgLSBoYW5kbGUgYm90aCBzdHJpbmcgJzEnIGFuZCBib29sZWFuIHRydWVcbiAgICAgICAgLy8gVGhlc2UgY2hlY2tib3hlcyB1c2Ugc3RhbmRhcmQgSFRNTCBjaGVja2JveCBiZWhhdmlvclxuICAgICAgICAkKCcjcXVhbGlmeScpLnByb3AoJ2NoZWNrZWQnLCBkYXRhLnF1YWxpZnkgPT09ICcxJyB8fCBkYXRhLnF1YWxpZnkgPT09IHRydWUpO1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5wcm9wKCdjaGVja2VkJywgZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gJzEnIHx8IGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09IHRydWUpO1xuICAgICAgICAkKCcjbm9yZWdpc3RlcicpLnByb3AoJ2NoZWNrZWQnLCBkYXRhLm5vcmVnaXN0ZXIgPT09ICcxJyB8fCBkYXRhLm5vcmVnaXN0ZXIgPT09IHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZWQgc3RhdGUgLSB0aGlzIGlzIGEgaGlkZGVuIGZpZWxkLCBub3QgYSBjaGVja2JveFxuICAgICAgICAkKCcjZGlzYWJsZWQnKS52YWwoZGF0YS5kaXNhYmxlZCA/ICcxJyA6ICcwJyk7XG4gICAgfVxuXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwcyBmcm9tIHN0cnVjdHVyZWQgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgcmV0dXJuIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWUgYW5kIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJOYW1lIC0gUHJvdmlkZXIgbmFtZVxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VIZWFkZXIocHJvdmlkZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyVHlwZVRleHQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcgPyAnU0lQJyA6ICdJQVgnO1xuICAgICAgICBsZXQgaGVhZGVyVGV4dDtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm92aWRlck5hbWUgJiYgcHJvdmlkZXJOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIHByb3ZpZGVyIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke3Byb3ZpZGVyTmFtZX0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5ldyBwcm92aWRlciBvciBubyBuYW1lXG4gICAgICAgICAgICBjb25zdCBuZXdQcm92aWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfTmV3UHJvdmlkZXIgfHwgJ05ldyBQcm92aWRlcic7XG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7bmV3UHJvdmlkZXJUZXh0fSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgbWFpbiBoZWFkZXIgY29udGVudFxuICAgICAgICAkKCdoMSAuY29udGVudCcpLnRleHQoaGVhZGVyVGV4dCk7XG4gICAgfVxufSJdfQ==