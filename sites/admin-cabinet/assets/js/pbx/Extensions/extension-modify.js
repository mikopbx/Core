/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
  initialize: function () {
    function initialize() {
      extension.defaultEmail = extension.$email.inputmask('unmaskedvalue');
      extension.defaultMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
      extension.defaultNumber = extension.$number.inputmask('unmaskedvalue');
      extension.$tabMenuItems.tab();
      $('#extensions-form .ui.accordion').accordion();
      $('#extensions-form .dropdown').dropdown();
      $('#qualify').checkbox({
        onChange: function () {
          function onChange() {
            if ($('#qualify').checkbox('is checked')) {
              $('#qualify-freq').removeClass('disabled');
            } else {
              $('#qualify-freq').addClass('disabled');
            }
          }

          return onChange;
        }()
      });
      $(extension.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());
      Extensions.fixBugDropdownIcon();
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
    }

    return initialize;
  }(),

  /**
   * Вызывается после воода номера телефона для проверки нет ли пересечений с
   * существующими номерами
   */
  cbOnCompleteNumber: function () {
    function cbOnCompleteNumber() {
      var newNumber = extension.$number.inputmask('unmaskedvalue');
      var userId = extension.$formObj.form('get value', 'user_id');
      Extensions.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
    }

    return cbOnCompleteNumber;
  }(),

  /**
   * Вызывается после ввода полного Email адреса
   */
  cbOnCompleteEmail: function () {
    function cbOnCompleteEmail() {
      // Динамическая прововерка свободен ли Email
      $.api({
        url: "".concat(globalRootUrl, "users/available/{value}"),
        stateContext: '.ui.input.email',
        on: 'now',
        beforeSend: function () {
          function beforeSend(settings) {
            var result = settings;
            result.urlData = {
              value: extension.$email.inputmask('unmaskedvalue')
            };
            return result;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            if (response.emailAvailable || extension.defaultEmail === extension.$email.inputmask('unmaskedvalue')) {
              $('.ui.input.email').parent().removeClass('error');
              $('#email-error').addClass('hidden');
            } else {
              $('.ui.input.email').parent().addClass('error');
              $('#email-error').removeClass('hidden');
            }
          }

          return onSuccess;
        }()
      });
    }

    return cbOnCompleteEmail;
  }(),

  /**
   * Вызывается при получении безмасочного значения
   */
  cbOnUnmaskEmail: function () {
    function cbOnUnmaskEmail(maskedValue, unmaskedValue) {
      return unmaskedValue;
    }

    return cbOnUnmaskEmail;
  }(),

  /**
   * Вызывается при вводе мобильного телефона в карточке сотрудника
   */
  cbOnCompleteMobileNumber: function () {
    function cbOnCompleteMobileNumber() {
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
    }

    return cbOnCompleteMobileNumber;
  }(),

  /**
   * Вызывается при очистке мобильного телефона в карточке сотрудника
   */
  cbOnClearedMobileNumber: function () {
    function cbOnClearedMobileNumber() {
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
    }

    return cbOnClearedMobileNumber;
  }(),

  /**
   * generateNewSipPassword() Работа с паролем SIP учетки
   */
  generateNewSipPassword: function () {
    function generateNewSipPassword() {
      var chars = 'abcdef1234567890';
      var pass = '';

      for (var x = 0; x < 32; x += 1) {
        var i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
      }

      extension.$sip_secret.val(pass);
    }

    return generateNewSipPassword;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = extension.$formObj.form('get values');
      result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      extension.defaultNumber = extension.$number.val();
      Extensions.UpdatePhoneRepresent(extension.defaultNumber);
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = extension.$formObj;
      Form.url = "".concat(globalRootUrl, "extensions/save");
      Form.validateRules = extension.validateRules;
      Form.cbBeforeSendForm = extension.cbBeforeSendForm;
      Form.cbAfterSendForm = extension.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
var avatar = {
  $picture: $('#avatar'),
  initialize: function () {
    function initialize() {
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
    }

    return initialize;
  }(),
  resizeCrop: function () {
    function resizeCrop(_ref) {
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
    }

    return resizeCrop;
  }(),
  createObjectURL: function () {
    function createObjectURL(i) {
      var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
      return URL.createObjectURL(i);
    }

    return createObjectURL;
  }()
};
var extensionStatusLoopWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $statusLabel: $('#status'),

  /**
   * initialize() создание объектов и запуск их
   */
  initialize: function () {
    function initialize() {
      DebuggerInfo.initialize();

      if (extension.$formObj.form('get value', 'id') !== '') {
        extensionStatusLoopWorker.restartWorker();
      }
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
      extensionStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      if (extension.defaultNumber.length === 0) return;
      var param = {
        peer: extension.defaultNumber
      };
      window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
      PbxApi.GetPeerStatus(param, extensionStatusLoopWorker.cbRefreshExtensionStatus);
    }

    return worker;
  }(),

  /**
   * cbRefreshExtensionStatus() Обновление статусов пира
   */
  cbRefreshExtensionStatus: function () {
    function cbRefreshExtensionStatus(response) {
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

    return cbRefreshExtensionStatus;
  }()
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsImlucHV0bWFzayIsInRhYiIsImFjY29yZGlvbiIsImRyb3Bkb3duIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJpbml0aWFsaXplRm9ybSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjb25zb2xlIiwibG9nIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFt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QUFBQSxTQUFTLENBQUMyQyxVQUFWO0FBQ0E0RSxFQUFBQSxNQUFNLENBQUM1RSxVQUFQO0FBQ0F3SCxFQUFBQSx5QkFBeUIsQ0FBQ3hILFVBQTFCO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIFBieEFwaSwgRGVidWdnZXJJbmZvLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbiA9IHtcblx0ZGVmYXVsdEVtYWlsOiAnJyxcblx0ZGVmYXVsdE51bWJlcjogJycsXG5cdGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuXHQkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG5cdCRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuXHQkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcblx0JGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuXHQkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cdCRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblx0Zm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG51bWJlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ251bWJlcicsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9yaW5nbGVuZ3RoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0ZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlcls1Li4xODBdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZzoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cblx0XHRleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHQkKCcjcXVhbGlmeScpLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRpZiAoJCgnI3F1YWxpZnknKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblx0XHRFeHRlbnNpb25zLmZpeEJ1Z0Ryb3Bkb3duSWNvbigpO1xuXG5cdFx0aWYgKCQoJyNzaXBfc2VjcmV0JykudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG5cdFx0JCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHRleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG5cdFx0XHRpbnB1dG1hc2s6IHtcblx0XHRcdFx0ZGVmaW5pdGlvbnM6IHtcblx0XHRcdFx0XHQnIyc6IHtcblx0XHRcdFx0XHRcdHZhbGlkYXRvcjogJ1swLTldJyxcblx0XHRcdFx0XHRcdGNhcmRpbmFsaXR5OiAxLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogbWFza0xpc3QsXG5cdFx0XHRsaXN0S2V5OiAnbWFzaycsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuXHRcdFx0b25Vbk1hc2s6IGV4dGVuc2lvbi5jYk9uVW5tYXNrRW1haWwsXG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwsXG5cdFx0fSk7XG5cblx0XHRleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstC+0L7QtNCwINC90L7QvNC10YDQsCDRgtC10LvQtdGE0L7QvdCwINC00LvRjyDQv9GA0L7QstC10YDQutC4INC90LXRgiDQu9C4INC/0LXRgNC10YHQtdGH0LXQvdC40Lkg0YFcblx0ICog0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC80Lgg0L3QvtC80LXRgNCw0LzQuFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuXHRcdGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9C+0YHQu9C1INCy0LLQvtC00LAg0L/QvtC70L3QvtCz0L4gRW1haWwg0LDQtNGA0LXRgdCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVFbWFpbCgpIHtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4IEVtYWlsXG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXVzZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogJy51aS5pbnB1dC5lbWFpbCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG5cdFx0XHRcdFx0fHwgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9PT0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHQkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC/0L7Qu9GD0YfQtdC90LjQuCDQsdC10LfQvNCw0YHQvtGH0L3QvtCz0L4g0LfQvdCw0YfQtdC90LjRj1xuXHQgKi9cblx0Y2JPblVubWFza0VtYWlsKG1hc2tlZFZhbHVlLCB1bm1hc2tlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHVubWFza2VkVmFsdWU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0LLQstC+0LTQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0Y29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCDQstGL0LHRgNCw0L3QvdGL0Lkg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuXHRcdC8vINCf0LXRgNC10LfQsNC/0L7Qu9C90LjQvCDRgdGC0YDQvtC60YMg0LTQvtC90LDQsdC+0YDQsFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG5cdFx0XHR8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcblx0XHQpIHtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdH1cblxuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQvNC10L3Rj9C70YHRjyDQu9C4INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0aWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG5cdFx0Y29uc29sZS5sb2coYG5ldyBtb2JpbGUgbnVtYmVyICR7ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJ9IGApO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC+0YfQuNGB0YLQutC1INC80L7QsdC40LvRjNC90L7Qs9C+INGC0LXQu9C10YTQvtC90LAg0LIg0LrQsNGA0YLQvtGH0LrQtSDRgdC+0YLRgNGD0LTQvdC40LrQsFxuXHQgKi9cblx0Y2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcblx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cblxuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQsdGL0LvQsCDQu9C4INC90LDRgdGC0YDQvtC10L3QsCDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjRjyDQvdCwINC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAnJyk7XG5cblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAtMSk7XG5cdFx0fVxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIC0xKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcblx0fSxcblxuXHQvKipcblx0ICogZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpINCg0LDQsdC+0YLQsCDRgSDQv9Cw0YDQvtC70LXQvCBTSVAg0YPRh9C10YLQutC4XG5cdCAqL1xuXHRnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuXHRcdGNvbnN0IGNoYXJzID0gJ2FiY2RlZjEyMzQ1Njc4OTAnO1xuXHRcdGxldCBwYXNzID0gJyc7XG5cdFx0Zm9yIChsZXQgeCA9IDA7IHggPCAzMjsgeCArPSAxKSB7XG5cdFx0XHRjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblx0XHRcdHBhc3MgKz0gY2hhcnMuY2hhckF0KGkpO1xuXHRcdH1cblx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKHBhc3MpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG5cdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZVJlcHJlc2VudChleHRlbnNpb24uZGVmYXVsdE51bWJlcik7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuY29uc3QgYXZhdGFyID0ge1xuXHQkcGljdHVyZTogJCgnI2F2YXRhcicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGlmIChhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJykgPT09ICcnKSB7XG5cdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG5cdFx0fVxuXHRcdCQoJyN1cGxvYWQtbmV3LWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdCQoJyNmaWxlLXNlbGVjdCcpLmNsaWNrKCk7XG5cdFx0fSk7XG5cblx0XHQkKCcjY2xlYXItYXZhdGFyJykub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd1c2VyX2F2YXRhcicsIG51bGwpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2ZpbGUtc2VsZWN0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRsZXQgaW1hZ2U7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBkYXRhVHJhbnNmZXIgPSAnZGF0YVRyYW5zZmVyJyBpbiBlID8gZS5kYXRhVHJhbnNmZXIuZmlsZXMgOiBbXTtcblx0XHRcdGNvbnN0IGltYWdlcyA9ICdmaWxlcycgaW4gZS50YXJnZXQgPyBlLnRhcmdldC5maWxlcyA6IGRhdGFUcmFuc2Zlcjtcblx0XHRcdGlmIChpbWFnZXMgJiYgaW1hZ2VzLmxlbmd0aCkge1xuXHRcdFx0XHRBcnJheS5mcm9tKGltYWdlcykuZm9yRWFjaCgoY3VySW1hZ2UpID0+IHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGN1ckltYWdlICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuXHRcdFx0XHRcdGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRcdFx0aW1hZ2Uuc3JjID0gYXZhdGFyLmNyZWF0ZU9iamVjdFVSTChjdXJJbWFnZSk7XG5cdFx0XHRcdFx0aW1hZ2Uub25sb2FkID0gKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBhcmdzID0ge1xuXHRcdFx0XHRcdFx0XHRzcmM6IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRcdFx0d2lkdGg6IDIwMCxcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdFx0XHRcdHR5cGU6ICdpbWFnZS9wbmcnLFxuXHRcdFx0XHRcdFx0XHRjb21wcmVzczogOTAsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Y29uc3QgbXliYXNlNjRyZXNpemVkID0gYXZhdGFyLnJlc2l6ZUNyb3AoYXJncyk7XG5cdFx0XHRcdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBteWJhc2U2NHJlc2l6ZWQpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRyZXNpemVDcm9wKHtcblx0XHRzcmMsIHdpZHRoLCBoZWlnaHQsIHR5cGUsIGNvbXByZXNzLFxuXHR9KSB7XG5cdFx0bGV0IG5ld1dpZHRoID0gd2lkdGg7XG5cdFx0bGV0IG5ld0hlaWdodCA9IGhlaWdodDtcblx0XHRjb25zdCBjcm9wID0gbmV3V2lkdGggPT09IDAgfHwgbmV3SGVpZ2h0ID09PSAwO1xuXHRcdC8vIG5vdCByZXNpemVcblx0XHRpZiAoc3JjLndpZHRoIDw9IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3V2lkdGggPSBzcmMud2lkdGg7XG5cdFx0XHRuZXdIZWlnaHQgPSBzcmMuaGVpZ2h0O1xuXHRcdH1cblx0XHQvLyByZXNpemVcblx0XHRpZiAoc3JjLndpZHRoID4gbmV3V2lkdGggJiYgbmV3SGVpZ2h0ID09PSAwKSB7XG5cdFx0XHRuZXdIZWlnaHQgPSBzcmMuaGVpZ2h0ICogKG5ld1dpZHRoIC8gc3JjLndpZHRoKTtcblx0XHR9XG5cdFx0Ly8gY2hlY2sgc2NhbGVcblx0XHRjb25zdCB4c2NhbGUgPSBuZXdXaWR0aCAvIHNyYy53aWR0aDtcblx0XHRjb25zdCB5c2NhbGUgPSBuZXdIZWlnaHQgLyBzcmMuaGVpZ2h0O1xuXHRcdGNvbnN0IHNjYWxlID0gY3JvcCA/IE1hdGgubWluKHhzY2FsZSwgeXNjYWxlKSA6IE1hdGgubWF4KHhzY2FsZSwgeXNjYWxlKTtcblx0XHQvLyBjcmVhdGUgZW1wdHkgY2FudmFzXG5cdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Y2FudmFzLndpZHRoID0gbmV3V2lkdGggfHwgTWF0aC5yb3VuZChzcmMud2lkdGggKiBzY2FsZSk7XG5cdFx0Y2FudmFzLmhlaWdodCA9IG5ld0hlaWdodCB8fCBNYXRoLnJvdW5kKHNyYy5oZWlnaHQgKiBzY2FsZSk7XG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuc2NhbGUoc2NhbGUsIHNjYWxlKTtcblx0XHQvLyBjcm9wIGl0IHRvcCBjZW50ZXJcblx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2Uoc3JjLCAoKHNyYy53aWR0aCAqIHNjYWxlKSAtIGNhbnZhcy53aWR0aCkgKiAtMC41LCAoKHNyYy5oZWlnaHQgKiBzY2FsZSkgLSBjYW52YXMuaGVpZ2h0KSAqIC0wLjUpO1xuXHRcdHJldHVybiBjYW52YXMudG9EYXRhVVJMKHR5cGUsIGNvbXByZXNzKTtcblx0fSxcblx0Y3JlYXRlT2JqZWN0VVJMKGkpIHtcblx0XHRjb25zdCBVUkwgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93Lm1velVSTCB8fCB3aW5kb3cubXNVUkw7XG5cdFx0cmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwoaSk7XG5cdH0sXG5cbn07XG5cblxuY29uc3QgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRzdGF0dXNMYWJlbDogJCgnI3N0YXR1cycpLFxuXHQvKipcblx0ICogaW5pdGlhbGl6ZSgpINGB0L7Qt9C00LDQvdC40LUg0L7QsdGK0LXQutGC0L7QsiDQuCDQt9Cw0L/Rg9GB0Log0LjRhVxuXHQgKi9cblx0aW5pdGlhbGl6ZSgpIHtcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaWQnKSE9PScnKXtcblx0XHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdH1cblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdGlmIChleHRlbnNpb24uZGVmYXVsdE51bWJlci5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHRjb25zdCBwYXJhbSA9IHsgcGVlcjogZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgfTtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLkdldFBlZXJTdGF0dXMocGFyYW0sIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKTtcblx0fSxcblx0LyoqXG5cdCAqIGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cygpINCe0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0L/QuNGA0LBcblx0ICovXG5cdGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyhyZXNwb25zZSkge1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLndvcmtlciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGNvbnN0ICRzdGF0dXMgPSBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLiRzdGF0dXNMYWJlbDtcblxuXHRcdGxldCBodG1sVGFibGUgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHQkLmVhY2gocmVzcG9uc2UsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRodG1sVGFibGUgKz0gJzx0cj4nO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHtrZXl9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXG5cdFx0aWYgKCdTdGF0dXMnIGluIHJlc3BvbnNlICYmIHJlc3BvbnNlLlN0YXR1cy50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ1JFQUNIQUJMRScpID49IDApIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZXknKS5hZGRDbGFzcygnZ3JlZW4nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygnZ3JleScpO1xuXHRcdH1cblx0XHRpZiAoJHN0YXR1cy5oYXNDbGFzcygnZ3JlZW4nKSkge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUpO1xuXHRcdH1cblx0fSxcbn07XG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcblx0Y29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcblx0Y29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblx0aWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoPjBcblx0XHQmJiAoXG5cdFx0XHRmd2RSaW5nTGVuZ3RoPT09JzAnXG5cdFx0XHR8fFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScnXG5cdFx0KSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8vINCf0YDQvtCy0LXRgNC60LAg0L3QtdGCINC70Lgg0L7RiNC40LHQutC4INC30LDQvdGP0YLQvtCz0L4g0LTRgNGD0LPQvtC5INGD0YfQtdGC0LrQvtC5INC90L7QvNC10YDQsFxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG5cdGF2YXRhci5pbml0aWFsaXplKCk7XG5cdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=