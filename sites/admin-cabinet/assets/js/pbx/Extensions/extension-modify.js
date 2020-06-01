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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiJGNvZGVjc0NoZWNrYm94ZXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwidmFsaWRhdGVSdWxlcyIsIm51bWJlciIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImRlcGVuZHMiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsImlucHV0bWFzayIsInRhYiIsImNoZWNrYm94IiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJpbml0aWFsaXplRm9ybSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjb25zb2xlIiwibG9nIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsInBhcnNlSW50IiwiZXhpc3RSdWxlIiwicGFy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LEVBQUFBLHlCQUF5QixDQUFDeEgsVUFBMUI7QUFDQSxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIElucHV0TWFza1BhdHRlcm5zICovXG5cblxuY29uc3QgZXh0ZW5zaW9uID0ge1xuXHRkZWZhdWx0RW1haWw6ICcnLFxuXHRkZWZhdWx0TnVtYmVyOiAnJyxcblx0ZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG5cdCRudW1iZXI6ICQoJyNudW1iZXInKSxcblx0JHNpcF9zZWNyZXQ6ICQoJyNzaXBfc2VjcmV0JyksXG5cdCRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuXHQkZndkX2ZvcndhcmRpbmc6ICQoJyNmd2RfZm9yd2FyZGluZycpLFxuXHQkZndkX2ZvcndhcmRpbmdvbmJ1c3k6ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeScpLFxuXHQkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG5cdCRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcblx0JGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblx0JHRhYk1lbnVJdGVtczogJCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpLFxuXHQkY29kZWNzQ2hlY2tib3hlczogJCgnI2V4dGVuc2lvbnMtZm9ybSAuY29kZWNzJyksXG5cdGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRudW1iZXI6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdudW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVtudW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdG1vYmlsZV9udW1iZXI6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdtYXNrJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dXNlcl9lbWFpbDoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtYWlsJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dXNlcl91c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfdXNlcm5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHNpcF9zZWNyZXQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX3JpbmdsZW5ndGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclsxMC4uMTgwXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmc6IHtcblx0XHRcdGRlcGVuZHM6ICdmd2RfcmluZ2xlbmd0aCcsXG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cblx0XHRleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoKTtcblx0XHRleHRlbnNpb24uJGNvZGVjc0NoZWNrYm94ZXMuY2hlY2tib3goKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHQkKCcjcXVhbGlmeScpLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRpZiAoJCgnI3F1YWxpZnknKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblx0XHRFeHRlbnNpb25zLmZpeEJ1Z0Ryb3Bkb3duSWNvbigpO1xuXG5cdFx0aWYgKCQoJyNzaXBfc2VjcmV0JykudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG5cdFx0JCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHRleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG5cdFx0XHRpbnB1dG1hc2s6IHtcblx0XHRcdFx0ZGVmaW5pdGlvbnM6IHtcblx0XHRcdFx0XHQnIyc6IHtcblx0XHRcdFx0XHRcdHZhbGlkYXRvcjogJ1swLTldJyxcblx0XHRcdFx0XHRcdGNhcmRpbmFsaXR5OiAxLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogbWFza0xpc3QsXG5cdFx0XHRsaXN0S2V5OiAnbWFzaycsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuXHRcdFx0b25Vbk1hc2s6IGV4dGVuc2lvbi5jYk9uVW5tYXNrRW1haWwsXG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwsXG5cdFx0fSk7XG5cblx0XHRleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstC+0L7QtNCwINC90L7QvNC10YDQsCDRgtC10LvQtdGE0L7QvdCwINC00LvRjyDQv9GA0L7QstC10YDQutC4INC90LXRgiDQu9C4INC/0LXRgNC10YHQtdGH0LXQvdC40Lkg0YFcblx0ICog0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC80Lgg0L3QvtC80LXRgNCw0LzQuFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuXHRcdGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9C+0YHQu9C1INCy0LLQvtC00LAg0L/QvtC70L3QvtCz0L4gRW1haWwg0LDQtNGA0LXRgdCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVFbWFpbCgpIHtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4IEVtYWlsXG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXVzZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogJy51aS5pbnB1dC5lbWFpbCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG5cdFx0XHRcdFx0fHwgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9PT0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHQkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC/0L7Qu9GD0YfQtdC90LjQuCDQsdC10LfQvNCw0YHQvtGH0L3QvtCz0L4g0LfQvdCw0YfQtdC90LjRj1xuXHQgKi9cblx0Y2JPblVubWFza0VtYWlsKG1hc2tlZFZhbHVlLCB1bm1hc2tlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHVubWFza2VkVmFsdWU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0LLQstC+0LTQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0Y29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCDQstGL0LHRgNCw0L3QvdGL0Lkg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuXHRcdC8vINCf0LXRgNC10LfQsNC/0L7Qu9C90LjQvCDRgdGC0YDQvtC60YMg0LTQvtC90LDQsdC+0YDQsFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG5cdFx0XHR8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcblx0XHQpIHtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdH1cblxuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQvNC10L3Rj9C70YHRjyDQu9C4INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0aWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG5cdFx0Y29uc29sZS5sb2coYG5ldyBtb2JpbGUgbnVtYmVyICR7ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJ9IGApO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC+0YfQuNGB0YLQutC1INC80L7QsdC40LvRjNC90L7Qs9C+INGC0LXQu9C10YTQvtC90LAg0LIg0LrQsNGA0YLQvtGH0LrQtSDRgdC+0YLRgNGD0LTQvdC40LrQsFxuXHQgKi9cblx0Y2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcblx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cblxuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQsdGL0LvQsCDQu9C4INC90LDRgdGC0YDQvtC10L3QsCDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjRjyDQvdCwINC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAnJyk7XG5cblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAtMSk7XG5cdFx0fVxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIC0xKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcblx0fSxcblxuXHQvKipcblx0ICogZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpINCg0LDQsdC+0YLQsCDRgSDQv9Cw0YDQvtC70LXQvCBTSVAg0YPRh9C10YLQutC4XG5cdCAqL1xuXHRnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuXHRcdGNvbnN0IGNoYXJzID0gJ2FiY2RlZjEyMzQ1Njc4OTAnO1xuXHRcdGxldCBwYXNzID0gJyc7XG5cdFx0Zm9yIChsZXQgeCA9IDA7IHggPCAzMjsgeCArPSAxKSB7XG5cdFx0XHRjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblx0XHRcdHBhc3MgKz0gY2hhcnMuY2hhckF0KGkpO1xuXHRcdH1cblx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKHBhc3MpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG5cdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZVJlcHJlc2VudChleHRlbnNpb24uZGVmYXVsdE51bWJlcik7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuY29uc3QgYXZhdGFyID0ge1xuXHQkcGljdHVyZTogJCgnI2F2YXRhcicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGlmIChhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJykgPT09ICcnKSB7XG5cdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1wdWJsaWMvYXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdH1cblx0XHQkKCcjdXBsb2FkLW5ldy1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHQkKCcjZmlsZS1zZWxlY3QnKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2NsZWFyLWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfXB1YmxpYy9hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbnVsbCk7XG5cdFx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fSk7XG5cblx0XHQkKCcjZmlsZS1zZWxlY3QnKS5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdGxldCBpbWFnZTtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNvbnN0IGRhdGFUcmFuc2ZlciA9ICdkYXRhVHJhbnNmZXInIGluIGUgPyBlLmRhdGFUcmFuc2Zlci5maWxlcyA6IFtdO1xuXHRcdFx0Y29uc3QgaW1hZ2VzID0gJ2ZpbGVzJyBpbiBlLnRhcmdldCA/IGUudGFyZ2V0LmZpbGVzIDogZGF0YVRyYW5zZmVyO1xuXHRcdFx0aWYgKGltYWdlcyAmJiBpbWFnZXMubGVuZ3RoKSB7XG5cdFx0XHRcdEFycmF5LmZyb20oaW1hZ2VzKS5mb3JFYWNoKChjdXJJbWFnZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgY3VySW1hZ2UgIT09ICdvYmplY3QnKSByZXR1cm47XG5cdFx0XHRcdFx0aW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdFx0XHRpbWFnZS5zcmMgPSBhdmF0YXIuY3JlYXRlT2JqZWN0VVJMKGN1ckltYWdlKTtcblx0XHRcdFx0XHRpbWFnZS5vbmxvYWQgPSAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGFyZ3MgPSB7XG5cdFx0XHRcdFx0XHRcdHNyYzogZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHRcdFx0XHR3aWR0aDogMjAwLFxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0XHRcdFx0dHlwZTogJ2ltYWdlL3BuZycsXG5cdFx0XHRcdFx0XHRcdGNvbXByZXNzOiA5MCxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRjb25zdCBteWJhc2U2NHJlc2l6ZWQgPSBhdmF0YXIucmVzaXplQ3JvcChhcmdzKTtcblx0XHRcdFx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBteWJhc2U2NHJlc2l6ZWQpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd1c2VyX2F2YXRhcicsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHJlc2l6ZUNyb3Aoe1xuXHRcdHNyYywgd2lkdGgsIGhlaWdodCwgdHlwZSwgY29tcHJlc3MsXG5cdH0pIHtcblx0XHRsZXQgbmV3V2lkdGggPSB3aWR0aDtcblx0XHRsZXQgbmV3SGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdGNvbnN0IGNyb3AgPSBuZXdXaWR0aCA9PT0gMCB8fCBuZXdIZWlnaHQgPT09IDA7XG5cdFx0Ly8gbm90IHJlc2l6ZVxuXHRcdGlmIChzcmMud2lkdGggPD0gbmV3V2lkdGggJiYgbmV3SGVpZ2h0ID09PSAwKSB7XG5cdFx0XHRuZXdXaWR0aCA9IHNyYy53aWR0aDtcblx0XHRcdG5ld0hlaWdodCA9IHNyYy5oZWlnaHQ7XG5cdFx0fVxuXHRcdC8vIHJlc2l6ZVxuXHRcdGlmIChzcmMud2lkdGggPiBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld0hlaWdodCA9IHNyYy5oZWlnaHQgKiAobmV3V2lkdGggLyBzcmMud2lkdGgpO1xuXHRcdH1cblx0XHQvLyBjaGVjayBzY2FsZVxuXHRcdGNvbnN0IHhzY2FsZSA9IG5ld1dpZHRoIC8gc3JjLndpZHRoO1xuXHRcdGNvbnN0IHlzY2FsZSA9IG5ld0hlaWdodCAvIHNyYy5oZWlnaHQ7XG5cdFx0Y29uc3Qgc2NhbGUgPSBjcm9wID8gTWF0aC5taW4oeHNjYWxlLCB5c2NhbGUpIDogTWF0aC5tYXgoeHNjYWxlLCB5c2NhbGUpO1xuXHRcdC8vIGNyZWF0ZSBlbXB0eSBjYW52YXNcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRjYW52YXMud2lkdGggPSBuZXdXaWR0aCB8fCBNYXRoLnJvdW5kKHNyYy53aWR0aCAqIHNjYWxlKTtcblx0XHRjYW52YXMuaGVpZ2h0ID0gbmV3SGVpZ2h0IHx8IE1hdGgucm91bmQoc3JjLmhlaWdodCAqIHNjYWxlKTtcblx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5zY2FsZShzY2FsZSwgc2NhbGUpO1xuXHRcdC8vIGNyb3AgaXQgdG9wIGNlbnRlclxuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLmRyYXdJbWFnZShzcmMsICgoc3JjLndpZHRoICogc2NhbGUpIC0gY2FudmFzLndpZHRoKSAqIC0wLjUsICgoc3JjLmhlaWdodCAqIHNjYWxlKSAtIGNhbnZhcy5oZWlnaHQpICogLTAuNSk7XG5cdFx0cmV0dXJuIGNhbnZhcy50b0RhdGFVUkwodHlwZSwgY29tcHJlc3MpO1xuXHR9LFxuXHRjcmVhdGVPYmplY3RVUkwoaSkge1xuXHRcdGNvbnN0IFVSTCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCB8fCB3aW5kb3cubW96VVJMIHx8IHdpbmRvdy5tc1VSTDtcblx0XHRyZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChpKTtcblx0fSxcblxufTtcblxuXG5jb25zdCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0JHN0YXR1c0xhYmVsOiAkKCcjc3RhdHVzJyksXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplKCkg0YHQvtC30LTQsNC90LjQtSDQvtCx0YrQtdC60YLQvtCyINC4INC30LDQv9GD0YHQuiDQuNGFXG5cdCAqL1xuXHRpbml0aWFsaXplKCkge1xuXHRcdERlYnVnZ2VySW5mby5pbml0aWFsaXplKCk7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRpZiAoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0Y29uc3QgcGFyYW0gPSB7IHBlZXI6IGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyIH07XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5HZXRQZWVyU3RhdHVzKHBhcmFtLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMoKSDQntCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINC/0LjRgNCwXG5cdCAqL1xuXHRjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMocmVzcG9uc2UpIHtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRjb25zdCAkc3RhdHVzID0gZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzTGFiZWw7XG5cblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7a2V5fTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblxuXHRcdGlmICgnU3RhdHVzJyBpbiByZXNwb25zZSAmJiByZXNwb25zZS5TdGF0dXMudG9VcHBlckNhc2UoKS5pbmRleE9mKCdSRUFDSEFCTEUnKSA+PSAwKSB7XG5cdFx0XHQkc3RhdHVzLnJlbW92ZUNsYXNzKCdncmV5JykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHR9XG5cdFx0aWYgKCRzdGF0dXMuaGFzQ2xhc3MoJ2dyZWVuJykpIHtcblx0XHRcdCRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PZmZsaW5lKTtcblx0XHR9XG5cdH0sXG59O1xuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG5cdGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG5cdGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cdGlmICgoZndkUmluZ0xlbmd0aCA+IDApICYmXG5cdFx0KHBhcnNlSW50KGZ3ZEZvcndhcmRpbmcsIDEwKSA9PT0gLTEgfHwgZndkRm9yd2FyZGluZyA9PT0gJycpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdC10YIg0LvQuCDQvtGI0LjQsdC60Lgg0LfQsNC90Y/RgtC+0LPQviDQtNGA0YPQs9C+0Lkg0YPRh9C10YLQutC+0Lkg0L3QvtC80LXRgNCwXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcblx0YXZhdGFyLmluaXRpYWxpemUoKTtcblx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==