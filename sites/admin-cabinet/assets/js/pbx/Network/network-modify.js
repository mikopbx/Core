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
      UserMessage.showError(globalTranslate.nw_ErrorGettingExternalIp);
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
   * Toggles visibility of IP address fields based on IPv4 mode dropdown state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');
      var $ipv4ModeDropdown = $("#ipv4_mode_".concat(eth, "-dropdown"));
      var ipv4Mode = $ipv4ModeDropdown.dropdown('get value');
      var isDhcpEnabled = ipv4Mode === '1'; // Find IP address and subnet fields group

      var $ipAddressGroup = $("#ip-address-group-".concat(eth));
      var $gatewayField = $(".ipv4-gateway-field-".concat(eth));
      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(eth));

      if (isDhcpEnabled) {
        // DHCP enabled -> hide IP/subnet fields group and gateway field, show DHCP info
        $ipAddressGroup.hide();
        $gatewayField.hide();
        $dhcpInfoMessage.show();
        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> show IP/subnet fields group and gateway field, hide DHCP info
        $ipAddressGroup.show();
        $gatewayField.show();
        $dhcpInfoMessage.hide();
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
    var $ipv6InternetSettings = $(".ipv6-internet-settings-".concat(interfaceId)); // Show manual fields only when mode is '2' (Manual)

    if (ipv6Mode === '2') {
      $manualFieldsContainer.show();
      $autoInfoMessage.hide();
      $ipv6InternetSettings.show();
    } else if (ipv6Mode === '1') {
      // Show Auto (SLAAC/DHCPv6) info message when mode is '1' (Auto)
      $manualFieldsContainer.hide();
      $autoInfoMessage.show();
      $ipv6InternetSettings.show();
    } else {
      // Hide all IPv6 fields for mode '0' (Off)
      $manualFieldsContainer.hide();
      $autoInfoMessage.hide();
      $ipv6InternetSettings.hide();
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
    var $dualStackHostnameWrapper = $('#exthostname-dual-stack-input-wrapper'); // Get the port input elements and their wrappers

    var $externalSipPortInput = $('input[name="externalSIPPort"]');
    var $externalTlsPortInput = $('input[name="externalTLSPort"]');
    var $standardSipPortWrapper = $('#external-sip-port-standard-wrapper');
    var $standardTlsPortWrapper = $('#external-tls-port-standard-wrapper');
    var $dualStackSipPortWrapper = $('#external-sip-port-dual-stack-wrapper');
    var $dualStackTlsPortWrapper = $('#external-tls-port-dual-stack-wrapper');

    if (anyDualStack) {
      // Dual-stack detected: Hide standard NAT section, show Dual-Stack section
      $standardNatSection.hide();
      $dualStackSection.show(); // Move exthostname input to dual-stack section (avoid duplicate inputs)

      if ($exthostnameInput.length > 0 && $dualStackHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($dualStackHostnameWrapper);
      } // Move port inputs to dual-stack section (avoid duplicate inputs)


      if ($externalSipPortInput.length > 0 && $dualStackSipPortWrapper.length > 0) {
        $externalSipPortInput.appendTo($dualStackSipPortWrapper);
      }

      if ($externalTlsPortInput.length > 0 && $dualStackTlsPortWrapper.length > 0) {
        $externalTlsPortInput.appendTo($dualStackTlsPortWrapper);
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
        prompt: globalTranslate.nw_ValidateExternalHostnameEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }];
    } else {
      // No dual-stack: Show standard NAT section, hide Dual-Stack section
      $standardNatSection.show();
      $dualStackSection.hide(); // Move exthostname input back to standard section

      if ($exthostnameInput.length > 0 && $standardHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($standardHostnameWrapper);
      } // Move port inputs back to standard section


      if ($externalSipPortInput.length > 0 && $standardSipPortWrapper.length > 0) {
        $externalSipPortInput.appendTo($standardSipPortWrapper);
      }

      if ($externalTlsPortInput.length > 0 && $standardTlsPortWrapper.length > 0) {
        $externalTlsPortInput.appendTo($standardTlsPortWrapper);
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
    // Collect all regular input fields (skip readonly fields to prevent overwriting DHCP-provided values)

    networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function () {
      var $input = $(this);
      var name = $input.attr('name'); // Skip readonly fields - they contain current DHCP/Auto values and should not be saved

      if (name && !$input.prop('readonly')) {
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
    } // Convert IPv4 mode dropdown values to DHCP boolean for REST API compatibility
    // WHY: UI uses dropdown with values 0=Manual, 1=DHCP but REST API expects dhcp_${id} boolean


    Object.keys(result.data).forEach(function (key) {
      var ipv4ModeMatch = key.match(/^ipv4_mode_(\d+)$/);

      if (ipv4ModeMatch) {
        var interfaceId = ipv4ModeMatch[1];
        var mode = result.data[key]; // Convert dropdown value to boolean: '1' = DHCP enabled, '0' = Manual (DHCP disabled)

        result.data["dhcp_".concat(interfaceId)] = mode === '1'; // Remove ipv4_mode_${id} key as it's not needed by REST API

        delete result.data[key];
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
    }); // Synchronize global hostname to all interfaces
    // WHY: Single hostname field for all interfaces, but REST API expects hostname_${id} for each interface

    var globalHostname = $('#global-hostname').val() || '';
    $('#eth-interfaces-menu a').each(function (index, tab) {
      var interfaceId = $(tab).attr('data-tab');
      result.data["hostname_".concat(interfaceId)] = globalHostname;
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
      }); // Initialize IPv4 mode dropdown for template (ID=0)

      var ipv4ModeOptions = [{
        value: '0',
        text: globalTranslate.nw_IPv4ModeManual
      }, {
        value: '1',
        text: globalTranslate.nw_IPv4ModeDHCP
      }];
      DynamicDropdownBuilder.buildDropdown('ipv4_mode_0', {
        ipv4_mode_0: '1'
      }, {
        staticOptions: ipv4ModeOptions,
        placeholder: globalTranslate.nw_SelectIPv4Mode,
        allowEmpty: false,
        onChange: function onChange() {
          networks.toggleDisabledFieldClass();
          Form.dataChanged();
        }
      }); // Initialize subnet dropdown for template (ID=0)

      DynamicDropdownBuilder.buildDropdown('subnet_0', {
        subnet_0: '24'
      }, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search']
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

      }); // Initialize IPv4 mode dropdown (Manual/DHCP) for non-Docker environments

      if (!iface.isDocker) {
        var ipv4ModeFieldName = "ipv4_mode_".concat(iface.id);
        var ipv4ModeFormData = {}; // WHY: iface.dhcp can be boolean (from REST API) or string (from form)

        ipv4ModeFormData[ipv4ModeFieldName] = iface.dhcp === '1' || iface.dhcp === true ? '1' : '0';
        var _ipv4ModeOptions = [{
          value: '0',
          text: globalTranslate.nw_IPv4ModeManual
        }, {
          value: '1',
          text: globalTranslate.nw_IPv4ModeDHCP
        }];
        DynamicDropdownBuilder.buildDropdown(ipv4ModeFieldName, ipv4ModeFormData, {
          staticOptions: _ipv4ModeOptions,
          placeholder: globalTranslate.nw_SelectIPv4Mode,
          allowEmpty: false,
          onChange: function onChange() {
            networks.toggleDisabledFieldClass();
            Form.dataChanged();
          }
        });
      } // Initialize IPv6 mode dropdown (Off/Auto/Manual)
      // For VLAN interfaces: only Off and Manual modes (no DHCPv6 Auto)


      var ipv6ModeFieldName = "ipv6_mode_".concat(iface.id);
      var ipv6ModeFormData = {};
      ipv6ModeFormData[ipv6ModeFieldName] = String(iface.ipv6_mode || '0');
      var isVlan = iface.vlanid && parseInt(iface.vlanid, 10) > 0;
      var ipv6ModeOptions = isVlan ? [{
        value: '0',
        text: globalTranslate.nw_IPv6ModeOff
      }, {
        value: '2',
        text: globalTranslate.nw_IPv6ModeManual
      }] : [{
        value: '0',
        text: globalTranslate.nw_IPv6ModeOff
      }, {
        value: '1',
        text: globalTranslate.nw_IPv6ModeAuto
      }, {
        value: '2',
        text: globalTranslate.nw_IPv6ModeManual
      }];
      DynamicDropdownBuilder.buildDropdown(ipv6ModeFieldName, ipv6ModeFormData, {
        staticOptions: ipv6ModeOptions,
        placeholder: globalTranslate.nw_SelectIPv6Mode,
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
        placeholder: globalTranslate.nw_SelectIPv6Subnet,
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
    }); // IPv4 mode dropdowns now initialized via DynamicDropdownBuilder in forEach loop (line ~840)
    // Re-bind IP address input masks

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
    }); // Update DHCP info message visibility when IPv4 mode changes

    $('.ipv4-mode-dropdown').off('change.dnsgateway').on('change.dnsgateway', function () {
      var $dropdown = $(this);
      var interfaceId = $dropdown.attr('id').replace('ipv4-mode-', '');
      var ipv4Mode = $dropdown.dropdown('get value');
      var isDhcpEnabled = ipv4Mode === '1'; // Find DHCP info message

      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(interfaceId));

      if (isDhcpEnabled) {
        // DHCP enabled -> show DHCP info message
        $dhcpInfoMessage.show();
      } else {
        // DHCP disabled -> hide DHCP info message
        $dhcpInfoMessage.hide();
      } // Update IP address group visibility (hide when DHCP on, show when off)


      networks.toggleDisabledFieldClass(); // Update dual-stack NAT logic when IPv4 mode changes

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
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"'; // Readonly/Placeholder logic for DHCP-controlled fields

    var dhcpDisabled = isDocker || iface.vlanid > 0;
    var dhcpChecked = isDocker || (iface.vlanid > 0 ? false : iface.dhcp); // IPv4 placeholders when DHCP enabled

    var hostnamePlaceholder = dhcpChecked ? globalTranslate.nw_PlaceholderDhcpHostname : 'mikopbx';
    var primaryDnsPlaceholder = dhcpChecked ? "".concat(globalTranslate.nw_PlaceholderDhcpDns, " ").concat(iface.currentPrimarydns || iface.primarydns || '8.8.8.8') : '8.8.8.8';
    var secondaryDnsPlaceholder = dhcpChecked ? "".concat(globalTranslate.nw_PlaceholderDhcpDns, " ").concat(iface.currentSecondarydns || iface.secondarydns || '8.8.4.4') : '8.8.4.4'; // IPv6 DNS placeholders (always editable)

    var ipv6PrimaryDnsPlaceholder = globalTranslate.nw_PlaceholderIPv6Dns;
    var ipv6SecondaryDnsPlaceholder = globalTranslate.nw_PlaceholderIPv6Dns;
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <!-- Common Settings Section (outside columns) -->\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <!-- Two Column Grid: IPv4 (left) and IPv6 (right) -->\n                <div class=\"ui two column stackable grid\">\n\n                    <!-- IPv4 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"globe icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv4Configuration, "\n                            </div>\n                        </h4>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"field\">\n                            <label>".concat(globalTranslate.nw_IPv4Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv4_mode_").concat(id, "\" name=\"ipv4_mode_").concat(id, "\" value=\"").concat(dhcpChecked ? '1' : '0', "\" />\n                            </div>\n                        </div>\n                        "), "\n\n                        <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"ipv4-gateway-field-".concat(id, "\" ").concat(dnsGatewayVisible, " style=\"display: ").concat(dhcpChecked ? 'none' : 'block', ";\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_Gateway, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" placeholder=\"192.168.1.1\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        <!-- IPv4 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv4-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv4, "</div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.currentPrimarydns || iface.primarydns || '', "\" placeholder=\"").concat(primaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.currentSecondarydns || iface.secondarydns || '', "\" placeholder=\"").concat(secondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_DHCPInfoIP, ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoSubnet, ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoGateway, ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoDNS, ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                        ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain, ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n\n                    <!-- IPv6 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"world icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv6Configuration, "\n                            </div>\n                        </h4>\n\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                            </div>\n                        </div>\n\n                        <!-- Hidden field to store current auto-configured IPv6 address -->\n                        <input type=\"hidden\" id=\"current-ipv6addr-").concat(id, "\" value=\"").concat(iface.currentIpv6addr || '', "\" />\n\n                        <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Address, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Subnet, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\" ").concat(dnsGatewayVisible, ">\n                                <label>").concat(globalTranslate.nw_IPv6Gateway, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.ipv6_gateway || '', "\" placeholder=\"fe80::1\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <!-- IPv6 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv6-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv6, "</div>\n\n                            <div class=\"field ipv6-primarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"").concat(ipv6PrimaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field ipv6-secondarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"").concat(ipv6SecondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress, ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix, ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                        ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway, ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_IPv4Mode, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" id=\"ipv4_mode_").concat(id, "\" name=\"ipv4_mode_").concat(id, "\" value=\"1\" />\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"24\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
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
    networks.createInterfaceTabs(data, data.isDocker || false); // Populate global hostname from first interface (single value for all interfaces)

    if (data.interfaces && data.interfaces.length > 0) {
      var firstInterface = data.interfaces[0];
      var hostname = firstInterface.currentHostname || firstInterface.hostname || '';
      $('#global-hostname').val(hostname);
    } // Set NAT settings


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
      text: globalTranslate.nw_Auto
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGlwdjRNb2RlRHJvcGRvd24iLCJpcHY0TW9kZSIsImlzRGhjcEVuYWJsZWQiLCIkaXBBZGRyZXNzR3JvdXAiLCIkZ2F0ZXdheUZpZWxkIiwiJGRoY3BJbmZvTWVzc2FnZSIsInNob3ciLCJ2YWwiLCJhZGROZXdGb3JtUnVsZXMiLCJ1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYyIsInRvZ2dsZUlQdjZGaWVsZHMiLCJpbnRlcmZhY2VJZCIsIiRpcHY2TW9kZURyb3Bkb3duIiwiaXB2Nk1vZGUiLCIkbWFudWFsRmllbGRzQ29udGFpbmVyIiwiJGF1dG9JbmZvTWVzc2FnZSIsIiRpcHY2SW50ZXJuZXRTZXR0aW5ncyIsImlzRHVhbFN0YWNrTW9kZSIsImlwdjRhZGRyIiwiJGRoY3BDaGVja2JveCIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyTWFudWFsIiwiaXB2NmFkZHJBdXRvIiwiaXB2NmFkZHIiLCJoYXNJcHY0IiwidHJpbSIsImhhc0lwdjYiLCJpcHY2TG93ZXIiLCJ0b0xvd2VyQ2FzZSIsImlwdjZXaXRob3V0Q2lkciIsInNwbGl0IiwiaXNHbG9iYWxVbmljYXN0IiwidGVzdCIsImlzTmF0RW5hYmxlZCIsImFueUR1YWxTdGFjayIsInRhYiIsIiRzdGFuZGFyZE5hdFNlY3Rpb24iLCIkZHVhbFN0YWNrU2VjdGlvbiIsIiRleHRob3N0bmFtZUlucHV0IiwiJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyIiwiZmluZCIsImhhcyIsImZpcnN0IiwiJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciIsIiRleHRlcm5hbFNpcFBvcnRJbnB1dCIsIiRleHRlcm5hbFRsc1BvcnRJbnB1dCIsIiRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyIiwiJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIiLCJhcHBlbmRUbyIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJwYXJlbnQiLCJob3N0bmFtZSIsIm53X1ZhbGlkYXRlRXh0ZXJuYWxIb3N0bmFtZUVtcHR5IiwiZmllbGRzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsIiRpbnB1dCIsIm5hbWUiLCJwcm9wIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiaXB2NE1vZGVNYXRjaCIsIm1vZGUiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiaXB2Nk1vZGVNYXRjaCIsInN1Ym5ldEtleSIsImdsb2JhbEhvc3RuYW1lIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJjb25zb2xlIiwid2FybiIsImNpZHJUb05ldG1hc2siLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiaXB2NE1vZGVPcHRpb25zIiwibndfSVB2NE1vZGVNYW51YWwiLCJud19JUHY0TW9kZURIQ1AiLCJpcHY0X21vZGVfMCIsIm53X1NlbGVjdElQdjRNb2RlIiwiZGF0YUNoYW5nZWQiLCJzdWJuZXRfMCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImlwdjRNb2RlRmllbGROYW1lIiwiaXB2NE1vZGVGb3JtRGF0YSIsImRoY3AiLCJpcHY2TW9kZUZpZWxkTmFtZSIsImlwdjZNb2RlRm9ybURhdGEiLCJpcHY2X21vZGUiLCJpc1ZsYW4iLCJpcHY2TW9kZU9wdGlvbnMiLCJud19JUHY2TW9kZU9mZiIsIm53X0lQdjZNb2RlTWFudWFsIiwibndfSVB2Nk1vZGVBdXRvIiwibndfU2VsZWN0SVB2Nk1vZGUiLCJpcHY2U3VibmV0RmllbGROYW1lIiwiaXB2NlN1Ym5ldEZvcm1EYXRhIiwiaXB2Nl9zdWJuZXQiLCJnZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0SVB2NlN1Ym5ldCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwicmVwbGFjZSIsInZsYW5WYWx1ZSIsInNlbGVjdGVkSW50ZXJmYWNlSWQiLCIkdGFiIiwicHJlcGVuZCIsIiRkcm9wZG93biIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZGhjcERpc2FibGVkIiwiZGhjcENoZWNrZWQiLCJob3N0bmFtZVBsYWNlaG9sZGVyIiwibndfUGxhY2Vob2xkZXJEaGNwSG9zdG5hbWUiLCJwcmltYXJ5RG5zUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlckRoY3BEbnMiLCJjdXJyZW50UHJpbWFyeWRucyIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlEbnNQbGFjZWhvbGRlciIsImN1cnJlbnRTZWNvbmRhcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJpcHY2UHJpbWFyeURuc1BsYWNlaG9sZGVyIiwibndfUGxhY2Vob2xkZXJJUHY2RG5zIiwiaXB2NlNlY29uZGFyeURuc1BsYWNlaG9sZGVyIiwiaXBhZGRyIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVmxhbklEIiwibndfSVB2NENvbmZpZ3VyYXRpb24iLCJud19JUHY0TW9kZSIsIm53X0lQQWRkcmVzcyIsIm53X05ldHdvcmtNYXNrIiwibndfR2F0ZXdheSIsIm53X0ludGVybmV0SVB2NCIsIm53X1ByaW1hcnlETlMiLCJud19TZWNvbmRhcnlETlMiLCJud19ESENQSW5mb0hlYWRlciIsIm53X0RIQ1BJbmZvSVAiLCJjdXJyZW50SXBhZGRyIiwibndfREhDUEluZm9TdWJuZXQiLCJjdXJyZW50U3VibmV0IiwibndfREhDUEluZm9HYXRld2F5IiwiY3VycmVudEdhdGV3YXkiLCJud19ESENQSW5mb0ROUyIsImRvbWFpbiIsIm53X0RIQ1BJbmZvRG9tYWluIiwibndfSVB2NkNvbmZpZ3VyYXRpb24iLCJud19JUHY2TW9kZSIsImN1cnJlbnRJcHY2YWRkciIsIm53X0lQdjZBZGRyZXNzIiwibndfSVB2NlN1Ym5ldCIsIm53X0lQdjZHYXRld2F5IiwiaXB2Nl9nYXRld2F5IiwibndfSW50ZXJuZXRJUHY2IiwibndfSVB2NlByaW1hcnlETlMiLCJjdXJyZW50UHJpbWFyeWRuczYiLCJwcmltYXJ5ZG5zNiIsIm53X0lQdjZTZWNvbmRhcnlETlMiLCJjdXJyZW50U2Vjb25kYXJ5ZG5zNiIsInNlY29uZGFyeWRuczYiLCJud19JUHY2QXV0b0luZm9IZWFkZXIiLCJud19JUHY2QXV0b0luZm9BZGRyZXNzIiwibndfSVB2NkF1dG9JbmZvUHJlZml4IiwiY3VycmVudElwdjZfc3VibmV0IiwiY3VycmVudElwdjZfZ2F0ZXdheSIsIm53X0lQdjZBdXRvSW5mb0dhdGV3YXkiLCJud19Vc2VESENQIiwib3B0aW9ucyIsImkiLCJkZXNjcmlwdGlvbiIsInB1c2giLCJmaXJzdEludGVyZmFjZSIsImN1cnJlbnRIb3N0bmFtZSIsIm5hdCIsIkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImEiLCJpcHY2UGF0dGVybiIsImlwYWRkcmVzcyIsImlwYWRkcldpdGhQb3J0T3B0aW9uYWwiLCJjaGVja1ZsYW4iLCJwYXJhbSIsImFsbFZhbHVlcyIsIm5ld0V0aE5hbWUiLCJ2bGFuaWRfMCIsImluZGV4T2YiLCJldGhOYW1lIiwiaW5BcnJheSIsImV4dGVuYWxJcEhvc3QiLCJ2YWxpZEhvc3RuYW1lIiwiaG9zdG5hbWVSZWdleCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsIiR0YWJsZUNvbnRhaW5lciIsIiRlbXB0eVBsYWNlaG9sZGVyIiwicm91dGVzIiwiaW5pdGlhbGl6ZURyYWdBbmREcm9wIiwiYWRkUm91dGUiLCJkb2N1bWVudCIsInRhcmdldCIsImNsb3Nlc3QiLCJ1cGRhdGVQcmlvcml0aWVzIiwidXBkYXRlRW1wdHlTdGF0ZSIsIiRzb3VyY2VSb3ciLCJjb3B5Um91dGUiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2xlYW5lZERhdGEiLCJzZXRUaW1lb3V0IiwidGFibGVEbkRVcGRhdGUiLCJ0YWJsZURuRCIsIm9uRHJvcCIsImRyYWdIYW5kbGUiLCJpbnRlcmZhY2VDb3VudCIsIm5vdCIsInJvdXRlSWQiLCJzdWJuZXREcm9wZG93bklkIiwiaW50ZXJmYWNlRHJvcGRvd25JZCIsInJvdXRlRGF0YSIsIm5ldHdvcmsiLCIkZXhpc3RpbmdSb3dzIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsIkRhdGUiLCJub3ciLCJhZnRlciIsImluaXRpYWxpemVTdWJuZXREcm9wZG93biIsImluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93biIsIiRyb3ciLCJzZWxlY3RlZFZhbHVlIiwiJGNvbnRhaW5lciIsImRyb3Bkb3duSWQiLCJud19BdXRvIiwibWFwIiwibGFiZWwiLCJyb3ciLCJyb3V0ZXNEYXRhIiwicm91dGUiLCJzdGFydHNXaXRoIiwicHJpb3JpdHkiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiQyxFQUFBQSxjQUFjLEVBQUVDLENBQUMsQ0FBQyxVQUFELENBREo7O0FBR2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVBFO0FBU2JFLEVBQUFBLFVBQVUsRUFBRUYsQ0FBQyxDQUFDLHlCQUFELENBVEE7QUFVYkcsRUFBQUEsVUFBVSxFQUFFSCxDQUFDLENBQUMsWUFBRCxDQVZBO0FBV2JJLEVBQUFBLGVBQWUsRUFBRUosQ0FBQyxDQUFDLFlBQUQsQ0FYTDtBQVliSyxFQUFBQSxVQUFVLEVBQUUsRUFaQzs7QUFjYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRU4sQ0FBQyxDQUFDLHdCQUFELENBbEJWOztBQW9CYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxTQUFTLEVBQUU7QUFDUEMsTUFBQUEsUUFBUSxFQUFFLElBREg7QUFFUEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFD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UDtBQUNIO0FBaFV1QixDQUE1QjtBQW1VQTtBQUNBO0FBQ0E7O0FBQ0EvWCxDQUFDLENBQUNrWSxRQUFELENBQUQsQ0FBWStDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5iLEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQXBwbHkgSVAgbWFzayBmb3IgZXh0ZXJuYWwgSVAgYWRkcmVzcyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gaW4gRG9ja2VyIChtYW5hZ2VkIHZpYSBkby1ub3Qtc2hvdy1pZi1kb2NrZXIgY2xhc3MpXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmlwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5kYXRhLmlwICsgcG9ydDtcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFNJUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHNpcFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHNpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFJUUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1NpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrU2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1J0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcy5odG1sKGR1YWxTdGFja1J0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogVXBkYXRlcyBib3RoIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JUKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIGV4dGVybmFsIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRzaXBMYWJlbCA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHNpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBMYWJlbCA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrU2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBMYWJlbC50ZXh0KGR1YWxTdGFja1NpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc0xhYmVsID0gJCgnI2R1YWwtc3RhY2stdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tUbHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tUbHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tUbHNMYWJlbC50ZXh0KGR1YWxTdGFja1Rsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB2aXNpYmlsaXR5IG9mIElQIGFkZHJlc3MgZmllbGRzIGJhc2VkIG9uIElQdjQgbW9kZSBkcm9wZG93biBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRpcHY0TW9kZURyb3Bkb3duID0gJChgI2lwdjRfbW9kZV8ke2V0aH0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlID0gJGlwdjRNb2RlRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9IGlwdjRNb2RlID09PSAnMSc7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgSVAgYWRkcmVzcyBhbmQgc3VibmV0IGZpZWxkcyBncm91cFxuICAgICAgICAgICAgY29uc3QgJGlwQWRkcmVzc0dyb3VwID0gJChgI2lwLWFkZHJlc3MtZ3JvdXAtJHtldGh9YCk7XG4gICAgICAgICAgICBjb25zdCAkZ2F0ZXdheUZpZWxkID0gJChgLmlwdjQtZ2F0ZXdheS1maWVsZC0ke2V0aH1gKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwSW5mb01lc3NhZ2UgPSAkKGAuZGhjcC1pbmZvLW1lc3NhZ2UtJHtldGh9YCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IGhpZGUgSVAvc3VibmV0IGZpZWxkcyBncm91cCBhbmQgZ2F0ZXdheSBmaWVsZCwgc2hvdyBESENQIGluZm9cbiAgICAgICAgICAgICAgICAkaXBBZGRyZXNzR3JvdXAuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRnYXRld2F5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IHNob3cgSVAvc3VibmV0IGZpZWxkcyBncm91cCBhbmQgZ2F0ZXdheSBmaWVsZCwgaGlkZSBESENQIGluZm9cbiAgICAgICAgICAgICAgICAkaXBBZGRyZXNzR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRnYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUvc2hvdyBOQVQgc2VjdGlvbnMgaW5zdGVhZCBvZiBkaXNhYmxpbmcgdG8gc2ltcGxpZnkgVUlcbiAgICAgICAgaWYgKCQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBBZnRlciBzaG93aW5nIGFsbCBzZWN0aW9ucywgZGV0ZXJtaW5lIHdoaWNoIG9uZSB0byBhY3R1YWxseSBkaXNwbGF5XG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSB2aXNpYmlsaXR5IG9mIElQdjYgbWFudWFsIGNvbmZpZ3VyYXRpb24gZmllbGRzIGJhc2VkIG9uIHNlbGVjdGVkIG1vZGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKi9cbiAgICB0b2dnbGVJUHY2RmllbGRzKGludGVyZmFjZUlkKSB7XG4gICAgICAgIGNvbnN0ICRpcHY2TW9kZURyb3Bkb3duID0gJChgI2lwdjZfbW9kZV8ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCBpcHY2TW9kZSA9ICRpcHY2TW9kZURyb3Bkb3duLnZhbCgpO1xuICAgICAgICBjb25zdCAkbWFudWFsRmllbGRzQ29udGFpbmVyID0gJChgLmlwdjYtbWFudWFsLWZpZWxkcy0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkYXV0b0luZm9NZXNzYWdlID0gJChgLmlwdjYtYXV0by1pbmZvLW1lc3NhZ2UtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGlwdjZJbnRlcm5ldFNldHRpbmdzID0gJChgLmlwdjYtaW50ZXJuZXQtc2V0dGluZ3MtJHtpbnRlcmZhY2VJZH1gKTtcblxuICAgICAgICAvLyBTaG93IG1hbnVhbCBmaWVsZHMgb25seSB3aGVuIG1vZGUgaXMgJzInIChNYW51YWwpXG4gICAgICAgIGlmIChpcHY2TW9kZSA9PT0gJzInKSB7XG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLnNob3coKTtcbiAgICAgICAgfSBlbHNlIGlmIChpcHY2TW9kZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAvLyBTaG93IEF1dG8gKFNMQUFDL0RIQ1B2NikgaW5mbyBtZXNzYWdlIHdoZW4gbW9kZSBpcyAnMScgKEF1dG8pXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIElQdjYgZmllbGRzIGZvciBtb2RlICcwJyAoT2ZmKVxuICAgICAgICAgICAgJG1hbnVhbEZpZWxkc0NvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYXV0b0luZm9NZXNzYWdlLmhpZGUoKTtcbiAgICAgICAgICAgICRpcHY2SW50ZXJuZXRTZXR0aW5ncy5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBJUHY2IG1vZGUgY2hhbmdlc1xuICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkdWFsLXN0YWNrIG1vZGUgaXMgYWN0aXZlIChJUHY0ICsgSVB2NiBwdWJsaWMgYWRkcmVzcyBib3RoIGNvbmZpZ3VyZWQpXG4gICAgICogRHVhbC1zdGFjayBOQVQgc2VjdGlvbiBpcyBzaG93biB3aGVuIGJvdGggSVB2NCBhbmQgcHVibGljIElQdjYgYXJlIHByZXNlbnQuXG4gICAgICogUHVibGljIElQdjYgPSBHbG9iYWwgVW5pY2FzdCBhZGRyZXNzZXMgKDIwMDA6Oi8zKSB0aGF0IHN0YXJ0IHdpdGggMiBvciAzLlxuICAgICAqIFByaXZhdGUgSVB2NiBhZGRyZXNzZXMgKFVMQSBmZDAwOjovOCwgbGluay1sb2NhbCBmZTgwOjovMTApIGRvIE5PVCB0cmlnZ2VyIGR1YWwtc3RhY2suXG4gICAgICpcbiAgICAgKiBJUHY0IGRldGVjdGlvbiB3b3JrcyBmb3IgYm90aCBzdGF0aWMgYW5kIERIQ1AgY29uZmlndXJhdGlvbnM6XG4gICAgICogLSBTdGF0aWM6IGNoZWNrcyBpcGFkZHJfWCBmaWVsZFxuICAgICAqIC0gREhDUDogY2hlY2tzIGlmIERIQ1AgaXMgZW5hYmxlZCBBTkQgZ2F0ZXdheSBpcyBvYnRhaW5lZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludGVyZmFjZUlkIC0gSW50ZXJmYWNlIElEXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgZHVhbC1zdGFjayB3aXRoIHB1YmxpYyBJUHY2LCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBpc0R1YWxTdGFja01vZGUoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgLy8gR2V0IElQdjQgY29uZmlndXJhdGlvbiAoc3RhdGljIG9yIERIQ1ApXG4gICAgICAgIGNvbnN0IGlwdjRhZGRyID0gJChgaW5wdXRbbmFtZT1cImlwYWRkcl8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcbiAgICAgICAgY29uc3QgZGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94Lmxlbmd0aCA+IDAgJiYgJGRoY3BDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBjb25zdCBnYXRld2F5ID0gJChgaW5wdXRbbmFtZT1cImdhdGV3YXlfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKTtcblxuICAgICAgICAvLyBHZXQgSVB2NiBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJChgI2lwdjZfbW9kZV8ke2ludGVyZmFjZUlkfWApLnZhbCgpO1xuICAgICAgICAvLyBGb3IgTWFudWFsIG1vZGUgdXNlIGZvcm0gZmllbGQsIGZvciBBdXRvIG1vZGUgdXNlIGN1cnJlbnQgKGF1dG9jb25maWd1cmVkKSB2YWx1ZSBmcm9tIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBpcHY2YWRkck1hbnVhbCA9ICQoYGlucHV0W25hbWU9XCJpcHY2YWRkcl8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuICAgICAgICBjb25zdCBpcHY2YWRkckF1dG8gPSAkKGAjY3VycmVudC1pcHY2YWRkci0ke2ludGVyZmFjZUlkfWApLnZhbCgpO1xuICAgICAgICBjb25zdCBpcHY2YWRkciA9IGlwdjZNb2RlID09PSAnMScgPyBpcHY2YWRkckF1dG8gOiBpcHY2YWRkck1hbnVhbDtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY0IGlzIHByZXNlbnQgKGVpdGhlciBzdGF0aWMgYWRkcmVzcyBvciBESENQIHdpdGggZ2F0ZXdheSlcbiAgICAgICAgLy8gR2F0ZXdheSBwcmVzZW5jZSBpbmRpY2F0ZXMgREhDUCBzdWNjZXNzZnVsbHkgb2J0YWluZWQgYW4gSVB2NCBhZGRyZXNzXG4gICAgICAgIGNvbnN0IGhhc0lwdjQgPSAoaXB2NGFkZHIgJiYgaXB2NGFkZHIudHJpbSgpICE9PSAnJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChkaGNwRW5hYmxlZCAmJiBnYXRld2F5ICYmIGdhdGV3YXkudHJpbSgpICE9PSAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBpcyBlbmFibGVkIChBdXRvIFNMQUFDL0RIQ1B2NiBvciBNYW51YWwpXG4gICAgICAgIC8vIEZvciBBdXRvIG1vZGUgKCcxJyksIHdlIGNoZWNrIGN1cnJlbnRJcHY2YWRkciB3aGljaCBzaG93cyBhdXRvY29uZmlndXJlZCBhZGRyZXNzXG4gICAgICAgIGNvbnN0IGhhc0lwdjYgPSAoaXB2Nk1vZGUgPT09ICcxJyB8fCBpcHY2TW9kZSA9PT0gJzInKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgaXB2NmFkZHIgJiYgaXB2NmFkZHIudHJpbSgpICE9PSAnJyAmJiBpcHY2YWRkciAhPT0gJ0F1dG9jb25maWd1cmVkJztcblxuICAgICAgICBpZiAoIWhhc0lwdjQgfHwgIWhhc0lwdjYpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjYgYWRkcmVzcyBpcyBnbG9iYWwgdW5pY2FzdCAocHVibGljKVxuICAgICAgICAvLyBHbG9iYWwgdW5pY2FzdDogMjAwMDo6LzMgKGFkZHJlc3NlcyBzdGFydGluZyB3aXRoIDIgb3IgMylcbiAgICAgICAgLy8gRXhjbHVkZSBVTEEgKGZkMDA6Oi84KSBhbmQgbGluay1sb2NhbCAoZmU4MDo6LzEwKVxuICAgICAgICBjb25zdCBpcHY2TG93ZXIgPSBpcHY2YWRkci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgICAgICAvLyBSZW1vdmUgQ0lEUiBub3RhdGlvbiBpZiBwcmVzZW50IChlLmcuLCBcIjIwMDE6ZGI4OjoxLzY0XCIgLT4gXCIyMDAxOmRiODo6MVwiKVxuICAgICAgICBjb25zdCBpcHY2V2l0aG91dENpZHIgPSBpcHY2TG93ZXIuc3BsaXQoJy8nKVswXTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmaXJzdCBjaGFyYWN0ZXIgaXMgMiBvciAzIChnbG9iYWwgdW5pY2FzdCByYW5nZSlcbiAgICAgICAgY29uc3QgaXNHbG9iYWxVbmljYXN0ID0gL15bMjNdLy50ZXN0KGlwdjZXaXRob3V0Q2lkcik7XG5cbiAgICAgICAgcmV0dXJuIGlzR2xvYmFsVW5pY2FzdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBzZWN0aW9uIFVJIGJhc2VkIG9uIGR1YWwtc3RhY2sgZGV0ZWN0aW9uXG4gICAgICogU3dpdGNoZXMgYmV0d2VlbiBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogTWFrZXMgZXh0aG9zdG5hbWUgcmVxdWlyZWQgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICovXG4gICAgdXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIE5BVCBpcyBlbmFibGVkIC0gaWYgbm90LCBkb24ndCBzaG93IGFueSBOQVQgc2VjdGlvbnNcbiAgICAgICAgY29uc3QgaXNOYXRFbmFibGVkID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGlmICghaXNOYXRFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIE5BVCBkaXNhYmxlZCwgc2VjdGlvbnMgYWxyZWFkeSBoaWRkZW4gYnkgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBhbnkgaW50ZXJmYWNlIGlzIGluIGR1YWwtc3RhY2sgbW9kZVxuICAgICAgICBsZXQgYW55RHVhbFN0YWNrID0gZmFsc2U7XG5cbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJCh0YWIpLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBpZiAobmV0d29ya3MuaXNEdWFsU3RhY2tNb2RlKGludGVyZmFjZUlkKSkge1xuICAgICAgICAgICAgICAgIGFueUR1YWxTdGFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBCcmVhayBsb29wXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZE5hdFNlY3Rpb24gPSAkKCcjc3RhbmRhcmQtbmF0LXNlY3Rpb24nKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NlY3Rpb24gPSAkKCcjZHVhbC1zdGFjay1zZWN0aW9uJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBleHRob3N0bmFtZSBpbnB1dCBlbGVtZW50IGFuZCBpdHMgb3JpZ2luYWwgcGFyZW50XG4gICAgICAgIGNvbnN0ICRleHRob3N0bmFtZUlucHV0ID0gJCgnI2V4dGhvc3RuYW1lJyk7XG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlciA9ICRzdGFuZGFyZE5hdFNlY3Rpb24uZmluZCgnLm1heC13aWR0aC01MDAnKS5oYXMoJyNleHRob3N0bmFtZScpLmZpcnN0KCk7XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIgPSAkKCcjZXh0aG9zdG5hbWUtZHVhbC1zdGFjay1pbnB1dC13cmFwcGVyJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBwb3J0IGlucHV0IGVsZW1lbnRzIGFuZCB0aGVpciB3cmFwcGVyc1xuICAgICAgICBjb25zdCAkZXh0ZXJuYWxTaXBQb3J0SW5wdXQgPSAkKCdpbnB1dFtuYW1lPVwiZXh0ZXJuYWxTSVBQb3J0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRleHRlcm5hbFRsc1BvcnRJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJleHRlcm5hbFRMU1BvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJHN0YW5kYXJkU2lwUG9ydFdyYXBwZXIgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtc3RhbmRhcmQtd3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRUbHNQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC10bHMtcG9ydC1zdGFuZGFyZC13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1kdWFsLXN0YWNrLXdyYXBwZXInKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc1BvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWR1YWwtc3RhY2std3JhcHBlcicpO1xuXG4gICAgICAgIGlmIChhbnlEdWFsU3RhY2spIHtcbiAgICAgICAgICAgIC8vIER1YWwtc3RhY2sgZGV0ZWN0ZWQ6IEhpZGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIHNob3cgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBleHRob3N0bmFtZSBpbnB1dCB0byBkdWFsLXN0YWNrIHNlY3Rpb24gKGF2b2lkIGR1cGxpY2F0ZSBpbnB1dHMpXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0aG9zdG5hbWVJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW92ZSBwb3J0IGlucHV0cyB0byBkdWFsLXN0YWNrIHNlY3Rpb24gKGF2b2lkIGR1cGxpY2F0ZSBpbnB1dHMpXG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsU2lwUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0ZXJuYWxTaXBQb3J0SW5wdXQuYXBwZW5kVG8oJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxUbHNQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFRsc1BvcnRJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhciBleHRpcGFkZHIgKGV4dGVybmFsIElQIG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaywgb25seSBob3N0bmFtZSlcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgYXV0b1VwZGF0ZUV4dGVybmFsSXAgKG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaylcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGhvc3RuYW1lIGRpc3BsYXkgaW4gZHVhbC1zdGFjayBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGhvc3RuYW1lID0gJGV4dGhvc3RuYW1lSW5wdXQudmFsKCkgfHwgJ21pa29wYnguY29tcGFueS5jb20nO1xuICAgICAgICAgICAgJCgnI2hvc3RuYW1lLWRpc3BsYXknKS50ZXh0KGhvc3RuYW1lKTtcblxuICAgICAgICAgICAgLy8gTWFrZSBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrXG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRlcm5hbEhvc3RuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkdWFsLXN0YWNrOiBTaG93IHN0YW5kYXJkIE5BVCBzZWN0aW9uLCBoaWRlIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAgICAgICAgJHN0YW5kYXJkTmF0U2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgZXh0aG9zdG5hbWUgaW5wdXQgYmFjayB0byBzdGFuZGFyZCBzZWN0aW9uXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1vdmUgcG9ydCBpbnB1dHMgYmFjayB0byBzdGFuZGFyZCBzZWN0aW9uXG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsU2lwUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJHN0YW5kYXJkU2lwUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFNpcFBvcnRJbnB1dC5hcHBlbmRUbygkc3RhbmRhcmRTaXBQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsVGxzUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFRsc1BvcnRJbnB1dC5hcHBlbmRUbygkc3RhbmRhcmRUbHNQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgZXh0aG9zdG5hbWUgdmFsaWRhdGlvbiAob3B0aW9uYWwgd2l0aCB1c2VuYXQgZGVwZW5kZW5jeSlcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUuZGVwZW5kcyA9ICd1c2VuYXQnO1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5ydWxlcyA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZGVzdHJveScpLmZvcm0oe1xuICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgIGZpZWxkczogbmV0d29ya3MudmFsaWRhdGVSdWxlc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBuZXcgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBhIHNwZWNpZmljIHJvdyBpbiB0aGUgbmV0d29yayBjb25maWd1cmF0aW9uIGZvcm0uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1Jvd0lkIC0gVGhlIElEIG9mIHRoZSBuZXcgcm93IHRvIGFkZCB0aGUgZm9ybSBydWxlcyBmb3IuXG4gICAgICovXG4gICAgYWRkTmV3Rm9ybVJ1bGVzKG5ld1Jvd0lkKSB7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICduYW1lJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBuYW1lQ2xhc3MgPSBgbmFtZV8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnbmFtZScgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tuYW1lQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogbmFtZUNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IHZsYW5DbGFzcyA9IGB2bGFuaWRfJHtuZXdSb3dJZH1gO1xuXG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAndmxhbmlkJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW3ZsYW5DbGFzc10gPSB7XG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IHZsYW5DbGFzcyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi40MDk1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhblJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgY2hlY2tWbGFuWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhbkNyb3NzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGlwYWRkckNsYXNzID0gYGlwYWRkcl8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZFxuICAgICAgICAvLyBGb3IgdGVtcGxhdGUgaW50ZXJmYWNlIChpZD0wKSwgYWRkIGRlcGVuZGVuY3kgb24gaW50ZXJmYWNlIHNlbGVjdGlvblxuICAgICAgICBpZiAobmV3Um93SWQgPT09IDAgfHwgbmV3Um93SWQgPT09ICcwJykge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsICAvLyBUZW1wbGF0ZTogdmFsaWRhdGUgb25seSBpZiBpbnRlcmZhY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBub3RkaGNwXyR7bmV3Um93SWR9YCwgIC8vIFJlYWwgaW50ZXJmYWNlOiB2YWxpZGF0ZSBvbmx5IGlmIERIQ1AgaXMgT0ZGXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBESENQIHZhbGlkYXRpb24gcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlc1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGFsbCBzZXR0aW5ncyBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7fTtcblxuICAgICAgICAvLyBDb2xsZWN0IHN0YXRpYyByb3V0ZXNcbiAgICAgICAgcmVzdWx0LmRhdGEuc3RhdGljUm91dGVzID0gU3RhdGljUm91dGVzTWFuYWdlci5jb2xsZWN0Um91dGVzKCk7XG5cbiAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBmb3JtIHZhbHVlcyB0byBhdm9pZCBhbnkgRE9NLXJlbGF0ZWQgaXNzdWVzXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIHJlZ3VsYXIgaW5wdXQgZmllbGRzIChza2lwIHJlYWRvbmx5IGZpZWxkcyB0byBwcmV2ZW50IG92ZXJ3cml0aW5nIERIQ1AtcHJvdmlkZWQgdmFsdWVzKVxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgLy8gU2tpcCByZWFkb25seSBmaWVsZHMgLSB0aGV5IGNvbnRhaW4gY3VycmVudCBESENQL0F1dG8gdmFsdWVzIGFuZCBzaG91bGQgbm90IGJlIHNhdmVkXG4gICAgICAgICAgICBpZiAobmFtZSAmJiAhJGlucHV0LnByb3AoJ3JlYWRvbmx5JykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBJUHY0IG1vZGUgZHJvcGRvd24gdmFsdWVzIHRvIERIQ1AgYm9vbGVhbiBmb3IgUkVTVCBBUEkgY29tcGF0aWJpbGl0eVxuICAgICAgICAvLyBXSFk6IFVJIHVzZXMgZHJvcGRvd24gd2l0aCB2YWx1ZXMgMD1NYW51YWwsIDE9REhDUCBidXQgUkVTVCBBUEkgZXhwZWN0cyBkaGNwXyR7aWR9IGJvb2xlYW5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlTWF0Y2ggPSBrZXkubWF0Y2goL15pcHY0X21vZGVfKFxcZCspJC8pO1xuICAgICAgICAgICAgaWYgKGlwdjRNb2RlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9IGlwdjRNb2RlTWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3VsdC5kYXRhW2tleV07XG5cbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGRyb3Bkb3duIHZhbHVlIHRvIGJvb2xlYW46ICcxJyA9IERIQ1AgZW5hYmxlZCwgJzAnID0gTWFudWFsIChESENQIGRpc2FibGVkKVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7aW50ZXJmYWNlSWR9YF0gPSBtb2RlID09PSAnMSc7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgaXB2NF9tb2RlXyR7aWR9IGtleSBhcyBpdCdzIG5vdCBuZWVkZWQgYnkgUkVTVCBBUElcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBpbnRlcm5ldCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoJGNoZWNrZWRSYWRpby52YWwoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXSFk6IE5vIHBvcnQgZmllbGQgbWFwcGluZyBuZWVkZWQgLSBmb3JtIGZpZWxkIG5hbWVzIG1hdGNoIEFQSSBjb25zdGFudHNcbiAgICAgICAgLy8gKGV4dGVybmFsU0lQUG9ydCA9IFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVClcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBJUHY2IHN1Ym5ldCBmb3IgQXV0byBtb2RlIChTTEFBQy9ESENQdjYpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZU1hdGNoID0ga2V5Lm1hdGNoKC9eaXB2Nl9tb2RlXyhcXGQrKSQvKTtcbiAgICAgICAgICAgIGlmIChpcHY2TW9kZU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSBpcHY2TW9kZU1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Ym5ldEtleSA9IGBpcHY2X3N1Ym5ldF8ke2ludGVyZmFjZUlkfWA7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBtb2RlIGlzIEF1dG8gKCcxJykgYW5kIHN1Ym5ldCBpcyBlbXB0eSwgc2V0IGRlZmF1bHQgdG8gJzY0J1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnMScgJiYgKCFyZXN1bHQuZGF0YVtzdWJuZXRLZXldIHx8IHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPT09ICcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtzdWJuZXRLZXldID0gJzY0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN5bmNocm9uaXplIGdsb2JhbCBob3N0bmFtZSB0byBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAvLyBXSFk6IFNpbmdsZSBob3N0bmFtZSBmaWVsZCBmb3IgYWxsIGludGVyZmFjZXMsIGJ1dCBSRVNUIEFQSSBleHBlY3RzIGhvc3RuYW1lXyR7aWR9IGZvciBlYWNoIGludGVyZmFjZVxuICAgICAgICBjb25zdCBnbG9iYWxIb3N0bmFtZSA9ICQoJyNnbG9iYWwtaG9zdG5hbWUnKS52YWwoKSB8fCAnJztcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJCh0YWIpLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YVtgaG9zdG5hbWVfJHtpbnRlcmZhY2VJZH1gXSA9IGdsb2JhbEhvc3RuYW1lO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxlZCBieSBGb3JtXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG5ldHdvcmtzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbmV0d29ya3MuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5saW5lID0gdHJ1ZTsgLy8gU2hvdyBpbmxpbmUgZXJyb3JzIG5leHQgdG8gZmllbGRzXG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTmV0d29ya0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVDb25maWcnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9tb2RpZnkvYDtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZENvbmZpZ3VyYXRpb24oKSB7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgRG9ja2VyIG5ldHdvcmsgaW5mbyBhcyByZWFkLW9ubHlcbiAgICAgKiBERVBSRUNBVEVEOiBEb2NrZXIgbm93IHVzZXMgc2FtZSBpbnRlcmZhY2UgdGFicyBhcyByZWd1bGFyIGluc3RhbGxhdGlvblxuICAgICAqL1xuICAgIHNob3dEb2NrZXJOZXR3b3JrSW5mbyhkYXRhKSB7XG4gICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgbm8gbG9uZ2VyIHVzZWQgLSBEb2NrZXIgdXNlcyBjcmVhdGVJbnRlcmZhY2VUYWJzIGluc3RlYWRcbiAgICAgICAgY29uc29sZS53YXJuKCdzaG93RG9ja2VyTmV0d29ya0luZm8gaXMgZGVwcmVjYXRlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IENJRFIgbm90YXRpb24gdG8gZG90dGVkIGRlY2ltYWwgbmV0bWFza1xuICAgICAqL1xuICAgIGNpZHJUb05ldG1hc2soY2lkcikge1xuICAgICAgICBjb25zdCBtYXNrID0gfigyICoqICgzMiAtIGNpZHIpIC0gMSk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAobWFzayA+Pj4gMjQpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDE2KSAmIDI1NSxcbiAgICAgICAgICAgIChtYXNrID4+PiA4KSAmIDI1NSxcbiAgICAgICAgICAgIG1hc2sgJiAyNTVcbiAgICAgICAgXS5qb2luKCcuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBJbnRlcmZhY2UgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyIGVudmlyb25tZW50XG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBpc0RvY2tlciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIC8vIE9ubHkgVkxBTiBpbnRlcmZhY2VzIGNhbiBiZSBkZWxldGVkICh2bGFuaWQgPiAwKVxuICAgICAgICAgICAgLy8gSW4gRG9ja2VyLCBkaXNhYmxlIGRlbGV0ZSBmb3IgYWxsIGludGVyZmFjZXNcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9ICFpc0RvY2tlciAmJiBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uLCBpc0RvY2tlcikpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgdGFiIGZvciBuZXcgVkxBTiAobm90IGZvciBEb2NrZXIpXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlICYmICFpc0RvY2tlcikge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkYXRhLnRlbXBsYXRlO1xuICAgICAgICAgICAgdGVtcGxhdGUuaWQgPSAwO1xuXG4gICAgICAgICAgICAvLyBBZGQgXCIrXCIgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW1cIiBkYXRhLXRhYj1cIjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHBsdXNcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBmb3JtIHdpdGggaW50ZXJmYWNlIHNlbGVjdG9yXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBkYXRhLmludGVyZmFjZXMpKTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSkge1xuICAgICAgICAgICAgICAgICAgICBwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogaWZhY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaWZhY2UuaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyA9IE9iamVjdC52YWx1ZXMocGh5c2ljYWxJbnRlcmZhY2VzKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcmZhY2VfMCcsIHsgaW50ZXJmYWNlXzA6ICcnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NCBtb2RlIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoSUQ9MClcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlTWFudWFsfSxcbiAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlREhDUH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaXB2NF9tb2RlXzAnLCB7IGlwdjRfbW9kZV8wOiAnMScgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjRNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjRNb2RlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoSUQ9MClcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NCBtb2RlIGRyb3Bkb3duIChNYW51YWwvREhDUCkgZm9yIG5vbi1Eb2NrZXIgZW52aXJvbm1lbnRzXG4gICAgICAgICAgICBpZiAoIWlmYWNlLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVGaWVsZE5hbWUgPSBgaXB2NF9tb2RlXyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZUZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBpZmFjZS5kaGNwIGNhbiBiZSBib29sZWFuIChmcm9tIFJFU1QgQVBJKSBvciBzdHJpbmcgKGZyb20gZm9ybSlcbiAgICAgICAgICAgICAgICBpcHY0TW9kZUZvcm1EYXRhW2lwdjRNb2RlRmllbGROYW1lXSA9IChpZmFjZS5kaGNwID09PSAnMScgfHwgaWZhY2UuZGhjcCA9PT0gdHJ1ZSkgPyAnMScgOiAnMCc7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZU9wdGlvbnMgPSBbXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVNYW51YWx9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlREhDUH1cbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjRNb2RlRmllbGROYW1lLCBpcHY0TW9kZUZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjRNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY0TW9kZSxcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIElQdjYgbW9kZSBkcm9wZG93biAoT2ZmL0F1dG8vTWFudWFsKVxuICAgICAgICAgICAgLy8gRm9yIFZMQU4gaW50ZXJmYWNlczogb25seSBPZmYgYW5kIE1hbnVhbCBtb2RlcyAobm8gREhDUHY2IEF1dG8pXG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZpZWxkTmFtZSA9IGBpcHY2X21vZGVfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2Nk1vZGVGb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgaXB2Nk1vZGVGb3JtRGF0YVtpcHY2TW9kZUZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9tb2RlIHx8ICcwJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGlzVmxhbiA9IGlmYWNlLnZsYW5pZCAmJiBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZU9wdGlvbnMgPSBpc1ZsYW5cbiAgICAgICAgICAgICAgICA/IFtcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU9mZn0sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVNYW51YWx9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIDogW1xuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlT2ZmfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZUF1dG99LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlTWFudWFsfVxuICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2TW9kZUZpZWxkTmFtZSwgaXB2Nk1vZGVGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjZNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZNb2RlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBzdWJuZXQgZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0IGlwdjZTdWJuZXRGaWVsZE5hbWUgPSBgaXB2Nl9zdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2U3VibmV0Rm9ybURhdGFbaXB2NlN1Ym5ldEZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2U3VibmV0RmllbGROYW1lLCBpcHY2U3VibmV0Rm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY2U3VibmV0LFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBvZiBJUHY2IG1hbnVhbCBmaWVsZHNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIHZpc2liaWxpdHlcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gcmVtb3ZlcyBUQUIgZnJvbSBmb3JtIGFuZCBtYXJrcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgLy8gQWN0dWFsIGRlbGV0aW9uIGhhcHBlbnMgb24gZm9ybSBzdWJtaXRcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBtZW51IGl0ZW1cbiAgICAgICAgICAgICQoYCNldGgtaW50ZXJmYWNlcy1tZW51IGFbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCAkdGFiQ29udGVudCA9ICQoYCNldGgtaW50ZXJmYWNlcy1jb250ZW50IC50YWJbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApO1xuICAgICAgICAgICAgJHRhYkNvbnRlbnQucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBoaWRkZW4gZmllbGQgdG8gbWFyayB0aGlzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYXBwZW5kKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaXNhYmxlZF8ke2ludGVyZmFjZUlkfVwiIHZhbHVlPVwiMVwiIC8+YCk7XG5cbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBmaXJzdCBhdmFpbGFibGUgdGFiXG4gICAgICAgICAgICBjb25zdCAkZmlyc3RUYWIgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpO1xuICAgICAgICAgICAgaWYgKCRmaXJzdFRhYi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0VGFiLnRhYignY2hhbmdlIHRhYicsICRmaXJzdFRhYi5hdHRyKCdkYXRhLXRhYicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElQdjQgbW9kZSBkcm9wZG93bnMgbm93IGluaXRpYWxpemVkIHZpYSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIGluIGZvckVhY2ggbG9vcCAobGluZSB+ODQwKVxuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQWRkIFZMQU4gSUQgY2hhbmdlIGhhbmRsZXJzIHRvIGNvbnRyb2wgREhDUCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS5vZmYoJ2lucHV0IGNoYW5nZScpLm9uKCdpbnB1dCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR2bGFuSW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkdmxhbklucHV0LmF0dHIoJ25hbWUnKS5yZXBsYWNlKCd2bGFuaWRfJywgJycpO1xuICAgICAgICAgICAgY29uc3QgdmxhblZhbHVlID0gcGFyc2VJbnQoJHZsYW5JbnB1dC52YWwoKSwgMTApIHx8IDA7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcblxuICAgICAgICAgICAgaWYgKHZsYW5WYWx1ZSA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIERIQ1AgY2hlY2tib3ggZm9yIFZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbmFibGUgREhDUCBjaGVja2JveCBmb3Igbm9uLVZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGlzYWJsZWQgZmllbGQgY2xhc3Nlc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGhhbmRsZXIgZm9yIGV4aXN0aW5nIFZMQU4gaW50ZXJmYWNlcyB0byBhcHBseSBpbml0aWFsIHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJuZXQgcmFkaW8gYnV0dG9ucyB3aXRoIEZvbWFudGljIFVJXG4gICAgICAgICQoJy5pbnRlcm5ldC1yYWRpbycpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gQWRkIGludGVybmV0IHJhZGlvIGJ1dHRvbiBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdJykub2ZmKCdjaGFuZ2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZEludGVyZmFjZUlkID0gJCh0aGlzKS52YWwoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBhbGwgRE5TL0dhdGV3YXkgZ3JvdXBzXG4gICAgICAgICAgICAkKCdbY2xhc3NePVwiZG5zLWdhdGV3YXktZ3JvdXAtXCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBTaG93IEROUy9HYXRld2F5IGdyb3VwIGZvciBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2VcbiAgICAgICAgICAgICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke3NlbGVjdGVkSW50ZXJmYWNlSWR9YCkuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgVEFCIGljb25zIC0gYWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQsIHJlbW92ZSBmcm9tIG90aGVyc1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFiID0gJCh0YWIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYklkID0gJHRhYi5hdHRyKCdkYXRhLXRhYicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIGdsb2JlIGljb25cbiAgICAgICAgICAgICAgICAkdGFiLmZpbmQoJy5nbG9iZS5pY29uJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2UgVEFCXG4gICAgICAgICAgICAgICAgaWYgKHRhYklkID09PSBzZWxlY3RlZEludGVyZmFjZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgICR0YWIucHJlcGVuZCgnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIERIQ1AgaW5mbyBtZXNzYWdlIHZpc2liaWxpdHkgd2hlbiBJUHY0IG1vZGUgY2hhbmdlc1xuICAgICAgICAkKCcuaXB2NC1tb2RlLWRyb3Bkb3duJykub2ZmKCdjaGFuZ2UuZG5zZ2F0ZXdheScpLm9uKCdjaGFuZ2UuZG5zZ2F0ZXdheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGRyb3Bkb3duLmF0dHIoJ2lkJykucmVwbGFjZSgnaXB2NC1tb2RlLScsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlID0gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSBpcHY0TW9kZSA9PT0gJzEnO1xuXG4gICAgICAgICAgICAvLyBGaW5kIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkZGhjcEluZm9NZXNzYWdlID0gJChgLmRoY3AtaW5mby1tZXNzYWdlLSR7aW50ZXJmYWNlSWR9YCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IHNob3cgREhDUCBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBoaWRlIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBJUCBhZGRyZXNzIGdyb3VwIHZpc2liaWxpdHkgKGhpZGUgd2hlbiBESENQIG9uLCBzaG93IHdoZW4gb2ZmKVxuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjQgbW9kZSBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpZmFjZSAtIEludGVyZmFjZSBkYXRhXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0FjdGl2ZSAtIFdoZXRoZXIgdGhpcyB0YWIgaXMgYWN0aXZlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlbGV0ZUJ1dHRvbiAtIEhUTUwgZm9yIGRlbGV0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlciBlbnZpcm9ubWVudFxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlWaXNpYmxlID0gaXNJbnRlcm5ldEludGVyZmFjZSA/ICcnIDogJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJztcblxuICAgICAgICAvLyBSZWFkb25seS9QbGFjZWhvbGRlciBsb2dpYyBmb3IgREhDUC1jb250cm9sbGVkIGZpZWxkc1xuICAgICAgICBjb25zdCBkaGNwRGlzYWJsZWQgPSBpc0RvY2tlciB8fCBpZmFjZS52bGFuaWQgPiAwO1xuICAgICAgICBjb25zdCBkaGNwQ2hlY2tlZCA9IGlzRG9ja2VyIHx8IChpZmFjZS52bGFuaWQgPiAwID8gZmFsc2UgOiBpZmFjZS5kaGNwKTtcblxuICAgICAgICAvLyBJUHY0IHBsYWNlaG9sZGVycyB3aGVuIERIQ1AgZW5hYmxlZFxuICAgICAgICBjb25zdCBob3N0bmFtZVBsYWNlaG9sZGVyID0gZGhjcENoZWNrZWQgPyBnbG9iYWxUcmFuc2xhdGUubndfUGxhY2Vob2xkZXJEaGNwSG9zdG5hbWUgOiAnbWlrb3BieCc7XG4gICAgICAgIGNvbnN0IHByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRucyB8fCBpZmFjZS5wcmltYXJ5ZG5zIHx8ICc4LjguOC44J31gIDogJzguOC44LjgnO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnOC44LjQuNCd9YCA6ICc4LjguNC40JztcblxuICAgICAgICAvLyBJUHY2IEROUyBwbGFjZWhvbGRlcnMgKGFsd2F5cyBlZGl0YWJsZSlcbiAgICAgICAgY29uc3QgaXB2NlByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG4gICAgICAgIGNvbnN0IGlwdjZTZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDwhLS0gQ29tbW9uIFNldHRpbmdzIFNlY3Rpb24gKG91dHNpZGUgY29sdW1ucykgLS0+XG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/IGBcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgdmFsdWU9XCJvblwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJzI0J31cIiAvPlxuICAgICAgICAgICAgICAgIGAgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgIDwhLS0gVHdvIENvbHVtbiBHcmlkOiBJUHY0IChsZWZ0KSBhbmQgSVB2NiAocmlnaHQpIC0tPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIHN0YWNrYWJsZSBncmlkXCI+XG5cbiAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IENvbmZpZ3VyYXRpb24gQ29sdW1uIC0tPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3M9XCJ1aSBkaXZpZGluZyBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NENvbmZpZ3VyYXRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2g0PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2NF9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjRfbW9kZV8ke2lkfVwiIHZhbHVlPVwiJHtkaGNwQ2hlY2tlZCA/ICcxJyA6ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjQtZ2F0ZXdheS1maWVsZC0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9IHN0eWxlPVwiZGlzcGxheTogJHtkaGNwQ2hlY2tlZCA/ICdub25lJyA6ICdibG9jayd9O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiMTkyLjE2OC4xLjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IEludGVybmV0IFNldHRpbmdzIChvbmx5IGlmIEludGVybmV0IGludGVyZmFjZSkgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2NC1pbnRlcm5ldC1zZXR0aW5ncy0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldElQdjR9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnMgfHwgaWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7cHJpbWFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7c2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhpZGRlbiBkaXZpZGVyXCI+PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkaGNwLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtkaGNwQ2hlY2tlZCA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSGVhZGVyfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSVB9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwYWRkciB8fCBpZmFjZS5pcGFkZHIgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9TdWJuZXR9OiA8c3Ryb25nPi8ke2lmYWNlLmN1cnJlbnRTdWJuZXQgfHwgaWZhY2Uuc3VibmV0IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvR2F0ZXdheX06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50R2F0ZXdheSB8fCBpZmFjZS5nYXRld2F5IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvRE5TfTogPHN0cm9uZz4ke2lmYWNlLnByaW1hcnlkbnMgfHwgJ04vQSd9JHtpZmFjZS5zZWNvbmRhcnlkbnMgPyAnLCAnICsgaWZhY2Uuc2Vjb25kYXJ5ZG5zIDogJyd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lmYWNlLmRvbWFpbiA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9Eb21haW59OiA8c3Ryb25nPiR7aWZhY2UuZG9tYWlufTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY2IENvbmZpZ3VyYXRpb24gQ29sdW1uIC0tPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3M9XCJ1aSBkaXZpZGluZyBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIndvcmxkIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkNvbmZpZ3VyYXRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2g0PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2Nl9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjZfbW9kZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X21vZGUgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBIaWRkZW4gZmllbGQgdG8gc3RvcmUgY3VycmVudCBhdXRvLWNvbmZpZ3VyZWQgSVB2NiBhZGRyZXNzIC0tPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImN1cnJlbnQtaXB2NmFkZHItJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudElwdjZhZGRyIHx8ICcnfVwiIC8+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LW1hbnVhbC1maWVsZHMtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTYwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2YWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2YWRkciB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cImZkMDA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZTdWJuZXR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIG5hbWU9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkdhdGV3YXl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwiaXB2Nl9nYXRld2F5XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZfZ2F0ZXdheSB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cImZlODA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIElQdjYgSW50ZXJuZXQgU2V0dGluZ3MgKG9ubHkgaWYgSW50ZXJuZXQgaW50ZXJmYWNlKSAtLT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LWludGVybmV0LXNldHRpbmdzLSR7aWR9XCIgJHtkbnNHYXRld2F5VmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgZGl2aWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SVB2Nn08L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBpcHY2LXByaW1hcnlkbnMtZmllbGQtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZQcmltYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnM2XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRQcmltYXJ5ZG5zNiB8fCBpZmFjZS5wcmltYXJ5ZG5zNiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7aXB2NlByaW1hcnlEbnNQbGFjZWhvbGRlcn1cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBpcHY2LXNlY29uZGFyeWRucy1maWVsZC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlNlY29uZGFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJzZWNvbmRhcnlkbnM2XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRTZWNvbmRhcnlkbnM2IHx8IGlmYWNlLnNlY29uZGFyeWRuczYgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIke2lwdjZTZWNvbmRhcnlEbnNQbGFjZWhvbGRlcn1cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaGlkZGVuIGRpdmlkZXJcIj48L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjYtYXV0by1pbmZvLW1lc3NhZ2UtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6ICR7aWZhY2UuaXB2Nl9tb2RlID09PSAnMScgPyAnYmxvY2snIDogJ25vbmUnfTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9IZWFkZXJ9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvQWRkcmVzc306IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXB2NmFkZHIgfHwgaWZhY2UuaXB2NmFkZHIgfHwgJ0F1dG9jb25maWd1cmVkJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9QcmVmaXh9OiA8c3Ryb25nPi8ke2lmYWNlLmN1cnJlbnRJcHY2X3N1Ym5ldCB8fCBpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHsoaWZhY2UuY3VycmVudElwdjZfZ2F0ZXdheSB8fCBpZmFjZS5pcHY2X2dhdGV3YXkpID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9HYXRld2F5fTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5fTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAke2RlbGV0ZUJ1dHRvbn1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgbmV3IFZMQU4gdGVtcGxhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGludGVyZmFjZXMpIHtcbiAgICAgICAgY29uc3QgaWQgPSAwO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiBpZD1cImludGVyZmFjZV8ke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIGlkPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveFwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiIGNoZWNrZWQgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY0TW9kZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjRfbW9kZV8ke2lkfVwiIG5hbWU9XCJpcHY0X21vZGVfJHtpZH1cIiB2YWx1ZT1cIjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiMjRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiNDA5NVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBJUHY2IHN1Ym5ldCBwcmVmaXggb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgKC8xIHRvIC8xMjgpXG4gICAgICovXG4gICAgZ2V0SXB2NlN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtdO1xuICAgICAgICAvLyBHZW5lcmF0ZSAvMSB0byAvMTI4IChjb21tb246IC82NCwgLzQ4LCAvNTYsIC8xMjgpXG4gICAgICAgIGZvciAobGV0IGkgPSAxMjg7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICBsZXQgZGVzY3JpcHRpb24gPSBgLyR7aX1gO1xuICAgICAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9ucyBmb3IgY29tbW9uIHByZWZpeGVzXG4gICAgICAgICAgICBpZiAoaSA9PT0gMTI4KSBkZXNjcmlwdGlvbiArPSAnIChTaW5nbGUgaG9zdCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNjQpIGRlc2NyaXB0aW9uICs9ICcgKFN0YW5kYXJkIHN1Ym5ldCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNTYpIGRlc2NyaXB0aW9uICs9ICcgKFNtYWxsIG5ldHdvcmspJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDQ4KSBkZXNjcmlwdGlvbiArPSAnIChMYXJnZSBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSAzMikgZGVzY3JpcHRpb24gKz0gJyAoSVNQIGFzc2lnbm1lbnQpJztcblxuICAgICAgICAgICAgb3B0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IGRlc2NyaXB0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFdIWTogQm90aCBEb2NrZXIgYW5kIG5vbi1Eb2NrZXIgbm93IHVzZSBpbnRlcmZhY2UgdGFic1xuICAgICAgICAvLyBEb2NrZXIgaGFzIHJlc3RyaWN0aW9uczogREhDUCBsb2NrZWQsIElQL3N1Ym5ldC9WTEFOIHJlYWRvbmx5LCBETlMgZWRpdGFibGVcbiAgICAgICAgbmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlKTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSBnbG9iYWwgaG9zdG5hbWUgZnJvbSBmaXJzdCBpbnRlcmZhY2UgKHNpbmdsZSB2YWx1ZSBmb3IgYWxsIGludGVyZmFjZXMpXG4gICAgICAgIGlmIChkYXRhLmludGVyZmFjZXMgJiYgZGF0YS5pbnRlcmZhY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0SW50ZXJmYWNlID0gZGF0YS5pbnRlcmZhY2VzWzBdO1xuICAgICAgICAgICAgY29uc3QgaG9zdG5hbWUgPSBmaXJzdEludGVyZmFjZS5jdXJyZW50SG9zdG5hbWUgfHwgZmlyc3RJbnRlcmZhY2UuaG9zdG5hbWUgfHwgJyc7XG4gICAgICAgICAgICAkKCcjZ2xvYmFsLWhvc3RuYW1lJykudmFsKGhvc3RuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgZGF0YS5uYXQuZXh0aXBhZGRyIHx8ICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsIGRhdGEubmF0LmV4dGhvc3RuYW1lIHx8ICcnKTtcblxuICAgICAgICAgICAgLy8gYXV0b1VwZGF0ZUV4dGVybmFsSXAgYm9vbGVhbiAoZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubmF0LkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIHx8IGRhdGEubmF0LmF1dG9VcGRhdGVFeHRlcm5hbElwKSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICAvLyBXSFk6IE5vIG1hcHBpbmcgbmVlZGVkIC0gQVBJIHJldHVybnMga2V5cyBtYXRjaGluZyBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICAvLyAoZS5nLiwgJ2V4dGVybmFsU0lQUG9ydCcgZnJvbSBQYnhTZXR0aW5nczo6RVhURVJOQUxfU0lQX1BPUlQgY29uc3RhbnQpXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdG9yZSBhdmFpbGFibGUgaW50ZXJmYWNlcyBmb3Igc3RhdGljIHJvdXRlcyBGSVJTVCAoYmVmb3JlIGxvYWRpbmcgcm91dGVzKVxuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMgPSBkYXRhLmF2YWlsYWJsZUludGVyZmFjZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIHN0YXRpYyByb3V0ZXMgQUZURVIgYXZhaWxhYmxlSW50ZXJmYWNlcyBhcmUgc2V0XG4gICAgICAgIGlmIChkYXRhLnN0YXRpY1JvdXRlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5sb2FkUm91dGVzKGRhdGEuc3RhdGljUm91dGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgYWZ0ZXIgcG9wdWxhdGlvbiBpcyBjb21wbGV0ZVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIGJ1dHRvbiBpcyBkaXNhYmxlZCBhbmQgYWxsIGR5bmFtaWNhbGx5IGNyZWF0ZWQgZmllbGRzIGFyZSB0cmFja2VkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQdjYgYWRkcmVzcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUHY2IGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQdjYgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXB2NmFkZHIgPSAodmFsdWUpID0+IHtcbiAgICAvLyBJUHY2IHJlZ2V4IHBhdHRlcm5cbiAgICAvLyBTdXBwb3J0cyBmdWxsIGZvcm0sIGNvbXByZXNzZWQgZm9ybSAoOjopLCBJUHY0LW1hcHBlZCAoOjpmZmZmOjE5Mi4wLjIuMSksIGxpbmstbG9jYWwgKGZlODA6OjElZXRoMClcbiAgICBjb25zdCBpcHY2UGF0dGVybiA9IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7N31bMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw3fTp8KFswLTlhLWZBLUZdezEsNH06KXsxLDZ9OlswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDV9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDJ9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwzfXwoWzAtOWEtZkEtRl17MSw0fTopezEsM30oOlswLTlhLWZBLUZdezEsNH0pezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDJ9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDV9fFswLTlhLWZBLUZdezEsNH06KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw2fSl8OigoOlswLTlhLWZBLUZdezEsNH0pezEsN318Oil8ZmU4MDooOlswLTlhLWZBLUZdezAsNH0pezAsNH0lWzAtOWEtekEtWl17MSx9fDo6KGZmZmYoOjB7MSw0fSl7MCwxfTopezAsMX0oKDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVxcLil7M30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pfChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fTooKDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVxcLil7M30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKSQvO1xuICAgIHJldHVybiBpcHY2UGF0dGVybi50ZXN0KHZhbHVlKTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIChJUHY0IG9yIElQdjYpLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQdjQgb3IgSVB2NiBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJlc3MgPSAodmFsdWUpID0+IHtcbiAgICByZXR1cm4gJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcih2YWx1ZSkgfHwgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwdjZhZGRyKHZhbHVlKTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIERIQ1AgdmFsaWRhdGlvbiBydWxlIHJlbW92ZWQgLSBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGZvciBWTEFOIGludGVyZmFjZXMsIG5vIHZhbGlkYXRpb24gbmVlZGVkXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlIGZvciBleHRpcGFkZHIgKGlucHV0bWFzayBtYXkgcmV0dXJuIFwiXy5fLl8uX1wiIGZvciBlbXB0eSlcbiAgICAgICAgY29uc3QgZXh0aXBhZGRyID0gbmV0d29ya3MuJGV4dGlwYWRkci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSB8fCAnJztcbiAgICAgICAgY29uc3QgZXh0aG9zdG5hbWUgPSAoYWxsVmFsdWVzLmV4dGhvc3RuYW1lIHx8ICcnKS50cmltKCk7XG4gICAgICAgIGlmIChleHRob3N0bmFtZSA9PT0gJycgJiYgZXh0aXBhZGRyID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHZhbHVlIGlzIGEgdmFsaWQgaG9zdG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBob3N0bmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB2YWxpZCBob3N0bmFtZSwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy52YWxpZEhvc3RuYW1lID0gKHZhbHVlKSA9PiB7XG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEVtcHR5IGlzIGhhbmRsZWQgYnkgZXh0ZW5hbElwSG9zdCBydWxlXG4gICAgfVxuXG4gICAgLy8gUkZDIDk1Mi9SRkMgMTEyMyBob3N0bmFtZSB2YWxpZGF0aW9uXG4gICAgLy8gLSBMYWJlbHMgc2VwYXJhdGVkIGJ5IGRvdHNcbiAgICAvLyAtIEVhY2ggbGFiZWwgMS02MyBjaGFyc1xuICAgIC8vIC0gT25seSBhbHBoYW51bWVyaWMgYW5kIGh5cGhlbnNcbiAgICAvLyAtIENhbm5vdCBzdGFydC9lbmQgd2l0aCBoeXBoZW5cbiAgICAvLyAtIFRvdGFsIGxlbmd0aCBtYXggMjUzIGNoYXJzXG4gICAgY29uc3QgaG9zdG5hbWVSZWdleCA9IC9eKD89LnsxLDI1M30kKSg/IS0pW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKFxcLlthLXpBLVowLTktXXsxLDYzfSg/PCEtKSkqJC87XG4gICAgcmV0dXJuIGhvc3RuYW1lUmVnZXgudGVzdCh2YWx1ZSk7XG59O1xuXG5cbi8qKlxuICogU3RhdGljIFJvdXRlcyBNYW5hZ2VyIE1vZHVsZVxuICpcbiAqIE1hbmFnZXMgc3RhdGljIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlbiBtdWx0aXBsZSBuZXR3b3JrIGludGVyZmFjZXMgZXhpc3RcbiAqL1xuY29uc3QgU3RhdGljUm91dGVzTWFuYWdlciA9IHtcbiAgICAkdGFibGU6ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlJyksXG4gICAgJHNlY3Rpb246ICQoJyNzdGF0aWMtcm91dGVzLXNlY3Rpb24nKSxcbiAgICAkYWRkQnV0dG9uOiAkKCcjYWRkLW5ldy1yb3V0ZScpLFxuICAgICR0YWJsZUNvbnRhaW5lcjogbnVsbCxcbiAgICAkZW1wdHlQbGFjZWhvbGRlcjogbnVsbCxcbiAgICByb3V0ZXM6IFtdLFxuICAgIGF2YWlsYWJsZUludGVyZmFjZXM6IFtdLCAvLyBXaWxsIGJlIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhY2hlIGVsZW1lbnRzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIgPSAkKCcjc3RhdGljLXJvdXRlcy1lbXB0eS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lciA9ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VjdGlvbiBpZiBsZXNzIHRoYW4gMiBpbnRlcmZhY2VzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuXG4gICAgICAgIC8vIEFkZCBidXR0b24gaGFuZGxlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGZpcnN0IHJvdXRlIGJ1dHRvbiBoYW5kbGVyIChpbiBlbXB0eSBwbGFjZWhvbGRlcilcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNhZGQtZmlyc3Qtcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmNvcHktcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRzb3VyY2VSb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5jb3B5Um91dGUoJHNvdXJjZVJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElucHV0IGNoYW5nZSBoYW5kbGVyc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignaW5wdXQgY2hhbmdlJywgJy5uZXR3b3JrLWlucHV0LCAuZ2F0ZXdheS1pbnB1dCwgLmRlc2NyaXB0aW9uLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQYXN0ZSBoYW5kbGVycyBmb3IgSVAgYWRkcmVzcyBmaWVsZHMgKGVuYWJsZSBjbGlwYm9hcmQgcGFzdGUgd2l0aCBpbnB1dG1hc2spXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdwYXN0ZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTsgLy8gRm9yIElFXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFuIHRoZSBwYXN0ZWQgZGF0YSAocmVtb3ZlIGV4dHJhIHNwYWNlcywga2VlcCBvbmx5IHZhbGlkIElQIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICBjb25zdCBjbGVhbmVkRGF0YSA9IHBhc3RlZERhdGEudHJpbSgpLnJlcGxhY2UoL1teMC05Ll0vZywgJycpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKCdyZW1vdmUnKTtcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBjbGVhbmVkIHZhbHVlXG4gICAgICAgICAgICAkaW5wdXQudmFsKGNsZWFuZWREYXRhKTtcblxuICAgICAgICAgICAgLy8gUmVhcHBseSB0aGUgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuICAgICAgICAgICAgICAgICRpbnB1dC50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcmFnQW5kRHJvcCgpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyB0YWJsZURuRCBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLmRhdGEoJ3RhYmxlRG5EJykpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EVXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gU2hvdy9oaWRlIHNlY3Rpb24gYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlQ291bnQgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5ub3QoJ1tkYXRhLXRhYj1cIjBcIl0nKS5sZW5ndGg7XG4gICAgICAgIGlmIChpbnRlcmZhY2VDb3VudCA+IDEpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIHJvdXRlIHJvdyAoY3JlYXRlIGR1cGxpY2F0ZSlcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHNvdXJjZVJvdyAtIFNvdXJjZSByb3cgdG8gY29weVxuICAgICAqL1xuICAgIGNvcHlSb3V0ZSgkc291cmNlUm93KSB7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkc291cmNlUm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgIC8vIENvbGxlY3QgZGF0YSBmcm9tIHNvdXJjZSByb3dcbiAgICAgICAgY29uc3Qgcm91dGVEYXRhID0ge1xuICAgICAgICAgICAgbmV0d29yazogJHNvdXJjZVJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgZ2F0ZXdheTogJHNvdXJjZVJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICRzb3VyY2VSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKClcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgbmV3IHJvdXRlIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZURhdGEpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZW1wdHkgc3RhdGUgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZUVtcHR5U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlciwgaGlkZSB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlciwgc2hvdyB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGVEYXRhIC0gUm91dGUgZGF0YSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgYWRkUm91dGUocm91dGVEYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcucm91dGUtcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gcm91dGVEYXRhPy5pZCB8fCBgbmV3XyR7RGF0ZS5ub3coKX1gO1xuXG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncm91dGUtcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncm91dGUtcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXJvdXRlLWlkJywgcm91dGVJZClcbiAgICAgICAgICAgIC5zaG93KCk7XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAocm91dGVEYXRhKSB7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKHJvdXRlRGF0YS5uZXR3b3JrKTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwocm91dGVEYXRhLmdhdGV3YXkpO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwocm91dGVEYXRhLmRlc2NyaXB0aW9uIHx8ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRleGlzdGluZ1Jvd3MubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LmludGVyZmFjZSB8fCAnJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dG1hc2sgZm9yIElQIGFkZHJlc3MgZmllbGRzXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcblxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgc3VibmV0IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLnN1Ym5ldC1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgeyBbZHJvcGRvd25JZF06IHNlbGVjdGVkVmFsdWUgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgaW50ZXJmYWNlIHZhbHVlIChlbXB0eSBzdHJpbmcgPSBhdXRvKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5pbnRlcmZhY2UtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBvcHRpb25zOiBcIkF1dG9cIiArIGF2YWlsYWJsZSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0F1dG8gfSxcbiAgICAgICAgICAgIC4uLlN0YXRpY1JvdXRlc01hbmFnZXIuYXZhaWxhYmxlSW50ZXJmYWNlcy5tYXAoaWZhY2UgPT4gKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UudmFsdWUsXG4gICAgICAgICAgICAgICAgdGV4dDogaWZhY2UubGFiZWxcbiAgICAgICAgICAgIH0pKVxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFByZXBhcmUgZm9ybSBkYXRhIGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgIGZvcm1EYXRhW2Ryb3Bkb3duSWRdID0gc2VsZWN0ZWRWYWx1ZSB8fCAnJzsgLy8gRW5zdXJlIHdlIHBhc3MgZW1wdHkgc3RyaW5nIGZvciBcIkF1dG9cIlxuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgZm9ybURhdGEsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSByb3V0ZSBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyXG4gICAgICovXG4gICAgdXBkYXRlUHJpb3JpdGllcygpIHtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGVzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJvdXRlc0RhdGEgLSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgbG9hZFJvdXRlcyhyb3V0ZXNEYXRhKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHJvdXRlc1xuICAgICAgICAkKCcucm91dGUtcm93JykucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gQWRkIGVhY2ggcm91dGVcbiAgICAgICAgaWYgKHJvdXRlc0RhdGEgJiYgcm91dGVzRGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByb3V0ZXNEYXRhLmZvckVhY2gocm91dGUgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHN0YXRlIGlmIG5vIHJvdXRlc1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgcm91dGVzIGZyb20gdGFibGVcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBjb2xsZWN0Um91dGVzKCkge1xuICAgICAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHJvdyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZUlkID0gJHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IHJvdXRlSWQuc3RhcnRzV2l0aCgnbmV3XycpID8gbnVsbCA6IHJvdXRlSWQsXG4gICAgICAgICAgICAgICAgbmV0d29yazogJHJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgICAgICBnYXRld2F5OiAkcm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkcm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJvdXRlcztcbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIG5ldHdvcmsgc2V0dGluZ3MgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbmV0d29ya3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=