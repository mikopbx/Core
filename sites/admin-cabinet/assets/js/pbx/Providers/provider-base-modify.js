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

    this.formInitialized = false; // Host input validation regex: IPv4 address, IPv4 CIDR (/0-/32), or hostname

    this.hostInputValidation = new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\\d|[1-2]\\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$');
  }
  /**
   * Initialize the provider form following CallQueues pattern
   *
   * Flow:
   * 1. Initialize UI components first (synchronous)
   * 2. Initialize form with validation
   * 3. Load data from API (asynchronous, last)
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      // 1. Initialize UI components first (synchronous)
      this.initializeUIComponents(); // 2. Initialize event handlers

      this.initializeEventHandlers(); // 3. Initialize form with REST API settings (before loading data)

      this.initializeForm(); // 4. Load form data via REST API (last, after all UI is initialized)

      this.loadFormData();
    }
    /**
     * Load form data via REST API
     * This is called last, after all UI components are initialized
     */

  }, {
    key: "loadFormData",
    value: function loadFormData() {
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


      this.showLoadingState(); // Update header immediately for better UX

      this.updatePageHeader(currentDescription);

      if (copyParam || copyFromId) {
        // Copy mode - use the new RESTful copy endpoint
        var sourceId = copyParam || copyFromId;
        this.isCopyMode = true;
        this.isNewProvider = true; // Copy creates a new provider
        // Call the copy custom method

        apiClient.callCustomMethod('copy', {
          id: sourceId
        }, function (response) {
          _this.hideLoadingState();

          if (response.result && response.data) {
            // Mark as new record for copy
            response.data._isNew = true;

            _this.populateForm(response.data); // Mark form as changed to enable save button


            Form.dataChanged();
          } else {
            // Show error
            UserMessage.showMultiString(response.messages);
          }
        });
      } else {
        // Determine if this is a new provider
        this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Use getRecord method from PbxApiClient
        // It automatically handles new records (calls getDefault) and existing records

        apiClient.getRecord(providerId || 'new', function (response) {
          _this.hideLoadingState();

          if (response.result && response.data) {
            // Mark as new record if we don't have an ID
            if (!response.data.id || response.data.id === '') {
              response.data._isNew = true;
              _this.isNewProvider = true;
            }

            _this.populateForm(response.data);
          } else {
            // Show error for existing records that failed to load
            if (providerId && providerId !== 'new') {
              UserMessage.showMultiString(response.messages);
            }
          }
        });
      }
    }
    /**
     * Populate form with data from REST API
     * Following CallQueues pattern with initializeDropdownsWithData
     * @param {Object} data - Form data from API
     */

  }, {
    key: "populateForm",
    value: function populateForm(data) {
      var _this2 = this;

      // Store provider data for later use
      this.providerData = data; // Update isNewProvider flag from API response if provided
      // If _isNew flag is present in data (set by getDefault or copy), use it

      if (data._isNew !== undefined) {
        this.isNewProvider = data._isNew;
      } // Otherwise keep the value set in loadFormData()
      // Use unified silent population approach (CallQueues pattern)


      Form.populateFormSilently(data, {
        beforePopulate: function beforePopulate(formData) {
          // Initialize dropdowns first with form data (only once)
          _this2.initializeDropdownsWithData(data);
        },
        afterPopulate: function afterPopulate(formData) {
          // Manually populate specific fields if needed by child classes
          _this2.populateFormData(data); // Update visibility based on loaded data


          _this2.updateVisibilityElements();
        }
      }); // Initialize tooltip popups after form is populated

      this.$popuped.popup();
    }
    /**
     * Initialize UI components
     * Called first, before data loading
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      // Initialize basic UI components (synchronous)
      this.$checkBoxes.checkbox();
      this.initializeAccordion(); // Initialize tooltip popups

      this.$popuped.popup(); // Dynamic dropdowns are initialized later in initializeDropdownsWithData (after data is loaded)
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
     * Called after UI components, before form initialization
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this4 = this;

      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Prevent browser password manager for generated passwords

      this.$secret.on('focus', function () {
        _this4.$secret.attr('autocomplete', 'new-password');
      });
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

        this.passwordWidget = widget; // Reinitialize popups for newly created PasswordWidget buttons

        this.$secret.closest('.ui.input').find('button[data-content]').popup({
          on: 'hover',
          position: 'top center',
          variation: 'tiny'
        }); // Update visibility elements now that widget is initialized

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
     * Populate provider-specific form fields
     * Called from populateForm() after Form.populateFormSilently()
     * Override in child classes for provider-specific field population
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Update page header with provider name
      if (data.description) {
        this.updatePageHeader(data.description);
      } // Initialize password widget after form data is loaded


      this.initializePasswordWidget(); // Most fields are now handled by Form.populateFormSilently()
      // This method is for special cases or provider-specific fields
      // Override in child classes (ProviderSIP, ProviderIAX) as needed
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
        var newProviderText = globalTranslate.pr_NewProvider;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGb3JtRGF0YSIsInByb3ZpZGVySWQiLCJ2YWwiLCJjdXJyZW50RGVzY3JpcHRpb24iLCJjb3B5RnJvbUlkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJpc0NvcHlNb2RlIiwiYXBpQ2xpZW50IiwiU2lwUHJvdmlkZXJzQVBJIiwiSWF4UHJvdmlkZXJzQVBJIiwiUHJvdmlkZXJzQVBJIiwic2hvd0xvYWRpbmdTdGF0ZSIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzb3VyY2VJZCIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZ2V0UmVjb3JkIiwicHJvdmlkZXJEYXRhIiwidW5kZWZpbmVkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiYWZ0ZXJQb3B1bGF0ZSIsInBvcHVsYXRlRm9ybURhdGEiLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsImNoZWNrYm94IiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJzZWxmIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsImNhdGVnb3J5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX05ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm9uIiwiYXR0ciIsImhpZGUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsInBhc3N3b3JkV2lkZ2V0IiwiY2xvc2VzdCIsImZpbmQiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsInNob3ciLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiZGVzY3JpcHRpb24iLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJUeXBlVGV4dCIsImhlYWRlclRleHQiLCJ0cmltIiwibmV3UHJvdmlkZXJUZXh0IiwicHJfTmV3UHJvdmlkZXIiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7O0FBWUE7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsWUFBWixFQUEwQjtBQUFBOztBQUN0QixTQUFLQSxZQUFMLEdBQW9CQSxZQUFwQixDQURzQixDQUV0Qjs7QUFDQSxTQUFLQyxRQUFMLEdBQWdCQyxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkMsSUFBeEIsQ0FBakI7QUFDQSxTQUFLQyxPQUFMLEdBQWVILENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCRyxNQUF4QixDQUFoQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJMLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCSyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJQLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCTyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0JULENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCUyxXQUF4QixDQUFyQjtBQUNBLFNBQUtDLG9CQUFMLEdBQTRCWCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlcscUJBQXhCLENBQTdCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQmIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNB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QUNIO0FBQ0EsWUFBTUcsZUFBZSxHQUFHNUMsZUFBZSxDQUFDNkMsY0FBeEM7QUFDQUgsUUFBQUEsVUFBVSxhQUFNRSxlQUFOLGVBQTBCSCxnQkFBMUIsTUFBVjtBQUNILE9BWDBCLENBYTNCOzs7QUFDQS9ILE1BQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJvSSxJQUFqQixDQUFzQkosVUFBdEI7QUFDSDs7Ozs7O2dCQXRkQ25JLFksZUFFaUI7QUFDZkssRUFBQUEsSUFBSSxFQUFFLHFCQURTO0FBRWZFLEVBQUFBLE1BQU0sRUFBRSxTQUZPO0FBR2ZFLEVBQUFBLFVBQVUsRUFBRSwrQkFIRztBQUlmRSxFQUFBQSxVQUFVLEVBQUUsbUNBSkc7QUFLZkUsRUFBQUEsV0FBVyxFQUFFLGNBTEU7QUFNZkUsRUFBQUEscUJBQXFCLEVBQUUsd0JBTlI7QUFPZkUsRUFBQUEsT0FBTyxFQUFFO0FBUE0sQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIE5ldHdvcmtGaWx0ZXJzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBUb29sdGlwQnVpbGRlciwgUGFzc3dvcmRTY29yZSwgaTE4biwgUHJvdmlkZXJzQVBJLCBTaXBQcm92aWRlcnNBUEksIElheFByb3ZpZGVyc0FQSSwgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgREVTQ1JJUFRJT046ICcjZGVzY3JpcHRpb24nLFxuICAgICAgICBQQVNTV09SRF9UT09MVElQX0lDT046ICcucGFzc3dvcmQtdG9vbHRpcC1pY29uJyxcbiAgICAgICAgUE9QVVBFRDogJy5wb3B1cGVkJ1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFR5cGUgb2YgcHJvdmlkZXIgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gcHJvdmlkZXJUeXBlO1xuICAgICAgICAvLyBDYWNoZSBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRmb3JtT2JqID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkZPUk0pO1xuICAgICAgICB0aGlzLiRzZWNyZXQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuU0VDUkVUKTtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5DSEVDS0JPWEVTKTtcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5BQ0NPUkRJT05TKTtcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuREVTQ1JJUFRJT04pO1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlBBU1NXT1JEX1RPT0xUSVBfSUNPTik7XG4gICAgICAgIHRoaXMuJHBvcHVwZWQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUE9QVVBFRCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHByb3ZpZGVyIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9zdCBpbnB1dCB2YWxpZGF0aW9uIHJlZ2V4OiBJUHY0IGFkZHJlc3MsIElQdjQgQ0lEUiAoLzAtLzMyKSwgb3IgaG9zdG5hbWVcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxcXGR8WzEtMl1cXFxcZHwzWzAtMl0pKT8nXG4gICAgICAgICAgICArICd8W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0oPzpcXFxcLlthLXpBLVpdezIsfSkrKSQnXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybSBmb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuXG4gICAgICpcbiAgICAgKiBGbG93OlxuICAgICAqIDEuIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdCAoc3luY2hyb25vdXMpXG4gICAgICogMi4gSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvblxuICAgICAqIDMuIExvYWQgZGF0YSBmcm9tIEFQSSAoYXN5bmNocm9ub3VzLCBsYXN0KVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIDEuIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdCAoc3luY2hyb25vdXMpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIDIuIEluaXRpYWxpemUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIDMuIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzIChiZWZvcmUgbG9hZGluZyBkYXRhKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gNC4gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJIChsYXN0LCBhZnRlciBhbGwgVUkgaXMgaW5pdGlhbGl6ZWQpXG4gICAgICAgIHRoaXMubG9hZEZvcm1EYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICogVGhpcyBpcyBjYWxsZWQgbGFzdCwgYWZ0ZXIgYWxsIFVJIGNvbXBvbmVudHMgYXJlIGluaXRpYWxpemVkXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnREZXNjcmlwdGlvbiA9IHRoaXMuJGRlc2NyaXB0aW9uLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgdGhpcy5pc0NvcHlNb2RlID0gZmFsc2U7IC8vIFNhdmUgYXMgY2xhc3MgcHJvcGVydHlcblxuICAgICAgICAvLyBTZWxlY3QgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGxldCBhcGlDbGllbnQ7XG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFNpcFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcblxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnREZXNjcmlwdGlvbik7XG5cbiAgICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG1vZGUgLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUlkID0gY29weVBhcmFtIHx8IGNvcHlGcm9tSWQ7XG4gICAgICAgICAgICB0aGlzLmlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gdHJ1ZTsgLy8gQ29weSBjcmVhdGVzIGEgbmV3IHByb3ZpZGVyXG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNvcHkgY3VzdG9tIG1ldGhvZFxuICAgICAgICAgICAgYXBpQ2xpZW50LmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IHNvdXJjZUlkfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlclxuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gIXByb3ZpZGVySWQgfHwgcHJvdmlkZXJJZCA9PT0gJycgfHwgcHJvdmlkZXJJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgICAgIC8vIFVzZSBnZXRSZWNvcmQgbWV0aG9kIGZyb20gUGJ4QXBpQ2xpZW50XG4gICAgICAgICAgICAvLyBJdCBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgbmV3IHJlY29yZHMgKGNhbGxzIGdldERlZmF1bHQpIGFuZCBleGlzdGluZyByZWNvcmRzXG4gICAgICAgICAgICBhcGlDbGllbnQuZ2V0UmVjb3JkKHByb3ZpZGVySWQgfHwgJ25ldycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuaWQgfHwgcmVzcG9uc2UuZGF0YS5pZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGZvciBleGlzdGluZyByZWNvcmRzIHRoYXQgZmFpbGVkIHRvIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBGb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuIHdpdGggaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTdG9yZSBwcm92aWRlciBkYXRhIGZvciBsYXRlciB1c2VcbiAgICAgICAgdGhpcy5wcm92aWRlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGZsYWcgZnJvbSBBUEkgcmVzcG9uc2UgaWYgcHJvdmlkZWRcbiAgICAgICAgLy8gSWYgX2lzTmV3IGZsYWcgaXMgcHJlc2VudCBpbiBkYXRhIChzZXQgYnkgZ2V0RGVmYXVsdCBvciBjb3B5KSwgdXNlIGl0XG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSBkYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2Uga2VlcCB0aGUgdmFsdWUgc2V0IGluIGxvYWRGb3JtRGF0YSgpXG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKENhbGxRdWV1ZXMgcGF0dGVybilcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgZmlyc3Qgd2l0aCBmb3JtIGRhdGEgKG9ubHkgb25jZSlcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBwb3B1bGF0ZSBzcGVjaWZpYyBmaWVsZHMgaWYgbmVlZGVkIGJ5IGNoaWxkIGNsYXNzZXNcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBwb3B1cHMgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqIENhbGxlZCBmaXJzdCwgYmVmb3JlIGRhdGEgbG9hZGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50cyAoc3luY2hyb25vdXMpXG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNjb3JkaW9uKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHBvcHVwc1xuICAgICAgICB0aGlzLiRwb3B1cGVkLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBkcm9wZG93bnMgYXJlIGluaXRpYWxpemVkIGxhdGVyIGluIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSAoYWZ0ZXIgZGF0YSBpcyBsb2FkZWQpXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBDYWxsZWQgQUZURVIgcG9wdWxhdGVGb3JtRGF0YSB0byBlbnN1cmUgY2xlYW4gZGF0YSBmbG93XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgY29tcGxldGUgZmllbGQgdmFsdWVzIGFuZCByZXByZXNlbnQgdGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkeW5hbWljIGRyb3Bkb3ducyAoQVBJLWJhc2VkIC0gdXNlcyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHdpdGggY29tcGxldGUgZGF0YSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgZHJvcGRvd25zIChyZW5kZXJlZCBieSBQSFAgLSB1c2Ugc3RhbmRhcmQgRm9tYW50aWMgVUkpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBwcm92aWRlci1zcGVjaWZpYyB2aXNpYmlsaXR5IGxvZ2ljXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3RhdGljIGRyb3Bkb3ducyByZW5kZXJlZCBieSBQSFAsIHVzZSBzaW1wbGUgRm9tYW50aWMgVUkgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBkcm9wZG93biBuZWVkcyBjdXN0b20gb25DaGFuZ2UgZm9yIGNvbXBsZXggZmllbGQgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUEkgY29udGFpbmluZyBuZXR3b3JrZmlsdGVyaWQgYW5kIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEgPSB7fSkge1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHRoaXMucHJvdmlkZXJUeXBlIHx8ICdTSVAnO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBwYXR0ZXJuOiBDb21wbGV0ZSBhdXRvbWF0aW9uIC0gbm8gY3VzdG9tIG9uQ2hhbmdlIG5lZWRlZFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT0ke2NhdGVnb3J5fWAsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgICAgIC8vIE5vIG9uQ2hhbmdlIGNhbGxiYWNrIC0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBoYW5kbGVzIGV2ZXJ5dGhpbmcgYXV0b21hdGljYWxseTpcbiAgICAgICAgICAgIC8vIC0gSGlkZGVuIGlucHV0IHN5bmNocm9uaXphdGlvblxuICAgICAgICAgICAgLy8gLSBDaGFuZ2UgZXZlbnQgdHJpZ2dlcmluZyAgXG4gICAgICAgICAgICAvLyAtIEZvcm0uZGF0YUNoYW5nZWQoKSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIC8vIC0gVmFsaWRhdGlvbiBlcnJvciBjbGVhcmluZ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIFVJIGNvbXBvbmVudHMsIGJlZm9yZSBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGxlZ2FjeSBIVE1MIGJ1dHRvbnMgLSBQYXNzd29yZFdpZGdldCB3aWxsIG1hbmFnZSBpdHMgb3duIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIHByb3ZpZGVycyAtIHdpbGwgYmUgdXBkYXRlZCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCh0aGlzLiRzZWNyZXQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gV2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIEtlZXAgY29weSBidXR0b24gZm9yIGFsbCBtb2Rlc1xuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSwgLy8gRG9uJ3QgdmFsaWRhdGUgb24gbG9hZCwgbGV0IHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyIC8vIFByb3ZpZGVyIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuXG4gICAgICAgICAgICAvLyBSZWluaXRpYWxpemUgcG9wdXBzIGZvciBuZXdseSBjcmVhdGVkIFBhc3N3b3JkV2lkZ2V0IGJ1dHRvbnNcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5jbG9zZXN0KCcudWkuaW5wdXQnKS5maW5kKCdidXR0b25bZGF0YS1jb250ZW50XScpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBvbjogJ2hvdmVyJyxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3RpbnknXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHZpc2liaWxpdHkgZWxlbWVudHMgbm93IHRoYXQgd2lkZ2V0IGlzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyB0byBjb25maWd1cmUgUGFzc3dvcmRXaWRnZXQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLmhpZGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvbiBhbmQgY2FsbGJhY2tzXG4gICAgICogTm90ZTogVGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBpbiBwcm92aWRlci1tb2RpZnkuanMgdG8gY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICAvLyBVUkwgaXMgbm90IHNldCBoZXJlIC0gY2hpbGQgY2xhc3NlcyBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIHNldHRpbmdzXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXMgZnJvbSBGb3JtLmpzXG4gICAgICAgIC8vIFdlIHNob3VsZCBvbmx5IGFkZCBvciBtb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBJZiByZXN1bHQuZGF0YSBpcyBub3QgZGVmaW5lZCAoc2hvdWxkbid0IGhhcHBlbiksIGluaXRpYWxpemUgaXRcbiAgICAgICAgaWYgKCFyZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgdmFsdWUgaXMgYXV0b21hdGljYWxseSBoYW5kbGVkIGJ5IGZvcm0gc2VyaWFsaXphdGlvblxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgcHJvdmlkZXItc3BlY2lmaWMgZm9ybSBmaWVsZHNcbiAgICAgKiBDYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKSBhZnRlciBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICAgKiBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzIGZvciBwcm92aWRlci1zcGVjaWZpYyBmaWVsZCBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWVcbiAgICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKTtcblxuICAgICAgICAvLyBNb3N0IGZpZWxkcyBhcmUgbm93IGhhbmRsZWQgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSgpXG4gICAgICAgIC8vIFRoaXMgbWV0aG9kIGlzIGZvciBzcGVjaWFsIGNhc2VzIG9yIHByb3ZpZGVyLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzIChQcm92aWRlclNJUCwgUHJvdmlkZXJJQVgpIGFzIG5lZWRlZFxuICAgIH1cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcHMgZnJvbSBzdHJ1Y3R1cmVkIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyTmFtZSAtIFByb3ZpZGVyIG5hbWVcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKHByb3ZpZGVyTmFtZSkge1xuICAgICAgICBjb25zdCBwcm92aWRlclR5cGVUZXh0ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnID8gJ1NJUCcgOiAnSUFYJztcbiAgICAgICAgbGV0IGhlYWRlclRleHQ7XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJOYW1lICYmIHByb3ZpZGVyTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBwcm92aWRlciB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtwcm92aWRlck5hbWV9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcHJvdmlkZXIgb3Igbm8gbmFtZVxuICAgICAgICAgICAgY29uc3QgbmV3UHJvdmlkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX05ld1Byb3ZpZGVyO1xuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke25ld1Byb3ZpZGVyVGV4dH0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS50ZXh0KGhlYWRlclRleHQpO1xuICAgIH1cbn0iXX0=