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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, DynamicDropdownBuilder, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI, PasswordWidget */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  // Class constants for selectors

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
    this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
    this.$popuped = $(ProviderBase.SELECTORS.POPUPED); // Track if this is a new provider (not existing in database)

    this.isNewProvider = false; // Track if form is fully initialized

    this.formInitialized = false; // Host input validation regex

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
      var currentDescription = this.$description.val() || ''; // Check for copy mode from URL parameter or hidden field

      var copyFromId = $('#copy-from-id').val();
      var urlParams = new URLSearchParams(window.location.search);
      var copyParam = urlParams.get('copy');
      this.isCopyMode = false; // Save as class property
      // Select appropriate API client based on provider type

      var apiClient;

      if (this.providerType === 'SIP') {
        apiClient = SipProvidersAPI;
      } else if (this.providerType === 'IAX') {
        apiClient = IaxProvidersAPI;
      } else {
        apiClient = ProvidersAPI;
      } // Show loading state


      this.showLoadingState();

      if (copyParam || copyFromId) {
        // Copy mode - use the new RESTful copy endpoint
        var sourceId = copyParam || copyFromId;
        this.isCopyMode = true;
        this.isNewProvider = true; // Copy creates a new provider
        // Update header immediately for better UX

        this.updatePageHeader(currentDescription); // Call the copy custom method

        apiClient.callCustomMethod('copy', {
          id: sourceId
        }, function (response) {
          _this.hideLoadingState();

          _this.handleProviderDataResponse(response, ''); // Empty ID for new provider

        });
      } else {
        // Determine if this is a new provider
        this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Update header immediately for better UX

        this.updatePageHeader(currentDescription); // Use getRecord method from PbxApiClient
        // It automatically handles new records (calls getDefault) and existing records

        apiClient.getRecord(providerId || 'new', function (response) {
          _this.hideLoadingState();

          _this.handleProviderDataResponse(response, providerId);
        });
      }
    }
    /**
     * Handle provider data response from API
     * @param {Object} response - API response
     * @param {string} providerId - Provider ID
     */

  }, {
    key: "handleProviderDataResponse",
    value: function handleProviderDataResponse(response, providerId) {
      var _this2 = this;

      if (response.result && response.data) {
        // Store provider data for later use
        this.providerData = response.data; // Update isNewProvider based on actual data from server
        // New providers won't have an id in the response data

        if (!response.data.id || response.data.id === '') {
          this.isNewProvider = true;
        } else {
          this.isNewProvider = false;
        }

        this.populateFormData(response.data);
      } else if (providerId && providerId !== 'new') {
        UserMessage.showMultiString(response.messages);
      } // Initialize dynamic dropdowns with API data (V5.0 pattern)
      // For both new and existing records - API provides complete data with defaults


      var dropdownData = response.result && response.data ? response.data : {};
      this.initializeDropdownsWithData(dropdownData); // Continue with initialization

      this.initializeUIComponents();
      this.initializeEventHandlers();
      this.initializeForm();
      this.updateVisibilityElements(); // Mark form as changed if in copy mode to enable save button

      if (this.isCopyMode) {
        Form.dataChanged();
      } // Initialize tooltip popups


      this.$popuped.popup(); // Prevent browser password manager for generated passwords

      this.$secret.on('focus', function () {
        _this2.$secret.attr('autocomplete', 'new-password');
      });
    }
    /**
     * Initialize UI components
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      this.$checkBoxes.checkbox();
      this.initializeAccordion(); // Dynamic dropdowns are initialized after data is loaded with provider data
    }
    /**
     * Initialize all dropdowns following V5.0 clean data pattern
     * Called AFTER populateFormData to ensure clean data flow
     * @param {object} data - Provider data from API containing complete field values and represent text
     */

  }, {
    key: "initializeDropdownsWithData",
    value: function initializeDropdownsWithData() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      // Initialize dynamic dropdowns (API-based - uses DynamicDropdownBuilder with complete data)
      this.initializeNetworkFilterDropdown(data); // Initialize static dropdowns (rendered by PHP - use standard Fomantic UI)

      this.initializeRegistrationTypeDropdown();
    }
    /**
     * Initialize registration type dropdown with standard Fomantic UI (PHP-rendered)
     * This dropdown needs custom onChange for provider-specific visibility logic
     */

  }, {
    key: "initializeRegistrationTypeDropdown",
    value: function initializeRegistrationTypeDropdown() {
      var _this3 = this;

      var $dropdown = $('#registration_type-dropdown');

      if ($dropdown.length === 0) {
        return;
      } // For static dropdowns rendered by PHP, use simple Fomantic UI initialization
      // This dropdown needs custom onChange for complex field visibility logic


      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this3.updateVisibilityElements(); // Update validation rules based on registration type


          Form.validateRules = _this3.getValidateRules();
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
     * Initialize network filter dropdown following V5.0 clean data pattern
     * @param {object} data - Provider data from API containing networkfilterid and networkfilterid_represent
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var category = this.providerType || 'SIP'; // V5.0 pattern: Complete automation - no custom onChange needed

      DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
        apiUrl: "/pbxcore/api/v3/network-filters:getForSelect?categories[]=".concat(category),
        placeholder: globalTranslate.pr_NetworkFilter,
        cache: false // No onChange callback - DynamicDropdownBuilder handles everything automatically:
        // - Hidden input synchronization
        // - Change event triggering  
        // - Form.dataChanged() notification
        // - Validation error clearing

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
      Form.initialize(); // Mark form as fully initialized

      this.formInitialized = true;
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
      } // Common provider fields - backend provides defaults


      $('#username').val(data.username || '');
      this.$secret.val(data.secret || '');
      $('#host').val(data.host || '');
      $('#registration_type').val(data.registration_type || '');
      $('#networkfilterid').val(data.networkfilterid || '');
      $('#manualattributes').val(data.manualattributes || '');
      $('#port').val(data.port || ''); // Common checkboxes - handle both string '1' and boolean true
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
  DESCRIPTION: '#description',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
  POPUPED: '.popuped'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwiY3VycmVudERlc2NyaXB0aW9uIiwiY29weUZyb21JZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsImFwaUNsaWVudCIsIlNpcFByb3ZpZGVyc0FQSSIsIklheFByb3ZpZGVyc0FQSSIsIlByb3ZpZGVyc0FQSSIsInNob3dMb2FkaW5nU3RhdGUiLCJzb3VyY2VJZCIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsImhpZGVMb2FkaW5nU3RhdGUiLCJoYW5kbGVQcm92aWRlckRhdGFSZXNwb25zZSIsImdldFJlY29yZCIsInJlc3VsdCIsImRhdGEiLCJwcm92aWRlckRhdGEiLCJwb3B1bGF0ZUZvcm1EYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImRyb3Bkb3duRGF0YSIsImluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwicG9wdXAiLCJvbiIsImF0dHIiLCJjaGVja2JveCIsImluaXRpYWxpemVBY2NvcmRpb24iLCJpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duIiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93biIsIiRkcm9wZG93biIsImxlbmd0aCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwic2VsZiIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJjYXRlZ29yeSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9OZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJoaWRlIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJwYXNzd29yZFdpZGdldCIsInNob3ciLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiZGVzY3JpcHRpb24iLCJub3RlIiwidXNlcm5hbWUiLCJzZWNyZXQiLCJob3N0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJuZXR3b3JrZmlsdGVyaWQiLCJtYW51YWxhdHRyaWJ1dGVzIiwicG9ydCIsInByb3AiLCJxdWFsaWZ5IiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJub3JlZ2lzdGVyIiwiZGlzYWJsZWQiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJUeXBlVGV4dCIsImhlYWRlclRleHQiLCJ0cmltIiwibmV3UHJvdmlkZXJUZXh0IiwicHJfTmV3UHJvdmlkZXIiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7O0FBWUE7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsWUFBWixFQUEwQjtBQUFBOztBQUN0QixTQUFLQSxZQUFMLEdBQW9CQSxZQUFwQixDQURzQixDQUV0Qjs7QUFDQSxTQUFLQyxRQUFMLEdBQWdCQyxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkMsSUFBeEIsQ0FBakI7QUFDQSxTQUFLQyxPQUFMLEdBQWVILENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCRyxNQUF4QixDQUFoQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJMLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCSyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJQLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCTyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0JULENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCUyxXQUF4QixDQUFyQjtBQUNBLFNBQUtDLG9CQUFMLEdBQTRCWCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlcscUJBQXhCLENBQTdCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQmIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJhLE9BQXhCLENBQWpCLENBVHNCLENBV3RCOztBQUNBLFNBQUtDLGFBQUwsR0FBcUIsS0FBckIsQ0Fac0IsQ0FjdEI7O0FBQ0EsU0FBS0MsZUFBTCxHQUF1QixLQUF2QixDQWZzQixDQWlCdEI7O0FBQ0EsU0FBS0MsbUJBQUwsR0FBMkIsSUFBSUMsTUFBSixDQUN2Qix1REFDRSwwQ0FERixHQUVFLDJCQUZGLEdBR0Usc0RBSnFCLEVBS3ZCLElBTHVCLENBQTNCO0FBT0g7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFBQTs7QUFDVCxVQUFNQyxVQUFVLEdBQUduQixDQUFDLENBQUMsS0FBRCxDQUFELENBQVNvQixHQUFULE1BQWtCLEVBQXJDO0FBQ0EsVUFBTUMsa0JBQWtCLEdBQUcsS0FBS1osWUFBTCxDQUFrQlcsR0FBbEIsTUFBMkIsRUFBdEQsQ0FGUyxDQUlUOztBQUNBLFVBQU1FLFVBQVUsR0FBR3RCLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJvQixHQUFuQixFQUFuQjtBQUNBLFVBQU1HLFNBQVMsR0FBRyxJQUFJQyxlQUFKLENBQW9CQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQXBDLENBQWxCO0FBQ0EsVUFBTUMsU0FBUyxHQUFHTCxTQUFTLENBQUNNLEdBQVYsQ0FBYyxNQUFkLENBQWxCO0FBRUEsV0FBS0MsVUFBTCxHQUFrQixLQUFsQixDQVRTLENBU2dCO0FBRXpCOztBQUNBLFVBQUlDLFNBQUo7O0FBQ0EsVUFBSSxLQUFLakMsWUFBTCxLQUFzQixLQUExQixFQUFpQztBQUM3QmlDLFFBQUFBLFNBQVMsR0FBR0MsZUFBWjtBQUNILE9BRkQsTUFFTyxJQUFJLEtBQUtsQyxZQUFMLEtBQXNCLEtBQTFCLEVBQWlDO0FBQ3BDaUMsUUFBQUEsU0FBUyxHQUFHRSxlQUFaO0FBQ0gsT0FGTSxNQUVBO0FBQ0hGLFFBQUFBLFNBQVMsR0FBR0csWUFBWjtBQUNILE9BbkJRLENBcUJUOzs7QUFDQSxXQUFLQyxnQkFBTDs7QUFFQSxVQUFJUCxTQUFTLElBQUlOLFVBQWpCLEVBQTZCO0FBQ3pCO0FBQ0EsWUFBTWMsUUFBUSxHQUFHUixTQUFTLElBQUlOLFVBQTlCO0FBQ0EsYUFBS1EsVUFBTCxHQUFrQixJQUFsQjtBQUNBLGFBQUtmLGFBQUwsR0FBcUIsSUFBckIsQ0FKeUIsQ0FJRTtBQUUzQjs7QUFDQSxhQUFLc0IsZ0JBQUwsQ0FBc0JoQixrQkFBdEIsRUFQeUIsQ0FTekI7O0FBQ0FVLFFBQUFBLFNBQVMsQ0FBQ08sZ0JBQVYsQ0FBMkIsTUFBM0IsRUFBbUM7QUFBQ0MsVUFBQUEsRUFBRSxFQUFFSDtBQUFMLFNBQW5DLEVBQW1ELFVBQUNJLFFBQUQsRUFBYztBQUM3RCxVQUFBLEtBQUksQ0FBQ0MsZ0JBQUw7O0FBQ0EsVUFBQSxLQUFJLENBQUNDLDBCQUFMLENBQWdDRixRQUFoQyxFQUEwQyxFQUExQyxFQUY2RCxDQUVkOztBQUNsRCxTQUhEO0FBSUgsT0FkRCxNQWNPO0FBQ0g7QUFDQSxhQUFLekIsYUFBTCxHQUFxQixDQUFDSSxVQUFELElBQWVBLFVBQVUsS0FBSyxFQUE5QixJQUFvQ0EsVUFBVSxLQUFLLEtBQXhFLENBRkcsQ0FJSDs7QUFDQSxhQUFLa0IsZ0JBQUwsQ0FBc0JoQixrQkFBdEIsRUFMRyxDQU9IO0FBQ0E7O0FBQ0FVLFFBQUFBLFNBQVMsQ0FBQ1ksU0FBVixDQUFvQnhCLFVBQVUsSUFBSSxLQUFsQyxFQUF5QyxVQUFDcUIsUUFBRCxFQUFjO0FBQ25ELFVBQUEsS0FBSSxDQUFDQyxnQkFBTDs7QUFDQSxVQUFBLEtBQUksQ0FBQ0MsMEJBQUwsQ0FBZ0NGLFFBQWhDLEVBQTBDckIsVUFBMUM7QUFDSCxTQUhEO0FBSUg7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxvQ0FBMkJxQixRQUEzQixFQUFxQ3JCLFVBQXJDLEVBQWlEO0FBQUE7O0FBRXpDLFVBQUlxQixRQUFRLENBQUNJLE1BQVQsSUFBbUJKLFFBQVEsQ0FBQ0ssSUFBaEMsRUFBc0M7QUFDbEM7QUFDQSxhQUFLQyxZQUFMLEdBQW9CTixRQUFRLENBQUNLLElBQTdCLENBRmtDLENBSWxDO0FBQ0E7O0FBQ0EsWUFBSSxDQUFDTCxRQUFRLENBQUNLLElBQVQsQ0FBY04sRUFBZixJQUFxQkMsUUFBUSxDQUFDSyxJQUFULENBQWNOLEVBQWQsS0FBcUIsRUFBOUMsRUFBa0Q7QUFDOUMsZUFBS3hCLGFBQUwsR0FBcUIsSUFBckI7QUFDSCxTQUZELE1BRU87QUFDSCxlQUFLQSxhQUFMLEdBQXFCLEtBQXJCO0FBQ0g7O0FBRUQsYUFBS2dDLGdCQUFMLENBQXNCUCxRQUFRLENBQUNLLElBQS9CO0FBQ0gsT0FiRCxNQWFPLElBQUkxQixVQUFVLElBQUlBLFVBQVUsS0FBSyxLQUFqQyxFQUF3QztBQUMzQzZCLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QlQsUUFBUSxDQUFDVSxRQUFyQztBQUNILE9BakJ3QyxDQW1CekM7QUFDQTs7O0FBQ0EsVUFBTUMsWUFBWSxHQUFJWCxRQUFRLENBQUNJLE1BQVQsSUFBbUJKLFFBQVEsQ0FBQ0ssSUFBN0IsR0FBcUNMLFFBQVEsQ0FBQ0ssSUFBOUMsR0FBcUQsRUFBMUU7QUFDQSxXQUFLTywyQkFBTCxDQUFpQ0QsWUFBakMsRUF0QnlDLENBd0J6Qzs7QUFDQSxXQUFLRSxzQkFBTDtBQUVBLFdBQUtDLHVCQUFMO0FBQ0EsV0FBS0MsY0FBTDtBQUNBLFdBQUtDLHdCQUFMLEdBN0J5QyxDQStCekM7O0FBQ0EsVUFBSSxLQUFLMUIsVUFBVCxFQUFxQjtBQUNqQjJCLFFBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILE9BbEN3QyxDQW9DN0M7OztBQUNBLFdBQUs3QyxRQUFMLENBQWM4QyxLQUFkLEdBckM2QyxDQXVDN0M7O0FBQ0EsV0FBS3hELE9BQUwsQ0FBYXlELEVBQWIsQ0FBZ0IsT0FBaEIsRUFBeUIsWUFBTTtBQUMzQixRQUFBLE1BQUksQ0FBQ3pELE9BQUwsQ0FBYTBELElBQWIsQ0FBa0IsY0FBbEIsRUFBa0MsY0FBbEM7QUFDSCxPQUZEO0FBR0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxrQ0FBeUI7QUFDckIsV0FBS3hELFdBQUwsQ0FBaUJ5RCxRQUFqQjtBQUNBLFdBQUtDLG1CQUFMLEdBRnFCLENBSXJCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksdUNBQXVDO0FBQUEsVUFBWGxCLElBQVcsdUVBQUosRUFBSTtBQUNuQztBQUNBLFdBQUttQiwrQkFBTCxDQUFxQ25CLElBQXJDLEVBRm1DLENBSW5DOztBQUNBLFdBQUtvQixrQ0FBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSw4Q0FBcUM7QUFBQTs7QUFDakMsVUFBTUMsU0FBUyxHQUFHbEUsQ0FBQyxDQUFDLDZCQUFELENBQW5COztBQUVBLFVBQUlrRSxTQUFTLENBQUNDLE1BQVYsS0FBcUIsQ0FBekIsRUFBNEI7QUFDeEI7QUFDSCxPQUxnQyxDQU9qQztBQUNBOzs7QUFDQUQsTUFBQUEsU0FBUyxDQUFDRSxRQUFWLENBQW1CO0FBQ2ZDLFFBQUFBLFFBQVEsRUFBRSxrQkFBQ0MsS0FBRCxFQUFXO0FBQ2pCLFVBQUEsTUFBSSxDQUFDZCx3QkFBTCxHQURpQixDQUVqQjs7O0FBQ0FDLFVBQUFBLElBQUksQ0FBQ2MsYUFBTCxHQUFxQixNQUFJLENBQUNDLGdCQUFMLEVBQXJCO0FBQ0FmLFVBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBTmMsT0FBbkI7QUFRSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLCtCQUFzQjtBQUNsQixVQUFNZSxJQUFJLEdBQUcsSUFBYjtBQUNBLFdBQUtsRSxXQUFMLENBQWlCbUUsU0FBakIsQ0FBMkI7QUFDdkJDLFFBQUFBLE1BQU0sRUFBRSxrQkFBVztBQUNmO0FBQ0FDLFVBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsZ0JBQUksT0FBT0gsSUFBSSxDQUFDakIsd0JBQVosS0FBeUMsVUFBN0MsRUFBeUQ7QUFDckRpQixjQUFBQSxJQUFJLENBQUNqQix3QkFBTDtBQUNIO0FBQ0osV0FKUyxFQUlQLEVBSk8sQ0FBVjtBQUtIO0FBUnNCLE9BQTNCO0FBVUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLDJDQUEyQztBQUFBLFVBQVhYLElBQVcsdUVBQUosRUFBSTtBQUN2QyxVQUFNZ0MsUUFBUSxHQUFHLEtBQUsvRSxZQUFMLElBQXFCLEtBQXRDLENBRHVDLENBR3ZDOztBQUNBZ0YsTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLGlCQUFyQyxFQUF3RGxDLElBQXhELEVBQThEO0FBQzFEbUMsUUFBQUEsTUFBTSxzRUFBK0RILFFBQS9ELENBRG9EO0FBRTFESSxRQUFBQSxXQUFXLEVBQUVDLGVBQWUsQ0FBQ0MsZ0JBRjZCO0FBRzFEQyxRQUFBQSxLQUFLLEVBQUUsS0FIbUQsQ0FJMUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFSMEQsT0FBOUQ7QUFVSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLG1DQUEwQjtBQUN0QixVQUFNWCxJQUFJLEdBQUcsSUFBYixDQURzQixDQUd0Qjs7QUFDQSxXQUFLaEUsWUFBTCxDQUFrQm1ELEVBQWxCLENBQXFCLE9BQXJCLEVBQThCLFlBQVc7QUFDckNhLFFBQUFBLElBQUksQ0FBQ3BDLGdCQUFMLENBQXNCckMsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRb0IsR0FBUixFQUF0QjtBQUNILE9BRkQsRUFKc0IsQ0FRdEI7O0FBQ0EsV0FBS2lFLHdCQUFMO0FBQ0g7QUFJRDtBQUNKO0FBQ0E7Ozs7V0FDSSxvQ0FBMkI7QUFDdkI7QUFDQSxVQUFJLEtBQUtsRixPQUFMLENBQWFnRSxNQUFiLEdBQXNCLENBQTFCLEVBQTZCO0FBQ3pCO0FBQ0FuRSxRQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCc0YsSUFBaEI7QUFDQXRGLFFBQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCc0YsSUFBekIsR0FIeUIsQ0FLekI7O0FBQ0EsWUFBTUMsTUFBTSxHQUFHQyxjQUFjLENBQUNDLElBQWYsQ0FBb0IsS0FBS3RGLE9BQXpCLEVBQWtDO0FBQzdDdUYsVUFBQUEsVUFBVSxFQUFFRixjQUFjLENBQUNHLFVBQWYsQ0FBMEJDLElBRE87QUFFN0NDLFVBQUFBLGNBQWMsRUFBRSxJQUY2QjtBQUc3Q0MsVUFBQUEsa0JBQWtCLEVBQUUsSUFIeUI7QUFHbEI7QUFDM0JDLFVBQUFBLGVBQWUsRUFBRSxJQUo0QjtBQUlqQjtBQUM1QkMsVUFBQUEsZUFBZSxFQUFFLElBTDRCO0FBTTdDQyxVQUFBQSxZQUFZLEVBQUUsSUFOK0I7QUFPN0NDLFVBQUFBLGVBQWUsRUFBRSxJQVA0QjtBQVE3Q0MsVUFBQUEsV0FBVyxFQUFFLEtBUmdDO0FBUXpCO0FBQ3BCQyxVQUFBQSxRQUFRLEVBQUUsRUFUbUM7QUFVN0NDLFVBQUFBLGNBQWMsRUFBRSxFQVY2QixDQVUxQjs7QUFWMEIsU0FBbEMsQ0FBZixDQU55QixDQW1CekI7O0FBQ0EsYUFBS0MsY0FBTCxHQUFzQmYsTUFBdEIsQ0FwQnlCLENBc0J6QjtBQUNBOztBQUNBLFlBQUksT0FBTyxLQUFLL0Isd0JBQVosS0FBeUMsVUFBN0MsRUFBeUQ7QUFDckQsZUFBS0Esd0JBQUw7QUFDSDtBQUNKO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLG9DQUEyQixDQUN2QjtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksK0JBQXNCO0FBQ2xCLFdBQUs3QyxvQkFBTCxDQUEwQjRGLElBQTFCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwrQkFBc0I7QUFDbEIsV0FBSzVGLG9CQUFMLENBQTBCMkUsSUFBMUI7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw0QkFBbUI7QUFDZjtBQUNBLGFBQU8sRUFBUDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUI7QUFDYjdCLE1BQUFBLElBQUksQ0FBQzFELFFBQUwsR0FBZ0IsS0FBS0EsUUFBckIsQ0FEYSxDQUViOztBQUNBMEQsTUFBQUEsSUFBSSxDQUFDYyxhQUFMLEdBQXFCLEtBQUtDLGdCQUFMLEVBQXJCO0FBQ0FmLE1BQUFBLElBQUksQ0FBQytDLGdCQUFMLEdBQXdCLEtBQUtBLGdCQUFMLENBQXNCQyxJQUF0QixDQUEyQixJQUEzQixDQUF4QjtBQUNBaEQsTUFBQUEsSUFBSSxDQUFDaUQsZUFBTCxHQUF1QixLQUFLQSxlQUFMLENBQXFCRCxJQUFyQixDQUEwQixJQUExQixDQUF2QjtBQUNBaEQsTUFBQUEsSUFBSSxDQUFDa0QsVUFBTCxHQU5hLENBUWI7O0FBQ0EsV0FBSzNGLGVBQUwsR0FBdUIsSUFBdkI7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUI0RixRQUFqQixFQUEyQjtBQUN2QixVQUFNaEUsTUFBTSxHQUFHZ0UsUUFBZixDQUR1QixDQUV2QjtBQUNBO0FBRUE7O0FBQ0EsVUFBSSxDQUFDaEUsTUFBTSxDQUFDQyxJQUFaLEVBQWtCO0FBQ2RELFFBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjLEtBQUs5QyxRQUFMLENBQWM4RyxJQUFkLENBQW1CLFlBQW5CLENBQWQ7QUFDSCxPQVJzQixDQVV2Qjs7O0FBRUEsYUFBT2pFLE1BQVA7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0kseUJBQWdCSixRQUFoQixFQUEwQixDQUN0QjtBQUNIO0FBSUQ7QUFDSjtBQUNBOzs7O1dBQ0ksNEJBQW1CO0FBQ2YsV0FBS3pDLFFBQUwsQ0FBYytHLFFBQWQsQ0FBdUIsU0FBdkI7QUFDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLDRCQUFtQjtBQUNmLFdBQUsvRyxRQUFMLENBQWNnSCxXQUFkLENBQTBCLFNBQTFCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLDBCQUFpQmxFLElBQWpCLEVBQXVCO0FBRW5CO0FBQ0EsVUFBSUEsSUFBSSxDQUFDTixFQUFULEVBQWE7QUFDVHZDLFFBQUFBLENBQUMsQ0FBQyxLQUFELENBQUQsQ0FBU29CLEdBQVQsQ0FBYXlCLElBQUksQ0FBQ04sRUFBbEI7QUFDSDs7QUFDRCxVQUFJTSxJQUFJLENBQUNtRSxXQUFULEVBQXNCO0FBQ2xCLGFBQUt2RyxZQUFMLENBQWtCVyxHQUFsQixDQUFzQnlCLElBQUksQ0FBQ21FLFdBQTNCLEVBRGtCLENBRWxCOztBQUNBLGFBQUszRSxnQkFBTCxDQUFzQlEsSUFBSSxDQUFDbUUsV0FBM0I7QUFDSDs7QUFDRCxVQUFJbkUsSUFBSSxDQUFDb0UsSUFBVCxFQUFlO0FBQ1hqSCxRQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQVdvQixHQUFYLENBQWV5QixJQUFJLENBQUNvRSxJQUFwQjtBQUNILE9BYmtCLENBZW5COzs7QUFDQWpILE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZW9CLEdBQWYsQ0FBbUJ5QixJQUFJLENBQUNxRSxRQUFMLElBQWlCLEVBQXBDO0FBQ0EsV0FBSy9HLE9BQUwsQ0FBYWlCLEdBQWIsQ0FBaUJ5QixJQUFJLENBQUNzRSxNQUFMLElBQWUsRUFBaEM7QUFDQW5ILE1BQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBV29CLEdBQVgsQ0FBZXlCLElBQUksQ0FBQ3VFLElBQUwsSUFBYSxFQUE1QjtBQUNBcEgsTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JvQixHQUF4QixDQUE0QnlCLElBQUksQ0FBQ3dFLGlCQUFMLElBQTBCLEVBQXREO0FBQ0FySCxNQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQm9CLEdBQXRCLENBQTBCeUIsSUFBSSxDQUFDeUUsZUFBTCxJQUF3QixFQUFsRDtBQUNBdEgsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJvQixHQUF2QixDQUEyQnlCLElBQUksQ0FBQzBFLGdCQUFMLElBQXlCLEVBQXBEO0FBQ0F2SCxNQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQVdvQixHQUFYLENBQWV5QixJQUFJLENBQUMyRSxJQUFMLElBQWEsRUFBNUIsRUF0Qm1CLENBd0JuQjtBQUNBOztBQUNBeEgsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjeUgsSUFBZCxDQUFtQixTQUFuQixFQUE4QjVFLElBQUksQ0FBQzZFLE9BQUwsS0FBaUIsR0FBakIsSUFBd0I3RSxJQUFJLENBQUM2RSxPQUFMLEtBQWlCLElBQXZFO0FBQ0ExSCxNQUFBQSxDQUFDLENBQUMsNkJBQUQsQ0FBRCxDQUFpQ3lILElBQWpDLENBQXNDLFNBQXRDLEVBQWlENUUsSUFBSSxDQUFDOEUsMEJBQUwsS0FBb0MsR0FBcEMsSUFBMkM5RSxJQUFJLENBQUM4RSwwQkFBTCxLQUFvQyxJQUFoSTtBQUNBM0gsTUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQnlILElBQWpCLENBQXNCLFNBQXRCLEVBQWlDNUUsSUFBSSxDQUFDK0UsVUFBTCxLQUFvQixHQUFwQixJQUEyQi9FLElBQUksQ0FBQytFLFVBQUwsS0FBb0IsSUFBaEYsRUE1Qm1CLENBOEJuQjs7QUFDQTVILE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZW9CLEdBQWYsQ0FBbUJ5QixJQUFJLENBQUNnRixRQUFMLEdBQWdCLEdBQWhCLEdBQXNCLEdBQXpDO0FBQ0g7QUFHRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw2QkFBb0JDLFdBQXBCLEVBQWlDO0FBQzdCLGFBQU9DLGNBQWMsQ0FBQ0MsWUFBZixDQUE0QkYsV0FBNUIsQ0FBUDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUJHLFlBQWpCLEVBQStCO0FBQzNCLFVBQU1DLGdCQUFnQixHQUFHLEtBQUtwSSxZQUFMLEtBQXNCLEtBQXRCLEdBQThCLEtBQTlCLEdBQXNDLEtBQS9EO0FBQ0EsVUFBSXFJLFVBQUo7O0FBRUEsVUFBSUYsWUFBWSxJQUFJQSxZQUFZLENBQUNHLElBQWIsT0FBd0IsRUFBNUMsRUFBZ0Q7QUFDNUM7QUFDQUQsUUFBQUEsVUFBVSxhQUFNRixZQUFOLGVBQXVCQyxnQkFBdkIsTUFBVjtBQUNILE9BSEQsTUFHTztBQUNIO0FBQ0EsWUFBTUcsZUFBZSxHQUFHbkQsZUFBZSxDQUFDb0QsY0FBaEIsSUFBa0MsY0FBMUQ7QUFDQUgsUUFBQUEsVUFBVSxhQUFNRSxlQUFOLGVBQTBCSCxnQkFBMUIsTUFBVjtBQUNILE9BWDBCLENBYTNCOzs7QUFDQWxJLE1BQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJ1SSxJQUFqQixDQUFzQkosVUFBdEI7QUFDSDs7Ozs7O2dCQTliQ3RJLFksZUFFaUI7QUFDZkssRUFBQUEsSUFBSSxFQUFFLHFCQURTO0FBRWZFLEVBQUFBLE1BQU0sRUFBRSxTQUZPO0FBR2ZFLEVBQUFBLFVBQVUsRUFBRSwrQkFIRztBQUlmRSxFQUFBQSxVQUFVLEVBQUUsbUNBSkc7QUFLZkUsRUFBQUEsV0FBVyxFQUFFLGNBTEU7QUFNZkUsRUFBQUEscUJBQXFCLEVBQUUsd0JBTlI7QUFPZkUsRUFBQUEsT0FBTyxFQUFFO0FBUE0sQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIE5ldHdvcmtGaWx0ZXJzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBUb29sdGlwQnVpbGRlciwgUGFzc3dvcmRTY29yZSwgaTE4biwgUHJvdmlkZXJzQVBJLCBTaXBQcm92aWRlcnNBUEksIElheFByb3ZpZGVyc0FQSSwgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgREVTQ1JJUFRJT046ICcjZGVzY3JpcHRpb24nLFxuICAgICAgICBQQVNTV09SRF9UT09MVElQX0lDT046ICcucGFzc3dvcmQtdG9vbHRpcC1pY29uJyxcbiAgICAgICAgUE9QVVBFRDogJy5wb3B1cGVkJ1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFR5cGUgb2YgcHJvdmlkZXIgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gcHJvdmlkZXJUeXBlO1xuICAgICAgICAvLyBDYWNoZSBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRmb3JtT2JqID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkZPUk0pO1xuICAgICAgICB0aGlzLiRzZWNyZXQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuU0VDUkVUKTtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5DSEVDS0JPWEVTKTtcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5BQ0NPUkRJT05TKTtcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuREVTQ1JJUFRJT04pO1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlBBU1NXT1JEX1RPT0xUSVBfSUNPTik7XG4gICAgICAgIHRoaXMuJHBvcHVwZWQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUE9QVVBFRCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHByb3ZpZGVyIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9zdCBpbnB1dCB2YWxpZGF0aW9uIHJlZ2V4XG4gICAgICAgIHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbiA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnXigoKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pXFxcXC4pezN9J1xuICAgICAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICAgICAgKyAnKFxcXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT8nXG4gICAgICAgICAgICArICd8W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0oPzpcXFxcLlthLXpBLVpdezIsfSkrKSQnLFxuICAgICAgICAgICAgJ2dtJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnREZXNjcmlwdGlvbiA9IHRoaXMuJGRlc2NyaXB0aW9uLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgdGhpcy5pc0NvcHlNb2RlID0gZmFsc2U7IC8vIFNhdmUgYXMgY2xhc3MgcHJvcGVydHlcblxuICAgICAgICAvLyBTZWxlY3QgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGxldCBhcGlDbGllbnQ7XG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFNpcFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcblxuICAgICAgICBpZiAoY29weVBhcmFtIHx8IGNvcHlGcm9tSWQpIHtcbiAgICAgICAgICAgIC8vIENvcHkgbW9kZSAtIHVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBlbmRwb2ludFxuICAgICAgICAgICAgY29uc3Qgc291cmNlSWQgPSBjb3B5UGFyYW0gfHwgY29weUZyb21JZDtcbiAgICAgICAgICAgIHRoaXMuaXNDb3B5TW9kZSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSB0cnVlOyAvLyBDb3B5IGNyZWF0ZXMgYSBuZXcgcHJvdmlkZXJcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbW1lZGlhdGVseSBmb3IgYmV0dGVyIFVYXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudERlc2NyaXB0aW9uKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgY29weSBjdXN0b20gbWV0aG9kXG4gICAgICAgICAgICBhcGlDbGllbnQuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogc291cmNlSWR9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVByb3ZpZGVyRGF0YVJlc3BvbnNlKHJlc3BvbnNlLCAnJyk7IC8vIEVtcHR5IElEIGZvciBuZXcgcHJvdmlkZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXJcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9ICFwcm92aWRlcklkIHx8IHByb3ZpZGVySWQgPT09ICcnIHx8IHByb3ZpZGVySWQgPT09ICduZXcnO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihjdXJyZW50RGVzY3JpcHRpb24pO1xuXG4gICAgICAgICAgICAvLyBVc2UgZ2V0UmVjb3JkIG1ldGhvZCBmcm9tIFBieEFwaUNsaWVudFxuICAgICAgICAgICAgLy8gSXQgYXV0b21hdGljYWxseSBoYW5kbGVzIG5ldyByZWNvcmRzIChjYWxscyBnZXREZWZhdWx0KSBhbmQgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgYXBpQ2xpZW50LmdldFJlY29yZChwcm92aWRlcklkIHx8ICduZXcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVByb3ZpZGVyRGF0YVJlc3BvbnNlKHJlc3BvbnNlLCBwcm92aWRlcklkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBwcm92aWRlciBkYXRhIHJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVySWQgLSBQcm92aWRlciBJRFxuICAgICAqL1xuICAgIGhhbmRsZVByb3ZpZGVyRGF0YVJlc3BvbnNlKHJlc3BvbnNlLCBwcm92aWRlcklkKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIHByb3ZpZGVyIGRhdGEgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgICAgIHRoaXMucHJvdmlkZXJEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdQcm92aWRlciBiYXNlZCBvbiBhY3R1YWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgIC8vIE5ldyBwcm92aWRlcnMgd29uJ3QgaGF2ZSBhbiBpZCBpbiB0aGUgcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5pZCB8fCByZXNwb25zZS5kYXRhLmlkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zIHdpdGggQVBJIGRhdGEgKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgIC8vIEZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3JkcyAtIEFQSSBwcm92aWRlcyBjb21wbGV0ZSBkYXRhIHdpdGggZGVmYXVsdHNcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkgPyByZXNwb25zZS5kYXRhIDoge307XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkcm9wZG93bkRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgaWYgaW4gY29weSBtb2RlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgIHRoaXMuJHBvcHVwZWQucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gRHluYW1pYyBkcm9wZG93bnMgYXJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkIHdpdGggcHJvdmlkZXIgZGF0YVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBkcm9wZG93bnMgZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQ2FsbGVkIEFGVEVSIHBvcHVsYXRlRm9ybURhdGEgdG8gZW5zdXJlIGNsZWFuIGRhdGEgZmxvd1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSSBjb250YWluaW5nIGNvbXBsZXRlIGZpZWxkIHZhbHVlcyBhbmQgcmVwcmVzZW50IHRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHluYW1pYyBkcm9wZG93bnMgKEFQSS1iYXNlZCAtIHVzZXMgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3aXRoIGNvbXBsZXRlIGRhdGEpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIGRyb3Bkb3ducyAocmVuZGVyZWQgYnkgUEhQIC0gdXNlIHN0YW5kYXJkIEZvbWFudGljIFVJKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKiBUaGlzIGRyb3Bkb3duIG5lZWRzIGN1c3RvbSBvbkNoYW5nZSBmb3IgcHJvdmlkZXItc3BlY2lmaWMgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHN0YXRpYyBkcm9wZG93bnMgcmVuZGVyZWQgYnkgUEhQLCB1c2Ugc2ltcGxlIEZvbWFudGljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBjb21wbGV4IGZpZWxkIHZpc2liaWxpdHkgbG9naWNcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgbmV0d29ya2ZpbHRlcmlkIGFuZCBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnByb3ZpZGVyVHlwZSB8fCAnU0lQJztcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgcGF0dGVybjogQ29tcGxldGUgYXV0b21hdGlvbiAtIG5vIGN1c3RvbSBvbkNoYW5nZSBuZWVkZWRcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109JHtjYXRlZ29yeX1gLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAvLyBObyBvbkNoYW5nZSBjYWxsYmFjayAtIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgaGFuZGxlcyBldmVyeXRoaW5nIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgICAgICAvLyAtIEhpZGRlbiBpbnB1dCBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgICAgIC8vIC0gQ2hhbmdlIGV2ZW50IHRyaWdnZXJpbmcgIFxuICAgICAgICAgICAgLy8gLSBGb3JtLmRhdGFDaGFuZ2VkKCkgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAvLyAtIFZhbGlkYXRpb24gZXJyb3IgY2xlYXJpbmdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKTtcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGxlZ2FjeSBIVE1MIGJ1dHRvbnMgLSBQYXNzd29yZFdpZGdldCB3aWxsIG1hbmFnZSBpdHMgb3duIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIHByb3ZpZGVycyAtIHdpbGwgYmUgdXBkYXRlZCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCh0aGlzLiRzZWNyZXQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gV2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIEtlZXAgY29weSBidXR0b24gZm9yIGFsbCBtb2Rlc1xuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSwgLy8gRG9uJ3QgdmFsaWRhdGUgb24gbG9hZCwgbGV0IHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyIC8vIFByb3ZpZGVyIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eSBlbGVtZW50cyBub3cgdGhhdCB3aWRnZXQgaXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBhcHBseSB0aGUgY29ycmVjdCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyB0byBjb25maWd1cmUgUGFzc3dvcmRXaWRnZXQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLmhpZGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvbiBhbmQgY2FsbGJhY2tzXG4gICAgICogTm90ZTogVGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBpbiBwcm92aWRlci1tb2RpZnkuanMgdG8gY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICAvLyBVUkwgaXMgbm90IHNldCBoZXJlIC0gY2hpbGQgY2xhc3NlcyBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIHNldHRpbmdzXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXMgZnJvbSBGb3JtLmpzXG4gICAgICAgIC8vIFdlIHNob3VsZCBvbmx5IGFkZCBvciBtb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBJZiByZXN1bHQuZGF0YSBpcyBub3QgZGVmaW5lZCAoc2hvdWxkbid0IGhhcHBlbiksIGluaXRpYWxpemUgaXRcbiAgICAgICAgaWYgKCFyZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgdmFsdWUgaXMgYXV0b21hdGljYWxseSBoYW5kbGVkIGJ5IGZvcm0gc2VyaWFsaXphdGlvblxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICQoJyNpZCcpLnZhbChkYXRhLmlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24udmFsKGRhdGEuZGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGRhdGEuZGVzY3JpcHRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLm5vdGUpIHtcbiAgICAgICAgICAgICQoJyNub3RlJykudmFsKGRhdGEubm90ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBwcm92aWRlciBmaWVsZHMgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRzXG4gICAgICAgICQoJyN1c2VybmFtZScpLnZhbChkYXRhLnVzZXJuYW1lIHx8ICcnKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0LnZhbChkYXRhLnNlY3JldCB8fCAnJyk7XG4gICAgICAgICQoJyNob3N0JykudmFsKGRhdGEuaG9zdCB8fCAnJyk7XG4gICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbChkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICcnKTtcbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyk7XG4gICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgICQoJyNwb3J0JykudmFsKGRhdGEucG9ydCB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb21tb24gY2hlY2tib3hlcyAtIGhhbmRsZSBib3RoIHN0cmluZyAnMScgYW5kIGJvb2xlYW4gdHJ1ZVxuICAgICAgICAvLyBUaGVzZSBjaGVja2JveGVzIHVzZSBzdGFuZGFyZCBIVE1MIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICAgICQoJyNxdWFsaWZ5JykucHJvcCgnY2hlY2tlZCcsIGRhdGEucXVhbGlmeSA9PT0gJzEnIHx8IGRhdGEucXVhbGlmeSA9PT0gdHJ1ZSk7XG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLnByb3AoJ2NoZWNrZWQnLCBkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSAnMScgfHwgZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gdHJ1ZSk7XG4gICAgICAgICQoJyNub3JlZ2lzdGVyJykucHJvcCgnY2hlY2tlZCcsIGRhdGEubm9yZWdpc3RlciA9PT0gJzEnIHx8IGRhdGEubm9yZWdpc3RlciA9PT0gdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlZCBzdGF0ZSAtIHRoaXMgaXMgYSBoaWRkZW4gZmllbGQsIG5vdCBhIGNoZWNrYm94XG4gICAgICAgICQoJyNkaXNhYmxlZCcpLnZhbChkYXRhLmRpc2FibGVkID8gJzEnIDogJzAnKTtcbiAgICB9XG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlck5hbWUgLSBQcm92aWRlciBuYW1lXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihwcm92aWRlck5hbWUpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlVGV4dCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJyA/ICdTSVAnIDogJ0lBWCc7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyTmFtZSAmJiBwcm92aWRlck5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcHJvdmlkZXIgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7cHJvdmlkZXJOYW1lfSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHByb3ZpZGVyIG9yIG5vIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5ld1Byb3ZpZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXdQcm92aWRlciB8fCAnTmV3IFByb3ZpZGVyJztcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtuZXdQcm92aWRlclRleHR9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykudGV4dChoZWFkZXJUZXh0KTtcbiAgICB9XG59Il19