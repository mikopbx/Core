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
      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(eth)); // Check if this is the internet interface

      var isInternetInterface = $("input[name=\"internet_interface\"]:checked").val() === eth;

      if (isDhcpEnabled) {
        // DHCP enabled -> hide IP/subnet fields group and gateway field, show DHCP info
        $ipAddressGroup.hide();
        $gatewayField.hide();
        $dhcpInfoMessage.show();
        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> show IP/subnet fields group, hide DHCP info
        $ipAddressGroup.show();
        $dhcpInfoMessage.hide();
        $("#not-dhcp-".concat(eth)).val('1'); // Show gateway field ONLY if this is the internet interface

        if (isInternetInterface) {
          $gatewayField.show();
        } else {
          $gatewayField.hide();
        }
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

    $('input[name^="vlanid_"]').trigger('change'); // Add IPv6 address change handlers to update dual-stack NAT logic

    $('input[name^="ipv6addr_"]').off('input blur').on('input blur', function () {
      // Update dual-stack NAT logic when IPv6 address changes
      networks.updateDualStackNatLogic();
    }); // Add IPv4 address change handlers to update dual-stack NAT logic

    $('input[name^="ipaddr_"]').off('input blur').on('input blur', function () {
      // Update dual-stack NAT logic when IPv4 address changes
      networks.updateDualStackNatLogic();
    }); // Initialize internet radio buttons with Fomantic UI

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
      } // Update Gateway field visibility for all interfaces


      networks.toggleDisabledFieldClass();
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
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <!-- Common Settings Section (outside columns) -->\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <!-- Two Column Grid: IPv4 (left) and IPv6 (right) -->\n                <div class=\"ui two column stackable grid\">\n\n                    <!-- IPv4 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"globe icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv4Configuration, "\n                            </div>\n                        </h4>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"field\">\n                            <label>".concat(globalTranslate.nw_IPv4Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv4_mode_").concat(id, "\" name=\"ipv4_mode_").concat(id, "\" value=\"").concat(dhcpChecked ? '1' : '0', "\" />\n                            </div>\n                        </div>\n                        "), "\n\n                        <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"ipv4-gateway-field-".concat(id, "\" style=\"display: ").concat(isInternetInterface && !dhcpChecked ? 'block' : 'none', ";\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_Gateway, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" placeholder=\"192.168.1.1\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        <!-- IPv4 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv4-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv4, "</div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.currentPrimarydns || iface.primarydns || '', "\" placeholder=\"").concat(primaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.currentSecondarydns || iface.secondarydns || '', "\" placeholder=\"").concat(secondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked && !isDocker ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_DHCPInfoIP, ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoSubnet, ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoGateway, ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoDNS, ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                        ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain, ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n\n                        ").concat(isDocker ? "\n                        <div class=\"docker-info-message-".concat(id, "\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_DockerIPv4Info || 'Current IPv4 Configuration', "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_DHCPInfoIP, ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoSubnet, ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoGateway, ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                    </ul>\n                                    <p style=\"margin-top: 0.5em;\"><i class=\"info circle icon\"></i>").concat(globalTranslate.nw_DockerIPv4InfoNote || 'Network settings are managed by Docker runtime. Only DNS servers can be configured.', "</p>\n                                </div>\n                            </div>\n                        </div>\n                        ") : '', "\n                    </div>\n\n                    <!-- IPv6 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"world icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv6Configuration, "\n                            </div>\n                        </h4>\n\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                            </div>\n                        </div>\n\n                        <!-- Hidden field to store current auto-configured IPv6 address -->\n                        <input type=\"hidden\" id=\"current-ipv6addr-").concat(id, "\" value=\"").concat(iface.currentIpv6addr || '', "\" />\n\n                        <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Address, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Subnet, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\" ").concat(dnsGatewayVisible, ">\n                                <label>").concat(globalTranslate.nw_IPv6Gateway, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.ipv6_gateway || '', "\" placeholder=\"fe80::1\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <!-- IPv6 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv6-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv6, "</div>\n\n                            <div class=\"field ipv6-primarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"").concat(ipv6PrimaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field ipv6-secondarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"").concat(ipv6SecondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress, ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix, ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                        ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway, ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGlwdjRNb2RlRHJvcGRvd24iLCJpcHY0TW9kZSIsImlzRGhjcEVuYWJsZWQiLCIkaXBBZGRyZXNzR3JvdXAiLCIkZ2F0ZXdheUZpZWxkIiwiJGRoY3BJbmZvTWVzc2FnZSIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJ2YWwiLCJzaG93IiwiYWRkTmV3Rm9ybVJ1bGVzIiwidXBkYXRlRHVhbFN0YWNrTmF0TG9naWMiLCJ0b2dnbGVJUHY2RmllbGRzIiwiaW50ZXJmYWNlSWQiLCIkaXB2Nk1vZGVEcm9wZG93biIsImlwdjZNb2RlIiwiJG1hbnVhbEZpZWxkc0NvbnRhaW5lciIsIiRhdXRvSW5mb01lc3NhZ2UiLCIkaXB2NkludGVybmV0U2V0dGluZ3MiLCJpc0R1YWxTdGFja01vZGUiLCJpcHY0YWRkciIsIiRkaGNwQ2hlY2tib3giLCJkaGNwRW5hYmxlZCIsImdhdGV3YXkiLCJpcHY2YWRkck1hbnVhbCIsImlwdjZhZGRyQXV0byIsImlwdjZhZGRyIiwiaGFzSXB2NCIsInRyaW0iLCJoYXNJcHY2IiwiaXB2Nkxvd2VyIiwidG9Mb3dlckNhc2UiLCJpcHY2V2l0aG91dENpZHIiLCJzcGxpdCIsImlzR2xvYmFsVW5pY2FzdCIsInRlc3QiLCJpc05hdEVuYWJsZWQiLCJhbnlEdWFsU3RhY2siLCJ0YWIiLCIkc3RhbmRhcmROYXRTZWN0aW9uIiwiJGR1YWxTdGFja1NlY3Rpb24iLCIkZXh0aG9zdG5hbWVJbnB1dCIsIiRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlciIsImZpbmQiLCJoYXMiLCJmaXJzdCIsIiRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIiLCIkZXh0ZXJuYWxTaXBQb3J0SW5wdXQiLCIkZXh0ZXJuYWxUbHNQb3J0SW5wdXQiLCIkc3RhbmRhcmRTaXBQb3J0V3JhcHBlciIsIiRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyIiwiJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyIiwiJGR1YWxTdGFja1Rsc1BvcnRXcmFwcGVyIiwiYXBwZW5kVG8iLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwicGFyZW50IiwiaG9zdG5hbWUiLCJud19WYWxpZGF0ZUV4dGVybmFsSG9zdG5hbWVFbXB0eSIsImZpZWxkcyIsIm5ld1Jvd0lkIiwibmFtZUNsYXNzIiwiaWRlbnRpZmllciIsIm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSIsInZsYW5DbGFzcyIsIm53X1ZhbGlkYXRlVmxhblJhbmdlIiwibndfVmFsaWRhdGVWbGFuQ3Jvc3MiLCJpcGFkZHJDbGFzcyIsIm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHkiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsIk9iamVjdCIsImFzc2lnbiIsInN0YXRpY1JvdXRlcyIsImNvbGxlY3RSb3V0ZXMiLCIkaW5wdXQiLCJuYW1lIiwicHJvcCIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImlwdjRNb2RlTWF0Y2giLCJtb2RlIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsImlwdjZNb2RlTWF0Y2giLCJzdWJuZXRLZXkiLCJnbG9iYWxIb3N0bmFtZSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJpbmxpbmUiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJOZXR3b3JrQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJnZXRDb25maWciLCJwb3B1bGF0ZUZvcm0iLCJpc0RvY2tlciIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwic2hvd0RvY2tlck5ldHdvcmtJbmZvIiwiY29uc29sZSIsIndhcm4iLCJjaWRyVG9OZXRtYXNrIiwiY2lkciIsIm1hc2siLCJqb2luIiwiY3JlYXRlSW50ZXJmYWNlVGFicyIsIiRtZW51IiwiJGNvbnRlbnQiLCJlbXB0eSIsImludGVyZmFjZXMiLCJpZmFjZSIsInRhYklkIiwiaWQiLCJ0YWJMYWJlbCIsInZsYW5pZCIsImlzQWN0aXZlIiwiYXBwZW5kIiwiY2FuRGVsZXRlIiwicGFyc2VJbnQiLCJkZWxldGVCdXR0b24iLCJud19EZWxldGVDdXJyZW50SW50ZXJmYWNlIiwiY3JlYXRlSW50ZXJmYWNlRm9ybSIsInRlbXBsYXRlIiwiY3JlYXRlVGVtcGxhdGVGb3JtIiwicGh5c2ljYWxJbnRlcmZhY2VzIiwidG9TdHJpbmciLCJwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMiLCJ2YWx1ZXMiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImludGVyZmFjZV8wIiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwibndfU2VsZWN0SW50ZXJmYWNlIiwiYWxsb3dFbXB0eSIsImlwdjRNb2RlT3B0aW9ucyIsIm53X0lQdjRNb2RlTWFudWFsIiwibndfSVB2NE1vZGVESENQIiwiaXB2NF9tb2RlXzAiLCJud19TZWxlY3RJUHY0TW9kZSIsImRhdGFDaGFuZ2VkIiwic3VibmV0XzAiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJpcHY0TW9kZUZpZWxkTmFtZSIsImlwdjRNb2RlRm9ybURhdGEiLCJkaGNwIiwiaXB2Nk1vZGVGaWVsZE5hbWUiLCJpcHY2TW9kZUZvcm1EYXRhIiwiaXB2Nl9tb2RlIiwiaXNWbGFuIiwiaXB2Nk1vZGVPcHRpb25zIiwibndfSVB2Nk1vZGVPZmYiLCJud19JUHY2TW9kZU1hbnVhbCIsIm53X0lQdjZNb2RlQXV0byIsIm53X1NlbGVjdElQdjZNb2RlIiwiaXB2NlN1Ym5ldEZpZWxkTmFtZSIsImlwdjZTdWJuZXRGb3JtRGF0YSIsImlwdjZfc3VibmV0IiwiZ2V0SXB2NlN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdElQdjZTdWJuZXQiLCJ1cGRhdGVWaXNpYmlsaXR5Iiwib2ZmIiwiJGJ1dHRvbiIsInJlbW92ZSIsIiR0YWJDb250ZW50IiwiJGZpcnN0VGFiIiwiZW5hYmxlRGlycml0eSIsImNoZWNrVmFsdWVzIiwiJHZsYW5JbnB1dCIsInJlcGxhY2UiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwiJHRhYiIsInByZXBlbmQiLCIkZHJvcGRvd24iLCJvcmlnaW5hbFNhdmVJbml0aWFsVmFsdWVzIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJvcmlnaW5hbENoZWNrVmFsdWVzIiwiZm9tYW50aWNWYWx1ZXMiLCJtYW51YWxWYWx1ZXMiLCIkZmllbGQiLCJpcyIsIm9sZEZvcm1WYWx1ZXMiLCJuZXdGb3JtVmFsdWVzIiwiSlNPTiIsInN0cmluZ2lmeSIsIiRzdWJtaXRCdXR0b24iLCIkZHJvcGRvd25TdWJtaXQiLCJzZXRFdmVudHMiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZGhjcERpc2FibGVkIiwiZGhjcENoZWNrZWQiLCJob3N0bmFtZVBsYWNlaG9sZGVyIiwibndfUGxhY2Vob2xkZXJEaGNwSG9zdG5hbWUiLCJwcmltYXJ5RG5zUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlckRoY3BEbnMiLCJjdXJyZW50UHJpbWFyeWRucyIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlEbnNQbGFjZWhvbGRlciIsImN1cnJlbnRTZWNvbmRhcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJpcHY2UHJpbWFyeURuc1BsYWNlaG9sZGVyIiwibndfUGxhY2Vob2xkZXJJUHY2RG5zIiwiaXB2NlNlY29uZGFyeURuc1BsYWNlaG9sZGVyIiwiaXBhZGRyIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVmxhbklEIiwibndfSVB2NENvbmZpZ3VyYXRpb24iLCJud19JUHY0TW9kZSIsIm53X0lQQWRkcmVzcyIsIm53X05ldHdvcmtNYXNrIiwibndfR2F0ZXdheSIsIm53X0ludGVybmV0SVB2NCIsIm53X1ByaW1hcnlETlMiLCJud19TZWNvbmRhcnlETlMiLCJud19ESENQSW5mb0hlYWRlciIsIm53X0RIQ1BJbmZvSVAiLCJjdXJyZW50SXBhZGRyIiwibndfREhDUEluZm9TdWJuZXQiLCJjdXJyZW50U3VibmV0IiwibndfREhDUEluZm9HYXRld2F5IiwiY3VycmVudEdhdGV3YXkiLCJud19ESENQSW5mb0ROUyIsImRvbWFpbiIsIm53X0RIQ1BJbmZvRG9tYWluIiwibndfRG9ja2VySVB2NEluZm8iLCJud19Eb2NrZXJJUHY0SW5mb05vdGUiLCJud19JUHY2Q29uZmlndXJhdGlvbiIsIm53X0lQdjZNb2RlIiwiY3VycmVudElwdjZhZGRyIiwibndfSVB2NkFkZHJlc3MiLCJud19JUHY2U3VibmV0IiwibndfSVB2NkdhdGV3YXkiLCJpcHY2X2dhdGV3YXkiLCJud19JbnRlcm5ldElQdjYiLCJud19JUHY2UHJpbWFyeUROUyIsImN1cnJlbnRQcmltYXJ5ZG5zNiIsInByaW1hcnlkbnM2IiwibndfSVB2NlNlY29uZGFyeUROUyIsImN1cnJlbnRTZWNvbmRhcnlkbnM2Iiwic2Vjb25kYXJ5ZG5zNiIsIm53X0lQdjZBdXRvSW5mb0hlYWRlciIsIm53X0lQdjZBdXRvSW5mb0FkZHJlc3MiLCJud19JUHY2QXV0b0luZm9QcmVmaXgiLCJjdXJyZW50SXB2Nl9zdWJuZXQiLCJjdXJyZW50SXB2Nl9nYXRld2F5IiwibndfSVB2NkF1dG9JbmZvR2F0ZXdheSIsIm53X1VzZURIQ1AiLCJvcHRpb25zIiwiaSIsImRlc2NyaXB0aW9uIiwicHVzaCIsImZpcnN0SW50ZXJmYWNlIiwiY3VycmVudEhvc3RuYW1lIiwibmF0IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJhdmFpbGFibGVJbnRlcmZhY2VzIiwibG9hZFJvdXRlcyIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJmIiwiYSIsImlwdjZQYXR0ZXJuIiwiaXBhZGRyZXNzIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJpbkFycmF5IiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwiJHRhYmxlIiwiJHNlY3Rpb24iLCIkYWRkQnV0dG9uIiwiJHRhYmxlQ29udGFpbmVyIiwiJGVtcHR5UGxhY2Vob2xkZXIiLCJyb3V0ZXMiLCJpbml0aWFsaXplRHJhZ0FuZERyb3AiLCJhZGRSb3V0ZSIsImRvY3VtZW50IiwidGFyZ2V0IiwiY2xvc2VzdCIsInVwZGF0ZVByaW9yaXRpZXMiLCJ1cGRhdGVFbXB0eVN0YXRlIiwiJHNvdXJjZVJvdyIsImNvcHlSb3V0ZSIsInBhc3RlZERhdGEiLCJvcmlnaW5hbEV2ZW50IiwiY2xpcGJvYXJkRGF0YSIsImdldERhdGEiLCJ3aW5kb3ciLCJjbGVhbmVkRGF0YSIsInNldFRpbWVvdXQiLCJ0YWJsZURuRFVwZGF0ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZHJhZ0hhbmRsZSIsImludGVyZmFjZUNvdW50Iiwibm90Iiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsIiRleGlzdGluZ1Jvd3MiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwiRGF0ZSIsIm5vdyIsImFmdGVyIiwiaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duIiwiaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duIiwiJHJvdyIsInNlbGVjdGVkVmFsdWUiLCIkY29udGFpbmVyIiwiZHJvcGRvd25JZCIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFNBQVMsRUFBRTtBQUNQQyxNQUFBQSxRQUFRLEVBQUUsSUFESDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREcsRUFLSDtBQUNJSCxRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0U7QUFGNUIsT0FMRztBQUZBLEtBREE7QUFjWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLE9BQU8sRUFBRSxRQURBO0FBRVRQLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQURHLEVBS0g7QUFDSUosUUFBQUEsSUFBSSxFQUFFLGVBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BTEc7QUFGRTtBQWRGLEdBekJGOztBQXNEYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF6RGEsd0JBeURBO0FBQ1Q7QUFDQXJCLElBQUFBLFFBQVEsQ0FBQ3NCLGlCQUFULEdBRlMsQ0FJVDs7QUFDQXBCLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0I7QUFDM0JDLE1BQUFBLFFBRDJCLHNCQUNoQjtBQUNQeEIsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQ7QUFDSDtBQUgwQixLQUEvQjtBQUtBekIsSUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9Cc0IsUUFBcEIsR0FWUyxDQVlUOztBQUVBMUIsSUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCMEIsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQTdCLE1BQUFBLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QjZCLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBQyxNQUFBQSxVQUFVLENBQUNDLGlCQUFYLENBQTZCaEMsUUFBUSxDQUFDaUMsb0JBQXRDO0FBQ0gsS0FKRCxFQWRTLENBb0JUOztBQUNBakMsSUFBQUEsUUFBUSxDQUFDTSxlQUFULENBQXlCNEIsU0FBekIsQ0FBbUM7QUFBQ0MsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYyxxQkFBZTtBQUE3QixLQUFuQyxFQXJCUyxDQXVCVDs7QUFDQW5DLElBQUFBLFFBQVEsQ0FBQ0ssVUFBVCxDQUFvQjZCLFNBQXBCLENBQThCO0FBQUNDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWMscUJBQWU7QUFBN0IsS0FBOUI7QUFFQW5DLElBQUFBLFFBQVEsQ0FBQ29DLGNBQVQsR0ExQlMsQ0E0QlQ7O0FBQ0FDLElBQUFBLG1CQUFtQixDQUFDaEIsVUFBcEIsR0E3QlMsQ0ErQlQ7O0FBQ0EsUUFBSXJCLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW1DLFdBQW5DLE1BQWtELEdBQXRELEVBQTJEO0FBQ3ZEdEMsTUFBQUEsUUFBUSxDQUFDUSxvQkFBVCxDQUE4QitCLElBQTlCO0FBQ0g7QUFDSixHQTVGWTs7QUE4RmI7QUFDSjtBQUNBO0FBQ0E7QUFDSU4sRUFBQUEsb0JBbEdhLGdDQWtHUU8sUUFsR1IsRUFrR2tCO0FBQzNCeEMsSUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCd0MsV0FBeEIsQ0FBb0Msa0JBQXBDOztBQUVBLFFBQUlELFFBQVEsS0FBSyxLQUFiLElBQXNCLENBQUNBLFFBQVEsQ0FBQ0UsTUFBaEMsSUFBMEMsQ0FBQ0YsUUFBUSxDQUFDRyxJQUFwRCxJQUE0RCxDQUFDSCxRQUFRLENBQUNHLElBQVQsQ0FBY0MsRUFBL0UsRUFBbUY7QUFDL0VDLE1BQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQi9CLGVBQWUsQ0FBQ2dDLHlCQUF0QztBQUNBO0FBQ0g7O0FBRUQsUUFBTUMsZ0JBQWdCLEdBQUdoRCxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxDQUF6QjtBQUNBLFFBQU1XLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNFLEtBQWpCLENBQXVCLFNBQXZCLENBQWxCO0FBQ0EsUUFBTUMsSUFBSSxHQUFHRixTQUFTLEdBQUcsTUFBTUEsU0FBUyxDQUFDLENBQUQsQ0FBbEIsR0FBd0IsRUFBOUM7QUFDQSxRQUFNRyxZQUFZLEdBQUdaLFFBQVEsQ0FBQ0csSUFBVCxDQUFjQyxFQUFkLEdBQW1CTyxJQUF4QztBQUNBbkQsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaURjLFlBQWpELEVBWjJCLENBYTNCOztBQUNBcEQsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsYUFBcEMsRUFBbUQsRUFBbkQ7QUFDQXRDLElBQUFBLFFBQVEsQ0FBQ0ssVUFBVCxDQUFvQmdELE9BQXBCLENBQTRCLFFBQTVCO0FBQ0gsR0FsSFk7O0FBb0hiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBekhhLDZCQXlIS0MsS0F6SEwsRUF5SFk7QUFDckI7QUFDQTtBQUNBLFFBQUksQ0FBQ0EsS0FBSyxDQUFDQyxPQUFQLElBQWtCLENBQUNELEtBQUssQ0FBQ0UsUUFBekIsSUFBcUMsQ0FBQ0YsS0FBSyxDQUFDRyxXQUE1QyxJQUEyRCxDQUFDSCxLQUFLLENBQUNJLFNBQXRFLEVBQWlGO0FBQzdFO0FBQ0gsS0FMb0IsQ0FPckI7OztBQUNBLFFBQU1DLGNBQWMsR0FBRzFELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJMEQsY0FBYyxDQUFDQyxNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLE9BQU8sR0FBR0MsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMsb0JBQVlSLEtBQUssQ0FBQ0MsT0FEYztBQUVoQyxvQkFBWUQsS0FBSyxDQUFDRTtBQUZjLE9BQWhCLENBQXBCO0FBSUFHLE1BQUFBLGNBQWMsQ0FBQ0ksSUFBZixDQUFvQkYsT0FBcEI7QUFDSCxLQWZvQixDQWlCckI7OztBQUNBLFFBQU1HLGNBQWMsR0FBRy9ELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJK0QsY0FBYyxDQUFDSixNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1LLE9BQU8sR0FBR0gsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMseUJBQWlCUixLQUFLLENBQUNHLFdBRFM7QUFFaEMsdUJBQWVILEtBQUssQ0FBQ0k7QUFGVyxPQUFoQixDQUFwQjtBQUlBTSxNQUFBQSxjQUFjLENBQUNELElBQWYsQ0FBb0JFLE9BQXBCO0FBQ0gsS0F6Qm9CLENBMkJyQjs7O0FBQ0EsUUFBTUMsdUJBQXVCLEdBQUdqRSxDQUFDLENBQUMsb0NBQUQsQ0FBakM7O0FBQ0EsUUFBSWlFLHVCQUF1QixDQUFDTixNQUF4QixHQUFpQyxDQUFyQyxFQUF3QztBQUNwQyxVQUFNTyxnQkFBZ0IsR0FBR0wsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDekMsb0JBQVlSLEtBQUssQ0FBQ0MsT0FEdUI7QUFFekMsb0JBQVlELEtBQUssQ0FBQ0U7QUFGdUIsT0FBaEIsQ0FBN0I7QUFJQVUsTUFBQUEsdUJBQXVCLENBQUNILElBQXhCLENBQTZCSSxnQkFBN0I7QUFDSCxLQW5Db0IsQ0FxQ3JCOzs7QUFDQSxRQUFNQyx1QkFBdUIsR0FBR25FLENBQUMsQ0FBQyxvQ0FBRCxDQUFqQzs7QUFDQSxRQUFJbUUsdUJBQXVCLENBQUNSLE1BQXhCLEdBQWlDLENBQXJDLEVBQXdDO0FBQ3BDLFVBQU1TLGdCQUFnQixHQUFHUCxJQUFJLENBQUMsYUFBRCxFQUFnQjtBQUN6Qyx5QkFBaUJSLEtBQUssQ0FBQ0csV0FEa0I7QUFFekMsdUJBQWVILEtBQUssQ0FBQ0k7QUFGb0IsT0FBaEIsQ0FBN0I7QUFJQVUsTUFBQUEsdUJBQXVCLENBQUNMLElBQXhCLENBQTZCTSxnQkFBN0I7QUFDSDtBQUNKLEdBdktZOztBQXlLYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQTlLYSw0QkE4S0loQixLQTlLSixFQThLVztBQUNwQjtBQUNBO0FBQ0EsUUFBSSxDQUFDQSxLQUFLLENBQUNDLE9BQVAsSUFBa0IsQ0FBQ0QsS0FBSyxDQUFDRSxRQUE3QixFQUF1QztBQUNuQztBQUNILEtBTG1CLENBT3BCOzs7QUFDQSxRQUFNZSxTQUFTLEdBQUd0RSxDQUFDLENBQUMsMEJBQUQsQ0FBbkI7O0FBQ0EsUUFBSXNFLFNBQVMsQ0FBQ1gsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QixVQUFNWSxZQUFZLEdBQUdWLElBQUksQ0FBQyxrQkFBRCxFQUFxQjtBQUMxQyxvQkFBWVIsS0FBSyxDQUFDQztBQUR3QixPQUFyQixDQUF6QjtBQUdBZ0IsTUFBQUEsU0FBUyxDQUFDRSxJQUFWLENBQWVELFlBQWY7QUFDSCxLQWRtQixDQWdCcEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBR3pFLENBQUMsQ0FBQywwQkFBRCxDQUFuQjs7QUFDQSxRQUFJeUUsU0FBUyxDQUFDZCxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFVBQU1lLFlBQVksR0FBR2IsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQzFDLG9CQUFZUixLQUFLLENBQUNFO0FBRHdCLE9BQXJCLENBQXpCO0FBR0FrQixNQUFBQSxTQUFTLENBQUNELElBQVYsQ0FBZUUsWUFBZjtBQUNILEtBdkJtQixDQXlCcEI7OztBQUNBLFFBQU1DLGtCQUFrQixHQUFHM0UsQ0FBQyxDQUFDLDRCQUFELENBQTVCOztBQUNBLFFBQUkyRSxrQkFBa0IsQ0FBQ2hCLE1BQW5CLEdBQTRCLENBQWhDLEVBQW1DO0FBQy9CLFVBQU1pQixxQkFBcUIsR0FBR2YsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQ25ELG9CQUFZUixLQUFLLENBQUNDO0FBRGlDLE9BQXJCLENBQWxDO0FBR0FxQixNQUFBQSxrQkFBa0IsQ0FBQ0gsSUFBbkIsQ0FBd0JJLHFCQUF4QjtBQUNILEtBaENtQixDQWtDcEI7OztBQUNBLFFBQU1DLGtCQUFrQixHQUFHN0UsQ0FBQyxDQUFDLDRCQUFELENBQTVCOztBQUNBLFFBQUk2RSxrQkFBa0IsQ0FBQ2xCLE1BQW5CLEdBQTRCLENBQWhDLEVBQW1DO0FBQy9CLFVBQU1tQixxQkFBcUIsR0FBR2pCLElBQUksQ0FBQyxrQkFBRCxFQUFxQjtBQUNuRCxvQkFBWVIsS0FBSyxDQUFDRTtBQURpQyxPQUFyQixDQUFsQztBQUdBc0IsTUFBQUEsa0JBQWtCLENBQUNMLElBQW5CLENBQXdCTSxxQkFBeEI7QUFDSDtBQUNKLEdBeE5ZOztBQTBOYjtBQUNKO0FBQ0E7QUFDSXZELEVBQUFBLHdCQTdOYSxzQ0E2TmM7QUFDdkJ2QixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QitFLElBQTVCLENBQWlDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUM3QyxVQUFNQyxHQUFHLEdBQUdsRixDQUFDLENBQUNpRixHQUFELENBQUQsQ0FBT0UsSUFBUCxDQUFZLFVBQVosQ0FBWjtBQUNBLFVBQU1DLGlCQUFpQixHQUFHcEYsQ0FBQyxzQkFBZWtGLEdBQWYsZUFBM0I7QUFDQSxVQUFNRyxRQUFRLEdBQUdELGlCQUFpQixDQUFDNUQsUUFBbEIsQ0FBMkIsV0FBM0IsQ0FBakI7QUFDQSxVQUFNOEQsYUFBYSxHQUFHRCxRQUFRLEtBQUssR0FBbkMsQ0FKNkMsQ0FNN0M7O0FBQ0EsVUFBTUUsZUFBZSxHQUFHdkYsQ0FBQyw2QkFBc0JrRixHQUF0QixFQUF6QjtBQUNBLFVBQU1NLGFBQWEsR0FBR3hGLENBQUMsK0JBQXdCa0YsR0FBeEIsRUFBdkI7QUFDQSxVQUFNTyxnQkFBZ0IsR0FBR3pGLENBQUMsOEJBQXVCa0YsR0FBdkIsRUFBMUIsQ0FUNkMsQ0FXN0M7O0FBQ0EsVUFBTVEsbUJBQW1CLEdBQUcxRixDQUFDLDhDQUFELENBQThDMkYsR0FBOUMsT0FBd0RULEdBQXBGOztBQUVBLFVBQUlJLGFBQUosRUFBbUI7QUFDZjtBQUNBQyxRQUFBQSxlQUFlLENBQUNsRCxJQUFoQjtBQUNBbUQsUUFBQUEsYUFBYSxDQUFDbkQsSUFBZDtBQUNBb0QsUUFBQUEsZ0JBQWdCLENBQUNHLElBQWpCO0FBQ0E1RixRQUFBQSxDQUFDLHFCQUFja0YsR0FBZCxFQUFELENBQXNCUyxHQUF0QixDQUEwQixFQUExQjtBQUNILE9BTkQsTUFNTztBQUNIO0FBQ0FKLFFBQUFBLGVBQWUsQ0FBQ0ssSUFBaEI7QUFDQUgsUUFBQUEsZ0JBQWdCLENBQUNwRCxJQUFqQjtBQUNBckMsUUFBQUEsQ0FBQyxxQkFBY2tGLEdBQWQsRUFBRCxDQUFzQlMsR0FBdEIsQ0FBMEIsR0FBMUIsRUFKRyxDQU1IOztBQUNBLFlBQUlELG1CQUFKLEVBQXlCO0FBQ3JCRixVQUFBQSxhQUFhLENBQUNJLElBQWQ7QUFDSCxTQUZELE1BRU87QUFDSEosVUFBQUEsYUFBYSxDQUFDbkQsSUFBZDtBQUNIO0FBQ0o7O0FBRUR2QyxNQUFBQSxRQUFRLENBQUMrRixlQUFULENBQXlCWCxHQUF6QjtBQUNILEtBbkNELEVBRHVCLENBc0N2Qjs7QUFDQSxRQUFJbEYsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixZQUEvQixDQUFKLEVBQWtEO0FBQzlDckIsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI0RixJQUEzQixHQUQ4QyxDQUU5Qzs7QUFDQTlGLE1BQUFBLFFBQVEsQ0FBQ2dHLHVCQUFUO0FBQ0gsS0FKRCxNQUlPO0FBQ0g5RixNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQnFDLElBQTNCO0FBQ0g7QUFDSixHQTNRWTs7QUE2UWI7QUFDSjtBQUNBO0FBQ0E7QUFDSTBELEVBQUFBLGdCQWpSYSw0QkFpUklDLFdBalJKLEVBaVJpQjtBQUMxQixRQUFNQyxpQkFBaUIsR0FBR2pHLENBQUMsc0JBQWVnRyxXQUFmLEVBQTNCO0FBQ0EsUUFBTUUsUUFBUSxHQUFHRCxpQkFBaUIsQ0FBQ04sR0FBbEIsRUFBakI7QUFDQSxRQUFNUSxzQkFBc0IsR0FBR25HLENBQUMsK0JBQXdCZ0csV0FBeEIsRUFBaEM7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR3BHLENBQUMsbUNBQTRCZ0csV0FBNUIsRUFBMUI7QUFDQSxRQUFNSyxxQkFBcUIsR0FBR3JHLENBQUMsbUNBQTRCZ0csV0FBNUIsRUFBL0IsQ0FMMEIsQ0FPMUI7O0FBQ0EsUUFBSUUsUUFBUSxLQUFLLEdBQWpCLEVBQXNCO0FBQ2xCQyxNQUFBQSxzQkFBc0IsQ0FBQ1AsSUFBdkI7QUFDQVEsTUFBQUEsZ0JBQWdCLENBQUMvRCxJQUFqQjtBQUNBZ0UsTUFBQUEscUJBQXFCLENBQUNULElBQXRCO0FBQ0gsS0FKRCxNQUlPLElBQUlNLFFBQVEsS0FBSyxHQUFqQixFQUFzQjtBQUN6QjtBQUNBQyxNQUFBQSxzQkFBc0IsQ0FBQzlELElBQXZCO0FBQ0ErRCxNQUFBQSxnQkFBZ0IsQ0FBQ1IsSUFBakI7QUFDQVMsTUFBQUEscUJBQXFCLENBQUNULElBQXRCO0FBQ0gsS0FMTSxNQUtBO0FBQ0g7QUFDQU8sTUFBQUEsc0JBQXNCLENBQUM5RCxJQUF2QjtBQUNBK0QsTUFBQUEsZ0JBQWdCLENBQUMvRCxJQUFqQjtBQUNBZ0UsTUFBQUEscUJBQXFCLENBQUNoRSxJQUF0QjtBQUNILEtBdEJ5QixDQXdCMUI7OztBQUNBdkMsSUFBQUEsUUFBUSxDQUFDZ0csdUJBQVQ7QUFDSCxHQTNTWTs7QUE2U2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsZUExVGEsMkJBMFRHTixXQTFUSCxFQTBUZ0I7QUFDekI7QUFDQSxRQUFNTyxRQUFRLEdBQUd2RyxDQUFDLCtCQUF1QmdHLFdBQXZCLFNBQUQsQ0FBeUNMLEdBQXpDLEVBQWpCO0FBQ0EsUUFBTWEsYUFBYSxHQUFHeEcsQ0FBQyxpQkFBVWdHLFdBQVYsZUFBdkI7QUFDQSxRQUFNUyxXQUFXLEdBQUdELGFBQWEsQ0FBQzdDLE1BQWQsR0FBdUIsQ0FBdkIsSUFBNEI2QyxhQUFhLENBQUNuRixRQUFkLENBQXVCLFlBQXZCLENBQWhEO0FBQ0EsUUFBTXFGLE9BQU8sR0FBRzFHLENBQUMsZ0NBQXdCZ0csV0FBeEIsU0FBRCxDQUEwQ0wsR0FBMUMsRUFBaEIsQ0FMeUIsQ0FPekI7O0FBQ0EsUUFBTU8sUUFBUSxHQUFHbEcsQ0FBQyxzQkFBZWdHLFdBQWYsRUFBRCxDQUErQkwsR0FBL0IsRUFBakIsQ0FSeUIsQ0FTekI7O0FBQ0EsUUFBTWdCLGNBQWMsR0FBRzNHLENBQUMsaUNBQXlCZ0csV0FBekIsU0FBRCxDQUEyQ0wsR0FBM0MsRUFBdkI7QUFDQSxRQUFNaUIsWUFBWSxHQUFHNUcsQ0FBQyw2QkFBc0JnRyxXQUF0QixFQUFELENBQXNDTCxHQUF0QyxFQUFyQjtBQUNBLFFBQU1rQixRQUFRLEdBQUdYLFFBQVEsS0FBSyxHQUFiLEdBQW1CVSxZQUFuQixHQUFrQ0QsY0FBbkQsQ0FaeUIsQ0FjekI7QUFDQTs7QUFDQSxRQUFNRyxPQUFPLEdBQUlQLFFBQVEsSUFBSUEsUUFBUSxDQUFDUSxJQUFULE9BQW9CLEVBQWpDLElBQ0NOLFdBQVcsSUFBSUMsT0FBZixJQUEwQkEsT0FBTyxDQUFDSyxJQUFSLE9BQW1CLEVBRDlELENBaEJ5QixDQW1CekI7QUFDQTs7QUFDQSxRQUFNQyxPQUFPLEdBQUcsQ0FBQ2QsUUFBUSxLQUFLLEdBQWIsSUFBb0JBLFFBQVEsS0FBSyxHQUFsQyxLQUNBVyxRQURBLElBQ1lBLFFBQVEsQ0FBQ0UsSUFBVCxPQUFvQixFQURoQyxJQUNzQ0YsUUFBUSxLQUFLLGdCQURuRTs7QUFHQSxRQUFJLENBQUNDLE9BQUQsSUFBWSxDQUFDRSxPQUFqQixFQUEwQjtBQUN0QixhQUFPLEtBQVA7QUFDSCxLQTFCd0IsQ0E0QnpCO0FBQ0E7QUFDQTs7O0FBQ0EsUUFBTUMsU0FBUyxHQUFHSixRQUFRLENBQUNLLFdBQVQsR0FBdUJILElBQXZCLEVBQWxCLENBL0J5QixDQWlDekI7O0FBQ0EsUUFBTUksZUFBZSxHQUFHRixTQUFTLENBQUNHLEtBQVYsQ0FBZ0IsR0FBaEIsRUFBcUIsQ0FBckIsQ0FBeEIsQ0FsQ3lCLENBb0N6Qjs7QUFDQSxRQUFNQyxlQUFlLEdBQUcsUUFBUUMsSUFBUixDQUFhSCxlQUFiLENBQXhCO0FBRUEsV0FBT0UsZUFBUDtBQUNILEdBbFdZOztBQW9XYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2QixFQUFBQSx1QkF6V2EscUNBeVdhO0FBQ3RCO0FBQ0EsUUFBTXlCLFlBQVksR0FBR3ZILENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0IsWUFBL0IsQ0FBckI7O0FBQ0EsUUFBSSxDQUFDa0csWUFBTCxFQUFtQjtBQUNmLGFBRGUsQ0FDUDtBQUNYLEtBTHFCLENBT3RCOzs7QUFDQSxRQUFJQyxZQUFZLEdBQUcsS0FBbkI7QUFFQXhILElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCK0UsSUFBNUIsQ0FBaUMsVUFBQ0MsS0FBRCxFQUFReUMsR0FBUixFQUFnQjtBQUM3QyxVQUFNekIsV0FBVyxHQUFHaEcsQ0FBQyxDQUFDeUgsR0FBRCxDQUFELENBQU90QyxJQUFQLENBQVksVUFBWixDQUFwQjs7QUFDQSxVQUFJckYsUUFBUSxDQUFDd0csZUFBVCxDQUF5Qk4sV0FBekIsQ0FBSixFQUEyQztBQUN2Q3dCLFFBQUFBLFlBQVksR0FBRyxJQUFmO0FBQ0EsZUFBTyxLQUFQLENBRnVDLENBRXpCO0FBQ2pCO0FBQ0osS0FORDtBQVFBLFFBQU1FLG1CQUFtQixHQUFHMUgsQ0FBQyxDQUFDLHVCQUFELENBQTdCO0FBQ0EsUUFBTTJILGlCQUFpQixHQUFHM0gsQ0FBQyxDQUFDLHFCQUFELENBQTNCLENBbkJzQixDQXFCdEI7O0FBQ0EsUUFBTTRILGlCQUFpQixHQUFHNUgsQ0FBQyxDQUFDLGNBQUQsQ0FBM0I7QUFDQSxRQUFNNkgsd0JBQXdCLEdBQUdILG1CQUFtQixDQUFDSSxJQUFwQixDQUF5QixnQkFBekIsRUFBMkNDLEdBQTNDLENBQStDLGNBQS9DLEVBQStEQyxLQUEvRCxFQUFqQztBQUNBLFFBQU1DLHlCQUF5QixHQUFHakksQ0FBQyxDQUFDLHVDQUFELENBQW5DLENBeEJzQixDQTBCdEI7O0FBQ0EsUUFBTWtJLHFCQUFxQixHQUFHbEksQ0FBQyxDQUFDLCtCQUFELENBQS9CO0FBQ0EsUUFBTW1JLHFCQUFxQixHQUFHbkksQ0FBQyxDQUFDLCtCQUFELENBQS9CO0FBQ0EsUUFBTW9JLHVCQUF1QixHQUFHcEksQ0FBQyxDQUFDLHFDQUFELENBQWpDO0FBQ0EsUUFBTXFJLHVCQUF1QixHQUFHckksQ0FBQyxDQUFDLHFDQUFELENBQWpDO0FBQ0EsUUFBTXNJLHdCQUF3QixHQUFHdEksQ0FBQyxDQUFDLHVDQUFELENBQWxDO0FBQ0EsUUFBTXVJLHdCQUF3QixHQUFHdkksQ0FBQyxDQUFDLHVDQUFELENBQWxDOztBQUVBLFFBQUl3SCxZQUFKLEVBQWtCO0FBQ2Q7QUFDQUUsTUFBQUEsbUJBQW1CLENBQUNyRixJQUFwQjtBQUNBc0YsTUFBQUEsaUJBQWlCLENBQUMvQixJQUFsQixHQUhjLENBS2Q7O0FBQ0EsVUFBSWdDLGlCQUFpQixDQUFDakUsTUFBbEIsR0FBMkIsQ0FBM0IsSUFBZ0NzRSx5QkFBeUIsQ0FBQ3RFLE1BQTFCLEdBQW1DLENBQXZFLEVBQTBFO0FBQ3RFaUUsUUFBQUEsaUJBQWlCLENBQUNZLFFBQWxCLENBQTJCUCx5QkFBM0I7QUFDSCxPQVJhLENBVWQ7OztBQUNBLFVBQUlDLHFCQUFxQixDQUFDdkUsTUFBdEIsR0FBK0IsQ0FBL0IsSUFBb0MyRSx3QkFBd0IsQ0FBQzNFLE1BQXpCLEdBQWtDLENBQTFFLEVBQTZFO0FBQ3pFdUUsUUFBQUEscUJBQXFCLENBQUNNLFFBQXRCLENBQStCRix3QkFBL0I7QUFDSDs7QUFDRCxVQUFJSCxxQkFBcUIsQ0FBQ3hFLE1BQXRCLEdBQStCLENBQS9CLElBQW9DNEUsd0JBQXdCLENBQUM1RSxNQUF6QixHQUFrQyxDQUExRSxFQUE2RTtBQUN6RXdFLFFBQUFBLHFCQUFxQixDQUFDSyxRQUF0QixDQUErQkQsd0JBQS9CO0FBQ0gsT0FoQmEsQ0FrQmQ7OztBQUNBekksTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaUQsRUFBakQsRUFuQmMsQ0FxQmQ7O0FBQ0EsVUFBTXFHLG1CQUFtQixHQUFHM0ksUUFBUSxDQUFDRyxRQUFULENBQWtCNkgsSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEWSxNQUE3RCxDQUFvRSxXQUFwRSxDQUE1Qjs7QUFDQSxVQUFJRCxtQkFBbUIsQ0FBQzlFLE1BQXBCLEdBQTZCLENBQWpDLEVBQW9DO0FBQ2hDOEUsUUFBQUEsbUJBQW1CLENBQUNwSCxRQUFwQixDQUE2QixTQUE3QjtBQUNILE9BekJhLENBMkJkOzs7QUFDQSxVQUFNc0gsUUFBUSxHQUFHZixpQkFBaUIsQ0FBQ2pDLEdBQWxCLE1BQTJCLHFCQUE1QztBQUNBM0YsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJ3RSxJQUF2QixDQUE0Qm1FLFFBQTVCLEVBN0JjLENBK0JkOztBQUNBN0ksTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCUyxXQUF2QixDQUFtQ04sS0FBbkMsR0FBMkMsQ0FDdkM7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMrSDtBQUY1QixPQUR1QyxFQUt2QztBQUNJakksUUFBQUEsSUFBSSxFQUFFLGVBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BTHVDLENBQTNDO0FBVUgsS0ExQ0QsTUEwQ087QUFDSDtBQUNBd0csTUFBQUEsbUJBQW1CLENBQUM5QixJQUFwQjtBQUNBK0IsTUFBQUEsaUJBQWlCLENBQUN0RixJQUFsQixHQUhHLENBS0g7O0FBQ0EsVUFBSXVGLGlCQUFpQixDQUFDakUsTUFBbEIsR0FBMkIsQ0FBM0IsSUFBZ0NrRSx3QkFBd0IsQ0FBQ2xFLE1BQXpCLEdBQWtDLENBQXRFLEVBQXlFO0FBQ3JFaUUsUUFBQUEsaUJBQWlCLENBQUNZLFFBQWxCLENBQTJCWCx3QkFBM0I7QUFDSCxPQVJFLENBVUg7OztBQUNBLFVBQUlLLHFCQUFxQixDQUFDdkUsTUFBdEIsR0FBK0IsQ0FBL0IsSUFBb0N5RSx1QkFBdUIsQ0FBQ3pFLE1BQXhCLEdBQWlDLENBQXpFLEVBQTRFO0FBQ3hFdUUsUUFBQUEscUJBQXFCLENBQUNNLFFBQXRCLENBQStCSix1QkFBL0I7QUFDSDs7QUFDRCxVQUFJRCxxQkFBcUIsQ0FBQ3hFLE1BQXRCLEdBQStCLENBQS9CLElBQW9DMEUsdUJBQXVCLENBQUMxRSxNQUF4QixHQUFpQyxDQUF6RSxFQUE0RTtBQUN4RXdFLFFBQUFBLHFCQUFxQixDQUFDSyxRQUF0QixDQUErQkgsdUJBQS9CO0FBQ0gsT0FoQkUsQ0FrQkg7OztBQUNBdkksTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCUyxXQUF2QixDQUFtQ0MsT0FBbkMsR0FBNkMsUUFBN0M7QUFDQW5CLE1BQUFBLFFBQVEsQ0FBQ1MsYUFBVCxDQUF1QlMsV0FBdkIsQ0FBbUNOLEtBQW5DLEdBQTJDLENBQ3ZDO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQUR1QyxFQUt2QztBQUNJSixRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0s7QUFGNUIsT0FMdUMsQ0FBM0M7QUFVSCxLQTFHcUIsQ0E0R3RCOzs7QUFDQXBCLElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFNBQXZCLEVBQWtDQSxJQUFsQyxDQUF1QztBQUNuQ1gsTUFBQUEsRUFBRSxFQUFFLE1BRCtCO0FBRW5Db0gsTUFBQUEsTUFBTSxFQUFFL0ksUUFBUSxDQUFDUztBQUZrQixLQUF2QztBQUlILEdBMWRZOztBQTRkYjtBQUNKO0FBQ0E7QUFDQTtBQUNJc0YsRUFBQUEsZUFoZWEsMkJBZ2VHaUQsUUFoZUgsRUFnZWE7QUFFdEI7QUFDQSxRQUFNQyxTQUFTLGtCQUFXRCxRQUFYLENBQWYsQ0FIc0IsQ0FLdEI7O0FBQ0FoSixJQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUJ3SSxTQUF2QixJQUFvQztBQUNoQ0MsTUFBQUEsVUFBVSxFQUFFRCxTQURvQjtBQUVoQzlILE1BQUFBLE9BQU8sc0JBQWU2SCxRQUFmLENBRnlCO0FBR2hDcEksTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNvSTtBQUY1QixPQURHO0FBSHlCLEtBQXBDLENBTnNCLENBa0J0Qjs7QUFDQSxRQUFNQyxTQUFTLG9CQUFhSixRQUFiLENBQWYsQ0FuQnNCLENBc0J0Qjs7QUFDQWhKLElBQUFBLFFBQVEsQ0FBQ1MsYUFBVCxDQUF1QjJJLFNBQXZCLElBQW9DO0FBQ2hDakksTUFBQUEsT0FBTyxzQkFBZTZILFFBQWYsQ0FEeUI7QUFFaENFLE1BQUFBLFVBQVUsRUFBRUUsU0FGb0I7QUFHaEN4SSxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsa0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNzSTtBQUY1QixPQURHLEVBS0g7QUFDSXhJLFFBQUFBLElBQUksc0JBQWVtSSxRQUFmLE1BRFI7QUFFSWxJLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDdUk7QUFGNUIsT0FMRztBQUh5QixLQUFwQyxDQXZCc0IsQ0F1Q3RCOztBQUNBLFFBQU1DLFdBQVcsb0JBQWFQLFFBQWIsQ0FBakIsQ0F4Q3NCLENBMEN0QjtBQUNBOztBQUNBLFFBQUlBLFFBQVEsS0FBSyxDQUFiLElBQWtCQSxRQUFRLEtBQUssR0FBbkMsRUFBd0M7QUFDcENoSixNQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUI4SSxXQUF2QixJQUFzQztBQUNsQ0wsUUFBQUEsVUFBVSxFQUFFSyxXQURzQjtBQUVsQ3BJLFFBQUFBLE9BQU8sc0JBQWU2SCxRQUFmLENBRjJCO0FBRUM7QUFDbkNwSSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxVQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3lJO0FBRjVCLFNBREcsRUFLSDtBQUNJM0ksVUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMwSTtBQUY1QixTQUxHO0FBSDJCLE9BQXRDO0FBY0gsS0FmRCxNQWVPO0FBQ0h6SixNQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUI4SSxXQUF2QixJQUFzQztBQUNsQ0wsUUFBQUEsVUFBVSxFQUFFSyxXQURzQjtBQUVsQ3BJLFFBQUFBLE9BQU8sb0JBQWE2SCxRQUFiLENBRjJCO0FBRUQ7QUFDakNwSSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxVQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3lJO0FBRjVCLFNBREcsRUFLSDtBQUNJM0ksVUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMwSTtBQUY1QixTQUxHO0FBSDJCLE9BQXRDO0FBY0gsS0ExRXFCLENBNEV0Qjs7QUFFSCxHQTlpQlk7O0FBZ2pCYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQXJqQmEsNEJBcWpCSUMsUUFyakJKLEVBcWpCYztBQUN2QjtBQUNBLFFBQU1qSCxNQUFNLEdBQUdrSCxNQUFNLENBQUNDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCRixRQUFsQixDQUFmO0FBQ0FqSCxJQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBYyxFQUFkLENBSHVCLENBS3ZCOztBQUNBRCxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWW1ILFlBQVosR0FBMkJ6SCxtQkFBbUIsQ0FBQzBILGFBQXBCLEVBQTNCLENBTnVCLENBUXZCO0FBQ0E7O0FBQ0EvSixJQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0I2SCxJQUFsQixDQUF1QiwwRUFBdkIsRUFBbUcvQyxJQUFuRyxDQUF3RyxZQUFXO0FBQy9HLFVBQU0rRSxNQUFNLEdBQUc5SixDQUFDLENBQUMsSUFBRCxDQUFoQjtBQUNBLFVBQU0rSixJQUFJLEdBQUdELE1BQU0sQ0FBQzNFLElBQVAsQ0FBWSxNQUFaLENBQWIsQ0FGK0csQ0FHL0c7O0FBQ0EsVUFBSTRFLElBQUksSUFBSSxDQUFDRCxNQUFNLENBQUNFLElBQVAsQ0FBWSxVQUFaLENBQWIsRUFBc0M7QUFDbEMsWUFBTUMsS0FBSyxHQUFHSCxNQUFNLENBQUNuRSxHQUFQLEVBQWQsQ0FEa0MsQ0FFbEM7O0FBQ0FuRCxRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXNILElBQVosSUFBcUJFLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBVEQsRUFWdUIsQ0FxQnZCOztBQUNBbkssSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCNkgsSUFBbEIsQ0FBdUIsUUFBdkIsRUFBaUMvQyxJQUFqQyxDQUFzQyxZQUFXO0FBQzdDLFVBQU1xRixPQUFPLEdBQUdwSyxDQUFDLENBQUMsSUFBRCxDQUFqQjtBQUNBLFVBQU0rSixJQUFJLEdBQUdLLE9BQU8sQ0FBQ2pGLElBQVIsQ0FBYSxNQUFiLENBQWI7O0FBQ0EsVUFBSTRFLElBQUosRUFBVTtBQUNOLFlBQU1FLEtBQUssR0FBR0csT0FBTyxDQUFDekUsR0FBUixFQUFkLENBRE0sQ0FFTjs7QUFDQW5ELFFBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZc0gsSUFBWixJQUFxQkUsS0FBSyxLQUFLLElBQVYsSUFBa0JBLEtBQUssS0FBS0MsU0FBN0IsR0FBMENDLE1BQU0sQ0FBQ0YsS0FBRCxDQUFoRCxHQUEwRCxFQUE5RTtBQUNIO0FBQ0osS0FSRCxFQXRCdUIsQ0FnQ3ZCO0FBQ0E7O0FBQ0F6SCxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWTRILE1BQVosR0FBcUJySyxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQnFCLFFBQXRCLENBQStCLFlBQS9CLENBQXJCLENBbEN1QixDQW9DdkI7O0FBQ0EsUUFBTWlKLGNBQWMsR0FBR3hLLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQjZILElBQWxCLENBQXVCLG9DQUF2QixFQUE2RFksTUFBN0QsQ0FBb0UsV0FBcEUsQ0FBdkI7O0FBQ0EsUUFBSTRCLGNBQWMsQ0FBQzNHLE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDM0JuQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWThILG9CQUFaLEdBQW1DRCxjQUFjLENBQUNqSixRQUFmLENBQXdCLFlBQXhCLENBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0htQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWThILG9CQUFaLEdBQW1DLEtBQW5DO0FBQ0gsS0ExQ3NCLENBNEN2QjtBQUNBOzs7QUFDQWIsSUFBQUEsTUFBTSxDQUFDYyxJQUFQLENBQVloSSxNQUFNLENBQUNDLElBQW5CLEVBQXlCZ0ksT0FBekIsQ0FBaUMsVUFBQUMsR0FBRyxFQUFJO0FBQ3BDLFVBQU1DLGFBQWEsR0FBR0QsR0FBRyxDQUFDMUgsS0FBSixDQUFVLG1CQUFWLENBQXRCOztBQUNBLFVBQUkySCxhQUFKLEVBQW1CO0FBQ2YsWUFBTTNFLFdBQVcsR0FBRzJFLGFBQWEsQ0FBQyxDQUFELENBQWpDO0FBQ0EsWUFBTUMsSUFBSSxHQUFHcEksTUFBTSxDQUFDQyxJQUFQLENBQVlpSSxHQUFaLENBQWIsQ0FGZSxDQUlmOztBQUNBbEksUUFBQUEsTUFBTSxDQUFDQyxJQUFQLGdCQUFvQnVELFdBQXBCLEtBQXFDNEUsSUFBSSxLQUFLLEdBQTlDLENBTGUsQ0FPZjs7QUFDQSxlQUFPcEksTUFBTSxDQUFDQyxJQUFQLENBQVlpSSxHQUFaLENBQVA7QUFDSDtBQUNKLEtBWkQsRUE5Q3VCLENBNER2Qjs7QUFDQSxRQUFNRyxhQUFhLEdBQUc3SyxDQUFDLENBQUMsMENBQUQsQ0FBdkI7O0FBQ0EsUUFBSTZLLGFBQWEsQ0FBQ2xILE1BQWQsR0FBdUIsQ0FBM0IsRUFBOEI7QUFDMUJuQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXFJLGtCQUFaLEdBQWlDWCxNQUFNLENBQUNVLGFBQWEsQ0FBQ2xGLEdBQWQsRUFBRCxDQUF2QztBQUNILEtBaEVzQixDQWtFdkI7QUFDQTtBQUVBOzs7QUFDQStELElBQUFBLE1BQU0sQ0FBQ2MsSUFBUCxDQUFZaEksTUFBTSxDQUFDQyxJQUFuQixFQUF5QmdJLE9BQXpCLENBQWlDLFVBQUFDLEdBQUcsRUFBSTtBQUNwQyxVQUFNSyxhQUFhLEdBQUdMLEdBQUcsQ0FBQzFILEtBQUosQ0FBVSxtQkFBVixDQUF0Qjs7QUFDQSxVQUFJK0gsYUFBSixFQUFtQjtBQUNmLFlBQU0vRSxXQUFXLEdBQUcrRSxhQUFhLENBQUMsQ0FBRCxDQUFqQztBQUNBLFlBQU1ILElBQUksR0FBR3BJLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZaUksR0FBWixDQUFiO0FBQ0EsWUFBTU0sU0FBUyx5QkFBa0JoRixXQUFsQixDQUFmLENBSGUsQ0FLZjs7QUFDQSxZQUFJNEUsSUFBSSxLQUFLLEdBQVQsS0FBaUIsQ0FBQ3BJLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZdUksU0FBWixDQUFELElBQTJCeEksTUFBTSxDQUFDQyxJQUFQLENBQVl1SSxTQUFaLE1BQTJCLEVBQXZFLENBQUosRUFBZ0Y7QUFDNUV4SSxVQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXVJLFNBQVosSUFBeUIsSUFBekI7QUFDSDtBQUNKO0FBQ0osS0FaRCxFQXRFdUIsQ0FvRnZCO0FBQ0E7O0FBQ0EsUUFBTUMsY0FBYyxHQUFHakwsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0IyRixHQUF0QixNQUErQixFQUF0RDtBQUNBM0YsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEIrRSxJQUE1QixDQUFpQyxVQUFDQyxLQUFELEVBQVF5QyxHQUFSLEVBQWdCO0FBQzdDLFVBQU16QixXQUFXLEdBQUdoRyxDQUFDLENBQUN5SCxHQUFELENBQUQsQ0FBT3RDLElBQVAsQ0FBWSxVQUFaLENBQXBCO0FBQ0EzQyxNQUFBQSxNQUFNLENBQUNDLElBQVAsb0JBQXdCdUQsV0FBeEIsS0FBeUNpRixjQUF6QztBQUNILEtBSEQ7QUFLQSxXQUFPekksTUFBUDtBQUNILEdBbHBCWTs7QUFvcEJiO0FBQ0o7QUFDQTtBQUNBO0FBQ0kwSSxFQUFBQSxlQXhwQmEsMkJBd3BCRzVJLFFBeHBCSCxFQXdwQmEsQ0FDdEI7QUFDSCxHQTFwQlk7O0FBNHBCYjtBQUNKO0FBQ0E7QUFDSUosRUFBQUEsY0EvcEJhLDRCQStwQkk7QUFDYmlKLElBQUFBLElBQUksQ0FBQ2xMLFFBQUwsR0FBZ0JILFFBQVEsQ0FBQ0csUUFBekI7QUFDQWtMLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxHQUFXLEdBQVgsQ0FGYSxDQUVHOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDNUssYUFBTCxHQUFxQlQsUUFBUSxDQUFDUyxhQUE5QixDQUhhLENBR2dDOztBQUM3QzRLLElBQUFBLElBQUksQ0FBQzNCLGdCQUFMLEdBQXdCMUosUUFBUSxDQUFDMEosZ0JBQWpDLENBSmEsQ0FJc0M7O0FBQ25EMkIsSUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCcEwsUUFBUSxDQUFDb0wsZUFBaEMsQ0FMYSxDQUtvQzs7QUFDakRDLElBQUFBLElBQUksQ0FBQ0UsTUFBTCxHQUFjLElBQWQsQ0FOYSxDQU1PO0FBRXBCOztBQUNBRixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0FKLElBQUFBLElBQUksQ0FBQ0csV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJDLFVBQTdCO0FBQ0FOLElBQUFBLElBQUksQ0FBQ0csV0FBTCxDQUFpQkksVUFBakIsR0FBOEIsWUFBOUIsQ0FYYSxDQWFiOztBQUNBUCxJQUFBQSxJQUFJLENBQUNRLG1CQUFMLGFBQThCQyxhQUE5QjtBQUNBVCxJQUFBQSxJQUFJLENBQUNVLG9CQUFMLGFBQStCRCxhQUEvQjtBQUVBVCxJQUFBQSxJQUFJLENBQUNoSyxVQUFMO0FBQ0gsR0FqckJZOztBQW1yQmI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGlCQXRyQmEsK0JBc3JCTztBQUNoQnFLLElBQUFBLFVBQVUsQ0FBQ0ssU0FBWCxDQUFxQixVQUFDeEosUUFBRCxFQUFjO0FBQy9CLFVBQUlBLFFBQVEsQ0FBQ0UsTUFBVCxJQUFtQkYsUUFBUSxDQUFDRyxJQUFoQyxFQUFzQztBQUNsQzNDLFFBQUFBLFFBQVEsQ0FBQ2lNLFlBQVQsQ0FBc0J6SixRQUFRLENBQUNHLElBQS9CLEVBRGtDLENBR2xDOztBQUNBM0MsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQsR0FKa0MsQ0FNbEM7O0FBQ0EsWUFBSWUsUUFBUSxDQUFDRyxJQUFULENBQWN1SixRQUFsQixFQUE0QjtBQUN4QmxNLFVBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFdBQXBDLEVBQWlELEdBQWpEO0FBQ0F0QyxVQUFBQSxRQUFRLENBQUNRLG9CQUFULENBQThCK0IsSUFBOUI7QUFDSDtBQUNKLE9BWEQsTUFXTztBQUNITSxRQUFBQSxXQUFXLENBQUNzSixlQUFaLENBQTRCM0osUUFBUSxDQUFDNEosUUFBckM7QUFDSDtBQUNKLEtBZkQ7QUFnQkgsR0F2c0JZOztBQXlzQmI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEscUJBN3NCYSxpQ0E2c0JTMUosSUE3c0JULEVBNnNCZTtBQUN4QjtBQUNBMkosSUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEscUNBQWI7QUFDSCxHQWh0Qlk7O0FBa3RCYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFydEJhLHlCQXF0QkNDLElBcnRCRCxFQXF0Qk87QUFDaEIsUUFBTUMsSUFBSSxHQUFHLEVBQUUsWUFBTSxLQUFLRCxJQUFYLElBQW1CLENBQXJCLENBQWI7QUFDQSxXQUFPLENBQ0ZDLElBQUksS0FBSyxFQUFWLEdBQWdCLEdBRGIsRUFFRkEsSUFBSSxLQUFLLEVBQVYsR0FBZ0IsR0FGYixFQUdGQSxJQUFJLEtBQUssQ0FBVixHQUFlLEdBSFosRUFJSEEsSUFBSSxHQUFHLEdBSkosRUFLTEMsSUFMSyxDQUtBLEdBTEEsQ0FBUDtBQU1ILEdBN3RCWTs7QUErdEJiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBcHVCYSwrQkFvdUJPakssSUFwdUJQLEVBb3VCK0I7QUFBQSxRQUFsQnVKLFFBQWtCLHVFQUFQLEtBQU87QUFDeEMsUUFBTVcsS0FBSyxHQUFHM00sQ0FBQyxDQUFDLHNCQUFELENBQWY7QUFDQSxRQUFNNE0sUUFBUSxHQUFHNU0sQ0FBQyxDQUFDLHlCQUFELENBQWxCLENBRndDLENBSXhDOztBQUNBMk0sSUFBQUEsS0FBSyxDQUFDRSxLQUFOO0FBQ0FELElBQUFBLFFBQVEsQ0FBQ0MsS0FBVCxHQU53QyxDQVF4Qzs7QUFDQXBLLElBQUFBLElBQUksQ0FBQ3FLLFVBQUwsQ0FBZ0JyQyxPQUFoQixDQUF3QixVQUFDc0MsS0FBRCxFQUFRL0gsS0FBUixFQUFrQjtBQUN0QyxVQUFNZ0ksS0FBSyxHQUFHRCxLQUFLLENBQUNFLEVBQXBCO0FBQ0EsVUFBTUMsUUFBUSxhQUFNSCxLQUFLLENBQUNoRCxJQUFOLElBQWNnRCxLQUFLLGFBQXpCLGVBQXdDQSxLQUFLLGFBQTdDLFNBQTBEQSxLQUFLLENBQUNJLE1BQU4sS0FBaUIsR0FBakIsSUFBd0JKLEtBQUssQ0FBQ0ksTUFBTixLQUFpQixDQUF6QyxjQUFpREosS0FBSyxDQUFDSSxNQUF2RCxJQUFrRSxFQUE1SCxNQUFkO0FBQ0EsVUFBTUMsUUFBUSxHQUFHcEksS0FBSyxLQUFLLENBQTNCLENBSHNDLENBS3RDOztBQUNBMkgsTUFBQUEsS0FBSyxDQUFDVSxNQUFOLDZDQUNxQkQsUUFBUSxHQUFHLFFBQUgsR0FBYyxFQUQzQywyQkFDNERKLEtBRDVELHNDQUVVRSxRQUZWLDJDQU5zQyxDQVl0QztBQUNBO0FBQ0E7O0FBQ0EsVUFBTUksU0FBUyxHQUFHLENBQUN0QixRQUFELElBQWF1QixRQUFRLENBQUNSLEtBQUssQ0FBQ0ksTUFBUCxFQUFlLEVBQWYsQ0FBUixHQUE2QixDQUE1RDtBQUNBLFVBQU1LLFlBQVksR0FBR0YsU0FBUyxzR0FDNENOLEtBRDVDLGtFQUVNbk0sZUFBZSxDQUFDNE0seUJBRnRCLDRDQUkxQixFQUpKO0FBTUFiLE1BQUFBLFFBQVEsQ0FBQ1MsTUFBVCxDQUFnQnZOLFFBQVEsQ0FBQzROLG1CQUFULENBQTZCWCxLQUE3QixFQUFvQ0ssUUFBcEMsRUFBOENJLFlBQTlDLEVBQTREeEIsUUFBNUQsQ0FBaEI7QUFDSCxLQXZCRCxFQVR3QyxDQWtDeEM7O0FBQ0EsUUFBSXZKLElBQUksQ0FBQ2tMLFFBQUwsSUFBaUIsQ0FBQzNCLFFBQXRCLEVBQWdDO0FBQzVCLFVBQU0yQixRQUFRLEdBQUdsTCxJQUFJLENBQUNrTCxRQUF0QjtBQUNBQSxNQUFBQSxRQUFRLENBQUNWLEVBQVQsR0FBYyxDQUFkLENBRjRCLENBSTVCOztBQUNBTixNQUFBQSxLQUFLLENBQUNVLE1BQU4sNklBTDRCLENBVzVCOztBQUNBVCxNQUFBQSxRQUFRLENBQUNTLE1BQVQsQ0FBZ0J2TixRQUFRLENBQUM4TixrQkFBVCxDQUE0QkQsUUFBNUIsRUFBc0NsTCxJQUFJLENBQUNxSyxVQUEzQyxDQUFoQixFQVo0QixDQWM1Qjs7QUFDQSxVQUFNZSxrQkFBa0IsR0FBRyxFQUEzQjtBQUNBcEwsTUFBQUEsSUFBSSxDQUFDcUssVUFBTCxDQUFnQnJDLE9BQWhCLENBQXdCLFVBQUFzQyxLQUFLLEVBQUk7QUFDN0IsWUFBSSxDQUFDYyxrQkFBa0IsQ0FBQ2QsS0FBSyxhQUFOLENBQXZCLEVBQTBDO0FBQ3RDYyxVQUFBQSxrQkFBa0IsQ0FBQ2QsS0FBSyxhQUFOLENBQWxCLEdBQXNDO0FBQ2xDOUMsWUFBQUEsS0FBSyxFQUFFOEMsS0FBSyxDQUFDRSxFQUFOLENBQVNhLFFBQVQsRUFEMkI7QUFFbEN0SixZQUFBQSxJQUFJLEVBQUV1SSxLQUFLLGFBRnVCO0FBR2xDaEQsWUFBQUEsSUFBSSxFQUFFZ0QsS0FBSztBQUh1QixXQUF0QztBQUtIO0FBQ0osT0FSRDtBQVVBLFVBQU1nQix3QkFBd0IsR0FBR3JFLE1BQU0sQ0FBQ3NFLE1BQVAsQ0FBY0gsa0JBQWQsQ0FBakM7QUFFQUksTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLGFBQXJDLEVBQW9EO0FBQUVDLFFBQUFBLFdBQVcsRUFBRTtBQUFmLE9BQXBELEVBQXlFO0FBQ3JFQyxRQUFBQSxhQUFhLEVBQUVMLHdCQURzRDtBQUVyRU0sUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDeU4sa0JBRndDO0FBR3JFQyxRQUFBQSxVQUFVLEVBQUU7QUFIeUQsT0FBekUsRUE1QjRCLENBa0M1Qjs7QUFDQSxVQUFNQyxlQUFlLEdBQUcsQ0FDcEI7QUFBQ3ZFLFFBQUFBLEtBQUssRUFBRSxHQUFSO0FBQWF6RixRQUFBQSxJQUFJLEVBQUUzRCxlQUFlLENBQUM0TjtBQUFuQyxPQURvQixFQUVwQjtBQUFDeEUsUUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLFFBQUFBLElBQUksRUFBRTNELGVBQWUsQ0FBQzZOO0FBQW5DLE9BRm9CLENBQXhCO0FBS0FULE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxhQUFyQyxFQUFvRDtBQUFFUyxRQUFBQSxXQUFXLEVBQUU7QUFBZixPQUFwRCxFQUEwRTtBQUN0RVAsUUFBQUEsYUFBYSxFQUFFSSxlQUR1RDtBQUV0RUgsUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDK04saUJBRnlDO0FBR3RFTCxRQUFBQSxVQUFVLEVBQUUsS0FIMEQ7QUFJdEVqTixRQUFBQSxRQUFRLEVBQUUsb0JBQU07QUFDWnhCLFVBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFUO0FBQ0E0SixVQUFBQSxJQUFJLENBQUMwRCxXQUFMO0FBQ0g7QUFQcUUsT0FBMUUsRUF4QzRCLENBa0Q1Qjs7QUFDQVosTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLFVBQXJDLEVBQWlEO0FBQUVZLFFBQUFBLFFBQVEsRUFBRTtBQUFaLE9BQWpELEVBQXFFO0FBQ2pFVixRQUFBQSxhQUFhLEVBQUV0TyxRQUFRLENBQUNpUCxxQkFBVCxFQURrRDtBQUVqRVYsUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDbU8sb0JBRm9DO0FBR2pFVCxRQUFBQSxVQUFVLEVBQUUsS0FIcUQ7QUFJakVVLFFBQUFBLGlCQUFpQixFQUFFLENBQUMsUUFBRDtBQUo4QyxPQUFyRTtBQU1ILEtBNUZ1QyxDQThGeEM7OztBQUNBeE0sSUFBQUEsSUFBSSxDQUFDcUssVUFBTCxDQUFnQnJDLE9BQWhCLENBQXdCLFVBQUNzQyxLQUFELEVBQVc7QUFDL0IsVUFBTW1DLFNBQVMsb0JBQWFuQyxLQUFLLENBQUNFLEVBQW5CLENBQWY7QUFDQSxVQUFNa0MsUUFBUSxHQUFHLEVBQWpCLENBRitCLENBRy9COztBQUNBQSxNQUFBQSxRQUFRLENBQUNELFNBQUQsQ0FBUixHQUFzQi9FLE1BQU0sQ0FBQzRDLEtBQUssQ0FBQ3FDLE1BQU4sSUFBZ0IsSUFBakIsQ0FBNUI7QUFFQW5CLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQ2dCLFNBQXJDLEVBQWdEQyxRQUFoRCxFQUEwRDtBQUN0RGYsUUFBQUEsYUFBYSxFQUFFdE8sUUFBUSxDQUFDaVAscUJBQVQsRUFEdUM7QUFFdERWLFFBQUFBLFdBQVcsRUFBRXhOLGVBQWUsQ0FBQ21PLG9CQUZ5QjtBQUd0RFQsUUFBQUEsVUFBVSxFQUFFLEtBSDBDO0FBSXREVSxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQsQ0FKbUMsQ0FJdkI7O0FBSnVCLE9BQTFELEVBTitCLENBYS9COztBQUNBLFVBQUksQ0FBQ2xDLEtBQUssQ0FBQ2YsUUFBWCxFQUFxQjtBQUNqQixZQUFNcUQsaUJBQWlCLHVCQUFnQnRDLEtBQUssQ0FBQ0UsRUFBdEIsQ0FBdkI7QUFDQSxZQUFNcUMsZ0JBQWdCLEdBQUcsRUFBekIsQ0FGaUIsQ0FHakI7O0FBQ0FBLFFBQUFBLGdCQUFnQixDQUFDRCxpQkFBRCxDQUFoQixHQUF1Q3RDLEtBQUssQ0FBQ3dDLElBQU4sS0FBZSxHQUFmLElBQXNCeEMsS0FBSyxDQUFDd0MsSUFBTixLQUFlLElBQXRDLEdBQThDLEdBQTlDLEdBQW9ELEdBQTFGO0FBRUEsWUFBTWYsZ0JBQWUsR0FBRyxDQUNwQjtBQUFDdkUsVUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLFVBQUFBLElBQUksRUFBRTNELGVBQWUsQ0FBQzROO0FBQW5DLFNBRG9CLEVBRXBCO0FBQUN4RSxVQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsVUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDNk47QUFBbkMsU0FGb0IsQ0FBeEI7QUFLQVQsUUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDbUIsaUJBQXJDLEVBQXdEQyxnQkFBeEQsRUFBMEU7QUFDdEVsQixVQUFBQSxhQUFhLEVBQUVJLGdCQUR1RDtBQUV0RUgsVUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDK04saUJBRnlDO0FBR3RFTCxVQUFBQSxVQUFVLEVBQUUsS0FIMEQ7QUFJdEVqTixVQUFBQSxRQUFRLEVBQUUsb0JBQU07QUFDWnhCLFlBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFUO0FBQ0E0SixZQUFBQSxJQUFJLENBQUMwRCxXQUFMO0FBQ0g7QUFQcUUsU0FBMUU7QUFTSCxPQWxDOEIsQ0FvQy9CO0FBQ0E7OztBQUNBLFVBQU1XLGlCQUFpQix1QkFBZ0J6QyxLQUFLLENBQUNFLEVBQXRCLENBQXZCO0FBQ0EsVUFBTXdDLGdCQUFnQixHQUFHLEVBQXpCO0FBQ0FBLE1BQUFBLGdCQUFnQixDQUFDRCxpQkFBRCxDQUFoQixHQUFzQ3JGLE1BQU0sQ0FBQzRDLEtBQUssQ0FBQzJDLFNBQU4sSUFBbUIsR0FBcEIsQ0FBNUM7QUFFQSxVQUFNQyxNQUFNLEdBQUc1QyxLQUFLLENBQUNJLE1BQU4sSUFBZ0JJLFFBQVEsQ0FBQ1IsS0FBSyxDQUFDSSxNQUFQLEVBQWUsRUFBZixDQUFSLEdBQTZCLENBQTVEO0FBQ0EsVUFBTXlDLGVBQWUsR0FBR0QsTUFBTSxHQUN4QixDQUNFO0FBQUMxRixRQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsUUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDZ1A7QUFBbkMsT0FERixFQUVFO0FBQUM1RixRQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsUUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDaVA7QUFBbkMsT0FGRixDQUR3QixHQUt4QixDQUNFO0FBQUM3RixRQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsUUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDZ1A7QUFBbkMsT0FERixFQUVFO0FBQUM1RixRQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsUUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDa1A7QUFBbkMsT0FGRixFQUdFO0FBQUM5RixRQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhekYsUUFBQUEsSUFBSSxFQUFFM0QsZUFBZSxDQUFDaVA7QUFBbkMsT0FIRixDQUxOO0FBV0E3QixNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUNzQixpQkFBckMsRUFBd0RDLGdCQUF4RCxFQUEwRTtBQUN0RXJCLFFBQUFBLGFBQWEsRUFBRXdCLGVBRHVEO0FBRXRFdkIsUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDbVAsaUJBRnlDO0FBR3RFekIsUUFBQUEsVUFBVSxFQUFFLEtBSDBEO0FBSXRFak4sUUFBQUEsUUFBUSxFQUFFLG9CQUFNO0FBQ1p4QixVQUFBQSxRQUFRLENBQUNpRyxnQkFBVCxDQUEwQmdILEtBQUssQ0FBQ0UsRUFBaEM7QUFDQTlCLFVBQUFBLElBQUksQ0FBQzBELFdBQUw7QUFDSDtBQVBxRSxPQUExRSxFQXREK0IsQ0FnRS9COztBQUNBLFVBQU1vQixtQkFBbUIseUJBQWtCbEQsS0FBSyxDQUFDRSxFQUF4QixDQUF6QjtBQUNBLFVBQU1pRCxrQkFBa0IsR0FBRyxFQUEzQjtBQUNBQSxNQUFBQSxrQkFBa0IsQ0FBQ0QsbUJBQUQsQ0FBbEIsR0FBMEM5RixNQUFNLENBQUM0QyxLQUFLLENBQUNvRCxXQUFOLElBQXFCLElBQXRCLENBQWhEO0FBRUFsQyxNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUMrQixtQkFBckMsRUFBMERDLGtCQUExRCxFQUE4RTtBQUMxRTlCLFFBQUFBLGFBQWEsRUFBRXRPLFFBQVEsQ0FBQ3NRLHlCQUFULEVBRDJEO0FBRTFFL0IsUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDd1AsbUJBRjZDO0FBRzFFOUIsUUFBQUEsVUFBVSxFQUFFLEtBSDhEO0FBSTFFVSxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQ7QUFKdUQsT0FBOUUsRUFyRStCLENBNEUvQjs7QUFDQW5QLE1BQUFBLFFBQVEsQ0FBQ2lHLGdCQUFULENBQTBCZ0gsS0FBSyxDQUFDRSxFQUFoQztBQUNILEtBOUVELEVBL0Z3QyxDQStLeEM7O0FBQ0EsUUFBSXhLLElBQUksQ0FBQ2tMLFFBQVQsRUFBbUI7QUFDZk0sTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLFVBQXJDLEVBQWlEO0FBQUVZLFFBQUFBLFFBQVEsRUFBRTtBQUFaLE9BQWpELEVBQXFFO0FBQ2pFVixRQUFBQSxhQUFhLEVBQUV0TyxRQUFRLENBQUNpUCxxQkFBVCxFQURrRDtBQUVqRVYsUUFBQUEsV0FBVyxFQUFFeE4sZUFBZSxDQUFDbU8sb0JBRm9DO0FBR2pFVCxRQUFBQSxVQUFVLEVBQUUsS0FIcUQ7QUFJakVVLFFBQUFBLGlCQUFpQixFQUFFLENBQUMsUUFBRCxDQUo4QyxDQUlsQzs7QUFKa0MsT0FBckU7QUFNSCxLQXZMdUMsQ0F5THhDOzs7QUFDQWpQLElBQUFBLENBQUMsQ0FBQyw0QkFBRCxDQUFELENBQWdDeUgsR0FBaEM7QUFDQXpILElBQUFBLENBQUMsQ0FBQyw0QkFBRCxDQUFELENBQWdDZ0ksS0FBaEMsR0FBd0M3RSxPQUF4QyxDQUFnRCxPQUFoRCxFQTNMd0MsQ0E2THhDOztBQUNBaEIsSUFBQUEsbUJBQW1CLENBQUNtTyxnQkFBcEIsR0E5THdDLENBZ014QztBQUNBO0FBQ0E7O0FBQ0F0USxJQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QnVRLEdBQXZCLENBQTJCLE9BQTNCLEVBQW9DOU8sRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU0MsQ0FBVCxFQUFZO0FBQ3hEQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNNk8sT0FBTyxHQUFHeFEsQ0FBQyxDQUFDLElBQUQsQ0FBakI7QUFDQSxVQUFNZ0csV0FBVyxHQUFHd0ssT0FBTyxDQUFDckwsSUFBUixDQUFhLFlBQWIsQ0FBcEIsQ0FId0QsQ0FLeEQ7O0FBQ0FuRixNQUFBQSxDQUFDLDZDQUFxQ2dHLFdBQXJDLFNBQUQsQ0FBdUR5SyxNQUF2RCxHQU53RCxDQVF4RDs7QUFDQSxVQUFNQyxXQUFXLEdBQUcxUSxDQUFDLG1EQUEyQ2dHLFdBQTNDLFNBQXJCO0FBQ0EwSyxNQUFBQSxXQUFXLENBQUNELE1BQVosR0FWd0QsQ0FZeEQ7O0FBQ0EzUSxNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JvTixNQUFsQixrREFBZ0VySCxXQUFoRSx3QkFid0QsQ0FleEQ7O0FBQ0EsVUFBTTJLLFNBQVMsR0FBRzNRLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDZ0ksS0FBakMsRUFBbEI7O0FBQ0EsVUFBSTJJLFNBQVMsQ0FBQ2hOLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEJnTixRQUFBQSxTQUFTLENBQUNsSixHQUFWLENBQWMsWUFBZCxFQUE0QmtKLFNBQVMsQ0FBQ3hMLElBQVYsQ0FBZSxVQUFmLENBQTVCO0FBQ0gsT0FuQnVELENBcUJ4RDs7O0FBQ0EsVUFBSWdHLElBQUksQ0FBQ3lGLGFBQVQsRUFBd0I7QUFDcEJ6RixRQUFBQSxJQUFJLENBQUMwRixXQUFMO0FBQ0g7QUFDSixLQXpCRCxFQW5Nd0MsQ0E4TnhDO0FBRUE7O0FBQ0E3USxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCZ0MsU0FBaEIsQ0FBMEI7QUFBQ0MsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYyxxQkFBZTtBQUE3QixLQUExQixFQWpPd0MsQ0FtT3hDOztBQUNBakMsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJ1USxHQUE1QixDQUFnQyxjQUFoQyxFQUFnRDlPLEVBQWhELENBQW1ELGNBQW5ELEVBQW1FLFlBQVc7QUFDMUUsVUFBTXFQLFVBQVUsR0FBRzlRLENBQUMsQ0FBQyxJQUFELENBQXBCO0FBQ0EsVUFBTWdHLFdBQVcsR0FBRzhLLFVBQVUsQ0FBQzNMLElBQVgsQ0FBZ0IsTUFBaEIsRUFBd0I0TCxPQUF4QixDQUFnQyxTQUFoQyxFQUEyQyxFQUEzQyxDQUFwQjtBQUNBLFVBQU1DLFNBQVMsR0FBR3pELFFBQVEsQ0FBQ3VELFVBQVUsQ0FBQ25MLEdBQVgsRUFBRCxFQUFtQixFQUFuQixDQUFSLElBQWtDLENBQXBEO0FBQ0EsVUFBTWEsYUFBYSxHQUFHeEcsQ0FBQyxpQkFBVWdHLFdBQVYsZUFBdkI7O0FBRUEsVUFBSWdMLFNBQVMsR0FBRyxDQUFoQixFQUFtQjtBQUNmO0FBQ0F4SyxRQUFBQSxhQUFhLENBQUM1RSxRQUFkLENBQXVCLFVBQXZCO0FBQ0E0RSxRQUFBQSxhQUFhLENBQUNuRixRQUFkLENBQXVCLFNBQXZCO0FBQ0FtRixRQUFBQSxhQUFhLENBQUNuRixRQUFkLENBQXVCLGNBQXZCO0FBQ0FtRixRQUFBQSxhQUFhLENBQUNzQixJQUFkLENBQW1CLE9BQW5CLEVBQTRCa0MsSUFBNUIsQ0FBaUMsVUFBakMsRUFBNkMsSUFBN0M7QUFDSCxPQU5ELE1BTU87QUFDSDtBQUNBeEQsUUFBQUEsYUFBYSxDQUFDakUsV0FBZCxDQUEwQixVQUExQjtBQUNBaUUsUUFBQUEsYUFBYSxDQUFDbkYsUUFBZCxDQUF1QixhQUF2QjtBQUNBbUYsUUFBQUEsYUFBYSxDQUFDc0IsSUFBZCxDQUFtQixPQUFuQixFQUE0QmtDLElBQTVCLENBQWlDLFVBQWpDLEVBQTZDLEtBQTdDO0FBQ0gsT0FqQnlFLENBa0IxRTs7O0FBQ0FsSyxNQUFBQSxRQUFRLENBQUN5Qix3QkFBVDtBQUNILEtBcEJELEVBcE93QyxDQTBQeEM7O0FBQ0F2QixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0Qm1ELE9BQTVCLENBQW9DLFFBQXBDLEVBM1B3QyxDQTZQeEM7O0FBQ0FuRCxJQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QnVRLEdBQTlCLENBQWtDLFlBQWxDLEVBQWdEOU8sRUFBaEQsQ0FBbUQsWUFBbkQsRUFBaUUsWUFBVztBQUN4RTtBQUNBM0IsTUFBQUEsUUFBUSxDQUFDZ0csdUJBQVQ7QUFDSCxLQUhELEVBOVB3QyxDQW1ReEM7O0FBQ0E5RixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QnVRLEdBQTVCLENBQWdDLFlBQWhDLEVBQThDOU8sRUFBOUMsQ0FBaUQsWUFBakQsRUFBK0QsWUFBVztBQUN0RTtBQUNBM0IsTUFBQUEsUUFBUSxDQUFDZ0csdUJBQVQ7QUFDSCxLQUhELEVBcFF3QyxDQXlReEM7O0FBQ0E5RixJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnFCLFFBQXJCLEdBMVF3QyxDQTRReEM7O0FBQ0FyQixJQUFBQSxDQUFDLENBQUMsa0NBQUQsQ0FBRCxDQUFzQ3VRLEdBQXRDLENBQTBDLFFBQTFDLEVBQW9EOU8sRUFBcEQsQ0FBdUQsUUFBdkQsRUFBaUUsWUFBVztBQUN4RSxVQUFNd1AsbUJBQW1CLEdBQUdqUixDQUFDLENBQUMsSUFBRCxDQUFELENBQVEyRixHQUFSLEVBQTVCLENBRHdFLENBR3hFOztBQUNBM0YsTUFBQUEsQ0FBQyxDQUFDLCtCQUFELENBQUQsQ0FBbUNxQyxJQUFuQyxHQUp3RSxDQU14RTs7QUFDQXJDLE1BQUFBLENBQUMsOEJBQXVCaVIsbUJBQXZCLEVBQUQsQ0FBK0NyTCxJQUEvQyxHQVB3RSxDQVN4RTs7QUFDQTVGLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCK0UsSUFBNUIsQ0FBaUMsVUFBQ0MsS0FBRCxFQUFReUMsR0FBUixFQUFnQjtBQUM3QyxZQUFNeUosSUFBSSxHQUFHbFIsQ0FBQyxDQUFDeUgsR0FBRCxDQUFkO0FBQ0EsWUFBTXVGLEtBQUssR0FBR2tFLElBQUksQ0FBQy9MLElBQUwsQ0FBVSxVQUFWLENBQWQsQ0FGNkMsQ0FJN0M7O0FBQ0ErTCxRQUFBQSxJQUFJLENBQUNwSixJQUFMLENBQVUsYUFBVixFQUF5QjJJLE1BQXpCLEdBTDZDLENBTzdDOztBQUNBLFlBQUl6RCxLQUFLLEtBQUtpRSxtQkFBZCxFQUFtQztBQUMvQkMsVUFBQUEsSUFBSSxDQUFDQyxPQUFMLENBQWEsNEJBQWI7QUFDSDtBQUNKLE9BWEQsRUFWd0UsQ0F1QnhFOztBQUNBLFVBQUloRyxJQUFJLENBQUN5RixhQUFULEVBQXdCO0FBQ3BCekYsUUFBQUEsSUFBSSxDQUFDMEYsV0FBTDtBQUNILE9BMUJ1RSxDQTRCeEU7OztBQUNBL1EsTUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQ7QUFDSCxLQTlCRCxFQTdRd0MsQ0E2U3hDOztBQUNBdkIsSUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJ1USxHQUF6QixDQUE2QixtQkFBN0IsRUFBa0Q5TyxFQUFsRCxDQUFxRCxtQkFBckQsRUFBMEUsWUFBVztBQUNqRixVQUFNMlAsU0FBUyxHQUFHcFIsQ0FBQyxDQUFDLElBQUQsQ0FBbkI7QUFDQSxVQUFNZ0csV0FBVyxHQUFHb0wsU0FBUyxDQUFDak0sSUFBVixDQUFlLElBQWYsRUFBcUI0TCxPQUFyQixDQUE2QixZQUE3QixFQUEyQyxFQUEzQyxDQUFwQjtBQUNBLFVBQU0xTCxRQUFRLEdBQUcrTCxTQUFTLENBQUM1UCxRQUFWLENBQW1CLFdBQW5CLENBQWpCO0FBQ0EsVUFBTThELGFBQWEsR0FBR0QsUUFBUSxLQUFLLEdBQW5DLENBSmlGLENBTWpGOztBQUNBLFVBQU1JLGdCQUFnQixHQUFHekYsQ0FBQyw4QkFBdUJnRyxXQUF2QixFQUExQjs7QUFFQSxVQUFJVixhQUFKLEVBQW1CO0FBQ2Y7QUFDQUcsUUFBQUEsZ0JBQWdCLENBQUNHLElBQWpCO0FBQ0gsT0FIRCxNQUdPO0FBQ0g7QUFDQUgsUUFBQUEsZ0JBQWdCLENBQUNwRCxJQUFqQjtBQUNILE9BZmdGLENBaUJqRjs7O0FBQ0F2QyxNQUFBQSxRQUFRLENBQUN5Qix3QkFBVCxHQWxCaUYsQ0FvQmpGOztBQUNBekIsTUFBQUEsUUFBUSxDQUFDZ0csdUJBQVQ7QUFDSCxLQXRCRCxFQTlTd0MsQ0FzVXhDOztBQUNBLFFBQU0rRSxhQUFhLEdBQUc3SyxDQUFDLENBQUMsMENBQUQsQ0FBdkI7O0FBQ0EsUUFBSTZLLGFBQWEsQ0FBQ2xILE1BQWQsR0FBdUIsQ0FBM0IsRUFBOEI7QUFDMUJrSCxNQUFBQSxhQUFhLENBQUMxSCxPQUFkLENBQXNCLFFBQXRCO0FBQ0gsS0ExVXVDLENBNFV4QztBQUNBOzs7QUFDQXJELElBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFULEdBOVV3QyxDQWdWeEM7QUFDQTs7QUFDQSxRQUFJNEosSUFBSSxDQUFDeUYsYUFBVCxFQUF3QjtBQUNwQjtBQUNBLFVBQU1TLHlCQUF5QixHQUFHbEcsSUFBSSxDQUFDbUcsaUJBQXZDO0FBQ0EsVUFBTUMsbUJBQW1CLEdBQUdwRyxJQUFJLENBQUMwRixXQUFqQzs7QUFFQTFGLE1BQUFBLElBQUksQ0FBQ21HLGlCQUFMLEdBQXlCLFlBQVc7QUFDaEM7QUFDQSxZQUFNRSxjQUFjLEdBQUcxUixRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixZQUF2QixDQUF2QixDQUZnQyxDQUloQzs7QUFDQSxZQUFNcVAsWUFBWSxHQUFHLEVBQXJCO0FBQ0EzUixRQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0I2SCxJQUFsQixDQUF1Qix5QkFBdkIsRUFBa0QvQyxJQUFsRCxDQUF1RCxZQUFXO0FBQzlELGNBQU0yTSxNQUFNLEdBQUcxUixDQUFDLENBQUMsSUFBRCxDQUFoQjtBQUNBLGNBQU0rSixJQUFJLEdBQUcySCxNQUFNLENBQUN2TSxJQUFQLENBQVksTUFBWixLQUF1QnVNLE1BQU0sQ0FBQ3ZNLElBQVAsQ0FBWSxJQUFaLENBQXBDOztBQUNBLGNBQUk0RSxJQUFKLEVBQVU7QUFDTixnQkFBSTJILE1BQU0sQ0FBQ3ZNLElBQVAsQ0FBWSxNQUFaLE1BQXdCLFVBQTVCLEVBQXdDO0FBQ3BDc00sY0FBQUEsWUFBWSxDQUFDMUgsSUFBRCxDQUFaLEdBQXFCMkgsTUFBTSxDQUFDQyxFQUFQLENBQVUsVUFBVixDQUFyQjtBQUNILGFBRkQsTUFFTyxJQUFJRCxNQUFNLENBQUN2TSxJQUFQLENBQVksTUFBWixNQUF3QixPQUE1QixFQUFxQztBQUN4QyxrQkFBSXVNLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVLFVBQVYsQ0FBSixFQUEyQjtBQUN2QkYsZ0JBQUFBLFlBQVksQ0FBQzFILElBQUQsQ0FBWixHQUFxQjJILE1BQU0sQ0FBQy9MLEdBQVAsRUFBckI7QUFDSDtBQUNKLGFBSk0sTUFJQTtBQUNIOEwsY0FBQUEsWUFBWSxDQUFDMUgsSUFBRCxDQUFaLEdBQXFCMkgsTUFBTSxDQUFDL0wsR0FBUCxFQUFyQjtBQUNIO0FBQ0o7QUFDSixTQWRELEVBTmdDLENBc0JoQzs7QUFDQXdGLFFBQUFBLElBQUksQ0FBQ3lHLGFBQUwsR0FBcUJsSSxNQUFNLENBQUNDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCNkgsY0FBbEIsRUFBa0NDLFlBQWxDLENBQXJCO0FBQ0gsT0F4QkQ7O0FBMEJBdEcsTUFBQUEsSUFBSSxDQUFDMEYsV0FBTCxHQUFtQixZQUFXO0FBQzFCO0FBQ0EsWUFBTVcsY0FBYyxHQUFHMVIsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBdkIsQ0FGMEIsQ0FJMUI7O0FBQ0EsWUFBTXFQLFlBQVksR0FBRyxFQUFyQjtBQUNBM1IsUUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCNkgsSUFBbEIsQ0FBdUIseUJBQXZCLEVBQWtEL0MsSUFBbEQsQ0FBdUQsWUFBVztBQUM5RCxjQUFNMk0sTUFBTSxHQUFHMVIsQ0FBQyxDQUFDLElBQUQsQ0FBaEI7QUFDQSxjQUFNK0osSUFBSSxHQUFHMkgsTUFBTSxDQUFDdk0sSUFBUCxDQUFZLE1BQVosS0FBdUJ1TSxNQUFNLENBQUN2TSxJQUFQLENBQVksSUFBWixDQUFwQzs7QUFDQSxjQUFJNEUsSUFBSixFQUFVO0FBQ04sZ0JBQUkySCxNQUFNLENBQUN2TSxJQUFQLENBQVksTUFBWixNQUF3QixVQUE1QixFQUF3QztBQUNwQ3NNLGNBQUFBLFlBQVksQ0FBQzFILElBQUQsQ0FBWixHQUFxQjJILE1BQU0sQ0FBQ0MsRUFBUCxDQUFVLFVBQVYsQ0FBckI7QUFDSCxhQUZELE1BRU8sSUFBSUQsTUFBTSxDQUFDdk0sSUFBUCxDQUFZLE1BQVosTUFBd0IsT0FBNUIsRUFBcUM7QUFDeEMsa0JBQUl1TSxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQUosRUFBMkI7QUFDdkJGLGdCQUFBQSxZQUFZLENBQUMxSCxJQUFELENBQVosR0FBcUIySCxNQUFNLENBQUMvTCxHQUFQLEVBQXJCO0FBQ0g7QUFDSixhQUpNLE1BSUE7QUFDSDhMLGNBQUFBLFlBQVksQ0FBQzFILElBQUQsQ0FBWixHQUFxQjJILE1BQU0sQ0FBQy9MLEdBQVAsRUFBckI7QUFDSDtBQUNKO0FBQ0osU0FkRCxFQU4wQixDQXNCMUI7O0FBQ0EsWUFBTWtNLGFBQWEsR0FBR25JLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0I2SCxjQUFsQixFQUFrQ0MsWUFBbEMsQ0FBdEI7O0FBRUEsWUFBSUssSUFBSSxDQUFDQyxTQUFMLENBQWU1RyxJQUFJLENBQUN5RyxhQUFwQixNQUF1Q0UsSUFBSSxDQUFDQyxTQUFMLENBQWVGLGFBQWYsQ0FBM0MsRUFBMEU7QUFDdEUxRyxVQUFBQSxJQUFJLENBQUM2RyxhQUFMLENBQW1CcFEsUUFBbkIsQ0FBNEIsVUFBNUI7QUFDQXVKLFVBQUFBLElBQUksQ0FBQzhHLGVBQUwsQ0FBcUJyUSxRQUFyQixDQUE4QixVQUE5QjtBQUNILFNBSEQsTUFHTztBQUNIdUosVUFBQUEsSUFBSSxDQUFDNkcsYUFBTCxDQUFtQnpQLFdBQW5CLENBQStCLFVBQS9CO0FBQ0E0SSxVQUFBQSxJQUFJLENBQUM4RyxlQUFMLENBQXFCMVAsV0FBckIsQ0FBaUMsVUFBakM7QUFDSDtBQUNKLE9BaENEOztBQWtDQSxVQUFJLE9BQU80SSxJQUFJLENBQUNtRyxpQkFBWixLQUFrQyxVQUF0QyxFQUFrRDtBQUM5Q25HLFFBQUFBLElBQUksQ0FBQ21HLGlCQUFMO0FBQ0g7O0FBQ0QsVUFBSSxPQUFPbkcsSUFBSSxDQUFDK0csU0FBWixLQUEwQixVQUE5QixFQUEwQztBQUN0Qy9HLFFBQUFBLElBQUksQ0FBQytHLFNBQUw7QUFDSDtBQUNKO0FBQ0osR0E5bkNZOztBQWdvQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXhFLEVBQUFBLG1CQXZvQ2EsK0JBdW9DT1gsS0F2b0NQLEVBdW9DY0ssUUF2b0NkLEVBdW9Dd0JJLFlBdm9DeEIsRUF1b0N3RDtBQUFBLFFBQWxCeEIsUUFBa0IsdUVBQVAsS0FBTztBQUNqRSxRQUFNaUIsRUFBRSxHQUFHRixLQUFLLENBQUNFLEVBQWpCO0FBQ0EsUUFBTXZILG1CQUFtQixHQUFHcUgsS0FBSyxDQUFDb0YsUUFBTixJQUFrQixLQUE5QyxDQUZpRSxDQUlqRTs7QUFDQSxRQUFNQyxpQkFBaUIsR0FBRzFNLG1CQUFtQixHQUFHLEVBQUgsR0FBUSx1QkFBckQsQ0FMaUUsQ0FPakU7O0FBQ0EsUUFBTTJNLFlBQVksR0FBR3JHLFFBQVEsSUFBSWUsS0FBSyxDQUFDSSxNQUFOLEdBQWUsQ0FBaEQ7QUFDQSxRQUFNbUYsV0FBVyxHQUFHdEcsUUFBUSxLQUFLZSxLQUFLLENBQUNJLE1BQU4sR0FBZSxDQUFmLEdBQW1CLEtBQW5CLEdBQTJCSixLQUFLLENBQUN3QyxJQUF0QyxDQUE1QixDQVRpRSxDQVdqRTs7QUFDQSxRQUFNZ0QsbUJBQW1CLEdBQUdELFdBQVcsR0FBR3pSLGVBQWUsQ0FBQzJSLDBCQUFuQixHQUFnRCxTQUF2RjtBQUNBLFFBQU1DLHFCQUFxQixHQUFHSCxXQUFXLGFBQU16UixlQUFlLENBQUM2UixxQkFBdEIsY0FBK0MzRixLQUFLLENBQUM0RixpQkFBTixJQUEyQjVGLEtBQUssQ0FBQzZGLFVBQWpDLElBQStDLFNBQTlGLElBQTRHLFNBQXJKO0FBQ0EsUUFBTUMsdUJBQXVCLEdBQUdQLFdBQVcsYUFBTXpSLGVBQWUsQ0FBQzZSLHFCQUF0QixjQUErQzNGLEtBQUssQ0FBQytGLG1CQUFOLElBQTZCL0YsS0FBSyxDQUFDZ0csWUFBbkMsSUFBbUQsU0FBbEcsSUFBZ0gsU0FBM0osQ0FkaUUsQ0FnQmpFOztBQUNBLFFBQU1DLHlCQUF5QixHQUFHblMsZUFBZSxDQUFDb1MscUJBQWxEO0FBQ0EsUUFBTUMsMkJBQTJCLEdBQUdyUyxlQUFlLENBQUNvUyxxQkFBcEQ7QUFFQSwrRUFDaUQ3RixRQUFRLEdBQUcsUUFBSCxHQUFjLEVBRHZFLDJCQUN3RkgsRUFEeEYsMEVBRStDQSxFQUYvQyx3QkFFNkRGLEtBQUssYUFGbEUsMEdBS1VmLFFBQVEsa0VBQ3dCaUIsRUFEeEIsd0JBQ3NDRixLQUFLLENBQUNoRCxJQUFOLElBQWMsRUFEcEQsK0ZBRThDa0QsRUFGOUMsdUVBR3dCQSxFQUh4QixzRkFJMEJBLEVBSjFCLHdCQUl3Q0YsS0FBSyxDQUFDb0csTUFBTixJQUFnQixFQUp4RCx5RUFLMEJsRyxFQUwxQix3QkFLd0NGLEtBQUssQ0FBQ3FDLE1BQU4sSUFBZ0IsSUFMeEQsNkdBUUd2TyxlQUFlLENBQUN1UyxnQkFSbkIseUlBVThCbkcsRUFWOUIsd0JBVTRDRixLQUFLLENBQUNoRCxJQUFOLElBQWMsRUFWMUQsd1BBZ0I0RGtELEVBaEI1RCw4R0FpQnlEQSxFQWpCekQsZ0JBaUJnRXZILG1CQUFtQixHQUFHLFNBQUgsR0FBZSxFQWpCbEcsa0ZBa0JzQzdFLGVBQWUsQ0FBQ3dTLG9CQWxCdEQsK0tBd0JHeFMsZUFBZSxDQUFDeVMsU0F4Qm5CLDZJQTBCa0NyRyxFQTFCbEMsd0JBMEJnREYsS0FBSyxDQUFDSSxNQUFOLElBQWdCLEdBMUJoRSxnRkFMbEIsdWNBNEMwQnRNLGVBQWUsQ0FBQzBTLG9CQTVDMUMsNEdBZ0RrQnZILFFBQVEsR0FBRyxFQUFILGlHQUVHbkwsZUFBZSxDQUFDMlMsV0FGbkIsOEpBSW1DdkcsRUFKbkMsaUNBSTBEQSxFQUoxRCx3QkFJd0VxRixXQUFXLEdBQUcsR0FBSCxHQUFTLEdBSjVGLHdHQWhEMUIsK0VBeURxRHJGLEVBekRyRCw4QkF5RHlFQSxFQXpEekUsNkNBMkRrQmpCLFFBQVEsR0FBRyxFQUFILG1GQUNpQ2lCLEVBRGpDLDRHQUdPcE0sZUFBZSxDQUFDNFMsWUFIdkIsdUxBS3NEeEcsRUFMdEQsd0JBS29FRixLQUFLLENBQUNvRyxNQUFOLElBQWdCLEVBTHBGLDBMQVNPdFMsZUFBZSxDQUFDNlMsY0FUdkIsbUtBV29DekcsRUFYcEMsOEJBV3dEQSxFQVh4RCx3QkFXc0VGLEtBQUssQ0FBQ3FDLE1BQU4sSUFBZ0IsRUFYdEYsZ0pBM0QxQix5Q0E0RWtCcEQsUUFBUSxHQUFHLEVBQUgsdUVBQ3VCaUIsRUFEdkIsaUNBQzhDdkgsbUJBQW1CLElBQUksQ0FBQzRNLFdBQXhCLEdBQXNDLE9BQXRDLEdBQWdELE1BRDlGLDZHQUdPelIsZUFBZSxDQUFDOFMsVUFIdkIsd0xBS3VEMUcsRUFMdkQsd0JBS3FFRixLQUFLLENBQUNyRyxPQUFOLElBQWlCLEVBTHRGLDRLQTVFMUIsbUtBd0ZxRHVHLEVBeEZyRCxnQkF3RjREbUYsaUJBeEY1RCxpRkF5RnlEdlIsZUFBZSxDQUFDK1MsZUF6RnpFLGlIQTRGaUMvUyxlQUFlLENBQUNnVCxhQTVGakQsMkxBOEZvRjVHLEVBOUZwRix3QkE4RmtHRixLQUFLLENBQUM0RixpQkFBTixJQUEyQjVGLEtBQUssQ0FBQzZGLFVBQWpDLElBQStDLEVBOUZqSiw4QkE4RnFLSCxxQkE5RnJLLDRMQW1HaUM1UixlQUFlLENBQUNpVCxlQW5HakQsNkxBcUdzRjdHLEVBckd0Rix3QkFxR29HRixLQUFLLENBQUMrRixtQkFBTixJQUE2Qi9GLEtBQUssQ0FBQ2dHLFlBQW5DLElBQW1ELEVBckd2Siw4QkFxRzJLRix1QkFyRzNLLDRQQTRHZ0Q1RixFQTVHaEQsaUNBNEd1RXFGLFdBQVcsSUFBSSxDQUFDdEcsUUFBaEIsR0FBMkIsT0FBM0IsR0FBcUMsTUE1RzVHLDJNQStHa0RuTCxlQUFlLENBQUNrVCxpQkEvR2xFLHVKQWlIc0NsVCxlQUFlLENBQUNtVCxhQWpIdEQsdUJBaUhnRmpILEtBQUssQ0FBQ2tILGFBQU4sSUFBdUJsSCxLQUFLLENBQUNvRyxNQUE3QixJQUF1QyxLQWpIdkgseUVBa0hzQ3RTLGVBQWUsQ0FBQ3FULGlCQWxIdEQsd0JBa0hxRm5ILEtBQUssQ0FBQ29ILGFBQU4sSUFBdUJwSCxLQUFLLENBQUNxQyxNQUE3QixJQUF1QyxLQWxINUgseUVBbUhzQ3ZPLGVBQWUsQ0FBQ3VULGtCQW5IdEQsdUJBbUhxRnJILEtBQUssQ0FBQ3NILGNBQU4sSUFBd0J0SCxLQUFLLENBQUNyRyxPQUE5QixJQUF5QyxLQW5IOUgseUVBb0hzQzdGLGVBQWUsQ0FBQ3lULGNBcEh0RCx1QkFvSGlGdkgsS0FBSyxDQUFDNkYsVUFBTixJQUFvQixLQXBIckcsU0FvSDZHN0YsS0FBSyxDQUFDZ0csWUFBTixHQUFxQixPQUFPaEcsS0FBSyxDQUFDZ0csWUFBbEMsR0FBaUQsRUFwSDlKLHFFQXFIa0NoRyxLQUFLLENBQUN3SCxNQUFOLGlCQUFzQjFULGVBQWUsQ0FBQzJULGlCQUF0Qyx1QkFBb0V6SCxLQUFLLENBQUN3SCxNQUExRSxzQkFBbUcsRUFySHJJLGdNQTJIa0J2SSxRQUFRLHdFQUN3QmlCLEVBRHhCLDBNQUl3QnBNLGVBQWUsQ0FBQzRULGlCQUFoQixJQUFxQyw0QkFKN0QsdUpBTVk1VCxlQUFlLENBQUNtVCxhQU41Qix1QkFNc0RqSCxLQUFLLENBQUNrSCxhQUFOLElBQXVCbEgsS0FBSyxDQUFDb0csTUFBN0IsSUFBdUMsS0FON0YseUVBT1l0UyxlQUFlLENBQUNxVCxpQkFQNUIsd0JBTzJEbkgsS0FBSyxDQUFDb0gsYUFBTixJQUF1QnBILEtBQUssQ0FBQ3FDLE1BQTdCLElBQXVDLEtBUGxHLHlFQVFZdk8sZUFBZSxDQUFDdVQsa0JBUjVCLHVCQVEyRHJILEtBQUssQ0FBQ3NILGNBQU4sSUFBd0J0SCxLQUFLLENBQUNyRyxPQUE5QixJQUF5QyxLQVJwRyw4S0FVa0U3RixlQUFlLENBQUM2VCxxQkFBaEIsSUFBeUMscUZBVjNHLGtKQWNOLEVBeklwQiwyVkFpSjBCN1QsZUFBZSxDQUFDOFQsb0JBakoxQyxzS0FzSjZCOVQsZUFBZSxDQUFDK1QsV0F0SjdDLDhKQXdKNkQzSCxFQXhKN0QsaUNBd0pvRkEsRUF4SnBGLHdCQXdKa0dGLEtBQUssQ0FBQzJDLFNBQU4sSUFBbUIsR0F4SnJILDRQQTZKNER6QyxFQTdKNUQsd0JBNkowRUYsS0FBSyxDQUFDOEgsZUFBTixJQUF5QixFQTdKbkcsOEVBK0ppRDVILEVBL0pqRCxxSUFpS2lDcE0sZUFBZSxDQUFDaVUsY0FqS2pELDJMQW1Lb0Y3SCxFQW5LcEYsd0JBbUtrR0YsS0FBSyxDQUFDbEcsUUFBTixJQUFrQixFQW5LcEgsa05BdUtpQ2hHLGVBQWUsQ0FBQ2tVLGFBdktqRCx3S0F5S21FOUgsRUF6S25FLG1DQXlLNEZBLEVBeks1Rix3QkF5SzBHRixLQUFLLENBQUNvRCxXQUFOLElBQXFCLElBeksvSCxpSkE0S3lDaUMsaUJBNUt6Qyx1REE2S2lDdlIsZUFBZSxDQUFDbVUsY0E3S2pELCtMQStLd0YvSCxFQS9LeEYsd0JBK0tzR0YsS0FBSyxDQUFDa0ksWUFBTixJQUFzQixFQS9LNUgsNFNBcUxxRGhJLEVBckxyRCxnQkFxTDREbUYsaUJBckw1RCxpRkFzTHlEdlIsZUFBZSxDQUFDcVUsZUF0THpFLDRGQXdMOERqSSxFQXhMOUQseURBeUxpQ3BNLGVBQWUsQ0FBQ3NVLGlCQXpMakQsOExBMkx1RmxJLEVBM0x2Rix3QkEyTHFHRixLQUFLLENBQUNxSSxrQkFBTixJQUE0QnJJLEtBQUssQ0FBQ3NJLFdBQWxDLElBQWlELEVBM0x0Siw4QkEyTDBLckMseUJBM0wxSyx5S0ErTGdFL0YsRUEvTGhFLHlEQWdNaUNwTSxlQUFlLENBQUN5VSxtQkFoTWpELGdNQWtNeUZySSxFQWxNekYsd0JBa011R0YsS0FBSyxDQUFDd0ksb0JBQU4sSUFBOEJ4SSxLQUFLLENBQUN5SSxhQUFwQyxJQUFxRCxFQWxNNUosOEJBa01nTHRDLDJCQWxNaEwsaVFBeU1xRGpHLEVBek1yRCxpQ0F5TTRFRixLQUFLLENBQUMyQyxTQUFOLEtBQW9CLEdBQXBCLEdBQTBCLE9BQTFCLEdBQW9DLE1Bek1oSCwyTUE0TWtEN08sZUFBZSxDQUFDNFUscUJBNU1sRSx1SkE4TXNDNVUsZUFBZSxDQUFDNlUsc0JBOU10RCx1QkE4TXlGM0ksS0FBSyxDQUFDOEgsZUFBTixJQUF5QjlILEtBQUssQ0FBQ2xHLFFBQS9CLElBQTJDLGdCQTlNcEkseUVBK01zQ2hHLGVBQWUsQ0FBQzhVLHFCQS9NdEQsd0JBK015RjVJLEtBQUssQ0FBQzZJLGtCQUFOLElBQTRCN0ksS0FBSyxDQUFDb0QsV0FBbEMsSUFBaUQsSUEvTTFJLHFFQWdObUNwRCxLQUFLLENBQUM4SSxtQkFBTixJQUE2QjlJLEtBQUssQ0FBQ2tJLFlBQXBDLGlCQUEyRHBVLGVBQWUsQ0FBQ2lWLHNCQUEzRSx1QkFBOEcvSSxLQUFLLENBQUM4SSxtQkFBTixJQUE2QjlJLEtBQUssQ0FBQ2tJLFlBQWpKLHNCQUFnTCxFQWhObE4sNE9Bd05VekgsWUF4TlY7QUEyTkgsR0F0M0NZOztBQXczQ2I7QUFDSjtBQUNBO0FBQ0lJLEVBQUFBLGtCQTMzQ2EsOEJBMjNDTUQsUUEzM0NOLEVBMjNDZ0JiLFVBMzNDaEIsRUEyM0M0QjtBQUNyQyxRQUFNRyxFQUFFLEdBQUcsQ0FBWDtBQUVBLDRGQUM0REEsRUFENUQsb0ZBR3FCcE0sZUFBZSxDQUFDeU4sa0JBSHJDLGdKQUt1RHJCLEVBTHZELCtCQUs0RUEsRUFMNUUsNElBVXFCcE0sZUFBZSxDQUFDdVMsZ0JBVnJDLHlJQVlnRG5HLEVBWmhELDBCQVlnRUEsRUFaaEUsOFBBa0J5RUEsRUFsQnpFLDRGQW1Cd0RBLEVBbkJ4RCwrREFvQjZCcE0sZUFBZSxDQUFDa1YsVUFwQjdDLCtLQTBCcUJsVixlQUFlLENBQUMyUyxXQTFCckMsOElBNEJxRHZHLEVBNUJyRCxpQ0E0QjRFQSxFQTVCNUUsNElBZ0M2Q0EsRUFoQzdDLDhCQWdDaUVBLEVBaENqRSxpRkFrQ21EQSxFQWxDbkQsNEZBb0N5QnBNLGVBQWUsQ0FBQzRTLFlBcEN6Qyx1S0FzQ3dFeEcsRUF0Q3hFLHFLQTBDeUJwTSxlQUFlLENBQUM2UyxjQTFDekMsbUpBNENzRHpHLEVBNUN0RCw4QkE0QzBFQSxFQTVDMUUseUxBa0RxQnBNLGVBQWUsQ0FBQ3lTLFNBbERyQyw2SUFvRG9EckcsRUFwRHBEO0FBeURILEdBdjdDWTs7QUF5N0NiO0FBQ0o7QUFDQTtBQUNBO0FBQ0ltRCxFQUFBQSx5QkE3N0NhLHVDQTY3Q2U7QUFDeEIsUUFBTTRGLE9BQU8sR0FBRyxFQUFoQixDQUR3QixDQUV4Qjs7QUFDQSxTQUFLLElBQUlDLENBQUMsR0FBRyxHQUFiLEVBQWtCQSxDQUFDLElBQUksQ0FBdkIsRUFBMEJBLENBQUMsRUFBM0IsRUFBK0I7QUFDM0IsVUFBSUMsV0FBVyxjQUFPRCxDQUFQLENBQWYsQ0FEMkIsQ0FFM0I7O0FBQ0EsVUFBSUEsQ0FBQyxLQUFLLEdBQVYsRUFBZUMsV0FBVyxJQUFJLGdCQUFmLENBQWYsS0FDSyxJQUFJRCxDQUFDLEtBQUssRUFBVixFQUFjQyxXQUFXLElBQUksb0JBQWYsQ0FBZCxLQUNBLElBQUlELENBQUMsS0FBSyxFQUFWLEVBQWNDLFdBQVcsSUFBSSxrQkFBZixDQUFkLEtBQ0EsSUFBSUQsQ0FBQyxLQUFLLEVBQVYsRUFBY0MsV0FBVyxJQUFJLGtCQUFmLENBQWQsS0FDQSxJQUFJRCxDQUFDLEtBQUssRUFBVixFQUFjQyxXQUFXLElBQUksbUJBQWY7QUFFbkJGLE1BQUFBLE9BQU8sQ0FBQ0csSUFBUixDQUFhO0FBQ1RsTSxRQUFBQSxLQUFLLEVBQUVnTSxDQUFDLENBQUNuSSxRQUFGLEVBREU7QUFFVHRKLFFBQUFBLElBQUksRUFBRTBSO0FBRkcsT0FBYjtBQUlIOztBQUNELFdBQU9GLE9BQVA7QUFDSCxHQS84Q1k7O0FBaTlDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJakgsRUFBQUEscUJBcjlDYSxtQ0FxOUNXO0FBQ3BCO0FBQ0EsV0FBTyxDQUNIO0FBQUM5RSxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjekYsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBREcsRUFFSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUZHLEVBR0g7QUFBQ3lGLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWN6RixNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FIRyxFQUlIO0FBQUN5RixNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjekYsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBSkcsRUFLSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUxHLEVBTUg7QUFBQ3lGLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWN6RixNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FORyxFQU9IO0FBQUN5RixNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjekYsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBUEcsRUFRSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVJHLEVBU0g7QUFBQ3lGLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWN6RixNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FURyxFQVVIO0FBQUN5RixNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjekYsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBVkcsRUFXSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVhHLEVBWUg7QUFBQ3lGLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWN6RixNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FaRyxFQWFIO0FBQUN5RixNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjekYsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBYkcsRUFjSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWRHLEVBZUg7QUFBQ3lGLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWN6RixNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FmRyxFQWdCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWhCRyxFQWlCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWpCRyxFQWtCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWxCRyxFQW1CSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQW5CRyxFQW9CSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXBCRyxFQXFCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXJCRyxFQXNCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXRCRyxFQXVCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3pGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXZCRyxFQXdCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXhCRyxFQXlCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXpCRyxFQTBCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTFCRyxFQTJCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTNCRyxFQTRCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTVCRyxFQTZCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTdCRyxFQThCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTlCRyxFQStCSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQS9CRyxFQWdDSDtBQUFDeUYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXpGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQWhDRyxFQWlD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VSxvQkFBVixFQUFnQ25DLEdBQWhDLEVBTkw7QUFPUnVWLFFBQUFBLFFBQVEsRUFBRWxXLEtBQUssR0FBRztBQVBWLE9BQVo7QUFTSCxLQWZEO0FBZ0JBLFdBQU9pVCxNQUFQO0FBQ0g7QUFoVXVCLENBQTVCO0FBbVVBO0FBQ0E7QUFDQTs7QUFDQWpZLENBQUMsQ0FBQ29ZLFFBQUQsQ0FBRCxDQUFZK0MsS0FBWixDQUFrQixZQUFNO0FBQ3BCcmIsRUFBQUEsUUFBUSxDQUFDcUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBcHBseSBJUCBtYXNrIGZvciBleHRlcm5hbCBJUCBhZGRyZXNzIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiBpbiBEb2NrZXIgKG1hbmFnZWQgdmlhIGRvLW5vdC1zaG93LWlmLWRvY2tlciBjbGFzcylcbiAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuaXApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubndfRXJyb3JHZXR0aW5nRXh0ZXJuYWxJcCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmRhdGEuaXAgKyBwb3J0O1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIFVwZGF0ZXMgYm90aCBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZU5BVEhlbHBUZXh0KHBvcnRzKSB7XG4gICAgICAgIC8vIFdIWTogUG9ydCBrZXlzIG1hdGNoIFBieFNldHRpbmdzIGNvbnN0YW50cyAoU0lQUG9ydCwgVExTX1BPUlQsIFJUUFBvcnRGcm9tLCBSVFBQb3J0VG8pXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBQb3J0IHx8ICFwb3J0cy5UTFNfUE9SVCB8fCAhcG9ydHMuUlRQUG9ydEZyb20gfHwgIXBvcnRzLlJUUFBvcnRUbykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkcnRwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1ydHAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkcnRwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBydHBUZXh0ID0gaTE4bignbndfTkFUSW5mbzQnLCB7XG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX0ZST00nOiBwb3J0cy5SVFBQb3J0RnJvbSxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiBwb3J0cy5SVFBQb3J0VG9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBTSVAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzID0gJCgnI2R1YWwtc3RhY2stc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMuaHRtbChkdWFsU3RhY2tTaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBSVFAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzID0gJCgnI2R1YWwtc3RhY2stcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrUnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrUnRwVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgZmllbGQgbGFiZWxzIHdpdGggYWN0dWFsIGludGVybmFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIFdIWTogUG9ydCBrZXlzIG1hdGNoIFBieFNldHRpbmdzIGNvbnN0YW50cyAoU0lQUG9ydCwgVExTX1BPUlQpXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBQb3J0IHx8ICFwb3J0cy5UTFNfUE9SVCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24gLSBleHRlcm5hbCBUTFMgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkdGxzTGFiZWwgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCR0bHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0bHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICR0bHNMYWJlbC50ZXh0KHRsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcExhYmVsID0gJCgnI2R1YWwtc3RhY2stc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tTaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NpcExhYmVsLnRleHQoZHVhbFN0YWNrU2lwTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBUTFMgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrVGxzTGFiZWwgPSAkKCcjZHVhbC1zdGFjay10bHMtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1Rsc0xhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1Rsc0xhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1RMU1BvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1Rsc0xhYmVsLnRleHQoZHVhbFN0YWNrVGxzTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHZpc2liaWxpdHkgb2YgSVAgYWRkcmVzcyBmaWVsZHMgYmFzZWQgb24gSVB2NCBtb2RlIGRyb3Bkb3duIHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgY29uc3QgJGlwdjRNb2RlRHJvcGRvd24gPSAkKGAjaXB2NF9tb2RlXyR7ZXRofS1kcm9wZG93bmApO1xuICAgICAgICAgICAgY29uc3QgaXB2NE1vZGUgPSAkaXB2NE1vZGVEcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gaXB2NE1vZGUgPT09ICcxJztcblxuICAgICAgICAgICAgLy8gRmluZCBJUCBhZGRyZXNzIGFuZCBzdWJuZXQgZmllbGRzIGdyb3VwXG4gICAgICAgICAgICBjb25zdCAkaXBBZGRyZXNzR3JvdXAgPSAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKTtcbiAgICAgICAgICAgIGNvbnN0ICRnYXRld2F5RmllbGQgPSAkKGAuaXB2NC1nYXRld2F5LWZpZWxkLSR7ZXRofWApO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BJbmZvTWVzc2FnZSA9ICQoYC5kaGNwLWluZm8tbWVzc2FnZS0ke2V0aH1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyB0aGUgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gJChgaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkYCkudmFsKCkgPT09IGV0aDtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gaGlkZSBJUC9zdWJuZXQgZmllbGRzIGdyb3VwIGFuZCBnYXRld2F5IGZpZWxkLCBzaG93IERIQ1AgaW5mb1xuICAgICAgICAgICAgICAgICRpcEFkZHJlc3NHcm91cC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gc2hvdyBJUC9zdWJuZXQgZmllbGRzIGdyb3VwLCBoaWRlIERIQ1AgaW5mb1xuICAgICAgICAgICAgICAgICRpcEFkZHJlc3NHcm91cC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBnYXRld2F5IGZpZWxkIE9OTFkgaWYgdGhpcyBpcyB0aGUgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgaWYgKGlzSW50ZXJuZXRJbnRlcmZhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZS9zaG93IE5BVCBzZWN0aW9ucyBpbnN0ZWFkIG9mIGRpc2FibGluZyB0byBzaW1wbGlmeSBVSVxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgIC8vIEFmdGVyIHNob3dpbmcgYWxsIHNlY3Rpb25zLCBkZXRlcm1pbmUgd2hpY2ggb25lIHRvIGFjdHVhbGx5IGRpc3BsYXlcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHZpc2liaWxpdHkgb2YgSVB2NiBtYW51YWwgY29uZmlndXJhdGlvbiBmaWVsZHMgYmFzZWQgb24gc2VsZWN0ZWQgbW9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcmZhY2VJZCAtIEludGVyZmFjZSBJRFxuICAgICAqL1xuICAgIHRvZ2dsZUlQdjZGaWVsZHMoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgY29uc3QgJGlwdjZNb2RlRHJvcGRvd24gPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJGlwdjZNb2RlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIGNvbnN0ICRtYW51YWxGaWVsZHNDb250YWluZXIgPSAkKGAuaXB2Ni1tYW51YWwtZmllbGRzLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRhdXRvSW5mb01lc3NhZ2UgPSAkKGAuaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkaXB2NkludGVybmV0U2V0dGluZ3MgPSAkKGAuaXB2Ni1pbnRlcm5ldC1zZXR0aW5ncy0ke2ludGVyZmFjZUlkfWApO1xuXG4gICAgICAgIC8vIFNob3cgbWFudWFsIGZpZWxkcyBvbmx5IHdoZW4gbW9kZSBpcyAnMicgKE1hbnVhbClcbiAgICAgICAgaWYgKGlwdjZNb2RlID09PSAnMicpIHtcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuc2hvdygpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NkludGVybmV0U2V0dGluZ3Muc2hvdygpO1xuICAgICAgICB9IGVsc2UgaWYgKGlwdjZNb2RlID09PSAnMScpIHtcbiAgICAgICAgICAgIC8vIFNob3cgQXV0byAoU0xBQUMvREhDUHY2KSBpbmZvIG1lc3NhZ2Ugd2hlbiBtb2RlIGlzICcxJyAoQXV0bylcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NkludGVybmV0U2V0dGluZ3Muc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBhbGwgSVB2NiBmaWVsZHMgZm9yIG1vZGUgJzAnIChPZmYpXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgbW9kZSBjaGFuZ2VzXG4gICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGR1YWwtc3RhY2sgbW9kZSBpcyBhY3RpdmUgKElQdjQgKyBJUHY2IHB1YmxpYyBhZGRyZXNzIGJvdGggY29uZmlndXJlZClcbiAgICAgKiBEdWFsLXN0YWNrIE5BVCBzZWN0aW9uIGlzIHNob3duIHdoZW4gYm90aCBJUHY0IGFuZCBwdWJsaWMgSVB2NiBhcmUgcHJlc2VudC5cbiAgICAgKiBQdWJsaWMgSVB2NiA9IEdsb2JhbCBVbmljYXN0IGFkZHJlc3NlcyAoMjAwMDo6LzMpIHRoYXQgc3RhcnQgd2l0aCAyIG9yIDMuXG4gICAgICogUHJpdmF0ZSBJUHY2IGFkZHJlc3NlcyAoVUxBIGZkMDA6Oi84LCBsaW5rLWxvY2FsIGZlODA6Oi8xMCkgZG8gTk9UIHRyaWdnZXIgZHVhbC1zdGFjay5cbiAgICAgKlxuICAgICAqIElQdjQgZGV0ZWN0aW9uIHdvcmtzIGZvciBib3RoIHN0YXRpYyBhbmQgREhDUCBjb25maWd1cmF0aW9uczpcbiAgICAgKiAtIFN0YXRpYzogY2hlY2tzIGlwYWRkcl9YIGZpZWxkXG4gICAgICogLSBESENQOiBjaGVja3MgaWYgREhDUCBpcyBlbmFibGVkIEFORCBnYXRld2F5IGlzIG9idGFpbmVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBkdWFsLXN0YWNrIHdpdGggcHVibGljIElQdjYsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGlzRHVhbFN0YWNrTW9kZShpbnRlcmZhY2VJZCkge1xuICAgICAgICAvLyBHZXQgSVB2NCBjb25maWd1cmF0aW9uIChzdGF0aWMgb3IgREhDUClcbiAgICAgICAgY29uc3QgaXB2NGFkZHIgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuICAgICAgICBjb25zdCBkaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3gubGVuZ3RoID4gMCAmJiAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGNvbnN0IGdhdGV3YXkgPSAkKGBpbnB1dFtuYW1lPVwiZ2F0ZXdheV8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuXG4gICAgICAgIC8vIEdldCBJUHY2IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgaXB2Nk1vZGUgPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIC8vIEZvciBNYW51YWwgbW9kZSB1c2UgZm9ybSBmaWVsZCwgZm9yIEF1dG8gbW9kZSB1c2UgY3VycmVudCAoYXV0b2NvbmZpZ3VyZWQpIHZhbHVlIGZyb20gaGlkZGVuIGZpZWxkXG4gICAgICAgIGNvbnN0IGlwdjZhZGRyTWFudWFsID0gJChgaW5wdXRbbmFtZT1cImlwdjZhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyQXV0byA9ICQoYCNjdXJyZW50LWlwdjZhZGRyLSR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyID0gaXB2Nk1vZGUgPT09ICcxJyA/IGlwdjZhZGRyQXV0byA6IGlwdjZhZGRyTWFudWFsO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjQgaXMgcHJlc2VudCAoZWl0aGVyIHN0YXRpYyBhZGRyZXNzIG9yIERIQ1Agd2l0aCBnYXRld2F5KVxuICAgICAgICAvLyBHYXRld2F5IHByZXNlbmNlIGluZGljYXRlcyBESENQIHN1Y2Nlc3NmdWxseSBvYnRhaW5lZCBhbiBJUHY0IGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NCA9IChpcHY0YWRkciAmJiBpcHY0YWRkci50cmltKCkgIT09ICcnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGRoY3BFbmFibGVkICYmIGdhdGV3YXkgJiYgZ2F0ZXdheS50cmltKCkgIT09ICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY2IGlzIGVuYWJsZWQgKEF1dG8gU0xBQUMvREhDUHY2IG9yIE1hbnVhbClcbiAgICAgICAgLy8gRm9yIEF1dG8gbW9kZSAoJzEnKSwgd2UgY2hlY2sgY3VycmVudElwdjZhZGRyIHdoaWNoIHNob3dzIGF1dG9jb25maWd1cmVkIGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NiA9IChpcHY2TW9kZSA9PT0gJzEnIHx8IGlwdjZNb2RlID09PSAnMicpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBpcHY2YWRkciAmJiBpcHY2YWRkci50cmltKCkgIT09ICcnICYmIGlwdjZhZGRyICE9PSAnQXV0b2NvbmZpZ3VyZWQnO1xuXG4gICAgICAgIGlmICghaGFzSXB2NCB8fCAhaGFzSXB2Nikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBhZGRyZXNzIGlzIGdsb2JhbCB1bmljYXN0IChwdWJsaWMpXG4gICAgICAgIC8vIEdsb2JhbCB1bmljYXN0OiAyMDAwOjovMyAoYWRkcmVzc2VzIHN0YXJ0aW5nIHdpdGggMiBvciAzKVxuICAgICAgICAvLyBFeGNsdWRlIFVMQSAoZmQwMDo6LzgpIGFuZCBsaW5rLWxvY2FsIChmZTgwOjovMTApXG4gICAgICAgIGNvbnN0IGlwdjZMb3dlciA9IGlwdjZhZGRyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgICAgIC8vIFJlbW92ZSBDSURSIG5vdGF0aW9uIGlmIHByZXNlbnQgKGUuZy4sIFwiMjAwMTpkYjg6OjEvNjRcIiAtPiBcIjIwMDE6ZGI4OjoxXCIpXG4gICAgICAgIGNvbnN0IGlwdjZXaXRob3V0Q2lkciA9IGlwdjZMb3dlci5zcGxpdCgnLycpWzBdO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZpcnN0IGNoYXJhY3RlciBpcyAyIG9yIDMgKGdsb2JhbCB1bmljYXN0IHJhbmdlKVxuICAgICAgICBjb25zdCBpc0dsb2JhbFVuaWNhc3QgPSAvXlsyM10vLnRlc3QoaXB2NldpdGhvdXRDaWRyKTtcblxuICAgICAgICByZXR1cm4gaXNHbG9iYWxVbmljYXN0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIHNlY3Rpb24gVUkgYmFzZWQgb24gZHVhbC1zdGFjayBkZXRlY3Rpb25cbiAgICAgKiBTd2l0Y2hlcyBiZXR3ZWVuIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBNYWtlcyBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrIG1vZGVcbiAgICAgKi9cbiAgICB1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgTkFUIGlzIGVuYWJsZWQgLSBpZiBub3QsIGRvbid0IHNob3cgYW55IE5BVCBzZWN0aW9uc1xuICAgICAgICBjb25zdCBpc05hdEVuYWJsZWQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCFpc05hdEVuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gTkFUIGRpc2FibGVkLCBzZWN0aW9ucyBhbHJlYWR5IGhpZGRlbiBieSB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3NcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGFueSBpbnRlcmZhY2UgaXMgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICAgIGxldCBhbnlEdWFsU3RhY2sgPSBmYWxzZTtcblxuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkKHRhYikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3Jrcy5pc0R1YWxTdGFja01vZGUoaW50ZXJmYWNlSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55RHVhbFN0YWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEJyZWFrIGxvb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgJHN0YW5kYXJkTmF0U2VjdGlvbiA9ICQoJyNzdGFuZGFyZC1uYXQtc2VjdGlvbicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2VjdGlvbiA9ICQoJyNkdWFsLXN0YWNrLXNlY3Rpb24nKTtcblxuICAgICAgICAvLyBHZXQgdGhlIGV4dGhvc3RuYW1lIGlucHV0IGVsZW1lbnQgYW5kIGl0cyBvcmlnaW5hbCBwYXJlbnRcbiAgICAgICAgY29uc3QgJGV4dGhvc3RuYW1lSW5wdXQgPSAkKCcjZXh0aG9zdG5hbWUnKTtcbiAgICAgICAgY29uc3QgJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyID0gJHN0YW5kYXJkTmF0U2VjdGlvbi5maW5kKCcubWF4LXdpZHRoLTUwMCcpLmhhcygnI2V4dGhvc3RuYW1lJykuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciA9ICQoJyNleHRob3N0bmFtZS1kdWFsLXN0YWNrLWlucHV0LXdyYXBwZXInKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHBvcnQgaW5wdXQgZWxlbWVudHMgYW5kIHRoZWlyIHdyYXBwZXJzXG4gICAgICAgIGNvbnN0ICRleHRlcm5hbFNpcFBvcnRJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJleHRlcm5hbFNJUFBvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJGV4dGVybmFsVGxzUG9ydElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImV4dGVybmFsVExTUG9ydFwiXScpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRTaXBQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1zdGFuZGFyZC13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LXN0YW5kYXJkLXdyYXBwZXInKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWR1YWwtc3RhY2std3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtZHVhbC1zdGFjay13cmFwcGVyJyk7XG5cbiAgICAgICAgaWYgKGFueUR1YWxTdGFjaykge1xuICAgICAgICAgICAgLy8gRHVhbC1zdGFjayBkZXRlY3RlZDogSGlkZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiwgc2hvdyBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgICAgICAgICRzdGFuZGFyZE5hdFNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGV4dGhvc3RuYW1lIGlucHV0IHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0aG9zdG5hbWVJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb3ZlIHBvcnQgaW5wdXRzIHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxTaXBQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFNpcFBvcnRJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRleHRlcm5hbFRsc1BvcnRJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsVGxzUG9ydElucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGlwYWRkciAoZXh0ZXJuYWwgSVAgbm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrLCBvbmx5IGhvc3RuYW1lKVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsICcnKTtcblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBhdXRvVXBkYXRlRXh0ZXJuYWxJcCAobm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaG9zdG5hbWUgZGlzcGxheSBpbiBkdWFsLXN0YWNrIGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgaG9zdG5hbWUgPSAkZXh0aG9zdG5hbWVJbnB1dC52YWwoKSB8fCAnbWlrb3BieC5jb21wYW55LmNvbSc7XG4gICAgICAgICAgICAkKCcjaG9zdG5hbWUtZGlzcGxheScpLnRleHQoaG9zdG5hbWUpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIGV4dGhvc3RuYW1lIHJlcXVpcmVkIGluIGR1YWwtc3RhY2tcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUucnVsZXMgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dGVybmFsSG9zdG5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGR1YWwtc3RhY2s6IFNob3cgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIGhpZGUgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBleHRob3N0bmFtZSBpbnB1dCBiYWNrIHRvIHN0YW5kYXJkIHNlY3Rpb25cbiAgICAgICAgICAgIGlmICgkZXh0aG9zdG5hbWVJbnB1dC5sZW5ndGggPiAwICYmICRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGhvc3RuYW1lSW5wdXQuYXBwZW5kVG8oJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW92ZSBwb3J0IGlucHV0cyBiYWNrIHRvIHN0YW5kYXJkIHNlY3Rpb25cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxTaXBQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRTaXBQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsU2lwUG9ydElucHV0LmFwcGVuZFRvKCRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxUbHNQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRUbHNQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsVGxzUG9ydElucHV0LmFwcGVuZFRvKCRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBleHRob3N0bmFtZSB2YWxpZGF0aW9uIChvcHRpb25hbCB3aXRoIHVzZW5hdCBkZXBlbmRlbmN5KVxuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5kZXBlbmRzID0gJ3VzZW5hdCc7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdkZXN0cm95JykuZm9ybSh7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgZmllbGRzOiBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHMgKHNraXAgcmVhZG9ubHkgZmllbGRzIHRvIHByZXZlbnQgb3ZlcndyaXRpbmcgREhDUC1wcm92aWRlZCB2YWx1ZXMpXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwiaGlkZGVuXCJdLCBpbnB1dFt0eXBlPVwibnVtYmVyXCJdLCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAvLyBTa2lwIHJlYWRvbmx5IGZpZWxkcyAtIHRoZXkgY29udGFpbiBjdXJyZW50IERIQ1AvQXV0byB2YWx1ZXMgYW5kIHNob3VsZCBub3QgYmUgc2F2ZWRcbiAgICAgICAgICAgIGlmIChuYW1lICYmICEkaW5wdXQucHJvcCgncmVhZG9ubHknKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0IGRyb3Bkb3duc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJHNlbGVjdC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHNlbGVjdC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuXG4gICAgICAgIC8vIFBieEFwaUNsaWVudCB3aWxsIGhhbmRsZSBjb252ZXJzaW9uIHRvIHN0cmluZ3MgZm9yIGpRdWVyeVxuICAgICAgICByZXN1bHQuZGF0YS51c2VuYXQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBVc2UgY29ycmVjdCBmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0gKGF1dG9VcGRhdGVFeHRlcm5hbElwLCBub3QgQVVUT19VUERBVEVfRVhURVJOQUxfSVApXG4gICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlRGl2ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgaWYgKCRhdXRvVXBkYXRlRGl2Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gJGF1dG9VcGRhdGVEaXYuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb252ZXJ0IElQdjQgbW9kZSBkcm9wZG93biB2YWx1ZXMgdG8gREhDUCBib29sZWFuIGZvciBSRVNUIEFQSSBjb21wYXRpYmlsaXR5XG4gICAgICAgIC8vIFdIWTogVUkgdXNlcyBkcm9wZG93biB3aXRoIHZhbHVlcyAwPU1hbnVhbCwgMT1ESENQIGJ1dCBSRVNUIEFQSSBleHBlY3RzIGRoY3BfJHtpZH0gYm9vbGVhblxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVNYXRjaCA9IGtleS5tYXRjaCgvXmlwdjRfbW9kZV8oXFxkKykkLyk7XG4gICAgICAgICAgICBpZiAoaXB2NE1vZGVNYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gaXB2NE1vZGVNYXRjaFsxXTtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzdWx0LmRhdGFba2V5XTtcblxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgZHJvcGRvd24gdmFsdWUgdG8gYm9vbGVhbjogJzEnID0gREhDUCBlbmFibGVkLCAnMCcgPSBNYW51YWwgKERIQ1AgZGlzYWJsZWQpXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtpbnRlcmZhY2VJZH1gXSA9IG1vZGUgPT09ICcxJztcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBpcHY0X21vZGVfJHtpZH0ga2V5IGFzIGl0J3Mgbm90IG5lZWRlZCBieSBSRVNUIEFQSVxuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdIWTogTm8gcG9ydCBmaWVsZCBtYXBwaW5nIG5lZWRlZCAtIGZvcm0gZmllbGQgbmFtZXMgbWF0Y2ggQVBJIGNvbnN0YW50c1xuICAgICAgICAvLyAoZXh0ZXJuYWxTSVBQb3J0ID0gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUKVxuXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IElQdjYgc3VibmV0IGZvciBBdXRvIG1vZGUgKFNMQUFDL0RIQ1B2NilcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlTWF0Y2ggPSBrZXkubWF0Y2goL15pcHY2X21vZGVfKFxcZCspJC8pO1xuICAgICAgICAgICAgaWYgKGlwdjZNb2RlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9IGlwdjZNb2RlTWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3VibmV0S2V5ID0gYGlwdjZfc3VibmV0XyR7aW50ZXJmYWNlSWR9YDtcblxuICAgICAgICAgICAgICAgIC8vIElmIG1vZGUgaXMgQXV0byAoJzEnKSBhbmQgc3VibmV0IGlzIGVtcHR5LCBzZXQgZGVmYXVsdCB0byAnNjQnXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICcxJyAmJiAoIXJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gfHwgcmVzdWx0LmRhdGFbc3VibmV0S2V5XSA9PT0gJycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPSAnNjQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3luY2hyb25pemUgZ2xvYmFsIGhvc3RuYW1lIHRvIGFsbCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIFdIWTogU2luZ2xlIGhvc3RuYW1lIGZpZWxkIGZvciBhbGwgaW50ZXJmYWNlcywgYnV0IFJFU1QgQVBJIGV4cGVjdHMgaG9zdG5hbWVfJHtpZH0gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIGNvbnN0IGdsb2JhbEhvc3RuYW1lID0gJCgnI2dsb2JhbC1ob3N0bmFtZScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkKHRhYikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhW2Bob3N0bmFtZV8ke2ludGVyZmFjZUlkfWBdID0gZ2xvYmFsSG9zdG5hbWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBEb2NrZXIgbmV0d29yayBpbmZvIGFzIHJlYWQtb25seVxuICAgICAqIERFUFJFQ0FURUQ6IERvY2tlciBub3cgdXNlcyBzYW1lIGludGVyZmFjZSB0YWJzIGFzIHJlZ3VsYXIgaW5zdGFsbGF0aW9uXG4gICAgICovXG4gICAgc2hvd0RvY2tlck5ldHdvcmtJbmZvKGRhdGEpIHtcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBubyBsb25nZXIgdXNlZCAtIERvY2tlciB1c2VzIGNyZWF0ZUludGVyZmFjZVRhYnMgaW5zdGVhZFxuICAgICAgICBjb25zb2xlLndhcm4oJ3Nob3dEb2NrZXJOZXR3b3JrSW5mbyBpcyBkZXByZWNhdGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQ0lEUiBub3RhdGlvbiB0byBkb3R0ZWQgZGVjaW1hbCBuZXRtYXNrXG4gICAgICovXG4gICAgY2lkclRvTmV0bWFzayhjaWRyKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSB+KDIgKiogKDMyIC0gY2lkcikgLSAxKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIChtYXNrID4+PiAyNCkgJiAyNTUsXG4gICAgICAgICAgICAobWFzayA+Pj4gMTYpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDgpICYgMjU1LFxuICAgICAgICAgICAgbWFzayAmIDI1NVxuICAgICAgICBdLmpvaW4oJy4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEludGVyZmFjZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICAvLyBJbiBEb2NrZXIsIGRpc2FibGUgZGVsZXRlIGZvciBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gIWlzRG9ja2VyICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOIChub3QgZm9yIERvY2tlcilcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUgJiYgIWlzRG9ja2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY0IG1vZGUgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChJRD0wKVxuICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVPcHRpb25zID0gW1xuICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVNYW51YWx9LFxuICAgICAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVESENQfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpcHY0X21vZGVfMCcsIHsgaXB2NF9tb2RlXzA6ICcxJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2NE1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2NE1vZGUsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChJRD0wKVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd25zIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN1Ym5ldCB0byBzdHJpbmcgZm9yIGRyb3Bkb3duIG1hdGNoaW5nXG4gICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY0IG1vZGUgZHJvcGRvd24gKE1hbnVhbC9ESENQKSBmb3Igbm9uLURvY2tlciBlbnZpcm9ubWVudHNcbiAgICAgICAgICAgIGlmICghaWZhY2UuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZUZpZWxkTmFtZSA9IGBpcHY0X21vZGVfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlRm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAvLyBXSFk6IGlmYWNlLmRoY3AgY2FuIGJlIGJvb2xlYW4gKGZyb20gUkVTVCBBUEkpIG9yIHN0cmluZyAoZnJvbSBmb3JtKVxuICAgICAgICAgICAgICAgIGlwdjRNb2RlRm9ybURhdGFbaXB2NE1vZGVGaWVsZE5hbWVdID0gKGlmYWNlLmRoY3AgPT09ICcxJyB8fCBpZmFjZS5kaGNwID09PSB0cnVlKSA/ICcxJyA6ICcwJztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY0TW9kZU1hbnVhbH0sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVESENQfVxuICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oaXB2NE1vZGVGaWVsZE5hbWUsIGlwdjRNb2RlRm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2NE1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjRNb2RlLFxuICAgICAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBtb2RlIGRyb3Bkb3duIChPZmYvQXV0by9NYW51YWwpXG4gICAgICAgICAgICAvLyBGb3IgVkxBTiBpbnRlcmZhY2VzOiBvbmx5IE9mZiBhbmQgTWFudWFsIG1vZGVzIChubyBESENQdjYgQXV0bylcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlRmllbGROYW1lID0gYGlwdjZfbW9kZV8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2TW9kZUZvcm1EYXRhW2lwdjZNb2RlRmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X21vZGUgfHwgJzAnKTtcblxuICAgICAgICAgICAgY29uc3QgaXNWbGFuID0gaWZhY2UudmxhbmlkICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlT3B0aW9ucyA9IGlzVmxhblxuICAgICAgICAgICAgICAgID8gW1xuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlT2ZmfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU1hbnVhbH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgOiBbXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVPZmZ9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlQXV0b30sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVNYW51YWx9XG4gICAgICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZNb2RlRmllbGROYW1lLCBpcHY2TW9kZUZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2Nk1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2Nk1vZGUsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY2IHN1Ym5ldCBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZpZWxkTmFtZSA9IGBpcHY2X3N1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2U3VibmV0Rm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIGlwdjZTdWJuZXRGb3JtRGF0YVtpcHY2U3VibmV0RmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZTdWJuZXRGaWVsZE5hbWUsIGlwdjZTdWJuZXRGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZTdWJuZXQsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ11cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTZXQgaW5pdGlhbCB2aXNpYmlsaXR5IG9mIElQdjYgbWFudWFsIGZpZWxkc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSVB2NCBtb2RlIGRyb3Bkb3ducyBub3cgaW5pdGlhbGl6ZWQgdmlhIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgaW4gZm9yRWFjaCBsb29wIChsaW5lIH44NDApXG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBZGQgVkxBTiBJRCBjaGFuZ2UgaGFuZGxlcnMgdG8gY29udHJvbCBESENQIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLm9mZignaW5wdXQgY2hhbmdlJykub24oJ2lucHV0IGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHZsYW5JbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICR2bGFuSW5wdXQuYXR0cignbmFtZScpLnJlcGxhY2UoJ3ZsYW5pZF8nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCB2bGFuVmFsdWUgPSBwYXJzZUludCgkdmxhbklucHV0LnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuXG4gICAgICAgICAgICBpZiAodmxhblZhbHVlID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgREhDUCBjaGVja2JveCBmb3IgVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBESENQIGNoZWNrYm94IGZvciBub24tVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZW5hYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNhYmxlZCBmaWVsZCBjbGFzc2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgaGFuZGxlciBmb3IgZXhpc3RpbmcgVkxBTiBpbnRlcmZhY2VzIHRvIGFwcGx5IGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gQWRkIElQdjYgYWRkcmVzcyBjaGFuZ2UgaGFuZGxlcnMgdG8gdXBkYXRlIGR1YWwtc3RhY2sgTkFUIGxvZ2ljXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwiaXB2NmFkZHJfXCJdJykub2ZmKCdpbnB1dCBibHVyJykub24oJ2lucHV0IGJsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgYWRkcmVzcyBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgSVB2NCBhZGRyZXNzIGNoYW5nZSBoYW5kbGVycyB0byB1cGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWNcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJpcGFkZHJfXCJdJykub2ZmKCdpbnB1dCBibHVyJykub24oJ2lucHV0IGJsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjQgYWRkcmVzcyBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBHYXRld2F5IGZpZWxkIHZpc2liaWxpdHkgZm9yIGFsbCBpbnRlcmZhY2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIERIQ1AgaW5mbyBtZXNzYWdlIHZpc2liaWxpdHkgd2hlbiBJUHY0IG1vZGUgY2hhbmdlc1xuICAgICAgICAkKCcuaXB2NC1tb2RlLWRyb3Bkb3duJykub2ZmKCdjaGFuZ2UuZG5zZ2F0ZXdheScpLm9uKCdjaGFuZ2UuZG5zZ2F0ZXdheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGRyb3Bkb3duLmF0dHIoJ2lkJykucmVwbGFjZSgnaXB2NC1tb2RlLScsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlID0gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSBpcHY0TW9kZSA9PT0gJzEnO1xuXG4gICAgICAgICAgICAvLyBGaW5kIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkZGhjcEluZm9NZXNzYWdlID0gJChgLmRoY3AtaW5mby1tZXNzYWdlLSR7aW50ZXJmYWNlSWR9YCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IHNob3cgREhDUCBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBoaWRlIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBJUCBhZGRyZXNzIGdyb3VwIHZpc2liaWxpdHkgKGhpZGUgd2hlbiBESENQIG9uLCBzaG93IHdoZW4gb2ZmKVxuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjQgbW9kZSBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpZmFjZSAtIEludGVyZmFjZSBkYXRhXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0FjdGl2ZSAtIFdoZXRoZXIgdGhpcyB0YWIgaXMgYWN0aXZlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlbGV0ZUJ1dHRvbiAtIEhUTUwgZm9yIGRlbGV0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlciBlbnZpcm9ubWVudFxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlWaXNpYmxlID0gaXNJbnRlcm5ldEludGVyZmFjZSA/ICcnIDogJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJztcblxuICAgICAgICAvLyBSZWFkb25seS9QbGFjZWhvbGRlciBsb2dpYyBmb3IgREhDUC1jb250cm9sbGVkIGZpZWxkc1xuICAgICAgICBjb25zdCBkaGNwRGlzYWJsZWQgPSBpc0RvY2tlciB8fCBpZmFjZS52bGFuaWQgPiAwO1xuICAgICAgICBjb25zdCBkaGNwQ2hlY2tlZCA9IGlzRG9ja2VyIHx8IChpZmFjZS52bGFuaWQgPiAwID8gZmFsc2UgOiBpZmFjZS5kaGNwKTtcblxuICAgICAgICAvLyBJUHY0IHBsYWNlaG9sZGVycyB3aGVuIERIQ1AgZW5hYmxlZFxuICAgICAgICBjb25zdCBob3N0bmFtZVBsYWNlaG9sZGVyID0gZGhjcENoZWNrZWQgPyBnbG9iYWxUcmFuc2xhdGUubndfUGxhY2Vob2xkZXJEaGNwSG9zdG5hbWUgOiAnbWlrb3BieCc7XG4gICAgICAgIGNvbnN0IHByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRucyB8fCBpZmFjZS5wcmltYXJ5ZG5zIHx8ICc4LjguOC44J31gIDogJzguOC44LjgnO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnOC44LjQuNCd9YCA6ICc4LjguNC40JztcblxuICAgICAgICAvLyBJUHY2IEROUyBwbGFjZWhvbGRlcnMgKGFsd2F5cyBlZGl0YWJsZSlcbiAgICAgICAgY29uc3QgaXB2NlByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG4gICAgICAgIGNvbnN0IGlwdjZTZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDwhLS0gQ29tbW9uIFNldHRpbmdzIFNlY3Rpb24gKG91dHNpZGUgY29sdW1ucykgLS0+XG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/IGBcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgdmFsdWU9XCJvblwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJzI0J31cIiAvPlxuICAgICAgICAgICAgICAgIGAgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgIDwhLS0gVHdvIENvbHVtbiBHcmlkOiBJUHY0IChsZWZ0KSBhbmQgSVB2NiAocmlnaHQpIC0tPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIHN0YWNrYWJsZSBncmlkXCI+XG5cbiAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IENvbmZpZ3VyYXRpb24gQ29sdW1uIC0tPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3M9XCJ1aSBkaXZpZGluZyBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NENvbmZpZ3VyYXRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2g0PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2NF9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjRfbW9kZV8ke2lkfVwiIHZhbHVlPVwiJHtkaGNwQ2hlY2tlZCA/ICcxJyA6ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjQtZ2F0ZXdheS1maWVsZC0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtpc0ludGVybmV0SW50ZXJmYWNlICYmICFkaGNwQ2hlY2tlZCA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiMTkyLjE2OC4xLjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IEludGVybmV0IFNldHRpbmdzIChvbmx5IGlmIEludGVybmV0IGludGVyZmFjZSkgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2NC1pbnRlcm5ldC1zZXR0aW5ncy0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldElQdjR9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnMgfHwgaWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7cHJpbWFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7c2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhpZGRlbiBkaXZpZGVyXCI+PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkaGNwLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtkaGNwQ2hlY2tlZCAmJiAhaXNEb2NrZXIgPyAnYmxvY2snIDogJ25vbmUnfTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0hlYWRlcn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0lQfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcGFkZHIgfHwgaWZhY2UuaXBhZGRyIHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvU3VibmV0fTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50U3VibmV0IHx8IGlmYWNlLnN1Ym5ldCB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0dhdGV3YXl9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudEdhdGV3YXkgfHwgaWZhY2UuZ2F0ZXdheSB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0ROU306IDxzdHJvbmc+JHtpZmFjZS5wcmltYXJ5ZG5zIHx8ICdOL0EnfSR7aWZhY2Uuc2Vjb25kYXJ5ZG5zID8gJywgJyArIGlmYWNlLnNlY29uZGFyeWRucyA6ICcnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpZmFjZS5kb21haW4gPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvRG9tYWlufTogPHN0cm9uZz4ke2lmYWNlLmRvbWFpbn08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG9ja2VyLWluZm8tbWVzc2FnZS0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RvY2tlcklQdjRJbmZvIHx8ICdDdXJyZW50IElQdjQgQ29uZmlndXJhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9JUH06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXBhZGRyIHx8IGlmYWNlLmlwYWRkciB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb1N1Ym5ldH06IDxzdHJvbmc+LyR7aWZhY2UuY3VycmVudFN1Ym5ldCB8fCBpZmFjZS5zdWJuZXQgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9HYXRld2F5fTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRHYXRld2F5IHx8IGlmYWNlLmdhdGV3YXkgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPjxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb2NrZXJJUHY0SW5mb05vdGUgfHwgJ05ldHdvcmsgc2V0dGluZ3MgYXJlIG1hbmFnZWQgYnkgRG9ja2VyIHJ1bnRpbWUuIE9ubHkgRE5TIHNlcnZlcnMgY2FuIGJlIGNvbmZpZ3VyZWQuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDwhLS0gSVB2NiBDb25maWd1cmF0aW9uIENvbHVtbiAtLT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzPVwidWkgZGl2aWRpbmcgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ3b3JsZCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZDb25maWd1cmF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9oND5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjZfbW9kZV8ke2lkfVwiIG5hbWU9XCJpcHY2X21vZGVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9tb2RlIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gSGlkZGVuIGZpZWxkIHRvIHN0b3JlIGN1cnJlbnQgYXV0by1jb25maWd1cmVkIElQdjYgYWRkcmVzcyAtLT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJjdXJyZW50LWlwdjZhZGRyLSR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRJcHY2YWRkciB8fCAnJ31cIiAvPlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1tYW51YWwtZmllbGRzLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwiaXB2NmFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2NmFkZHIgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJmZDAwOjoxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U3VibmV0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2Nl9zdWJuZXRfJHtpZH1cIiBuYW1lPVwiaXB2Nl9zdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZHYXRld2F5fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNjAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cImlwdjZfZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X2dhdGV3YXkgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJmZTgwOjoxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY2IEludGVybmV0IFNldHRpbmdzIChvbmx5IGlmIEludGVybmV0IGludGVyZmFjZSkgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1pbnRlcm5ldC1zZXR0aW5ncy0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldElQdjZ9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1wcmltYXJ5ZG5zLWZpZWxkLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2UHJpbWFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczYgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIke2lwdjZQcmltYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZTZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiJHtpcHY2U2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhpZGRlbiBkaXZpZGVyXCI+PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LWF1dG8taW5mby1tZXNzYWdlLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiAke2lmYWNlLmlwdjZfbW9kZSA9PT0gJzEnID8gJ2Jsb2NrJyA6ICdub25lJ307XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvSGVhZGVyfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0FkZHJlc3N9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwdjZhZGRyIHx8IGlmYWNlLmlwdjZhZGRyIHx8ICdBdXRvY29uZmlndXJlZCd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvUHJlZml4fTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50SXB2Nl9zdWJuZXQgfHwgaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7KGlmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5KSA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvR2F0ZXdheX06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXB2Nl9nYXRld2F5IHx8IGlmYWNlLmlwdjZfZ2F0ZXdheX08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY0X21vZGVfJHtpZH1cIiBuYW1lPVwiaXB2NF9tb2RlXyR7aWR9XCIgdmFsdWU9XCIxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIElQdjYgc3VibmV0IHByZWZpeCBvcHRpb25zICgvMSB0byAvMTI4KVxuICAgICAqL1xuICAgIGdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXTtcbiAgICAgICAgLy8gR2VuZXJhdGUgLzEgdG8gLzEyOCAoY29tbW9uOiAvNjQsIC80OCwgLzU2LCAvMTI4KVxuICAgICAgICBmb3IgKGxldCBpID0gMTI4OyBpID49IDE7IGktLSkge1xuICAgICAgICAgICAgbGV0IGRlc2NyaXB0aW9uID0gYC8ke2l9YDtcbiAgICAgICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbnMgZm9yIGNvbW1vbiBwcmVmaXhlc1xuICAgICAgICAgICAgaWYgKGkgPT09IDEyOCkgZGVzY3JpcHRpb24gKz0gJyAoU2luZ2xlIGhvc3QpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDY0KSBkZXNjcmlwdGlvbiArPSAnIChTdGFuZGFyZCBzdWJuZXQpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDU2KSBkZXNjcmlwdGlvbiArPSAnIChTbWFsbCBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSA0OCkgZGVzY3JpcHRpb24gKz0gJyAoTGFyZ2UgbmV0d29yayknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gMzIpIGRlc2NyaXB0aW9uICs9ICcgKElTUCBhc3NpZ25tZW50KSc7XG5cbiAgICAgICAgICAgIG9wdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBkZXNjcmlwdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdWJuZXQgbWFzayBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJuZXQgbWFzayBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICAvLyBOZXR3b3JrIG1hc2tzIGZyb20gQ2lkcjo6Z2V0TmV0TWFza3MoKSAoa3Jzb3J0IFNPUlRfTlVNRVJJQylcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBjb25maWd1cmF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBXSFk6IEJvdGggRG9ja2VyIGFuZCBub24tRG9ja2VyIG5vdyB1c2UgaW50ZXJmYWNlIHRhYnNcbiAgICAgICAgLy8gRG9ja2VyIGhhcyByZXN0cmljdGlvbnM6IERIQ1AgbG9ja2VkLCBJUC9zdWJuZXQvVkxBTiByZWFkb25seSwgRE5TIGVkaXRhYmxlXG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSwgZGF0YS5pc0RvY2tlciB8fCBmYWxzZSk7XG5cbiAgICAgICAgLy8gUG9wdWxhdGUgZ2xvYmFsIGhvc3RuYW1lIGZyb20gZmlyc3QgaW50ZXJmYWNlIChzaW5nbGUgdmFsdWUgZm9yIGFsbCBpbnRlcmZhY2VzKVxuICAgICAgICBpZiAoZGF0YS5pbnRlcmZhY2VzICYmIGRhdGEuaW50ZXJmYWNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdEludGVyZmFjZSA9IGRhdGEuaW50ZXJmYWNlc1swXTtcbiAgICAgICAgICAgIGNvbnN0IGhvc3RuYW1lID0gZmlyc3RJbnRlcmZhY2UuY3VycmVudEhvc3RuYW1lIHx8IGZpcnN0SW50ZXJmYWNlLmhvc3RuYW1lIHx8ICcnO1xuICAgICAgICAgICAgJCgnI2dsb2JhbC1ob3N0bmFtZScpLnZhbChob3N0bmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gV0hZOiBObyBtYXBwaW5nIG5lZWRlZCAtIEFQSSByZXR1cm5zIGtleXMgbWF0Y2hpbmcgZm9ybSBmaWVsZCBuYW1lc1xuICAgICAgICAgICAgLy8gKGUuZy4sICdleHRlcm5hbFNJUFBvcnQnIGZyb20gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUIGNvbnN0YW50KVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wb3J0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YS5wb3J0c1trZXldO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVB2NiBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwdjZhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgLy8gSVB2NiByZWdleCBwYXR0ZXJuXG4gICAgLy8gU3VwcG9ydHMgZnVsbCBmb3JtLCBjb21wcmVzc2VkIGZvcm0gKDo6KSwgSVB2NC1tYXBwZWQgKDo6ZmZmZjoxOTIuMC4yLjEpLCBsaW5rLWxvY2FsIChmZTgwOjoxJWV0aDApXG4gICAgY29uc3QgaXB2NlBhdHRlcm4gPSAvXigoWzAtOWEtZkEtRl17MSw0fTopezd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKSkkLztcbiAgICByZXR1cm4gaXB2NlBhdHRlcm4udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyAoSVB2NCBvciBJUHY2KS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyZXNzID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIodmFsdWUpIHx8ICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkcih2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZXh0aXBhZGRyIChpbnB1dG1hc2sgbWF5IHJldHVybiBcIl8uXy5fLl9cIiBmb3IgZW1wdHkpXG4gICAgICAgIGNvbnN0IGV4dGlwYWRkciA9IG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IGV4dGhvc3RuYW1lID0gKGFsbFZhbHVlcy5leHRob3N0bmFtZSB8fCAnJykudHJpbSgpO1xuICAgICAgICBpZiAoZXh0aG9zdG5hbWUgPT09ICcnICYmIGV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICAkdGFibGVDb250YWluZXI6IG51bGwsXG4gICAgJGVtcHR5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWNoZSBlbGVtZW50c1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFNob3cvaGlkZSBzZWN0aW9uIGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVyZmFjZUNvdW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykubm90KCdbZGF0YS10YWI9XCIwXCJdJykubGVuZ3RoO1xuICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYSByb3V0ZSByb3cgKGNyZWF0ZSBkdXBsaWNhdGUpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRzb3VyY2VSb3cgLSBTb3VyY2Ugcm93IHRvIGNvcHlcbiAgICAgKi9cbiAgICBjb3B5Um91dGUoJHNvdXJjZVJvdykge1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gJHNvdXJjZVJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAvLyBDb2xsZWN0IGRhdGEgZnJvbSBzb3VyY2Ugcm93XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YSA9IHtcbiAgICAgICAgICAgIG5ldHdvcms6ICRzb3VyY2VSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgIGdhdGV3YXk6ICRzb3VyY2VSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkc291cmNlUm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIG5ldyByb3V0ZSB3aXRoIGNvcGllZCBkYXRhXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGVEYXRhKTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGVtcHR5IHN0YXRlIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB1cGRhdGVFbXB0eVN0YXRlKCkge1xuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXIsIGhpZGUgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZW1wdHkgcGxhY2Vob2xkZXIsIHNob3cgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlRGF0YSAtIFJvdXRlIGRhdGEgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGFkZFJvdXRlKHJvdXRlRGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLnJvdXRlLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHJvdXRlRGF0YT8uaWQgfHwgYG5ld18ke0RhdGUubm93KCl9YDtcblxuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JvdXRlLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JvdXRlLXJvdycpXG4gICAgICAgICAgICAuYXR0cignZGF0YS1yb3V0ZS1pZCcsIHJvdXRlSWQpXG4gICAgICAgICAgICAuc2hvdygpO1xuXG4gICAgICAgIC8vIFNldCB2YWx1ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHJvdXRlRGF0YSkge1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbChyb3V0ZURhdGEubmV0d29yayk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKHJvdXRlRGF0YS5nYXRld2F5KTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKHJvdXRlRGF0YS5kZXNjcmlwdGlvbiB8fCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZXhpc3RpbmdSb3dzLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVTdWJuZXREcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5pbnRlcmZhY2UgfHwgJycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXRtYXNrIGZvciBJUCBhZGRyZXNzIGZpZWxkc1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG5cbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIHN1Ym5ldCB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdWJuZXREcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5zdWJuZXQtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIGludGVyZmFjZSB2YWx1ZSAoZW1wdHkgc3RyaW5nID0gYXV0bylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuaW50ZXJmYWNlLWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gb3B0aW9uczogXCJBdXRvXCIgKyBhdmFpbGFibGUgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19BdXRvIH0sXG4gICAgICAgICAgICAuLi5TdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLnZhbHVlLFxuICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmxhYmVsXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBQcmVwYXJlIGZvcm0gZGF0YSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICBmb3JtRGF0YVtkcm9wZG93bklkXSA9IHNlbGVjdGVkVmFsdWUgfHwgJyc7IC8vIEVuc3VyZSB3ZSBwYXNzIGVtcHR5IHN0cmluZyBmb3IgXCJBdXRvXCJcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIGZvcm1EYXRhLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcm91dGUgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlclxuICAgICAqL1xuICAgIHVwZGF0ZVByaW9yaXRpZXMoKSB7XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRlcyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXNEYXRhIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZXMocm91dGVzRGF0YSkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyByb3V0ZXNcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBlYWNoIHJvdXRlXG4gICAgICAgIGlmIChyb3V0ZXNEYXRhICYmIHJvdXRlc0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcm91dGVzRGF0YS5mb3JFYWNoKHJvdXRlID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBzdGF0ZSBpZiBubyByb3V0ZXNcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHJvdXRlcyBmcm9tIHRhYmxlXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgY29sbGVjdFJvdXRlcygpIHtcbiAgICAgICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChyb3cpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiByb3V0ZUlkLnN0YXJ0c1dpdGgoJ25ld18nKSA/IG51bGwgOiByb3V0ZUlkLFxuICAgICAgICAgICAgICAgIG5ldHdvcms6ICRyb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICAgICAgZ2F0ZXdheTogJHJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJHJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19