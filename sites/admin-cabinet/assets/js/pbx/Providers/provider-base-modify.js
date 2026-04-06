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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGb3JtRGF0YSIsInByb3ZpZGVySWQiLCJ2YWwiLCJjdXJyZW50RGVzY3JpcHRpb24iLCJjb3B5RnJvbUlkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJpc0NvcHlNb2RlIiwiYXBpQ2xpZW50IiwiU2lwUHJvdmlkZXJzQVBJIiwiSWF4UHJvdmlkZXJzQVBJIiwiUHJvdmlkZXJzQVBJIiwic2hvd0xvYWRpbmdTdGF0ZSIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzb3VyY2VJZCIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZ2V0UmVjb3JkIiwicHJvdmlkZXJEYXRhIiwidW5kZWZpbmVkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiYWZ0ZXJQb3B1bGF0ZSIsInBvcHVsYXRlRm9ybURhdGEiLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsImNoZWNrYm94IiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJzZWxmIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsImNhdGVnb3J5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX05ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm9uIiwiYXR0ciIsImhpZGUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsInBhc3N3b3JkV2lkZ2V0IiwiY2xvc2VzdCIsImZpbmQiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsInNob3ciLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiZGVzY3JpcHRpb24iLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJUeXBlVGV4dCIsImhlYWRlclRleHQiLCJ0cmltIiwibmV3UHJvdmlkZXJUZXh0IiwicHJfTmV3UHJvdmlkZXIiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7O0FBWUE7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsWUFBWixFQUEwQjtBQUFBOztBQUN0QixTQUFLQSxZQUFMLEdBQW9CQSxZQUFwQixDQURzQixDQUV0Qjs7QUFDQSxTQUFLQyxRQUFMLEdBQWdCQyxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkMsSUFBeEIsQ0FBakI7QUFDQSxTQUFLQyxPQUFMLEdBQWVILENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCRyxNQUF4QixDQUFoQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJMLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCSyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJQLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCTyxVQUF4QixDQUFwQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0JULENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCUyxXQUF4QixDQUFyQjtBQUNBLFNBQUtDLG9CQUFMLEdBQTRCWCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlcscUJBQXhCLENBQTdCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQmIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNB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LE9BSEQsTUFHTztBQUNIO0FBQ0EsWUFBTUcsZUFBZSxHQUFHNUMsZUFBZSxDQUFDNkMsY0FBeEM7QUFDQUgsUUFBQUEsVUFBVSxhQUFNRSxlQUFOLGVBQTBCSCxnQkFBMUIsTUFBVjtBQUNILE9BWDBCLENBYTNCOzs7QUFDQS9ILE1BQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJvSSxJQUFqQixDQUFzQkosVUFBdEI7QUFDSDs7Ozs7O2dCQXZkQ25JLFksZUFFaUI7QUFDZkssRUFBQUEsSUFBSSxFQUFFLHFCQURTO0FBRWZFLEVBQUFBLE1BQU0sRUFBRSxTQUZPO0FBR2ZFLEVBQUFBLFVBQVUsRUFBRSwrQkFIRztBQUlmRSxFQUFBQSxVQUFVLEVBQUUsbUNBSkc7QUFLZkUsRUFBQUEsV0FBVyxFQUFFLGNBTEU7QUFNZkUsRUFBQUEscUJBQXFCLEVBQUUsd0JBTlI7QUFPZkUsRUFBQUEsT0FBTyxFQUFFO0FBUE0sQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIE5ldHdvcmtGaWx0ZXJzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBUb29sdGlwQnVpbGRlciwgUGFzc3dvcmRTY29yZSwgaTE4biwgUHJvdmlkZXJzQVBJLCBTaXBQcm92aWRlcnNBUEksIElheFByb3ZpZGVyc0FQSSwgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgREVTQ1JJUFRJT046ICcjZGVzY3JpcHRpb24nLFxuICAgICAgICBQQVNTV09SRF9UT09MVElQX0lDT046ICcucGFzc3dvcmQtdG9vbHRpcC1pY29uJyxcbiAgICAgICAgUE9QVVBFRDogJy5wb3B1cGVkJ1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFR5cGUgb2YgcHJvdmlkZXIgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJvdmlkZXJUeXBlKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gcHJvdmlkZXJUeXBlO1xuICAgICAgICAvLyBDYWNoZSBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRmb3JtT2JqID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkZPUk0pO1xuICAgICAgICB0aGlzLiRzZWNyZXQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuU0VDUkVUKTtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5DSEVDS0JPWEVTKTtcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5BQ0NPUkRJT05TKTtcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuREVTQ1JJUFRJT04pO1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlBBU1NXT1JEX1RPT0xUSVBfSUNPTik7XG4gICAgICAgIHRoaXMuJHBvcHVwZWQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUE9QVVBFRCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHByb3ZpZGVyIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9zdCBpbnB1dCB2YWxpZGF0aW9uIHJlZ2V4XG4gICAgICAgIHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbiA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnXigoKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pXFxcXC4pezN9J1xuICAgICAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICAgICAgKyAnKFxcXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT8nXG4gICAgICAgICAgICArICd8W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0oPzpcXFxcLlthLXpBLVpdezIsfSkrKSQnLFxuICAgICAgICAgICAgJ2dtJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm0gZm9sbG93aW5nIENhbGxRdWV1ZXMgcGF0dGVyblxuICAgICAqXG4gICAgICogRmxvdzpcbiAgICAgKiAxLiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3QgKHN5bmNocm9ub3VzKVxuICAgICAqIDIuIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb25cbiAgICAgKiAzLiBMb2FkIGRhdGEgZnJvbSBBUEkgKGFzeW5jaHJvbm91cywgbGFzdClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyAxLiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3QgKHN5bmNocm9ub3VzKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcblxuICAgICAgICAvLyAyLiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAvLyAzLiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBzZXR0aW5ncyAoYmVmb3JlIGxvYWRpbmcgZGF0YSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIDQuIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSSAobGFzdCwgYWZ0ZXIgYWxsIFVJIGlzIGluaXRpYWxpemVkKVxuICAgICAgICB0aGlzLmxvYWRGb3JtRGF0YSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGxhc3QsIGFmdGVyIGFsbCBVSSBjb21wb25lbnRzIGFyZSBpbml0aWFsaXplZFxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50RGVzY3JpcHRpb24gPSB0aGlzLiRkZXNjcmlwdGlvbi52YWwoKSB8fCAnJztcblxuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlciBvciBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIHRoaXMuaXNDb3B5TW9kZSA9IGZhbHNlOyAvLyBTYXZlIGFzIGNsYXNzIHByb3BlcnR5XG5cbiAgICAgICAgLy8gU2VsZWN0IGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBsZXQgYXBpQ2xpZW50O1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBTaXBQcm92aWRlcnNBUEk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBQcm92aWRlcnNBUEk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy5zaG93TG9hZGluZ1N0YXRlKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbW1lZGlhdGVseSBmb3IgYmV0dGVyIFVYXG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihjdXJyZW50RGVzY3JpcHRpb24pO1xuXG4gICAgICAgIGlmIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCkge1xuICAgICAgICAgICAgLy8gQ29weSBtb2RlIC0gdXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IGVuZHBvaW50XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VJZCA9IGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkO1xuICAgICAgICAgICAgdGhpcy5pc0NvcHlNb2RlID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IHRydWU7IC8vIENvcHkgY3JlYXRlcyBhIG5ldyBwcm92aWRlclxuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjb3B5IGN1c3RvbSBtZXRob2RcbiAgICAgICAgICAgIGFwaUNsaWVudC5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBzb3VyY2VJZH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgZm9yIGNvcHlcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvclxuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXJcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9ICFwcm92aWRlcklkIHx8IHByb3ZpZGVySWQgPT09ICcnIHx8IHByb3ZpZGVySWQgPT09ICduZXcnO1xuXG4gICAgICAgICAgICAvLyBVc2UgZ2V0UmVjb3JkIG1ldGhvZCBmcm9tIFBieEFwaUNsaWVudFxuICAgICAgICAgICAgLy8gSXQgYXV0b21hdGljYWxseSBoYW5kbGVzIG5ldyByZWNvcmRzIChjYWxscyBnZXREZWZhdWx0KSBhbmQgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgYXBpQ2xpZW50LmdldFJlY29yZChwcm92aWRlcklkIHx8ICduZXcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLmlkIHx8IHJlc3BvbnNlLmRhdGEuaWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBmb3IgZXhpc3RpbmcgcmVjb3JkcyB0aGF0IGZhaWxlZCB0byBsb2FkXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm92aWRlcklkICYmIHByb3ZpZGVySWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogRm9sbG93aW5nIENhbGxRdWV1ZXMgcGF0dGVybiB3aXRoIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU3RvcmUgcHJvdmlkZXIgZGF0YSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIHRoaXMucHJvdmlkZXJEYXRhID0gZGF0YTtcblxuICAgICAgICAvLyBVcGRhdGUgaXNOZXdQcm92aWRlciBmbGFnIGZyb20gQVBJIHJlc3BvbnNlIGlmIHByb3ZpZGVkXG4gICAgICAgIC8vIElmIF9pc05ldyBmbGFnIGlzIHByZXNlbnQgaW4gZGF0YSAoc2V0IGJ5IGdldERlZmF1bHQgb3IgY29weSksIHVzZSBpdFxuICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIGtlZXAgdGhlIHZhbHVlIHNldCBpbiBsb2FkRm9ybURhdGEoKVxuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoIChDYWxsUXVldWVzIHBhdHRlcm4pXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIGZpcnN0IHdpdGggZm9ybSBkYXRhIChvbmx5IG9uY2UpXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgc3BlY2lmaWMgZmllbGRzIGlmIG5lZWRlZCBieSBjaGlsZCBjbGFzc2VzXG4gICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZpc2liaWxpdHkgYmFzZWQgb24gbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgcG9wdXBzIGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgIHRoaXMuJHBvcHVwZWQucG9wdXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKiBDYWxsZWQgZmlyc3QsIGJlZm9yZSBkYXRhIGxvYWRpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIFVJIGNvbXBvbmVudHMgKHN5bmNocm9ub3VzKVxuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBwb3B1cHNcbiAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuXG4gICAgICAgIC8vIER5bmFtaWMgZHJvcGRvd25zIGFyZSBpbml0aWFsaXplZCBsYXRlciBpbiBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEgKGFmdGVyIGRhdGEgaXMgbG9hZGVkKVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBkcm9wZG93bnMgZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQ2FsbGVkIEFGVEVSIHBvcHVsYXRlRm9ybURhdGEgdG8gZW5zdXJlIGNsZWFuIGRhdGEgZmxvd1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSSBjb250YWluaW5nIGNvbXBsZXRlIGZpZWxkIHZhbHVlcyBhbmQgcmVwcmVzZW50IHRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHluYW1pYyBkcm9wZG93bnMgKEFQSS1iYXNlZCAtIHVzZXMgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3aXRoIGNvbXBsZXRlIGRhdGEpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIGRyb3Bkb3ducyAocmVuZGVyZWQgYnkgUEhQIC0gdXNlIHN0YW5kYXJkIEZvbWFudGljIFVJKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKiBUaGlzIGRyb3Bkb3duIG5lZWRzIGN1c3RvbSBvbkNoYW5nZSBmb3IgcHJvdmlkZXItc3BlY2lmaWMgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHN0YXRpYyBkcm9wZG93bnMgcmVuZGVyZWQgYnkgUEhQLCB1c2Ugc2ltcGxlIEZvbWFudGljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBjb21wbGV4IGZpZWxkIHZpc2liaWxpdHkgbG9naWNcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgbmV0d29ya2ZpbHRlcmlkIGFuZCBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnByb3ZpZGVyVHlwZSB8fCAnU0lQJztcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgcGF0dGVybjogQ29tcGxldGUgYXV0b21hdGlvbiAtIG5vIGN1c3RvbSBvbkNoYW5nZSBuZWVkZWRcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109JHtjYXRlZ29yeX1gLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAvLyBObyBvbkNoYW5nZSBjYWxsYmFjayAtIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgaGFuZGxlcyBldmVyeXRoaW5nIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgICAgICAvLyAtIEhpZGRlbiBpbnB1dCBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgICAgIC8vIC0gQ2hhbmdlIGV2ZW50IHRyaWdnZXJpbmcgIFxuICAgICAgICAgICAgLy8gLSBGb3JtLmRhdGFDaGFuZ2VkKCkgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAvLyAtIFZhbGlkYXRpb24gZXJyb3IgY2xlYXJpbmdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqIENhbGxlZCBhZnRlciBVSSBjb21wb25lbnRzLCBiZWZvcmUgZm9ybSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIHdoZW4gcHJvdmlkZXIgbmFtZSBjaGFuZ2VzXG4gICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi51cGRhdGVQYWdlSGVhZGVyKCQodGhpcykudmFsKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2ZvY3VzJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZFdpZGdldCgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLiRzZWNyZXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSGlkZSBsZWdhY3kgSFRNTCBidXR0b25zIC0gUGFzc3dvcmRXaWRnZXQgd2lsbCBtYW5hZ2UgaXRzIG93biBidXR0b25zXG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBwcm92aWRlcnMgLSB3aWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQodGhpcy4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgIC8vIFdpbGwgYmUgdXBkYXRlZCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBLZWVwIGNvcHkgYnV0dG9uIGZvciBhbGwgbW9kZXNcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogZmFsc2UsIC8vIERvbid0IHZhbGlkYXRlIG9uIGxvYWQsIGxldCB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMgaGFuZGxlIGl0XG4gICAgICAgICAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiAvLyBQcm92aWRlciBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcblxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHBvcHVwcyBmb3IgbmV3bHkgY3JlYXRlZCBQYXNzd29yZFdpZGdldCBidXR0b25zXG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uW2RhdGEtY29udGVudF0nKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdob3ZlcicsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd0aW55J1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IGVsZW1lbnRzIG5vdyB0aGF0IHdpZGdldCBpcyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXMgdG8gY29uZmlndXJlIFBhc3N3b3JkV2lkZ2V0IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgcGFzc3dvcmQgdG9vbHRpcCBpY29uIHdoZW4gaW4gJ25vbmUnIHJlZ2lzdHJhdGlvbiBtb2RlXG4gICAgICovXG4gICAgc2hvd1Bhc3N3b3JkVG9vbHRpcCgpIHtcbiAgICAgICAgdGhpcy4kcGFzc3dvcmRUb29sdGlwSWNvbi5zaG93KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgcGFzc3dvcmQgdG9vbHRpcCBpY29uXG4gICAgICovXG4gICAgaGlkZVBhc3N3b3JkVG9vbHRpcCgpIHtcbiAgICAgICAgdGhpcy4kcGFzc3dvcmRUb29sdGlwSWNvbi5oaWRlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb24gYW5kIGNhbGxiYWNrc1xuICAgICAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIG92ZXJyaWRkZW4gaW4gcHJvdmlkZXItbW9kaWZ5LmpzIHRvIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgLy8gVVJMIGlzIG5vdCBzZXQgaGVyZSAtIGNoaWxkIGNsYXNzZXMgY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1hcmsgZm9ybSBhcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzIGZyb20gRm9ybS5qc1xuICAgICAgICAvLyBXZSBzaG91bGQgb25seSBhZGQgb3IgbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgcmVzdWx0LmRhdGEgaXMgbm90IGRlZmluZWQgKHNob3VsZG4ndCBoYXBwZW4pLCBpbml0aWFsaXplIGl0XG4gICAgICAgIGlmICghcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIHZhbHVlIGlzIGF1dG9tYXRpY2FsbHkgaGFuZGxlZCBieSBmb3JtIHNlcmlhbGl6YXRpb25cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHByb3ZpZGVyLXNwZWNpZmljIGZvcm0gZmllbGRzXG4gICAgICogQ2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKCkgYWZ0ZXIgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSgpXG4gICAgICogT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyBmb3IgcHJvdmlkZXItc3BlY2lmaWMgZmllbGQgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lXG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBmb3JtIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KCk7XG5cbiAgICAgICAgLy8gTW9zdCBmaWVsZHMgYXJlIG5vdyBoYW5kbGVkIGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAgICAvLyBUaGlzIG1ldGhvZCBpcyBmb3Igc3BlY2lhbCBjYXNlcyBvciBwcm92aWRlci1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyAoUHJvdmlkZXJTSVAsIFByb3ZpZGVySUFYKSBhcyBuZWVkZWRcbiAgICB9XG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlck5hbWUgLSBQcm92aWRlciBuYW1lXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihwcm92aWRlck5hbWUpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlVGV4dCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJyA/ICdTSVAnIDogJ0lBWCc7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyTmFtZSAmJiBwcm92aWRlck5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcHJvdmlkZXIgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7cHJvdmlkZXJOYW1lfSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHByb3ZpZGVyIG9yIG5vIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5ld1Byb3ZpZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXdQcm92aWRlcjtcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtuZXdQcm92aWRlclRleHR9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykudGV4dChoZWFkZXJUZXh0KTtcbiAgICB9XG59Il19