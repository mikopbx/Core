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
      networks.$formObj.form('set value', 'extipaddr', response.ip);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwidGFiIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlBieEFwaSIsIkdldEV4dGVybmFsSXAiLCJjYkFmdGVyR2V0RXh0ZXJuYWxJcCIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwiZWFjaCIsIm1lc3NhZ2UiLCJpbmRleCIsInZhbHVlIiwiYWZ0ZXIiLCJzdWNjZXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJvbkZhaWx1cmUiLCJpbml0aWFsVmFsdWVzIiwiaW50ZXJmYWNlXzAiLCJuYW1lXzAiLCJkaGNwXzAiLCJpcGFkZHJfMCIsInN1Ym5ldF8wIiwiZm9ybSIsImZpcnN0IiwiYXR0ciIsImlucHV0bWFzayIsImFsaWFzIiwiaW5pdGlhbGl6ZUZvcm0iLCJoaWRlIiwiaXAiLCJ0cmlnZ2VyIiwib2JqIiwiZXRoIiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsImRoY3BDbGFzcyIsIm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImZuIiwiaXBhZGRyIiwiZiIsIm1hdGNoIiwiaSIsImEiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwidmxhblZhbHVlIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJ1bmRlZmluZWQiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsInNwbGl0IiwiaW5BcnJheSIsInB1c2giLCJkaGNwT25WbGFuTmV0d29ya3MiLCJkaGNwVmFsdWUiLCJleHRlbmFsSXBIb3N0IiwidXNlbmF0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVB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USxDQUFDRyxRQUFULENBQWtCNEQsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBbEI7O0FBQ0EsTUFBSXVDLFNBQVMsQ0FBQ1ksTUFBVixLQUFxQixJQUF6QixFQUErQjtBQUMzQixRQUFJWixTQUFTLENBQUNoRixXQUFWLEtBQTBCLEVBQTFCLElBQWdDZ0YsU0FBUyxDQUFDbkYsU0FBVixLQUF3QixFQUE1RCxFQUFnRTtBQUM1RCxhQUFPLEtBQVA7QUFDSDtBQUNKOztBQUNELFNBQU8sSUFBUDtBQUNILENBUkQ7QUFXQTtBQUNBO0FBQ0E7OztBQUNBakIsQ0FBQyxDQUFDaUgsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBILEVBQUFBLFFBQVEsQ0FBQ3dCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG5ldHdvcmsgc2V0dGluZ3NcbiAqXG4gKiBAbW9kdWxlIG5ldHdvcmtzXG4gKi9cbmNvbnN0IG5ldHdvcmtzID0ge1xuICAgICRnZXRNeUlwQnV0dG9uOiAkKCcjZ2V0bXlpcCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI25ldHdvcmstZm9ybScpLFxuXG4gICAgJGRyb3BEb3duczogJCgnI25ldHdvcmstZm9ybSAuZHJvcGRvd24nKSxcbiAgICAkZXh0aXBhZGRyOiAkKCcjZXh0aXBhZGRyJyksXG4gICAgJGlwYWRkcmVzc0lucHV0OiAkKCcuaXBhZGRyZXNzJyksXG4gICAgdmxhbnNBcnJheToge30sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudHMgd2l0aCB3ZSBzaG91bGQgaGlkZSBmcm9tIHRoZSBmb3JtIGZvciBkb2NrZXIgaW5zdGFsbGF0aW9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG5vdFNob3dPbkRvY2tlckRpdnM6ICQoJy5kby1ub3Qtc2hvdy1pZi1kb2NrZXInKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBnYXRld2F5OiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByaW1hcnlkbnM6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2Vjb25kYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAnZGhjcC1jaGVja2JveCcuXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94JylcbiAgICAgICAgICAgIC5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5HZXRFeHRlcm5hbElwKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGFkZGl0aW9uYWwgbmV0d29yayBpbnRlcmZhY2VcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvZGVsZXRlL3t2YWx1ZX1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGFuZGxlcyB0aGUgc3VjY2Vzc2Z1bCByZXNwb25zZSBvZiB0aGUgJ2RlbGV0ZS1pbnRlcmZhY2UnIEFQSSByZXF1ZXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UubWVzc2FnZSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7dmFsdWV9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGFuZGxlcyB0aGUgZmFpbHVyZSByZXNwb25zZSBvZiB0aGUgJ2RlbGV0ZS1pbnRlcmZhY2UnIEFQSSByZXF1ZXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoJ2Zvcm0nKS5hZnRlcihyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhciBhZGRpdGlvbmFsIG5ldHdvcmsgc2V0dGluZ3NcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UtMCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxWYWx1ZXMgPSB7XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlXzA6ICcnLFxuICAgICAgICAgICAgICAgIG5hbWVfMDogJycsXG4gICAgICAgICAgICAgICAgZGhjcF8wOiAnb24nLFxuICAgICAgICAgICAgICAgIGlwYWRkcl8wOiAnJyxcbiAgICAgICAgICAgICAgICBzdWJuZXRfMDogJzAnLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBpbml0aWFsVmFsdWVzKTtcbiAgICAgICAgICAgICQoJyNpbnRlcmZhY2VfMCcpLmRyb3Bkb3duKCdyZXN0b3JlIGRlZmF1bHRzJyk7XG4gICAgICAgICAgICAkKCcjZGhjcC0wLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYignY2hhbmdlIHRhYicsICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCkuYXR0cignZGF0YS10YWInKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgcmVzcG9uc2UuaXApO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgJ2Rpc2FibGVkJyBjbGFzcyBmb3Igc3BlY2lmaWMgZmllbGRzIGJhc2VkIG9uIHRoZWlyIGNoZWNrYm94IHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgaWYgKCQoYCNkaGNwLSR7ZXRofS1jaGVja2JveGApLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgI2lwLWFkZHJlc3MtZ3JvdXAtJHtldGh9YCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgbmV3IGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgYSBzcGVjaWZpYyByb3cgaW4gdGhlIG5ldHdvcmsgY29uZmlndXJhdGlvbiBmb3JtLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdSb3dJZCAtIFRoZSBJRCBvZiB0aGUgbmV3IHJvdyB0byBhZGQgdGhlIGZvcm0gcnVsZXMgZm9yLlxuICAgICAqL1xuICAgIGFkZE5ld0Zvcm1SdWxlcyhuZXdSb3dJZCkge1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnbmFtZScgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgbmFtZUNsYXNzID0gYG5hbWVfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ25hbWUnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbbmFtZUNsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IG5hbWVDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAndmxhbmlkJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCB2bGFuQ2xhc3MgPSBgdmxhbmlkXyR7bmV3Um93SWR9YDtcblxuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1t2bGFuQ2xhc3NdID0ge1xuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiB2bGFuQ2xhc3MsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uNDA5NV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5SYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYGNoZWNrVmxhblske25ld1Jvd0lkfV1gLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5Dcm9zcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBpcGFkZHJDbGFzcyA9IGBpcGFkZHJfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2lwYWRkcicgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBub3QtZGhjcC0ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnZGhjcCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgZGhjcENsYXNzID0gYGRoY3BfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2RoY3AnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbZGhjcENsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IGRoY3BDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBkaGNwT25WbGFuTmV0d29ya3NbJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVESENQT25WbGFuc0RvbnRTdXBwb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiBESENQIGlzIGVuYWJsZWQgb24gVkxBTiBuZXR3b3Jrcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIERIQ1AgaXMgbm90IGVuYWJsZWQgb24gdGhlIFZMQU4gbmV0d29yaywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZGhjcE9uVmxhbk5ldHdvcmtzID0gKHZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5WYWx1ZSA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGB2bGFuaWRfJHtwYXJhbX1gKTtcbiAgICBjb25zdCBkaGNwVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGhjcF8ke3BhcmFtfWApO1xuICAgIGlmICh2bGFuVmFsdWUgPiAwICYmIGRoY3BWYWx1ZSA9PT0gJ29uJykge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy5leHRob3N0bmFtZSA9PT0gJycgJiYgYWxsVmFsdWVzLmV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19