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
    ipv4_network: {
      identifier: 'ipv4_network',
      optional: true,
      rules: [{
        type: 'regExp',
        // Strict IPv4: each octet 0-255
        value: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        prompt: globalTranslate.fw_ValidateIPv4Address
      }]
    },
    ipv6_network: {
      identifier: 'ipv6_network',
      optional: true,
      rules: [{
        type: 'regExp',
        // Strict IPv6: RFC 4291 compliant (all standard notations including compressed ::)
        value: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
        prompt: globalTranslate.fw_ValidateIPv6Address
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
    } // Read URL parameters for prefilling (e.g., ?network=0.0.0.0&subnet=0)


    firewall.urlParameters = firewall.getUrlParameters(); // Initialize Form BEFORE loading data (like extension-modify.js pattern)

    firewall.initializeForm(); // Load firewall data from API

    firewall.loadFirewallData();
  },

  /**
   * Get URL parameters for prefilling the form
   * @returns {Object} Object with network, subnet, and ruleName parameters
   */
  getUrlParameters: function getUrlParameters() {
    var params = new URLSearchParams(window.location.search);
    return {
      network: params.get('network') || '',
      subnet: params.get('subnet') || '',
      ruleName: params.get('ruleName') || ''
    };
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
        UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord);
        return;
      }

      firewall.firewallData = response.data; // Generate dynamic rules HTML first

      firewall.generateRulesHTML(response.data); // Prepare data for form population

      var formData = firewall.prepareFormData(response.data); // Use Form.populateFormSilently() like extension-modify.js pattern

      Form.populateFormSilently(formData, {
        afterPopulate: function afterPopulate(populatedData) {
          // Initialize UI elements AFTER form is populated
          firewall.initializeUIElements();
          firewall.initializeTooltips();
          firewall.initializeDockerLimitedCheckboxes(); // Update window variables for tooltips

          window.currentNetwork = response.data.network;
          window.currentSubnet = response.data.subnet;
          window.isDocker = response.data.isDocker || false;
          window.dockerSupportedServices = response.data.dockerSupportedServices || []; // For new records prefilled from URL parameters (e.g. "Allow my IP" helper)
          // mark the form dirty so Save activates. populateFormSilently resets dirty
          // state and re-disables the Save button AFTER this callback returns, so we
          // defer the call to the next tick.

          if (!response.data.id && firewall.urlParameters.network) {
            setTimeout(function () {
              return Form.dataChanged();
            }, 0);
          }
        }
      });
    });
  },

  /**
   * Check if address is IPv6.
   * @param {string} address - IP address to check.
   * @returns {boolean} True if IPv6, false if IPv4.
   */
  isIPv6Address: function isIPv6Address(address) {
    // IPv6 contains colons
    return address && address.includes(':');
  },

  /**
   * Prepare form data from API response
   * Converts API fields to form field names (network/subnet -> ipv4/ipv6 fields)
   * @param {Object} data - API response data
   * @returns {Object} Form data ready for Form.populateFormSilently()
   */
  prepareFormData: function prepareFormData(data) {
    var formData = {
      id: data.id || '',
      description: data.description || '',
      newer_block_ip: data.newer_block_ip === true,
      local_network: data.local_network === true
    }; // For new records, override network/subnet/description with URL parameters if provided

    var network = data.network || '';
    var subnet = data.subnet; // Default to /32 for new records (data.subnet is '0' from API defaults)

    if (!data.id && (!subnet || subnet === '0')) {
      subnet = '32';
    }

    if (!data.id && firewall.urlParameters.network) {
      network = firewall.urlParameters.network;
      subnet = firewall.urlParameters.subnet || '32'; // Override description with ruleName from URL if provided

      if (firewall.urlParameters.ruleName) {
        formData.description = firewall.urlParameters.ruleName;
      }
    } // Detect IP version and populate appropriate fields


    var isIPv6 = firewall.isIPv6Address(network);

    if (isIPv6) {
      // IPv6 data
      formData.ipv6_network = network;
      formData.ipv6_subnet = subnet;
      formData.ipv4_network = '';
      formData.ipv4_subnet = '';
    } else {
      // IPv4 data
      formData.ipv4_network = network;
      formData.ipv4_subnet = subnet;
      formData.ipv6_network = '';
      formData.ipv6_subnet = '';
    } // Add rule checkboxes from currentRules


    if (data.currentRules && _typeof(data.currentRules) === 'object') {
      Object.keys(data.currentRules).forEach(function (category) {
        formData["rule_".concat(category)] = data.currentRules[category] === true;
      });
    } // Build service port info and name mapping from availableRules


    window.servicePortInfo = {};
    window.serviceNameMapping = {};

    if (data.availableRules && _typeof(data.availableRules) === 'object') {
      Object.keys(data.availableRules).forEach(function (category) {
        var ruleTemplate = data.availableRules[category]; // Extract port info from rule template

        window.servicePortInfo[category] = firewall.extractPortsFromTemplate(ruleTemplate); // Map display name to category key

        var shortName = ruleTemplate.shortName || category;
        window.serviceNameMapping[shortName] = category;
      });
    }

    return formData;
  },

  /**
   * Extract port information from rule template.
   * @param {Object} ruleTemplate - Rule template from availableRules.
   * @returns {Array} Array of port information objects.
   */
  extractPortsFromTemplate: function extractPortsFromTemplate(ruleTemplate) {
    var ports = [];

    if (ruleTemplate.rules && Array.isArray(ruleTemplate.rules)) {
      ruleTemplate.rules.forEach(function (rule) {
        if (rule.protocol === 'icmp') {
          ports.push({
            protocol: 'ICMP'
          });
        } else if (rule.portfrom === rule.portto) {
          ports.push({
            port: rule.portfrom,
            protocol: rule.protocol.toUpperCase()
          });
        } else {
          ports.push({
            range: "".concat(rule.portfrom, "-").concat(rule.portto),
            protocol: rule.protocol.toUpperCase()
          });
        }
      });
    }

    return ports;
  },

  /**
   * Generate HTML for firewall rules based on API data.
   * @param {Object} data - Firewall data from API.
   */
  generateRulesHTML: function generateRulesHTML(data) {
    var $container = $('#firewall-rules-container');
    $container.empty().removeClass('loading'); // Use new naming: availableRules for templates, currentRules for actual values

    var availableRules = data.availableRules;
    var currentRules = data.currentRules || {};

    if (!availableRules) {
      console.error('No available rules data received from API');
      $container.html('<div class="ui warning message">Unable to load firewall rules. Please refresh the page.</div>');
      return;
    }

    var isDocker = data.isDocker || false;
    var dockerSupportedServices = data.dockerSupportedServices || []; // Generate HTML for each rule

    Object.keys(availableRules).forEach(function (name) {
      var ruleTemplate = availableRules[name];
      var shortName = ruleTemplate.shortName || name;
      var isLimited = isDocker && !dockerSupportedServices.includes(shortName); // Get actual value from currentRules, default to template default

      var isChecked = currentRules[name] !== undefined ? currentRules[name] : ruleTemplate.action === 'allow';
      var segmentClass = isLimited ? 'docker-limited-segment' : '';
      var checkboxClass = isLimited ? 'docker-limited-checkbox' : '';
      var iconClass = isLimited ? 'yellow exclamation triangle' : 'small info circle';
      var html = "\n                <div class=\"ui segment ".concat(segmentClass, "\">\n                    <div class=\"field\">\n                        <div class=\"ui toggle checkbox rules ").concat(checkboxClass, "\">\n                            <input type=\"checkbox\"\n                                   id=\"rule_").concat(name, "\"\n                                   name=\"rule_").concat(name, "\"\n                                   ").concat(isLimited || isChecked ? 'checked' : '', "\n                                   ").concat(isLimited ? 'disabled' : '', "\n                                   tabindex=\"0\" class=\"hidden\">\n                            <label for=\"rule_").concat(name, "\">\n                                ").concat(globalTranslate["fw_".concat(name.toLowerCase(), "Description")] || shortName, "\n                                <i class=\"").concat(iconClass, " icon service-info-icon\"\n                                   data-service=\"").concat(name, "\"\n                                   data-action=\"").concat(ruleTemplate.action, "\"\n                                   ").concat(isLimited ? 'data-limited="true"' : '', "></i>\n                            </label>\n                        </div>\n                    </div>\n                </div>\n            ");
      $container.append(html);
    }); // Re-initialize checkboxes for dynamically added elements with onChange handler

    $('#firewall-rules-container .checkbox').checkbox({
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
  },

  /**
   * Initialize UI elements.
   */
  initializeUIElements: function initializeUIElements() {
    // Initialize checkboxes (excluding dynamically added rules which are handled in generateRulesHTML)
    $('#firewall-form .checkbox').not('#firewall-rules-container .checkbox').checkbox(); // Initialize dropdowns

    $('#firewall-form .dropdown').dropdown(); // Initialize input mask for IPv4 network field only (IPv6 doesn't need input mask)

    $('input[name="ipv4_network"]').inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Auto-clear opposite protocol fields when user types

    this.setupProtocolAutoClear();
  },

  /**
   * Setup auto-clear logic for IPv4/IPv6 fields
   * When user types in IPv4 fields -> clear IPv6 fields
   * When user types in IPv6 fields -> clear IPv4 fields
   */
  setupProtocolAutoClear: function setupProtocolAutoClear() {
    var $ipv4Network = $('input[name="ipv4_network"]');
    var $ipv4Subnet = $('select[name="ipv4_subnet"]');
    var $ipv6Network = $('input[name="ipv6_network"]');
    var $ipv6Subnet = $('select[name="ipv6_subnet"]'); // When user types in IPv4 network field -> clear IPv6 fields

    $ipv4Network.on('input', function () {
      var value = $ipv4Network.val().trim();

      if (value && value !== '') {
        $ipv6Network.val('');
        $ipv6Subnet.dropdown('clear');
      }
    }); // When user selects IPv4 subnet -> clear IPv6 fields

    $ipv4Subnet.on('change', function () {
      var networkValue = $ipv4Network.val().trim();

      if (networkValue && networkValue !== '') {
        $ipv6Network.val('');
        $ipv6Subnet.dropdown('clear');
      }
    }); // When user types in IPv6 network field -> clear IPv4 fields

    $ipv6Network.on('input', function () {
      var value = $ipv6Network.val().trim();

      if (value && value !== '') {
        $ipv4Network.val('');
        $ipv4Subnet.dropdown('clear');
      }
    }); // When user selects IPv6 subnet -> clear IPv4 fields

    $ipv6Subnet.on('change', function () {
      var networkValue = $ipv6Network.val().trim();

      if (networkValue && networkValue !== '') {
        $ipv4Network.val('');
        $ipv4Subnet.dropdown('clear');
      }
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    var formData = result.data || firewall.$formObj.form('get values'); // Get IPv4 and IPv6 values

    var ipv4Network = formData.ipv4_network || '';
    var ipv4Subnet = formData.ipv4_subnet || '';
    var ipv6Network = formData.ipv6_network || '';
    var ipv6Subnet = formData.ipv6_subnet || ''; // Validate: either IPv4 OR IPv6, not both, not neither

    var hasIPv4 = ipv4Network && ipv4Network !== '';
    var hasIPv6 = ipv6Network && ipv6Network !== '';

    if (!hasIPv4 && !hasIPv6) {
      UserMessage.showError(globalTranslate.fw_ValidateEitherIPv4OrIPv6Required);
      return false;
    }

    if (hasIPv4 && hasIPv6) {
      UserMessage.showError(globalTranslate.fw_ValidateOnlyOneProtocol);
      return false;
    } // Combine selected IPv4 or IPv6 into backend-compatible network/subnet format


    formData.network = hasIPv4 ? ipv4Network : ipv6Network;
    formData.subnet = hasIPv4 ? ipv4Subnet : ipv6Subnet; // Remove separate IPv4/IPv6 fields (backend expects unified network/subnet)

    delete formData.ipv4_network;
    delete formData.ipv4_subnet;
    delete formData.ipv6_network;
    delete formData.ipv6_subnet; // Prepare currentRules data for API (simple boolean map)

    var currentRules = {};
    Object.keys(formData).forEach(function (key) {
      if (key.startsWith('rule_')) {
        var category = key.replace('rule_', ''); // Send as boolean - true = allow, false = block

        currentRules[category] = formData[key] === true;
        delete formData[key];
      }
    }); // Add currentRules to formData

    formData.currentRules = currentRules; // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool
    // Mark as new record if we don't have an ID (for correct POST/PUT selection)
    // This is critical for creating records with predefined IDs

    if (!firewall.recordId || firewall.recordId === '') {
      formData._isNew = true;
    }

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

    Form.initialize(); // Add change handlers for dynamically added checkboxes
    // This must be done AFTER Form.initialize() to ensure proper tracking

    $('#firewall-rules-container input[type="checkbox"]').on('change', function () {
      // Trigger form change event for dirty checking
      Form.dataChanged();
    });
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
    }); // Listen for checkbox changes to update tooltips (use delegation for dynamic elements)

    $('#firewall-form').on('change', '.rules input[type="checkbox"]', function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJpcHY0X25ldHdvcmsiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MiLCJpcHY2X25ldHdvcmsiLCJmd19WYWxpZGF0ZUlQdjZBZGRyZXNzIiwiZGVzY3JpcHRpb24iLCJmd19WYWxpZGF0ZVJ1bGVOYW1lIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImlzRG9ja2VyIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJjdXJyZW50TmV0d29yayIsImN1cnJlbnRTdWJuZXQiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwidXJsUGFyYW1ldGVycyIsImdldFVybFBhcmFtZXRlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGaXJld2FsbERhdGEiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJuZXR3b3JrIiwiZ2V0Iiwic3VibmV0IiwicnVsZU5hbWUiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsImdlbmVyYXRlUnVsZXNIVE1MIiwiZm9ybURhdGEiLCJwcmVwYXJlRm9ybURhdGEiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwicG9wdWxhdGVkRGF0YSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaWQiLCJzZXRUaW1lb3V0IiwiZGF0YUNoYW5nZWQiLCJpc0lQdjZBZGRyZXNzIiwiYWRkcmVzcyIsImluY2x1ZGVzIiwibmV3ZXJfYmxvY2tfaXAiLCJsb2NhbF9uZXR3b3JrIiwiaXNJUHY2IiwiaXB2Nl9zdWJuZXQiLCJpcHY0X3N1Ym5ldCIsImN1cnJlbnRSdWxlcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJhdmFpbGFibGVSdWxlcyIsInJ1bGVUZW1wbGF0ZSIsImV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZSIsInNob3J0TmFtZSIsInBvcnRzIiwiQXJyYXkiLCJpc0FycmF5IiwicnVsZSIsInByb3RvY29sIiwicHVzaCIsInBvcnRmcm9tIiwicG9ydHRvIiwicG9ydCIsInRvVXBwZXJDYXNlIiwicmFuZ2UiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25zb2xlIiwiZXJyb3IiLCJodG1sIiwibmFtZSIsImlzTGltaXRlZCIsImlzQ2hlY2tlZCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInNlZ21lbnRDbGFzcyIsImNoZWNrYm94Q2xhc3MiLCJpY29uQ2xhc3MiLCJ0b0xvd2VyQ2FzZSIsImFwcGVuZCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJub3QiLCJkcm9wZG93biIsImlucHV0bWFzayIsImFsaWFzIiwic2V0dXBQcm90b2NvbEF1dG9DbGVhciIsIiRpcHY0TmV0d29yayIsIiRpcHY0U3VibmV0IiwiJGlwdjZOZXR3b3JrIiwiJGlwdjZTdWJuZXQiLCJvbiIsInZhbCIsInRyaW0iLCJuZXR3b3JrVmFsdWUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiaXB2NE5ldHdvcmsiLCJpcHY0U3VibmV0IiwiaXB2Nk5ldHdvcmsiLCJpcHY2U3VibmV0IiwiaGFzSVB2NCIsImhhc0lQdjYiLCJmd19WYWxpZGF0ZUVpdGhlcklQdjRPcklQdjZSZXF1aXJlZCIsImZ3X1ZhbGlkYXRlT25seU9uZVByb3RvY29sIiwia2V5Iiwic3RhcnRzV2l0aCIsInJlcGxhY2UiLCJfaXNOZXciLCJjYkFmdGVyU2VuZEZvcm0iLCJ1cmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwic2VsZiIsImVhY2giLCIkaWNvbiIsInNlcnZpY2UiLCIkY2hlY2tib3giLCJjbG9zZXN0IiwiZmluZCIsInByb3AiLCJwb3J0SW5mbyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCIkc3BlY2lhbEljb24iLCJuZXdDb250ZW50IiwidXBkYXRlQ29udGVudCIsIiRpbnB1dCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsYWJlbCIsInBvcHVwIiwiZm4iLCJpcGFkZHIiLCJmIiwibWF0Y2giLCJpIiwiYSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxFOztBQU9iO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxF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QUFDLElBQUQsQ0FBRCxDQUFRMkosSUFBUixDQUFhLFNBQWIsRUFBd0IsSUFBeEI7QUFDQSxlQUFPLEtBQVA7QUFDSCxPQUpEO0FBS0gsS0EvQkQ7QUFnQ0g7QUFocUJZLENBQWpCLEMsQ0FtcUJBOztBQUNBM0osQ0FBQyxDQUFDNkssRUFBRixDQUFLaEQsSUFBTCxDQUFVRCxRQUFWLENBQW1CckgsS0FBbkIsQ0FBeUJ1SyxNQUF6QixHQUFrQyxVQUFVckssS0FBVixFQUFpQjtBQUMvQyxNQUFJc0MsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNZ0ksQ0FBQyxHQUFHdEssS0FBSyxDQUFDdUssS0FBTixDQUFZLDhDQUFaLENBQVY7O0FBQ0EsTUFBSUQsQ0FBQyxLQUFLLElBQVYsRUFBZ0I7QUFDWmhJLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJa0ksQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLENBQUMsR0FBR0gsQ0FBQyxDQUFDRSxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNUbkksUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFFBQUlnSSxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1hoSSxNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBakJELEMsQ0FtQkE7OztBQUNBL0MsQ0FBQyxDQUFDbUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnRMLEVBQUFBLFFBQVEsQ0FBQ21CLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgRm9ybUVsZW1lbnRzLCBVc2VyTWVzc2FnZSAqL1xuXG4vKipcbiAqIFRoZSBmaXJld2FsbCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgZm9ybVxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxcbiAqL1xuY29uc3QgZmlyZXdhbGwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCByZWNvcmQgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBpcHY0X25ldHdvcms6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdpcHY0X25ldHdvcmsnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0cmljdCBJUHY0OiBlYWNoIG9jdGV0IDAtMjU1XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKDI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGlwdjZfbmV0d29yazoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2lwdjZfbmV0d29yaycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RyaWN0IElQdjY6IFJGQyA0MjkxIGNvbXBsaWFudCAoYWxsIHN0YW5kYXJkIG5vdGF0aW9ucyBpbmNsdWRpbmcgY29tcHJlc3NlZCA6OilcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7N31bMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw3fTp8KFswLTlhLWZBLUZdezEsNH06KXsxLDZ9OlswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDV9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDJ9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwzfXwoWzAtOWEtZkEtRl17MSw0fTopezEsM30oOlswLTlhLWZBLUZdezEsNH0pezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDJ9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDV9fFswLTlhLWZBLUZdezEsNH06KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw2fSl8OigoOlswLTlhLWZBLUZdezEsNH0pezEsN318OikpJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NkFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemF0aW9uIGZ1bmN0aW9uIHRvIHNldCB1cCBmb3JtIGJlaGF2aW9yXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBnbG9iYWwgdmFyaWFibGVzIGZvciB0b29sdGlwcyBhbmQgRG9ja2VyIGRldGVjdGlvblxuICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHVwZGF0ZWQgd2hlbiBkYXRhIGlzIGxvYWRlZCBmcm9tIEFQSVxuICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgd2luZG93LmlzRG9ja2VyID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IFtdO1xuICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSAnJztcbiAgICAgICAgd2luZG93LmN1cnJlbnRTdWJuZXQgPSAnJztcblxuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZpcmV3YWxsLnJlY29yZElkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVhZCBVUkwgcGFyYW1ldGVycyBmb3IgcHJlZmlsbGluZyAoZS5nLiwgP25ldHdvcms9MC4wLjAuMCZzdWJuZXQ9MClcbiAgICAgICAgZmlyZXdhbGwudXJsUGFyYW1ldGVycyA9IGZpcmV3YWxsLmdldFVybFBhcmFtZXRlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gQkVGT1JFIGxvYWRpbmcgZGF0YSAobGlrZSBleHRlbnNpb24tbW9kaWZ5LmpzIHBhdHRlcm4pXG4gICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICAgIGZpcmV3YWxsLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFVSTCBwYXJhbWV0ZXJzIGZvciBwcmVmaWxsaW5nIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggbmV0d29yaywgc3VibmV0LCBhbmQgcnVsZU5hbWUgcGFyYW1ldGVyc1xuICAgICAqL1xuICAgIGdldFVybFBhcmFtZXRlcnMoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuZXR3b3JrOiBwYXJhbXMuZ2V0KCduZXR3b3JrJykgfHwgJycsXG4gICAgICAgICAgICBzdWJuZXQ6IHBhcmFtcy5nZXQoJ3N1Ym5ldCcpIHx8ICcnLFxuICAgICAgICAgICAgcnVsZU5hbWU6IHBhcmFtcy5nZXQoJ3J1bGVOYW1lJykgfHwgJydcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkRmlyZXdhbGxEYXRhKCkge1xuICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBGaXJld2FsbEFQSS5nZXRSZWNvcmQoZmlyZXdhbGwucmVjb3JkSWQgfHwgJycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfRXJyb3JMb2FkaW5nUmVjb3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZpcmV3YWxsLmZpcmV3YWxsRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGR5bmFtaWMgcnVsZXMgSFRNTCBmaXJzdFxuICAgICAgICAgICAgZmlyZXdhbGwuZ2VuZXJhdGVSdWxlc0hUTUwocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGZpcmV3YWxsLnByZXBhcmVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgLy8gVXNlIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKSBsaWtlIGV4dGVuc2lvbi1tb2RpZnkuanMgcGF0dGVyblxuICAgICAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChwb3B1bGF0ZWREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgZWxlbWVudHMgQUZURVIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVVJRWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB3aW5kb3cgdmFyaWFibGVzIGZvciB0b29sdGlwc1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSByZXNwb25zZS5kYXRhLm5ldHdvcms7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gcmVzcG9uc2UuZGF0YS5zdWJuZXQ7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIgfHwgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IHJlc3BvbnNlLmRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgfHwgW107XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzIHByZWZpbGxlZCBmcm9tIFVSTCBwYXJhbWV0ZXJzIChlLmcuIFwiQWxsb3cgbXkgSVBcIiBoZWxwZXIpXG4gICAgICAgICAgICAgICAgICAgIC8vIG1hcmsgdGhlIGZvcm0gZGlydHkgc28gU2F2ZSBhY3RpdmF0ZXMuIHBvcHVsYXRlRm9ybVNpbGVudGx5IHJlc2V0cyBkaXJ0eVxuICAgICAgICAgICAgICAgICAgICAvLyBzdGF0ZSBhbmQgcmUtZGlzYWJsZXMgdGhlIFNhdmUgYnV0dG9uIEFGVEVSIHRoaXMgY2FsbGJhY2sgcmV0dXJucywgc28gd2VcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVmZXIgdGhlIGNhbGwgdG8gdGhlIG5leHQgdGljay5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLmlkICYmIGZpcmV3YWxsLnVybFBhcmFtZXRlcnMubmV0d29yaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKCksIDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYWRkcmVzcyBpcyBJUHY2LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzIC0gSVAgYWRkcmVzcyB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBJUHY2LCBmYWxzZSBpZiBJUHY0LlxuICAgICAqL1xuICAgIGlzSVB2NkFkZHJlc3MoYWRkcmVzcykge1xuICAgICAgICAvLyBJUHY2IGNvbnRhaW5zIGNvbG9uc1xuICAgICAgICByZXR1cm4gYWRkcmVzcyAmJiBhZGRyZXNzLmluY2x1ZGVzKCc6Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgZm9ybSBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQ29udmVydHMgQVBJIGZpZWxkcyB0byBmb3JtIGZpZWxkIG5hbWVzIChuZXR3b3JrL3N1Ym5ldCAtPiBpcHY0L2lwdjYgZmllbGRzKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQVBJIHJlc3BvbnNlIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBGb3JtIGRhdGEgcmVhZHkgZm9yIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAqL1xuICAgIHByZXBhcmVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgIG5ld2VyX2Jsb2NrX2lwOiBkYXRhLm5ld2VyX2Jsb2NrX2lwID09PSB0cnVlLFxuICAgICAgICAgICAgbG9jYWxfbmV0d29yazogZGF0YS5sb2NhbF9uZXR3b3JrID09PSB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBvdmVycmlkZSBuZXR3b3JrL3N1Ym5ldC9kZXNjcmlwdGlvbiB3aXRoIFVSTCBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgIGxldCBuZXR3b3JrID0gZGF0YS5uZXR3b3JrIHx8ICcnO1xuICAgICAgICBsZXQgc3VibmV0ID0gZGF0YS5zdWJuZXQ7XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byAvMzIgZm9yIG5ldyByZWNvcmRzIChkYXRhLnN1Ym5ldCBpcyAnMCcgZnJvbSBBUEkgZGVmYXVsdHMpXG4gICAgICAgIGlmICghZGF0YS5pZCAmJiAoIXN1Ym5ldCB8fCBzdWJuZXQgPT09ICcwJykpIHtcbiAgICAgICAgICAgIHN1Ym5ldCA9ICczMic7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgZmlyZXdhbGwudXJsUGFyYW1ldGVycy5uZXR3b3JrKSB7XG4gICAgICAgICAgICBuZXR3b3JrID0gZmlyZXdhbGwudXJsUGFyYW1ldGVycy5uZXR3b3JrO1xuICAgICAgICAgICAgc3VibmV0ID0gZmlyZXdhbGwudXJsUGFyYW1ldGVycy5zdWJuZXQgfHwgJzMyJztcblxuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgZGVzY3JpcHRpb24gd2l0aCBydWxlTmFtZSBmcm9tIFVSTCBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGZpcmV3YWxsLnVybFBhcmFtZXRlcnMucnVsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICBmb3JtRGF0YS5kZXNjcmlwdGlvbiA9IGZpcmV3YWxsLnVybFBhcmFtZXRlcnMucnVsZU5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlY3QgSVAgdmVyc2lvbiBhbmQgcG9wdWxhdGUgYXBwcm9wcmlhdGUgZmllbGRzXG4gICAgICAgIGNvbnN0IGlzSVB2NiA9IGZpcmV3YWxsLmlzSVB2NkFkZHJlc3MobmV0d29yayk7XG5cbiAgICAgICAgaWYgKGlzSVB2Nikge1xuICAgICAgICAgICAgLy8gSVB2NiBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY2X25ldHdvcmsgPSBuZXR3b3JrO1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2Nl9zdWJuZXQgPSBzdWJuZXQ7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X25ldHdvcmsgPSAnJztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjRfc3VibmV0ID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJUHY0IGRhdGFcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjRfbmV0d29yayA9IG5ldHdvcms7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X3N1Ym5ldCA9IHN1Ym5ldDtcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfbmV0d29yayA9ICcnO1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2Nl9zdWJuZXQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBydWxlIGNoZWNrYm94ZXMgZnJvbSBjdXJyZW50UnVsZXNcbiAgICAgICAgaWYgKGRhdGEuY3VycmVudFJ1bGVzICYmIHR5cGVvZiBkYXRhLmN1cnJlbnRSdWxlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuY3VycmVudFJ1bGVzKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtRGF0YVtgcnVsZV8ke2NhdGVnb3J5fWBdID0gZGF0YS5jdXJyZW50UnVsZXNbY2F0ZWdvcnldID09PSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBzZXJ2aWNlIHBvcnQgaW5mbyBhbmQgbmFtZSBtYXBwaW5nIGZyb20gYXZhaWxhYmxlUnVsZXNcbiAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIGlmIChkYXRhLmF2YWlsYWJsZVJ1bGVzICYmIHR5cGVvZiBkYXRhLmF2YWlsYWJsZVJ1bGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5hdmFpbGFibGVSdWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnVsZVRlbXBsYXRlID0gZGF0YS5hdmFpbGFibGVSdWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwb3J0IGluZm8gZnJvbSBydWxlIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeV0gPSBmaXJld2FsbC5leHRyYWN0UG9ydHNGcm9tVGVtcGxhdGUocnVsZVRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAvLyBNYXAgZGlzcGxheSBuYW1lIHRvIGNhdGVnb3J5IGtleVxuICAgICAgICAgICAgICAgIGNvbnN0IHNob3J0TmFtZSA9IHJ1bGVUZW1wbGF0ZS5zaG9ydE5hbWUgfHwgY2F0ZWdvcnk7XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZ1tzaG9ydE5hbWVdID0gY2F0ZWdvcnk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBwb3J0IGluZm9ybWF0aW9uIGZyb20gcnVsZSB0ZW1wbGF0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZVRlbXBsYXRlIC0gUnVsZSB0ZW1wbGF0ZSBmcm9tIGF2YWlsYWJsZVJ1bGVzLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgcG9ydCBpbmZvcm1hdGlvbiBvYmplY3RzLlxuICAgICAqL1xuICAgIGV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZShydWxlVGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgcG9ydHMgPSBbXTtcblxuICAgICAgICBpZiAocnVsZVRlbXBsYXRlLnJ1bGVzICYmIEFycmF5LmlzQXJyYXkocnVsZVRlbXBsYXRlLnJ1bGVzKSkge1xuICAgICAgICAgICAgcnVsZVRlbXBsYXRlLnJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJ1bGUucHJvdG9jb2wgPT09ICdpY21wJykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiAnSUNNUCdcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChydWxlLnBvcnRmcm9tID09PSBydWxlLnBvcnR0bykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHJ1bGUucG9ydGZyb20sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogcnVsZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IGAke3J1bGUucG9ydGZyb219LSR7cnVsZS5wb3J0dG99YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBydWxlLnByb3RvY29sLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcG9ydHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIEhUTUwgZm9yIGZpcmV3YWxsIHJ1bGVzIGJhc2VkIG9uIEFQSSBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZVJ1bGVzSFRNTChkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyJyk7XG4gICAgICAgICRjb250YWluZXIuZW1wdHkoKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIFVzZSBuZXcgbmFtaW5nOiBhdmFpbGFibGVSdWxlcyBmb3IgdGVtcGxhdGVzLCBjdXJyZW50UnVsZXMgZm9yIGFjdHVhbCB2YWx1ZXNcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUnVsZXMgPSBkYXRhLmF2YWlsYWJsZVJ1bGVzO1xuICAgICAgICBjb25zdCBjdXJyZW50UnVsZXMgPSBkYXRhLmN1cnJlbnRSdWxlcyB8fCB7fTtcblxuICAgICAgICBpZiAoIWF2YWlsYWJsZVJ1bGVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBhdmFpbGFibGUgcnVsZXMgZGF0YSByZWNlaXZlZCBmcm9tIEFQSScpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKCc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+VW5hYmxlIHRvIGxvYWQgZmlyZXdhbGwgcnVsZXMuIFBsZWFzZSByZWZyZXNoIHRoZSBwYWdlLjwvZGl2PicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNEb2NrZXIgPSBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlO1xuICAgICAgICBjb25zdCBkb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IGRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgfHwgW107XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgSFRNTCBmb3IgZWFjaCBydWxlXG4gICAgICAgIE9iamVjdC5rZXlzKGF2YWlsYWJsZVJ1bGVzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgcnVsZVRlbXBsYXRlID0gYXZhaWxhYmxlUnVsZXNbbmFtZV07XG4gICAgICAgICAgICBjb25zdCBzaG9ydE5hbWUgPSBydWxlVGVtcGxhdGUuc2hvcnROYW1lIHx8IG5hbWU7XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBpc0RvY2tlciAmJiAhZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoc2hvcnROYW1lKTtcbiAgICAgICAgICAgIC8vIEdldCBhY3R1YWwgdmFsdWUgZnJvbSBjdXJyZW50UnVsZXMsIGRlZmF1bHQgdG8gdGVtcGxhdGUgZGVmYXVsdFxuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gY3VycmVudFJ1bGVzW25hbWVdICE9PSB1bmRlZmluZWQgPyBjdXJyZW50UnVsZXNbbmFtZV0gOiAocnVsZVRlbXBsYXRlLmFjdGlvbiA9PT0gJ2FsbG93Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZC1zZWdtZW50JyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tib3hDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZC1jaGVja2JveCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGlzTGltaXRlZCA/ICd5ZWxsb3cgZXhjbGFtYXRpb24gdHJpYW5nbGUnIDogJ3NtYWxsIGluZm8gY2lyY2xlJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudCAke3NlZ21lbnRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IHJ1bGVzICR7Y2hlY2tib3hDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ9XCJydWxlXyR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicnVsZV8ke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgfHwgaXNDaGVja2VkID8gJ2NoZWNrZWQnIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkID8gJ2Rpc2FibGVkJyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJpbmRleD1cIjBcIiBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJydWxlXyR7bmFtZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGVbYGZ3XyR7bmFtZS50b0xvd2VyQ2FzZSgpfURlc2NyaXB0aW9uYF0gfHwgc2hvcnROYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uIHNlcnZpY2UtaW5mby1pY29uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zZXJ2aWNlPVwiJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtYWN0aW9uPVwiJHtydWxlVGVtcGxhdGUuYWN0aW9ufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkID8gJ2RhdGEtbGltaXRlZD1cInRydWVcIicgOiAnJ30+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChodG1sKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjaGVja2JveGVzIGZvciBkeW5hbWljYWxseSBhZGRlZCBlbGVtZW50cyB3aXRoIG9uQ2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciAuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgKGV4Y2x1ZGluZyBkeW5hbWljYWxseSBhZGRlZCBydWxlcyB3aGljaCBhcmUgaGFuZGxlZCBpbiBnZW5lcmF0ZVJ1bGVzSFRNTClcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmNoZWNrYm94Jykubm90KCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0IG1hc2sgZm9yIElQdjQgbmV0d29yayBmaWVsZCBvbmx5IChJUHY2IGRvZXNuJ3QgbmVlZCBpbnB1dCBtYXNrKVxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiaXB2NF9uZXR3b3JrXCJdJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQXV0by1jbGVhciBvcHBvc2l0ZSBwcm90b2NvbCBmaWVsZHMgd2hlbiB1c2VyIHR5cGVzXG4gICAgICAgIHRoaXMuc2V0dXBQcm90b2NvbEF1dG9DbGVhcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBhdXRvLWNsZWFyIGxvZ2ljIGZvciBJUHY0L0lQdjYgZmllbGRzXG4gICAgICogV2hlbiB1c2VyIHR5cGVzIGluIElQdjQgZmllbGRzIC0+IGNsZWFyIElQdjYgZmllbGRzXG4gICAgICogV2hlbiB1c2VyIHR5cGVzIGluIElQdjYgZmllbGRzIC0+IGNsZWFyIElQdjQgZmllbGRzXG4gICAgICovXG4gICAgc2V0dXBQcm90b2NvbEF1dG9DbGVhcigpIHtcbiAgICAgICAgY29uc3QgJGlwdjROZXR3b3JrID0gJCgnaW5wdXRbbmFtZT1cImlwdjRfbmV0d29ya1wiXScpO1xuICAgICAgICBjb25zdCAkaXB2NFN1Ym5ldCA9ICQoJ3NlbGVjdFtuYW1lPVwiaXB2NF9zdWJuZXRcIl0nKTtcbiAgICAgICAgY29uc3QgJGlwdjZOZXR3b3JrID0gJCgnaW5wdXRbbmFtZT1cImlwdjZfbmV0d29ya1wiXScpO1xuICAgICAgICBjb25zdCAkaXB2NlN1Ym5ldCA9ICQoJ3NlbGVjdFtuYW1lPVwiaXB2Nl9zdWJuZXRcIl0nKTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgdHlwZXMgaW4gSVB2NCBuZXR3b3JrIGZpZWxkIC0+IGNsZWFyIElQdjYgZmllbGRzXG4gICAgICAgICRpcHY0TmV0d29yay5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpcHY0TmV0d29yay52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjZOZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjZTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gdXNlciBzZWxlY3RzIElQdjQgc3VibmV0IC0+IGNsZWFyIElQdjYgZmllbGRzXG4gICAgICAgICRpcHY0U3VibmV0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrVmFsdWUgPSAkaXB2NE5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKG5ldHdvcmtWYWx1ZSAmJiBuZXR3b3JrVmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjZOZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjZTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY2IG5ldHdvcmsgZmllbGQgLT4gY2xlYXIgSVB2NCBmaWVsZHNcbiAgICAgICAgJGlwdjZOZXR3b3JrLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlwdjZOZXR3b3JrLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAkaXB2NE5ldHdvcmsudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAkaXB2NFN1Ym5ldC5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiB1c2VyIHNlbGVjdHMgSVB2NiBzdWJuZXQgLT4gY2xlYXIgSVB2NCBmaWVsZHNcbiAgICAgICAgJGlwdjZTdWJuZXQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmtWYWx1ZSA9ICRpcHY2TmV0d29yay52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAobmV0d29ya1ZhbHVlICYmIG5ldHdvcmtWYWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAkaXB2NE5ldHdvcmsudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAkaXB2NFN1Ym5ldC5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHJlc3VsdC5kYXRhIHx8IGZpcmV3YWxsLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBHZXQgSVB2NCBhbmQgSVB2NiB2YWx1ZXNcbiAgICAgICAgY29uc3QgaXB2NE5ldHdvcmsgPSBmb3JtRGF0YS5pcHY0X25ldHdvcmsgfHwgJyc7XG4gICAgICAgIGNvbnN0IGlwdjRTdWJuZXQgPSBmb3JtRGF0YS5pcHY0X3N1Ym5ldCB8fCAnJztcbiAgICAgICAgY29uc3QgaXB2Nk5ldHdvcmsgPSBmb3JtRGF0YS5pcHY2X25ldHdvcmsgfHwgJyc7XG4gICAgICAgIGNvbnN0IGlwdjZTdWJuZXQgPSBmb3JtRGF0YS5pcHY2X3N1Ym5ldCB8fCAnJztcblxuICAgICAgICAvLyBWYWxpZGF0ZTogZWl0aGVyIElQdjQgT1IgSVB2Niwgbm90IGJvdGgsIG5vdCBuZWl0aGVyXG4gICAgICAgIGNvbnN0IGhhc0lQdjQgPSBpcHY0TmV0d29yayAmJiBpcHY0TmV0d29yayAhPT0gJyc7XG4gICAgICAgIGNvbnN0IGhhc0lQdjYgPSBpcHY2TmV0d29yayAmJiBpcHY2TmV0d29yayAhPT0gJyc7XG5cbiAgICAgICAgaWYgKCFoYXNJUHY0ICYmICFoYXNJUHY2KSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlRWl0aGVySVB2NE9ySVB2NlJlcXVpcmVkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzSVB2NCAmJiBoYXNJUHY2KSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlT25seU9uZVByb3RvY29sKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbWJpbmUgc2VsZWN0ZWQgSVB2NCBvciBJUHY2IGludG8gYmFja2VuZC1jb21wYXRpYmxlIG5ldHdvcmsvc3VibmV0IGZvcm1hdFxuICAgICAgICBmb3JtRGF0YS5uZXR3b3JrID0gaGFzSVB2NCA/IGlwdjROZXR3b3JrIDogaXB2Nk5ldHdvcms7XG4gICAgICAgIGZvcm1EYXRhLnN1Ym5ldCA9IGhhc0lQdjQgPyBpcHY0U3VibmV0IDogaXB2NlN1Ym5ldDtcblxuICAgICAgICAvLyBSZW1vdmUgc2VwYXJhdGUgSVB2NC9JUHY2IGZpZWxkcyAoYmFja2VuZCBleHBlY3RzIHVuaWZpZWQgbmV0d29yay9zdWJuZXQpXG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY0X25ldHdvcms7XG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY0X3N1Ym5ldDtcbiAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmlwdjZfbmV0d29yaztcbiAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmlwdjZfc3VibmV0O1xuXG4gICAgICAgIC8vIFByZXBhcmUgY3VycmVudFJ1bGVzIGRhdGEgZm9yIEFQSSAoc2ltcGxlIGJvb2xlYW4gbWFwKVxuICAgICAgICBjb25zdCBjdXJyZW50UnVsZXMgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXMoZm9ybURhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncnVsZV8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0ga2V5LnJlcGxhY2UoJ3J1bGVfJywgJycpO1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgYXMgYm9vbGVhbiAtIHRydWUgPSBhbGxvdywgZmFsc2UgPSBibG9ja1xuICAgICAgICAgICAgICAgIGN1cnJlbnRSdWxlc1tjYXRlZ29yeV0gPSBmb3JtRGF0YVtrZXldID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY3VycmVudFJ1bGVzIHRvIGZvcm1EYXRhXG4gICAgICAgIGZvcm1EYXRhLmN1cnJlbnRSdWxlcyA9IGN1cnJlbnRSdWxlcztcblxuICAgICAgICAvLyBuZXdlcl9ibG9ja19pcCBhbmQgbG9jYWxfbmV0d29yayBhcmUgYWxyZWFkeSBib29sZWFuIHRoYW5rcyB0byBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbFxuXG4gICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEIChmb3IgY29ycmVjdCBQT1NUL1BVVCBzZWxlY3Rpb24pXG4gICAgICAgIC8vIFRoaXMgaXMgY3JpdGljYWwgZm9yIGNyZWF0aW5nIHJlY29yZHMgd2l0aCBwcmVkZWZpbmVkIElEc1xuICAgICAgICBpZiAoIWZpcmV3YWxsLnJlY29yZElkIHx8IGZpcmV3YWxsLnJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgZm9ybURhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5kYXRhID0gZm9ybURhdGE7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmaXJld2FsbC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmlyZXdhbGwuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmaXJld2FsbC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBTZXR1cCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEZpcmV3YWxsQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L2A7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGNoZWNrYm94ZXNcbiAgICAgICAgLy8gVGhpcyBtdXN0IGJlIGRvbmUgQUZURVIgRm9ybS5pbml0aWFsaXplKCkgdG8gZW5zdXJlIHByb3BlciB0cmFja2luZ1xuICAgICAgICAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgZXZlbnQgZm9yIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzZXJ2aWNlIHJ1bGVzXG4gICAgICAgICQoJy5zZXJ2aWNlLWluZm8taWNvbicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGljb24uZGF0YSgnbGltaXRlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBjaGVja2JveCBmb3IgdGhpcyBzZXJ2aWNlXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkaWNvbi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGluaXRpYWwgYWN0aW9uIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGluaXRpYWwgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICBjb25zdCBwb3J0SW5mbyA9IHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bc2VydmljZV0gfHwgW107XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgIHNlcnZpY2UsIFxuICAgICAgICAgICAgICAgIGFjdGlvbiwgXG4gICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyLCBcbiAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsIFxuICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICBpc0xpbWl0ZWQgJiYgd2luZG93LmlzRG9ja2VyIC8vIFNob3cgY29weSBidXR0b24gb25seSBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkaWNvbiwge1xuICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgndG9vbHRpcEljb24nLCAkaWNvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc3BlY2lhbCBjaGVja2JveGVzXG4gICAgICAgICQoJy5zcGVjaWFsLWNoZWNrYm94LWluZm8nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICRpY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgdHlwZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZChgaW5wdXRbbmFtZT1cIiR7dHlwZX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGluaXRpYWwgc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGluaXRpYWwgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgbmV0d29yayxcbiAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCB3aXRoIGNvbXBhY3Qgd2lkdGggZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkaWNvbiwge1xuICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIHRvIGljb24gb24gY2hlY2tib3ggZm9yIHVwZGF0ZXNcbiAgICAgICAgICAgICRjaGVja2JveC5kYXRhKCdzcGVjaWFsVG9vbHRpcEljb24nLCAkaWNvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBjaGVja2JveCBjaGFuZ2VzIHRvIHVwZGF0ZSB0b29sdGlwcyAodXNlIGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHMpXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtJykub24oJ2NoYW5nZScsICcucnVsZXMgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkY2hlY2tib3guZGF0YSgndG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIGNvbnN0ICRzcGVjaWFsSWNvbiA9ICRjaGVja2JveC5kYXRhKCdzcGVjaWFsVG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRpY29uICYmICRpY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZpY2UgPSAkaWNvbi5kYXRhKCdzZXJ2aWNlJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGljb24uZGF0YSgnbGltaXRlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJykgPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2UsIFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLCBcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICAgICAgcG9ydEluZm8sIFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQgJiYgd2luZG93LmlzRG9ja2VyXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkaWNvbiwgbmV3Q29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkc3BlY2lhbEljb24gJiYgJHNwZWNpYWxJY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkc3BlY2lhbEljb24uZGF0YSgndHlwZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzQ2hlY2tlZFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy51cGRhdGVDb250ZW50KCRzcGVjaWFsSWNvbiwgbmV3Q29udGVudCwge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3Zlcnkgd2lkZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERvY2tlciBsaW1pdGVkIGNoZWNrYm94ZXMgLSBwcmV2ZW50IHRoZW0gZnJvbSBiZWluZyB0b2dnbGVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pc0RvY2tlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcuZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRW5zdXJlIGNoZWNrYm94IGlzIGFsd2F5cyBjaGVja2VkXG4gICAgICAgICAgICAkaW5wdXQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgdmlzdWFsIGRpc2FibGVkIHN0YXRlXG4gICAgICAgICAgICAkY2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2xpY2sgZXZlbnRzXG4gICAgICAgICAgICAkY2hlY2tib3gub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgYSB0ZW1wb3JhcnkgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICRjaGVja2JveC5maW5kKCdsYWJlbCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGxhYmVsLmZpbmQoJy5zZXJ2aWNlLWluZm8taWNvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHRvb2x0aXAgdG8gc2hvd1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2hlY2tib3ggc3RhdGUgY2hhbmdlc1xuICAgICAgICAgICAgJGlucHV0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQodGhpcykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBJUCBhZGRyZXNzXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBmaXJld2FsbCBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGwuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==