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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyIsImRlc2NyaXB0aW9uIiwiZndfVmFsaWRhdGVSdWxlTmFtZSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJzZXJ2aWNlUG9ydEluZm8iLCJzZXJ2aWNlTmFtZU1hcHBpbmciLCJpc0RvY2tlciIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiY3VycmVudE5ldHdvcmsiLCJjdXJyZW50U3VibmV0IiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJsYXN0U2VnbWVudCIsImxlbmd0aCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaW5pdGlhbGl6ZUZvcm0iLCJnZW5lcmF0ZVJ1bGVzSFRNTCIsImlkIiwidmFsIiwic3VibmV0IiwiJG5ld2VyQmxvY2tJcCIsInByb3AiLCJuZXdlcl9ibG9ja19pcCIsIiRsb2NhbE5ldHdvcmsiLCJsb2NhbF9uZXR3b3JrIiwiY3VycmVudFJ1bGVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsIiRjaGVja2JveCIsImF2YWlsYWJsZVJ1bGVzIiwicnVsZVRlbXBsYXRlIiwiZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlIiwic2hvcnROYW1lIiwicG9ydHMiLCJBcnJheSIsImlzQXJyYXkiLCJydWxlIiwicHJvdG9jb2wiLCJwdXNoIiwicG9ydGZyb20iLCJwb3J0dG8iLCJwb3J0IiwidG9VcHBlckNhc2UiLCJyYW5nZSIsIiRjb250YWluZXIiLCJlbXB0eSIsImNvbnNvbGUiLCJlcnJvciIsImh0bWwiLCJuYW1lIiwiaXNMaW1pdGVkIiwiaW5jbHVkZXMiLCJpc0NoZWNrZWQiLCJ1bmRlZmluZWQiLCJhY3Rpb24iLCJzZWdtZW50Q2xhc3MiLCJjaGVja2JveENsYXNzIiwiaWNvbkNsYXNzIiwidG9Mb3dlckNhc2UiLCJhcHBlbmQiLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtRGF0YSIsImZvcm0iLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib24iLCJkYXRhQ2hhbmdlZCIsInNlbGYiLCJlYWNoIiwiJGljb24iLCJzZXJ2aWNlIiwiY2xvc2VzdCIsImZpbmQiLCJwb3J0SW5mbyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCIkc3BlY2lhbEljb24iLCJuZXdDb250ZW50IiwidXBkYXRlQ29udGVudCIsIiRpbnB1dCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsYWJlbCIsInBvcHVwIiwiZm4iLCJpcGFkZHIiLCJ2YWx1ZSIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEU7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBWEc7O0FBYWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBakJEOztBQW1CYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTEMsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRixLQURFO0FBVVhDLElBQUFBLFdBQVcsRUFBRTtBQUNUTixNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZFO0FBVkYsR0F4QkY7QUE2Q2I7QUFDQUMsRUFBQUEsVUE5Q2Esd0JBOENBO0FBQ1Q7QUFDQTtBQUNBQyxJQUFBQSxNQUFNLENBQUNDLGVBQVAsR0FBeUIsRUFBekI7QUFDQUQsSUFBQUEsTUFB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bkIsQ0FBeUJvSSxNQUF6QixHQUFrQyxVQUFVQyxLQUFWLEVBQWlCO0FBQy9DLE1BQUkxRyxNQUFNLEdBQUcsSUFBYjtBQUNBLE1BQU0yRyxDQUFDLEdBQUdELEtBQUssQ0FBQ0UsS0FBTixDQUFZLDhDQUFaLENBQVY7O0FBQ0EsTUFBSUQsQ0FBQyxLQUFLLElBQVYsRUFBZ0I7QUFDWjNHLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJNkcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLENBQUMsR0FBR0gsQ0FBQyxDQUFDRSxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNUOUcsUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFFBQUkyRyxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1gzRyxNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBakJELEMsQ0FtQkE7OztBQUNBakMsQ0FBQyxDQUFDZ0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5KLEVBQUFBLFFBQVEsQ0FBQ2UsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIGZpcmV3YWxsVG9vbHRpcHMsIEZpcmV3YWxsQVBJLCBGb3JtRWxlbWVudHMsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogVGhlIGZpcmV3YWxsIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGaXJld2FsbCBmb3JtXG4gKlxuICogQG1vZHVsZSBmaXJld2FsbFxuICovXG5jb25zdCBmaXJld2FsbCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZmlyZXdhbGwtZm9ybScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZpcmV3YWxsIHJlY29yZCBJRC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHJlY29yZElkOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZmlyZXdhbGxEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5ldHdvcms6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduZXR3b3JrJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVQZXJtaXRBZGRyZXNzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZVJ1bGVOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXphdGlvbiBmdW5jdGlvbiB0byBzZXQgdXAgZm9ybSBiZWhhdmlvclxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZ2xvYmFsIHZhcmlhYmxlcyBmb3IgdG9vbHRpcHMgYW5kIERvY2tlciBkZXRlY3Rpb25cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSB1cGRhdGVkIHdoZW4gZGF0YSBpcyBsb2FkZWQgZnJvbSBBUElcbiAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBbXTtcbiAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gJyc7XG4gICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gJyc7XG5cbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmlyZXdhbGwucmVjb3JkSWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERPTidUIGluaXRpYWxpemUgRm9ybSBoZXJlIC0gd2FpdCB1bnRpbCBhZnRlciBkeW5hbWljIGNvbnRlbnQgaXMgbG9hZGVkXG4gICAgICAgIC8vIGZpcmV3YWxsLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICAgIGZpcmV3YWxsLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkRmlyZXdhbGxEYXRhKCkge1xuICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldFJlY29yZChmaXJld2FsbC5yZWNvcmRJZCB8fCAnJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdSZWNvcmQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZmlyZXdhbGwuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgZmlyZXdhbGwucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGVsZW1lbnRzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplVUlFbGVtZW50cygpO1xuICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMoKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIEFGVEVSIGFsbCBkeW5hbWljIGNvbnRlbnQgaXMgbG9hZGVkXG4gICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBmaXJld2FsbCBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBHZW5lcmF0ZSBydWxlcyBIVE1MIGZpcnN0XG4gICAgICAgIGZpcmV3YWxsLmdlbmVyYXRlUnVsZXNIVE1MKGRhdGEpO1xuXG4gICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gZmllbGRzIG1hbnVhbGx5IHNpbmNlIEZvcm0uanMgaXMgbm90IGluaXRpYWxpemVkIHlldFxuICAgICAgICAvLyBTZXQgYmFzaWMgZmllbGRzXG4gICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwiaWRcIl0nKS52YWwoZGF0YS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cIm5ldHdvcmtcIl0nKS52YWwoZGF0YS5uZXR3b3JrIHx8ICcwLjAuMC4wJyk7XG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJzdWJuZXRcIl0nKS52YWwoZGF0YS5zdWJuZXQgfHwgJzAnKTtcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykudmFsKGRhdGEuZGVzY3JpcHRpb24gfHwgJycpO1xuXG4gICAgICAgIC8vIFNldCBjaGVja2JveGVzXG4gICAgICAgIGNvbnN0ICRuZXdlckJsb2NrSXAgPSAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwibmV3ZXJfYmxvY2tfaXBcIl0nKTtcbiAgICAgICAgaWYgKCRuZXdlckJsb2NrSXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAkbmV3ZXJCbG9ja0lwLnByb3AoJ2NoZWNrZWQnLCBkYXRhLm5ld2VyX2Jsb2NrX2lwID09PSB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRsb2NhbE5ldHdvcmsgPSAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwibG9jYWxfbmV0d29ya1wiXScpO1xuICAgICAgICBpZiAoJGxvY2FsTmV0d29yay5sZW5ndGgpIHtcbiAgICAgICAgICAgICRsb2NhbE5ldHdvcmsucHJvcCgnY2hlY2tlZCcsIGRhdGEubG9jYWxfbmV0d29yayA9PT0gdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcnVsZSBjaGVja2JveGVzIGZyb20gY3VycmVudFJ1bGVzXG4gICAgICAgIGlmIChkYXRhLmN1cnJlbnRSdWxlcyAmJiB0eXBlb2YgZGF0YS5jdXJyZW50UnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLmN1cnJlbnRSdWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgI3J1bGVfJHtjYXRlZ29yeX1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcsIGRhdGEuY3VycmVudFJ1bGVzW2NhdGVnb3J5XSA9PT0gdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgd2luZG93IHZhcmlhYmxlcyBmb3IgdG9vbHRpcHNcbiAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gZGF0YS5uZXR3b3JrO1xuICAgICAgICB3aW5kb3cuY3VycmVudFN1Ym5ldCA9IGRhdGEuc3VibmV0O1xuICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlO1xuICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuXG4gICAgICAgIC8vIEJ1aWxkIHNlcnZpY2UgcG9ydCBpbmZvIGFuZCBuYW1lIG1hcHBpbmcgZnJvbSBhdmFpbGFibGVSdWxlc1xuICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlUnVsZXMgJiYgdHlwZW9mIGRhdGEuYXZhaWxhYmxlUnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLmF2YWlsYWJsZVJ1bGVzKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBydWxlVGVtcGxhdGUgPSBkYXRhLmF2YWlsYWJsZVJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBvcnQgaW5mbyBmcm9tIHJ1bGUgdGVtcGxhdGVcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5XSA9IGZpcmV3YWxsLmV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZShydWxlVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIC8vIE1hcCBkaXNwbGF5IG5hbWUgdG8gY2F0ZWdvcnkga2V5XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hvcnROYW1lID0gcnVsZVRlbXBsYXRlLnNob3J0TmFtZSB8fCBjYXRlZ29yeTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nW3Nob3J0TmFtZV0gPSBjYXRlZ29yeTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGUgdGVtcGxhdGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVUZW1wbGF0ZSAtIFJ1bGUgdGVtcGxhdGUgZnJvbSBhdmFpbGFibGVSdWxlcy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHBvcnQgaW5mb3JtYXRpb24gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBleHRyYWN0UG9ydHNGcm9tVGVtcGxhdGUocnVsZVRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHBvcnRzID0gW107XG5cbiAgICAgICAgaWYgKHJ1bGVUZW1wbGF0ZS5ydWxlcyAmJiBBcnJheS5pc0FycmF5KHJ1bGVUZW1wbGF0ZS5ydWxlcykpIHtcbiAgICAgICAgICAgIHJ1bGVUZW1wbGF0ZS5ydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChydWxlLnByb3RvY29sID09PSAnaWNtcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogJ0lDTVAnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocnVsZS5wb3J0ZnJvbSA9PT0gcnVsZS5wb3J0dG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBydWxlLnBvcnRmcm9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHJ1bGUucHJvdG9jb2wudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBgJHtydWxlLnBvcnRmcm9tfS0ke3J1bGUucG9ydHRvfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogcnVsZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBvcnRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBIVE1MIGZvciBmaXJld2FsbCBydWxlcyBiYXNlZCBvbiBBUEkgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICovXG4gICAgZ2VuZXJhdGVSdWxlc0hUTUwoZGF0YSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lcicpO1xuICAgICAgICAkY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBVc2UgbmV3IG5hbWluZzogYXZhaWxhYmxlUnVsZXMgZm9yIHRlbXBsYXRlcywgY3VycmVudFJ1bGVzIGZvciBhY3R1YWwgdmFsdWVzXG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVJ1bGVzID0gZGF0YS5hdmFpbGFibGVSdWxlcztcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0gZGF0YS5jdXJyZW50UnVsZXMgfHwge307XG5cbiAgICAgICAgaWYgKCFhdmFpbGFibGVSdWxlcykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gYXZhaWxhYmxlIHJ1bGVzIGRhdGEgcmVjZWl2ZWQgZnJvbSBBUEknKTtcbiAgICAgICAgICAgICRjb250YWluZXIuaHRtbCgnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlVuYWJsZSB0byBsb2FkIGZpcmV3YWxsIHJ1bGVzLiBQbGVhc2UgcmVmcmVzaCB0aGUgcGFnZS48L2Rpdj4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlzRG9ja2VyID0gZGF0YS5pc0RvY2tlciB8fCBmYWxzZTtcbiAgICAgICAgY29uc3QgZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIEhUTUwgZm9yIGVhY2ggcnVsZVxuICAgICAgICBPYmplY3Qua2V5cyhhdmFpbGFibGVSdWxlcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGF2YWlsYWJsZVJ1bGVzW25hbWVdO1xuICAgICAgICAgICAgY29uc3Qgc2hvcnROYW1lID0gcnVsZVRlbXBsYXRlLnNob3J0TmFtZSB8fCBuYW1lO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gaXNEb2NrZXIgJiYgIWRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKHNob3J0TmFtZSk7XG4gICAgICAgICAgICAvLyBHZXQgYWN0dWFsIHZhbHVlIGZyb20gY3VycmVudFJ1bGVzLCBkZWZhdWx0IHRvIHRlbXBsYXRlIGRlZmF1bHRcbiAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGN1cnJlbnRSdWxlc1tuYW1lXSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFJ1bGVzW25hbWVdIDogKHJ1bGVUZW1wbGF0ZS5hY3Rpb24gPT09ICdhbGxvdycpO1xuXG4gICAgICAgICAgICBjb25zdCBzZWdtZW50Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtc2VnbWVudCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrYm94Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSBpc0xpbWl0ZWQgPyAneWVsbG93IGV4Y2xhbWF0aW9uIHRyaWFuZ2xlJyA6ICdzbWFsbCBpbmZvIGNpcmNsZSc7XG5cbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnQgJHtzZWdtZW50Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBydWxlcyAke2NoZWNrYm94Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkPVwicnVsZV8ke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJ1bGVfJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkIHx8IGlzQ2hlY2tlZCA/ICdjaGVja2VkJyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkaXNhYmxlZCcgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwicnVsZV8ke25hbWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlW2Bmd18ke25hbWUudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbmBdIHx8IHNob3J0TmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvbiBzZXJ2aWNlLWluZm8taWNvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VydmljZT1cIiR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWFjdGlvbj1cIiR7cnVsZVRlbXBsYXRlLmFjdGlvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkYXRhLWxpbWl0ZWQ9XCJ0cnVlXCInIDogJyd9PjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcblxuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoaHRtbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgZHluYW1pY2FsbHkgYWRkZWQgZWxlbWVudHNcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIChleGNsdWRpbmcgZHluYW1pY2FsbHkgYWRkZWQgcnVsZXMgd2hpY2ggYXJlIGhhbmRsZWQgaW4gZ2VuZXJhdGVSdWxlc0hUTUwpXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5jaGVja2JveCcpLm5vdCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrIGZvciBuZXR3b3JrIGZpZWxkIChJUCBhZGRyZXNzKVxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwibmV0d29ya1wiXScpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSByZXN1bHQuZGF0YSB8fCBmaXJld2FsbC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gUHJlcGFyZSBjdXJyZW50UnVsZXMgZGF0YSBmb3IgQVBJIChzaW1wbGUgYm9vbGVhbiBtYXApXG4gICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhmb3JtRGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdydWxlXycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBrZXkucmVwbGFjZSgncnVsZV8nLCAnJyk7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyBib29sZWFuIC0gdHJ1ZSA9IGFsbG93LCBmYWxzZSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgY3VycmVudFJ1bGVzW2NhdGVnb3J5XSA9IGZvcm1EYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjdXJyZW50UnVsZXMgdG8gZm9ybURhdGFcbiAgICAgICAgZm9ybURhdGEuY3VycmVudFJ1bGVzID0gY3VycmVudFJ1bGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gbmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmsgYXJlIGFscmVhZHkgYm9vbGVhbiB0aGFua3MgdG8gY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdC5kYXRhID0gZm9ybURhdGE7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmaXJld2FsbC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmlyZXdhbGwuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmaXJld2FsbC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBTZXR1cCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEZpcmV3YWxsQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L2A7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGNoZWNrYm94ZXNcbiAgICAgICAgLy8gVGhpcyBtdXN0IGJlIGRvbmUgQUZURVIgRm9ybS5pbml0aWFsaXplKCkgdG8gZW5zdXJlIHByb3BlciB0cmFja2luZ1xuICAgICAgICAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgZXZlbnQgZm9yIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzZXJ2aWNlIHJ1bGVzXG4gICAgICAgICQoJy5zZXJ2aWNlLWluZm8taWNvbicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGljb24uZGF0YSgnbGltaXRlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBjaGVja2JveCBmb3IgdGhpcyBzZXJ2aWNlXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkaWNvbi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGluaXRpYWwgYWN0aW9uIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGluaXRpYWwgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICBjb25zdCBwb3J0SW5mbyA9IHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bc2VydmljZV0gfHwgW107XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgIHNlcnZpY2UsIFxuICAgICAgICAgICAgICAgIGFjdGlvbiwgXG4gICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyLCBcbiAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsIFxuICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICBpc0xpbWl0ZWQgJiYgd2luZG93LmlzRG9ja2VyIC8vIFNob3cgY29weSBidXR0b24gb25seSBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkaWNvbiwge1xuICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgndG9vbHRpcEljb24nLCAkaWNvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc3BlY2lhbCBjaGVja2JveGVzXG4gICAgICAgICQoJy5zcGVjaWFsLWNoZWNrYm94LWluZm8nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICRpY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgdHlwZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZChgaW5wdXRbbmFtZT1cIiR7dHlwZX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGluaXRpYWwgc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGluaXRpYWwgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgbmV0d29yayxcbiAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCB3aXRoIGNvbXBhY3Qgd2lkdGggZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkaWNvbiwge1xuICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIHRvIGljb24gb24gY2hlY2tib3ggZm9yIHVwZGF0ZXNcbiAgICAgICAgICAgICRjaGVja2JveC5kYXRhKCdzcGVjaWFsVG9vbHRpcEljb24nLCAkaWNvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBjaGVja2JveCBjaGFuZ2VzIHRvIHVwZGF0ZSB0b29sdGlwcyAodXNlIGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHMpXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtJykub24oJ2NoYW5nZScsICcucnVsZXMgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkY2hlY2tib3guZGF0YSgndG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIGNvbnN0ICRzcGVjaWFsSWNvbiA9ICRjaGVja2JveC5kYXRhKCdzcGVjaWFsVG9vbHRpcEljb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRpY29uICYmICRpY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZpY2UgPSAkaWNvbi5kYXRhKCdzZXJ2aWNlJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGljb24uZGF0YSgnbGltaXRlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJykgPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2UsIFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLCBcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICAgICAgcG9ydEluZm8sIFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQgJiYgd2luZG93LmlzRG9ja2VyXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkaWNvbiwgbmV3Q29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkc3BlY2lhbEljb24gJiYgJHNwZWNpYWxJY29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkc3BlY2lhbEljb24uZGF0YSgndHlwZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzQ2hlY2tlZFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy51cGRhdGVDb250ZW50KCRzcGVjaWFsSWNvbiwgbmV3Q29udGVudCwge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3Zlcnkgd2lkZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERvY2tlciBsaW1pdGVkIGNoZWNrYm94ZXMgLSBwcmV2ZW50IHRoZW0gZnJvbSBiZWluZyB0b2dnbGVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pc0RvY2tlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcuZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRW5zdXJlIGNoZWNrYm94IGlzIGFsd2F5cyBjaGVja2VkXG4gICAgICAgICAgICAkaW5wdXQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgdmlzdWFsIGRpc2FibGVkIHN0YXRlXG4gICAgICAgICAgICAkY2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2xpY2sgZXZlbnRzXG4gICAgICAgICAgICAkY2hlY2tib3gub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgYSB0ZW1wb3JhcnkgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICRjaGVja2JveC5maW5kKCdsYWJlbCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGxhYmVsLmZpbmQoJy5zZXJ2aWNlLWluZm8taWNvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHRvb2x0aXAgdG8gc2hvd1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2hlY2tib3ggc3RhdGUgY2hhbmdlc1xuICAgICAgICAgICAgJGlucHV0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQodGhpcykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBJUCBhZGRyZXNzXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBmaXJld2FsbCBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGwuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==