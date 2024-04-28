"use strict";

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

/* global globalRootUrl,globalTranslate, Form, PbxApi */

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
    gateway: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    primarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    secondarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
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
      }]
    }
  },

  /**
   * Initializes the network settings form.
   */
  initialize: function initialize() {
    networks.toggleDisabledFieldClass();
    $('#eth-interfaces-menu .item').tab(); // Handles the change event of the 'usenat-checkbox'.

    $('#usenat-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$dropDowns.dropdown(); // Handles the change event of the 'dhcp-checkbox'.

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$getMyIpButton.on('click', function (e) {
      e.preventDefault();
      networks.$getMyIpButton.addClass('loading disabled');
      PbxApi.GetExternalIp(networks.cbAfterGetExternalIp);
    }); // Delete additional network interface

    $('.delete-interface').api({
      url: "".concat(globalRootUrl, "network/delete/{value}"),
      method: 'POST',
      beforeSend: function beforeSend(settings) {
        $(this).addClass('loading disabled');
        return settings;
      },

      /**
       * Handles the successful response of the 'delete-interface' API request.
       * @param {object} response - The response object.
       */
      onSuccess: function onSuccess(response) {
        $(this).removeClass('loading disabled');
        $('.ui.message.ajax').remove();
        $.each(response.message, function (index, value) {
          networks.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
        });
        if (response.success) window.location.reload();
      },

      /**
       * Handles the failure response of the 'delete-interface' API request.
       * @param {object} response - The response object.
       */
      onFailure: function onFailure(response) {
        $(this).removeClass('loading disabled');
        $('form').after(response);
      }
    }); // Clear additional network settings

    $('.delete-interface-0').on('click', function () {
      var initialValues = {
        interface_0: '',
        name_0: '',
        dhcp_0: 'on',
        ipaddr_0: '',
        subnet_0: '0'
      };
      networks.$formObj.form('set values', initialValues);
      $('#interface_0').dropdown('restore defaults');
      $('#dhcp-0-checkbox').checkbox('check');
      $('#eth-interfaces-menu .item').tab('change tab', $('#eth-interfaces-menu a.item').first().attr('data-tab'));
    });
    networks.$ipaddressInput.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Hide form elements connected with non docker installations

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    if (response === false) {
      networks.$getMyIpButton.removeClass('loading disabled');
    } else {
      var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
      var portMatch = currentExtIpAddr.match(/:(\d+)$/);
      var port = portMatch ? ':' + portMatch[1] : '';
      var newExtIpAddr = response.ip + port;
      networks.$formObj.form('set value', 'extipaddr', newExtIpAddr);
      networks.$extipaddr.trigger('change');
      networks.$getMyIpButton.removeClass('loading disabled');
    }
  },

  /**
   * Toggles the 'disabled' class for specific fields based on their checkbox state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');

      if ($("#dhcp-".concat(eth, "-checkbox")).checkbox('is unchecked')) {
        $("#ip-address-group-".concat(eth)).removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      } else {
        $("#ip-address-group-".concat(eth)).addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
      }

      networks.addNewFormRules(eth);
    });

    if ($('#usenat-checkbox').checkbox('is checked')) {
      $('.nated-settings-group').removeClass('disabled');
    } else {
      $('.nated-settings-group').addClass('disabled');
    }
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

    networks.validateRules[ipaddrClass] = {
      identifier: ipaddrClass,
      depends: "not-dhcp-".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
      }, {
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    }; // Define the class for the 'dhcp' field in the new row

    var dhcpClass = "dhcp_".concat(newRowId); // Define the form validation rules for the 'dhcp' field

    networks.validateRules[dhcpClass] = {
      identifier: dhcpClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: "dhcpOnVlanNetworks[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateDHCPOnVlansDontSupport
      }]
    };
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = networks.$formObj.form('get values');
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
    Form.$formObj = networks.$formObj;
    Form.url = "".concat(globalRootUrl, "network/save"); // Form submission URL

    Form.validateRules = networks.validateRules; // Form validation rules

    Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
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
};
/**
 * Custom form validation rule for checking if DHCP is enabled on VLAN networks.
 * @param {string} value - The value of the input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the DHCP is not enabled on the VLAN network, false otherwise.
 */


$.fn.form.settings.rules.dhcpOnVlanNetworks = function (value, param) {
  var result = true;
  var vlanValue = networks.$formObj.form('get value', "vlanid_".concat(param));
  var dhcpValue = networks.$formObj.form('get value', "dhcp_".concat(param));

  if (vlanValue > 0 && dhcpValue === 'on') {
    result = false;
  }

  return result;
};
/**
 * Custom form validation rule for checking the presence of external IP host information.
 * @returns {boolean} - True if the external IP host information is provided when NAT is enabled, false otherwise.
 */


$.fn.form.settings.rules.extenalIpHost = function () {
  var allValues = networks.$formObj.form('get values');

  if (allValues.usenat === 'on') {
    if (allValues.exthostname === '' && allValues.extipaddr === '') {
      return false;
    }
  }

  return true;
};
/**
 *  Initialize network settings form on document ready
 */


$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwidGFiIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlBieEFwaSIsIkdldEV4dGVybmFsSXAiLCJjYkFmdGVyR2V0RXh0ZXJuYWxJcCIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwiZWFjaCIsIm1lc3NhZ2UiLCJpbmRleCIsInZhbHVlIiwiYWZ0ZXIiLCJzdWNjZXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJvbkZhaWx1cmUiLCJpbml0aWFsVmFsdWVzIiwiaW50ZXJmYWNlXzAiLCJuYW1lXzAiLCJkaGNwXzAiLCJpcGFkZHJfMCIsInN1Ym5ldF8wIiwiZm9ybSIsImZpcnN0IiwiYXR0ciIsImlucHV0bWFzayIsImFsaWFzIiwiaW5pdGlhbGl6ZUZvcm0iLCJoaWRlIiwiY3VycmVudEV4dElwQWRkciIsInBvcnRNYXRjaCIsIm1hdGNoIiwicG9ydCIsIm5ld0V4dElwQWRkciIsImlwIiwidHJpZ2dlciIsIm9iaiIsImV0aCIsInZhbCIsImFkZE5ld0Zvcm1SdWxlcyIsIm5ld1Jvd0lkIiwibmFtZUNsYXNzIiwiaWRlbnRpZmllciIsIm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSIsInZsYW5DbGFzcyIsIm53X1ZhbGlkYXRlVmxhblJhbmdlIiwibndfVmFsaWRhdGVWbGFuQ3Jvc3MiLCJpcGFkZHJDbGFzcyIsIm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHkiLCJkaGNwQ2xhc3MiLCJud19WYWxpZGF0ZURIQ1BPblZsYW5zRG9udFN1cHBvcnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJmbiIsImlwYWRkciIsImYiLCJpIiwiYSIsImlwYWRkcldpdGhQb3J0T3B0aW9uYWwiLCJjaGVja1ZsYW4iLCJ2bGFuVmFsdWUiLCJwYXJhbSIsImFsbFZhbHVlcyIsInVuZGVmaW5lZCIsIm5ld0V0aE5hbWUiLCJ2bGFuaWRfMCIsImluZGV4T2YiLCJldGhOYW1lIiwic3BsaXQiLCJpbkFycmF5IiwicHVzaCIsImRoY3BPblZsYW5OZXR3b3JrcyIsImRoY3BWYWx1ZSIsImV4dGVuYWxJcEhvc3QiLCJ1c2VuYXQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiQyxFQUFBQSxjQUFjLEVBQUVDLENBQUMsQ0FBQyxVQUFELENBREo7O0FBR2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFB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QUFDRyxRQUFULENBQWtCNEQsSUFBbEIsQ0FBdUIsV0FBdkIsaUJBQTRDMEMsS0FBNUMsRUFBbEI7O0FBQ0EsTUFBSUQsU0FBUyxHQUFHLENBQVosSUFBaUJZLFNBQVMsS0FBSyxJQUFuQyxFQUF5QztBQUNyQ3ZCLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EzRixDQUFDLENBQUMrRixFQUFGLENBQUtsQyxJQUFMLENBQVVyQixRQUFWLENBQW1COUIsS0FBbkIsQ0FBeUJ5RyxhQUF6QixHQUF5QyxZQUFNO0FBQzNDLE1BQU1YLFNBQVMsR0FBRzFHLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQjRELElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUkyQyxTQUFTLENBQUNZLE1BQVYsS0FBcUIsSUFBekIsRUFBK0I7QUFDM0IsUUFBSVosU0FBUyxDQUFDcEYsV0FBVixLQUEwQixFQUExQixJQUFnQ29GLFNBQVMsQ0FBQ3ZGLFNBQVYsS0FBd0IsRUFBNUQsRUFBZ0U7QUFDNUQsYUFBTyxLQUFQO0FBQ0g7QUFDSjs7QUFDRCxTQUFPLElBQVA7QUFDSCxDQVJEO0FBV0E7QUFDQTtBQUNBOzs7QUFDQWpCLENBQUMsQ0FBQ3FILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4SCxFQUFBQSxRQUFRLENBQUN3QixVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ2RoY3AtY2hlY2tib3gnLlxuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuR2V0RXh0ZXJuYWxJcChuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBhZGRpdGlvbmFsIG5ldHdvcmsgaW50ZXJmYWNlXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlJykuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2RlbGV0ZS97dmFsdWV9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhhbmRsZXMgdGhlIHN1Y2Nlc3NmdWwgcmVzcG9uc2Ugb2YgdGhlICdkZWxldGUtaW50ZXJmYWNlJyBBUEkgcmVxdWVzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhhbmRsZXMgdGhlIGZhaWx1cmUgcmVzcG9uc2Ugb2YgdGhlICdkZWxldGUtaW50ZXJmYWNlJyBBUEkgcmVxdWVzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKCdmb3JtJykuYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgYWRkaXRpb25hbCBuZXR3b3JrIHNldHRpbmdzXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlLTAnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsVmFsdWVzID0ge1xuICAgICAgICAgICAgICAgIGludGVyZmFjZV8wOiAnJyxcbiAgICAgICAgICAgICAgICBuYW1lXzA6ICcnLFxuICAgICAgICAgICAgICAgIGRoY3BfMDogJ29uJyxcbiAgICAgICAgICAgICAgICBpcGFkZHJfMDogJycsXG4gICAgICAgICAgICAgICAgc3VibmV0XzA6ICcwJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgaW5pdGlhbFZhbHVlcyk7XG4gICAgICAgICAgICAkKCcjaW50ZXJmYWNlXzAnKS5kcm9wZG93bigncmVzdG9yZSBkZWZhdWx0cycpO1xuICAgICAgICAgICAgJCgnI2RoY3AtMC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmICgkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgbm90LWRoY3AtJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2RoY3AnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGRoY3BDbGFzcyA9IGBkaGNwXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdkaGNwJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2RoY3BDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBkaGNwQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgZGhjcE9uVmxhbk5ldHdvcmtzWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgREhDUCBpcyBlbmFibGVkIG9uIFZMQU4gbmV0d29ya3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBESENQIGlzIG5vdCBlbmFibGVkIG9uIHRoZSBWTEFOIG5ldHdvcmssIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmRoY3BPblZsYW5OZXR3b3JrcyA9ICh2YWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgdmxhbmlkXyR7cGFyYW19YCk7XG4gICAgY29uc3QgZGhjcFZhbHVlID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRoY3BfJHtwYXJhbX1gKTtcbiAgICBpZiAodmxhblZhbHVlID4gMCAmJiBkaGNwVmFsdWUgPT09ICdvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==