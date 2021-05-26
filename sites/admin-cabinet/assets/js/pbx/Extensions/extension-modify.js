"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Extensions, Form,
 PbxApi, DebuggerInfo, InputMaskPatterns */
var extension = {
  defaultEmail: '',
  defaultNumber: '',
  defaultMobileNumber: '',
  $number: $('#number'),
  $sip_secret: $('#sip_secret'),
  $mobile_number: $('#mobile_number'),
  $fwd_forwarding: $('#fwd_forwarding'),
  $fwd_forwardingonbusy: $('#fwd_forwardingonbusy'),
  $fwd_forwardingonunavailable: $('#fwd_forwardingonunavailable'),
  $email: $('#user_email'),
  $formObj: $('#extensions-form'),
  $tabMenuItems: $('#extensions-menu .item'),
  forwardingSelect: '#extensions-form .forwarding-select',
  validateRules: {
    number: {
      identifier: 'number',
      rules: [{
        type: 'number',
        prompt: globalTranslate.ex_ValidateExtensionNumber
      }, {
        type: 'empty',
        prompt: globalTranslate.ex_ValidateNumberIsEmpty
      }, {
        type: 'existRule[number-error]',
        prompt: globalTranslate.ex_ValidateNumberIsDouble
      }]
    },
    mobile_number: {
      optional: true,
      identifier: 'mobile_number',
      rules: [{
        type: 'mask',
        prompt: globalTranslate.ex_ValidateMobileIsNotCorrect
      }, {
        type: 'existRule[mobile-number-error]',
        prompt: globalTranslate.ex_ValidateMobileNumberIsDouble
      }]
    },
    user_email: {
      optional: true,
      identifier: 'user_email',
      rules: [{
        type: 'email',
        prompt: globalTranslate.ex_ValidateEmailEmpty
      }]
    },
    user_username: {
      identifier: 'user_username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ex_ValidateUsernameEmpty
      }]
    },
    sip_secret: {
      identifier: 'sip_secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ex_ValidateSecretEmpty
      }]
    },
    fwd_ringlength: {
      identifier: 'fwd_ringlength',
      depends: 'fwd_forwarding',
      rules: [{
        type: 'integer[3..180]',
        prompt: globalTranslate.ex_ValidateRingingBeforeForwardOutOfRange
      }]
    },
    fwd_forwarding: {
      optional: true,
      identifier: 'fwd_forwarding',
      rules: [{
        type: 'extensionRule',
        prompt: globalTranslate.ex_ValidateForwardingToBeFilled
      }, {
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    },
    fwd_forwardingonbusy: {
      identifier: 'fwd_forwardingonbusy',
      rules: [{
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    },
    fwd_forwardingonunavailable: {
      identifier: 'fwd_forwardingonunavailable',
      rules: [{
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    }
  },
  initialize: function initialize() {
    extension.defaultEmail = extension.$email.inputmask('unmaskedvalue');
    extension.defaultMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
    extension.defaultNumber = extension.$number.inputmask('unmaskedvalue');
    extension.$tabMenuItems.tab();
    $('#extensions-form .ui.accordion').accordion();
    $('#extensions-form .dropdown').dropdown();
    $('#qualify').checkbox({
      onChange: function onChange() {
        if ($('#qualify').checkbox('is checked')) {
          $('#qualify-freq').removeClass('disabled');
        } else {
          $('#qualify-freq').addClass('disabled');
        }
      }
    });
    $(extension.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());
    if ($('#sip_secret').val() === '') extension.generateNewSipPassword();
    $('#generate-new-password').on('click', function (e) {
      e.preventDefault();
      extension.generateNewSipPassword();
      extension.$sip_secret.trigger('change');
    });
    extension.$number.inputmask('option', {
      oncomplete: extension.cbOnCompleteNumber
    });
    var maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
    extension.$mobile_number.inputmasks({
      inputmask: {
        definitions: {
          '#': {
            validator: '[0-9]',
            cardinality: 1
          }
        },
        oncleared: extension.cbOnClearedMobileNumber,
        oncomplete: extension.cbOnCompleteMobileNumber,
        onBeforePaste: extension.cbOnMobileNumberBeforePaste,
        showMaskOnHover: false
      },
      match: /[0-9]/,
      replace: '9',
      list: maskList,
      listKey: 'mask'
    });
    extension.$email.inputmask('email', {
      onUnMask: extension.cbOnUnmaskEmail,
      oncomplete: extension.cbOnCompleteEmail
    });
    extension.initializeForm();
  },

  /**
   * Callback after paste license coupon
   */
  cbOnMobileNumberBeforePaste: function cbOnMobileNumberBeforePaste(pastedValue) {
    return pastedValue;
  },

  /**
   * Вызывается после воода номера телефона для проверки нет ли пересечений с
   * существующими номерами
   */
  cbOnCompleteNumber: function cbOnCompleteNumber() {
    var newNumber = extension.$number.inputmask('unmaskedvalue');
    var userId = extension.$formObj.form('get value', 'user_id');
    Extensions.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
  },

  /**
   * Вызывается после ввода полного Email адреса
   */
  cbOnCompleteEmail: function cbOnCompleteEmail() {
    // Динамическая прововерка свободен ли Email
    $.api({
      url: "".concat(globalRootUrl, "users/available/{value}"),
      stateContext: '.ui.input.email',
      on: 'now',
      beforeSend: function beforeSend(settings) {
        var result = settings;
        result.urlData = {
          value: extension.$email.inputmask('unmaskedvalue')
        };
        return result;
      },
      onSuccess: function onSuccess(response) {
        if (response.emailAvailable || extension.defaultEmail === extension.$email.inputmask('unmaskedvalue')) {
          $('.ui.input.email').parent().removeClass('error');
          $('#email-error').addClass('hidden');
        } else {
          $('.ui.input.email').parent().addClass('error');
          $('#email-error').removeClass('hidden');
        }
      }
    });
  },

  /**
   * Вызывается при получении безмасочного значения
   */
  cbOnUnmaskEmail: function cbOnUnmaskEmail(maskedValue, unmaskedValue) {
    return unmaskedValue;
  },

  /**
   * Вызывается при вводе мобильного телефона в карточке сотрудника
   */
  cbOnCompleteMobileNumber: function cbOnCompleteMobileNumber() {
    console.log('cbOnCompleteMobileNumber');
    var newMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
    var userId = extension.$formObj.form('get value', 'user_id'); // Динамическая прововерка свободен ли выбранный мобильный номер

    Extensions.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId); // Перезаполним строку донабора

    if (newMobileNumber !== extension.defaultMobileNumber || extension.$formObj.form('get value', 'mobile_dialstring').length === 0) {
      extension.$formObj.form('set value', 'mobile_dialstring', newMobileNumber);
    } // Проверим не менялся ли мобильный номер


    if (newMobileNumber !== extension.defaultMobileNumber) {
      var userName = extension.$formObj.form('get value', 'user_username'); // Проверим не была ли настроена переадресация на мобильный номер

      if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
        if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0) {
          extension.$formObj.form('set value', 'fwd_ringlength', 45);
        }

        extension.$fwd_forwarding.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwarding', newMobileNumber);
      }

      if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
        extension.$fwd_forwardingonbusy.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonbusy', newMobileNumber);
      }

      if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
        extension.$fwd_forwardingonunavailable.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonunavailable', newMobileNumber);
      }
    }

    extension.defaultMobileNumber = newMobileNumber;
    console.log("new mobile number ".concat(extension.defaultMobileNumber, " "));
  },

  /**
   * Вызывается при очистке мобильного телефона в карточке сотрудника
   */
  cbOnClearedMobileNumber: function cbOnClearedMobileNumber() {
    extension.$formObj.form('set value', 'mobile_dialstring', '');
    extension.$formObj.form('set value', 'mobile_number', ''); // Проверим не была ли настроена переадресация на мобильный номер

    if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
      extension.$formObj.form('set value', 'fwd_ringlength', '');
      extension.$fwd_forwarding.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwarding', -1);
    }

    if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
      extension.$fwd_forwardingonbusy.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwardingonbusy', -1);
    }

    if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
      extension.$fwd_forwardingonunavailable.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwardingonunavailable', -1);
    }

    extension.defaultMobileNumber = '';
  },

  /**
   * generateNewSipPassword() Работа с паролем SIP учетки
   */
  generateNewSipPassword: function generateNewSipPassword() {
    var chars = 'abcdef1234567890';
    var pass = '';

    for (var x = 0; x < 32; x += 1) {
      var i = Math.floor(Math.random() * chars.length);
      pass += chars.charAt(i);
    }

    extension.$sip_secret.val(pass);
  },
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = extension.$formObj.form('get values');
    result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue');
    return result;
  },
  cbAfterSendForm: function cbAfterSendForm() {
    extension.defaultNumber = extension.$number.val();
    Extensions.UpdatePhoneRepresent(extension.defaultNumber);
  },
  initializeForm: function initializeForm() {
    Form.$formObj = extension.$formObj;
    Form.url = "".concat(globalRootUrl, "extensions/save");
    Form.validateRules = extension.validateRules;
    Form.cbBeforeSendForm = extension.cbBeforeSendForm;
    Form.cbAfterSendForm = extension.cbAfterSendForm;
    Form.initialize();
  }
};
var avatar = {
  $picture: $('#avatar'),
  initialize: function initialize() {
    if (avatar.$picture.attr('src') === '') {
      avatar.$picture.attr('src', "".concat(globalRootUrl, "assets/img/unknownPerson.jpg"));
    }

    $('#upload-new-avatar').on('click', function () {
      $('#file-select').click();
    });
    $('#clear-avatar').on('click', function () {
      avatar.$picture.attr('src', "".concat(globalRootUrl, "assets/img/unknownPerson.jpg"));
      extension.$formObj.form('set value', 'user_avatar', null);
      extension.$sip_secret.trigger('change');
    });
    $('#file-select').on('change', function (e) {
      var image;
      e.preventDefault();
      var dataTransfer = 'dataTransfer' in e ? e.dataTransfer.files : [];
      var images = 'files' in e.target ? e.target.files : dataTransfer;

      if (images && images.length) {
        Array.from(images).forEach(function (curImage) {
          if (_typeof(curImage) !== 'object') return;
          image = new Image();
          image.src = avatar.createObjectURL(curImage);

          image.onload = function (event) {
            var args = {
              src: event.target,
              width: 200,
              height: 200,
              type: 'image/png',
              compress: 90
            };
            var mybase64resized = avatar.resizeCrop(args);
            avatar.$picture.attr('src', mybase64resized);
            extension.$formObj.form('set value', 'user_avatar', mybase64resized);
            extension.$sip_secret.trigger('change');
          };
        });
      }
    });
  },
  resizeCrop: function resizeCrop(_ref) {
    var src = _ref.src,
        width = _ref.width,
        height = _ref.height,
        type = _ref.type,
        compress = _ref.compress;
    var newWidth = width;
    var newHeight = height;
    var crop = newWidth === 0 || newHeight === 0; // not resize

    if (src.width <= newWidth && newHeight === 0) {
      newWidth = src.width;
      newHeight = src.height;
    } // resize


    if (src.width > newWidth && newHeight === 0) {
      newHeight = src.height * (newWidth / src.width);
    } // check scale


    var xscale = newWidth / src.width;
    var yscale = newHeight / src.height;
    var scale = crop ? Math.min(xscale, yscale) : Math.max(xscale, yscale); // create empty canvas

    var canvas = document.createElement('canvas');
    canvas.width = newWidth || Math.round(src.width * scale);
    canvas.height = newHeight || Math.round(src.height * scale);
    canvas.getContext('2d').scale(scale, scale); // crop it top center

    canvas.getContext('2d').drawImage(src, (src.width * scale - canvas.width) * -0.5, (src.height * scale - canvas.height) * -0.5);
    return canvas.toDataURL(type, compress);
  },
  createObjectURL: function createObjectURL(i) {
    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    return URL.createObjectURL(i);
  }
};
var extensionStatusLoopWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $statusLabel: $('#status'),

  /**
   * initialize() создание объектов и запуск их
   */
  initialize: function initialize() {
    DebuggerInfo.initialize();

    if (extension.$formObj.form('get value', 'id') !== '') {
      extensionStatusLoopWorker.restartWorker();
    }
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
    extensionStatusLoopWorker.worker();
  },
  worker: function worker() {
    if (extension.defaultNumber.length === 0) return;
    var param = {
      peer: extension.defaultNumber
    };
    window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
    PbxApi.GetPeerStatus(param, extensionStatusLoopWorker.cbRefreshExtensionStatus);
  },

  /**
   * cbRefreshExtensionStatus() Обновление статусов пира
   */
  cbRefreshExtensionStatus: function cbRefreshExtensionStatus(response) {
    extensionStatusLoopWorker.timeoutHandle = window.setTimeout(extensionStatusLoopWorker.worker, extensionStatusLoopWorker.timeOut);
    if (response.length === 0 || response === false) return;
    var $status = extensionStatusLoopWorker.$statusLabel;
    var htmlTable = '<table class="ui very compact table">';
    $.each(response, function (key, value) {
      htmlTable += '<tr>';
      htmlTable += "<td>".concat(key, "</td>");
      htmlTable += "<td>".concat(value, "</td>");
      htmlTable += '</tr>';
    });
    htmlTable += '</table>';
    DebuggerInfo.UpdateContent(htmlTable);

    if ('Status' in response && response.Status.toUpperCase().indexOf('REACHABLE') >= 0) {
      $status.removeClass('grey').addClass('green');
    } else {
      $status.removeClass('green').addClass('grey');
    }

    if ($status.hasClass('green')) {
      $status.html(globalTranslate.ex_Online);
    } else {
      $status.html(globalTranslate.ex_Offline);
    }
  }
}; // Если выбран вариант переадресации на номер, а сам номер не выбран

$.fn.form.settings.rules.extensionRule = function () {
  var fwdRingLength = extension.$formObj.form('get value', 'fwd_ringlength');
  var fwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');

  if (fwdForwarding.length > 0 && (fwdRingLength === '0' || fwdRingLength === '')) {
    return false;
  }

  return true;
}; // Проверка нет ли ошибки занятого другой учеткой номера


$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

$(document).ready(function () {
  extension.initialize();
  avatar.initialize();
  extensionStatusLoopWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsImlucHV0bWFzayIsInRhYiIsImFjY29yZGlvbiIsImRyb3Bkb3duIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJvbkJlZm9yZVBhc3RlIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJvblVuTWFzayIsImNiT25Vbm1hc2tFbWFpbCIsImNiT25Db21wbGV0ZUVtYWlsIiwiaW5pdGlhbGl6ZUZvcm0iLCJwYXN0ZWRWYWx1ZSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwiY29uc29sZSIsImxvZyIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBR0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxZQUFZLEVBQUUsRUFERztBQUVqQkMsRUFBQUEsYUFBYSxFQUFFLEVBRkU7QUFHakJDLEVBQUFBLG1CQUFtQixFQUFFLEVBSEo7QUFJakJDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKTztBQUtqQkMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsYUFBRCxDQUxHO0FBTWpCRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5BO0FBT2pCRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQVBEO0FBUWpCSSxFQUFBQSxxQkFBcUIsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBUlA7QUFTakJLLEVBQUFBLDRCQUE0QixFQUFFTCxDQUFDLENBQUMsOEJBQUQsQ0FUZDtBQVVqQk0sRUFBQUEsTUFBTSxFQUFFTixDQUFDLENBQUMsYUFBRCxDQVZRO0FBV2pCTyxFQUFBQSxRQUFRLEVBQUVQLENBQUMsQ0FBQyxrQkFBRCxDQVhNO0FBWWpCUSxFQUFBQSxhQUFhLEVBQUVSLENBQUMsQ0FBQyx3QkFBRCxDQVpDO0FBYWpCUyxFQUFBQSxnQkFBZ0IsRUFBRSxxQ0FiRDtBQWNqQkMsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLE1BQU0sRUFBRTtBQUNQQyxNQUFBQSxVQUFVLEVBQUUsUUFETDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsUUFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETSxFQUtOO0FBQ0NILFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUZ6QixPQUxNLEVBU047QUFDQ0osUUFBQUEsSUFBSSxFQUFFLHlCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUZ6QixPQVRNO0FBRkEsS0FETTtBQWtCZEMsSUFBQUEsYUFBYSxFQUFFO0FBQ2RDLE1BQUFBLFFBQVEsRUFBRSxJQURJO0FBRWRULE1BQUFBLFVBQVUsRUFBRSxlQUZFO0FBR2RDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxNQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTTtBQUZ6QixPQURNLEVBS047QUFDQ1IsUUFBQUEsSUFBSSxFQUFFLGdDQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTztBQUZ6QixPQUxNO0FBSE8sS0FsQkQ7QUFnQ2RDLElBQUFBLFVBQVUsRUFBRTtBQUNYSCxNQUFBQSxRQUFRLEVBQUUsSUFEQztBQUVYVCxNQUFBQSxVQUFVLEVBQUUsWUFGRDtBQUdYQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGekIsT0FETTtBQUhJLEtBaENFO0FBMENkQyxJQUFBQSxhQUFhLEVBQUU7QUFDZGQsTUFBQUEsVUFBVSxFQUFFLGVBREU7QUFFZEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNXO0FBRnpCLE9BRE07QUFGTyxLQTFDRDtBQW1EZEMsSUFBQUEsVUFBVSxFQUFFO0FBQ1hoQixNQUFBQSxVQUFVLEVBQUUsWUFERDtBQUVYQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2E7QUFGekIsT0FETTtBQUZJLEtBbkRFO0FBNERkQyxJQUFBQSxjQUFjLEVBQUU7QUFDZmxCLE1BQUFBLFVBQVUsRUFBRSxnQkFERztBQUVmbUIsTUFBQUEsT0FBTyxFQUFFLGdCQUZNO0FBR2ZsQixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsaUJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNnQjtBQUZ6QixPQURNO0FBSFEsS0E1REY7QUFzRWRDLElBQUFBLGNBQWMsRUFBRTtBQUNmWixNQUFBQSxRQUFRLEVBQUUsSUFESztBQUVmVCxNQUFBQSxVQUFVLEVBQUUsZ0JBRkc7QUFHZkMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLGVBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNrQjtBQUZ6QixPQURNLEVBS047QUFDQ3BCLFFBQUFBLElBQUksRUFBRSxtQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ21CO0FBRnpCLE9BTE07QUFIUSxLQXRFRjtBQW9GZEMsSUFBQUEsb0JBQW9CLEVBQUU7QUFDckJ4QixNQUFBQSxVQUFVLEVBQUUsc0JBRFM7QUFFckJDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxtQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ21CO0FBRnpCLE9BRE07QUFGYyxLQXBGUjtBQTZGZEUsSUFBQUEsMkJBQTJCLEVBQUU7QUFDNUJ6QixNQUFBQSxVQUFVLEVBQUUsNkJBRGdCO0FBRTVCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNtQjtBQUZ6QixPQURNO0FBRnFCO0FBN0ZmLEdBZEU7QUFzSGpCRyxFQUFBQSxVQXRIaUIsd0JBc0hKO0FBQ1ozQyxJQUFBQSxTQUFTLENBQUNDLFlBQVYsR0FBeUJELFNBQVMsQ0FBQ1csTUFBVixDQUFpQmlDLFNBQWpCLENBQTJCLGVBQTNCLENBQXpCO0FBQ0E1QyxJQUFBQSxTQUFTLENBQUNHLG1CQUFWLEdBQWdDSCxTQUFTLENBQUNPLGNBQVYsQ0FBeUJxQyxTQUF6QixDQUFtQyxlQUFuQyxDQUFoQztBQUNBNUMsSUFBQUEsU0FBUyxDQUFDRSxhQUFWLEdBQTBCRixTQUFTLENBQUNJLE9BQVYsQ0FBa0J3QyxTQUFsQixDQUE0QixlQUE1QixDQUExQjtBQUVBNUMsSUFBQUEsU0FBUyxDQUFDYSxhQUFWLENBQXdCZ0MsR0FBeEI7QUFDQXhDLElBQUFBLENBQUMsQ0FBQyxnQ0FBRCxDQUFELENBQW9DeUMsU0FBcEM7QUFDQXpDLElBQUFBLENBQUMsQ0FBQyw0QkFBRCxDQUFELENBQWdDMEMsUUFBaEM7QUFFQTFDLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJDLFFBQWQsQ0FBdUI7QUFDdEJDLE1BQUFBLFFBRHNCLHNCQUNYO0FBQ1YsWUFBSTVDLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJDLFFBQWQsQ0FBdUIsWUFBdkIsQ0FBSixFQUEwQztBQUN6QzNDLFVBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUI2QyxXQUFuQixDQUErQixVQUEvQjtBQUNBLFNBRkQsTUFFTztBQUNON0MsVUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQjhDLFFBQW5CLENBQTRCLFVBQTVCO0FBQ0E7QUFDRDtBQVBxQixLQUF2QjtBQVVBOUMsSUFBQUEsQ0FBQyxDQUFDTCxTQUFTLENBQUNjLGdCQUFYLENBQUQsQ0FBOEJpQyxRQUE5QixDQUF1Q0ssVUFBVSxDQUFDQyw0QkFBWCxFQUF2QztBQUVBLFFBQUloRCxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCaUQsR0FBakIsT0FBMkIsRUFBL0IsRUFBbUN0RCxTQUFTLENBQUN1RCxzQkFBVjtBQUVuQ2xELElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCbUQsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQzlDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQTFELE1BQUFBLFNBQVMsQ0FBQ3VELHNCQUFWO0FBQ0F2RCxNQUFBQSxTQUFTLENBQUNNLFdBQVYsQ0FBc0JxRCxPQUF0QixDQUE4QixRQUE5QjtBQUNBLEtBSkQ7QUFNQTNELElBQUFBLFNBQVMsQ0FBQ0ksT0FBVixDQUFrQndDLFNBQWxCLENBQTRCLFFBQTVCLEVBQXNDO0FBQ3JDZ0IsTUFBQUEsVUFBVSxFQUFFNUQsU0FBUyxDQUFDNkQ7QUFEZSxLQUF0QztBQUlBLFFBQU1DLFFBQVEsR0FBR3pELENBQUMsQ0FBQzBELFNBQUYsQ0FBWUMsaUJBQVosRUFBK0IsQ0FBQyxHQUFELENBQS9CLEVBQXNDLFNBQXRDLEVBQWlELE1BQWpELENBQWpCO0FBQ0FoRSxJQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUIwRCxVQUF6QixDQUFvQztBQUNuQ3JCLE1BQUFBLFNBQVMsRUFBRTtBQUNWc0IsUUFBQUEsV0FBVyxFQUFFO0FBQ1osZUFBSztBQUNKQyxZQUFBQSxTQUFTLEVBQUUsT0FEUDtBQUVKQyxZQUFBQSxXQUFXLEVBQUU7QUFGVDtBQURPLFNBREg7QUFPVkMsUUFBQUEsU0FBUyxFQUFFckUsU0FBUyxDQUFDc0UsdUJBUFg7QUFRVlYsUUFBQUEsVUFBVSxFQUFFNUQsU0FBUyxDQUFDdUUsd0JBUlo7QUFTVkMsUUFBQUEsYUFBYSxFQUFFeEUsU0FBUyxDQUFDeUUsMkJBVGY7QUFVVkMsUUFBQUEsZUFBZSxFQUFFO0FBVlAsT0FEd0I7QUFhbkNDLE1BQUFBLEtBQUssRUFBRSxPQWI0QjtBQWNuQ0MsTUFBQUEsT0FBTyxFQUFFLEdBZDBCO0FBZW5DQyxNQUFBQSxJQUFJLEVBQUVmLFFBZjZCO0FBZ0JuQ2dCLE1BQUFBLE9BQU8sRUFBRTtBQWhCMEIsS0FBcEM7QUFrQkE5RSxJQUFBQSxTQUFTLENBQUNXLE1BQVYsQ0FBaUJpQyxTQUFqQixDQUEyQixPQUEzQixFQUFvQztBQUNuQ21DLE1BQUFBLFFBQVEsRUFBRS9FLFNBQVMsQ0FBQ2dGLGVBRGU7QUFFbkNwQixNQUFBQSxVQUFVLEVBQUU1RCxTQUFTLENBQUNpRjtBQUZhLEtBQXBDO0FBS0FqRixJQUFBQSxTQUFTLENBQUNrRixjQUFWO0FBQ0EsR0FoTGdCOztBQWlMakI7QUFDRDtBQUNBO0FBQ0NULEVBQUFBLDJCQXBMaUIsdUNBb0xXVSxXQXBMWCxFQW9Md0I7QUFDeEMsV0FBT0EsV0FBUDtBQUNBLEdBdExnQjs7QUF1TGpCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0N0QixFQUFBQSxrQkEzTGlCLGdDQTJMSTtBQUNwQixRQUFNdUIsU0FBUyxHQUFHcEYsU0FBUyxDQUFDSSxPQUFWLENBQWtCd0MsU0FBbEIsQ0FBNEIsZUFBNUIsQ0FBbEI7QUFDQSxRQUFNeUMsTUFBTSxHQUFHckYsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsU0FBckMsQ0FBZjtBQUNBbEMsSUFBQUEsVUFBVSxDQUFDbUMsaUJBQVgsQ0FBNkJ2RixTQUFTLENBQUNFLGFBQXZDLEVBQXNEa0YsU0FBdEQsRUFBaUUsUUFBakUsRUFBMkVDLE1BQTNFO0FBQ0EsR0EvTGdCOztBQWdNakI7QUFDRDtBQUNBO0FBQ0NKLEVBQUFBLGlCQW5NaUIsK0JBbU1HO0FBQ25CO0FBQ0E1RSxJQUFBQSxDQUFDLENBQUNtRixHQUFGLENBQU07QUFDTEMsTUFBQUEsR0FBRyxZQUFLQyxhQUFMLDRCQURFO0FBRUxDLE1BQUFBLFlBQVksRUFBRSxpQkFGVDtBQUdMbkMsTUFBQUEsRUFBRSxFQUFFLEtBSEM7QUFJTG9DLE1BQUFBLFVBSkssc0JBSU1DLFFBSk4sRUFJZ0I7QUFDcEIsWUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQUNoQkMsVUFBQUEsS0FBSyxFQUFFaEcsU0FBUyxDQUFDVyxNQUFWLENBQWlCaUMsU0FBakIsQ0FBMkIsZUFBM0I7QUFEUyxTQUFqQjtBQUdBLGVBQU9rRCxNQUFQO0FBQ0EsT0FWSTtBQVdMRyxNQUFBQSxTQVhLLHFCQVdLQyxRQVhMLEVBV2U7QUFDbkIsWUFBSUEsUUFBUSxDQUFDQyxjQUFULElBQ0FuRyxTQUFTLENBQUNDLFlBQVYsS0FBMkJELFNBQVMsQ0FBQ1csTUFBVixDQUFpQmlDLFNBQWpCLENBQTJCLGVBQTNCLENBRC9CLEVBRUU7QUFDRHZDLFVBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCK0YsTUFBckIsR0FBOEJsRCxXQUE5QixDQUEwQyxPQUExQztBQUNBN0MsVUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQjhDLFFBQWxCLENBQTJCLFFBQTNCO0FBQ0EsU0FMRCxNQUtPO0FBQ045QyxVQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQitGLE1BQXJCLEdBQThCakQsUUFBOUIsQ0FBdUMsT0FBdkM7QUFDQTlDLFVBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I2QyxXQUFsQixDQUE4QixRQUE5QjtBQUNBO0FBQ0Q7QUFyQkksS0FBTjtBQXVCQSxHQTVOZ0I7O0FBNk5qQjtBQUNEO0FBQ0E7QUFDQzhCLEVBQUFBLGVBaE9pQiwyQkFnT0RxQixXQWhPQyxFQWdPWUMsYUFoT1osRUFnTzJCO0FBQzNDLFdBQU9BLGFBQVA7QUFDQSxHQWxPZ0I7O0FBbU9qQjtBQUNEO0FBQ0E7QUFDQy9CLEVBQUFBLHdCQXRPaUIsc0NBc09VO0FBQzFCZ0MsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksMEJBQVo7QUFDQSxRQUFNQyxlQUFlLEdBQUd6RyxTQUFTLENBQUNPLGNBQVYsQ0FBeUJxQyxTQUF6QixDQUFtQyxlQUFuQyxDQUF4QjtBQUNBLFFBQU15QyxNQUFNLEdBQUdyRixTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxTQUFyQyxDQUFmLENBSDBCLENBSTFCOztBQUNBbEMsSUFBQUEsVUFBVSxDQUFDbUMsaUJBQVgsQ0FBNkJ2RixTQUFTLENBQUNHLG1CQUF2QyxFQUE0RHNHLGVBQTVELEVBQTZFLGVBQTdFLEVBQThGcEIsTUFBOUYsRUFMMEIsQ0FPMUI7O0FBQ0EsUUFBSW9CLGVBQWUsS0FBS3pHLFNBQVMsQ0FBQ0csbUJBQTlCLElBQ0NILFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRG9CLE1BQTFELEtBQXFFLENBRDFFLEVBRUU7QUFDRDFHLE1BQUFBLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRG1CLGVBQTFEO0FBQ0EsS0FaeUIsQ0FjMUI7OztBQUNBLFFBQUlBLGVBQWUsS0FBS3pHLFNBQVMsQ0FBQ0csbUJBQWxDLEVBQXVEO0FBQ3RELFVBQU13RyxRQUFRLEdBQUczRyxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxlQUFyQyxDQUFqQixDQURzRCxDQUV0RDs7QUFDQSxVQUFJdEYsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLE1BQTJEdEYsU0FBUyxDQUFDRyxtQkFBekUsRUFBOEY7QUFDN0YsWUFBSUgsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLEVBQXVEb0IsTUFBdkQsS0FBa0UsQ0FBdEUsRUFBeUU7QUFDeEUxRyxVQUFBQSxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdUQsRUFBdkQ7QUFDQTs7QUFDRHRGLFFBQUFBLFNBQVMsQ0FBQ1EsZUFBVixDQUNFdUMsUUFERixDQUNXLFVBRFgsWUFDMEI0RCxRQUQxQixlQUN1Q0YsZUFEdkMsUUFFRTFELFFBRkYsQ0FFVyxXQUZYLEVBRXdCMEQsZUFGeEI7QUFHQXpHLFFBQUFBLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxFQUF1RG1CLGVBQXZEO0FBQ0E7O0FBQ0QsVUFBSXpHLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLHNCQUFyQyxNQUFpRXRGLFNBQVMsQ0FBQ0csbUJBQS9FLEVBQW9HO0FBQ25HSCxRQUFBQSxTQUFTLENBQUNTLHFCQUFWLENBQ0VzQyxRQURGLENBQ1csVUFEWCxZQUMwQjRELFFBRDFCLGVBQ3VDRixlQUR2QyxRQUVFMUQsUUFGRixDQUVXLFdBRlgsRUFFd0IwRCxlQUZ4QjtBQUdBekcsUUFBQUEsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsc0JBQXJDLEVBQTZEbUIsZUFBN0Q7QUFDQTs7QUFDRCxVQUFJekcsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsNkJBQXJDLE1BQXdFdEYsU0FBUyxDQUFDRyxtQkFBdEYsRUFBMkc7QUFDMUdILFFBQUFBLFNBQVMsQ0FBQ1UsNEJBQVYsQ0FDRXFDLFFBREYsQ0FDVyxVQURYLFlBQzBCNEQsUUFEMUIsZUFDdUNGLGVBRHZDLFFBRUUxRCxRQUZGLENBRVcsV0FGWCxFQUV3QjBELGVBRnhCO0FBR0F6RyxRQUFBQSxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyw2QkFBckMsRUFBb0VtQixlQUFwRTtBQUNBO0FBQ0Q7O0FBQ0R6RyxJQUFBQSxTQUFTLENBQUNHLG1CQUFWLEdBQWdDc0csZUFBaEM7QUFDQUYsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLDZCQUFpQ3hHLFNBQVMsQ0FBQ0csbUJBQTNDO0FBQ0EsR0FoUmdCOztBQWlSakI7QUFDRDtBQUNBO0FBQ0NtRSxFQUFBQSx1QkFwUmlCLHFDQW9SUztBQUN6QnRFLElBQUFBLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRCxFQUExRDtBQUNBdEYsSUFBQUEsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZUFBckMsRUFBc0QsRUFBdEQsRUFGeUIsQ0FLekI7O0FBQ0EsUUFBSXRGLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxNQUEyRHRGLFNBQVMsQ0FBQ0csbUJBQXpFLEVBQThGO0FBQzdGSCxNQUFBQSxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdUQsRUFBdkQ7QUFFQXRGLE1BQUFBLFNBQVMsQ0FBQ1EsZUFBVixDQUNFdUMsUUFERixDQUNXLFVBRFgsRUFDdUIsR0FEdkIsRUFFRUEsUUFGRixDQUVXLFdBRlgsRUFFd0IsQ0FBQyxDQUZ6QjtBQUdBL0MsTUFBQUEsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLEVBQXVELENBQUMsQ0FBeEQ7QUFDQTs7QUFDRCxRQUFJdEYsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsc0JBQXJDLE1BQWlFdEYsU0FBUyxDQUFDRyxtQkFBL0UsRUFBb0c7QUFDbkdILE1BQUFBLFNBQVMsQ0FBQ1MscUJBQVYsQ0FDRXNDLFFBREYsQ0FDVyxVQURYLEVBQ3VCLEdBRHZCLEVBRUVBLFFBRkYsQ0FFVyxXQUZYLEVBRXdCLENBQUMsQ0FGekI7QUFHQS9DLE1BQUFBLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLHNCQUFyQyxFQUE2RCxDQUFDLENBQTlEO0FBQ0E7O0FBQ0QsUUFBSXRGLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLDZCQUFyQyxNQUF3RXRGLFNBQVMsQ0FBQ0csbUJBQXRGLEVBQTJHO0FBQzFHSCxNQUFBQSxTQUFTLENBQUNVLDRCQUFWLENBQ0VxQyxRQURGLENBQ1csVUFEWCxFQUN1QixHQUR2QixFQUVFQSxRQUZGLENBRVcsV0FGWCxFQUV3QixDQUFDLENBRnpCO0FBR0EvQyxNQUFBQSxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyw2QkFBckMsRUFBb0UsQ0FBQyxDQUFyRTtBQUNBOztBQUNEdEYsSUFBQUEsU0FBUyxDQUFDRyxtQkFBVixHQUFnQyxFQUFoQztBQUNBLEdBL1NnQjs7QUFpVGpCO0FBQ0Q7QUFDQTtBQUNDb0QsRUFBQUEsc0JBcFRpQixvQ0FvVFE7QUFDeEIsUUFBTXFELEtBQUssR0FBRyxrQkFBZDtBQUNBLFFBQUlDLElBQUksR0FBRyxFQUFYOztBQUNBLFNBQUssSUFBSUMsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxFQUFwQixFQUF3QkEsQ0FBQyxJQUFJLENBQTdCLEVBQWdDO0FBQy9CLFVBQU1DLENBQUMsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdELElBQUksQ0FBQ0UsTUFBTCxLQUFnQk4sS0FBSyxDQUFDRixNQUFqQyxDQUFWO0FBQ0FHLE1BQUFBLElBQUksSUFBSUQsS0FBSyxDQUFDTyxNQUFOLENBQWFKLENBQWIsQ0FBUjtBQUNBOztBQUNEL0csSUFBQUEsU0FBUyxDQUFDTSxXQUFWLENBQXNCZ0QsR0FBdEIsQ0FBMEJ1RCxJQUExQjtBQUNBLEdBNVRnQjtBQTZUakJPLEVBQUFBLGdCQTdUaUIsNEJBNlRBdkIsUUE3VEEsRUE2VFU7QUFDMUIsUUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ3VCLElBQVAsR0FBY3JILFNBQVMsQ0FBQ1ksUUFBVixDQUFtQjBFLElBQW5CLENBQXdCLFlBQXhCLENBQWQ7QUFDQVEsSUFBQUEsTUFBTSxDQUFDdUIsSUFBUCxDQUFZNUYsYUFBWixHQUE0QnpCLFNBQVMsQ0FBQ08sY0FBVixDQUF5QnFDLFNBQXpCLENBQW1DLGVBQW5DLENBQTVCO0FBQ0EsV0FBT2tELE1BQVA7QUFDQSxHQWxVZ0I7QUFtVWpCd0IsRUFBQUEsZUFuVWlCLDZCQW1VQztBQUNqQnRILElBQUFBLFNBQVMsQ0FBQ0UsYUFBVixHQUEwQkYsU0FBUyxDQUFDSSxPQUFWLENBQWtCa0QsR0FBbEIsRUFBMUI7QUFDQUYsSUFBQUEsVUFBVSxDQUFDbUUsb0JBQVgsQ0FBZ0N2SCxTQUFTLENBQUNFLGFBQTFDO0FBQ0EsR0F0VWdCO0FBdVVqQmdGLEVBQUFBLGNBdlVpQiw0QkF1VUE7QUFDaEJzQyxJQUFBQSxJQUFJLENBQUM1RyxRQUFMLEdBQWdCWixTQUFTLENBQUNZLFFBQTFCO0FBQ0E0RyxJQUFBQSxJQUFJLENBQUMvQixHQUFMLGFBQWNDLGFBQWQ7QUFDQThCLElBQUFBLElBQUksQ0FBQ3pHLGFBQUwsR0FBcUJmLFNBQVMsQ0FBQ2UsYUFBL0I7QUFDQXlHLElBQUFBLElBQUksQ0FBQ0osZ0JBQUwsR0FBd0JwSCxTQUFTLENBQUNvSCxnQkFBbEM7QUFDQUksSUFBQUEsSUFBSSxDQUFDRixlQUFMLEdBQXVCdEgsU0FBUyxDQUFDc0gsZUFBakM7QUFDQUUsSUFBQUEsSUFBSSxDQUFDN0UsVUFBTDtBQUNBO0FBOVVnQixDQUFsQjtBQWlWQSxJQUFNOEUsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLFFBQVEsRUFBRXJILENBQUMsQ0FBQyxTQUFELENBREc7QUFFZHNDLEVBQUFBLFVBRmMsd0JBRUQ7QUFDWixRQUFJOEUsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxJQUFoQixDQUFxQixLQUFyQixNQUFnQyxFQUFwQyxFQUF3QztBQUN2Q0YsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxJQUFoQixDQUFxQixLQUFyQixZQUErQmpDLGFBQS9CO0FBQ0E7O0FBQ0RyRixJQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3Qm1ELEVBQXhCLENBQTJCLE9BQTNCLEVBQW9DLFlBQU07QUFDekNuRCxNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCdUgsS0FBbEI7QUFDQSxLQUZEO0FBSUF2SCxJQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CbUQsRUFBbkIsQ0FBc0IsT0FBdEIsRUFBK0IsWUFBTTtBQUNwQ2lFLE1BQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsSUFBaEIsQ0FBcUIsS0FBckIsWUFBK0JqQyxhQUEvQjtBQUNBMUYsTUFBQUEsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsYUFBckMsRUFBb0QsSUFBcEQ7QUFDQXRGLE1BQUFBLFNBQVMsQ0FBQ00sV0FBVixDQUFzQnFELE9BQXRCLENBQThCLFFBQTlCO0FBQ0EsS0FKRDtBQU1BdEQsSUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQm1ELEVBQWxCLENBQXFCLFFBQXJCLEVBQStCLFVBQUNDLENBQUQsRUFBTztBQUNyQyxVQUFJb0UsS0FBSjtBQUNBcEUsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTW9FLFlBQVksR0FBRyxrQkFBa0JyRSxDQUFsQixHQUFzQkEsQ0FBQyxDQUFDcUUsWUFBRixDQUFlQyxLQUFyQyxHQUE2QyxFQUFsRTtBQUNBLFVBQU1DLE1BQU0sR0FBRyxXQUFXdkUsQ0FBQyxDQUFDd0UsTUFBYixHQUFzQnhFLENBQUMsQ0FBQ3dFLE1BQUYsQ0FBU0YsS0FBL0IsR0FBdUNELFlBQXREOztBQUNBLFVBQUlFLE1BQU0sSUFBSUEsTUFBTSxDQUFDdEIsTUFBckIsRUFBNkI7QUFDNUJ3QixRQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV0gsTUFBWCxFQUFtQkksT0FBbkIsQ0FBMkIsVUFBQ0MsUUFBRCxFQUFjO0FBQ3hDLGNBQUksUUFBT0EsUUFBUCxNQUFvQixRQUF4QixFQUFrQztBQUNsQ1IsVUFBQUEsS0FBSyxHQUFHLElBQUlTLEtBQUosRUFBUjtBQUNBVCxVQUFBQSxLQUFLLENBQUNVLEdBQU4sR0FBWWQsTUFBTSxDQUFDZSxlQUFQLENBQXVCSCxRQUF2QixDQUFaOztBQUNBUixVQUFBQSxLQUFLLENBQUNZLE1BQU4sR0FBZSxVQUFDQyxLQUFELEVBQVc7QUFDekIsZ0JBQU1DLElBQUksR0FBRztBQUNaSixjQUFBQSxHQUFHLEVBQUVHLEtBQUssQ0FBQ1QsTUFEQztBQUVaVyxjQUFBQSxLQUFLLEVBQUUsR0FGSztBQUdaQyxjQUFBQSxNQUFNLEVBQUUsR0FISTtBQUlaMUgsY0FBQUEsSUFBSSxFQUFFLFdBSk07QUFLWjJILGNBQUFBLFFBQVEsRUFBRTtBQUxFLGFBQWI7QUFPQSxnQkFBTUMsZUFBZSxHQUFHdEIsTUFBTSxDQUFDdUIsVUFBUCxDQUFrQkwsSUFBbEIsQ0FBeEI7QUFDQWxCLFlBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsSUFBaEIsQ0FBcUIsS0FBckIsRUFBNEJvQixlQUE1QjtBQUNBL0ksWUFBQUEsU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsYUFBckMsRUFBb0R5RCxlQUFwRDtBQUNBL0ksWUFBQUEsU0FBUyxDQUFDTSxXQUFWLENBQXNCcUQsT0FBdEIsQ0FBOEIsUUFBOUI7QUFDQSxXQVpEO0FBYUEsU0FqQkQ7QUFrQkE7QUFDRCxLQXpCRDtBQTBCQSxHQTFDYTtBQTJDZHFGLEVBQUFBLFVBM0NjLDRCQTZDWDtBQUFBLFFBREZULEdBQ0UsUUFERkEsR0FDRTtBQUFBLFFBREdLLEtBQ0gsUUFER0EsS0FDSDtBQUFBLFFBRFVDLE1BQ1YsUUFEVUEsTUFDVjtBQUFBLFFBRGtCMUgsSUFDbEIsUUFEa0JBLElBQ2xCO0FBQUEsUUFEd0IySCxRQUN4QixRQUR3QkEsUUFDeEI7QUFDRixRQUFJRyxRQUFRLEdBQUdMLEtBQWY7QUFDQSxRQUFJTSxTQUFTLEdBQUdMLE1BQWhCO0FBQ0EsUUFBTU0sSUFBSSxHQUFHRixRQUFRLEtBQUssQ0FBYixJQUFrQkMsU0FBUyxLQUFLLENBQTdDLENBSEUsQ0FJRjs7QUFDQSxRQUFJWCxHQUFHLENBQUNLLEtBQUosSUFBYUssUUFBYixJQUF5QkMsU0FBUyxLQUFLLENBQTNDLEVBQThDO0FBQzdDRCxNQUFBQSxRQUFRLEdBQUdWLEdBQUcsQ0FBQ0ssS0FBZjtBQUNBTSxNQUFBQSxTQUFTLEdBQUdYLEdBQUcsQ0FBQ00sTUFBaEI7QUFDQSxLQVJDLENBU0Y7OztBQUNBLFFBQUlOLEdBQUcsQ0FBQ0ssS0FBSixHQUFZSyxRQUFaLElBQXdCQyxTQUFTLEtBQUssQ0FBMUMsRUFBNkM7QUFDNUNBLE1BQUFBLFNBQVMsR0FBR1gsR0FBRyxDQUFDTSxNQUFKLElBQWNJLFFBQVEsR0FBR1YsR0FBRyxDQUFDSyxLQUE3QixDQUFaO0FBQ0EsS0FaQyxDQWFGOzs7QUFDQSxRQUFNUSxNQUFNLEdBQUdILFFBQVEsR0FBR1YsR0FBRyxDQUFDSyxLQUE5QjtBQUNBLFFBQU1TLE1BQU0sR0FBR0gsU0FBUyxHQUFHWCxHQUFHLENBQUNNLE1BQS9CO0FBQ0EsUUFBTVMsS0FBSyxHQUFHSCxJQUFJLEdBQUduQyxJQUFJLENBQUN1QyxHQUFMLENBQVNILE1BQVQsRUFBaUJDLE1BQWpCLENBQUgsR0FBOEJyQyxJQUFJLENBQUN3QyxHQUFMLENBQVNKLE1BQVQsRUFBaUJDLE1BQWpCLENBQWhELENBaEJFLENBaUJGOztBQUNBLFFBQU1JLE1BQU0sR0FBR0MsUUFBUSxDQUFDQyxhQUFULENBQXVCLFFBQXZCLENBQWY7QUFDQUYsSUFBQUEsTUFBTSxDQUFDYixLQUFQLEdBQWVLLFFBQVEsSUFBSWpDLElBQUksQ0FBQzRDLEtBQUwsQ0FBV3JCLEdBQUcsQ0FBQ0ssS0FBSixHQUFZVSxLQUF2QixDQUEzQjtBQUNBRyxJQUFBQSxNQUFNLENBQUNaLE1BQVAsR0FBZ0JLLFNBQVMsSUFBSWxDLElBQUksQ0FBQzRDLEtBQUwsQ0FBV3JCLEdBQUcsQ0FBQ00sTUFBSixHQUFhUyxLQUF4QixDQUE3QjtBQUNBRyxJQUFBQSxNQUFNLENBQUNJLFVBQVAsQ0FBa0IsSUFBbEIsRUFBd0JQLEtBQXhCLENBQThCQSxLQUE5QixFQUFxQ0EsS0FBckMsRUFyQkUsQ0FzQkY7O0FBQ0FHLElBQUFBLE1BQU0sQ0FBQ0ksVUFBUCxDQUFrQixJQUFsQixFQUF3QkMsU0FBeEIsQ0FBa0N2QixHQUFsQyxFQUF1QyxDQUFFQSxHQUFHLENBQUNLLEtBQUosR0FBWVUsS0FBYixHQUFzQkcsTUFBTSxDQUFDYixLQUE5QixJQUF1QyxDQUFDLEdBQS9FLEVBQW9GLENBQUVMLEdBQUcsQ0FBQ00sTUFBSixHQUFhUyxLQUFkLEdBQXVCRyxNQUFNLENBQUNaLE1BQS9CLElBQXlDLENBQUMsR0FBOUg7QUFDQSxXQUFPWSxNQUFNLENBQUNNLFNBQVAsQ0FBaUI1SSxJQUFqQixFQUF1QjJILFFBQXZCLENBQVA7QUFDQSxHQXRFYTtBQXVFZE4sRUFBQUEsZUF2RWMsMkJBdUVFekIsQ0F2RUYsRUF1RUs7QUFDbEIsUUFBTWlELEdBQUcsR0FBR0MsTUFBTSxDQUFDRCxHQUFQLElBQWNDLE1BQU0sQ0FBQ0MsU0FBckIsSUFBa0NELE1BQU0sQ0FBQ0UsTUFBekMsSUFBbURGLE1BQU0sQ0FBQ0csS0FBdEU7QUFDQSxXQUFPSixHQUFHLENBQUN4QixlQUFKLENBQW9CekIsQ0FBcEIsQ0FBUDtBQUNBO0FBMUVhLENBQWY7QUErRUEsSUFBTXNELHlCQUF5QixHQUFHO0FBQ2pDQyxFQUFBQSxPQUFPLEVBQUUsSUFEd0I7QUFFakNDLEVBQUFBLGFBQWEsRUFBRSxFQUZrQjtBQUdqQ0MsRUFBQUEsWUFBWSxFQUFFbkssQ0FBQyxDQUFDLFNBQUQsQ0FIa0I7O0FBSWpDO0FBQ0Q7QUFDQTtBQUNDc0MsRUFBQUEsVUFQaUMsd0JBT3BCO0FBQ1o4SCxJQUFBQSxZQUFZLENBQUM5SCxVQUFiOztBQUNBLFFBQUkzQyxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFvQyxJQUFwQyxNQUE0QyxFQUFoRCxFQUFtRDtBQUNsRCtFLE1BQUFBLHlCQUF5QixDQUFDSyxhQUExQjtBQUNBO0FBQ0QsR0FaZ0M7QUFhakNBLEVBQUFBLGFBYmlDLDJCQWFqQjtBQUNmVCxJQUFBQSxNQUFNLENBQUNVLFlBQVAsQ0FBb0JOLHlCQUF5QixDQUFDTyxhQUE5QztBQUNBUCxJQUFBQSx5QkFBeUIsQ0FBQ1EsTUFBMUI7QUFDQSxHQWhCZ0M7QUFpQmpDQSxFQUFBQSxNQWpCaUMsb0JBaUJ4QjtBQUNSLFFBQUk3SyxTQUFTLENBQUNFLGFBQVYsQ0FBd0J3RyxNQUF4QixLQUFtQyxDQUF2QyxFQUEwQztBQUMxQyxRQUFNb0UsS0FBSyxHQUFHO0FBQUVDLE1BQUFBLElBQUksRUFBRS9LLFNBQVMsQ0FBQ0U7QUFBbEIsS0FBZDtBQUNBK0osSUFBQUEsTUFBTSxDQUFDVSxZQUFQLENBQW9CTix5QkFBeUIsQ0FBQ08sYUFBOUM7QUFDQUksSUFBQUEsTUFBTSxDQUFDQyxhQUFQLENBQXFCSCxLQUFyQixFQUE0QlQseUJBQXlCLENBQUNhLHdCQUF0RDtBQUNBLEdBdEJnQzs7QUF1QmpDO0FBQ0Q7QUFDQTtBQUNDQSxFQUFBQSx3QkExQmlDLG9DQTBCUmhGLFFBMUJRLEVBMEJFO0FBQ2xDbUUsSUFBQUEseUJBQXlCLENBQUNPLGFBQTFCLEdBQ0NYLE1BQU0sQ0FBQ2tCLFVBQVAsQ0FBa0JkLHlCQUF5QixDQUFDUSxNQUE1QyxFQUFvRFIseUJBQXlCLENBQUNDLE9BQTlFLENBREQ7QUFFQSxRQUFJcEUsUUFBUSxDQUFDUSxNQUFULEtBQW9CLENBQXBCLElBQXlCUixRQUFRLEtBQUssS0FBMUMsRUFBaUQ7QUFDakQsUUFBTWtGLE9BQU8sR0FBR2YseUJBQXlCLENBQUNHLFlBQTFDO0FBRUEsUUFBSWEsU0FBUyxHQUFHLHVDQUFoQjtBQUNBaEwsSUFBQUEsQ0FBQyxDQUFDaUwsSUFBRixDQUFPcEYsUUFBUCxFQUFpQixVQUFDcUYsR0FBRCxFQUFNdkYsS0FBTixFQUFnQjtBQUNoQ3FGLE1BQUFBLFNBQVMsSUFBSSxNQUFiO0FBQ0FBLE1BQUFBLFNBQVMsa0JBQVdFLEdBQVgsVUFBVDtBQUNBRixNQUFBQSxTQUFTLGtCQUFXckYsS0FBWCxVQUFUO0FBQ0FxRixNQUFBQSxTQUFTLElBQUksT0FBYjtBQUNBLEtBTEQ7QUFNQUEsSUFBQUEsU0FBUyxJQUFJLFVBQWI7QUFDQVosSUFBQUEsWUFBWSxDQUFDZSxhQUFiLENBQTJCSCxTQUEzQjs7QUFFQSxRQUFJLFlBQVluRixRQUFaLElBQXdCQSxRQUFRLENBQUN1RixNQUFULENBQWdCQyxXQUFoQixHQUE4QkMsT0FBOUIsQ0FBc0MsV0FBdEMsS0FBc0QsQ0FBbEYsRUFBcUY7QUFDcEZQLE1BQUFBLE9BQU8sQ0FBQ2xJLFdBQVIsQ0FBb0IsTUFBcEIsRUFBNEJDLFFBQTVCLENBQXFDLE9BQXJDO0FBQ0EsS0FGRCxNQUVPO0FBQ05pSSxNQUFBQSxPQUFPLENBQUNsSSxXQUFSLENBQW9CLE9BQXBCLEVBQTZCQyxRQUE3QixDQUFzQyxNQUF0QztBQUNBOztBQUNELFFBQUlpSSxPQUFPLENBQUNRLFFBQVIsQ0FBaUIsT0FBakIsQ0FBSixFQUErQjtBQUM5QlIsTUFBQUEsT0FBTyxDQUFDUyxJQUFSLENBQWF4SyxlQUFlLENBQUN5SyxTQUE3QjtBQUNBLEtBRkQsTUFFTztBQUNOVixNQUFBQSxPQUFPLENBQUNTLElBQVIsQ0FBYXhLLGVBQWUsQ0FBQzBLLFVBQTdCO0FBQ0E7QUFDRDtBQXBEZ0MsQ0FBbEMsQyxDQXVEQTs7QUFDQTFMLENBQUMsQ0FBQzJMLEVBQUYsQ0FBSzFHLElBQUwsQ0FBVU8sUUFBVixDQUFtQjNFLEtBQW5CLENBQXlCK0ssYUFBekIsR0FBeUMsWUFBTTtBQUM5QyxNQUFNQyxhQUFhLEdBQUdsTSxTQUFTLENBQUNZLFFBQVYsQ0FBbUIwRSxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsQ0FBdEI7QUFDQSxNQUFNNkcsYUFBYSxHQUFHbk0sU0FBUyxDQUFDWSxRQUFWLENBQW1CMEUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQXRCOztBQUNBLE1BQUk2RyxhQUFhLENBQUN6RixNQUFkLEdBQXFCLENBQXJCLEtBRUZ3RixhQUFhLEtBQUcsR0FBaEIsSUFFQUEsYUFBYSxLQUFHLEVBSmQsQ0FBSixFQUtJO0FBQ0gsV0FBTyxLQUFQO0FBQ0E7O0FBQ0QsU0FBTyxJQUFQO0FBQ0EsQ0FaRCxDLENBY0E7OztBQUNBN0wsQ0FBQyxDQUFDMkwsRUFBRixDQUFLMUcsSUFBTCxDQUFVTyxRQUFWLENBQW1CM0UsS0FBbkIsQ0FBeUJrTCxTQUF6QixHQUFxQyxVQUFDcEcsS0FBRCxFQUFRcUcsU0FBUjtBQUFBLFNBQXNCaE0sQ0FBQyxZQUFLZ00sU0FBTCxFQUFELENBQW1CVCxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUVBdkwsQ0FBQyxDQUFDcUosUUFBRCxDQUFELENBQVk0QyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0TSxFQUFBQSxTQUFTLENBQUMyQyxVQUFWO0FBQ0E4RSxFQUFBQSxNQUFNLENBQUM5RSxVQUFQO0FBQ0EwSCxFQUFBQSx5QkFBeUIsQ0FBQzFILFVBQTFCO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIFBieEFwaSwgRGVidWdnZXJJbmZvLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbiA9IHtcblx0ZGVmYXVsdEVtYWlsOiAnJyxcblx0ZGVmYXVsdE51bWJlcjogJycsXG5cdGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuXHQkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG5cdCRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuXHQkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcblx0JGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuXHQkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cdCRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblx0Zm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG51bWJlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ251bWJlcicsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9yaW5nbGVuZ3RoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0ZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZzoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cblx0XHRleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHQkKCcjcXVhbGlmeScpLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRpZiAoJCgnI3F1YWxpZnknKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0b25CZWZvcmVQYXN0ZTogZXh0ZW5zaW9uLmNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSxcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGNvdXBvblxuXHQgKi9cblx0Y2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstC+0L7QtNCwINC90L7QvNC10YDQsCDRgtC10LvQtdGE0L7QvdCwINC00LvRjyDQv9GA0L7QstC10YDQutC4INC90LXRgiDQu9C4INC/0LXRgNC10YHQtdGH0LXQvdC40Lkg0YFcblx0ICog0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC80Lgg0L3QvtC80LXRgNCw0LzQuFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuXHRcdGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9C+0YHQu9C1INCy0LLQvtC00LAg0L/QvtC70L3QvtCz0L4gRW1haWwg0LDQtNGA0LXRgdCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVFbWFpbCgpIHtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4IEVtYWlsXG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXVzZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogJy51aS5pbnB1dC5lbWFpbCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG5cdFx0XHRcdFx0fHwgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9PT0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHQkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC/0L7Qu9GD0YfQtdC90LjQuCDQsdC10LfQvNCw0YHQvtGH0L3QvtCz0L4g0LfQvdCw0YfQtdC90LjRj1xuXHQgKi9cblx0Y2JPblVubWFza0VtYWlsKG1hc2tlZFZhbHVlLCB1bm1hc2tlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHVubWFza2VkVmFsdWU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0LLQstC+0LTQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcblx0XHRjb25zb2xlLmxvZygnY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyJyk7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IGF2YXRhciA9IHtcblx0JHBpY3R1cmU6ICQoJyNhdmF0YXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoYXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycpID09PSAnJykge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdH1cblx0XHQkKCcjdXBsb2FkLW5ldy1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHQkKCcjZmlsZS1zZWxlY3QnKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2NsZWFyLWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBudWxsKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdCQoJyNmaWxlLXNlbGVjdCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0bGV0IGltYWdlO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZGF0YVRyYW5zZmVyID0gJ2RhdGFUcmFuc2ZlcicgaW4gZSA/IGUuZGF0YVRyYW5zZmVyLmZpbGVzIDogW107XG5cdFx0XHRjb25zdCBpbWFnZXMgPSAnZmlsZXMnIGluIGUudGFyZ2V0ID8gZS50YXJnZXQuZmlsZXMgOiBkYXRhVHJhbnNmZXI7XG5cdFx0XHRpZiAoaW1hZ2VzICYmIGltYWdlcy5sZW5ndGgpIHtcblx0XHRcdFx0QXJyYXkuZnJvbShpbWFnZXMpLmZvckVhY2goKGN1ckltYWdlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBjdXJJbWFnZSAhPT0gJ29iamVjdCcpIHJldHVybjtcblx0XHRcdFx0XHRpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0XHRcdGltYWdlLnNyYyA9IGF2YXRhci5jcmVhdGVPYmplY3RVUkwoY3VySW1hZ2UpO1xuXHRcdFx0XHRcdGltYWdlLm9ubG9hZCA9IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgYXJncyA9IHtcblx0XHRcdFx0XHRcdFx0c3JjOiBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiAyMDAsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcblx0XHRcdFx0XHRcdFx0Y29tcHJlc3M6IDkwLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGNvbnN0IG15YmFzZTY0cmVzaXplZCA9IGF2YXRhci5yZXNpemVDcm9wKGFyZ3MpO1xuXHRcdFx0XHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmVzaXplQ3JvcCh7XG5cdFx0c3JjLCB3aWR0aCwgaGVpZ2h0LCB0eXBlLCBjb21wcmVzcyxcblx0fSkge1xuXHRcdGxldCBuZXdXaWR0aCA9IHdpZHRoO1xuXHRcdGxldCBuZXdIZWlnaHQgPSBoZWlnaHQ7XG5cdFx0Y29uc3QgY3JvcCA9IG5ld1dpZHRoID09PSAwIHx8IG5ld0hlaWdodCA9PT0gMDtcblx0XHQvLyBub3QgcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA8PSBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld1dpZHRoID0gc3JjLndpZHRoO1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodDtcblx0XHR9XG5cdFx0Ly8gcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA+IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodCAqIChuZXdXaWR0aCAvIHNyYy53aWR0aCk7XG5cdFx0fVxuXHRcdC8vIGNoZWNrIHNjYWxlXG5cdFx0Y29uc3QgeHNjYWxlID0gbmV3V2lkdGggLyBzcmMud2lkdGg7XG5cdFx0Y29uc3QgeXNjYWxlID0gbmV3SGVpZ2h0IC8gc3JjLmhlaWdodDtcblx0XHRjb25zdCBzY2FsZSA9IGNyb3AgPyBNYXRoLm1pbih4c2NhbGUsIHlzY2FsZSkgOiBNYXRoLm1heCh4c2NhbGUsIHlzY2FsZSk7XG5cdFx0Ly8gY3JlYXRlIGVtcHR5IGNhbnZhc1xuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy53aWR0aCA9IG5ld1dpZHRoIHx8IE1hdGgucm91bmQoc3JjLndpZHRoICogc2NhbGUpO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXdIZWlnaHQgfHwgTWF0aC5yb3VuZChzcmMuaGVpZ2h0ICogc2NhbGUpO1xuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLnNjYWxlKHNjYWxlLCBzY2FsZSk7XG5cdFx0Ly8gY3JvcCBpdCB0b3AgY2VudGVyXG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHNyYywgKChzcmMud2lkdGggKiBzY2FsZSkgLSBjYW52YXMud2lkdGgpICogLTAuNSwgKChzcmMuaGVpZ2h0ICogc2NhbGUpIC0gY2FudmFzLmhlaWdodCkgKiAtMC41KTtcblx0XHRyZXR1cm4gY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBjb21wcmVzcyk7XG5cdH0sXG5cdGNyZWF0ZU9iamVjdFVSTChpKSB7XG5cdFx0Y29uc3QgVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXHRcdHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGkpO1xuXHR9LFxuXG59O1xuXG5cbmNvbnN0IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkc3RhdHVzTGFiZWw6ICQoJyNzdGF0dXMnKSxcblx0LyoqXG5cdCAqIGluaXRpYWxpemUoKSDRgdC+0LfQtNCw0L3QuNC1INC+0LHRitC10LrRgtC+0LIg0Lgg0LfQsNC/0YPRgdC6INC40YVcblx0ICovXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lkJykhPT0nJyl7XG5cdFx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0XHR9XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRpZiAoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0Y29uc3QgcGFyYW0gPSB7IHBlZXI6IGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyIH07XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5HZXRQZWVyU3RhdHVzKHBhcmFtLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMoKSDQntCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINC/0LjRgNCwXG5cdCAqL1xuXHRjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMocmVzcG9uc2UpIHtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRjb25zdCAkc3RhdHVzID0gZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzTGFiZWw7XG5cblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7a2V5fTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblxuXHRcdGlmICgnU3RhdHVzJyBpbiByZXNwb25zZSAmJiByZXNwb25zZS5TdGF0dXMudG9VcHBlckNhc2UoKS5pbmRleE9mKCdSRUFDSEFCTEUnKSA+PSAwKSB7XG5cdFx0XHQkc3RhdHVzLnJlbW92ZUNsYXNzKCdncmV5JykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHR9XG5cdFx0aWYgKCRzdGF0dXMuaGFzQ2xhc3MoJ2dyZWVuJykpIHtcblx0XHRcdCRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PZmZsaW5lKTtcblx0XHR9XG5cdH0sXG59O1xuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG5cdGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG5cdGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cdGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aD4wXG5cdFx0JiYgKFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScwJ1xuXHRcdFx0fHxcblx0XHRcdGZ3ZFJpbmdMZW5ndGg9PT0nJ1xuXHRcdCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vLyDQn9GA0L7QstC10YDQutCwINC90LXRgiDQu9C4INC+0YjQuNCx0LrQuCDQt9Cw0L3Rj9GC0L7Qs9C+INC00YDRg9Cz0L7QuSDRg9GH0LXRgtC60L7QuSDQvdC+0LzQtdGA0LBcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuXHRhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19