"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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

/* global globalRootUrl,globalTranslate, Form, SysinfoAPI, NetworkAPI, UserMessage, DynamicDropdownBuilder */

/**
 * Object for managing network settings
 *
 * @module networks
 */
var networks = {
  $getMyIpButton: $('#getmyip'),

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#network-form'),
  $dropDowns: $('#network-form .dropdown'),
  $extipaddr: $('#extipaddr'),
  $ipaddressInput: $('.ipaddress'),
  vlansArray: {},

  /**
   * jQuery object for the elements with we should hide from the form for docker installation.
   * @type {jQuery}
   */
  $notShowOnDockerDivs: $('.do-not-show-if-docker'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    extipaddr: {
      optional: true,
      rules: [{
        type: 'ipaddrWithPortOptional',
        prompt: globalTranslate.nw_ValidateExtIppaddrNotRight
      }, {
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }]
    },
    exthostname: {
      depends: 'usenat',
      rules: [{
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }]
    }
  },

  /**
   * Initializes the network settings form.
   */
  initialize: function initialize() {
    // Load configuration via REST API
    networks.loadConfiguration(); // Handles the change event of the 'usenat-checkbox'.

    $('#usenat-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$dropDowns.dropdown(); // DHCP checkbox handlers will be bound after tabs are created dynamically

    networks.$getMyIpButton.on('click', function (e) {
      e.preventDefault();
      networks.$getMyIpButton.addClass('loading disabled');
      SysinfoAPI.getExternalIpInfo(networks.cbAfterGetExternalIp);
    }); // Delete button handler will be bound after tabs are created dynamically

    networks.$ipaddressInput.inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Apply IP mask for external IP address field

    networks.$extipaddr.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Initialize static routes manager

    StaticRoutesManager.initialize(); // Hide static routes section in Docker (managed via do-not-show-if-docker class)

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    networks.$getMyIpButton.removeClass('loading disabled');

    if (response === false || !response.result || !response.data || !response.data.ip) {
      UserMessage.showError(globalTranslate.nw_ErrorGettingExternalIp || 'Failed to get external IP address');
      return;
    }

    var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
    var portMatch = currentExtIpAddr.match(/:(\d+)$/);
    var port = portMatch ? ':' + portMatch[1] : '';
    var newExtIpAddr = response.data.ip + port;
    networks.$formObj.form('set value', 'extipaddr', newExtIpAddr); // Clear external hostname when getting external IP

    networks.$formObj.form('set value', 'exthostname', '');
    networks.$extipaddr.trigger('change');
  },

  /**
   * Update NAT help text with actual port values from REST API
   * Updates both standard NAT section and Dual-Stack section
   * @param {object} ports - Port configuration object from API
   */
  updateNATHelpText: function updateNATHelpText(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT, RTPPortFrom, RTPPortTo)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT || !ports.RTPPortFrom || !ports.RTPPortTo) {
      return;
    } // Update standard NAT section - SIP ports info text


    var $sipPortValues = $('#nat-help-sip-ports .port-values');

    if ($sipPortValues.length > 0) {
      var sipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIPPort,
        'TLS_PORT': ports.TLS_PORT
      });
      $sipPortValues.html(sipText);
    } // Update standard NAT section - RTP ports info text


    var $rtpPortValues = $('#nat-help-rtp-ports .port-values');

    if ($rtpPortValues.length > 0) {
      var rtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTPPortFrom,
        'RTP_PORT_TO': ports.RTPPortTo
      });
      $rtpPortValues.html(rtpText);
    } // Update Dual-Stack section - SIP ports info text


    var $dualStackSipPortValues = $('#dual-stack-sip-ports .port-values');

    if ($dualStackSipPortValues.length > 0) {
      var dualStackSipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIPPort,
        'TLS_PORT': ports.TLS_PORT
      });
      $dualStackSipPortValues.html(dualStackSipText);
    } // Update Dual-Stack section - RTP ports info text


    var $dualStackRtpPortValues = $('#dual-stack-rtp-ports .port-values');

    if ($dualStackRtpPortValues.length > 0) {
      var dualStackRtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTPPortFrom,
        'RTP_PORT_TO': ports.RTPPortTo
      });
      $dualStackRtpPortValues.html(dualStackRtpText);
    }
  },

  /**
   * Update port field labels with actual internal port values from REST API
   * Updates both standard NAT section and Dual-Stack section
   * @param {object} ports - Port configuration object from API
   */
  updatePortLabels: function updatePortLabels(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT) {
      return;
    } // Update standard NAT section - external SIP port label


    var $sipLabel = $('#external-sip-port-label');

    if ($sipLabel.length > 0) {
      var sipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIPPort
      });
      $sipLabel.text(sipLabelText);
    } // Update standard NAT section - external TLS port label


    var $tlsLabel = $('#external-tls-port-label');

    if ($tlsLabel.length > 0) {
      var tlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $tlsLabel.text(tlsLabelText);
    } // Update Dual-Stack section - SIP port label


    var $dualStackSipLabel = $('#dual-stack-sip-port-label');

    if ($dualStackSipLabel.length > 0) {
      var dualStackSipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIPPort
      });
      $dualStackSipLabel.text(dualStackSipLabelText);
    } // Update Dual-Stack section - TLS port label


    var $dualStackTlsLabel = $('#dual-stack-tls-port-label');

    if ($dualStackTlsLabel.length > 0) {
      var dualStackTlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $dualStackTlsLabel.text(dualStackTlsLabelText);
    }
  },

  /**
   * Toggles the 'disabled' class for specific fields based on their checkbox state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');
      var $dhcpCheckbox = $("#dhcp-".concat(eth, "-checkbox"));
      var isDhcpEnabled = $dhcpCheckbox.checkbox('is checked'); // Find IP address and subnet fields

      var $ipField = $("input[name=\"ipaddr_".concat(eth, "\"]")); // DynamicDropdownBuilder creates dropdown with id pattern: fieldName-dropdown

      var $subnetDropdown = $("#subnet_".concat(eth, "-dropdown"));

      if (isDhcpEnabled) {
        // DHCP enabled -> make IP/subnet read-only and add disabled class
        $ipField.prop('readonly', true);
        $ipField.closest('.field').addClass('disabled');
        $subnetDropdown.addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> make IP/subnet editable
        $ipField.prop('readonly', false);
        $ipField.closest('.field').removeClass('disabled');
        $subnetDropdown.removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      }

      networks.addNewFormRules(eth);
    }); // Hide/show NAT sections instead of disabling to simplify UI

    if ($('#usenat-checkbox').checkbox('is checked')) {
      $('.nated-settings-group').show(); // After showing all sections, determine which one to actually display

      networks.updateDualStackNatLogic();
    } else {
      $('.nated-settings-group').hide();
    }
  },

  /**
   * Toggle visibility of IPv6 manual configuration fields based on selected mode
   * @param {string} interfaceId - Interface ID
   */
  toggleIPv6Fields: function toggleIPv6Fields(interfaceId) {
    var $ipv6ModeDropdown = $("#ipv6_mode_".concat(interfaceId));
    var ipv6Mode = $ipv6ModeDropdown.val();
    var $manualFieldsContainer = $(".ipv6-manual-fields-".concat(interfaceId));
    var $autoInfoMessage = $(".ipv6-auto-info-message-".concat(interfaceId));
    var $ipv6GatewayField = $(".ipv6-gateway-field-".concat(interfaceId));
    var $ipv6PrimaryDNSField = $(".ipv6-primarydns-field-".concat(interfaceId));
    var $ipv6SecondaryDNSField = $(".ipv6-secondarydns-field-".concat(interfaceId)); // Show manual fields only when mode is '2' (Manual)

    if (ipv6Mode === '2') {
      $manualFieldsContainer.show();
      $autoInfoMessage.hide();
      $ipv6GatewayField.show();
      $ipv6PrimaryDNSField.show();
      $ipv6SecondaryDNSField.show();
    } else if (ipv6Mode === '1') {
      // Show Auto (SLAAC) info message when mode is '1' (Auto)
      $manualFieldsContainer.hide();
      $autoInfoMessage.show();
      $ipv6GatewayField.show();
      $ipv6PrimaryDNSField.show();
      $ipv6SecondaryDNSField.show();
    } else {
      // Hide all IPv6 fields for mode '0' (Off)
      $manualFieldsContainer.hide();
      $autoInfoMessage.hide();
      $ipv6GatewayField.hide();
      $ipv6PrimaryDNSField.hide();
      $ipv6SecondaryDNSField.hide();
    } // Update dual-stack NAT logic when IPv6 mode changes


    networks.updateDualStackNatLogic();
  },

  /**
   * Check if dual-stack mode is active (IPv4 + IPv6 public address both configured)
   * Dual-stack NAT section is shown when both IPv4 and public IPv6 are present.
   * Public IPv6 = Global Unicast addresses (2000::/3) that start with 2 or 3.
   * Private IPv6 addresses (ULA fd00::/8, link-local fe80::/10) do NOT trigger dual-stack.
   *
   * IPv4 detection works for both static and DHCP configurations:
   * - Static: checks ipaddr_X field
   * - DHCP: checks if DHCP is enabled AND gateway is obtained
   *
   * @param {string} interfaceId - Interface ID
   * @returns {boolean} True if dual-stack with public IPv6, false otherwise
   */
  isDualStackMode: function isDualStackMode(interfaceId) {
    // Get IPv4 configuration (static or DHCP)
    var ipv4addr = $("input[name=\"ipaddr_".concat(interfaceId, "\"]")).val();
    var $dhcpCheckbox = $("#dhcp-".concat(interfaceId, "-checkbox"));
    var dhcpEnabled = $dhcpCheckbox.length > 0 && $dhcpCheckbox.checkbox('is checked');
    var gateway = $("input[name=\"gateway_".concat(interfaceId, "\"]")).val(); // Get IPv6 configuration

    var ipv6Mode = $("#ipv6_mode_".concat(interfaceId)).val(); // For Manual mode use form field, for Auto mode use current (autoconfigured) value from hidden field

    var ipv6addrManual = $("input[name=\"ipv6addr_".concat(interfaceId, "\"]")).val();
    var ipv6addrAuto = $("#current-ipv6addr-".concat(interfaceId)).val();
    var ipv6addr = ipv6Mode === '1' ? ipv6addrAuto : ipv6addrManual; // Check if IPv4 is present (either static address or DHCP with gateway)
    // Gateway presence indicates DHCP successfully obtained an IPv4 address

    var hasIpv4 = ipv4addr && ipv4addr.trim() !== '' || dhcpEnabled && gateway && gateway.trim() !== ''; // Check if IPv6 is enabled (Auto SLAAC/DHCPv6 or Manual)
    // For Auto mode ('1'), we check currentIpv6addr which shows autoconfigured address

    var hasIpv6 = (ipv6Mode === '1' || ipv6Mode === '2') && ipv6addr && ipv6addr.trim() !== '' && ipv6addr !== 'Autoconfigured';

    if (!hasIpv4 || !hasIpv6) {
      return false;
    } // Check if IPv6 address is global unicast (public)
    // Global unicast: 2000::/3 (addresses starting with 2 or 3)
    // Exclude ULA (fd00::/8) and link-local (fe80::/10)


    var ipv6Lower = ipv6addr.toLowerCase().trim(); // Remove CIDR notation if present (e.g., "2001:db8::1/64" -> "2001:db8::1")

    var ipv6WithoutCidr = ipv6Lower.split('/')[0]; // Check if first character is 2 or 3 (global unicast range)

    var isGlobalUnicast = /^[23]/.test(ipv6WithoutCidr);
    return isGlobalUnicast;
  },

  /**
   * Update NAT section UI based on dual-stack detection
   * Switches between standard NAT section and Dual-Stack section
   * Makes exthostname required in dual-stack mode
   */
  updateDualStackNatLogic: function updateDualStackNatLogic() {
    // Check if NAT is enabled - if not, don't show any NAT sections
    var isNatEnabled = $('#usenat-checkbox').checkbox('is checked');

    if (!isNatEnabled) {
      return; // NAT disabled, sections already hidden by toggleDisabledFieldClass
    } // Check if any interface is in dual-stack mode


    var anyDualStack = false;
    $('#eth-interfaces-menu a').each(function (index, tab) {
      var interfaceId = $(tab).attr('data-tab');

      if (networks.isDualStackMode(interfaceId)) {
        anyDualStack = true;
        return false; // Break loop
      }
    });
    var $standardNatSection = $('#standard-nat-section');
    var $dualStackSection = $('#dual-stack-section'); // Get the exthostname input element and its original parent

    var $exthostnameInput = $('#exthostname');
    var $standardHostnameWrapper = $standardNatSection.find('.max-width-500').has('#exthostname').first();
    var $dualStackHostnameWrapper = $('#exthostname-dual-stack-input-wrapper');

    if (anyDualStack) {
      // Dual-stack detected: Hide standard NAT section, show Dual-Stack section
      $standardNatSection.hide();
      $dualStackSection.show(); // Move exthostname input to dual-stack section (avoid duplicate inputs)

      if ($exthostnameInput.length > 0 && $dualStackHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($dualStackHostnameWrapper);
      } // Clear extipaddr (external IP not needed in dual-stack, only hostname)


      networks.$formObj.form('set value', 'extipaddr', ''); // Disable autoUpdateExternalIp (not needed in dual-stack)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        $autoUpdateCheckbox.checkbox('uncheck');
      } // Update hostname display in dual-stack info message


      var hostname = $exthostnameInput.val() || 'mikopbx.company.com';
      $('#hostname-display').text(hostname); // Make exthostname required in dual-stack

      networks.validateRules.exthostname.rules = [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateExternalHostnameEmpty || 'External hostname is required in dual-stack mode'
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid || 'Invalid hostname format'
      }];
    } else {
      // No dual-stack: Show standard NAT section, hide Dual-Stack section
      $standardNatSection.show();
      $dualStackSection.hide(); // Move exthostname input back to standard section

      if ($exthostnameInput.length > 0 && $standardHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($standardHostnameWrapper);
      } // Restore original exthostname validation (optional with usenat dependency)


      networks.validateRules.exthostname.depends = 'usenat';
      networks.validateRules.exthostname.rules = [{
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }];
    } // Reinitialize form validation


    networks.$formObj.form('destroy').form({
      on: 'blur',
      fields: networks.validateRules
    });
  },

  /**
   * Adds new form validation rules for a specific row in the network configuration form.
   * @param {string} newRowId - The ID of the new row to add the form rules for.
   */
  addNewFormRules: function addNewFormRules(newRowId) {
    // Define the class for the 'name' field in the new row
    var nameClass = "name_".concat(newRowId); // Define the form validation rules for the 'name' field

    networks.validateRules[nameClass] = {
      identifier: nameClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateNameIsNotBeEmpty
      }]
    }; // Define the class for the 'vlanid' field in the new row

    var vlanClass = "vlanid_".concat(newRowId); // Define the form validation rules for the 'vlanid' field

    networks.validateRules[vlanClass] = {
      depends: "interface_".concat(newRowId),
      identifier: vlanClass,
      rules: [{
        type: 'integer[0..4095]',
        prompt: globalTranslate.nw_ValidateVlanRange
      }, {
        type: "checkVlan[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateVlanCross
      }]
    }; // Define the class for the 'ipaddr' field in the new row

    var ipaddrClass = "ipaddr_".concat(newRowId); // Define the form validation rules for the 'ipaddr' field
    // For template interface (id=0), add dependency on interface selection

    if (newRowId === 0 || newRowId === '0') {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "interface_".concat(newRowId),
        // Template: validate only if interface is selected
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } else {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "notdhcp_".concat(newRowId),
        // Real interface: validate only if DHCP is OFF
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } // DHCP validation removed - DHCP checkbox is disabled for VLAN interfaces

  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Create a new object with all settings properties
    var result = Object.assign({}, settings);
    result.data = {}; // Collect static routes

    result.data.staticRoutes = StaticRoutesManager.collectRoutes(); // Manually collect form values to avoid any DOM-related issues
    // Collect all regular input fields

    networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function () {
      var $input = $(this);
      var name = $input.attr('name');

      if (name) {
        var value = $input.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Collect select dropdowns

    networks.$formObj.find('select').each(function () {
      var $select = $(this);
      var name = $select.attr('name');

      if (name) {
        var value = $select.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Convert checkbox values to boolean
    // PbxApiClient will handle conversion to strings for jQuery

    result.data.usenat = $('#usenat-checkbox').checkbox('is checked'); // Use correct field name from the form (autoUpdateExternalIp, not AUTO_UPDATE_EXTERNAL_IP)

    var $autoUpdateDiv = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

    if ($autoUpdateDiv.length > 0) {
      result.data.autoUpdateExternalIp = $autoUpdateDiv.checkbox('is checked');
    } else {
      result.data.autoUpdateExternalIp = false;
    } // Convert DHCP checkboxes to boolean for each interface


    networks.$formObj.find('.dhcp-checkbox').each(function (index, obj) {
      var inputId = $(obj).attr('id');
      var rowId = inputId.replace('dhcp-', '').replace('-checkbox', ''); // For disabled checkboxes, read actual input state instead of Fomantic UI API

      var $checkbox = $(obj);
      var $input = $checkbox.find('input[type="checkbox"]');
      var isDisabled = $checkbox.hasClass('disabled') || $input.prop('disabled');

      if (isDisabled) {
        // For disabled checkboxes, read the actual input checked state
        result.data["dhcp_".concat(rowId)] = $input.prop('checked') === true;
      } else {
        // For enabled checkboxes, use Fomantic UI API
        result.data["dhcp_".concat(rowId)] = $checkbox.checkbox('is checked');
      }
    }); // Collect internet radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      result.data.internet_interface = String($checkedRadio.val());
    } // WHY: No port field mapping needed - form field names match API constants
    // (externalSIPPort = PbxSettings::EXTERNAL_SIP_PORT)
    // Set default IPv6 subnet for Auto mode (SLAAC/DHCPv6)


    Object.keys(result.data).forEach(function (key) {
      var ipv6ModeMatch = key.match(/^ipv6_mode_(\d+)$/);

      if (ipv6ModeMatch) {
        var interfaceId = ipv6ModeMatch[1];
        var mode = result.data[key];
        var subnetKey = "ipv6_subnet_".concat(interfaceId); // If mode is Auto ('1') and subnet is empty, set default to '64'

        if (mode === '1' && (!result.data[subnetKey] || result.data[subnetKey] === '')) {
          result.data[subnetKey] = '64';
        }
      }
    });
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {// Response handled by Form
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = networks.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = networks.validateRules; // Form validation rules

    Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

    Form.inline = true; // Show inline errors next to fields
    // Configure REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = NetworkAPI;
    Form.apiSettings.saveMethod = 'saveConfig'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "network/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "network/modify/");
    Form.initialize();
  },

  /**
   * Load network configuration via REST API
   */
  loadConfiguration: function loadConfiguration() {
    NetworkAPI.getConfig(function (response) {
      if (response.result && response.data) {
        networks.populateForm(response.data); // Initialize UI after loading data

        networks.toggleDisabledFieldClass(); // Hide form elements connected with non docker installations

        if (response.data.isDocker) {
          networks.$formObj.form('set value', 'is-docker', '1');
          networks.$notShowOnDockerDivs.hide();
        }
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Show Docker network info as read-only
   * DEPRECATED: Docker now uses same interface tabs as regular installation
   */
  showDockerNetworkInfo: function showDockerNetworkInfo(data) {
    // This function is no longer used - Docker uses createInterfaceTabs instead
    console.warn('showDockerNetworkInfo is deprecated');
  },

  /**
   * Convert CIDR notation to dotted decimal netmask
   */
  cidrToNetmask: function cidrToNetmask(cidr) {
    var mask = ~(Math.pow(2, 32 - cidr) - 1);
    return [mask >>> 24 & 255, mask >>> 16 & 255, mask >>> 8 & 255, mask & 255].join('.');
  },

  /**
   * Create interface tabs and forms dynamically from REST API data
   * @param {Object} data - Interface data from API
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceTabs: function createInterfaceTabs(data) {
    var isDocker = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var $menu = $('#eth-interfaces-menu');
    var $content = $('#eth-interfaces-content'); // Clear existing content

    $menu.empty();
    $content.empty(); // Create tabs for existing interfaces

    data.interfaces.forEach(function (iface, index) {
      var tabId = iface.id;
      var tabLabel = "".concat(iface.name || iface["interface"], " (").concat(iface["interface"]).concat(iface.vlanid !== '0' && iface.vlanid !== 0 ? ".".concat(iface.vlanid) : '', ")");
      var isActive = index === 0; // Create tab menu item

      $menu.append("\n                <a class=\"item ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(tabId, "\">\n                    ").concat(tabLabel, "\n                </a>\n            ")); // Create tab content
      // Only VLAN interfaces can be deleted (vlanid > 0)
      // In Docker, disable delete for all interfaces

      var canDelete = !isDocker && parseInt(iface.vlanid, 10) > 0;
      var deleteButton = canDelete ? "\n                <a class=\"ui icon left labeled button delete-interface\" data-value=\"".concat(tabId, "\">\n                    <i class=\"icon trash\"></i>").concat(globalTranslate.nw_DeleteCurrentInterface, "\n                </a>\n            ") : '';
      $content.append(networks.createInterfaceForm(iface, isActive, deleteButton, isDocker));
    }); // Create template tab for new VLAN (not for Docker)

    if (data.template && !isDocker) {
      var template = data.template;
      template.id = 0; // Add "+" tab menu item

      $menu.append("\n                <a class=\"item\" data-tab=\"0\">\n                    <i class=\"icon plus\"></i>\n                </a>\n            "); // Create template form with interface selector

      $content.append(networks.createTemplateForm(template, data.interfaces)); // Build interface selector dropdown for template

      var physicalInterfaces = {};
      data.interfaces.forEach(function (iface) {
        if (!physicalInterfaces[iface["interface"]]) {
          physicalInterfaces[iface["interface"]] = {
            value: iface.id.toString(),
            text: iface["interface"],
            name: iface["interface"]
          };
        }
      });
      var physicalInterfaceOptions = Object.values(physicalInterfaces);
      DynamicDropdownBuilder.buildDropdown('interface_0', {
        interface_0: ''
      }, {
        staticOptions: physicalInterfaceOptions,
        placeholder: globalTranslate.nw_SelectInterface,
        allowEmpty: true
      });
    } // Initialize subnet dropdowns using DynamicDropdownBuilder


    data.interfaces.forEach(function (iface) {
      var fieldName = "subnet_".concat(iface.id);
      var formData = {}; // Convert subnet to string for dropdown matching

      formData[fieldName] = String(iface.subnet || '24');
      DynamicDropdownBuilder.buildDropdown(fieldName, formData, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      }); // Initialize IPv6 mode dropdown (Off/Auto/Manual)

      var ipv6ModeFieldName = "ipv6_mode_".concat(iface.id);
      var ipv6ModeFormData = {};
      ipv6ModeFormData[ipv6ModeFieldName] = String(iface.ipv6_mode || '0');
      DynamicDropdownBuilder.buildDropdown(ipv6ModeFieldName, ipv6ModeFormData, {
        staticOptions: [{
          value: '0',
          text: globalTranslate.nw_IPv6ModeOff || 'Off'
        }, {
          value: '1',
          text: globalTranslate.nw_IPv6ModeAuto || 'Auto (SLAAC/DHCPv6)'
        }, {
          value: '2',
          text: globalTranslate.nw_IPv6ModeManual || 'Manual'
        }],
        placeholder: globalTranslate.nw_SelectIPv6Mode || 'Select IPv6 Mode',
        allowEmpty: false,
        onChange: function onChange() {
          networks.toggleIPv6Fields(iface.id);
          Form.dataChanged();
        }
      }); // Initialize IPv6 subnet dropdown

      var ipv6SubnetFieldName = "ipv6_subnet_".concat(iface.id);
      var ipv6SubnetFormData = {};
      ipv6SubnetFormData[ipv6SubnetFieldName] = String(iface.ipv6_subnet || '64');
      DynamicDropdownBuilder.buildDropdown(ipv6SubnetFieldName, ipv6SubnetFormData, {
        staticOptions: networks.getIpv6SubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectIPv6Subnet || 'Select IPv6 Prefix',
        allowEmpty: false,
        additionalClasses: ['search']
      }); // Set initial visibility of IPv6 manual fields

      networks.toggleIPv6Fields(iface.id);
    }); // Initialize subnet dropdown for template (id = 0)

    if (data.template) {
      DynamicDropdownBuilder.buildDropdown('subnet_0', {
        subnet_0: '24'
      }, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      });
    } // Initialize tabs


    $('#eth-interfaces-menu .item').tab();
    $('#eth-interfaces-menu .item').first().trigger('click'); // Update static routes section visibility

    StaticRoutesManager.updateVisibility(); // Re-bind delete button handlers
    // Delete button removes TAB from form and marks interface as disabled
    // Actual deletion happens on form submit

    $('.delete-interface').off('click').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      var interfaceId = $button.attr('data-value'); // Remove the TAB menu item

      $("#eth-interfaces-menu a[data-tab=\"".concat(interfaceId, "\"]")).remove(); // Remove the TAB content

      var $tabContent = $("#eth-interfaces-content .tab[data-tab=\"".concat(interfaceId, "\"]"));
      $tabContent.remove(); // Add hidden field to mark this interface as disabled

      networks.$formObj.append("<input type=\"hidden\" name=\"disabled_".concat(interfaceId, "\" value=\"1\" />")); // Switch to first available tab

      var $firstTab = $('#eth-interfaces-menu a.item').first();

      if ($firstTab.length > 0) {
        $firstTab.tab('change tab', $firstTab.attr('data-tab'));
      } // Mark form as changed to enable submit button


      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Re-bind DHCP checkbox handlers

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    }); // Re-bind IP address input masks

    $('.ipaddress').inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Add VLAN ID change handlers to control DHCP checkbox state

    $('input[name^="vlanid_"]').off('input change').on('input change', function () {
      var $vlanInput = $(this);
      var interfaceId = $vlanInput.attr('name').replace('vlanid_', '');
      var vlanValue = parseInt($vlanInput.val(), 10) || 0;
      var $dhcpCheckbox = $("#dhcp-".concat(interfaceId, "-checkbox"));

      if (vlanValue > 0) {
        // Disable DHCP checkbox for VLAN interfaces
        $dhcpCheckbox.addClass('disabled');
        $dhcpCheckbox.checkbox('uncheck');
        $dhcpCheckbox.checkbox('set disabled');
        $dhcpCheckbox.find('input').prop('disabled', true);
      } else {
        // Enable DHCP checkbox for non-VLAN interfaces
        $dhcpCheckbox.removeClass('disabled');
        $dhcpCheckbox.checkbox('set enabled');
        $dhcpCheckbox.find('input').prop('disabled', false);
      } // Update disabled field classes


      networks.toggleDisabledFieldClass();
    }); // Trigger the handler for existing VLAN interfaces to apply initial state

    $('input[name^="vlanid_"]').trigger('change'); // Initialize internet radio buttons with Fomantic UI

    $('.internet-radio').checkbox(); // Add internet radio button change handler

    $('input[name="internet_interface"]').off('change').on('change', function () {
      var selectedInterfaceId = $(this).val(); // Hide all DNS/Gateway groups

      $('[class^="dns-gateway-group-"]').hide(); // Show DNS/Gateway group for selected internet interface

      $(".dns-gateway-group-".concat(selectedInterfaceId)).show(); // Update TAB icons - add globe icon to selected, remove from others

      $('#eth-interfaces-menu a').each(function (index, tab) {
        var $tab = $(tab);
        var tabId = $tab.attr('data-tab'); // Remove existing globe icon

        $tab.find('.globe.icon').remove(); // Add globe icon to selected internet interface TAB

        if (tabId === selectedInterfaceId) {
          $tab.prepend('<i class="globe icon"></i>');
        }
      }); // Mark form as changed

      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Update DNS/Gateway readonly state when DHCP changes

    $('.dhcp-checkbox').off('change.dnsgateway').on('change.dnsgateway', function () {
      var $checkbox = $(this);
      var interfaceId = $checkbox.attr('id').replace('dhcp-', '').replace('-checkbox', '');
      var isDhcpEnabled = $checkbox.checkbox('is checked'); // Find DNS/Gateway fields for this interface

      var $dnsGatewayGroup = $(".dns-gateway-group-".concat(interfaceId));
      var $dnsGatewayFields = $dnsGatewayGroup.find('input[name^="gateway_"], input[name^="primarydns_"], input[name^="secondarydns_"]');
      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(interfaceId));

      if (isDhcpEnabled) {
        // DHCP enabled -> make DNS/Gateway read-only
        $dnsGatewayFields.prop('readonly', true);
        $dnsGatewayFields.closest('.field').addClass('disabled');
        $dhcpInfoMessage.show();
      } else {
        // DHCP disabled -> make DNS/Gateway editable
        $dnsGatewayFields.prop('readonly', false);
        $dnsGatewayFields.closest('.field').removeClass('disabled');
        $dhcpInfoMessage.hide();
      } // Update dual-stack NAT logic when DHCP changes


      networks.updateDualStackNatLogic();
    }); // Trigger initial TAB icon update for checked radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      $checkedRadio.trigger('change');
    } // Apply initial disabled state for DHCP-enabled interfaces
    // Call after all dropdowns are created


    networks.toggleDisabledFieldClass(); // Re-save initial form values and re-bind event handlers for dynamically created inputs
    // This is essential for form change detection to work with dynamic tabs

    if (Form.enableDirrity) {
      // Override Form methods to manually collect all field values (including from tabs)
      var originalSaveInitialValues = Form.saveInitialValues;
      var originalCheckValues = Form.checkValues;

      Form.saveInitialValues = function () {
        // Get values from Fomantic UI (may miss dynamically created tab fields)
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values to catch fields that Fomantic UI misses

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both (manual values override Fomantic values for fields that exist in both)

        Form.oldFormValues = Object.assign({}, fomanticValues, manualValues);
      };

      Form.checkValues = function () {
        // Get values from Fomantic UI
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both

        var newFormValues = Object.assign({}, fomanticValues, manualValues);

        if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
          Form.$submitButton.addClass('disabled');
          Form.$dropdownSubmit.addClass('disabled');
        } else {
          Form.$submitButton.removeClass('disabled');
          Form.$dropdownSubmit.removeClass('disabled');
        }
      };

      if (typeof Form.saveInitialValues === 'function') {
        Form.saveInitialValues();
      }

      if (typeof Form.setEvents === 'function') {
        Form.setEvents();
      }
    }
  },

  /**
   * Create form for existing interface
   * @param {Object} iface - Interface data
   * @param {boolean} isActive - Whether this tab is active
   * @param {string} deleteButton - HTML for delete button
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceForm: function createInterfaceForm(iface, isActive, deleteButton) {
    var isDocker = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var id = iface.id;
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility and read-only state

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"'; // In Docker: Gateway is always readonly, DNS fields are editable
    // In regular mode: All fields readonly if DHCP enabled

    var gatewayReadonly = isDocker || iface.dhcp ? 'readonly' : '';
    var gatewayDisabledClass = isDocker || iface.dhcp ? 'disabled' : '';
    var dnsReadonly = isDocker ? '' : iface.dhcp ? 'readonly' : '';
    var dnsDisabledClass = isDocker ? '' : iface.dhcp ? 'disabled' : ''; // IPv6 Gateway: readonly when ipv6_mode='1' (Auto/SLAAC), editable when ipv6_mode='2' (Manual) or '0' (Off)

    var ipv6GatewayReadonly = iface.ipv6_mode === '1' ? 'readonly' : '';
    var ipv6GatewayDisabledClass = iface.ipv6_mode === '1' ? 'disabled' : ''; // IPv6 fields visibility: hide when ipv6_mode='0' (Off), show when '1' (Auto) or '2' (Manual)

    var ipv6FieldsVisible = iface.ipv6_mode === '0' ? 'style="display:none;"' : ''; // In Docker: IP, subnet, VLAN are readonly

    var dockerReadonly = isDocker ? 'readonly' : '';
    var dockerDisabledClass = isDocker ? 'disabled' : ''; // In Docker: DHCP checkbox is disabled and always checked

    var dhcpDisabled = isDocker || iface.vlanid > 0;
    var dhcpChecked = isDocker || (iface.vlanid > 0 ? false : iface.dhcp);
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox".concat(dhcpDisabled ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(dhcpChecked ? 'checked' : '', " ").concat(dhcpDisabled ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader || 'DHCP Configuration Obtained', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_DHCPInfoIP || 'IP Address', ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoSubnet || 'Subnet', ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoGateway || 'Gateway', ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoDNS || 'DNS', ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain || 'Domain', ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                ").concat(iface.hostname ? "<li>".concat(globalTranslate.nw_DHCPInfoHostname || 'Hostname', ": <strong>").concat(iface.hostname, "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                ").concat(isDocker ? '' : "\n                <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" ").concat(dockerReadonly, " />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_IPv6Mode || 'IPv6 Mode', "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                    </div>\n                </div>\n\n                <!-- Hidden field to store current auto-configured IPv6 address for dual-stack detection -->\n                <input type=\"hidden\" id=\"current-ipv6addr-").concat(id, "\" value=\"").concat(iface.currentIpv6addr || '', "\" />\n\n                <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader || 'IPv6 Autoconfiguration (SLAAC/DHCPv6)', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress || 'IPv6 Address', ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix || 'Prefix Length', ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway || 'Gateway', ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                ").concat(iface.currentPrimarydns6 || iface.primarydns6 ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoDNS || 'DNS', ": <strong>").concat(iface.currentPrimarydns6 || iface.primarydns6).concat(iface.currentSecondarydns6 || iface.secondarydns6 ? ', ' + (iface.currentSecondarydns6 || iface.secondarydns6) : '', "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                    <div class=\"fields\">\n                        <div class=\"five wide field\">\n                            <label>").concat(globalTranslate.nw_IPv6Address || 'IPv6 Address', "</label>\n                            <div class=\"field max-width-600\">\n                                <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                            </div>\n                        </div>\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Subnet || 'IPv6 Prefix Length', "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Hostname || 'Hostname', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"hostname_").concat(id, "\" value=\"").concat(iface.hostname || '', "\" placeholder=\"mikopbx\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Domain || 'Domain', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"domain_").concat(id, "\" value=\"").concat(iface.domain || '', "\" placeholder=\"example.com\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-gateway-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6Gateway || 'IPv6 Gateway', "</label>\n                        <div class=\"field max-width-400 ").concat(ipv6GatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.currentIpv6_gateway || iface.ipv6_gateway || '', "\" ").concat(ipv6GatewayReadonly, " placeholder=\"fe80::1\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-primarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6PrimaryDNS || 'Primary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"2001:4860:4860::8888\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-secondarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6SecondaryDNS || 'Secondary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"2001:4860:4860::8844\" />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"24\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Get IPv6 subnet prefix options array for DynamicDropdownBuilder
   * @returns {Array} Array of IPv6 subnet prefix options (/1 to /128)
   */
  getIpv6SubnetOptionsArray: function getIpv6SubnetOptionsArray() {
    var options = []; // Generate /1 to /128 (common: /64, /48, /56, /128)

    for (var i = 128; i >= 1; i--) {
      var description = "/".concat(i); // Add descriptions for common prefixes

      if (i === 128) description += ' (Single host)';else if (i === 64) description += ' (Standard subnet)';else if (i === 56) description += ' (Small network)';else if (i === 48) description += ' (Large network)';else if (i === 32) description += ' (ISP assignment)';
      options.push({
        value: i.toString(),
        text: description
      });
    }

    return options;
  },

  /**
   * Get subnet mask options array for DynamicDropdownBuilder
   * @returns {Array} Array of subnet mask options
   */
  getSubnetOptionsArray: function getSubnetOptionsArray() {
    // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
    return [{
      value: '32',
      text: '32 - 255.255.255.255'
    }, {
      value: '31',
      text: '31 - 255.255.255.254'
    }, {
      value: '30',
      text: '30 - 255.255.255.252'
    }, {
      value: '29',
      text: '29 - 255.255.255.248'
    }, {
      value: '28',
      text: '28 - 255.255.255.240'
    }, {
      value: '27',
      text: '27 - 255.255.255.224'
    }, {
      value: '26',
      text: '26 - 255.255.255.192'
    }, {
      value: '25',
      text: '25 - 255.255.255.128'
    }, {
      value: '24',
      text: '24 - 255.255.255.0'
    }, {
      value: '23',
      text: '23 - 255.255.255.254'
    }, {
      value: '22',
      text: '22 - 255.255.252.0'
    }, {
      value: '21',
      text: '21 - 255.255.248.0'
    }, {
      value: '20',
      text: '20 - 255.255.240.0'
    }, {
      value: '19',
      text: '19 - 255.255.224.0'
    }, {
      value: '18',
      text: '18 - 255.255.192.0'
    }, {
      value: '17',
      text: '17 - 255.255.128.0'
    }, {
      value: '16',
      text: '16 - 255.255.0.0'
    }, {
      value: '15',
      text: '15 - 255.254.0.0'
    }, {
      value: '14',
      text: '14 - 255.252.0.0'
    }, {
      value: '13',
      text: '13 - 255.248.0.0'
    }, {
      value: '12',
      text: '12 - 255.240.0.0'
    }, {
      value: '11',
      text: '11 - 255.224.0.0'
    }, {
      value: '10',
      text: '10 - 255.192.0.0'
    }, {
      value: '9',
      text: '9 - 255.128.0.0'
    }, {
      value: '8',
      text: '8 - 255.0.0.0'
    }, {
      value: '7',
      text: '7 - 254.0.0.0'
    }, {
      value: '6',
      text: '6 - 252.0.0.0'
    }, {
      value: '5',
      text: '5 - 248.0.0.0'
    }, {
      value: '4',
      text: '4 - 240.0.0.0'
    }, {
      value: '3',
      text: '3 - 224.0.0.0'
    }, {
      value: '2',
      text: '2 - 192.0.0.0'
    }, {
      value: '1',
      text: '1 - 128.0.0.0'
    }, {
      value: '0',
      text: '0 - 0.0.0.0'
    }];
  },

  /**
   * Populate form with configuration data
   */
  populateForm: function populateForm(data) {
    // WHY: Both Docker and non-Docker now use interface tabs
    // Docker has restrictions: DHCP locked, IP/subnet/VLAN readonly, DNS editable
    networks.createInterfaceTabs(data, data.isDocker || false); // Set NAT settings

    if (data.nat) {
      // Boolean values from API
      if (data.nat.usenat) {
        $('#usenat-checkbox').checkbox('check');
      } else {
        $('#usenat-checkbox').checkbox('uncheck');
      }

      networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
      networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || ''); // autoUpdateExternalIp boolean (field name from the form)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
          $autoUpdateCheckbox.checkbox('check');
        } else {
          $autoUpdateCheckbox.checkbox('uncheck');
        }
      }
    } // Set port settings


    if (data.ports) {
      // WHY: No mapping needed - API returns keys matching form field names
      // (e.g., 'externalSIPPort' from PbxSettings::EXTERNAL_SIP_PORT constant)
      Object.keys(data.ports).forEach(function (key) {
        var value = data.ports[key];
        networks.$formObj.form('set value', key, value);
      }); // Update the NAT help text and labels with actual port values

      networks.updateNATHelpText(data.ports);
      networks.updatePortLabels(data.ports);
    } // Set additional settings


    if (data.settings) {
      Object.keys(data.settings).forEach(function (key) {
        networks.$formObj.form('set value', key, data.settings[key]);
      });
    } // Store available interfaces for static routes FIRST (before loading routes)


    if (data.availableInterfaces) {
      StaticRoutesManager.availableInterfaces = data.availableInterfaces;
    } // Load static routes AFTER availableInterfaces are set


    if (data.staticRoutes) {
      StaticRoutesManager.loadRoutes(data.staticRoutes);
    } // Re-initialize dirty checking after population is complete
    // This ensures the button is disabled and all dynamically created fields are tracked


    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
  }
};
/**
 * Custom form validation rule for checking if the value is a valid IP address.
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IP address, false otherwise.
 */

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f == null) {
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
};
/**
 * Custom form validation rule for checking if the value is a valid IPv6 address.
 * @param {string} value - The value to validate as an IPv6 address.
 * @returns {boolean} - True if the value is a valid IPv6 address, false otherwise.
 */


$.fn.form.settings.rules.ipv6addr = function (value) {
  // IPv6 regex pattern
  // Supports full form, compressed form (::), IPv4-mapped (::ffff:192.0.2.1), link-local (fe80::1%eth0)
  var ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Pattern.test(value);
};
/**
 * Custom form validation rule for checking if the value is a valid IP address (IPv4 or IPv6).
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IPv4 or IPv6 address, false otherwise.
 */


$.fn.form.settings.rules.ipaddress = function (value) {
  return $.fn.form.settings.rules.ipaddr(value) || $.fn.form.settings.rules.ipv6addr(value);
};
/**
 * Custom form validation rule for checking if the value is a valid IP address with an optional port.
 * @param {string} value - The value to validate as an IP address with an optional port.
 * @returns {boolean} - True if the value is a valid IP address with an optional port, false otherwise.
 */


$.fn.form.settings.rules.ipaddrWithPortOptional = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:[0-9]+)?$/);

  if (f == null) {
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
};
/**
 * Custom form validation rule for checking if the VLAN ID is unique for a given interface.
 * @param {string} vlanValue - The value of the VLAN ID input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the VLAN ID is unique for the interface, false otherwise.
 */


$.fn.form.settings.rules.checkVlan = function (vlanValue, param) {
  var result = true;
  var vlansArray = {};
  var allValues = networks.$formObj.form('get values');

  if (allValues.interface_0 !== undefined && allValues.interface_0 > 0) {
    var newEthName = allValues["interface_".concat(allValues.interface_0)];
    vlansArray[newEthName] = [allValues.vlanid_0];

    if (allValues.vlanid_0 === '') {
      result = false;
    }
  }

  $.each(allValues, function (index, value) {
    if (index === 'interface_0' || index === 'vlanid_0') return;

    if (index.indexOf('vlanid') >= 0) {
      var ethName = allValues["interface_".concat(index.split('_')[1])];

      if ($.inArray(value, vlansArray[ethName]) >= 0 && vlanValue === value && param === index.split('_')[1]) {
        result = false;
      } else {
        if (!(ethName in vlansArray)) {
          vlansArray[ethName] = [];
        }

        vlansArray[ethName].push(value);
      }
    }
  });
  return result;
}; // DHCP validation rule removed - DHCP checkbox is disabled for VLAN interfaces, no validation needed

/**
 * Custom form validation rule for checking the presence of external IP host information.
 * @returns {boolean} - True if the external IP host information is provided when NAT is enabled, false otherwise.
 */


$.fn.form.settings.rules.extenalIpHost = function () {
  var allValues = networks.$formObj.form('get values');

  if (allValues.usenat === 'on') {
    // Get unmasked value for extipaddr (inputmask may return "_._._._" for empty)
    var extipaddr = networks.$extipaddr.inputmask('unmaskedvalue') || '';
    var exthostname = (allValues.exthostname || '').trim();

    if (exthostname === '' && extipaddr === '') {
      return false;
    }
  }

  return true;
};
/**
 * Custom form validation rule for checking if value is a valid hostname
 * @param {string} value - The value to validate as hostname
 * @returns {boolean} - True if valid hostname, false otherwise
 */


$.fn.form.settings.rules.validHostname = function (value) {
  if (!value || value === '') {
    return true; // Empty is handled by extenalIpHost rule
  } // RFC 952/RFC 1123 hostname validation
  // - Labels separated by dots
  // - Each label 1-63 chars
  // - Only alphanumeric and hyphens
  // - Cannot start/end with hyphen
  // - Total length max 253 chars


  var hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*$/;
  return hostnameRegex.test(value);
};
/**
 * Static Routes Manager Module
 *
 * Manages static route configuration when multiple network interfaces exist
 */


var StaticRoutesManager = {
  $table: $('#static-routes-table'),
  $section: $('#static-routes-section'),
  $addButton: $('#add-new-route'),
  $tableContainer: null,
  $emptyPlaceholder: null,
  routes: [],
  availableInterfaces: [],
  // Will be populated from REST API

  /**
   * Initialize static routes management
   */
  initialize: function initialize() {
    // Cache elements
    StaticRoutesManager.$emptyPlaceholder = $('#static-routes-empty-placeholder');
    StaticRoutesManager.$tableContainer = $('#static-routes-table-container'); // Hide section if less than 2 interfaces

    StaticRoutesManager.updateVisibility(); // Initialize drag-and-drop

    StaticRoutesManager.initializeDragAndDrop(); // Add button handler

    StaticRoutesManager.$addButton.on('click', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Add first route button handler (in empty placeholder)

    $(document).on('click', '#add-first-route-button', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Delete button handler (delegated)

    StaticRoutesManager.$table.on('click', '.delete-route-button', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      StaticRoutesManager.updatePriorities();
      StaticRoutesManager.updateEmptyState();
      Form.dataChanged();
    }); // Copy button handler (delegated)

    StaticRoutesManager.$table.on('click', '.copy-route-button', function (e) {
      e.preventDefault();
      var $sourceRow = $(e.target).closest('tr');
      StaticRoutesManager.copyRoute($sourceRow);
    }); // Input change handlers

    StaticRoutesManager.$table.on('input change', '.network-input, .gateway-input, .description-input', function () {
      Form.dataChanged();
    }); // Paste handlers for IP address fields (enable clipboard paste with inputmask)

    StaticRoutesManager.$table.on('paste', '.network-input, .gateway-input', function (e) {
      e.preventDefault(); // Get pasted data from clipboard

      var pastedData = '';

      if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
        pastedData = e.originalEvent.clipboardData.getData('text');
      } else if (e.clipboardData && e.clipboardData.getData) {
        pastedData = e.clipboardData.getData('text');
      } else if (window.clipboardData && window.clipboardData.getData) {
        pastedData = window.clipboardData.getData('text'); // For IE
      } // Clean the pasted data (remove extra spaces, keep only valid IP characters)


      var cleanedData = pastedData.trim().replace(/[^0-9.]/g, ''); // Get the input element

      var $input = $(this); // Temporarily remove mask

      $input.inputmask('remove'); // Set the cleaned value

      $input.val(cleanedData); // Reapply the mask after a short delay

      setTimeout(function () {
        $input.inputmask({
          alias: 'ip',
          placeholder: '_'
        });
        $input.trigger('input');
        Form.dataChanged();
      }, 10);
    });
  },

  /**
   * Initialize or reinitialize drag-and-drop functionality
   */
  initializeDragAndDrop: function initializeDragAndDrop() {
    // Destroy existing tableDnD if it exists
    if (StaticRoutesManager.$table.data('tableDnD')) {
      StaticRoutesManager.$table.tableDnDUpdate();
    } // Initialize drag-and-drop


    StaticRoutesManager.$table.tableDnD({
      onDrop: function onDrop() {
        StaticRoutesManager.updatePriorities();
        Form.dataChanged();
      },
      dragHandle: '.dragHandle'
    });
  },

  /**
   * Update visibility based on number of interfaces
   */
  updateVisibility: function updateVisibility() {
    // Show/hide section based on number of interfaces
    var interfaceCount = $('#eth-interfaces-menu a.item').not('[data-tab="0"]').length;

    if (interfaceCount > 1) {
      StaticRoutesManager.$section.show();
    } else {
      StaticRoutesManager.$section.hide();
    }
  },

  /**
   * Copy a route row (create duplicate)
   * @param {jQuery} $sourceRow - Source row to copy
   */
  copyRoute: function copyRoute($sourceRow) {
    var routeId = $sourceRow.attr('data-route-id');
    var subnetDropdownId = "subnet-route-".concat(routeId);
    var interfaceDropdownId = "interface-route-".concat(routeId); // Collect data from source row

    var routeData = {
      network: $sourceRow.find('.network-input').val(),
      subnet: $("#".concat(subnetDropdownId)).val(),
      gateway: $sourceRow.find('.gateway-input').val(),
      "interface": $("#".concat(interfaceDropdownId)).val() || '',
      description: $sourceRow.find('.description-input').val()
    }; // Add new route with copied data

    StaticRoutesManager.addRoute(routeData); // Reinitialize drag-and-drop after adding route

    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Update empty state visibility
   */
  updateEmptyState: function updateEmptyState() {
    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      // Show empty placeholder, hide table container
      StaticRoutesManager.$emptyPlaceholder.show();
      StaticRoutesManager.$tableContainer.hide();
    } else {
      // Hide empty placeholder, show table container
      StaticRoutesManager.$emptyPlaceholder.hide();
      StaticRoutesManager.$tableContainer.show();
    }
  },

  /**
   * Add a new route row
   * @param {Object} routeData - Route data (optional)
   */
  addRoute: function addRoute() {
    var routeData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var $template = $('.route-row-template').last();
    var $newRow = $template.clone(true);
    var routeId = (routeData === null || routeData === void 0 ? void 0 : routeData.id) || "new_".concat(Date.now());
    $newRow.removeClass('route-row-template').addClass('route-row').attr('data-route-id', routeId).show(); // Set values if provided

    if (routeData) {
      $newRow.find('.network-input').val(routeData.network);
      $newRow.find('.gateway-input').val(routeData.gateway);
      $newRow.find('.description-input').val(routeData.description || '');
    } // Add to table


    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      $template.after($newRow);
    } else {
      $existingRows.last().after($newRow);
    } // Initialize subnet dropdown for this row


    StaticRoutesManager.initializeSubnetDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData.subnet) || '24'); // Initialize interface dropdown for this row

    StaticRoutesManager.initializeInterfaceDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData["interface"]) || ''); // Initialize inputmask for IP address fields

    $newRow.find('.ipaddress').inputmask({
      alias: 'ip',
      placeholder: '_'
    });
    StaticRoutesManager.updatePriorities();
    StaticRoutesManager.updateEmptyState();
    Form.dataChanged();
  },

  /**
   * Initialize subnet dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected subnet value
   */
  initializeSubnetDropdown: function initializeSubnetDropdown($row, selectedValue) {
    var $container = $row.find('.subnet-dropdown-container');
    var dropdownId = "subnet-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />"));
    DynamicDropdownBuilder.buildDropdown(dropdownId, _defineProperty({}, dropdownId, selectedValue), {
      staticOptions: networks.getSubnetOptionsArray(),
      placeholder: globalTranslate.nw_SelectNetworkMask,
      allowEmpty: false,
      additionalClasses: ['search'],
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Initialize interface dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected interface value (empty string = auto)
   */
  initializeInterfaceDropdown: function initializeInterfaceDropdown($row, selectedValue) {
    var $container = $row.find('.interface-dropdown-container');
    var dropdownId = "interface-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />")); // Build dropdown options: "Auto" + available interfaces

    var options = [{
      value: '',
      text: globalTranslate.nw_Auto || 'Auto'
    }].concat(_toConsumableArray(StaticRoutesManager.availableInterfaces.map(function (iface) {
      return {
        value: iface.value,
        text: iface.label
      };
    }))); // Prepare form data for DynamicDropdownBuilder

    var formData = {};
    formData[dropdownId] = selectedValue || ''; // Ensure we pass empty string for "Auto"

    DynamicDropdownBuilder.buildDropdown(dropdownId, formData, {
      staticOptions: options,
      placeholder: globalTranslate.nw_SelectInterface,
      allowEmpty: false,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Update route priorities based on table order
   */
  updatePriorities: function updatePriorities() {
    $('.route-row').each(function (index, row) {
      $(row).attr('data-priority', index + 1);
    });
  },

  /**
   * Load routes from data
   * @param {Array} routesData - Array of route objects
   */
  loadRoutes: function loadRoutes(routesData) {
    // Clear existing routes
    $('.route-row').remove(); // Add each route

    if (routesData && routesData.length > 0) {
      routesData.forEach(function (route) {
        StaticRoutesManager.addRoute(route);
      });
    } else {
      // Show empty state if no routes
      StaticRoutesManager.updateEmptyState();
    } // Reinitialize drag-and-drop after adding routes


    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Collect routes from table
   * @returns {Array} Array of route objects
   */
  collectRoutes: function collectRoutes() {
    var routes = [];
    $('.route-row').each(function (index, row) {
      var $row = $(row);
      var routeId = $row.attr('data-route-id');
      var subnetDropdownId = "subnet-route-".concat(routeId);
      var interfaceDropdownId = "interface-route-".concat(routeId);
      routes.push({
        id: routeId.startsWith('new_') ? null : routeId,
        network: $row.find('.network-input').val(),
        subnet: $("#".concat(subnetDropdownId)).val(),
        gateway: $row.find('.gateway-input').val(),
        "interface": $("#".concat(interfaceDropdownId)).val() || '',
        description: $row.find('.description-input').val(),
        priority: index + 1
      });
    });
    return routes;
  }
};
/**
 *  Initialize network settings form on document ready
 */

$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwic2hvdyIsInVwZGF0ZUR1YWxTdGFja05hdExvZ2ljIiwidG9nZ2xlSVB2NkZpZWxkcyIsImludGVyZmFjZUlkIiwiJGlwdjZNb2RlRHJvcGRvd24iLCJpcHY2TW9kZSIsIiRtYW51YWxGaWVsZHNDb250YWluZXIiLCIkYXV0b0luZm9NZXNzYWdlIiwiJGlwdjZHYXRld2F5RmllbGQiLCIkaXB2NlByaW1hcnlETlNGaWVsZCIsIiRpcHY2U2Vjb25kYXJ5RE5TRmllbGQiLCJpc0R1YWxTdGFja01vZGUiLCJpcHY0YWRkciIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyTWFudWFsIiwiaXB2NmFkZHJBdXRvIiwiaXB2NmFkZHIiLCJoYXNJcHY0IiwidHJpbSIsImhhc0lwdjYiLCJpcHY2TG93ZXIiLCJ0b0xvd2VyQ2FzZSIsImlwdjZXaXRob3V0Q2lkciIsInNwbGl0IiwiaXNHbG9iYWxVbmljYXN0IiwidGVzdCIsImlzTmF0RW5hYmxlZCIsImFueUR1YWxTdGFjayIsInRhYiIsIiRzdGFuZGFyZE5hdFNlY3Rpb24iLCIkZHVhbFN0YWNrU2VjdGlvbiIsIiRleHRob3N0bmFtZUlucHV0IiwiJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyIiwiZmluZCIsImhhcyIsImZpcnN0IiwiJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciIsImFwcGVuZFRvIiwiJGF1dG9VcGRhdGVDaGVja2JveCIsInBhcmVudCIsImhvc3RuYW1lIiwibndfVmFsaWRhdGVFeHRlcm5hbEhvc3RuYW1lRW1wdHkiLCJmaWVsZHMiLCJuZXdSb3dJZCIsIm5hbWVDbGFzcyIsImlkZW50aWZpZXIiLCJud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHkiLCJ2bGFuQ2xhc3MiLCJud19WYWxpZGF0ZVZsYW5SYW5nZSIsIm53X1ZhbGlkYXRlVmxhbkNyb3NzIiwiaXBhZGRyQ2xhc3MiLCJud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5IiwibndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJzdGF0aWNSb3V0ZXMiLCJjb2xsZWN0Um91dGVzIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiJGNoZWNrYm94IiwiaXNEaXNhYmxlZCIsImhhc0NsYXNzIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiaXB2Nk1vZGVNYXRjaCIsIm1vZGUiLCJzdWJuZXRLZXkiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiaW5saW5lIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiTmV0d29ya0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZ2V0Q29uZmlnIiwicG9wdWxhdGVGb3JtIiwiaXNEb2NrZXIiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3dEb2NrZXJOZXR3b3JrSW5mbyIsImNvbnNvbGUiLCJ3YXJuIiwiY2lkclRvTmV0bWFzayIsImNpZHIiLCJtYXNrIiwiam9pbiIsImNyZWF0ZUludGVyZmFjZVRhYnMiLCIkbWVudSIsIiRjb250ZW50IiwiZW1wdHkiLCJpbnRlcmZhY2VzIiwiaWZhY2UiLCJ0YWJJZCIsImlkIiwidGFiTGFiZWwiLCJ2bGFuaWQiLCJpc0FjdGl2ZSIsImFwcGVuZCIsImNhbkRlbGV0ZSIsInBhcnNlSW50IiwiZGVsZXRlQnV0dG9uIiwibndfRGVsZXRlQ3VycmVudEludGVyZmFjZSIsImNyZWF0ZUludGVyZmFjZUZvcm0iLCJ0ZW1wbGF0ZSIsImNyZWF0ZVRlbXBsYXRlRm9ybSIsInBoeXNpY2FsSW50ZXJmYWNlcyIsInRvU3RyaW5nIiwicGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zIiwidmFsdWVzIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJpbnRlcmZhY2VfMCIsInN0YXRpY09wdGlvbnMiLCJwbGFjZWhvbGRlciIsIm53X1NlbGVjdEludGVyZmFjZSIsImFsbG93RW1wdHkiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJpcHY2TW9kZUZpZWxkTmFtZSIsImlwdjZNb2RlRm9ybURhdGEiLCJpcHY2X21vZGUiLCJud19JUHY2TW9kZU9mZiIsIm53X0lQdjZNb2RlQXV0byIsIm53X0lQdjZNb2RlTWFudWFsIiwibndfU2VsZWN0SVB2Nk1vZGUiLCJkYXRhQ2hhbmdlZCIsImlwdjZTdWJuZXRGaWVsZE5hbWUiLCJpcHY2U3VibmV0Rm9ybURhdGEiLCJpcHY2X3N1Ym5ldCIsImdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3RJUHY2U3VibmV0Iiwic3VibmV0XzAiLCJ1cGRhdGVWaXNpYmlsaXR5Iiwib2ZmIiwiJGJ1dHRvbiIsInJlbW92ZSIsIiR0YWJDb250ZW50IiwiJGZpcnN0VGFiIiwiZW5hYmxlRGlycml0eSIsImNoZWNrVmFsdWVzIiwiJHZsYW5JbnB1dCIsInZsYW5WYWx1ZSIsInNlbGVjdGVkSW50ZXJmYWNlSWQiLCIkdGFiIiwicHJlcGVuZCIsIiRkbnNHYXRld2F5R3JvdXAiLCIkZG5zR2F0ZXdheUZpZWxkcyIsIiRkaGNwSW5mb01lc3NhZ2UiLCJvcmlnaW5hbFNhdmVJbml0aWFsVmFsdWVzIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJvcmlnaW5hbENoZWNrVmFsdWVzIiwiZm9tYW50aWNWYWx1ZXMiLCJtYW51YWxWYWx1ZXMiLCIkZmllbGQiLCJpcyIsIm9sZEZvcm1WYWx1ZXMiLCJuZXdGb3JtVmFsdWVzIiwiSlNPTiIsInN0cmluZ2lmeSIsIiRzdWJtaXRCdXR0b24iLCIkZHJvcGRvd25TdWJtaXQiLCJzZXRFdmVudHMiLCJpc0ludGVybmV0SW50ZXJmYWNlIiwiaW50ZXJuZXQiLCJkbnNHYXRld2F5VmlzaWJsZSIsImdhdGV3YXlSZWFkb25seSIsImRoY3AiLCJnYXRld2F5RGlzYWJsZWRDbGFzcyIsImRuc1JlYWRvbmx5IiwiZG5zRGlzYWJsZWRDbGFzcyIsImlwdjZHYXRld2F5UmVhZG9ubHkiLCJpcHY2R2F0ZXdheURpc2FibGVkQ2xhc3MiLCJpcHY2RmllbGRzVmlzaWJsZSIsImRvY2tlclJlYWRvbmx5IiwiZG9ja2VyRGlzYWJsZWRDbGFzcyIsImRoY3BEaXNhYmxlZCIsImRoY3BDaGVja2VkIiwiaXBhZGRyIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVXNlREhDUCIsIm53X0RIQ1BJbmZvSGVhZGVyIiwibndfREhDUEluZm9JUCIsImN1cnJlbnRJcGFkZHIiLCJud19ESENQSW5mb1N1Ym5ldCIsImN1cnJlbnRTdWJuZXQiLCJud19ESENQSW5mb0dhdGV3YXkiLCJjdXJyZW50R2F0ZXdheSIsIm53X0RIQ1BJbmZvRE5TIiwicHJpbWFyeWRucyIsInNlY29uZGFyeWRucyIsImRvbWFpbiIsIm53X0RIQ1BJbmZvRG9tYWluIiwibndfREhDUEluZm9Ib3N0bmFtZSIsIm53X0lQQWRkcmVzcyIsIm53X05ldHdvcmtNYXNrIiwibndfVmxhbklEIiwibndfSVB2Nk1vZGUiLCJjdXJyZW50SXB2NmFkZHIiLCJud19JUHY2QXV0b0luZm9IZWFkZXIiLCJud19JUHY2QXV0b0luZm9BZGRyZXNzIiwibndfSVB2NkF1dG9JbmZvUHJlZml4IiwiY3VycmVudElwdjZfc3VibmV0IiwiY3VycmVudElwdjZfZ2F0ZXdheSIsImlwdjZfZ2F0ZXdheSIsIm53X0lQdjZBdXRvSW5mb0dhdGV3YXkiLCJjdXJyZW50UHJpbWFyeWRuczYiLCJwcmltYXJ5ZG5zNiIsIm53X0lQdjZBdXRvSW5mb0ROUyIsImN1cnJlbnRTZWNvbmRhcnlkbnM2Iiwic2Vjb25kYXJ5ZG5zNiIsIm53X0lQdjZBZGRyZXNzIiwibndfSVB2NlN1Ym5ldCIsIm53X0ludGVybmV0U2V0dGluZ3MiLCJud19Ib3N0bmFtZSIsIm53X0RvbWFpbiIsIm53X0dhdGV3YXkiLCJud19JUHY2R2F0ZXdheSIsIm53X1ByaW1hcnlETlMiLCJud19TZWNvbmRhcnlETlMiLCJud19JUHY2UHJpbWFyeUROUyIsIm53X0lQdjZTZWNvbmRhcnlETlMiLCJvcHRpb25zIiwiaSIsImRlc2NyaXB0aW9uIiwicHVzaCIsIm5hdCIsIkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImEiLCJpcHY2UGF0dGVybiIsImlwYWRkcmVzcyIsImlwYWRkcldpdGhQb3J0T3B0aW9uYWwiLCJjaGVja1ZsYW4iLCJwYXJhbSIsImFsbFZhbHVlcyIsIm5ld0V0aE5hbWUiLCJ2bGFuaWRfMCIsImluZGV4T2YiLCJldGhOYW1lIiwiaW5BcnJheSIsImV4dGVuYWxJcEhvc3QiLCJ2YWxpZEhvc3RuYW1lIiwiaG9zdG5hbWVSZWdleCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsIiR0YWJsZUNvbnRhaW5lciIsIiRlbXB0eVBsYWNlaG9sZGVyIiwicm91dGVzIiwiaW5pdGlhbGl6ZURyYWdBbmREcm9wIiwiYWRkUm91dGUiLCJkb2N1bWVudCIsInRhcmdldCIsInVwZGF0ZVByaW9yaXRpZXMiLCJ1cGRhdGVFbXB0eVN0YXRlIiwiJHNvdXJjZVJvdyIsImNvcHlSb3V0ZSIsInBhc3RlZERhdGEiLCJvcmlnaW5hbEV2ZW50IiwiY2xpcGJvYXJkRGF0YSIsImdldERhdGEiLCJ3aW5kb3ciLCJjbGVhbmVkRGF0YSIsInNldFRpbWVvdXQiLCJ0YWJsZURuRFVwZGF0ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZHJhZ0hhbmRsZSIsImludGVyZmFjZUNvdW50Iiwibm90Iiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsIiRleGlzdGluZ1Jvd3MiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwiRGF0ZSIsIm5vdyIsImFmdGVyIiwiaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duIiwiaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duIiwiJHJvdyIsInNlbGVjdGVkVmFsdWUiLCIkY29udGFpbmVyIiwiZHJvcGRvd25JZCIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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LENBQUN6UixJQUFMLENBQVUsZ0JBQVYsRUFBNEJwQyxHQUE1QixFQUpEO0FBS1IscUJBQVcxRixDQUFDLFlBQUswWSxtQkFBTCxFQUFELENBQTZCaFQsR0FBN0IsTUFBc0MsRUFMekM7QUFNUjJQLFFBQUFBLFdBQVcsRUFBRWtFLElBQUksQ0FBQ3pSLElBQUwsQ0FBVSxvQkFBVixFQUFnQ3BDLEdBQWhDLEVBTkw7QUFPUndVLFFBQUFBLFFBQVEsRUFBRWxWLEtBQUssR0FBRztBQVBWLE9BQVo7QUFTSCxLQWZEO0FBZ0JBLFdBQU9rUyxNQUFQO0FBQ0g7QUFoVXVCLENBQTVCO0FBbVVBO0FBQ0E7QUFDQTs7QUFDQWxYLENBQUMsQ0FBQ3FYLFFBQUQsQ0FBRCxDQUFZOEMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcmEsRUFBQUEsUUFBUSxDQUFDcUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBcHBseSBJUCBtYXNrIGZvciBleHRlcm5hbCBJUCBhZGRyZXNzIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiBpbiBEb2NrZXIgKG1hbmFnZWQgdmlhIGRvLW5vdC1zaG93LWlmLWRvY2tlciBjbGFzcylcbiAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuaXApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubndfRXJyb3JHZXR0aW5nRXh0ZXJuYWxJcCB8fCAnRmFpbGVkIHRvIGdldCBleHRlcm5hbCBJUCBhZGRyZXNzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmRhdGEuaXAgKyBwb3J0O1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIFVwZGF0ZXMgYm90aCBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZU5BVEhlbHBUZXh0KHBvcnRzKSB7XG4gICAgICAgIC8vIFdIWTogUG9ydCBrZXlzIG1hdGNoIFBieFNldHRpbmdzIGNvbnN0YW50cyAoU0lQUG9ydCwgVExTX1BPUlQsIFJUUFBvcnRGcm9tLCBSVFBQb3J0VG8pXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBQb3J0IHx8ICFwb3J0cy5UTFNfUE9SVCB8fCAhcG9ydHMuUlRQUG9ydEZyb20gfHwgIXBvcnRzLlJUUFBvcnRUbykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkcnRwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1ydHAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkcnRwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBydHBUZXh0ID0gaTE4bignbndfTkFUSW5mbzQnLCB7XG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX0ZST00nOiBwb3J0cy5SVFBQb3J0RnJvbSxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiBwb3J0cy5SVFBQb3J0VG9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBTSVAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzID0gJCgnI2R1YWwtc3RhY2stc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMuaHRtbChkdWFsU3RhY2tTaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBSVFAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzID0gJCgnI2R1YWwtc3RhY2stcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrUnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrUnRwVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgZmllbGQgbGFiZWxzIHdpdGggYWN0dWFsIGludGVybmFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIFdIWTogUG9ydCBrZXlzIG1hdGNoIFBieFNldHRpbmdzIGNvbnN0YW50cyAoU0lQUG9ydCwgVExTX1BPUlQpXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBQb3J0IHx8ICFwb3J0cy5UTFNfUE9SVCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24gLSBleHRlcm5hbCBUTFMgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkdGxzTGFiZWwgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCR0bHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0bHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICR0bHNMYWJlbC50ZXh0KHRsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcExhYmVsID0gJCgnI2R1YWwtc3RhY2stc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tTaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NpcExhYmVsLnRleHQoZHVhbFN0YWNrU2lwTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBUTFMgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrVGxzTGFiZWwgPSAkKCcjZHVhbC1zdGFjay10bHMtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1Rsc0xhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1Rsc0xhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1RMU1BvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1Rsc0xhYmVsLnRleHQoZHVhbFN0YWNrVGxzTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSAnZGlzYWJsZWQnIGNsYXNzIGZvciBzcGVjaWZpYyBmaWVsZHMgYmFzZWQgb24gdGhlaXIgY2hlY2tib3ggc3RhdGUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXRoID0gJChvYmopLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtldGh9LWNoZWNrYm94YCk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gJGRoY3BDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAvLyBGaW5kIElQIGFkZHJlc3MgYW5kIHN1Ym5ldCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0ICRpcEZpZWxkID0gJChgaW5wdXRbbmFtZT1cImlwYWRkcl8ke2V0aH1cIl1gKTtcbiAgICAgICAgICAgIC8vIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgY3JlYXRlcyBkcm9wZG93biB3aXRoIGlkIHBhdHRlcm46IGZpZWxkTmFtZS1kcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJHN1Ym5ldERyb3Bkb3duID0gJChgI3N1Ym5ldF8ke2V0aH0tZHJvcGRvd25gKTtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gbWFrZSBJUC9zdWJuZXQgcmVhZC1vbmx5IGFuZCBhZGQgZGlzYWJsZWQgY2xhc3NcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRzdWJuZXREcm9wZG93bi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCBlZGl0YWJsZVxuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRzdWJuZXREcm9wZG93bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5ldHdvcmtzLmFkZE5ld0Zvcm1SdWxlcyhldGgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlL3Nob3cgTkFUIHNlY3Rpb25zIGluc3RlYWQgb2YgZGlzYWJsaW5nIHRvIHNpbXBsaWZ5IFVJXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgLy8gQWZ0ZXIgc2hvd2luZyBhbGwgc2VjdGlvbnMsIGRldGVybWluZSB3aGljaCBvbmUgdG8gYWN0dWFsbHkgZGlzcGxheVxuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgdmlzaWJpbGl0eSBvZiBJUHY2IG1hbnVhbCBjb25maWd1cmF0aW9uIGZpZWxkcyBiYXNlZCBvbiBzZWxlY3RlZCBtb2RlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludGVyZmFjZUlkIC0gSW50ZXJmYWNlIElEXG4gICAgICovXG4gICAgdG9nZ2xlSVB2NkZpZWxkcyhpbnRlcmZhY2VJZCkge1xuICAgICAgICBjb25zdCAkaXB2Nk1vZGVEcm9wZG93biA9ICQoYCNpcHY2X21vZGVfJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgaXB2Nk1vZGUgPSAkaXB2Nk1vZGVEcm9wZG93bi52YWwoKTtcbiAgICAgICAgY29uc3QgJG1hbnVhbEZpZWxkc0NvbnRhaW5lciA9ICQoYC5pcHY2LW1hbnVhbC1maWVsZHMtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGF1dG9JbmZvTWVzc2FnZSA9ICQoYC5pcHY2LWF1dG8taW5mby1tZXNzYWdlLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRpcHY2R2F0ZXdheUZpZWxkID0gJChgLmlwdjYtZ2F0ZXdheS1maWVsZC0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkaXB2NlByaW1hcnlETlNGaWVsZCA9ICQoYC5pcHY2LXByaW1hcnlkbnMtZmllbGQtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGlwdjZTZWNvbmRhcnlETlNGaWVsZCA9ICQoYC5pcHY2LXNlY29uZGFyeWRucy1maWVsZC0ke2ludGVyZmFjZUlkfWApO1xuXG4gICAgICAgIC8vIFNob3cgbWFudWFsIGZpZWxkcyBvbmx5IHdoZW4gbW9kZSBpcyAnMicgKE1hbnVhbClcbiAgICAgICAgaWYgKGlwdjZNb2RlID09PSAnMicpIHtcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuc2hvdygpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NkdhdGV3YXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NlByaW1hcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NlNlY29uZGFyeUROU0ZpZWxkLnNob3coKTtcbiAgICAgICAgfSBlbHNlIGlmIChpcHY2TW9kZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAvLyBTaG93IEF1dG8gKFNMQUFDKSBpbmZvIG1lc3NhZ2Ugd2hlbiBtb2RlIGlzICcxJyAoQXV0bylcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NkdhdGV3YXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NlByaW1hcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NlNlY29uZGFyeUROU0ZpZWxkLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIElQdjYgZmllbGRzIGZvciBtb2RlICcwJyAoT2ZmKVxuICAgICAgICAgICAgJG1hbnVhbEZpZWxkc0NvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYXV0b0luZm9NZXNzYWdlLmhpZGUoKTtcbiAgICAgICAgICAgICRpcHY2R2F0ZXdheUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICRpcHY2UHJpbWFyeUROU0ZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICRpcHY2U2Vjb25kYXJ5RE5TRmllbGQuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGR1YWwtc3RhY2sgTkFUIGxvZ2ljIHdoZW4gSVB2NiBtb2RlIGNoYW5nZXNcbiAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZHVhbC1zdGFjayBtb2RlIGlzIGFjdGl2ZSAoSVB2NCArIElQdjYgcHVibGljIGFkZHJlc3MgYm90aCBjb25maWd1cmVkKVxuICAgICAqIER1YWwtc3RhY2sgTkFUIHNlY3Rpb24gaXMgc2hvd24gd2hlbiBib3RoIElQdjQgYW5kIHB1YmxpYyBJUHY2IGFyZSBwcmVzZW50LlxuICAgICAqIFB1YmxpYyBJUHY2ID0gR2xvYmFsIFVuaWNhc3QgYWRkcmVzc2VzICgyMDAwOjovMykgdGhhdCBzdGFydCB3aXRoIDIgb3IgMy5cbiAgICAgKiBQcml2YXRlIElQdjYgYWRkcmVzc2VzIChVTEEgZmQwMDo6LzgsIGxpbmstbG9jYWwgZmU4MDo6LzEwKSBkbyBOT1QgdHJpZ2dlciBkdWFsLXN0YWNrLlxuICAgICAqXG4gICAgICogSVB2NCBkZXRlY3Rpb24gd29ya3MgZm9yIGJvdGggc3RhdGljIGFuZCBESENQIGNvbmZpZ3VyYXRpb25zOlxuICAgICAqIC0gU3RhdGljOiBjaGVja3MgaXBhZGRyX1ggZmllbGRcbiAgICAgKiAtIERIQ1A6IGNoZWNrcyBpZiBESENQIGlzIGVuYWJsZWQgQU5EIGdhdGV3YXkgaXMgb2J0YWluZWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcmZhY2VJZCAtIEludGVyZmFjZSBJRFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGR1YWwtc3RhY2sgd2l0aCBwdWJsaWMgSVB2NiwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICovXG4gICAgaXNEdWFsU3RhY2tNb2RlKGludGVyZmFjZUlkKSB7XG4gICAgICAgIC8vIEdldCBJUHY0IGNvbmZpZ3VyYXRpb24gKHN0YXRpYyBvciBESENQKVxuICAgICAgICBjb25zdCBpcHY0YWRkciA9ICQoYGlucHV0W25hbWU9XCJpcGFkZHJfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKTtcbiAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7aW50ZXJmYWNlSWR9LWNoZWNrYm94YCk7XG4gICAgICAgIGNvbnN0IGRoY3BFbmFibGVkID0gJGRoY3BDaGVja2JveC5sZW5ndGggPiAwICYmICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgZ2F0ZXdheSA9ICQoYGlucHV0W25hbWU9XCJnYXRld2F5XyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG5cbiAgICAgICAgLy8gR2V0IElQdjYgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBpcHY2TW9kZSA9ICQoYCNpcHY2X21vZGVfJHtpbnRlcmZhY2VJZH1gKS52YWwoKTtcbiAgICAgICAgLy8gRm9yIE1hbnVhbCBtb2RlIHVzZSBmb3JtIGZpZWxkLCBmb3IgQXV0byBtb2RlIHVzZSBjdXJyZW50IChhdXRvY29uZmlndXJlZCkgdmFsdWUgZnJvbSBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgaXB2NmFkZHJNYW51YWwgPSAkKGBpbnB1dFtuYW1lPVwiaXB2NmFkZHJfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKTtcbiAgICAgICAgY29uc3QgaXB2NmFkZHJBdXRvID0gJChgI2N1cnJlbnQtaXB2NmFkZHItJHtpbnRlcmZhY2VJZH1gKS52YWwoKTtcbiAgICAgICAgY29uc3QgaXB2NmFkZHIgPSBpcHY2TW9kZSA9PT0gJzEnID8gaXB2NmFkZHJBdXRvIDogaXB2NmFkZHJNYW51YWw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NCBpcyBwcmVzZW50IChlaXRoZXIgc3RhdGljIGFkZHJlc3Mgb3IgREhDUCB3aXRoIGdhdGV3YXkpXG4gICAgICAgIC8vIEdhdGV3YXkgcHJlc2VuY2UgaW5kaWNhdGVzIERIQ1Agc3VjY2Vzc2Z1bGx5IG9idGFpbmVkIGFuIElQdjQgYWRkcmVzc1xuICAgICAgICBjb25zdCBoYXNJcHY0ID0gKGlwdjRhZGRyICYmIGlwdjRhZGRyLnRyaW0oKSAhPT0gJycpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZGhjcEVuYWJsZWQgJiYgZ2F0ZXdheSAmJiBnYXRld2F5LnRyaW0oKSAhPT0gJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjYgaXMgZW5hYmxlZCAoQXV0byBTTEFBQy9ESENQdjYgb3IgTWFudWFsKVxuICAgICAgICAvLyBGb3IgQXV0byBtb2RlICgnMScpLCB3ZSBjaGVjayBjdXJyZW50SXB2NmFkZHIgd2hpY2ggc2hvd3MgYXV0b2NvbmZpZ3VyZWQgYWRkcmVzc1xuICAgICAgICBjb25zdCBoYXNJcHY2ID0gKGlwdjZNb2RlID09PSAnMScgfHwgaXB2Nk1vZGUgPT09ICcyJykgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGlwdjZhZGRyICYmIGlwdjZhZGRyLnRyaW0oKSAhPT0gJycgJiYgaXB2NmFkZHIgIT09ICdBdXRvY29uZmlndXJlZCc7XG5cbiAgICAgICAgaWYgKCFoYXNJcHY0IHx8ICFoYXNJcHY2KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY2IGFkZHJlc3MgaXMgZ2xvYmFsIHVuaWNhc3QgKHB1YmxpYylcbiAgICAgICAgLy8gR2xvYmFsIHVuaWNhc3Q6IDIwMDA6Oi8zIChhZGRyZXNzZXMgc3RhcnRpbmcgd2l0aCAyIG9yIDMpXG4gICAgICAgIC8vIEV4Y2x1ZGUgVUxBIChmZDAwOjovOCkgYW5kIGxpbmstbG9jYWwgKGZlODA6Oi8xMClcbiAgICAgICAgY29uc3QgaXB2Nkxvd2VyID0gaXB2NmFkZHIudG9Mb3dlckNhc2UoKS50cmltKCk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIENJRFIgbm90YXRpb24gaWYgcHJlc2VudCAoZS5nLiwgXCIyMDAxOmRiODo6MS82NFwiIC0+IFwiMjAwMTpkYjg6OjFcIilcbiAgICAgICAgY29uc3QgaXB2NldpdGhvdXRDaWRyID0gaXB2Nkxvd2VyLnNwbGl0KCcvJylbMF07XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZmlyc3QgY2hhcmFjdGVyIGlzIDIgb3IgMyAoZ2xvYmFsIHVuaWNhc3QgcmFuZ2UpXG4gICAgICAgIGNvbnN0IGlzR2xvYmFsVW5pY2FzdCA9IC9eWzIzXS8udGVzdChpcHY2V2l0aG91dENpZHIpO1xuXG4gICAgICAgIHJldHVybiBpc0dsb2JhbFVuaWNhc3Q7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgc2VjdGlvbiBVSSBiYXNlZCBvbiBkdWFsLXN0YWNrIGRldGVjdGlvblxuICAgICAqIFN3aXRjaGVzIGJldHdlZW4gc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIE1ha2VzIGV4dGhvc3RuYW1lIHJlcXVpcmVkIGluIGR1YWwtc3RhY2sgbW9kZVxuICAgICAqL1xuICAgIHVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBOQVQgaXMgZW5hYmxlZCAtIGlmIG5vdCwgZG9uJ3Qgc2hvdyBhbnkgTkFUIHNlY3Rpb25zXG4gICAgICAgIGNvbnN0IGlzTmF0RW5hYmxlZCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBpZiAoIWlzTmF0RW5hYmxlZCkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBOQVQgZGlzYWJsZWQsIHNlY3Rpb25zIGFscmVhZHkgaGlkZGVuIGJ5IHRvZ2dsZURpc2FibGVkRmllbGRDbGFzc1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYW55IGludGVyZmFjZSBpcyBpbiBkdWFsLXN0YWNrIG1vZGVcbiAgICAgICAgbGV0IGFueUR1YWxTdGFjayA9IGZhbHNlO1xuXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICQodGFiKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgaWYgKG5ldHdvcmtzLmlzRHVhbFN0YWNrTW9kZShpbnRlcmZhY2VJZCkpIHtcbiAgICAgICAgICAgICAgICBhbnlEdWFsU3RhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gQnJlYWsgbG9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCAkc3RhbmRhcmROYXRTZWN0aW9uID0gJCgnI3N0YW5kYXJkLW5hdC1zZWN0aW9uJyk7XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTZWN0aW9uID0gJCgnI2R1YWwtc3RhY2stc2VjdGlvbicpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgZXh0aG9zdG5hbWUgaW5wdXQgZWxlbWVudCBhbmQgaXRzIG9yaWdpbmFsIHBhcmVudFxuICAgICAgICBjb25zdCAkZXh0aG9zdG5hbWVJbnB1dCA9ICQoJyNleHRob3N0bmFtZScpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRIb3N0bmFtZVdyYXBwZXIgPSAkc3RhbmRhcmROYXRTZWN0aW9uLmZpbmQoJy5tYXgtd2lkdGgtNTAwJykuaGFzKCcjZXh0aG9zdG5hbWUnKS5maXJzdCgpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyID0gJCgnI2V4dGhvc3RuYW1lLWR1YWwtc3RhY2staW5wdXQtd3JhcHBlcicpO1xuXG4gICAgICAgIGlmIChhbnlEdWFsU3RhY2spIHtcbiAgICAgICAgICAgIC8vIER1YWwtc3RhY2sgZGV0ZWN0ZWQ6IEhpZGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIHNob3cgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBleHRob3N0bmFtZSBpbnB1dCB0byBkdWFsLXN0YWNrIHNlY3Rpb24gKGF2b2lkIGR1cGxpY2F0ZSBpbnB1dHMpXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0aG9zdG5hbWVJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0aXBhZGRyIChleHRlcm5hbCBJUCBub3QgbmVlZGVkIGluIGR1YWwtc3RhY2ssIG9ubHkgaG9zdG5hbWUpXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgJycpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGF1dG9VcGRhdGVFeHRlcm5hbElwIChub3QgbmVlZGVkIGluIGR1YWwtc3RhY2spXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBob3N0bmFtZSBkaXNwbGF5IGluIGR1YWwtc3RhY2sgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBob3N0bmFtZSA9ICRleHRob3N0bmFtZUlucHV0LnZhbCgpIHx8ICdtaWtvcGJ4LmNvbXBhbnkuY29tJztcbiAgICAgICAgICAgICQoJyNob3N0bmFtZS1kaXNwbGF5JykudGV4dChob3N0bmFtZSk7XG5cbiAgICAgICAgICAgIC8vIE1ha2UgZXh0aG9zdG5hbWUgcmVxdWlyZWQgaW4gZHVhbC1zdGFja1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5ydWxlcyA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0ZXJuYWxIb3N0bmFtZUVtcHR5IHx8ICdFeHRlcm5hbCBob3N0bmFtZSBpcyByZXF1aXJlZCBpbiBkdWFsLXN0YWNrIG1vZGUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIHx8ICdJbnZhbGlkIGhvc3RuYW1lIGZvcm1hdCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkdWFsLXN0YWNrOiBTaG93IHN0YW5kYXJkIE5BVCBzZWN0aW9uLCBoaWRlIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAgICAgICAgJHN0YW5kYXJkTmF0U2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgZXh0aG9zdG5hbWUgaW5wdXQgYmFjayB0byBzdGFuZGFyZCBzZWN0aW9uXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgZXh0aG9zdG5hbWUgdmFsaWRhdGlvbiAob3B0aW9uYWwgd2l0aCB1c2VuYXQgZGVwZW5kZW5jeSlcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUuZGVwZW5kcyA9ICd1c2VuYXQnO1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5ydWxlcyA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZGVzdHJveScpLmZvcm0oe1xuICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgIGZpZWxkczogbmV0d29ya3MudmFsaWRhdGVSdWxlc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBuZXcgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBhIHNwZWNpZmljIHJvdyBpbiB0aGUgbmV0d29yayBjb25maWd1cmF0aW9uIGZvcm0uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1Jvd0lkIC0gVGhlIElEIG9mIHRoZSBuZXcgcm93IHRvIGFkZCB0aGUgZm9ybSBydWxlcyBmb3IuXG4gICAgICovXG4gICAgYWRkTmV3Rm9ybVJ1bGVzKG5ld1Jvd0lkKSB7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICduYW1lJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBuYW1lQ2xhc3MgPSBgbmFtZV8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnbmFtZScgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tuYW1lQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogbmFtZUNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IHZsYW5DbGFzcyA9IGB2bGFuaWRfJHtuZXdSb3dJZH1gO1xuXG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAndmxhbmlkJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW3ZsYW5DbGFzc10gPSB7XG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IHZsYW5DbGFzcyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi40MDk1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhblJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgY2hlY2tWbGFuWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhbkNyb3NzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGlwYWRkckNsYXNzID0gYGlwYWRkcl8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZFxuICAgICAgICAvLyBGb3IgdGVtcGxhdGUgaW50ZXJmYWNlIChpZD0wKSwgYWRkIGRlcGVuZGVuY3kgb24gaW50ZXJmYWNlIHNlbGVjdGlvblxuICAgICAgICBpZiAobmV3Um93SWQgPT09IDAgfHwgbmV3Um93SWQgPT09ICcwJykge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsICAvLyBUZW1wbGF0ZTogdmFsaWRhdGUgb25seSBpZiBpbnRlcmZhY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBub3RkaGNwXyR7bmV3Um93SWR9YCwgIC8vIFJlYWwgaW50ZXJmYWNlOiB2YWxpZGF0ZSBvbmx5IGlmIERIQ1AgaXMgT0ZGXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBESENQIHZhbGlkYXRpb24gcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlc1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGFsbCBzZXR0aW5ncyBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7fTtcblxuICAgICAgICAvLyBDb2xsZWN0IHN0YXRpYyByb3V0ZXNcbiAgICAgICAgcmVzdWx0LmRhdGEuc3RhdGljUm91dGVzID0gU3RhdGljUm91dGVzTWFuYWdlci5jb2xsZWN0Um91dGVzKCk7XG5cbiAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBmb3JtIHZhbHVlcyB0byBhdm9pZCBhbnkgRE9NLXJlbGF0ZWQgaXNzdWVzXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIHJlZ3VsYXIgaW5wdXQgZmllbGRzXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwiaGlkZGVuXCJdLCBpbnB1dFt0eXBlPVwibnVtYmVyXCJdLCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0IGRyb3Bkb3duc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJHNlbGVjdC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHNlbGVjdC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuXG4gICAgICAgIC8vIFBieEFwaUNsaWVudCB3aWxsIGhhbmRsZSBjb252ZXJzaW9uIHRvIHN0cmluZ3MgZm9yIGpRdWVyeVxuICAgICAgICByZXN1bHQuZGF0YS51c2VuYXQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBVc2UgY29ycmVjdCBmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0gKGF1dG9VcGRhdGVFeHRlcm5hbElwLCBub3QgQVVUT19VUERBVEVfRVhURVJOQUxfSVApXG4gICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlRGl2ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgaWYgKCRhdXRvVXBkYXRlRGl2Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gJGF1dG9VcGRhdGVEaXYuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb252ZXJ0IERIQ1AgY2hlY2tib3hlcyB0byBib29sZWFuIGZvciBlYWNoIGludGVyZmFjZVxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCcuZGhjcC1jaGVja2JveCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0SWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gaW5wdXRJZC5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIGFjdHVhbCBpbnB1dCBzdGF0ZSBpbnN0ZWFkIG9mIEZvbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChvYmopO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICRjaGVja2JveC5oYXNDbGFzcygnZGlzYWJsZWQnKSB8fCAkaW5wdXQucHJvcCgnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKGlzRGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZGlzYWJsZWQgY2hlY2tib3hlcywgcmVhZCB0aGUgYWN0dWFsIGlucHV0IGNoZWNrZWQgc3RhdGVcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtgZGhjcF8ke3Jvd0lkfWBdID0gJGlucHV0LnByb3AoJ2NoZWNrZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGVuYWJsZWQgY2hlY2tib3hlcywgdXNlIEZvbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBpbnRlcm5ldCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoJGNoZWNrZWRSYWRpby52YWwoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXSFk6IE5vIHBvcnQgZmllbGQgbWFwcGluZyBuZWVkZWQgLSBmb3JtIGZpZWxkIG5hbWVzIG1hdGNoIEFQSSBjb25zdGFudHNcbiAgICAgICAgLy8gKGV4dGVybmFsU0lQUG9ydCA9IFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVClcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBJUHY2IHN1Ym5ldCBmb3IgQXV0byBtb2RlIChTTEFBQy9ESENQdjYpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZU1hdGNoID0ga2V5Lm1hdGNoKC9eaXB2Nl9tb2RlXyhcXGQrKSQvKTtcbiAgICAgICAgICAgIGlmIChpcHY2TW9kZU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSBpcHY2TW9kZU1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Ym5ldEtleSA9IGBpcHY2X3N1Ym5ldF8ke2ludGVyZmFjZUlkfWA7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBtb2RlIGlzIEF1dG8gKCcxJykgYW5kIHN1Ym5ldCBpcyBlbXB0eSwgc2V0IGRlZmF1bHQgdG8gJzY0J1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnMScgJiYgKCFyZXN1bHQuZGF0YVtzdWJuZXRLZXldIHx8IHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPT09ICcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtzdWJuZXRLZXldID0gJzY0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBEb2NrZXIgbmV0d29yayBpbmZvIGFzIHJlYWQtb25seVxuICAgICAqIERFUFJFQ0FURUQ6IERvY2tlciBub3cgdXNlcyBzYW1lIGludGVyZmFjZSB0YWJzIGFzIHJlZ3VsYXIgaW5zdGFsbGF0aW9uXG4gICAgICovXG4gICAgc2hvd0RvY2tlck5ldHdvcmtJbmZvKGRhdGEpIHtcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBubyBsb25nZXIgdXNlZCAtIERvY2tlciB1c2VzIGNyZWF0ZUludGVyZmFjZVRhYnMgaW5zdGVhZFxuICAgICAgICBjb25zb2xlLndhcm4oJ3Nob3dEb2NrZXJOZXR3b3JrSW5mbyBpcyBkZXByZWNhdGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQ0lEUiBub3RhdGlvbiB0byBkb3R0ZWQgZGVjaW1hbCBuZXRtYXNrXG4gICAgICovXG4gICAgY2lkclRvTmV0bWFzayhjaWRyKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSB+KDIgKiogKDMyIC0gY2lkcikgLSAxKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIChtYXNrID4+PiAyNCkgJiAyNTUsXG4gICAgICAgICAgICAobWFzayA+Pj4gMTYpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDgpICYgMjU1LFxuICAgICAgICAgICAgbWFzayAmIDI1NVxuICAgICAgICBdLmpvaW4oJy4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEludGVyZmFjZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICAvLyBJbiBEb2NrZXIsIGRpc2FibGUgZGVsZXRlIGZvciBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gIWlzRG9ja2VyICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOIChub3QgZm9yIERvY2tlcilcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUgJiYgIWlzRG9ja2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBtb2RlIGRyb3Bkb3duIChPZmYvQXV0by9NYW51YWwpXG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZpZWxkTmFtZSA9IGBpcHY2X21vZGVfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2Nk1vZGVGb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgaXB2Nk1vZGVGb3JtRGF0YVtpcHY2TW9kZUZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9tb2RlIHx8ICcwJyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2TW9kZUZpZWxkTmFtZSwgaXB2Nk1vZGVGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU9mZiB8fCAnT2ZmJ30sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVBdXRvIHx8ICdBdXRvIChTTEFBQy9ESENQdjYpJ30sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVNYW51YWwgfHwgJ01hbnVhbCd9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZNb2RlIHx8ICdTZWxlY3QgSVB2NiBNb2RlJyxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVJUHY2RmllbGRzKGlmYWNlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIElQdjYgc3VibmV0IGRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCBpcHY2U3VibmV0RmllbGROYW1lID0gYGlwdjZfc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZTdWJuZXRGb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgaXB2NlN1Ym5ldEZvcm1EYXRhW2lwdjZTdWJuZXRGaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLmlwdjZfc3VibmV0IHx8ICc2NCcpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oaXB2NlN1Ym5ldEZpZWxkTmFtZSwgaXB2NlN1Ym5ldEZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0SXB2NlN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2NlN1Ym5ldCB8fCAnU2VsZWN0IElQdjYgUHJlZml4JyxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBpbml0aWFsIHZpc2liaWxpdHkgb2YgSVB2NiBtYW51YWwgZmllbGRzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVJUHY2RmllbGRzKGlmYWNlLmlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChpZCA9IDApXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3N1Ym5ldF8wJywgeyBzdWJuZXRfMDogJzI0JyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoKTtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS5maXJzdCgpLnRyaWdnZXIoJ2NsaWNrJyk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiB2aXNpYmlsaXR5XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIHJlbW92ZXMgVEFCIGZyb20gZm9ybSBhbmQgbWFya3MgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgIC8vIEFjdHVhbCBkZWxldGlvbiBoYXBwZW5zIG9uIGZvcm0gc3VibWl0XG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBUQUIgbWVudSBpdGVtXG4gICAgICAgICAgICAkKGAjZXRoLWludGVyZmFjZXMtbWVudSBhW2RhdGEtdGFiPVwiJHtpbnRlcmZhY2VJZH1cIl1gKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBUQUIgY29udGVudFxuICAgICAgICAgICAgY29uc3QgJHRhYkNvbnRlbnQgPSAkKGAjZXRoLWludGVyZmFjZXMtY29udGVudCAudGFiW2RhdGEtdGFiPVwiJHtpbnRlcmZhY2VJZH1cIl1gKTtcbiAgICAgICAgICAgICR0YWJDb250ZW50LnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBBZGQgaGlkZGVuIGZpZWxkIHRvIG1hcmsgdGhpcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmFwcGVuZChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZGlzYWJsZWRfJHtpbnRlcmZhY2VJZH1cIiB2YWx1ZT1cIjFcIiAvPmApO1xuXG4gICAgICAgICAgICAvLyBTd2l0Y2ggdG8gZmlyc3QgYXZhaWxhYmxlIHRhYlxuICAgICAgICAgICAgY29uc3QgJGZpcnN0VGFiID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykuZmlyc3QoKTtcbiAgICAgICAgICAgIGlmICgkZmlyc3RUYWIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRmaXJzdFRhYi50YWIoJ2NoYW5nZSB0YWInLCAkZmlyc3RUYWIuYXR0cignZGF0YS10YWInKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIERIQ1AgY2hlY2tib3ggaGFuZGxlcnNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQWRkIFZMQU4gSUQgY2hhbmdlIGhhbmRsZXJzIHRvIGNvbnRyb2wgREhDUCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS5vZmYoJ2lucHV0IGNoYW5nZScpLm9uKCdpbnB1dCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR2bGFuSW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkdmxhbklucHV0LmF0dHIoJ25hbWUnKS5yZXBsYWNlKCd2bGFuaWRfJywgJycpO1xuICAgICAgICAgICAgY29uc3QgdmxhblZhbHVlID0gcGFyc2VJbnQoJHZsYW5JbnB1dC52YWwoKSwgMTApIHx8IDA7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcblxuICAgICAgICAgICAgaWYgKHZsYW5WYWx1ZSA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIERIQ1AgY2hlY2tib3ggZm9yIFZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbmFibGUgREhDUCBjaGVja2JveCBmb3Igbm9uLVZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGlzYWJsZWQgZmllbGQgY2xhc3Nlc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGhhbmRsZXIgZm9yIGV4aXN0aW5nIFZMQU4gaW50ZXJmYWNlcyB0byBhcHBseSBpbml0aWFsIHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJuZXQgcmFkaW8gYnV0dG9ucyB3aXRoIEZvbWFudGljIFVJXG4gICAgICAgICQoJy5pbnRlcm5ldC1yYWRpbycpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gQWRkIGludGVybmV0IHJhZGlvIGJ1dHRvbiBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdJykub2ZmKCdjaGFuZ2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZEludGVyZmFjZUlkID0gJCh0aGlzKS52YWwoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBhbGwgRE5TL0dhdGV3YXkgZ3JvdXBzXG4gICAgICAgICAgICAkKCdbY2xhc3NePVwiZG5zLWdhdGV3YXktZ3JvdXAtXCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBTaG93IEROUy9HYXRld2F5IGdyb3VwIGZvciBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2VcbiAgICAgICAgICAgICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke3NlbGVjdGVkSW50ZXJmYWNlSWR9YCkuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgVEFCIGljb25zIC0gYWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQsIHJlbW92ZSBmcm9tIG90aGVyc1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFiID0gJCh0YWIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYklkID0gJHRhYi5hdHRyKCdkYXRhLXRhYicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIGdsb2JlIGljb25cbiAgICAgICAgICAgICAgICAkdGFiLmZpbmQoJy5nbG9iZS5pY29uJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2UgVEFCXG4gICAgICAgICAgICAgICAgaWYgKHRhYklkID09PSBzZWxlY3RlZEludGVyZmFjZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgICR0YWIucHJlcGVuZCgnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIEROUy9HYXRld2F5IHJlYWRvbmx5IHN0YXRlIHdoZW4gREhDUCBjaGFuZ2VzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94Jykub2ZmKCdjaGFuZ2UuZG5zZ2F0ZXdheScpLm9uKCdjaGFuZ2UuZG5zZ2F0ZXdheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGNoZWNrYm94LmF0dHIoJ2lkJykucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAvLyBGaW5kIEROUy9HYXRld2F5IGZpZWxkcyBmb3IgdGhpcyBpbnRlcmZhY2VcbiAgICAgICAgICAgIGNvbnN0ICRkbnNHYXRld2F5R3JvdXAgPSAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgICAgIGNvbnN0ICRkbnNHYXRld2F5RmllbGRzID0gJGRuc0dhdGV3YXlHcm91cC5maW5kKCdpbnB1dFtuYW1lXj1cImdhdGV3YXlfXCJdLCBpbnB1dFtuYW1lXj1cInByaW1hcnlkbnNfXCJdLCBpbnB1dFtuYW1lXj1cInNlY29uZGFyeWRuc19cIl0nKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwSW5mb01lc3NhZ2UgPSAkKGAuZGhjcC1pbmZvLW1lc3NhZ2UtJHtpbnRlcmZhY2VJZH1gKTtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gbWFrZSBETlMvR2F0ZXdheSByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgZWRpdGFibGVcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLmhpZGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGR1YWwtc3RhY2sgTkFUIGxvZ2ljIHdoZW4gREhDUCBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpZmFjZSAtIEludGVyZmFjZSBkYXRhXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0FjdGl2ZSAtIFdoZXRoZXIgdGhpcyB0YWIgaXMgYWN0aXZlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlbGV0ZUJ1dHRvbiAtIEhUTUwgZm9yIGRlbGV0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlciBlbnZpcm9ubWVudFxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5IGFuZCByZWFkLW9ubHkgc3RhdGVcbiAgICAgICAgY29uc3QgZG5zR2F0ZXdheVZpc2libGUgPSBpc0ludGVybmV0SW50ZXJmYWNlID8gJycgOiAnc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCInO1xuXG4gICAgICAgIC8vIEluIERvY2tlcjogR2F0ZXdheSBpcyBhbHdheXMgcmVhZG9ubHksIEROUyBmaWVsZHMgYXJlIGVkaXRhYmxlXG4gICAgICAgIC8vIEluIHJlZ3VsYXIgbW9kZTogQWxsIGZpZWxkcyByZWFkb25seSBpZiBESENQIGVuYWJsZWRcbiAgICAgICAgY29uc3QgZ2F0ZXdheVJlYWRvbmx5ID0gaXNEb2NrZXIgfHwgaWZhY2UuZGhjcCA/ICdyZWFkb25seScgOiAnJztcbiAgICAgICAgY29uc3QgZ2F0ZXdheURpc2FibGVkQ2xhc3MgPSBpc0RvY2tlciB8fCBpZmFjZS5kaGNwID8gJ2Rpc2FibGVkJyA6ICcnO1xuICAgICAgICBjb25zdCBkbnNSZWFkb25seSA9IGlzRG9ja2VyID8gJycgOiAoaWZhY2UuZGhjcCA/ICdyZWFkb25seScgOiAnJyk7XG4gICAgICAgIGNvbnN0IGRuc0Rpc2FibGVkQ2xhc3MgPSBpc0RvY2tlciA/ICcnIDogKGlmYWNlLmRoY3AgPyAnZGlzYWJsZWQnIDogJycpO1xuXG4gICAgICAgIC8vIElQdjYgR2F0ZXdheTogcmVhZG9ubHkgd2hlbiBpcHY2X21vZGU9JzEnIChBdXRvL1NMQUFDKSwgZWRpdGFibGUgd2hlbiBpcHY2X21vZGU9JzInIChNYW51YWwpIG9yICcwJyAoT2ZmKVxuICAgICAgICBjb25zdCBpcHY2R2F0ZXdheVJlYWRvbmx5ID0gaWZhY2UuaXB2Nl9tb2RlID09PSAnMScgPyAncmVhZG9ubHknIDogJyc7XG4gICAgICAgIGNvbnN0IGlwdjZHYXRld2F5RGlzYWJsZWRDbGFzcyA9IGlmYWNlLmlwdjZfbW9kZSA9PT0gJzEnID8gJ2Rpc2FibGVkJyA6ICcnO1xuXG4gICAgICAgIC8vIElQdjYgZmllbGRzIHZpc2liaWxpdHk6IGhpZGUgd2hlbiBpcHY2X21vZGU9JzAnIChPZmYpLCBzaG93IHdoZW4gJzEnIChBdXRvKSBvciAnMicgKE1hbnVhbClcbiAgICAgICAgY29uc3QgaXB2NkZpZWxkc1Zpc2libGUgPSBpZmFjZS5pcHY2X21vZGUgPT09ICcwJyA/ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIicgOiAnJztcblxuICAgICAgICAvLyBJbiBEb2NrZXI6IElQLCBzdWJuZXQsIFZMQU4gYXJlIHJlYWRvbmx5XG4gICAgICAgIGNvbnN0IGRvY2tlclJlYWRvbmx5ID0gaXNEb2NrZXIgPyAncmVhZG9ubHknIDogJyc7XG4gICAgICAgIGNvbnN0IGRvY2tlckRpc2FibGVkQ2xhc3MgPSBpc0RvY2tlciA/ICdkaXNhYmxlZCcgOiAnJztcblxuICAgICAgICAvLyBJbiBEb2NrZXI6IERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgYW5kIGFsd2F5cyBjaGVja2VkXG4gICAgICAgIGNvbnN0IGRoY3BEaXNhYmxlZCA9IGlzRG9ja2VyIHx8IGlmYWNlLnZsYW5pZCA+IDA7XG4gICAgICAgIGNvbnN0IGRoY3BDaGVja2VkID0gaXNEb2NrZXIgfHwgKGlmYWNlLnZsYW5pZCA+IDAgPyBmYWxzZSA6IGlmYWNlLmRoY3ApO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50ICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaW50ZXJmYWNlfVwiIC8+XG5cbiAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gYFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiIHZhbHVlPVwiJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRoY3BfJHtpZH1cIiB2YWx1ZT1cIm9uXCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnMjQnfVwiIC8+XG4gICAgICAgICAgICAgICAgYCA6IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggaW50ZXJuZXQtcmFkaW9cIiBpZD1cImludGVybmV0LSR7aWR9LXJhZGlvXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYWRpb1wiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgJHtpc0ludGVybmV0SW50ZXJmYWNlID8gJ2NoZWNrZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRJbnRlcmZhY2UgfHwgJ0ludGVybmV0IEludGVyZmFjZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94JHtkaGNwRGlzYWJsZWQgPyAnIGRpc2FibGVkJyA6ICcnfVwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiICR7ZGhjcENoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gJHtkaGNwRGlzYWJsZWQgPyAnZGlzYWJsZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRoY3AtaW5mby1tZXNzYWdlLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiAke2RoY3BDaGVja2VkID8gJ2Jsb2NrJyA6ICdub25lJ307XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9IZWFkZXIgfHwgJ0RIQ1AgQ29uZmlndXJhdGlvbiBPYnRhaW5lZCd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0lQIHx8ICdJUCBBZGRyZXNzJ306IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXBhZGRyIHx8IGlmYWNlLmlwYWRkciB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9TdWJuZXQgfHwgJ1N1Ym5ldCd9OiA8c3Ryb25nPi8ke2lmYWNlLmN1cnJlbnRTdWJuZXQgfHwgaWZhY2Uuc3VibmV0IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0dhdGV3YXkgfHwgJ0dhdGV3YXknfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRHYXRld2F5IHx8IGlmYWNlLmdhdGV3YXkgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvRE5TIHx8ICdETlMnfTogPHN0cm9uZz4ke2lmYWNlLnByaW1hcnlkbnMgfHwgJ04vQSd9JHtpZmFjZS5zZWNvbmRhcnlkbnMgPyAnLCAnICsgaWZhY2Uuc2Vjb25kYXJ5ZG5zIDogJyd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpZmFjZS5kb21haW4gPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvRG9tYWluIHx8ICdEb21haW4nfTogPHN0cm9uZz4ke2lmYWNlLmRvbWFpbn08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpZmFjZS5ob3N0bmFtZSA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9Ib3N0bmFtZSB8fCAnSG9zdG5hbWUnfTogPHN0cm9uZz4ke2lmYWNlLmhvc3RuYW1lfTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyAnJyA6IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiICR7ZG9ja2VyUmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlIHx8ICdJUHY2IE1vZGUnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2Nl9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjZfbW9kZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X21vZGUgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPCEtLSBIaWRkZW4gZmllbGQgdG8gc3RvcmUgY3VycmVudCBhdXRvLWNvbmZpZ3VyZWQgSVB2NiBhZGRyZXNzIGZvciBkdWFsLXN0YWNrIGRldGVjdGlvbiAtLT5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiY3VycmVudC1pcHY2YWRkci0ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50SXB2NmFkZHIgfHwgJyd9XCIgLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LWF1dG8taW5mby1tZXNzYWdlLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiAke2lmYWNlLmlwdjZfbW9kZSA9PT0gJzEnID8gJ2Jsb2NrJyA6ICdub25lJ307XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvSGVhZGVyIHx8ICdJUHY2IEF1dG9jb25maWd1cmF0aW9uIChTTEFBQy9ESENQdjYpJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0FkZHJlc3MgfHwgJ0lQdjYgQWRkcmVzcyd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwdjZhZGRyIHx8IGlmYWNlLmlwdjZhZGRyIHx8ICdBdXRvY29uZmlndXJlZCd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb1ByZWZpeCB8fCAnUHJlZml4IExlbmd0aCd9OiA8c3Ryb25nPi8ke2lmYWNlLmN1cnJlbnRJcHY2X3N1Ym5ldCB8fCBpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7KGlmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5KSA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvR2F0ZXdheSB8fCAnR2F0ZXdheSd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwdjZfZ2F0ZXdheSB8fCBpZmFjZS5pcHY2X2dhdGV3YXl9PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7KGlmYWNlLmN1cnJlbnRQcmltYXJ5ZG5zNiB8fCBpZmFjZS5wcmltYXJ5ZG5zNikgPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0ROUyB8fCAnRE5TJ306IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczZ9JHsoaWZhY2UuY3VycmVudFNlY29uZGFyeWRuczYgfHwgaWZhY2Uuc2Vjb25kYXJ5ZG5zNikgPyAnLCAnICsgKGlmYWNlLmN1cnJlbnRTZWNvbmRhcnlkbnM2IHx8IGlmYWNlLnNlY29uZGFyeWRuczYpIDogJyd9PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LW1hbnVhbC1maWVsZHMtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaXZlIHdpZGUgZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkFkZHJlc3MgfHwgJ0lQdjYgQWRkcmVzcyd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTYwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cImlwdjZhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZhZGRyIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiZmQwMDo6MVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U3VibmV0IHx8ICdJUHY2IFByZWZpeCBMZW5ndGgnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjZfc3VibmV0XyR7aWR9XCIgbmFtZT1cImlwdjZfc3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZfc3VibmV0IHx8ICc2NCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkbnMtZ2F0ZXdheS1ncm91cC0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaG9yaXpvbnRhbCBkaXZpZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRTZXR0aW5ncyB8fCAnSW50ZXJuZXQgU2V0dGluZ3MnfTwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0hvc3RuYW1lIHx8ICdIb3N0bmFtZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImhvc3RuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmhvc3RuYW1lIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwibWlrb3BieFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfRG9tYWluIHx8ICdEb21haW4nfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJkb21haW5fJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZG9tYWluIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiZXhhbXBsZS5jb21cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0dhdGV3YXl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiICR7Z2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBpcHY2LWdhdGV3YXktZmllbGQtJHtpZH1cIiAke2lwdjZGaWVsZHNWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2R2F0ZXdheSB8fCAnSVB2NiBHYXRld2F5J308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtpcHY2R2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2X2dhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudElwdjZfZ2F0ZXdheSB8fCBpZmFjZS5pcHY2X2dhdGV3YXkgfHwgJyd9XCIgJHtpcHY2R2F0ZXdheVJlYWRvbmx5fSBwbGFjZWhvbGRlcj1cImZlODA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zRGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnByaW1hcnlkbnMgfHwgJyd9XCIgJHtkbnNSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zRGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJzZWNvbmRhcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc2Vjb25kYXJ5ZG5zIHx8ICcnfVwiICR7ZG5zUmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIGlwdjYtcHJpbWFyeWRucy1maWVsZC0ke2lkfVwiICR7aXB2NkZpZWxkc1Zpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZQcmltYXJ5RE5TIHx8ICdQcmltYXJ5IElQdjYgRE5TJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnM2XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRQcmltYXJ5ZG5zNiB8fCBpZmFjZS5wcmltYXJ5ZG5zNiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIjIwMDE6NDg2MDo0ODYwOjo4ODg4XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpZH1cIiAke2lwdjZGaWVsZHNWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U2Vjb25kYXJ5RE5TIHx8ICdTZWNvbmRhcnkgSVB2NiBETlMnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiMjAwMTo0ODYwOjQ4NjA6Ojg4NDRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiMjRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiNDA5NVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBJUHY2IHN1Ym5ldCBwcmVmaXggb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgKC8xIHRvIC8xMjgpXG4gICAgICovXG4gICAgZ2V0SXB2NlN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtdO1xuICAgICAgICAvLyBHZW5lcmF0ZSAvMSB0byAvMTI4IChjb21tb246IC82NCwgLzQ4LCAvNTYsIC8xMjgpXG4gICAgICAgIGZvciAobGV0IGkgPSAxMjg7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICBsZXQgZGVzY3JpcHRpb24gPSBgLyR7aX1gO1xuICAgICAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9ucyBmb3IgY29tbW9uIHByZWZpeGVzXG4gICAgICAgICAgICBpZiAoaSA9PT0gMTI4KSBkZXNjcmlwdGlvbiArPSAnIChTaW5nbGUgaG9zdCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNjQpIGRlc2NyaXB0aW9uICs9ICcgKFN0YW5kYXJkIHN1Ym5ldCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNTYpIGRlc2NyaXB0aW9uICs9ICcgKFNtYWxsIG5ldHdvcmspJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDQ4KSBkZXNjcmlwdGlvbiArPSAnIChMYXJnZSBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSAzMikgZGVzY3JpcHRpb24gKz0gJyAoSVNQIGFzc2lnbm1lbnQpJztcblxuICAgICAgICAgICAgb3B0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IGRlc2NyaXB0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFdIWTogQm90aCBEb2NrZXIgYW5kIG5vbi1Eb2NrZXIgbm93IHVzZSBpbnRlcmZhY2UgdGFic1xuICAgICAgICAvLyBEb2NrZXIgaGFzIHJlc3RyaWN0aW9uczogREhDUCBsb2NrZWQsIElQL3N1Ym5ldC9WTEFOIHJlYWRvbmx5LCBETlMgZWRpdGFibGVcbiAgICAgICAgbmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlKTtcblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gV0hZOiBObyBtYXBwaW5nIG5lZWRlZCAtIEFQSSByZXR1cm5zIGtleXMgbWF0Y2hpbmcgZm9ybSBmaWVsZCBuYW1lc1xuICAgICAgICAgICAgLy8gKGUuZy4sICdleHRlcm5hbFNJUFBvcnQnIGZyb20gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUIGNvbnN0YW50KVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wb3J0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YS5wb3J0c1trZXldO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVB2NiBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwdjZhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgLy8gSVB2NiByZWdleCBwYXR0ZXJuXG4gICAgLy8gU3VwcG9ydHMgZnVsbCBmb3JtLCBjb21wcmVzc2VkIGZvcm0gKDo6KSwgSVB2NC1tYXBwZWQgKDo6ZmZmZjoxOTIuMC4yLjEpLCBsaW5rLWxvY2FsIChmZTgwOjoxJWV0aDApXG4gICAgY29uc3QgaXB2NlBhdHRlcm4gPSAvXigoWzAtOWEtZkEtRl17MSw0fTopezd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKSkkLztcbiAgICByZXR1cm4gaXB2NlBhdHRlcm4udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyAoSVB2NCBvciBJUHY2KS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyZXNzID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIodmFsdWUpIHx8ICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkcih2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZXh0aXBhZGRyIChpbnB1dG1hc2sgbWF5IHJldHVybiBcIl8uXy5fLl9cIiBmb3IgZW1wdHkpXG4gICAgICAgIGNvbnN0IGV4dGlwYWRkciA9IG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IGV4dGhvc3RuYW1lID0gKGFsbFZhbHVlcy5leHRob3N0bmFtZSB8fCAnJykudHJpbSgpO1xuICAgICAgICBpZiAoZXh0aG9zdG5hbWUgPT09ICcnICYmIGV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICAkdGFibGVDb250YWluZXI6IG51bGwsXG4gICAgJGVtcHR5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWNoZSBlbGVtZW50c1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFNob3cvaGlkZSBzZWN0aW9uIGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVyZmFjZUNvdW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykubm90KCdbZGF0YS10YWI9XCIwXCJdJykubGVuZ3RoO1xuICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYSByb3V0ZSByb3cgKGNyZWF0ZSBkdXBsaWNhdGUpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRzb3VyY2VSb3cgLSBTb3VyY2Ugcm93IHRvIGNvcHlcbiAgICAgKi9cbiAgICBjb3B5Um91dGUoJHNvdXJjZVJvdykge1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gJHNvdXJjZVJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAvLyBDb2xsZWN0IGRhdGEgZnJvbSBzb3VyY2Ugcm93XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YSA9IHtcbiAgICAgICAgICAgIG5ldHdvcms6ICRzb3VyY2VSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgIGdhdGV3YXk6ICRzb3VyY2VSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkc291cmNlUm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIG5ldyByb3V0ZSB3aXRoIGNvcGllZCBkYXRhXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGVEYXRhKTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGVtcHR5IHN0YXRlIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB1cGRhdGVFbXB0eVN0YXRlKCkge1xuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXIsIGhpZGUgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZW1wdHkgcGxhY2Vob2xkZXIsIHNob3cgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlRGF0YSAtIFJvdXRlIGRhdGEgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGFkZFJvdXRlKHJvdXRlRGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLnJvdXRlLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHJvdXRlRGF0YT8uaWQgfHwgYG5ld18ke0RhdGUubm93KCl9YDtcblxuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JvdXRlLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JvdXRlLXJvdycpXG4gICAgICAgICAgICAuYXR0cignZGF0YS1yb3V0ZS1pZCcsIHJvdXRlSWQpXG4gICAgICAgICAgICAuc2hvdygpO1xuXG4gICAgICAgIC8vIFNldCB2YWx1ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHJvdXRlRGF0YSkge1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbChyb3V0ZURhdGEubmV0d29yayk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKHJvdXRlRGF0YS5nYXRld2F5KTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKHJvdXRlRGF0YS5kZXNjcmlwdGlvbiB8fCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZXhpc3RpbmdSb3dzLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVTdWJuZXREcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5pbnRlcmZhY2UgfHwgJycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXRtYXNrIGZvciBJUCBhZGRyZXNzIGZpZWxkc1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG5cbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIHN1Ym5ldCB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdWJuZXREcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5zdWJuZXQtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIGludGVyZmFjZSB2YWx1ZSAoZW1wdHkgc3RyaW5nID0gYXV0bylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuaW50ZXJmYWNlLWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gb3B0aW9uczogXCJBdXRvXCIgKyBhdmFpbGFibGUgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19BdXRvIHx8ICdBdXRvJyB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gcm91dGVzXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==