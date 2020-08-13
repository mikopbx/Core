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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJmd2RfcmluZ2xlbmd0aCIsImRlcGVuZHMiLCJleF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSIsImZ3ZF9mb3J3YXJkaW5nIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQiLCJmd2RfZm9yd2FyZGluZ29uYnVzeSIsImZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSIsImluaXRpYWxpemUiLCJpbnB1dG1hc2siLCJ0YWIiLCJhY2NvcmRpb24iLCJkcm9wZG93biIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJmaXhCdWdEcm9wZG93bkljb24iLCJ2YWwiLCJnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ0cmlnZ2VyIiwib25jb21wbGV0ZSIsImNiT25Db21wbGV0ZU51bWJlciIsIm1hc2tMaXN0IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm9uY2xlYXJlZCIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJvblVuTWFzayIsImNiT25Vbm1hc2tFbWFpbCIsImNiT25Db21wbGV0ZUVtYWlsIiwiaW5pdGlhbGl6ZUZvcm0iLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwic3RhdGVDb250ZXh0IiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwicmVzdWx0IiwidXJsRGF0YSIsInZhbHVlIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJlbWFpbEF2YWlsYWJsZSIsInBhcmVudCIsIm1hc2tlZFZhbHVlIiwidW5tYXNrZWRWYWx1ZSIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY29uc29sZSIsImxvZyIsImNoYXJzIiwicGFzcyIsIngiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2hhckF0IiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJVcGRhdGVQaG9uZVJlcHJlc2VudCIsIkZvcm0iLCJhdmF0YXIiLCIkcGljdHVyZSIsImF0dHIiLCJjbGljayIsImltYWdlIiwiZGF0YVRyYW5zZmVyIiwiZmlsZXMiLCJpbWFnZXMiLCJ0YXJnZXQiLCJBcnJheSIsImZyb20iLCJmb3JFYWNoIiwiY3VySW1hZ2UiLCJJbWFnZSIsInNyYyIsImNyZWF0ZU9iamVjdFVSTCIsIm9ubG9hZCIsImV2ZW50IiwiYXJncyIsIndpZHRoIiwiaGVpZ2h0IiwiY29tcHJlc3MiLCJteWJhc2U2NHJlc2l6ZWQiLCJyZXNpemVDcm9wIiwibmV3V2lkdGgiLCJuZXdIZWlnaHQiLCJjcm9wIiwieHNjYWxlIiwieXNjYWxlIiwic2NhbGUiLCJtaW4iLCJtYXgiLCJjYW52YXMiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJyb3VuZCIsImdldENvbnRleHQiLCJkcmF3SW1hZ2UiLCJ0b0RhdGFVUkwiLCJVUkwiLCJ3aW5kb3ciLCJ3ZWJraXRVUkwiLCJtb3pVUkwiLCJtc1VSTCIsImV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRzdGF0dXNMYWJlbCIsIkRlYnVnZ2VySW5mbyIsInJlc3RhcnRXb3JrZXIiLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwicGFyYW0iLCJwZWVyIiwiUGJ4QXBpIiwiR2V0UGVlclN0YXR1cyIsImNiUmVmcmVzaEV4dGVuc2lvblN0YXR1cyIsInNldFRpbWVvdXQiLCIkc3RhdHVzIiwiaHRtbFRhYmxlIiwiZWFjaCIsImtleSIsIlVwZGF0ZUNvbnRlbnQiLCJTdGF0dXMiLCJ0b1VwcGVyQ2FzZSIsImluZGV4T2YiLCJoYXNDbGFzcyIsImh0bWwiLCJleF9PbmxpbmUiLCJleF9PZmZsaW5lIiwiZm4iLCJleHRlbnNpb25SdWxlIiwiZndkUmluZ0xlbmd0aCIsImZ3ZEZvcndhcmRpbmciLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7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dCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBQYnhBcGksIERlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuXG5jb25zdCBleHRlbnNpb24gPSB7XG5cdGRlZmF1bHRFbWFpbDogJycsXG5cdGRlZmF1bHROdW1iZXI6ICcnLFxuXHRkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcblx0JG51bWJlcjogJCgnI251bWJlcicpLFxuXHQkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcblx0JG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG5cdCRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG5cdCRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG5cdCRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcblx0JGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXHQkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXHQkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cdGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRudW1iZXI6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdudW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVtudW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdG1vYmlsZV9udW1iZXI6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdtYXNrJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dXNlcl9lbWFpbDoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtYWlsJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dXNlcl91c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfdXNlcm5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHNpcF9zZWNyZXQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX3JpbmdsZW5ndGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG5cdFx0XHRkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzUuLjE4MF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbmJ1c3k6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29uYnVzeScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuXHRcdGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuXHRcdCQoJyNxdWFsaWZ5JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGlmICgkKCcjcXVhbGlmeScpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0JChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXHRcdEV4dGVuc2lvbnMuZml4QnVnRHJvcGRvd25JY29uKCk7XG5cblx0XHRpZiAoJCgnI3NpcF9zZWNyZXQnKS52YWwoKSA9PT0gJycpIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG5cblx0XHQkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG5cdFx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fSk7XG5cblx0XHRleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ29wdGlvbicsIHtcblx0XHRcdG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIsXG5cdFx0fSk7XG5cblx0XHRjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuXHRcdGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2tzKHtcblx0XHRcdGlucHV0bWFzazoge1xuXHRcdFx0XHRkZWZpbml0aW9uczoge1xuXHRcdFx0XHRcdCcjJzoge1xuXHRcdFx0XHRcdFx0dmFsaWRhdG9yOiAnWzAtOV0nLFxuXHRcdFx0XHRcdFx0Y2FyZGluYWxpdHk6IDEsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0b25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG5cdFx0XHRcdG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG5cdFx0XHRcdHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG5cdFx0XHR9LFxuXHRcdFx0bWF0Y2g6IC9bMC05XS8sXG5cdFx0XHRyZXBsYWNlOiAnOScsXG5cdFx0XHRsaXN0OiBtYXNrTGlzdCxcblx0XHRcdGxpc3RLZXk6ICdtYXNrJyxcblx0XHR9KTtcblx0XHRleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG5cdFx0XHRvblVuTWFzazogZXh0ZW5zaW9uLmNiT25Vbm1hc2tFbWFpbCxcblx0XHRcdG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCxcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9C+0YHQu9C1INCy0L7QvtC00LAg0L3QvtC80LXRgNCwINGC0LXQu9C10YTQvtC90LAg0LTQu9GPINC/0YDQvtCy0LXRgNC60Lgg0L3QtdGCINC70Lgg0L/QtdGA0LXRgdC10YfQtdC90LjQuSDRgVxuXHQgKiDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LzQuCDQvdC+0LzQtdGA0LDQvNC4XG5cdCAqL1xuXHRjYk9uQ29tcGxldGVOdW1iZXIoKSB7XG5cdFx0Y29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0Y29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQstC+0LTQsCDQv9C+0LvQvdC+0LPQviBFbWFpbCDQsNC00YDQtdGB0LBcblx0ICovXG5cdGNiT25Db21wbGV0ZUVtYWlsKCkge1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70LggRW1haWxcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9dXNlcnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuXHRcdFx0c3RhdGVDb250ZXh0OiAnLnVpLmlucHV0LmVtYWlsJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0XHRcdHJlc3VsdC51cmxEYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UuZW1haWxBdmFpbGFibGVcblx0XHRcdFx0XHR8fCBleHRlbnNpb24uZGVmYXVsdEVtYWlsID09PSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKCcjZW1haWwtZXJyb3InKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0L/QvtC70YPRh9C10L3QuNC4INCx0LXQt9C80LDRgdC+0YfQvdC+0LPQviDQt9C90LDRh9C10L3QuNGPXG5cdCAqL1xuXHRjYk9uVW5tYXNrRW1haWwobWFza2VkVmFsdWUsIHVubWFza2VkVmFsdWUpIHtcblx0XHRyZXR1cm4gdW5tYXNrZWRWYWx1ZTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQstCy0L7QtNC1INC80L7QsdC40LvRjNC90L7Qs9C+INGC0LXQu9C10YTQvtC90LAg0LIg0LrQsNGA0YLQvtGH0LrQtSDRgdC+0YLRgNGD0LTQvdC40LrQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyKCkge1xuXHRcdGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4INCy0YvQsdGA0LDQvdC90YvQuSDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG5cdFx0Ly8g0J/QtdGA0LXQt9Cw0L/QvtC70L3QuNC8INGB0YLRgNC+0LrRgyDQtNC+0L3QsNCx0L7RgNCwXG5cdFx0aWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcblx0XHRcdHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuXHRcdCkge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0fVxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INC80LXQvdGP0LvRgdGPINC70Lgg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0Y29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQsdGL0LvQsCDQu9C4INC90LDRgdGC0YDQvtC10L3QsCDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjRjyDQvdCwINC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcblx0XHRjb25zb2xlLmxvZyhgbmV3IG1vYmlsZSBudW1iZXIgJHtleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcn0gYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0L7Rh9C40YHRgtC60LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcblx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsICcnKTtcblxuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG5cdFx0fVxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgLTEpO1xuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkg0KDQsNCx0L7RgtCwINGBINC/0LDRgNC+0LvQtdC8IFNJUCDRg9GH0LXRgtC60Lhcblx0ICovXG5cdGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSAnYWJjZGVmMTIzNDU2Nzg5MCc7XG5cdFx0bGV0IHBhc3MgPSAnJztcblx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IDMyOyB4ICs9IDEpIHtcblx0XHRcdGNvbnN0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpO1xuXHRcdFx0cGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwocGFzcyk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBleHRlbnNpb24udmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5jb25zdCBhdmF0YXIgPSB7XG5cdCRwaWN0dXJlOiAkKCcjYXZhdGFyJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcblx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHR9XG5cdFx0JCgnI3VwbG9hZC1uZXctYXZhdGFyJykub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0JCgnI2ZpbGUtc2VsZWN0JykuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJyNjbGVhci1hdmF0YXInKS5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRhdmF0YXIuJHBpY3R1cmUuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3VzZXJfYXZhdGFyJywgbnVsbCk7XG5cdFx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fSk7XG5cblx0XHQkKCcjZmlsZS1zZWxlY3QnKS5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdGxldCBpbWFnZTtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNvbnN0IGRhdGFUcmFuc2ZlciA9ICdkYXRhVHJhbnNmZXInIGluIGUgPyBlLmRhdGFUcmFuc2Zlci5maWxlcyA6IFtdO1xuXHRcdFx0Y29uc3QgaW1hZ2VzID0gJ2ZpbGVzJyBpbiBlLnRhcmdldCA/IGUudGFyZ2V0LmZpbGVzIDogZGF0YVRyYW5zZmVyO1xuXHRcdFx0aWYgKGltYWdlcyAmJiBpbWFnZXMubGVuZ3RoKSB7XG5cdFx0XHRcdEFycmF5LmZyb20oaW1hZ2VzKS5mb3JFYWNoKChjdXJJbWFnZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgY3VySW1hZ2UgIT09ICdvYmplY3QnKSByZXR1cm47XG5cdFx0XHRcdFx0aW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdFx0XHRpbWFnZS5zcmMgPSBhdmF0YXIuY3JlYXRlT2JqZWN0VVJMKGN1ckltYWdlKTtcblx0XHRcdFx0XHRpbWFnZS5vbmxvYWQgPSAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGFyZ3MgPSB7XG5cdFx0XHRcdFx0XHRcdHNyYzogZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHRcdFx0XHR3aWR0aDogMjAwLFxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0XHRcdFx0dHlwZTogJ2ltYWdlL3BuZycsXG5cdFx0XHRcdFx0XHRcdGNvbXByZXNzOiA5MCxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRjb25zdCBteWJhc2U2NHJlc2l6ZWQgPSBhdmF0YXIucmVzaXplQ3JvcChhcmdzKTtcblx0XHRcdFx0XHRcdGF2YXRhci4kcGljdHVyZS5hdHRyKCdzcmMnLCBteWJhc2U2NHJlc2l6ZWQpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd1c2VyX2F2YXRhcicsIG15YmFzZTY0cmVzaXplZCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHJlc2l6ZUNyb3Aoe1xuXHRcdHNyYywgd2lkdGgsIGhlaWdodCwgdHlwZSwgY29tcHJlc3MsXG5cdH0pIHtcblx0XHRsZXQgbmV3V2lkdGggPSB3aWR0aDtcblx0XHRsZXQgbmV3SGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdGNvbnN0IGNyb3AgPSBuZXdXaWR0aCA9PT0gMCB8fCBuZXdIZWlnaHQgPT09IDA7XG5cdFx0Ly8gbm90IHJlc2l6ZVxuXHRcdGlmIChzcmMud2lkdGggPD0gbmV3V2lkdGggJiYgbmV3SGVpZ2h0ID09PSAwKSB7XG5cdFx0XHRuZXdXaWR0aCA9IHNyYy53aWR0aDtcblx0XHRcdG5ld0hlaWdodCA9IHNyYy5oZWlnaHQ7XG5cdFx0fVxuXHRcdC8vIHJlc2l6ZVxuXHRcdGlmIChzcmMud2lkdGggPiBuZXdXaWR0aCAmJiBuZXdIZWlnaHQgPT09IDApIHtcblx0XHRcdG5ld0hlaWdodCA9IHNyYy5oZWlnaHQgKiAobmV3V2lkdGggLyBzcmMud2lkdGgpO1xuXHRcdH1cblx0XHQvLyBjaGVjayBzY2FsZVxuXHRcdGNvbnN0IHhzY2FsZSA9IG5ld1dpZHRoIC8gc3JjLndpZHRoO1xuXHRcdGNvbnN0IHlzY2FsZSA9IG5ld0hlaWdodCAvIHNyYy5oZWlnaHQ7XG5cdFx0Y29uc3Qgc2NhbGUgPSBjcm9wID8gTWF0aC5taW4oeHNjYWxlLCB5c2NhbGUpIDogTWF0aC5tYXgoeHNjYWxlLCB5c2NhbGUpO1xuXHRcdC8vIGNyZWF0ZSBlbXB0eSBjYW52YXNcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRjYW52YXMud2lkdGggPSBuZXdXaWR0aCB8fCBNYXRoLnJvdW5kKHNyYy53aWR0aCAqIHNjYWxlKTtcblx0XHRjYW52YXMuaGVpZ2h0ID0gbmV3SGVpZ2h0IHx8IE1hdGgucm91bmQoc3JjLmhlaWdodCAqIHNjYWxlKTtcblx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5zY2FsZShzY2FsZSwgc2NhbGUpO1xuXHRcdC8vIGNyb3AgaXQgdG9wIGNlbnRlclxuXHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLmRyYXdJbWFnZShzcmMsICgoc3JjLndpZHRoICogc2NhbGUpIC0gY2FudmFzLndpZHRoKSAqIC0wLjUsICgoc3JjLmhlaWdodCAqIHNjYWxlKSAtIGNhbnZhcy5oZWlnaHQpICogLTAuNSk7XG5cdFx0cmV0dXJuIGNhbnZhcy50b0RhdGFVUkwodHlwZSwgY29tcHJlc3MpO1xuXHR9LFxuXHRjcmVhdGVPYmplY3RVUkwoaSkge1xuXHRcdGNvbnN0IFVSTCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCB8fCB3aW5kb3cubW96VVJMIHx8IHdpbmRvdy5tc1VSTDtcblx0XHRyZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChpKTtcblx0fSxcblxufTtcblxuXG5jb25zdCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0JHN0YXR1c0xhYmVsOiAkKCcjc3RhdHVzJyksXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplKCkg0YHQvtC30LTQsNC90LjQtSDQvtCx0YrQtdC60YLQvtCyINC4INC30LDQv9GD0YHQuiDQuNGFXG5cdCAqL1xuXHRpbml0aWFsaXplKCkge1xuXHRcdERlYnVnZ2VySW5mby5pbml0aWFsaXplKCk7XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpIT09Jycpe1xuXHRcdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0fVxuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0aWYgKGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdGNvbnN0IHBhcmFtID0geyBwZWVyOiBleHRlbnNpb24uZGVmYXVsdE51bWJlciB9O1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuR2V0UGVlclN0YXR1cyhwYXJhbSwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hFeHRlbnNpb25TdGF0dXMpO1xuXHR9LFxuXHQvKipcblx0ICogY2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKCkg0J7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDQv9C40YDQsFxuXHQgKi9cblx0Y2JSZWZyZXNoRXh0ZW5zaW9uU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0Y29uc3QgJHN0YXR1cyA9IGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuJHN0YXR1c0xhYmVsO1xuXG5cdFx0bGV0IGh0bWxUYWJsZSA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke2tleX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSAnPC90cj4nO1xuXHRcdH0pO1xuXHRcdGh0bWxUYWJsZSArPSAnPC90YWJsZT4nO1xuXHRcdERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG5cblx0XHRpZiAoJ1N0YXR1cycgaW4gcmVzcG9uc2UgJiYgcmVzcG9uc2UuU3RhdHVzLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignUkVBQ0hBQkxFJykgPj0gMCkge1xuXHRcdFx0JHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JleScpLmFkZENsYXNzKCdncmVlbicpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc3RhdHVzLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCdncmV5Jyk7XG5cdFx0fVxuXHRcdGlmICgkc3RhdHVzLmhhc0NsYXNzKCdncmVlbicpKSB7XG5cdFx0XHQkc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfT2ZmbGluZSk7XG5cdFx0fVxuXHR9LFxufTtcblxuLy8g0JXRgdC70Lgg0LLRi9Cx0YDQsNC9INCy0LDRgNC40LDQvdGCINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNC4INC90LAg0L3QvtC80LXRgCwg0LAg0YHQsNC8INC90L7QvNC10YAg0L3QtSDQstGL0LHRgNCw0L1cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuXHRjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuXHRjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXHRpZiAoZndkRm9yd2FyZGluZy5sZW5ndGg+MFxuXHRcdCYmIChcblx0XHRcdGZ3ZFJpbmdMZW5ndGg9PT0nMCdcblx0XHRcdHx8XG5cdFx0XHRmd2RSaW5nTGVuZ3RoPT09Jydcblx0XHQpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdC10YIg0LvQuCDQvtGI0LjQsdC60Lgg0LfQsNC90Y/RgtC+0LPQviDQtNGA0YPQs9C+0Lkg0YPRh9C10YLQutC+0Lkg0L3QvtC80LXRgNCwXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcblx0YXZhdGFyLmluaXRpYWxpemUoKTtcblx0ZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==