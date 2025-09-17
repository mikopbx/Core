"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl,globalTranslate, Form, firewallTooltips, FirewallAPI, FormElements, UserMessage */

/**
 * The firewall object contains methods and variables for managing the Firewall form
 *
 * @module firewall
 */
var firewall = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#firewall-form'),

  /**
   * Firewall record ID.
   * @type {string}
   */
  recordId: '',

  /**
   * Firewall data from API.
   * @type {Object}
   */
  firewallData: null,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    network: {
      identifier: 'network',
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.fw_ValidatePermitAddress
      }]
    },
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.fw_ValidateRuleName
      }]
    }
  },
  // Initialization function to set up form behavior
  initialize: function initialize() {
    // Initialize global variables for tooltips and Docker detection
    // These will be updated when data is loaded from API
    window.servicePortInfo = {};
    window.serviceNameMapping = {};
    window.isDocker = false;
    window.dockerSupportedServices = [];
    window.currentNetwork = '';
    window.currentSubnet = ''; // Get record ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' (new record) or an actual ID

    if (lastSegment === 'modify' || lastSegment === '') {
      firewall.recordId = '';
    } else {
      firewall.recordId = lastSegment;
    } // Initialize Form first to enable form methods


    firewall.initializeForm(); // Load firewall data from API

    firewall.loadFirewallData();
  },

  /**
   * Load firewall data from API.
   * Unified method for both new and existing records.
   * API returns defaults for new records when ID is empty.
   */
  loadFirewallData: function loadFirewallData() {
    firewall.$formObj.addClass('loading'); // Always call API - it returns defaults for new records (when ID is empty)

    FirewallAPI.getRecord(firewall.recordId || '', function (response) {
      firewall.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // Show error and stop
        UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord || 'Error loading firewall rule');
        return;
      }

      firewall.firewallData = response.data; // Populate form and initialize elements

      firewall.populateForm(response.data); // Initialize UI elements after data is loaded

      firewall.initializeUIElements();
      firewall.initializeTooltips();
      firewall.initializeDockerLimitedCheckboxes();
    });
  },

  /**
   * Populate form with firewall data.
   * @param {Object} data - Firewall data.
   */
  populateForm: function populateForm(data) {
    // Prepare form data object with all fields
    var formData = {
      id: data.id,
      network: data.network,
      subnet: data.subnet,
      description: data.description,
      newer_block_ip: data.newer_block_ip,
      local_network: data.local_network
    }; // Add rule checkboxes to form data

    if (data.rules && _typeof(data.rules) === 'object') {
      Object.keys(data.rules).forEach(function (category) {
        var fieldName = "rule_".concat(category); // Convert action boolean to checkbox value

        formData[fieldName] = data.rules[category].action === true;
      });
    } // Use unified silent population approach


    Form.populateFormSilently(formData, {
      afterPopulate: function afterPopulate(populatedData) {
        // Update window variables for tooltips
        window.currentNetwork = data.network;
        window.currentSubnet = data.subnet;
        window.isDocker = data.isDocker || false;
        window.dockerSupportedServices = data.dockerSupportedServices || []; // Build service port info and name mapping from rules

        window.servicePortInfo = {};
        window.serviceNameMapping = {};

        if (data.rules && _typeof(data.rules) === 'object') {
          Object.keys(data.rules).forEach(function (category) {
            var rule = data.rules[category];
            window.servicePortInfo[category] = rule.ports || []; // Map display name to category key

            window.serviceNameMapping[rule.name] = category;
          });
        }
      }
    });
  },

  /**
   * Initialize UI elements.
   */
  initializeUIElements: function initializeUIElements() {
    // Initialize checkboxes including rules
    $('#firewall-form .checkbox').checkbox();
    $('#firewall-form .rules').checkbox(); // Initialize dropdowns

    $('#firewall-form .dropdown').dropdown(); // Initialize input mask for network field (IP address)

    $('input[name="network"]').inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    var formData = result.data || firewall.$formObj.form('get values'); // Prepare rules data for API
    // Checkbox values will already be boolean thanks to convertCheckboxesToBool

    var rules = {};
    Object.keys(formData).forEach(function (key) {
      if (key.startsWith('rule_')) {
        var category = key.replace('rule_', ''); // Send as boolean - backend will convert to allow/block

        rules[category] = formData[key] === true;
        delete formData[key];
      }
    }); // Add rules to formData

    formData.rules = rules; // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool

    result.data = formData;
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    // Configure Form.js
    Form.$formObj = firewall.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = firewall.validateRules;
    Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
    Form.cbAfterSendForm = firewall.cbAfterSendForm; // Enable checkbox to boolean conversion

    Form.convertCheckboxesToBool = true; // Setup REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = FirewallAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "firewall/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "firewall/modify/"); // Initialize Form with all standard features:
    // - Dirty checking (change tracking)
    // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
    // - Form validation
    // - AJAX response handling

    Form.initialize();
  },

  /**
   * Initialize tooltips for service information
   */
  initializeTooltips: function initializeTooltips() {
    var self = this; // Initialize tooltips for service rules

    $('.service-info-icon').each(function () {
      var $icon = $(this);
      var service = $icon.data('service');
      var isLimited = $icon.data('limited') === true; // Find the checkbox for this service

      var $checkbox = $icon.closest('.field').find('input[type="checkbox"]'); // Get initial action based on checkbox state

      var action = $checkbox.prop('checked') ? 'allow' : 'block'; // Generate initial tooltip content

      var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet);
      var portInfo = window.servicePortInfo[service] || [];
      var tooltipContent = firewallTooltips.generateContent(service, action, network, window.isDocker, isLimited, portInfo, isLimited && window.isDocker // Show copy button only for Docker limited services
      ); // Initialize tooltip

      firewallTooltips.initializeTooltip($icon, {
        html: tooltipContent,
        position: 'top right'
      }); // Store reference to icon on checkbox for updates

      $checkbox.data('tooltipIcon', $icon);
    }); // Initialize tooltips for special checkboxes

    $('.special-checkbox-info').each(function () {
      var $icon = $(this);
      var type = $icon.data('type'); // Find the checkbox for this type

      var $checkbox = $icon.closest('.field').find("input[name=\"".concat(type, "\"]")); // Get initial state

      var isChecked = $checkbox.prop('checked');
      var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet); // Generate initial tooltip content

      var tooltipContent = firewallTooltips.generateSpecialCheckboxContent(type, network, isChecked); // Initialize tooltip with compact width for special checkboxes

      firewallTooltips.initializeTooltip($icon, {
        html: tooltipContent,
        position: 'top right',
        variation: 'very wide'
      }); // Store reference to icon on checkbox for updates

      $checkbox.data('specialTooltipIcon', $icon);
    }); // Listen for checkbox changes to update tooltips

    $('#firewall-form .rules input[type="checkbox"]').on('change', function () {
      var $checkbox = $(this);
      var $icon = $checkbox.data('tooltipIcon');
      var $specialIcon = $checkbox.data('specialTooltipIcon');

      if ($icon && $icon.length) {
        var service = $icon.data('service');
        var isLimited = $icon.data('limited') === true;
        var action = $checkbox.prop('checked') ? 'allow' : 'block';
        var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet);
        var portInfo = window.servicePortInfo[service] || []; // Generate new tooltip content

        var newContent = firewallTooltips.generateContent(service, action, network, window.isDocker, isLimited, portInfo, isLimited && window.isDocker); // Update tooltip

        firewallTooltips.updateContent($icon, newContent);
      }

      if ($specialIcon && $specialIcon.length) {
        var type = $specialIcon.data('type');
        var isChecked = $checkbox.prop('checked');

        var _network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet); // Generate new tooltip content


        var _newContent = firewallTooltips.generateSpecialCheckboxContent(type, _network, isChecked); // Update tooltip with compact width


        firewallTooltips.updateContent($specialIcon, _newContent, {
          position: 'top right',
          variation: 'very wide'
        });
      }
    });
  },

  /**
   * Initialize Docker limited checkboxes - prevent them from being toggled
   */
  initializeDockerLimitedCheckboxes: function initializeDockerLimitedCheckboxes() {
    if (!window.isDocker) {
      return;
    }

    $('.docker-limited-checkbox').each(function () {
      var $checkbox = $(this);
      var $input = $checkbox.find('input[type="checkbox"]'); // Ensure checkbox is always checked

      $input.prop('checked', true); // Add visual disabled state

      $checkbox.addClass('disabled'); // Prevent click events

      $checkbox.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation(); // Show a temporary message

        var $label = $checkbox.find('label');
        var $icon = $label.find('.service-info-icon'); // Trigger the tooltip to show

        $icon.popup('show');
        return false;
      }); // Prevent checkbox state changes

      $input.on('change', function (e) {
        e.preventDefault();
        $(this).prop('checked', true);
        return false;
      });
    });
  }
}; // Custom form validation rule to check if a string is a valid IP address

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f === null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
}; // Initialize the firewall form when the document is ready


$(document).ready(function () {
  firewall.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyIsImRlc2NyaXB0aW9uIiwiZndfVmFsaWRhdGVSdWxlTmFtZSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJzZXJ2aWNlUG9ydEluZm8iLCJzZXJ2aWNlTmFtZU1hcHBpbmciLCJpc0RvY2tlciIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiY3VycmVudE5ldHdvcmsiLCJjdXJyZW50U3VibmV0IiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJsYXN0U2VnbWVudCIsImxlbmd0aCIsImluaXRpYWxpemVGb3JtIiwibG9hZEZpcmV3YWxsRGF0YSIsImFkZENsYXNzIiwiRmlyZXdhbGxBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJmd19FcnJvckxvYWRpbmdSZWNvcmQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJpbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMiLCJmb3JtRGF0YSIsImlkIiwic3VibmV0IiwibmV3ZXJfYmxvY2tfaXAiLCJsb2NhbF9uZXR3b3JrIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImZpZWxkTmFtZSIsImFjdGlvbiIsIkZvcm0iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJwb3B1bGF0ZWREYXRhIiwicnVsZSIsInBvcnRzIiwibmFtZSIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJpbnB1dG1hc2siLCJhbGlhcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImZvcm0iLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsImNiQWZ0ZXJTZW5kRm9ybSIsInVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJzZWxmIiwiZWFjaCIsIiRpY29uIiwic2VydmljZSIsImlzTGltaXRlZCIsIiRjaGVja2JveCIsImNsb3Nlc3QiLCJmaW5kIiwicHJvcCIsInBvcnRJbmZvIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJodG1sIiwicG9zaXRpb24iLCJpc0NoZWNrZWQiLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCJvbiIsIiRzcGVjaWFsSWNvbiIsIm5ld0NvbnRlbnQiLCJ1cGRhdGVDb250ZW50IiwiJGlucHV0IiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiJGxhYmVsIiwicG9wdXAiLCJmbiIsImlwYWRkciIsInZhbHVlIiwiZiIsIm1hdGNoIiwiaSIsImEiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxF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LENBbUJBOzs7QUFDQWxDLENBQUMsQ0FBQ3FILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4SCxFQUFBQSxRQUFRLENBQUNlLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgRm9ybUVsZW1lbnRzLCBVc2VyTWVzc2FnZSAqL1xuXG4vKipcbiAqIFRoZSBmaXJld2FsbCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgZm9ybVxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxcbiAqL1xuY29uc3QgZmlyZXdhbGwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCByZWNvcmQgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmV0d29yaycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVSdWxlTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6YXRpb24gZnVuY3Rpb24gdG8gc2V0IHVwIGZvcm0gYmVoYXZpb3JcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGdsb2JhbCB2YXJpYWJsZXMgZm9yIHRvb2x0aXBzIGFuZCBEb2NrZXIgZGV0ZWN0aW9uXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgdXBkYXRlZCB3aGVuIGRhdGEgaXMgbG9hZGVkIGZyb20gQVBJXG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSBmYWxzZTtcbiAgICAgICAgd2luZG93LmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzID0gW107XG4gICAgICAgIHdpbmRvdy5jdXJyZW50TmV0d29yayA9ICcnO1xuICAgICAgICB3aW5kb3cuY3VycmVudFN1Ym5ldCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZpcmV3YWxsLnJlY29yZElkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gZmlyc3QgdG8gZW5hYmxlIGZvcm0gbWV0aG9kc1xuICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICAgIGZpcmV3YWxsLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkRmlyZXdhbGxEYXRhKCkge1xuICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldFJlY29yZChmaXJld2FsbC5yZWNvcmRJZCB8fCAnJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdSZWNvcmQgfHwgJ0Vycm9yIGxvYWRpbmcgZmlyZXdhbGwgcnVsZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZmlyZXdhbGwuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgZmlyZXdhbGwucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGVsZW1lbnRzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplVUlFbGVtZW50cygpO1xuICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZmlyZXdhbGwgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgb2JqZWN0IHdpdGggYWxsIGZpZWxkc1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgbmV0d29yazogZGF0YS5uZXR3b3JrLFxuICAgICAgICAgICAgc3VibmV0OiBkYXRhLnN1Ym5ldCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgbmV3ZXJfYmxvY2tfaXA6IGRhdGEubmV3ZXJfYmxvY2tfaXAsXG4gICAgICAgICAgICBsb2NhbF9uZXR3b3JrOiBkYXRhLmxvY2FsX25ldHdvcmtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBydWxlIGNoZWNrYm94ZXMgdG8gZm9ybSBkYXRhXG4gICAgICAgIGlmIChkYXRhLnJ1bGVzICYmIHR5cGVvZiBkYXRhLnJ1bGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5ydWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHJ1bGVfJHtjYXRlZ29yeX1gO1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYWN0aW9uIGJvb2xlYW4gdG8gY2hlY2tib3ggdmFsdWVcbiAgICAgICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gZGF0YS5ydWxlc1tjYXRlZ29yeV0uYWN0aW9uID09PSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZm9ybURhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChwb3B1bGF0ZWREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHdpbmRvdyB2YXJpYWJsZXMgZm9yIHRvb2x0aXBzXG4gICAgICAgICAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gZGF0YS5uZXR3b3JrO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gZGF0YS5zdWJuZXQ7XG4gICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyID0gZGF0YS5pc0RvY2tlciB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHNlcnZpY2UgcG9ydCBpbmZvIGFuZCBuYW1lIG1hcHBpbmcgZnJvbSBydWxlc1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucnVsZXMgJiYgdHlwZW9mIGRhdGEucnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcnVsZSA9IGRhdGEucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeV0gPSBydWxlLnBvcnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFwIGRpc3BsYXkgbmFtZSB0byBjYXRlZ29yeSBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbcnVsZS5uYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGluY2x1ZGluZyBydWxlc1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAucnVsZXMnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFzayBmb3IgbmV0d29yayBmaWVsZCAoSVAgYWRkcmVzcylcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cIm5ldHdvcmtcIl0nKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gcmVzdWx0LmRhdGEgfHwgZmlyZXdhbGwuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJlcGFyZSBydWxlcyBkYXRhIGZvciBBUElcbiAgICAgICAgLy8gQ2hlY2tib3ggdmFsdWVzIHdpbGwgYWxyZWFkeSBiZSBib29sZWFuIHRoYW5rcyB0byBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbFxuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhmb3JtRGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdydWxlXycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBrZXkucmVwbGFjZSgncnVsZV8nLCAnJyk7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyBib29sZWFuIC0gYmFja2VuZCB3aWxsIGNvbnZlcnQgdG8gYWxsb3cvYmxvY2tcbiAgICAgICAgICAgICAgICBydWxlc1tjYXRlZ29yeV0gPSBmb3JtRGF0YVtrZXldID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBydWxlcyB0byBmb3JtRGF0YVxuICAgICAgICBmb3JtRGF0YS5ydWxlcyA9IHJ1bGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gbmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmsgYXJlIGFscmVhZHkgYm9vbGVhbiB0aGFua3MgdG8gY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdC5kYXRhID0gZm9ybURhdGE7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmaXJld2FsbC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmlyZXdhbGwuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmaXJld2FsbC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBGaXJld2FsbEFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzZXJ2aWNlIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgcnVsZXNcbiAgICAgICAgJCgnLnNlcnZpY2UtaW5mby1pY29uJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZpY2UgPSAkaWNvbi5kYXRhKCdzZXJ2aWNlJyk7XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkaWNvbi5kYXRhKCdsaW1pdGVkJykgPT09IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHNlcnZpY2VcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgaW5pdGlhbCBhY3Rpb24gYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJykgPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgaW5pdGlhbCB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgc2VydmljZSwgXG4gICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICBuZXR3b3JrLCBcbiAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIsIFxuICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgcG9ydEluZm8sIFxuICAgICAgICAgICAgICAgIGlzTGltaXRlZCAmJiB3aW5kb3cuaXNEb2NrZXIgLy8gU2hvdyBjb3B5IGJ1dHRvbiBvbmx5IGZvciBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwXG4gICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLmluaXRpYWxpemVUb29sdGlwKCRpY29uLCB7XG4gICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIHRvIGljb24gb24gY2hlY2tib3ggZm9yIHVwZGF0ZXNcbiAgICAgICAgICAgICRjaGVja2JveC5kYXRhKCd0b29sdGlwSWNvbicsICRpY29uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnNwZWNpYWwtY2hlY2tib3gtaW5mbycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gJGljb24uZGF0YSgndHlwZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBjaGVja2JveCBmb3IgdGhpcyB0eXBlXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkaWNvbi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKGBpbnB1dFtuYW1lPVwiJHt0eXBlfVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgaW5pdGlhbCB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQoXG4gICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgIGlzQ2hlY2tlZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aCBmb3Igc3BlY2lhbCBjaGVja2JveGVzXG4gICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLmluaXRpYWxpemVUb29sdGlwKCRpY29uLCB7XG4gICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3Zlcnkgd2lkZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3NwZWNpYWxUb29sdGlwSWNvbicsICRpY29uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoZWNrYm94IGNoYW5nZXMgdG8gdXBkYXRlIHRvb2x0aXBzXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5ydWxlcyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkY2hlY2tib3guZGF0YSgndG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIGNvbnN0ICRzcGVjaWFsSWNvbiA9ICRjaGVja2JveC5kYXRhKCdzcGVjaWFsVG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRpY29uICYmICRpY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZpY2UgPSAkaWNvbi5kYXRhKCdzZXJ2aWNlJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGljb24uZGF0YSgnbGltaXRlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJykgPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2UsIFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLCBcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICAgICAgcG9ydEluZm8sIFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQgJiYgd2luZG93LmlzRG9ja2VyXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkaWNvbiwgbmV3Q29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkc3BlY2lhbEljb24gJiYgJHNwZWNpYWxJY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkc3BlY2lhbEljb24uZGF0YSgndHlwZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzQ2hlY2tlZFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy51cGRhdGVDb250ZW50KCRzcGVjaWFsSWNvbiwgbmV3Q29udGVudCwge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3Zlcnkgd2lkZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERvY2tlciBsaW1pdGVkIGNoZWNrYm94ZXMgLSBwcmV2ZW50IHRoZW0gZnJvbSBiZWluZyB0b2dnbGVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pc0RvY2tlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcuZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRW5zdXJlIGNoZWNrYm94IGlzIGFsd2F5cyBjaGVja2VkXG4gICAgICAgICAgICAkaW5wdXQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgdmlzdWFsIGRpc2FibGVkIHN0YXRlXG4gICAgICAgICAgICAkY2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2xpY2sgZXZlbnRzXG4gICAgICAgICAgICAkY2hlY2tib3gub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgYSB0ZW1wb3JhcnkgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICRjaGVja2JveC5maW5kKCdsYWJlbCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGxhYmVsLmZpbmQoJy5zZXJ2aWNlLWluZm8taWNvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHRvb2x0aXAgdG8gc2hvd1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2hlY2tib3ggc3RhdGUgY2hhbmdlc1xuICAgICAgICAgICAgJGlucHV0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQodGhpcykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBJUCBhZGRyZXNzXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBmaXJld2FsbCBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGwuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==