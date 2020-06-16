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
      depends: 'fwd_forwarding',
      rules: [{
        type: 'integer[5..180]',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiJGNvZGVjc0NoZWNrYm94ZXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwidmFsaWRhdGVSdWxlcyIsIm51bWJlciIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsImlucHV0bWFzayIsInRhYiIsImNoZWNrYm94IiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJpbml0aWFsaXplRm9ybSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjb25zb2xlIiwibG9nIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsInJl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SkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBQYnhBcGksIERlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuXG5jb25zdCBleHRlbnNpb24gPSB7XG5cdGRlZmF1bHRFbWFpbDogJycsXG5cdGRlZmF1bHROdW1iZXI6ICcnLFxuXHRkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcblx0JG51bWJlcjogJCgnI251bWJlcicpLFxuXHQkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcblx0JG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG5cdCRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG5cdCRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG5cdCRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcblx0JGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXHQkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXHQkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cdCRjb2RlY3NDaGVja2JveGVzOiAkKCcjZXh0ZW5zaW9ucy1mb3JtIC5jb2RlY3MnKSxcblx0Zm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG51bWJlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bW9iaWxlX251bWJlcjoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ21hc2snLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX2VtYWlsOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1haWwnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX3VzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2lwX3NlY3JldDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3NpcF9zZWNyZXQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfcmluZ2xlbmd0aDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9yaW5nbGVuZ3RoJyxcblx0XHRcdGRlcGVuZHM6ICdmd2RfZm9yd2FyZGluZycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbNS4uMTgwXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmc6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG5cdFx0ZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG5cdFx0ZXh0ZW5zaW9uLiRjb2RlY3NDaGVja2JveGVzLmNoZWNrYm94KCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG5cdFx0JCgnI3F1YWxpZnknKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKCQoJyNxdWFsaWZ5JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQkKGV4dGVuc2lvbi5mb3J3YXJkaW5nU2VsZWN0KS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cdFx0RXh0ZW5zaW9ucy5maXhCdWdEcm9wZG93bkljb24oKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IGF2YXRhciA9IHtcblx0JHBpY3R1cmU6ICQoJyNhdmF0YXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoYXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycpID09PSAnJykge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdH1cblx0XHQkKCcjdXBsb2FkLW5ldy1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHQkKCcjZmlsZS1zZWxlY3QnKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2NsZWFyLWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBudWxsKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdCQoJyNmaWxlLXNlbGVjdCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0bGV0IGltYWdlO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZGF0YVRyYW5zZmVyID0gJ2RhdGFUcmFuc2ZlcicgaW4gZSA/IGUuZGF0YVRyYW5zZmVyLmZpbGVzIDogW107XG5cdFx0XHRjb25zdCBpbWFnZXMgPSAnZmlsZXMnIGluIGUudGFyZ2V0ID8gZS50YXJnZXQuZmlsZXMgOiBkYXRhVHJhbnNmZXI7XG5cdFx0XHRpZiAoaW1hZ2VzICYmIGltYWdlcy5sZW5ndGgpIHtcblx0XHRcdFx0QXJyYXkuZnJvbShpbWFnZXMpLmZvckVhY2goKGN1ckltYWdlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBjdXJJbWFnZSAhPT0gJ29iamVjdCcpIHJldHVybjtcblx0XHRcdFx0XHRpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0XHRcdGltYWdlLnNyYyA9IGF2YXRhci5jcmVhdGVPYmplY3RVUkwoY3VySW1hZ2UpO1xuXHRcdFx0XHRcdGltYWdlLm9ubG9hZCA9IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgYXJncyA9IHtcblx0XHRcdFx0XHRcdFx0c3JjOiBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiAyMDAsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcblx0XHRcdFx0XHRcdFx0Y29tcHJlc3M6IDkwLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGNvbnN0IG15YmFzZTY0cmVzaXplZCA9IGF2YXRhci5yZXNpemVDcm9wKGFyZ3MpO1xuXHRcdFx0XHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmVzaXplQ3JvcCh7XG5cdFx0c3JjLCB3aWR0aCwgaGVpZ2h0LCB0eXBlLCBjb21wcmVzcyxcblx0fSkge1xuXHRcdGxldCBuZXdXaWR0aCA9IHdpZHRoO1xuXHRcdGxldCBuZXdIZWlnaHQgPSBoZWlnaHQ7XG5cdFx0Y29uc3QgY3JvcCA9IG5ld1dpZHRoID09PSAwIHx8IG5ld0hlaWdodCA9PT0gMDtcblx0XHQvLyBub3QgcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA8PSBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld1dpZHRoID0gc3JjLndpZHRoO1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodDtcblx0XHR9XG5cdFx0Ly8gcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA+IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodCAqIChuZXdXaWR0aCAvIHNyYy53aWR0aCk7XG5cdFx0fVxuXHRcdC8vIGNoZWNrIHNjYWxlXG5cdFx0Y29uc3QgeHNjYWxlID0gbmV3V2lkdGggLyBzcmMud2lkdGg7XG5cdFx0Y29uc3QgeXNjYWxlID0gbmV3SGVpZ2h0IC8gc3JjLmhlaWdodDtcblx0XHRjb25zdCBzY2FsZSA9IGNyb3AgPyBNYXRoLm1pbih4c2NhbGUsIHlzY2FsZSkgOiBNYXRoLm1heCh4c2NhbGUsIHlzY2FsZSk7XG5cdFx0Ly8gY3JlYXRlIGVtcHR5IGNhbnZhc1xuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy53aWR0aCA9IG5ld1dpZHRoIHx8IE1hdGgucm91bmQoc3JjLndpZHRoICogc2NhbGUpO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXdIZWlnaHQgfHwgTWF0aC5yb3VuZChzcmMuaGVpZ2h0ICogc2NhbGUpO1xuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLnNjYWxlKHNjYWxlLCBzY2FsZSk7XG5cdFx0Ly8gY3JvcCBpdCB0b3AgY2VudGVyXG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHNyYywgKChzcmMud2lkdGggKiBzY2FsZSkgLSBjYW52YXMud2lkdGgpICogLTAuNSwgKChzcmMuaGVpZ2h0ICogc2NhbGUpIC0gY2FudmFzLmhlaWdodCkgKiAtMC41KTtcblx0XHRyZXR1cm4gY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBjb21wcmVzcyk7XG5cdH0sXG5cdGNyZWF0ZU9iamVjdFVSTChpKSB7XG5cdFx0Y29uc3QgVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXHRcdHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGkpO1xuXHR9LFxuXG59O1xuXG5cbmNvbnN0IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkc3RhdHVzTGFiZWw6ICQoJyNzdGF0dXMnKSxcblx0LyoqXG5cdCAqIGluaXRpYWxpemUoKSDRgdC+0LfQtNCw0L3QuNC1INC+0LHRitC10LrRgtC+0LIg0Lgg0LfQsNC/0YPRgdC6INC40YVcblx0ICovXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdGlmIChleHRlbnNpb24uZGVmYXVsdE51bWJlci5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHRjb25zdCBwYXJhbSA9IHsgcGVlcjogZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgfTtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLkdldFBlZXJTdGF0dXMocGFyYW0sIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKTtcblx0fSxcblx0LyoqXG5cdCAqIGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cygpINCe0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0L/QuNGA0LBcblx0ICovXG5cdGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyhyZXNwb25zZSkge1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLndvcmtlciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGNvbnN0ICRzdGF0dXMgPSBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLiRzdGF0dXNMYWJlbDtcblxuXHRcdGxldCBodG1sVGFibGUgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHQkLmVhY2gocmVzcG9uc2UsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRodG1sVGFibGUgKz0gJzx0cj4nO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHtrZXl9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXG5cdFx0aWYgKCdTdGF0dXMnIGluIHJlc3BvbnNlICYmIHJlc3BvbnNlLlN0YXR1cy50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ1JFQUNIQUJMRScpID49IDApIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZXknKS5hZGRDbGFzcygnZ3JlZW4nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygnZ3JleScpO1xuXHRcdH1cblx0XHRpZiAoJHN0YXR1cy5oYXNDbGFzcygnZ3JlZW4nKSkge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUpO1xuXHRcdH1cblx0fSxcbn07XG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcblx0Y29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcblx0Y29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblx0aWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoPjBcblx0XHQmJiAoXG5cdFx0XHRmd2RSaW5nTGVuZ3RoPT09JzAnXG5cdFx0XHR8fFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScnXG5cdFx0KSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8vINCf0YDQvtCy0LXRgNC60LAg0L3QtdGCINC70Lgg0L7RiNC40LHQutC4INC30LDQvdGP0YLQvtCz0L4g0LTRgNGD0LPQvtC5INGD0YfQtdGC0LrQvtC5INC90L7QvNC10YDQsFxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG5cdGF2YXRhci5pbml0aWFsaXplKCk7XG5cdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=