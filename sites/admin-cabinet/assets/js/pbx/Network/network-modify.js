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
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox".concat(dhcpDisabled ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(dhcpChecked ? 'checked' : '', " ").concat(dhcpDisabled ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader || 'DHCP Configuration Obtained', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_DHCPInfoIP || 'IP Address', ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoSubnet || 'Subnet', ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoGateway || 'Gateway', ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoDNS || 'DNS', ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain || 'Domain', ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                ").concat(iface.hostname ? "<li>".concat(globalTranslate.nw_DHCPInfoHostname || 'Hostname', ": <strong>").concat(iface.hostname, "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                ").concat(isDocker ? '' : "\n                <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" ").concat(dockerReadonly, " />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_IPv6Mode || 'IPv6 Mode', "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                    </div>\n                </div>\n\n                <!-- Hidden field to store current auto-configured IPv6 address for dual-stack detection -->\n                <input type=\"hidden\" id=\"current-ipv6addr-").concat(id, "\" value=\"").concat(iface.currentIpv6addr || '', "\" />\n\n                <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader || 'IPv6 Autoconfiguration (SLAAC/DHCPv6)', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress || 'IPv6 Address', ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix || 'Prefix Length', ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway || 'Gateway', ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                ").concat(iface.currentPrimarydns6 || iface.primarydns6 ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoDNS || 'DNS', ": <strong>").concat(iface.currentPrimarydns6 || iface.primarydns6).concat(iface.currentSecondarydns6 || iface.secondarydns6 ? ', ' + (iface.currentSecondarydns6 || iface.secondarydns6) : '', "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                    <div class=\"fields\">\n                        <div class=\"five wide field\">\n                            <label>").concat(globalTranslate.nw_IPv6Address || 'IPv6 Address', "</label>\n                            <div class=\"field max-width-600\">\n                                <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                            </div>\n                        </div>\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Subnet || 'IPv6 Prefix Length', "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Hostname || 'Hostname', "</label>\n                        <div class=\"field max-width-400 ").concat(gatewayDisabledClass, "\">\n                            <input type=\"text\" name=\"hostname_").concat(id, "\" value=\"").concat(iface.hostname || '', "\" placeholder=\"mikopbx\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Domain || 'Domain', "</label>\n                        <div class=\"field max-width-400 ").concat(gatewayDisabledClass, "\">\n                            <input type=\"text\" name=\"domain_").concat(id, "\" value=\"").concat(iface.domain || '', "\" placeholder=\"example.com\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-gateway-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6Gateway || 'IPv6 Gateway', "</label>\n                        <div class=\"field max-width-400 ").concat(ipv6GatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.currentIpv6_gateway || iface.ipv6_gateway || '', "\" ").concat(ipv6GatewayReadonly, " placeholder=\"fe80::1\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-primarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6PrimaryDNS || 'Primary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"2001:4860:4860::8888\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-secondarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6SecondaryDNS || 'Secondary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"2001:4860:4860::8844\" />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwic2hvdyIsInVwZGF0ZUR1YWxTdGFja05hdExvZ2ljIiwidG9nZ2xlSVB2NkZpZWxkcyIsImludGVyZmFjZUlkIiwiJGlwdjZNb2RlRHJvcGRvd24iLCJpcHY2TW9kZSIsIiRtYW51YWxGaWVsZHNDb250YWluZXIiLCIkYXV0b0luZm9NZXNzYWdlIiwiJGlwdjZHYXRld2F5RmllbGQiLCIkaXB2NlByaW1hcnlETlNGaWVsZCIsIiRpcHY2U2Vjb25kYXJ5RE5TRmllbGQiLCJpc0R1YWxTdGFja01vZGUiLCJpcHY0YWRkciIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyTWFudWFsIiwiaXB2NmFkZHJBdXRvIiwiaXB2NmFkZHIiLCJoYXNJcHY0IiwidHJpbSIsImhhc0lwdjYiLCJpcHY2TG93ZXIiLCJ0b0xvd2VyQ2FzZSIsImlwdjZXaXRob3V0Q2lkciIsInNwbGl0IiwiaXNHbG9iYWxVbmljYXN0IiwidGVzdCIsImlzTmF0RW5hYmxlZCIsImFueUR1YWxTdGFjayIsInRhYiIsIiRzdGFuZGFyZE5hdFNlY3Rpb24iLCIkZHVhbFN0YWNrU2VjdGlvbiIsIiRleHRob3N0bmFtZUlucHV0IiwiJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyIiwiZmluZCIsImhhcyIsImZpcnN0IiwiJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciIsIiRleHRlcm5hbFNpcFBvcnRJbnB1dCIsIiRleHRlcm5hbFRsc1BvcnRJbnB1dCIsIiRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyIiwiJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIiLCJhcHBlbmRUbyIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJwYXJlbnQiLCJob3N0bmFtZSIsIm53X1ZhbGlkYXRlRXh0ZXJuYWxIb3N0bmFtZUVtcHR5IiwiZmllbGRzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsIiRpbnB1dCIsIm5hbWUiLCJ2YWx1ZSIsInVuZGVmaW5lZCIsIlN0cmluZyIsIiRzZWxlY3QiLCJ1c2VuYXQiLCIkYXV0b1VwZGF0ZURpdiIsImF1dG9VcGRhdGVFeHRlcm5hbElwIiwiaW5wdXRJZCIsInJvd0lkIiwicmVwbGFjZSIsIiRjaGVja2JveCIsImlzRGlzYWJsZWQiLCJoYXNDbGFzcyIsIiRjaGVja2VkUmFkaW8iLCJpbnRlcm5ldF9pbnRlcmZhY2UiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImlwdjZNb2RlTWF0Y2giLCJtb2RlIiwic3VibmV0S2V5IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJjb25zb2xlIiwid2FybiIsImNpZHJUb05ldG1hc2siLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwiaXB2Nk1vZGVGaWVsZE5hbWUiLCJpcHY2TW9kZUZvcm1EYXRhIiwiaXB2Nl9tb2RlIiwibndfSVB2Nk1vZGVPZmYiLCJud19JUHY2TW9kZUF1dG8iLCJud19JUHY2TW9kZU1hbnVhbCIsIm53X1NlbGVjdElQdjZNb2RlIiwiZGF0YUNoYW5nZWQiLCJpcHY2U3VibmV0RmllbGROYW1lIiwiaXB2NlN1Ym5ldEZvcm1EYXRhIiwiaXB2Nl9zdWJuZXQiLCJnZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0SVB2NlN1Ym5ldCIsInN1Ym5ldF8wIiwidXBkYXRlVmlzaWJpbGl0eSIsIm9mZiIsIiRidXR0b24iLCJyZW1vdmUiLCIkdGFiQ29udGVudCIsIiRmaXJzdFRhYiIsImVuYWJsZURpcnJpdHkiLCJjaGVja1ZhbHVlcyIsIiR2bGFuSW5wdXQiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwiJHRhYiIsInByZXBlbmQiLCIkZG5zR2F0ZXdheUdyb3VwIiwiJGRuc0dhdGV3YXlGaWVsZHMiLCIkZGhjcEluZm9NZXNzYWdlIiwib3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyIsInNhdmVJbml0aWFsVmFsdWVzIiwib3JpZ2luYWxDaGVja1ZhbHVlcyIsImZvbWFudGljVmFsdWVzIiwibWFudWFsVmFsdWVzIiwiJGZpZWxkIiwiaXMiLCJvbGRGb3JtVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0Iiwic2V0RXZlbnRzIiwiaXNJbnRlcm5ldEludGVyZmFjZSIsImludGVybmV0IiwiZG5zR2F0ZXdheVZpc2libGUiLCJnYXRld2F5UmVhZG9ubHkiLCJkaGNwIiwiZ2F0ZXdheURpc2FibGVkQ2xhc3MiLCJkbnNSZWFkb25seSIsImRuc0Rpc2FibGVkQ2xhc3MiLCJpcHY2R2F0ZXdheVJlYWRvbmx5IiwiaXB2NkdhdGV3YXlEaXNhYmxlZENsYXNzIiwiaXB2NkZpZWxkc1Zpc2libGUiLCJkb2NrZXJSZWFkb25seSIsImRvY2tlckRpc2FibGVkQ2xhc3MiLCJkaGNwRGlzYWJsZWQiLCJkaGNwQ2hlY2tlZCIsImlwYWRkciIsIm53X0ludGVyZmFjZU5hbWUiLCJud19JbnRlcm5ldEludGVyZmFjZSIsIm53X1VzZURIQ1AiLCJud19ESENQSW5mb0hlYWRlciIsIm53X0RIQ1BJbmZvSVAiLCJjdXJyZW50SXBhZGRyIiwibndfREhDUEluZm9TdWJuZXQiLCJjdXJyZW50U3VibmV0IiwibndfREhDUEluZm9HYXRld2F5IiwiY3VycmVudEdhdGV3YXkiLCJud19ESENQSW5mb0ROUyIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJkb21haW4iLCJud19ESENQSW5mb0RvbWFpbiIsIm53X0RIQ1BJbmZvSG9zdG5hbWUiLCJud19JUEFkZHJlc3MiLCJud19OZXR3b3JrTWFzayIsIm53X1ZsYW5JRCIsIm53X0lQdjZNb2RlIiwiY3VycmVudElwdjZhZGRyIiwibndfSVB2NkF1dG9JbmZvSGVhZGVyIiwibndfSVB2NkF1dG9JbmZvQWRkcmVzcyIsIm53X0lQdjZBdXRvSW5mb1ByZWZpeCIsImN1cnJlbnRJcHY2X3N1Ym5ldCIsImN1cnJlbnRJcHY2X2dhdGV3YXkiLCJpcHY2X2dhdGV3YXkiLCJud19JUHY2QXV0b0luZm9HYXRld2F5IiwiY3VycmVudFByaW1hcnlkbnM2IiwicHJpbWFyeWRuczYiLCJud19JUHY2QXV0b0luZm9ETlMiLCJjdXJyZW50U2Vjb25kYXJ5ZG5zNiIsInNlY29uZGFyeWRuczYiLCJud19JUHY2QWRkcmVzcyIsIm53X0lQdjZTdWJuZXQiLCJud19JbnRlcm5ldFNldHRpbmdzIiwibndfSG9zdG5hbWUiLCJud19Eb21haW4iLCJud19HYXRld2F5IiwibndfSVB2NkdhdGV3YXkiLCJud19QcmltYXJ5RE5TIiwibndfU2Vjb25kYXJ5RE5TIiwibndfSVB2NlByaW1hcnlETlMiLCJud19JUHY2U2Vjb25kYXJ5RE5TIiwib3B0aW9ucyIsImkiLCJkZXNjcmlwdGlvbiIsInB1c2giLCJuYXQiLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImF2YWlsYWJsZUludGVyZmFjZXMiLCJsb2FkUm91dGVzIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmbiIsImYiLCJhIiwiaXB2NlBhdHRlcm4iLCJpcGFkZHJlc3MiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsImluQXJyYXkiLCJleHRlbmFsSXBIb3N0IiwidmFsaWRIb3N0bmFtZSIsImhvc3RuYW1lUmVnZXgiLCIkdGFibGUiLCIkc2VjdGlvbiIsIiRhZGRCdXR0b24iLCIkdGFibGVDb250YWluZXIiLCIkZW1wdHlQbGFjZWhvbGRlciIsInJvdXRlcyIsImluaXRpYWxpemVEcmFnQW5kRHJvcCIsImFkZFJvdXRlIiwiZG9jdW1lbnQiLCJ0YXJnZXQiLCJ1cGRhdGVQcmlvcml0aWVzIiwidXBkYXRlRW1wdHlTdGF0ZSIsIiRzb3VyY2VSb3ciLCJjb3B5Um91dGUiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2xlYW5lZERhdGEiLCJzZXRUaW1lb3V0IiwidGFibGVEbkRVcGRhdGUiLCJ0YWJsZURuRCIsIm9uRHJvcCIsImRyYWdIYW5kbGUiLCJpbnRlcmZhY2VDb3VudCIsIm5vdCIsInJvdXRlSWQiLCJzdWJuZXREcm9wZG93bklkIiwiaW50ZXJmYWNlRHJvcGRvd25JZCIsInJvdXRlRGF0YSIsIm5ldHdvcmsiLCIkZXhpc3RpbmdSb3dzIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsIkRhdGUiLCJub3ciLCJhZnRlciIsImluaXRpYWxpemVTdWJuZXREcm9wZG93biIsImluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93biIsIiRyb3ciLCJzZWxlY3RlZFZhbHVlIiwiJGNvbnRhaW5lciIsImRyb3Bkb3duSWQiLCJud19BdXRvIiwibWFwIiwi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TCxPQUFPLENBQUN5QixVQUFSLENBQW1CLE1BQW5CLElBQTZCLElBQTdCLEdBQW9DekIsT0FEaEM7QUFFUkksUUFBQUEsT0FBTyxFQUFFVyxJQUFJLENBQUMvUixJQUFMLENBQVUsZ0JBQVYsRUFBNEJwQyxHQUE1QixFQUZEO0FBR1JtSixRQUFBQSxNQUFNLEVBQUU3TyxDQUFDLFlBQUsrWSxnQkFBTCxFQUFELENBQTBCclQsR0FBMUIsRUFIQTtBQUlSZ0IsUUFBQUEsT0FBTyxFQUFFbVQsSUFBSSxDQUFDL1IsSUFBTCxDQUFVLGdCQUFWLEVBQTRCcEMsR0FBNUIsRUFKRDtBQUtSLHFCQUFXMUYsQ0FBQyxZQUFLZ1osbUJBQUwsRUFBRCxDQUE2QnRULEdBQTdCLE1BQXNDLEVBTHpDO0FBTVJpUSxRQUFBQSxXQUFXLEVBQUVrRSxJQUFJLENBQUMvUixJQUFMLENBQVUsb0JBQVYsRUFBZ0NwQyxHQUFoQyxFQU5MO0FBT1I4VSxRQUFBQSxRQUFRLEVBQUV4VixLQUFLLEdBQUc7QUFQVixPQUFaO0FBU0gsS0FmRDtBQWdCQSxXQUFPd1MsTUFBUDtBQUNIO0FBaFV1QixDQUE1QjtBQW1VQTtBQUNBO0FBQ0E7O0FBQ0F4WCxDQUFDLENBQUMyWCxRQUFELENBQUQsQ0FBWThDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjNhLEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQXBwbHkgSVAgbWFzayBmb3IgZXh0ZXJuYWwgSVAgYWRkcmVzcyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gaW4gRG9ja2VyIChtYW5hZ2VkIHZpYSBkby1ub3Qtc2hvdy1pZi1kb2NrZXIgY2xhc3MpXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmlwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAgfHwgJ0ZhaWxlZCB0byBnZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5kYXRhLmlwICsgcG9ydDtcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFNJUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHNpcFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHNpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFJUUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1NpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrU2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1J0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcy5odG1sKGR1YWxTdGFja1J0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogVXBkYXRlcyBib3RoIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JUKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIGV4dGVybmFsIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRzaXBMYWJlbCA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHNpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBMYWJlbCA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrU2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBMYWJlbC50ZXh0KGR1YWxTdGFja1NpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc0xhYmVsID0gJCgnI2R1YWwtc3RhY2stdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tUbHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tUbHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tUbHNMYWJlbC50ZXh0KGR1YWxTdGFja1Rsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgJ2Rpc2FibGVkJyBjbGFzcyBmb3Igc3BlY2lmaWMgZmllbGRzIGJhc2VkIG9uIHRoZWlyIGNoZWNrYm94IHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7ZXRofS1jaGVja2JveGApO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBJUCBhZGRyZXNzIGFuZCBzdWJuZXQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCAkaXBGaWVsZCA9ICQoYGlucHV0W25hbWU9XCJpcGFkZHJfJHtldGh9XCJdYCk7XG4gICAgICAgICAgICAvLyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIGNyZWF0ZXMgZHJvcGRvd24gd2l0aCBpZCBwYXR0ZXJuOiBmaWVsZE5hbWUtZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRzdWJuZXREcm9wZG93biA9ICQoYCNzdWJuZXRfJHtldGh9LWRyb3Bkb3duYCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgSVAvc3VibmV0IHJlYWQtb25seSBhbmQgYWRkIGRpc2FibGVkIGNsYXNzXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBJUC9zdWJuZXQgZWRpdGFibGVcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZS9zaG93IE5BVCBzZWN0aW9ucyBpbnN0ZWFkIG9mIGRpc2FibGluZyB0byBzaW1wbGlmeSBVSVxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgIC8vIEFmdGVyIHNob3dpbmcgYWxsIHNlY3Rpb25zLCBkZXRlcm1pbmUgd2hpY2ggb25lIHRvIGFjdHVhbGx5IGRpc3BsYXlcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHZpc2liaWxpdHkgb2YgSVB2NiBtYW51YWwgY29uZmlndXJhdGlvbiBmaWVsZHMgYmFzZWQgb24gc2VsZWN0ZWQgbW9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcmZhY2VJZCAtIEludGVyZmFjZSBJRFxuICAgICAqL1xuICAgIHRvZ2dsZUlQdjZGaWVsZHMoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgY29uc3QgJGlwdjZNb2RlRHJvcGRvd24gPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJGlwdjZNb2RlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIGNvbnN0ICRtYW51YWxGaWVsZHNDb250YWluZXIgPSAkKGAuaXB2Ni1tYW51YWwtZmllbGRzLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRhdXRvSW5mb01lc3NhZ2UgPSAkKGAuaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkaXB2NkdhdGV3YXlGaWVsZCA9ICQoYC5pcHY2LWdhdGV3YXktZmllbGQtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGlwdjZQcmltYXJ5RE5TRmllbGQgPSAkKGAuaXB2Ni1wcmltYXJ5ZG5zLWZpZWxkLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRpcHY2U2Vjb25kYXJ5RE5TRmllbGQgPSAkKGAuaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpbnRlcmZhY2VJZH1gKTtcblxuICAgICAgICAvLyBTaG93IG1hbnVhbCBmaWVsZHMgb25seSB3aGVuIG1vZGUgaXMgJzInIChNYW51YWwpXG4gICAgICAgIGlmIChpcHY2TW9kZSA9PT0gJzInKSB7XG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZHYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZQcmltYXJ5RE5TRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZTZWNvbmRhcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXB2Nk1vZGUgPT09ICcxJykge1xuICAgICAgICAgICAgLy8gU2hvdyBBdXRvIChTTEFBQykgaW5mbyBtZXNzYWdlIHdoZW4gbW9kZSBpcyAnMScgKEF1dG8pXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZHYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZQcmltYXJ5RE5TRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZTZWNvbmRhcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBJUHY2IGZpZWxkcyBmb3IgbW9kZSAnMCcgKE9mZilcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NkdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NlByaW1hcnlETlNGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NlNlY29uZGFyeUROU0ZpZWxkLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgbW9kZSBjaGFuZ2VzXG4gICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGR1YWwtc3RhY2sgbW9kZSBpcyBhY3RpdmUgKElQdjQgKyBJUHY2IHB1YmxpYyBhZGRyZXNzIGJvdGggY29uZmlndXJlZClcbiAgICAgKiBEdWFsLXN0YWNrIE5BVCBzZWN0aW9uIGlzIHNob3duIHdoZW4gYm90aCBJUHY0IGFuZCBwdWJsaWMgSVB2NiBhcmUgcHJlc2VudC5cbiAgICAgKiBQdWJsaWMgSVB2NiA9IEdsb2JhbCBVbmljYXN0IGFkZHJlc3NlcyAoMjAwMDo6LzMpIHRoYXQgc3RhcnQgd2l0aCAyIG9yIDMuXG4gICAgICogUHJpdmF0ZSBJUHY2IGFkZHJlc3NlcyAoVUxBIGZkMDA6Oi84LCBsaW5rLWxvY2FsIGZlODA6Oi8xMCkgZG8gTk9UIHRyaWdnZXIgZHVhbC1zdGFjay5cbiAgICAgKlxuICAgICAqIElQdjQgZGV0ZWN0aW9uIHdvcmtzIGZvciBib3RoIHN0YXRpYyBhbmQgREhDUCBjb25maWd1cmF0aW9uczpcbiAgICAgKiAtIFN0YXRpYzogY2hlY2tzIGlwYWRkcl9YIGZpZWxkXG4gICAgICogLSBESENQOiBjaGVja3MgaWYgREhDUCBpcyBlbmFibGVkIEFORCBnYXRld2F5IGlzIG9idGFpbmVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBkdWFsLXN0YWNrIHdpdGggcHVibGljIElQdjYsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGlzRHVhbFN0YWNrTW9kZShpbnRlcmZhY2VJZCkge1xuICAgICAgICAvLyBHZXQgSVB2NCBjb25maWd1cmF0aW9uIChzdGF0aWMgb3IgREhDUClcbiAgICAgICAgY29uc3QgaXB2NGFkZHIgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuICAgICAgICBjb25zdCBkaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3gubGVuZ3RoID4gMCAmJiAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGNvbnN0IGdhdGV3YXkgPSAkKGBpbnB1dFtuYW1lPVwiZ2F0ZXdheV8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuXG4gICAgICAgIC8vIEdldCBJUHY2IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgaXB2Nk1vZGUgPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIC8vIEZvciBNYW51YWwgbW9kZSB1c2UgZm9ybSBmaWVsZCwgZm9yIEF1dG8gbW9kZSB1c2UgY3VycmVudCAoYXV0b2NvbmZpZ3VyZWQpIHZhbHVlIGZyb20gaGlkZGVuIGZpZWxkXG4gICAgICAgIGNvbnN0IGlwdjZhZGRyTWFudWFsID0gJChgaW5wdXRbbmFtZT1cImlwdjZhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyQXV0byA9ICQoYCNjdXJyZW50LWlwdjZhZGRyLSR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyID0gaXB2Nk1vZGUgPT09ICcxJyA/IGlwdjZhZGRyQXV0byA6IGlwdjZhZGRyTWFudWFsO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjQgaXMgcHJlc2VudCAoZWl0aGVyIHN0YXRpYyBhZGRyZXNzIG9yIERIQ1Agd2l0aCBnYXRld2F5KVxuICAgICAgICAvLyBHYXRld2F5IHByZXNlbmNlIGluZGljYXRlcyBESENQIHN1Y2Nlc3NmdWxseSBvYnRhaW5lZCBhbiBJUHY0IGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NCA9IChpcHY0YWRkciAmJiBpcHY0YWRkci50cmltKCkgIT09ICcnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGRoY3BFbmFibGVkICYmIGdhdGV3YXkgJiYgZ2F0ZXdheS50cmltKCkgIT09ICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY2IGlzIGVuYWJsZWQgKEF1dG8gU0xBQUMvREhDUHY2IG9yIE1hbnVhbClcbiAgICAgICAgLy8gRm9yIEF1dG8gbW9kZSAoJzEnKSwgd2UgY2hlY2sgY3VycmVudElwdjZhZGRyIHdoaWNoIHNob3dzIGF1dG9jb25maWd1cmVkIGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NiA9IChpcHY2TW9kZSA9PT0gJzEnIHx8IGlwdjZNb2RlID09PSAnMicpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBpcHY2YWRkciAmJiBpcHY2YWRkci50cmltKCkgIT09ICcnICYmIGlwdjZhZGRyICE9PSAnQXV0b2NvbmZpZ3VyZWQnO1xuXG4gICAgICAgIGlmICghaGFzSXB2NCB8fCAhaGFzSXB2Nikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBhZGRyZXNzIGlzIGdsb2JhbCB1bmljYXN0IChwdWJsaWMpXG4gICAgICAgIC8vIEdsb2JhbCB1bmljYXN0OiAyMDAwOjovMyAoYWRkcmVzc2VzIHN0YXJ0aW5nIHdpdGggMiBvciAzKVxuICAgICAgICAvLyBFeGNsdWRlIFVMQSAoZmQwMDo6LzgpIGFuZCBsaW5rLWxvY2FsIChmZTgwOjovMTApXG4gICAgICAgIGNvbnN0IGlwdjZMb3dlciA9IGlwdjZhZGRyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgICAgIC8vIFJlbW92ZSBDSURSIG5vdGF0aW9uIGlmIHByZXNlbnQgKGUuZy4sIFwiMjAwMTpkYjg6OjEvNjRcIiAtPiBcIjIwMDE6ZGI4OjoxXCIpXG4gICAgICAgIGNvbnN0IGlwdjZXaXRob3V0Q2lkciA9IGlwdjZMb3dlci5zcGxpdCgnLycpWzBdO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZpcnN0IGNoYXJhY3RlciBpcyAyIG9yIDMgKGdsb2JhbCB1bmljYXN0IHJhbmdlKVxuICAgICAgICBjb25zdCBpc0dsb2JhbFVuaWNhc3QgPSAvXlsyM10vLnRlc3QoaXB2NldpdGhvdXRDaWRyKTtcblxuICAgICAgICByZXR1cm4gaXNHbG9iYWxVbmljYXN0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIHNlY3Rpb24gVUkgYmFzZWQgb24gZHVhbC1zdGFjayBkZXRlY3Rpb25cbiAgICAgKiBTd2l0Y2hlcyBiZXR3ZWVuIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBNYWtlcyBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrIG1vZGVcbiAgICAgKi9cbiAgICB1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgTkFUIGlzIGVuYWJsZWQgLSBpZiBub3QsIGRvbid0IHNob3cgYW55IE5BVCBzZWN0aW9uc1xuICAgICAgICBjb25zdCBpc05hdEVuYWJsZWQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCFpc05hdEVuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gTkFUIGRpc2FibGVkLCBzZWN0aW9ucyBhbHJlYWR5IGhpZGRlbiBieSB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3NcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGFueSBpbnRlcmZhY2UgaXMgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICAgIGxldCBhbnlEdWFsU3RhY2sgPSBmYWxzZTtcblxuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkKHRhYikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3Jrcy5pc0R1YWxTdGFja01vZGUoaW50ZXJmYWNlSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55RHVhbFN0YWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEJyZWFrIGxvb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgJHN0YW5kYXJkTmF0U2VjdGlvbiA9ICQoJyNzdGFuZGFyZC1uYXQtc2VjdGlvbicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2VjdGlvbiA9ICQoJyNkdWFsLXN0YWNrLXNlY3Rpb24nKTtcblxuICAgICAgICAvLyBHZXQgdGhlIGV4dGhvc3RuYW1lIGlucHV0IGVsZW1lbnQgYW5kIGl0cyBvcmlnaW5hbCBwYXJlbnRcbiAgICAgICAgY29uc3QgJGV4dGhvc3RuYW1lSW5wdXQgPSAkKCcjZXh0aG9zdG5hbWUnKTtcbiAgICAgICAgY29uc3QgJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyID0gJHN0YW5kYXJkTmF0U2VjdGlvbi5maW5kKCcubWF4LXdpZHRoLTUwMCcpLmhhcygnI2V4dGhvc3RuYW1lJykuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciA9ICQoJyNleHRob3N0bmFtZS1kdWFsLXN0YWNrLWlucHV0LXdyYXBwZXInKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHBvcnQgaW5wdXQgZWxlbWVudHMgYW5kIHRoZWlyIHdyYXBwZXJzXG4gICAgICAgIGNvbnN0ICRleHRlcm5hbFNpcFBvcnRJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJleHRlcm5hbFNJUFBvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJGV4dGVybmFsVGxzUG9ydElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImV4dGVybmFsVExTUG9ydFwiXScpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRTaXBQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1zdGFuZGFyZC13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LXN0YW5kYXJkLXdyYXBwZXInKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWR1YWwtc3RhY2std3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtZHVhbC1zdGFjay13cmFwcGVyJyk7XG5cbiAgICAgICAgaWYgKGFueUR1YWxTdGFjaykge1xuICAgICAgICAgICAgLy8gRHVhbC1zdGFjayBkZXRlY3RlZDogSGlkZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiwgc2hvdyBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgICAgICAgICRzdGFuZGFyZE5hdFNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGV4dGhvc3RuYW1lIGlucHV0IHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0aG9zdG5hbWVJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb3ZlIHBvcnQgaW5wdXRzIHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxTaXBQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFNpcFBvcnRJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRleHRlcm5hbFRsc1BvcnRJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsVGxzUG9ydElucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGlwYWRkciAoZXh0ZXJuYWwgSVAgbm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrLCBvbmx5IGhvc3RuYW1lKVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsICcnKTtcblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBhdXRvVXBkYXRlRXh0ZXJuYWxJcCAobm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaG9zdG5hbWUgZGlzcGxheSBpbiBkdWFsLXN0YWNrIGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgaG9zdG5hbWUgPSAkZXh0aG9zdG5hbWVJbnB1dC52YWwoKSB8fCAnbWlrb3BieC5jb21wYW55LmNvbSc7XG4gICAgICAgICAgICAkKCcjaG9zdG5hbWUtZGlzcGxheScpLnRleHQoaG9zdG5hbWUpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIGV4dGhvc3RuYW1lIHJlcXVpcmVkIGluIGR1YWwtc3RhY2tcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUucnVsZXMgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dGVybmFsSG9zdG5hbWVFbXB0eSB8fCAnRXh0ZXJuYWwgaG9zdG5hbWUgaXMgcmVxdWlyZWQgaW4gZHVhbC1zdGFjayBtb2RlJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCB8fCAnSW52YWxpZCBob3N0bmFtZSBmb3JtYXQnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gZHVhbC1zdGFjazogU2hvdyBzdGFuZGFyZCBOQVQgc2VjdGlvbiwgaGlkZSBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgICAgICAgICRzdGFuZGFyZE5hdFNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NlY3Rpb24uaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGV4dGhvc3RuYW1lIGlucHV0IGJhY2sgdG8gc3RhbmRhcmQgc2VjdGlvblxuICAgICAgICAgICAgaWYgKCRleHRob3N0bmFtZUlucHV0Lmxlbmd0aCA+IDAgJiYgJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0aG9zdG5hbWVJbnB1dC5hcHBlbmRUbygkc3RhbmRhcmRIb3N0bmFtZVdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb3ZlIHBvcnQgaW5wdXRzIGJhY2sgdG8gc3RhbmRhcmQgc2VjdGlvblxuICAgICAgICAgICAgaWYgKCRleHRlcm5hbFNpcFBvcnRJbnB1dC5sZW5ndGggPiAwICYmICRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0ZXJuYWxTaXBQb3J0SW5wdXQuYXBwZW5kVG8oJHN0YW5kYXJkU2lwUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRleHRlcm5hbFRsc1BvcnRJbnB1dC5sZW5ndGggPiAwICYmICRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0ZXJuYWxUbHNQb3J0SW5wdXQuYXBwZW5kVG8oJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGV4dGhvc3RuYW1lIHZhbGlkYXRpb24gKG9wdGlvbmFsIHdpdGggdXNlbmF0IGRlcGVuZGVuY3kpXG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLmRlcGVuZHMgPSAndXNlbmF0JztcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUucnVsZXMgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2Rlc3Ryb3knKS5mb3JtKHtcbiAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICBmaWVsZHM6IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgbmV3IGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgYSBzcGVjaWZpYyByb3cgaW4gdGhlIG5ldHdvcmsgY29uZmlndXJhdGlvbiBmb3JtLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdSb3dJZCAtIFRoZSBJRCBvZiB0aGUgbmV3IHJvdyB0byBhZGQgdGhlIGZvcm0gcnVsZXMgZm9yLlxuICAgICAqL1xuICAgIGFkZE5ld0Zvcm1SdWxlcyhuZXdSb3dJZCkge1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnbmFtZScgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgbmFtZUNsYXNzID0gYG5hbWVfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ25hbWUnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbbmFtZUNsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IG5hbWVDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAndmxhbmlkJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCB2bGFuQ2xhc3MgPSBgdmxhbmlkXyR7bmV3Um93SWR9YDtcblxuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1t2bGFuQ2xhc3NdID0ge1xuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiB2bGFuQ2xhc3MsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uNDA5NV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5SYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYGNoZWNrVmxhblske25ld1Jvd0lkfV1gLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5Dcm9zcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBpcGFkZHJDbGFzcyA9IGBpcGFkZHJfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2lwYWRkcicgZmllbGRcbiAgICAgICAgLy8gRm9yIHRlbXBsYXRlIGludGVyZmFjZSAoaWQ9MCksIGFkZCBkZXBlbmRlbmN5IG9uIGludGVyZmFjZSBzZWxlY3Rpb25cbiAgICAgICAgaWYgKG5ld1Jvd0lkID09PSAwIHx8IG5ld1Jvd0lkID09PSAnMCcpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLCAgLy8gVGVtcGxhdGU6IHZhbGlkYXRlIG9ubHkgaWYgaW50ZXJmYWNlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgbm90ZGhjcF8ke25ld1Jvd0lkfWAsICAvLyBSZWFsIGludGVyZmFjZTogdmFsaWRhdGUgb25seSBpZiBESENQIGlzIE9GRlxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREhDUCB2YWxpZGF0aW9uIHJlbW92ZWQgLSBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGZvciBWTEFOIGludGVyZmFjZXNcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBvYmplY3Qgd2l0aCBhbGwgc2V0dGluZ3MgcHJvcGVydGllc1xuICAgICAgICBjb25zdCByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncyk7XG4gICAgICAgIHJlc3VsdC5kYXRhID0ge307XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzdGF0aWMgcm91dGVzXG4gICAgICAgIHJlc3VsdC5kYXRhLnN0YXRpY1JvdXRlcyA9IFN0YXRpY1JvdXRlc01hbmFnZXIuY29sbGVjdFJvdXRlcygpO1xuXG4gICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgZm9ybSB2YWx1ZXMgdG8gYXZvaWQgYW55IERPTS1yZWxhdGVkIGlzc3Vlc1xuICAgICAgICAvLyBDb2xsZWN0IGFsbCByZWd1bGFyIGlucHV0IGZpZWxkc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBESENQIGNoZWNrYm94ZXMgdG8gYm9vbGVhbiBmb3IgZWFjaCBpbnRlcmZhY2VcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnLmRoY3AtY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dElkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9IGlucHV0SWQucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuXG4gICAgICAgICAgICAvLyBGb3IgZGlzYWJsZWQgY2hlY2tib3hlcywgcmVhZCBhY3R1YWwgaW5wdXQgc3RhdGUgaW5zdGVhZCBvZiBGb21hbnRpYyBVSSBBUElcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQob2JqKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkY2hlY2tib3guaGFzQ2xhc3MoJ2Rpc2FibGVkJykgfHwgJGlucHV0LnByb3AoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgdGhlIGFjdHVhbCBpbnB1dCBjaGVja2VkIHN0YXRlXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRpbnB1dC5wcm9wKCdjaGVja2VkJykgPT09IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBlbmFibGVkIGNoZWNrYm94ZXMsIHVzZSBGb21hbnRpYyBVSSBBUElcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtgZGhjcF8ke3Jvd0lkfWBdID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgaW50ZXJuZXQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaW50ZXJuZXRfaW50ZXJmYWNlID0gU3RyaW5nKCRjaGVja2VkUmFkaW8udmFsKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV0hZOiBObyBwb3J0IGZpZWxkIG1hcHBpbmcgbmVlZGVkIC0gZm9ybSBmaWVsZCBuYW1lcyBtYXRjaCBBUEkgY29uc3RhbnRzXG4gICAgICAgIC8vIChleHRlcm5hbFNJUFBvcnQgPSBQYnhTZXR0aW5nczo6RVhURVJOQUxfU0lQX1BPUlQpXG5cbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgSVB2NiBzdWJuZXQgZm9yIEF1dG8gbW9kZSAoU0xBQUMvREhDUHY2KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXB2Nk1vZGVNYXRjaCA9IGtleS5tYXRjaCgvXmlwdjZfbW9kZV8oXFxkKykkLyk7XG4gICAgICAgICAgICBpZiAoaXB2Nk1vZGVNYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gaXB2Nk1vZGVNYXRjaFsxXTtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdWJuZXRLZXkgPSBgaXB2Nl9zdWJuZXRfJHtpbnRlcmZhY2VJZH1gO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgbW9kZSBpcyBBdXRvICgnMScpIGFuZCBzdWJuZXQgaXMgZW1wdHksIHNldCBkZWZhdWx0IHRvICc2NCdcbiAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJzEnICYmICghcmVzdWx0LmRhdGFbc3VibmV0S2V5XSB8fCByZXN1bHQuZGF0YVtzdWJuZXRLZXldID09PSAnJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbc3VibmV0S2V5XSA9ICc2NCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxlZCBieSBGb3JtXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG5ldHdvcmtzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbmV0d29ya3MuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5saW5lID0gdHJ1ZTsgLy8gU2hvdyBpbmxpbmUgZXJyb3JzIG5leHQgdG8gZmllbGRzXG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTmV0d29ya0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVDb25maWcnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9tb2RpZnkvYDtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZENvbmZpZ3VyYXRpb24oKSB7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgRG9ja2VyIG5ldHdvcmsgaW5mbyBhcyByZWFkLW9ubHlcbiAgICAgKiBERVBSRUNBVEVEOiBEb2NrZXIgbm93IHVzZXMgc2FtZSBpbnRlcmZhY2UgdGFicyBhcyByZWd1bGFyIGluc3RhbGxhdGlvblxuICAgICAqL1xuICAgIHNob3dEb2NrZXJOZXR3b3JrSW5mbyhkYXRhKSB7XG4gICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgbm8gbG9uZ2VyIHVzZWQgLSBEb2NrZXIgdXNlcyBjcmVhdGVJbnRlcmZhY2VUYWJzIGluc3RlYWRcbiAgICAgICAgY29uc29sZS53YXJuKCdzaG93RG9ja2VyTmV0d29ya0luZm8gaXMgZGVwcmVjYXRlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IENJRFIgbm90YXRpb24gdG8gZG90dGVkIGRlY2ltYWwgbmV0bWFza1xuICAgICAqL1xuICAgIGNpZHJUb05ldG1hc2soY2lkcikge1xuICAgICAgICBjb25zdCBtYXNrID0gfigyICoqICgzMiAtIGNpZHIpIC0gMSk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAobWFzayA+Pj4gMjQpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDE2KSAmIDI1NSxcbiAgICAgICAgICAgIChtYXNrID4+PiA4KSAmIDI1NSxcbiAgICAgICAgICAgIG1hc2sgJiAyNTVcbiAgICAgICAgXS5qb2luKCcuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBJbnRlcmZhY2UgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyIGVudmlyb25tZW50XG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBpc0RvY2tlciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIC8vIE9ubHkgVkxBTiBpbnRlcmZhY2VzIGNhbiBiZSBkZWxldGVkICh2bGFuaWQgPiAwKVxuICAgICAgICAgICAgLy8gSW4gRG9ja2VyLCBkaXNhYmxlIGRlbGV0ZSBmb3IgYWxsIGludGVyZmFjZXNcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9ICFpc0RvY2tlciAmJiBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uLCBpc0RvY2tlcikpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgdGFiIGZvciBuZXcgVkxBTiAobm90IGZvciBEb2NrZXIpXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlICYmICFpc0RvY2tlcikge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkYXRhLnRlbXBsYXRlO1xuICAgICAgICAgICAgdGVtcGxhdGUuaWQgPSAwO1xuXG4gICAgICAgICAgICAvLyBBZGQgXCIrXCIgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW1cIiBkYXRhLXRhYj1cIjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHBsdXNcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBmb3JtIHdpdGggaW50ZXJmYWNlIHNlbGVjdG9yXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBkYXRhLmludGVyZmFjZXMpKTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSkge1xuICAgICAgICAgICAgICAgICAgICBwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogaWZhY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaWZhY2UuaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyA9IE9iamVjdC52YWx1ZXMocGh5c2ljYWxJbnRlcmZhY2VzKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcmZhY2VfMCcsIHsgaW50ZXJmYWNlXzA6ICcnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93bnMgdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBzdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgc3VibmV0IHRvIHN0cmluZyBmb3IgZHJvcGRvd24gbWF0Y2hpbmdcbiAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2Uuc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIElQdjYgbW9kZSBkcm9wZG93biAoT2ZmL0F1dG8vTWFudWFsKVxuICAgICAgICAgICAgY29uc3QgaXB2Nk1vZGVGaWVsZE5hbWUgPSBgaXB2Nl9tb2RlXyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlRm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIGlwdjZNb2RlRm9ybURhdGFbaXB2Nk1vZGVGaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLmlwdjZfbW9kZSB8fCAnMCcpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oaXB2Nk1vZGVGaWVsZE5hbWUsIGlwdjZNb2RlRm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVPZmYgfHwgJ09mZid9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlQXV0byB8fCAnQXV0byAoU0xBQUMvREhDUHY2KSd9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlTWFudWFsIHx8ICdNYW51YWwnfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY2TW9kZSB8fCAnU2VsZWN0IElQdjYgTW9kZScsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY2IHN1Ym5ldCBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZpZWxkTmFtZSA9IGBpcHY2X3N1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2U3VibmV0Rm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIGlwdjZTdWJuZXRGb3JtRGF0YVtpcHY2U3VibmV0RmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZTdWJuZXRGaWVsZE5hbWUsIGlwdjZTdWJuZXRGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZTdWJuZXQgfHwgJ1NlbGVjdCBJUHY2IFByZWZpeCcsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ11cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTZXQgaW5pdGlhbCB2aXNpYmlsaXR5IG9mIElQdjYgbWFudWFsIGZpZWxkc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBESENQIGNoZWNrYm94IGhhbmRsZXJzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIElQIGFkZHJlc3MgaW5wdXQgbWFza3NcbiAgICAgICAgJCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEFkZCBWTEFOIElEIGNoYW5nZSBoYW5kbGVycyB0byBjb250cm9sIERIQ1AgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykub2ZmKCdpbnB1dCBjaGFuZ2UnKS5vbignaW5wdXQgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdmxhbklucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJHZsYW5JbnB1dC5hdHRyKCduYW1lJykucmVwbGFjZSgndmxhbmlkXycsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IHZsYW5WYWx1ZSA9IHBhcnNlSW50KCR2bGFuSW5wdXQudmFsKCksIDEwKSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7aW50ZXJmYWNlSWR9LWNoZWNrYm94YCk7XG5cbiAgICAgICAgICAgIGlmICh2bGFuVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBESENQIGNoZWNrYm94IGZvciBWTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRW5hYmxlIERIQ1AgY2hlY2tib3ggZm9yIG5vbi1WTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGRpc2FibGVkIGZpZWxkIGNsYXNzZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRoZSBoYW5kbGVyIGZvciBleGlzdGluZyBWTEFOIGludGVyZmFjZXMgdG8gYXBwbHkgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBETlMvR2F0ZXdheSByZWFkb25seSBzdGF0ZSB3aGVuIERIQ1AgY2hhbmdlc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLm9mZignY2hhbmdlLmRuc2dhdGV3YXknKS5vbignY2hhbmdlLmRuc2dhdGV3YXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRjaGVja2JveC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBETlMvR2F0ZXdheSBmaWVsZHMgZm9yIHRoaXMgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUdyb3VwID0gJChgLmRucy1nYXRld2F5LWdyb3VwLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUZpZWxkcyA9ICRkbnNHYXRld2F5R3JvdXAuZmluZCgnaW5wdXRbbmFtZV49XCJnYXRld2F5X1wiXSwgaW5wdXRbbmFtZV49XCJwcmltYXJ5ZG5zX1wiXSwgaW5wdXRbbmFtZV49XCJzZWNvbmRhcnlkbnNfXCJdJyk7XG4gICAgICAgICAgICBjb25zdCAkZGhjcEluZm9NZXNzYWdlID0gJChgLmRoY3AtaW5mby1tZXNzYWdlLSR7aW50ZXJmYWNlSWR9YCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIERIQ1AgY2hhbmdlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBpbml0aWFsIFRBQiBpY29uIHVwZGF0ZSBmb3IgY2hlY2tlZCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkY2hlY2tlZFJhZGlvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgaW5pdGlhbCBkaXNhYmxlZCBzdGF0ZSBmb3IgREhDUC1lbmFibGVkIGludGVyZmFjZXNcbiAgICAgICAgLy8gQ2FsbCBhZnRlciBhbGwgZHJvcGRvd25zIGFyZSBjcmVhdGVkXG4gICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgIC8vIFJlLXNhdmUgaW5pdGlhbCBmb3JtIHZhbHVlcyBhbmQgcmUtYmluZCBldmVudCBoYW5kbGVycyBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCBpbnB1dHNcbiAgICAgICAgLy8gVGhpcyBpcyBlc3NlbnRpYWwgZm9yIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byB3b3JrIHdpdGggZHluYW1pYyB0YWJzXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIEZvcm0gbWV0aG9kcyB0byBtYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgKGluY2x1ZGluZyBmcm9tIHRhYnMpXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNhdmVJbml0aWFsVmFsdWVzID0gRm9ybS5zYXZlSW5pdGlhbFZhbHVlcztcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuXG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJIChtYXkgbWlzcyBkeW5hbWljYWxseSBjcmVhdGVkIHRhYiBmaWVsZHMpXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgdG8gY2F0Y2ggZmllbGRzIHRoYXQgRm9tYW50aWMgVUkgbWlzc2VzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGggKG1hbnVhbCB2YWx1ZXMgb3ZlcnJpZGUgRm9tYW50aWMgdmFsdWVzIGZvciBmaWVsZHMgdGhhdCBleGlzdCBpbiBib3RoKVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGhcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zZXRFdmVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBleGlzdGluZyBpbnRlcmZhY2VcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaWZhY2UgLSBJbnRlcmZhY2UgZGF0YVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNBY3RpdmUgLSBXaGV0aGVyIHRoaXMgdGFiIGlzIGFjdGl2ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWxldGVCdXR0b24gLSBIVE1MIGZvciBkZWxldGUgYnV0dG9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uLCBpc0RvY2tlciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gaWZhY2UuaWQ7XG4gICAgICAgIGNvbnN0IGlzSW50ZXJuZXRJbnRlcmZhY2UgPSBpZmFjZS5pbnRlcm5ldCB8fCBmYWxzZTtcblxuICAgICAgICAvLyBETlMvR2F0ZXdheSBmaWVsZHMgdmlzaWJpbGl0eSBhbmQgcmVhZC1vbmx5IHN0YXRlXG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlWaXNpYmxlID0gaXNJbnRlcm5ldEludGVyZmFjZSA/ICcnIDogJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJztcblxuICAgICAgICAvLyBJbiBEb2NrZXI6IEdhdGV3YXkgaXMgYWx3YXlzIHJlYWRvbmx5LCBETlMgZmllbGRzIGFyZSBlZGl0YWJsZVxuICAgICAgICAvLyBJbiByZWd1bGFyIG1vZGU6IEFsbCBmaWVsZHMgcmVhZG9ubHkgaWYgREhDUCBlbmFibGVkXG4gICAgICAgIGNvbnN0IGdhdGV3YXlSZWFkb25seSA9IGlzRG9ja2VyIHx8IGlmYWNlLmRoY3AgPyAncmVhZG9ubHknIDogJyc7XG4gICAgICAgIGNvbnN0IGdhdGV3YXlEaXNhYmxlZENsYXNzID0gaXNEb2NrZXIgfHwgaWZhY2UuZGhjcCA/ICdkaXNhYmxlZCcgOiAnJztcbiAgICAgICAgY29uc3QgZG5zUmVhZG9ubHkgPSBpc0RvY2tlciA/ICcnIDogKGlmYWNlLmRoY3AgPyAncmVhZG9ubHknIDogJycpO1xuICAgICAgICBjb25zdCBkbnNEaXNhYmxlZENsYXNzID0gaXNEb2NrZXIgPyAnJyA6IChpZmFjZS5kaGNwID8gJ2Rpc2FibGVkJyA6ICcnKTtcblxuICAgICAgICAvLyBJUHY2IEdhdGV3YXk6IHJlYWRvbmx5IHdoZW4gaXB2Nl9tb2RlPScxJyAoQXV0by9TTEFBQyksIGVkaXRhYmxlIHdoZW4gaXB2Nl9tb2RlPScyJyAoTWFudWFsKSBvciAnMCcgKE9mZilcbiAgICAgICAgY29uc3QgaXB2NkdhdGV3YXlSZWFkb25seSA9IGlmYWNlLmlwdjZfbW9kZSA9PT0gJzEnID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBpcHY2R2F0ZXdheURpc2FibGVkQ2xhc3MgPSBpZmFjZS5pcHY2X21vZGUgPT09ICcxJyA/ICdkaXNhYmxlZCcgOiAnJztcblxuICAgICAgICAvLyBJUHY2IGZpZWxkcyB2aXNpYmlsaXR5OiBoaWRlIHdoZW4gaXB2Nl9tb2RlPScwJyAoT2ZmKSwgc2hvdyB3aGVuICcxJyAoQXV0bykgb3IgJzInIChNYW51YWwpXG4gICAgICAgIGNvbnN0IGlwdjZGaWVsZHNWaXNpYmxlID0gaWZhY2UuaXB2Nl9tb2RlID09PSAnMCcgPyAnc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCInIDogJyc7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBJUCwgc3VibmV0LCBWTEFOIGFyZSByZWFkb25seVxuICAgICAgICBjb25zdCBkb2NrZXJSZWFkb25seSA9IGlzRG9ja2VyID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBkb2NrZXJEaXNhYmxlZENsYXNzID0gaXNEb2NrZXIgPyAnZGlzYWJsZWQnIDogJyc7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGFuZCBhbHdheXMgY2hlY2tlZFxuICAgICAgICBjb25zdCBkaGNwRGlzYWJsZWQgPSBpc0RvY2tlciB8fCBpZmFjZS52bGFuaWQgPiAwO1xuICAgICAgICBjb25zdCBkaGNwQ2hlY2tlZCA9IGlzRG9ja2VyIHx8IChpZmFjZS52bGFuaWQgPiAwID8gZmFsc2UgOiBpZmFjZS5kaGNwKTtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudCAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmludGVyZmFjZX1cIiAvPlxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/IGBcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgdmFsdWU9XCJvblwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJzI0J31cIiAvPlxuICAgICAgICAgICAgICAgIGAgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlIHx8ICdJbnRlcm5ldCBJbnRlcmZhY2UnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyAnJyA6IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveCR7ZGhjcERpc2FibGVkID8gJyBkaXNhYmxlZCcgOiAnJ31cIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiAke2RoY3BDaGVja2VkID8gJ2NoZWNrZWQnIDogJyd9ICR7ZGhjcERpc2FibGVkID8gJ2Rpc2FibGVkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkaGNwLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtkaGNwQ2hlY2tlZCA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSGVhZGVyIHx8ICdESENQIENvbmZpZ3VyYXRpb24gT2J0YWluZWQnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9JUCB8fCAnSVAgQWRkcmVzcyd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwYWRkciB8fCBpZmFjZS5pcGFkZHIgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvU3VibmV0IHx8ICdTdWJuZXQnfTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50U3VibmV0IHx8IGlmYWNlLnN1Ym5ldCB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9HYXRld2F5IHx8ICdHYXRld2F5J306IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50R2F0ZXdheSB8fCBpZmFjZS5nYXRld2F5IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0ROUyB8fCAnRE5TJ306IDxzdHJvbmc+JHtpZmFjZS5wcmltYXJ5ZG5zIHx8ICdOL0EnfSR7aWZhY2Uuc2Vjb25kYXJ5ZG5zID8gJywgJyArIGlmYWNlLnNlY29uZGFyeWRucyA6ICcnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aWZhY2UuZG9tYWluID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0RvbWFpbiB8fCAnRG9tYWluJ306IDxzdHJvbmc+JHtpZmFjZS5kb21haW59PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aWZhY2UuaG9zdG5hbWUgPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSG9zdG5hbWUgfHwgJ0hvc3RuYW1lJ306IDxzdHJvbmc+JHtpZmFjZS5ob3N0bmFtZX08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAke2RvY2tlclJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UudmxhbmlkIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZSB8fCAnSVB2NiBNb2RlJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjZfbW9kZV8ke2lkfVwiIG5hbWU9XCJpcHY2X21vZGVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9tb2RlIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDwhLS0gSGlkZGVuIGZpZWxkIHRvIHN0b3JlIGN1cnJlbnQgYXV0by1jb25maWd1cmVkIElQdjYgYWRkcmVzcyBmb3IgZHVhbC1zdGFjayBkZXRlY3Rpb24gLS0+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImN1cnJlbnQtaXB2NmFkZHItJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudElwdjZhZGRyIHx8ICcnfVwiIC8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtpZmFjZS5pcHY2X21vZGUgPT09ICcxJyA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0hlYWRlciB8fCAnSVB2NiBBdXRvY29uZmlndXJhdGlvbiAoU0xBQUMvREhDUHY2KSd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9BZGRyZXNzIHx8ICdJUHY2IEFkZHJlc3MnfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2YWRkciB8fCBpZmFjZS5pcHY2YWRkciB8fCAnQXV0b2NvbmZpZ3VyZWQnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9QcmVmaXggfHwgJ1ByZWZpeCBMZW5ndGgnfTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50SXB2Nl9zdWJuZXQgfHwgaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyhpZmFjZS5jdXJyZW50SXB2Nl9nYXRld2F5IHx8IGlmYWNlLmlwdjZfZ2F0ZXdheSkgPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0dhdGV3YXkgfHwgJ0dhdGV3YXknfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5fTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyhpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczYpID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9ETlMgfHwgJ0ROUyd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnM2IHx8IGlmYWNlLnByaW1hcnlkbnM2fSR7KGlmYWNlLmN1cnJlbnRTZWNvbmRhcnlkbnM2IHx8IGlmYWNlLnNlY29uZGFyeWRuczYpID8gJywgJyArIChpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2KSA6ICcnfTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1tYW51YWwtZmllbGRzLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZml2ZSB3aWRlIGZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBZGRyZXNzIHx8ICdJUHY2IEFkZHJlc3MnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2YWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2YWRkciB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cImZkMDA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlN1Ym5ldCB8fCAnSVB2NiBQcmVmaXggTGVuZ3RoJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIG5hbWU9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG5zLWdhdGV3YXktZ3JvdXAtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgZGl2aWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0U2V0dGluZ3MgfHwgJ0ludGVybmV0IFNldHRpbmdzJ308L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Ib3N0bmFtZSB8fCAnSG9zdG5hbWUnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJob3N0bmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5ob3N0bmFtZSB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIm1pa29wYnhcIiAke2dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb21haW4gfHwgJ0RvbWFpbid9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7Z2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImRvbWFpbl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5kb21haW4gfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJleGFtcGxlLmNvbVwiICR7Z2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0dhdGV3YXl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiICR7Z2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBpcHY2LWdhdGV3YXktZmllbGQtJHtpZH1cIiAke2lwdjZGaWVsZHNWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2R2F0ZXdheSB8fCAnSVB2NiBHYXRld2F5J308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtpcHY2R2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2X2dhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudElwdjZfZ2F0ZXdheSB8fCBpZmFjZS5pcHY2X2dhdGV3YXkgfHwgJyd9XCIgJHtpcHY2R2F0ZXdheVJlYWRvbmx5fSBwbGFjZWhvbGRlcj1cImZlODA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zRGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnByaW1hcnlkbnMgfHwgJyd9XCIgJHtkbnNSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zRGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJzZWNvbmRhcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc2Vjb25kYXJ5ZG5zIHx8ICcnfVwiICR7ZG5zUmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIGlwdjYtcHJpbWFyeWRucy1maWVsZC0ke2lkfVwiICR7aXB2NkZpZWxkc1Zpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZQcmltYXJ5RE5TIHx8ICdQcmltYXJ5IElQdjYgRE5TJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnM2XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRQcmltYXJ5ZG5zNiB8fCBpZmFjZS5wcmltYXJ5ZG5zNiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIjIwMDE6NDg2MDo0ODYwOjo4ODg4XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpZH1cIiAke2lwdjZGaWVsZHNWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U2Vjb25kYXJ5RE5TIHx8ICdTZWNvbmRhcnkgSVB2NiBETlMnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiMjAwMTo0ODYwOjQ4NjA6Ojg4NDRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiMjRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiNDA5NVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBJUHY2IHN1Ym5ldCBwcmVmaXggb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgKC8xIHRvIC8xMjgpXG4gICAgICovXG4gICAgZ2V0SXB2NlN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtdO1xuICAgICAgICAvLyBHZW5lcmF0ZSAvMSB0byAvMTI4IChjb21tb246IC82NCwgLzQ4LCAvNTYsIC8xMjgpXG4gICAgICAgIGZvciAobGV0IGkgPSAxMjg7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICBsZXQgZGVzY3JpcHRpb24gPSBgLyR7aX1gO1xuICAgICAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9ucyBmb3IgY29tbW9uIHByZWZpeGVzXG4gICAgICAgICAgICBpZiAoaSA9PT0gMTI4KSBkZXNjcmlwdGlvbiArPSAnIChTaW5nbGUgaG9zdCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNjQpIGRlc2NyaXB0aW9uICs9ICcgKFN0YW5kYXJkIHN1Ym5ldCknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNTYpIGRlc2NyaXB0aW9uICs9ICcgKFNtYWxsIG5ldHdvcmspJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDQ4KSBkZXNjcmlwdGlvbiArPSAnIChMYXJnZSBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSAzMikgZGVzY3JpcHRpb24gKz0gJyAoSVNQIGFzc2lnbm1lbnQpJztcblxuICAgICAgICAgICAgb3B0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IGRlc2NyaXB0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFdIWTogQm90aCBEb2NrZXIgYW5kIG5vbi1Eb2NrZXIgbm93IHVzZSBpbnRlcmZhY2UgdGFic1xuICAgICAgICAvLyBEb2NrZXIgaGFzIHJlc3RyaWN0aW9uczogREhDUCBsb2NrZWQsIElQL3N1Ym5ldC9WTEFOIHJlYWRvbmx5LCBETlMgZWRpdGFibGVcbiAgICAgICAgbmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBkYXRhLmlzRG9ja2VyIHx8IGZhbHNlKTtcblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gV0hZOiBObyBtYXBwaW5nIG5lZWRlZCAtIEFQSSByZXR1cm5zIGtleXMgbWF0Y2hpbmcgZm9ybSBmaWVsZCBuYW1lc1xuICAgICAgICAgICAgLy8gKGUuZy4sICdleHRlcm5hbFNJUFBvcnQnIGZyb20gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUIGNvbnN0YW50KVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wb3J0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YS5wb3J0c1trZXldO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVB2NiBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwdjZhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgLy8gSVB2NiByZWdleCBwYXR0ZXJuXG4gICAgLy8gU3VwcG9ydHMgZnVsbCBmb3JtLCBjb21wcmVzc2VkIGZvcm0gKDo6KSwgSVB2NC1tYXBwZWQgKDo6ZmZmZjoxOTIuMC4yLjEpLCBsaW5rLWxvY2FsIChmZTgwOjoxJWV0aDApXG4gICAgY29uc3QgaXB2NlBhdHRlcm4gPSAvXigoWzAtOWEtZkEtRl17MSw0fTopezd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKSkkLztcbiAgICByZXR1cm4gaXB2NlBhdHRlcm4udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyAoSVB2NCBvciBJUHY2KS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyZXNzID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIodmFsdWUpIHx8ICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkcih2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZXh0aXBhZGRyIChpbnB1dG1hc2sgbWF5IHJldHVybiBcIl8uXy5fLl9cIiBmb3IgZW1wdHkpXG4gICAgICAgIGNvbnN0IGV4dGlwYWRkciA9IG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IGV4dGhvc3RuYW1lID0gKGFsbFZhbHVlcy5leHRob3N0bmFtZSB8fCAnJykudHJpbSgpO1xuICAgICAgICBpZiAoZXh0aG9zdG5hbWUgPT09ICcnICYmIGV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICAkdGFibGVDb250YWluZXI6IG51bGwsXG4gICAgJGVtcHR5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWNoZSBlbGVtZW50c1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFNob3cvaGlkZSBzZWN0aW9uIGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVyZmFjZUNvdW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykubm90KCdbZGF0YS10YWI9XCIwXCJdJykubGVuZ3RoO1xuICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYSByb3V0ZSByb3cgKGNyZWF0ZSBkdXBsaWNhdGUpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRzb3VyY2VSb3cgLSBTb3VyY2Ugcm93IHRvIGNvcHlcbiAgICAgKi9cbiAgICBjb3B5Um91dGUoJHNvdXJjZVJvdykge1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gJHNvdXJjZVJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAvLyBDb2xsZWN0IGRhdGEgZnJvbSBzb3VyY2Ugcm93XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YSA9IHtcbiAgICAgICAgICAgIG5ldHdvcms6ICRzb3VyY2VSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgIGdhdGV3YXk6ICRzb3VyY2VSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkc291cmNlUm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIG5ldyByb3V0ZSB3aXRoIGNvcGllZCBkYXRhXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGVEYXRhKTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGVtcHR5IHN0YXRlIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB1cGRhdGVFbXB0eVN0YXRlKCkge1xuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXIsIGhpZGUgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZW1wdHkgcGxhY2Vob2xkZXIsIHNob3cgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlRGF0YSAtIFJvdXRlIGRhdGEgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGFkZFJvdXRlKHJvdXRlRGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLnJvdXRlLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHJvdXRlRGF0YT8uaWQgfHwgYG5ld18ke0RhdGUubm93KCl9YDtcblxuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JvdXRlLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JvdXRlLXJvdycpXG4gICAgICAgICAgICAuYXR0cignZGF0YS1yb3V0ZS1pZCcsIHJvdXRlSWQpXG4gICAgICAgICAgICAuc2hvdygpO1xuXG4gICAgICAgIC8vIFNldCB2YWx1ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHJvdXRlRGF0YSkge1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbChyb3V0ZURhdGEubmV0d29yayk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKHJvdXRlRGF0YS5nYXRld2F5KTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKHJvdXRlRGF0YS5kZXNjcmlwdGlvbiB8fCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZXhpc3RpbmdSb3dzLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVTdWJuZXREcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5pbnRlcmZhY2UgfHwgJycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXRtYXNrIGZvciBJUCBhZGRyZXNzIGZpZWxkc1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG5cbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIHN1Ym5ldCB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdWJuZXREcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5zdWJuZXQtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIGludGVyZmFjZSB2YWx1ZSAoZW1wdHkgc3RyaW5nID0gYXV0bylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuaW50ZXJmYWNlLWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gb3B0aW9uczogXCJBdXRvXCIgKyBhdmFpbGFibGUgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19BdXRvIHx8ICdBdXRvJyB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gcm91dGVzXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==