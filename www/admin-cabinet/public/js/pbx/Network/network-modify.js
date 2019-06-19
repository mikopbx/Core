"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Form, PbxApi */
var networks = {
  $getMyIpButton: $('#getmyip'),
  $formObj: $('#network-form'),
  vlansArray: {},
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
        type: 'ipaddr',
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
  initialize: function () {
    function initialize() {
      networks.toggleDisabledFieldClass();
      $('#eth-interfaces-menu .item').tab();
      $('#usenat-checkbox').checkbox({
        onChange: function () {
          function onChange() {
            networks.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      $('.dropdown').dropdown();
      $('.dhcp-checkbox').checkbox({
        onChange: function () {
          function onChange() {
            networks.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      networks.$getMyIpButton.on('click', function (e) {
        e.preventDefault();
        networks.$getMyIpButton.addClass('loading disabled');
        PbxApi.GetExternalIp(networks.cbAfterGetExternalIp);
      }); // Удаление дополнительного сетевого интерфейса

      $('.delete-interface').api({
        url: "".concat(globalRootUrl, "network/delete/{value}"),
        method: 'POST',
        beforeSend: function () {
          function beforeSend(settings) {
            $(this).addClass('loading disabled');
            return settings;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            $(this).removeClass('loading disabled');
            $('.ui.message.ajax').remove();
            $.each(response.message, function (index, value) {
              networks.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
            });
            if (response.success) window.location.reload();
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            $(this).removeClass('loading disabled');
            $('form').after(response);
          }

          return onFailure;
        }()
      }); // Очистка настроек дополнительного сетевого

      $('.delete-interface-new').on('click', function () {
        var initialValues = {
          interface_new: '',
          name_new: '',
          dhcp_new: 'on',
          ipaddr_new: '',
          subnet_new: '0'
        };
        networks.$formObj.form('set values', initialValues);
        $('#interface_new').dropdown('restore defaults');
        $('#dhcp-new-checkbox').checkbox('check');
        $('#eth-interfaces-menu .item').tab('change tab', $('#eth-interfaces-menu a.item').first().attr('data-tab'));
      });
      networks.initializeForm();
    }

    return initialize;
  }(),

  /**
   * Обработчик API функции по возврату структуры с IP адресом маршрутизатора
   */
  cbAfterGetExternalIp: function () {
    function cbAfterGetExternalIp(response) {
      if (response === false) {
        networks.$getMyIpButton.removeClass('loading disabled');
      } else {
        networks.$formObj.form('set value', 'extipaddr', response.ip);
        networks.$getMyIpButton.removeClass('loading disabled');
      }
    }

    return cbAfterGetExternalIp;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
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
    }

    return toggleDisabledFieldClass;
  }(),
  addNewFormRules: function () {
    function addNewFormRules(newRowId) {
      var nameClass = "name_".concat(newRowId);
      networks.validateRules[nameClass] = {
        identifier: nameClass,
        depends: "interface_".concat(newRowId),
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateNameIsNotBeEmpty
        }]
      };
      var vlanClass = "vlanid_".concat(newRowId);
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
      };
      var ipaddrClass = "ipaddr_".concat(newRowId);
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
      };
      var dhcpClass = "dhcp_".concat(newRowId);
      networks.validateRules[dhcpClass] = {
        identifier: dhcpClass,
        depends: "interface_".concat(newRowId),
        rules: [{
          type: "dhcpOnVlanNetworks[".concat(newRowId, "]"),
          prompt: globalTranslate.nw_ValidateDHCPOnVlansDontSupport
        }]
      };
    }

    return addNewFormRules;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = networks.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = networks.$formObj;
      Form.url = "".concat(globalRootUrl, "network/save");
      Form.validateRules = networks.validateRules;
      Form.cbBeforeSendForm = networks.cbBeforeSendForm;
      Form.cbAfterSendForm = networks.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};

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

$.fn.form.settings.rules.checkVlan = function (vlanValue, param) {
  var result = true;
  var vlansArray = {};
  var allValues = networks.$formObj.form('get values');

  if (allValues.interface_new !== undefined && allValues.interface_new > 0) {
    var newEthName = allValues["interface_".concat(allValues.interface_new)];
    vlansArray[newEthName] = [allValues.vlanid_new];

    if (allValues.vlanid_new === '') {
      result = false;
    }
  }

  $.each(allValues, function (index, value) {
    if (index === 'interface_new' || index === 'vlanid_new') return;

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

$.fn.form.settings.rules.dhcpOnVlanNetworks = function (value, param) {
  var result = true;
  var vlanValue = networks.$formObj.form('get value', "vlanid_".concat(param));
  var dhcpValue = networks.$formObj.form('get value', "dhcp_".concat(param));

  if (vlanValue > 0 && dhcpValue === 'on') {
    result = false;
  }

  return result;
};

$.fn.form.settings.rules.extenalIpHost = function () {
  var allValues = networks.$formObj.form('get values');

  if (allValues.usenat === 'on') {
    if (allValues.exthostname === '' && allValues.extipaddr === '') {
      return false;
    }
  }

  return true;
};

$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=network-modify.js.map