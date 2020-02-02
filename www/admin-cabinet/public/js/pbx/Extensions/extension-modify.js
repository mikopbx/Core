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
      $('#extensions-menu .item').tab();
      $('.codecs').checkbox();
      $('.ui.accordion').accordion();
      $('.dropdown').dropdown();
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
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
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
        avatar.$picture.attr('src', "".concat(globalRootUrl, "public/img/unknownPerson.jpg"));
      }

      $('#upload-new-avatar').on('click', function () {
        $('#file-select').click();
      });
      $('#clear-avatar').on('click', function () {
        avatar.$picture.attr('src', "".concat(globalRootUrl, "public/img/unknownPerson.jpg"));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSIsImV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUiLCJtb2JpbGVfbnVtYmVyIiwib3B0aW9uYWwiLCJleF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCIsImV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUiLCJ1c2VyX2VtYWlsIiwiZXhfVmFsaWRhdGVFbWFpbEVtcHR5IiwidXNlcl91c2VybmFtZSIsImV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSIsInNpcF9zZWNyZXQiLCJleF9WYWxpZGF0ZVNlY3JldEVtcHR5IiwiZndkX3JpbmdsZW5ndGgiLCJleF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSIsImZ3ZF9mb3J3YXJkaW5nIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiY2hlY2tib3giLCJhY2NvcmRpb24iLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiZml4QnVnRHJvcGRvd25JY29uIiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsInNob3dNYXNrT25Ib3ZlciIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5Iiwib25Vbk1hc2siLCJjYk9uVW5tYXNrRW1haWwiLCJjYk9uQ29tcGxldGVFbWFpbCIsImluaXRpYWxpemVGb3JtIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN0YXRlQ29udGV4dCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsInJlc3VsdCIsInVybERhdGEiLCJ2YWx1ZSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZW1haWxBdmFpbGFibGUiLCJwYXJlbnQiLCJtYXNrZWRWYWx1ZSIsInVubWFza2VkVmFsdWUiLCJuZXdNb2JpbGVOdW1iZXIiLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImNvbnNvbGUiLCJsb2ciLCJjaGFycyIsInBhc3MiLCJ4IiwiaSIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsImNoYXJBdCIsImNiQmVmb3JlU2VuZEZvcm0iLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwiVXBkYXRlUGhvbmVSZXByZXNlbnQiLCJGb3JtIiwiYXZhdGFyIiwiJHBpY3R1cmUiLCJhdHRyIiwiY2xpY2siLCJpbWFnZSIsImRhdGFUcmFuc2ZlciIsImZpbGVzIiwiaW1hZ2VzIiwidGFyZ2V0IiwiQXJyYXkiLCJmcm9tIiwiZm9yRWFjaCIsImN1ckltYWdlIiwiSW1hZ2UiLCJzcmMiLCJjcmVhdGVPYmplY3RVUkwiLCJvbmxvYWQiLCJldmVudCIsImFyZ3MiLCJ3aWR0aCIsImhlaWdodCIsImNvbXByZXNzIiwibXliYXNlNjRyZXNpemVkIiwicmVzaXplQ3JvcCIsIm5ld1dpZHRoIiwibmV3SGVpZ2h0IiwiY3JvcCIsInhzY2FsZSIsInlzY2FsZSIsInNjYWxlIiwibWluIiwibWF4IiwiY2FudmFzIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwicm91bmQiLCJnZXRDb250ZXh0IiwiZHJhd0ltYWdlIiwidG9EYXRhVVJMIiwiVVJMIiwid2luZG93Iiwid2Via2l0VVJMIiwibW96VVJMIiwibXNVUkwiLCJleHRlbnNpb25TdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCIkc3RhdHVzTGFiZWwiLCJEZWJ1Z2dlckluZm8iLCJyZXN0YXJ0V29ya2VyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsInBhcmFtIiwicGVlciIsIlBieEFwaSIsIkdldFBlZXJTdGF0dXMiLCJjYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMiLCJzZXRUaW1lb3V0IiwiJHN0YXR1cyIsImh0bWxUYWJsZSIsImVhY2giLCJrZXkiLCJVcGRhdGVDb250ZW50IiwiU3RhdHVzIiwidG9VcHBlckNhc2UiLCJpbmRleE9mIiwiaGFzQ2xhc3MiLCJodG1sIiwiZXhfT25saW5lIiwiZXhfT2ZmbGluZSIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwicGFyc2VJbnQiLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQVFBOztBQUlB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LENBQUsxRyxJQUFMLENBQVVPLFFBQVYsQ0FBbUJ4RSxLQUFuQixDQUF5QjRLLGFBQXpCLEdBQXlDLFlBQU07QUFDOUMsTUFBTUMsYUFBYSxHQUFHN0wsU0FBUyxDQUFDWSxRQUFWLENBQW1CcUUsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQXRCO0FBQ0EsTUFBTTZHLGFBQWEsR0FBRzlMLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQnFFLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxDQUF0Qjs7QUFDQSxNQUFLNEcsYUFBYSxHQUFHLENBQWpCLEtBQ0ZFLFFBQVEsQ0FBQ0QsYUFBRCxFQUFnQixFQUFoQixDQUFSLEtBQWdDLENBQUMsQ0FBakMsSUFBc0NBLGFBQWEsS0FBSyxFQUR0RCxDQUFKLEVBQytEO0FBQzlELFdBQU8sS0FBUDtBQUNBOztBQUNELFNBQU8sSUFBUDtBQUNBLENBUkQsQyxDQVVBOzs7QUFDQXpMLENBQUMsQ0FBQ3NMLEVBQUYsQ0FBSzFHLElBQUwsQ0FBVU8sUUFBVixDQUFtQnhFLEtBQW5CLENBQXlCZ0wsU0FBekIsR0FBcUMsVUFBQ3JHLEtBQUQsRUFBUXNHLFNBQVI7QUFBQSxTQUFzQjVMLENBQUMsWUFBSzRMLFNBQUwsRUFBRCxDQUFtQlYsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQzs7QUFFQWxMLENBQUMsQ0FBQ2dKLFFBQUQsQ0FBRCxDQUFZNkMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbE0sRUFBQUEsU0FBUyxDQUFDd0MsVUFBVjtBQUNBNEUsRUFBQUEsTUFBTSxDQUFDNUUsVUFBUDtBQUNBd0gsRUFBQUEseUJBQXlCLENBQUN4SCxVQUExQjtBQUNBLENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBQYnhBcGksIERlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuXG5jb25zdCBleHRlbnNpb24gPSB7XG5cdGRlZmF1bHRFbWFpbDogJycsXG5cdGRlZmF1bHROdW1iZXI6ICcnLFxuXHRkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcblx0JG51bWJlcjogJCgnI251bWJlcicpLFxuXHQkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcblx0JG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG5cdCRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG5cdCRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG5cdCRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcblx0JGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXHQkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0bnVtYmVyOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9yaW5nbGVuZ3RoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMTAuLjE4MF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nOiB7XG5cdFx0XHRkZXBlbmRzOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG5cdFx0JCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpLnRhYigpO1xuXHRcdCQoJy5jb2RlY3MnKS5jaGVja2JveCgpO1xuXHRcdCQoJy51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblx0XHQkKCcuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG5cdFx0JCgnI3F1YWxpZnknKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKCQoJyNxdWFsaWZ5JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQkKCcuZm9yd2FyZGluZy1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cdFx0RXh0ZW5zaW9ucy5maXhCdWdEcm9wZG93bkljb24oKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IGF2YXRhciA9IHtcblx0JHBpY3R1cmU6ICQoJyNhdmF0YXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoYXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycpID09PSAnJykge1xuXHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9cHVibGljL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuXHRcdH1cblx0XHQkKCcjdXBsb2FkLW5ldy1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHQkKCcjZmlsZS1zZWxlY3QnKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnI2NsZWFyLWF2YXRhcicpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfXB1YmxpYy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAndXNlcl9hdmF0YXInLCBudWxsKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdCQoJyNmaWxlLXNlbGVjdCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0bGV0IGltYWdlO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZGF0YVRyYW5zZmVyID0gJ2RhdGFUcmFuc2ZlcicgaW4gZSA/IGUuZGF0YVRyYW5zZmVyLmZpbGVzIDogW107XG5cdFx0XHRjb25zdCBpbWFnZXMgPSAnZmlsZXMnIGluIGUudGFyZ2V0ID8gZS50YXJnZXQuZmlsZXMgOiBkYXRhVHJhbnNmZXI7XG5cdFx0XHRpZiAoaW1hZ2VzICYmIGltYWdlcy5sZW5ndGgpIHtcblx0XHRcdFx0QXJyYXkuZnJvbShpbWFnZXMpLmZvckVhY2goKGN1ckltYWdlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBjdXJJbWFnZSAhPT0gJ29iamVjdCcpIHJldHVybjtcblx0XHRcdFx0XHRpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0XHRcdGltYWdlLnNyYyA9IGF2YXRhci5jcmVhdGVPYmplY3RVUkwoY3VySW1hZ2UpO1xuXHRcdFx0XHRcdGltYWdlLm9ubG9hZCA9IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgYXJncyA9IHtcblx0XHRcdFx0XHRcdFx0c3JjOiBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiAyMDAsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcblx0XHRcdFx0XHRcdFx0Y29tcHJlc3M6IDkwLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGNvbnN0IG15YmFzZTY0cmVzaXplZCA9IGF2YXRhci5yZXNpemVDcm9wKGFyZ3MpO1xuXHRcdFx0XHRcdFx0YXZhdGFyLiRwaWN0dXJlLmF0dHIoJ3NyYycsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbXliYXNlNjRyZXNpemVkKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmVzaXplQ3JvcCh7XG5cdFx0c3JjLCB3aWR0aCwgaGVpZ2h0LCB0eXBlLCBjb21wcmVzcyxcblx0fSkge1xuXHRcdGxldCBuZXdXaWR0aCA9IHdpZHRoO1xuXHRcdGxldCBuZXdIZWlnaHQgPSBoZWlnaHQ7XG5cdFx0Y29uc3QgY3JvcCA9IG5ld1dpZHRoID09PSAwIHx8IG5ld0hlaWdodCA9PT0gMDtcblx0XHQvLyBub3QgcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA8PSBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld1dpZHRoID0gc3JjLndpZHRoO1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodDtcblx0XHR9XG5cdFx0Ly8gcmVzaXplXG5cdFx0aWYgKHNyYy53aWR0aCA+IG5ld1dpZHRoICYmIG5ld0hlaWdodCA9PT0gMCkge1xuXHRcdFx0bmV3SGVpZ2h0ID0gc3JjLmhlaWdodCAqIChuZXdXaWR0aCAvIHNyYy53aWR0aCk7XG5cdFx0fVxuXHRcdC8vIGNoZWNrIHNjYWxlXG5cdFx0Y29uc3QgeHNjYWxlID0gbmV3V2lkdGggLyBzcmMud2lkdGg7XG5cdFx0Y29uc3QgeXNjYWxlID0gbmV3SGVpZ2h0IC8gc3JjLmhlaWdodDtcblx0XHRjb25zdCBzY2FsZSA9IGNyb3AgPyBNYXRoLm1pbih4c2NhbGUsIHlzY2FsZSkgOiBNYXRoLm1heCh4c2NhbGUsIHlzY2FsZSk7XG5cdFx0Ly8gY3JlYXRlIGVtcHR5IGNhbnZhc1xuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy53aWR0aCA9IG5ld1dpZHRoIHx8IE1hdGgucm91bmQoc3JjLndpZHRoICogc2NhbGUpO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXdIZWlnaHQgfHwgTWF0aC5yb3VuZChzcmMuaGVpZ2h0ICogc2NhbGUpO1xuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLnNjYWxlKHNjYWxlLCBzY2FsZSk7XG5cdFx0Ly8gY3JvcCBpdCB0b3AgY2VudGVyXG5cdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHNyYywgKChzcmMud2lkdGggKiBzY2FsZSkgLSBjYW52YXMud2lkdGgpICogLTAuNSwgKChzcmMuaGVpZ2h0ICogc2NhbGUpIC0gY2FudmFzLmhlaWdodCkgKiAtMC41KTtcblx0XHRyZXR1cm4gY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBjb21wcmVzcyk7XG5cdH0sXG5cdGNyZWF0ZU9iamVjdFVSTChpKSB7XG5cdFx0Y29uc3QgVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXHRcdHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGkpO1xuXHR9LFxuXG59O1xuXG5cbmNvbnN0IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkc3RhdHVzTGFiZWw6ICQoJyNzdGF0dXMnKSxcblx0LyoqXG5cdCAqIGluaXRpYWxpemUoKSDRgdC+0LfQtNCw0L3QuNC1INC+0LHRitC10LrRgtC+0LIg0Lgg0LfQsNC/0YPRgdC6INC40YVcblx0ICovXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdGlmIChleHRlbnNpb24uZGVmYXVsdE51bWJlci5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHRjb25zdCBwYXJhbSA9IHsgcGVlcjogZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgfTtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLkdldFBlZXJTdGF0dXMocGFyYW0sIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKTtcblx0fSxcblx0LyoqXG5cdCAqIGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cygpINCe0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0L/QuNGA0LBcblx0ICovXG5cdGNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyhyZXNwb25zZSkge1xuXHRcdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dChleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLndvcmtlciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGNvbnN0ICRzdGF0dXMgPSBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLiRzdGF0dXNMYWJlbDtcblxuXHRcdGxldCBodG1sVGFibGUgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHQkLmVhY2gocmVzcG9uc2UsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRodG1sVGFibGUgKz0gJzx0cj4nO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHtrZXl9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXG5cdFx0aWYgKCdTdGF0dXMnIGluIHJlc3BvbnNlICYmIHJlc3BvbnNlLlN0YXR1cy50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ1JFQUNIQUJMRScpID49IDApIHtcblx0XHRcdCRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZXknKS5hZGRDbGFzcygnZ3JlZW4nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygnZ3JleScpO1xuXHRcdH1cblx0XHRpZiAoJHN0YXR1cy5oYXNDbGFzcygnZ3JlZW4nKSkge1xuXHRcdFx0JHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUpO1xuXHRcdH1cblx0fSxcbn07XG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcblx0Y29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcblx0Y29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblx0aWYgKChmd2RSaW5nTGVuZ3RoID4gMCkgJiZcblx0XHQocGFyc2VJbnQoZndkRm9yd2FyZGluZywgMTApID09PSAtMSB8fCBmd2RGb3J3YXJkaW5nID09PSAnJykpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vLyDQn9GA0L7QstC10YDQutCwINC90LXRgiDQu9C4INC+0YjQuNCx0LrQuCDQt9Cw0L3Rj9GC0L7Qs9C+INC00YDRg9Cz0L7QuSDRg9GH0LXRgtC60L7QuSDQvdC+0LzQtdGA0LBcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuXHRhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19