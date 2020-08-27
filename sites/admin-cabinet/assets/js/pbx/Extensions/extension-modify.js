"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsImlucHV0bWFzayIsInRhYiIsImFjY29yZGlvbiIsImRyb3Bkb3duIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsInZhbCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaWdnZXIiLCJvbmNvbXBsZXRlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJpbml0aWFsaXplRm9ybSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwidmFsdWUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjb25zb2xlIiwibG9nIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImF2YXRhciIsIiRwaWN0dXJlIiwiYXR0ciIsImNsaWNrIiwiaW1hZ2UiLCJkYXRhVHJhbnNmZXIiLCJmaWxlcyIsImltYWdlcyIsInRhcmdldCIsIkFycmF5IiwiZnJvbSIsImZvckVhY2giLCJjdXJJbWFnZSIsIkltYWdlIiwic3JjIiwiY3JlYXRlT2JqZWN0VVJMIiwib25sb2FkIiwiZXZlbnQiLCJhcmdzIiwid2lkdGgiLCJoZWlnaHQiLCJjb21wcmVzcyIsIm15YmFzZTY0cmVzaXplZCIsInJlc2l6ZUNyb3AiLCJuZXdXaWR0aCIsIm5ld0hlaWdodCIsImNyb3AiLCJ4c2NhbGUiLCJ5c2NhbGUiLCJzY2FsZSIsIm1pbiIsIm1heCIsImNhbnZhcyIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInJvdW5kIiwiZ2V0Q29udGV4dCIsImRyYXdJbWFnZSIsInRvRGF0YVVSTCIsIlVSTCIsIndpbmRvdyIsIndlYmtpdFVSTCIsIm1velVSTCIsIm1zVVJMIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN0YXR1c0xhYmVsIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwYXJhbSIsInBlZXIiLCJQYnhBcGkiLCJHZXRQZWVyU3RhdHVzIiwiY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzIiwic2V0VGltZW91dCIsIiRzdGF0dXMiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwiVXBkYXRlQ29udGVudCIsIlN0YXR1cyIsInRvVXBwZXJDYXNlIiwiaW5kZXhPZiIsImhhc0NsYXNzIiwiaHRtbCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFt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QUFBLFNBQVMsQ0FBQzJDLFVBQVY7QUFDQTRFLEVBQUFBLE1BQU0sQ0FBQzVFLFVBQVA7QUFDQXdILEVBQUFBLHlCQUF5QixDQUFDeEgsVUFBMUI7QUFDQSxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCDCqSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBBbGV4ZXkgUG9ydG5vdiwgOCAyMDIwXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBQYnhBcGksIERlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuXG5jb25zdCBleHRlbnNpb24gPSB7XG5cdGRlZmF1bHRFbWFpbDogJycsXG5cdGRlZmF1bHROdW1iZXI6ICcnLFxuXHRkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcblx0JG51bWJlcjogJCgnI251bWJlcicpLFxuXHQkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcblx0JG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG5cdCRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG5cdCRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG5cdCRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcblx0JGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXHQkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXHQkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cdGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRudW1iZXI6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdudW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bW9iaWxlX251bWJlcjoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ21hc2snLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX2VtYWlsOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1haWwnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX3VzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2lwX3NlY3JldDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3NpcF9zZWNyZXQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfcmluZ2xlbmd0aDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9yaW5nbGVuZ3RoJyxcblx0XHRcdGRlcGVuZHM6ICdmd2RfZm9yd2FyZGluZycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMy4uMTgwXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmc6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG5cdFx0ZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cdFx0JCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG5cdFx0JCgnI3F1YWxpZnknKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKCQoJyNxdWFsaWZ5JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQkKGV4dGVuc2lvbi5mb3J3YXJkaW5nU2VsZWN0KS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cdFx0RXh0ZW5zaW9ucy5maXhCdWdEcm9wZG93bkljb24oKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IGF2YXRhciA9IHtcblx0JHBpY3R1cmU6ICQoJyNhdmF0YXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoYXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycpID09PSAnJykge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdH1cblx0XHQkKCcjdXBsb2FkLW5ldy1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHQkKCcjZmlsZS1zZWxlY3QnKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2NsZWFyLWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBudWxsKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdCQoJyNmaWxlLXNlbGVjdCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0bGV0IGltYWdlO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZGF0YVRyYW5zZmVyID0gJ2RhdGFUcmFuc2ZlcicgaW4gZSA/IGUuZGF0YVRyYW5zZmVyLmZpbGVzIDogW107XG5cdFx0XHRjb25zdCBpbWFnZXMgPSAnZmlsZXMnIGluIGUudGFyZ2V0ID8gZS50YXJnZXQuZmlsZXMgOiBkYXRhVHJhbnNmZXI7XG5cdFx0XHRpZiAoaW1hZ2VzICYmIGltYWdlcy5sZW5ndGgpIHtcblx0XHRcdFx0QXJyYXkuZnJvbShpbWFnZXMpLmZvckVhY2goKGN1ckltYWdlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBjdXJJbWFnZSAhPT0gJ29iamVjdCcpIHJldHVybjtcblx0XHRcdFx0XHRpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0XHRcdGltYWdlLnNyYyA9IGF2YXRhci5jcmVhdGVPYmplY3RVUkwoY3VySW1hZ2UpO1xuXHRcdFx0XHRcdGltYWdlLm9ubG9hZCA9IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgYXJncyA9IHtcblx0XHRcdFx0XHRcdFx0c3JjOiBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiAyMDAsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcblx0XHRcdFx0XHRcdFx0Y29tcHJlc3M6IDkwLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGNvbnN0IG15YmFzZTY0cmVzaXplZCA9IGF2YXRhci5yZXNpemVDcm9wKGFyZ3MpO1xuXHRcdFx0XHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmVzaXplQ3JvcCh7XG5cdFx0c3JjLCB3aWR0aCwgaGVpZ2h0LCB0eXBlLCBjb21wcmVzcyxcblx0fSkge1xuXHRcdGxldCBuZXdXaWR0aCA9IHdpZHRoO1xuXHRcdGxldCBuZXdIZWlnaHQgPSBoZWlnaHQ7XG5cdFx0Y29uc3QgY3JvcCA9IG5ld1dpZHRoID09PSAwIHx8IG5ld0hlaWdodCA9PT0gMDtcblx0XHQvLyBub3QgcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA8PSBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld1dpZHRoID0gc3JjLndpZHRoO1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodDtcblx0XHR9XG5cdFx0Ly8gcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA+IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodCAqIChuZXdXaWR0aCAvIHNyYy53aWR0aCk7XG5cdFx0fVxuXHRcdC8vIGNoZWNrIHNjYWxlXG5cdFx0Y29uc3QgeHNjYWxlID0gbmV3V2lkdGggLyBzcmMud2lkdGg7XG5cdFx0Y29uc3QgeXNjYWxlID0gbmV3SGVpZ2h0IC8gc3JjLmhlaWdodDtcblx0XHRjb25zdCBzY2FsZSA9IGNyb3AgPyBNYXRoLm1pbih4c2NhbGUsIHlzY2FsZSkgOiBNYXRoLm1heCh4c2NhbGUsIHlzY2FsZSk7XG5cdFx0Ly8gY3JlYXRlIGVtcHR5IGNhbnZhc1xuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy53aWR0aCA9IG5ld1dpZHRoIHx8IE1hdGgucm91bmQoc3JjLndpZHRoICogc2NhbGUpO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXdIZWlnaHQgfHwgTWF0aC5yb3VuZChzcmMuaGVpZ2h0ICogc2NhbGUpO1xuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLnNjYWxlKHNjYWxlLCBzY2FsZSk7XG5cdFx0Ly8gY3JvcCBpdCB0b3AgY2VudGVyXG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHNyYywgKChzcmMud2lkdGggKiBzY2FsZSkgLSBjYW52YXMud2lkdGgpICogLTAuNSwgKChzcmMuaGVpZ2h0ICogc2NhbGUpIC0gY2FudmFzLmhlaWdodCkgKiAtMC41KTtcblx0XHRyZXR1cm4gY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBjb21wcmVzcyk7XG5cdH0sXG5cdGNyZWF0ZU9iamVjdFVSTChpKSB7XG5cdFx0Y29uc3QgVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXHRcdHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGkpO1xuXHR9LFxuXG59O1xuXG5cbmNvbnN0IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkc3RhdHVzTGFiZWw6ICQoJyNzdGF0dXMnKSxcblx0LyoqXG5cdCAqIGluaXRpYWxpemUoKSDRgdC+0LfQtNCw0L3QuNC1INC+0LHRitC10LrRgtC+0LIg0Lgg0LfQsNC/0YPRgdC6INC40YVcblx0ICovXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lkJykhPT0nJyl7XG5cdFx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0XHR9XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRpZiAoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0Y29uc3QgcGFyYW0gPSB7IHBlZXI6IGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyIH07XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5HZXRQZWVyU3RhdHVzKHBhcmFtLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMoKSDQntCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINC/0LjRgNCwXG5cdCAqL1xuXHRjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMocmVzcG9uc2UpIHtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRjb25zdCAkc3RhdHVzID0gZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzTGFiZWw7XG5cblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7a2V5fTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblxuXHRcdGlmICgnU3RhdHVzJyBpbiByZXNwb25zZSAmJiByZXNwb25zZS5TdGF0dXMudG9VcHBlckNhc2UoKS5pbmRleE9mKCdSRUFDSEFCTEUnKSA+PSAwKSB7XG5cdFx0XHQkc3RhdHVzLnJlbW92ZUNsYXNzKCdncmV5JykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHR9XG5cdFx0aWYgKCRzdGF0dXMuaGFzQ2xhc3MoJ2dyZWVuJykpIHtcblx0XHRcdCRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PZmZsaW5lKTtcblx0XHR9XG5cdH0sXG59O1xuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG5cdGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG5cdGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cdGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aD4wXG5cdFx0JiYgKFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScwJ1xuXHRcdFx0fHxcblx0XHRcdGZ3ZFJpbmdMZW5ndGg9PT0nJ1xuXHRcdCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vLyDQn9GA0L7QstC10YDQutCwINC90LXRgiDQu9C4INC+0YjQuNCx0LrQuCDQt9Cw0L3Rj9GC0L7Qs9C+INC00YDRg9Cz0L7QuSDRg9GH0LXRgtC60L7QuSDQvdC+0LzQtdGA0LBcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuXHRhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19