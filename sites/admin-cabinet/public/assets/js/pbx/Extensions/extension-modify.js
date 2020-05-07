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
  $codecsCheckboxes: $('#extensions-form .codecs'),
  forwardingSelect: '#extensions-form .forwarding-select',
  validateRules: {
    number: {
      identifier: 'number',
      rules: [{
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
      optional: true,
      rules: [{
        type: 'integer[10..180]',
        prompt: globalTranslate.ex_ValidateRingingBeforeForwardOutOfRange
      }]
    },
    fwd_forwarding: {
      depends: 'fwd_ringlength',
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
      Extensions.initialize();
      extension.defaultEmail = extension.$email.inputmask('unmaskedvalue');
      extension.defaultMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
      extension.defaultNumber = extension.$number.inputmask('unmaskedvalue');
      extension.$tabMenuItems.tab();
      extension.$codecsCheckboxes.checkbox();
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
        avatar.$picture.attr('src', "".concat(globalRootUrl, "public/assets/img/unknownPerson.jpg"));
      }

      $('#upload-new-avatar').on('click', function () {
        $('#file-select').click();
      });
      $('#clear-avatar').on('click', function () {
        avatar.$picture.attr('src', "".concat(globalRootUrl, "public/assets/img/unknownPerson.jpg"));
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
      extensionStatusLoopWorker.restartWorker();
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

  if (fwdRingLength > 0 && (parseInt(fwdForwarding, 10) === -1 || fwdForwarding === '')) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiJGNvZGVjc0NoZWNrYm94ZXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwidmFsaWRhdGVSdWxlcyIsIm51bWJlciIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImRlcGVuZHMiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsIkV4dGVuc2lvbnMiLCJpbnB1dG1hc2siLCJ0YWIiLCJjaGVja2JveCIsImFjY29yZGlvbiIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJpbml0aWFsaXplRm9ybSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjb25zb2xlIiwibG9nIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsInBhcnNlSW50IiwiZXhpc3RSdWxlIiwicGFy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QUFBQSxNQUFNLENBQUM1RSxVQUFQO0FBQ0F3SCxFQUFBQSx5QkFBeUIsQ0FBQ3hILFVBQTFCO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIFBieEFwaSwgRGVidWdnZXJJbmZvLCBJbnB1dE1hc2tQYXR0ZXJucyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbiA9IHtcblx0ZGVmYXVsdEVtYWlsOiAnJyxcblx0ZGVmYXVsdE51bWJlcjogJycsXG5cdGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuXHQkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG5cdCRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuXHQkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcblx0JGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuXHQkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cdCRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblx0JGNvZGVjc0NoZWNrYm94ZXM6ICQoJyNleHRlbnNpb25zLWZvcm0gLmNvZGVjcycpLFxuXHRmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0bnVtYmVyOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9yaW5nbGVuZ3RoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMTAuLjE4MF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nOiB7XG5cdFx0XHRkZXBlbmRzOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG5cdFx0ZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG5cdFx0ZXh0ZW5zaW9uLiRjb2RlY3NDaGVja2JveGVzLmNoZWNrYm94KCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG5cdFx0JCgnI3F1YWxpZnknKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKCQoJyNxdWFsaWZ5JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQkKGV4dGVuc2lvbi5mb3J3YXJkaW5nU2VsZWN0KS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cdFx0RXh0ZW5zaW9ucy5maXhCdWdEcm9wZG93bkljb24oKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IGF2YXRhciA9IHtcblx0JHBpY3R1cmU6ICQoJyNhdmF0YXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoYXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycpID09PSAnJykge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9cHVibGljL2Fzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHR9XG5cdFx0JCgnI3VwbG9hZC1uZXctYXZhdGFyJykub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0JCgnI2ZpbGUtc2VsZWN0JykuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJyNjbGVhci1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1wdWJsaWMvYXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd1c2VyX2F2YXRhcicsIG51bGwpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2ZpbGUtc2VsZWN0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRsZXQgaW1hZ2U7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBkYXRhVHJhbnNmZXIgPSAnZGF0YVRyYW5zZmVyJyBpbiBlID8gZS5kYXRhVHJhbnNmZXIuZmlsZXMgOiBbXTtcblx0XHRcdGNvbnN0IGltYWdlcyA9ICdmaWxlcycgaW4gZS50YXJnZXQgPyBlLnRhcmdldC5maWxlcyA6IGRhdGFUcmFuc2Zlcjtcblx0XHRcdGlmIChpbWFnZXMgJiYgaW1hZ2VzLmxlbmd0aCkge1xuXHRcdFx0XHRBcnJheS5mcm9tKGltYWdlcykuZm9yRWFjaCgoY3VySW1hZ2UpID0+IHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGN1ckltYWdlICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuXHRcdFx0XHRcdGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRcdFx0aW1hZ2Uuc3JjID0gYXZhdGFyLmNyZWF0ZU9iamVjdFVSTChjdXJJbWFnZSk7XG5cdFx0XHRcdFx0aW1hZ2Uub25sb2FkID0gKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBhcmdzID0ge1xuXHRcdFx0XHRcdFx0XHRzcmM6IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRcdFx0d2lkdGg6IDIwMCxcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdFx0XHRcdHR5cGU6ICdpbWFnZS9wbmcnLFxuXHRcdFx0XHRcdFx0XHRjb21wcmVzczogOTAsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Y29uc3QgbXliYXNlNjRyZXNpemVkID0gYXZhdGFyLnJlc2l6ZUNyb3AoYXJncyk7XG5cdFx0XHRcdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBteWJhc2U2NHJlc2l6ZWQpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRyZXNpemVDcm9wKHtcblx0XHRzcmMsIHdpZHRoLCBoZWlnaHQsIHR5cGUsIGNvbXByZXNzLFxuXHR9KSB7XG5cdFx0bGV0IG5ld1dpZHRoID0gd2lkdGg7XG5cdFx0bGV0IG5ld0hlaWdodCA9IGhlaWdodDtcblx0XHRjb25zdCBjcm9wID0gbmV3V2lkdGggPT09IDAgfHwgbmV3SGVpZ2h0ID09PSAwO1xuXHRcdC8vIG5vdCByZXNpemVcblx0XHRpZiAoc3JjLndpZHRoIDw9IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3V2lkdGggPSBzcmMud2lkdGg7XG5cdFx0XHRuZXdIZWlnaHQgPSBzcmMuaGVpZ2h0O1xuXHRcdH1cblx0XHQvLyByZXNpemVcblx0XHRpZiAoc3JjLndpZHRoID4gbmV3V2lkdGggJiYgbmV3SGVpZ2h0ID09PSAwKSB7XG5cdFx0XHRuZXdIZWlnaHQgPSBzcmMuaGVpZ2h0ICogKG5ld1dpZHRoIC8gc3JjLndpZHRoKTtcblx0XHR9XG5cdFx0Ly8gY2hlY2sgc2NhbGVcblx0XHRjb25zdCB4c2NhbGUgPSBuZXdXaWR0aCAvIHNyYy53aWR0aDtcblx0XHRjb25zdCB5c2NhbGUgPSBuZXdIZWlnaHQgLyBzcmMuaGVpZ2h0O1xuXHRcdGNvbnN0IHNjYWxlID0gY3JvcCA/IE1hdGgubWluKHhzY2FsZSwgeXNjYWxlKSA6IE1hdGgubWF4KHhzY2FsZSwgeXNjYWxlKTtcblx0XHQvLyBjcmVhdGUgZW1wdHkgY2FudmFzXG5cdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Y2FudmFzLndpZHRoID0gbmV3V2lkdGggfHwgTWF0aC5yb3VuZChzcmMud2lkdGggKiBzY2FsZSk7XG5cdFx0Y2FudmFzLmhlaWdodCA9IG5ld0hlaWdodCB8fCBNYXRoLnJvdW5kKHNyYy5oZWlnaHQgKiBzY2FsZSk7XG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuc2NhbGUoc2NhbGUsIHNjYWxlKTtcblx0XHQvLyBjcm9wIGl0IHRvcCBjZW50ZXJcblx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2Uoc3JjLCAoKHNyYy53aWR0aCAqIHNjYWxlKSAtIGNhbnZhcy53aWR0aCkgKiAtMC41LCAoKHNyYy5oZWlnaHQgKiBzY2FsZSkgLSBjYW52YXMuaGVpZ2h0KSAqIC0wLjUpO1xuXHRcdHJldHVybiBjYW52YXMudG9EYXRhVVJMKHR5cGUsIGNvbXByZXNzKTtcblx0fSxcblx0Y3JlYXRlT2JqZWN0VVJMKGkpIHtcblx0XHRjb25zdCBVUkwgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93Lm1velVSTCB8fCB3aW5kb3cubXNVUkw7XG5cdFx0cmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwoaSk7XG5cdH0sXG5cbn07XG5cblxuY29uc3QgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRzdGF0dXNMYWJlbDogJCgnI3N0YXR1cycpLFxuXHQvKipcblx0ICogaW5pdGlhbGl6ZSgpINGB0L7Qt9C00LDQvdC40LUg0L7QsdGK0LXQutGC0L7QsiDQuCDQt9Cw0L/Rg9GB0Log0LjRhVxuXHQgKi9cblx0aW5pdGlhbGl6ZSgpIHtcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0aWYgKGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdGNvbnN0IHBhcmFtID0geyBwZWVyOiBleHRlbnNpb24uZGVmYXVsdE51bWJlciB9O1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuR2V0UGVlclN0YXR1cyhwYXJhbSwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMpO1xuXHR9LFxuXHQvKipcblx0ICogY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKCkg0J7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDQv9C40YDQsFxuXHQgKi9cblx0Y2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0Y29uc3QgJHN0YXR1cyA9IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuJHN0YXR1c0xhYmVsO1xuXG5cdFx0bGV0IGh0bWxUYWJsZSA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke2tleX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSAnPC90cj4nO1xuXHRcdH0pO1xuXHRcdGh0bWxUYWJsZSArPSAnPC90YWJsZT4nO1xuXHRcdERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG5cblx0XHRpZiAoJ1N0YXR1cycgaW4gcmVzcG9uc2UgJiYgcmVzcG9uc2UuU3RhdHVzLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignUkVBQ0hBQkxFJykgPj0gMCkge1xuXHRcdFx0JHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdncmVlbicpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc3RhdHVzLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCdncmV5Jyk7XG5cdFx0fVxuXHRcdGlmICgkc3RhdHVzLmhhc0NsYXNzKCdncmVlbicpKSB7XG5cdFx0XHQkc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfT2ZmbGluZSk7XG5cdFx0fVxuXHR9LFxufTtcblxuLy8g0JXRgdC70Lgg0LLRi9Cx0YDQsNC9INCy0LDRgNC40LDQvdGCINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNC4INC90LAg0L3QvtC80LXRgCwg0LAg0YHQsNC8INC90L7QvNC10YAg0L3QtSDQstGL0LHRgNCw0L1cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuXHRjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuXHRjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXHRpZiAoKGZ3ZFJpbmdMZW5ndGggPiAwKSAmJlxuXHRcdChwYXJzZUludChmd2RGb3J3YXJkaW5nLCAxMCkgPT09IC0xIHx8IGZ3ZEZvcndhcmRpbmcgPT09ICcnKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8vINCf0YDQvtCy0LXRgNC60LAg0L3QtdGCINC70Lgg0L7RiNC40LHQutC4INC30LDQvdGP0YLQvtCz0L4g0LTRgNGD0LPQvtC5INGD0YfQtdGC0LrQvtC5INC90L7QvNC10YDQsFxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG5cdGF2YXRhci5pbml0aWFsaXplKCk7XG5cdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=