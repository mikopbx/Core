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
    } // DON'T initialize Form here - wait until after dynamic content is loaded
    // firewall.initializeForm();
    // Load firewall data from API


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
        UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord);
        return;
      }

      firewall.firewallData = response.data; // Populate form and initialize elements

      firewall.populateForm(response.data); // Initialize UI elements after data is loaded

      firewall.initializeUIElements();
      firewall.initializeTooltips();
      firewall.initializeDockerLimitedCheckboxes(); // Initialize Form AFTER all dynamic content is loaded

      firewall.initializeForm();
    });
  },

  /**
   * Populate form with firewall data.
   * @param {Object} data - Firewall data.
   */
  populateForm: function populateForm(data) {
    // Generate rules HTML first
    firewall.generateRulesHTML(data); // Populate form fields manually since Form.js is not initialized yet
    // Set basic fields

    if (data.id) {
      $('#firewall-form input[name="id"]').val(data.id);
    }

    $('#firewall-form input[name="network"]').val(data.network || '0.0.0.0');
    $('#firewall-form input[name="subnet"]').val(data.subnet || '0');
    $('#firewall-form input[name="description"]').val(data.description || ''); // Set checkboxes

    var $newerBlockIp = $('#firewall-form input[name="newer_block_ip"]');

    if ($newerBlockIp.length) {
      $newerBlockIp.prop('checked', data.newer_block_ip === true);
    }

    var $localNetwork = $('#firewall-form input[name="local_network"]');

    if ($localNetwork.length) {
      $localNetwork.prop('checked', data.local_network === true);
    } // Set rule checkboxes from currentRules


    if (data.currentRules && _typeof(data.currentRules) === 'object') {
      Object.keys(data.currentRules).forEach(function (category) {
        var $checkbox = $("#rule_".concat(category));

        if ($checkbox.length) {
          $checkbox.prop('checked', data.currentRules[category] === true);
        }
      });
    } // Update window variables for tooltips


    window.currentNetwork = data.network;
    window.currentSubnet = data.subnet;
    window.isDocker = data.isDocker || false;
    window.dockerSupportedServices = data.dockerSupportedServices || []; // Build service port info and name mapping from availableRules

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
    }); // Re-initialize checkboxes for dynamically added elements

    $('#firewall-rules-container .checkbox').checkbox();
  },

  /**
   * Initialize UI elements.
   */
  initializeUIElements: function initializeUIElements() {
    // Initialize checkboxes (excluding dynamically added rules which are handled in generateRulesHTML)
    $('#firewall-form .checkbox').not('#firewall-rules-container .checkbox').checkbox(); // Initialize dropdowns

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
    var formData = result.data || firewall.$formObj.form('get values'); // Prepare currentRules data for API (simple boolean map)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyIsImRlc2NyaXB0aW9uIiwiZndfVmFsaWRhdGVSdWxlTmFtZSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJzZXJ2aWNlUG9ydEluZm8iLCJzZXJ2aWNlTmFtZU1hcHBpbmciLCJpc0RvY2tlciIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiY3VycmVudE5ldHdvcmsiLCJjdXJyZW50U3VibmV0IiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJsYXN0U2VnbWVudCIsImxlbmd0aCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaW5pdGlhbGl6ZUZvcm0iLCJnZW5lcmF0ZVJ1bGVzSFRNTCIsImlkIiwidmFsIiwic3VibmV0IiwiJG5ld2VyQmxvY2tJcCIsInByb3AiLCJuZXdlcl9ibG9ja19pcCIsIiRsb2NhbE5ldHdvcmsiLCJsb2NhbF9uZXR3b3JrIiwiY3VycmVudFJ1bGVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsIiRjaGVja2JveCIsImF2YWlsYWJsZVJ1bGVzIiwicnVsZVRlbXBsYXRlIiwiZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlIiwic2hvcnROYW1lIiwicG9ydHMiLCJBcnJheSIsImlzQXJyYXkiLCJydWxlIiwicHJvdG9jb2wiLCJwdXNoIiwicG9ydGZyb20iLCJwb3J0dG8iLCJwb3J0IiwidG9VcHBlckNhc2UiLCJyYW5nZSIsIiRjb250YWluZXIiLCJlbXB0eSIsImNvbnNvbGUiLCJlcnJvciIsImh0bWwiLCJuYW1lIiwiaXNMaW1pdGVkIiwiaW5jbHVkZXMiLCJpc0NoZWNrZWQiLCJ1bmRlZmluZWQiLCJhY3Rpb24iLCJzZWdtZW50Q2xhc3MiLCJjaGVja2JveENsYXNzIiwiaWNvbkNsYXNzIiwidG9Mb3dlckNhc2UiLCJhcHBlbmQiLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtRGF0YSIsImZvcm0iLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib24iLCJkYXRhQ2hhbmdlZCIsInNlbGYiLCJlYWNoIiwiJGljb24iLCJzZXJ2aWNlIiwiY2xvc2VzdCIsImZpbmQiLCJwb3J0SW5mbyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCIkc3BlY2lhbEljb24iLCJuZXdDb250ZW50IiwidXBkYXRlQ29udGVudCIsIiRpbnB1dCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsYWJlbCIsInBvcHVwIiwiZm4iLCJpcGFkZHIiLCJ2YWx1ZSIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEU7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBWEc7O0FBYWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBakJEOztBQW1CYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTEMsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRixLQURFO0FBVVhDLElBQUFBLFdBQVcsRUFBRTtBQUNUTixNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZFO0FBVkYsR0F4QkY7QUE2Q2I7QUFDQUMsRUFBQUEsVUE5Q2Esd0JBOENBO0FBQ1Q7QUFDQTtBQUNBQyxJQUFBQSxNQUFNLENBQUNDLGVBQVAsR0FBeUIsRUFBekI7QUFDQUQs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QWEsU0FBYixFQUF3QixJQUF4QjtBQUNBLGVBQU8sS0FBUDtBQUNILE9BSkQ7QUFLSCxLQS9CRDtBQWdDSDtBQWpnQlksQ0FBakIsQyxDQW9nQkE7O0FBQ0FoRCxDQUFDLENBQUMwSSxFQUFGLENBQUt6QyxJQUFMLENBQVVGLFFBQVYsQ0FBbUJ6RixLQUFuQixDQUF5QnFJLE1BQXpCLEdBQWtDLFVBQVVDLEtBQVYsRUFBaUI7QUFDL0MsTUFBSTNHLE1BQU0sR0FBRyxJQUFiO0FBQ0EsTUFBTTRHLENBQUMsR0FBR0QsS0FBSyxDQUFDRSxLQUFOLENBQVksOENBQVosQ0FBVjs7QUFDQSxNQUFJRCxDQUFDLEtBQUssSUFBVixFQUFnQjtBQUNaNUcsSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSCxHQUZELE1BRU87QUFDSCxTQUFLLElBQUk4RyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHLENBQXBCLEVBQXVCQSxDQUFDLElBQUksQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUMsQ0FBQyxHQUFHSCxDQUFDLENBQUNFLENBQUQsQ0FBWDs7QUFDQSxVQUFJQyxDQUFDLEdBQUcsR0FBUixFQUFhO0FBQ1QvRyxRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsUUFBSTRHLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTyxFQUFYLEVBQWU7QUFDWDVHLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FqQkQsQyxDQW1CQTs7O0FBQ0FqQyxDQUFDLENBQUNpSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcEosRUFBQUEsUUFBUSxDQUFDZSxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgZmlyZXdhbGxUb29sdGlwcywgRmlyZXdhbGxBUEksIEZvcm1FbGVtZW50cywgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBUaGUgZmlyZXdhbGwgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZpcmV3YWxsIGZvcm1cbiAqXG4gKiBAbW9kdWxlIGZpcmV3YWxsXG4gKi9cbmNvbnN0IGZpcmV3YWxsID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmaXJld2FsbC1mb3JtJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgcmVjb3JkIElELlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25ldHdvcmsnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemF0aW9uIGZ1bmN0aW9uIHRvIHNldCB1cCBmb3JtIGJlaGF2aW9yXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBnbG9iYWwgdmFyaWFibGVzIGZvciB0b29sdGlwcyBhbmQgRG9ja2VyIGRldGVjdGlvblxuICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHVwZGF0ZWQgd2hlbiBkYXRhIGlzIGxvYWRlZCBmcm9tIEFQSVxuICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgd2luZG93LmlzRG9ja2VyID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IFtdO1xuICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSAnJztcbiAgICAgICAgd2luZG93LmN1cnJlbnRTdWJuZXQgPSAnJztcblxuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZpcmV3YWxsLnJlY29yZElkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRE9OJ1QgaW5pdGlhbGl6ZSBGb3JtIGhlcmUgLSB3YWl0IHVudGlsIGFmdGVyIGR5bmFtaWMgY29udGVudCBpcyBsb2FkZWRcbiAgICAgICAgLy8gZmlyZXdhbGwuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgICAgZmlyZXdhbGwubG9hZEZpcmV3YWxsRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIGZpcmV3YWxsLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0UmVjb3JkKGZpcmV3YWxsLnJlY29yZElkIHx8ICcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGZpcmV3YWxsLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yTG9hZGluZ1JlY29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBmaXJld2FsbC5maXJld2FsbERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBmaXJld2FsbC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgZWxlbWVudHMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVVSUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gQUZURVIgYWxsIGR5bmFtaWMgY29udGVudCBpcyBsb2FkZWRcbiAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGZpcmV3YWxsIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhLlxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHJ1bGVzIEhUTUwgZmlyc3RcbiAgICAgICAgZmlyZXdhbGwuZ2VuZXJhdGVSdWxlc0hUTUwoZGF0YSk7XG5cbiAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSBmaWVsZHMgbWFudWFsbHkgc2luY2UgRm9ybS5qcyBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIFNldCBiYXNpYyBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJpZFwiXScpLnZhbChkYXRhLmlkKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwibmV0d29ya1wiXScpLnZhbChkYXRhLm5ldHdvcmsgfHwgJzAuMC4wLjAnKTtcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cInN1Ym5ldFwiXScpLnZhbChkYXRhLnN1Ym5ldCB8fCAnMCcpO1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS52YWwoZGF0YS5kZXNjcmlwdGlvbiB8fCAnJyk7XG5cbiAgICAgICAgLy8gU2V0IGNoZWNrYm94ZXNcbiAgICAgICAgY29uc3QgJG5ld2VyQmxvY2tJcCA9ICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJuZXdlcl9ibG9ja19pcFwiXScpO1xuICAgICAgICBpZiAoJG5ld2VyQmxvY2tJcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRuZXdlckJsb2NrSXAucHJvcCgnY2hlY2tlZCcsIGRhdGEubmV3ZXJfYmxvY2tfaXAgPT09IHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGxvY2FsTmV0d29yayA9ICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJsb2NhbF9uZXR3b3JrXCJdJyk7XG4gICAgICAgIGlmICgkbG9jYWxOZXR3b3JrLmxlbmd0aCkge1xuICAgICAgICAgICAgJGxvY2FsTmV0d29yay5wcm9wKCdjaGVja2VkJywgZGF0YS5sb2NhbF9uZXR3b3JrID09PSB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBydWxlIGNoZWNrYm94ZXMgZnJvbSBjdXJyZW50UnVsZXNcbiAgICAgICAgaWYgKGRhdGEuY3VycmVudFJ1bGVzICYmIHR5cGVvZiBkYXRhLmN1cnJlbnRSdWxlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuY3VycmVudFJ1bGVzKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAjcnVsZV8ke2NhdGVnb3J5fWApO1xuICAgICAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRjaGVja2JveC5wcm9wKCdjaGVja2VkJywgZGF0YS5jdXJyZW50UnVsZXNbY2F0ZWdvcnldID09PSB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB3aW5kb3cgdmFyaWFibGVzIGZvciB0b29sdGlwc1xuICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSBkYXRhLm5ldHdvcms7XG4gICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gZGF0YS5zdWJuZXQ7XG4gICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IGRhdGEuaXNEb2NrZXIgfHwgZmFsc2U7XG4gICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IGRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgfHwgW107XG5cbiAgICAgICAgLy8gQnVpbGQgc2VydmljZSBwb3J0IGluZm8gYW5kIG5hbWUgbWFwcGluZyBmcm9tIGF2YWlsYWJsZVJ1bGVzXG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVSdWxlcyAmJiB0eXBlb2YgZGF0YS5hdmFpbGFibGVSdWxlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuYXZhaWxhYmxlUnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGRhdGEuYXZhaWxhYmxlUnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcG9ydCBpbmZvIGZyb20gcnVsZSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnldID0gZmlyZXdhbGwuZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlKHJ1bGVUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgLy8gTWFwIGRpc3BsYXkgbmFtZSB0byBjYXRlZ29yeSBrZXlcbiAgICAgICAgICAgICAgICBjb25zdCBzaG9ydE5hbWUgPSBydWxlVGVtcGxhdGUuc2hvcnROYW1lIHx8IGNhdGVnb3J5O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2hvcnROYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBwb3J0IGluZm9ybWF0aW9uIGZyb20gcnVsZSB0ZW1wbGF0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZVRlbXBsYXRlIC0gUnVsZSB0ZW1wbGF0ZSBmcm9tIGF2YWlsYWJsZVJ1bGVzLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgcG9ydCBpbmZvcm1hdGlvbiBvYmplY3RzLlxuICAgICAqL1xuICAgIGV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZShydWxlVGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgcG9ydHMgPSBbXTtcblxuICAgICAgICBpZiAocnVsZVRlbXBsYXRlLnJ1bGVzICYmIEFycmF5LmlzQXJyYXkocnVsZVRlbXBsYXRlLnJ1bGVzKSkge1xuICAgICAgICAgICAgcnVsZVRlbXBsYXRlLnJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJ1bGUucHJvdG9jb2wgPT09ICdpY21wJykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiAnSUNNUCdcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChydWxlLnBvcnRmcm9tID09PSBydWxlLnBvcnR0bykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHJ1bGUucG9ydGZyb20sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogcnVsZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IGAke3J1bGUucG9ydGZyb219LSR7cnVsZS5wb3J0dG99YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBydWxlLnByb3RvY29sLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcG9ydHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIEhUTUwgZm9yIGZpcmV3YWxsIHJ1bGVzIGJhc2VkIG9uIEFQSSBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZVJ1bGVzSFRNTChkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyJyk7XG4gICAgICAgICRjb250YWluZXIuZW1wdHkoKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIFVzZSBuZXcgbmFtaW5nOiBhdmFpbGFibGVSdWxlcyBmb3IgdGVtcGxhdGVzLCBjdXJyZW50UnVsZXMgZm9yIGFjdHVhbCB2YWx1ZXNcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUnVsZXMgPSBkYXRhLmF2YWlsYWJsZVJ1bGVzO1xuICAgICAgICBjb25zdCBjdXJyZW50UnVsZXMgPSBkYXRhLmN1cnJlbnRSdWxlcyB8fCB7fTtcblxuICAgICAgICBpZiAoIWF2YWlsYWJsZVJ1bGVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBhdmFpbGFibGUgcnVsZXMgZGF0YSByZWNlaXZlZCBmcm9tIEFQSScpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKCc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+VW5hYmxlIHRvIGxvYWQgZmlyZXdhbGwgcnVsZXMuIFBsZWFzZSByZWZyZXNoIHRoZSBwYWdlLjwvZGl2PicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNEb2NrZXIgPSBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlO1xuICAgICAgICBjb25zdCBkb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IGRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgfHwgW107XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgSFRNTCBmb3IgZWFjaCBydWxlXG4gICAgICAgIE9iamVjdC5rZXlzKGF2YWlsYWJsZVJ1bGVzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgcnVsZVRlbXBsYXRlID0gYXZhaWxhYmxlUnVsZXNbbmFtZV07XG4gICAgICAgICAgICBjb25zdCBzaG9ydE5hbWUgPSBydWxlVGVtcGxhdGUuc2hvcnROYW1lIHx8IG5hbWU7XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBpc0RvY2tlciAmJiAhZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoc2hvcnROYW1lKTtcbiAgICAgICAgICAgIC8vIEdldCBhY3R1YWwgdmFsdWUgZnJvbSBjdXJyZW50UnVsZXMsIGRlZmF1bHQgdG8gdGVtcGxhdGUgZGVmYXVsdFxuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gY3VycmVudFJ1bGVzW25hbWVdICE9PSB1bmRlZmluZWQgPyBjdXJyZW50UnVsZXNbbmFtZV0gOiAocnVsZVRlbXBsYXRlLmFjdGlvbiA9PT0gJ2FsbG93Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZC1zZWdtZW50JyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tib3hDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZC1jaGVja2JveCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGlzTGltaXRlZCA/ICd5ZWxsb3cgZXhjbGFtYXRpb24gdHJpYW5nbGUnIDogJ3NtYWxsIGluZm8gY2lyY2xlJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudCAke3NlZ21lbnRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IHJ1bGVzICR7Y2hlY2tib3hDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ9XCJydWxlXyR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicnVsZV8ke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgfHwgaXNDaGVja2VkID8gJ2NoZWNrZWQnIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkID8gJ2Rpc2FibGVkJyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJpbmRleD1cIjBcIiBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJydWxlXyR7bmFtZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGVbYGZ3XyR7bmFtZS50b0xvd2VyQ2FzZSgpfURlc2NyaXB0aW9uYF0gfHwgc2hvcnROYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uIHNlcnZpY2UtaW5mby1pY29uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zZXJ2aWNlPVwiJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtYWN0aW9uPVwiJHtydWxlVGVtcGxhdGUuYWN0aW9ufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkID8gJ2RhdGEtbGltaXRlZD1cInRydWVcIicgOiAnJ30+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChodG1sKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjaGVja2JveGVzIGZvciBkeW5hbWljYWxseSBhZGRlZCBlbGVtZW50c1xuICAgICAgICAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgKGV4Y2x1ZGluZyBkeW5hbWljYWxseSBhZGRlZCBydWxlcyB3aGljaCBhcmUgaGFuZGxlZCBpbiBnZW5lcmF0ZVJ1bGVzSFRNTClcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmNoZWNrYm94Jykubm90KCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0IG1hc2sgZm9yIG5ldHdvcmsgZmllbGQgKElQIGFkZHJlc3MpXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJuZXR3b3JrXCJdJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHJlc3VsdC5kYXRhIHx8IGZpcmV3YWxsLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBQcmVwYXJlIGN1cnJlbnRSdWxlcyBkYXRhIGZvciBBUEkgKHNpbXBsZSBib29sZWFuIG1hcClcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKGZvcm1EYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3J1bGVfJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGtleS5yZXBsYWNlKCdydWxlXycsICcnKTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIGJvb2xlYW4gLSB0cnVlID0gYWxsb3csIGZhbHNlID0gYmxvY2tcbiAgICAgICAgICAgICAgICBjdXJyZW50UnVsZXNbY2F0ZWdvcnldID0gZm9ybURhdGFba2V5XSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnJlbnRSdWxlcyB0byBmb3JtRGF0YVxuICAgICAgICBmb3JtRGF0YS5jdXJyZW50UnVsZXMgPSBjdXJyZW50UnVsZXM7XG5cbiAgICAgICAgLy8gbmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmsgYXJlIGFscmVhZHkgYm9vbGVhbiB0aGFua3MgdG8gY29udmVydENoZWNrYm94ZXNUb0Jvb2xcblxuICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9yIGNvcnJlY3QgUE9TVC9QVVQgc2VsZWN0aW9uKVxuICAgICAgICAvLyBUaGlzIGlzIGNyaXRpY2FsIGZvciBjcmVhdGluZyByZWNvcmRzIHdpdGggcHJlZGVmaW5lZCBJRHNcbiAgICAgICAgaWYgKCFmaXJld2FsbC5yZWNvcmRJZCB8fCBmaXJld2FsbC5yZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmlyZXdhbGwuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZpcmV3YWxsLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBGaXJld2FsbEFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9gO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBhZGRlZCBjaGVja2JveGVzXG4gICAgICAgIC8vIFRoaXMgbXVzdCBiZSBkb25lIEFGVEVSIEZvcm0uaW5pdGlhbGl6ZSgpIHRvIGVuc3VyZSBwcm9wZXIgdHJhY2tpbmdcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGV2ZW50IGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBydWxlc1xuICAgICAgICAkKCcuc2VydmljZS1pbmZvLWljb24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9ICRpY29uLmRhdGEoJ3NlcnZpY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgc2VydmljZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIGFjdGlvbiBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKSA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgIG5ldHdvcmssIFxuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICBwb3J0SW5mbywgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlciAvLyBTaG93IGNvcHkgYnV0dG9uIG9ubHkgZm9yIERvY2tlciBsaW1pdGVkIHNlcnZpY2VzXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAkKCcuc3BlY2lhbC1jaGVja2JveC1pbmZvJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkaWNvbi5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHR5cGVcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoYGlucHV0W25hbWU9XCIke3R5cGV9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudChcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgaXNDaGVja2VkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAndmVyeSB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgY2hlY2tib3ggY2hhbmdlcyB0byB1cGRhdGUgdG9vbHRpcHMgKHVzZSBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybScpLm9uKCdjaGFuZ2UnLCAnLnJ1bGVzIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBjb25zdCAkc3BlY2lhbEljb24gPSAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaWNvbiAmJiAkaWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLnVwZGF0ZUNvbnRlbnQoJGljb24sIG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHNwZWNpYWxJY29uICYmICRzcGVjaWFsSWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJHNwZWNpYWxJY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkc3BlY2lhbEljb24sIG5ld0NvbnRlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEb2NrZXIgbGltaXRlZCBjaGVja2JveGVzIC0gcHJldmVudCB0aGVtIGZyb20gYmVpbmcgdG9nZ2xlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnLmRvY2tlci1saW1pdGVkLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVuc3VyZSBjaGVja2JveCBpcyBhbHdheXMgY2hlY2tlZFxuICAgICAgICAgICAgJGlucHV0LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHZpc3VhbCBkaXNhYmxlZCBzdGF0ZVxuICAgICAgICAgICAgJGNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsaWNrIGV2ZW50c1xuICAgICAgICAgICAgJGNoZWNrYm94Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgdGVtcG9yYXJ5IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkY2hlY2tib3guZmluZCgnbGFiZWwnKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRsYWJlbC5maW5kKCcuc2VydmljZS1pbmZvLWljb24nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB0b29sdGlwIHRvIHNob3dcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNoZWNrYm94IHN0YXRlIGNoYW5nZXNcbiAgICAgICAgICAgICRpbnB1dC5vbignY2hhbmdlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgSVAgYWRkcmVzc1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgZmlyZXdhbGwgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=