"use strict";

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
 InputMaskPatterns, avatar, extensionStatusLoopWorker */
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
      }, {
        type: 'specialCharactersExist',
        prompt: globalTranslate.ex_ValidateUsernameSpecialCharacters
      }]
    },
    sip_secret: {
      identifier: 'sip_secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ex_ValidateSecretEmpty
      }, {
        type: 'minLength[5]',
        prompt: globalTranslate.ex_ValidateSecretWeak
      }, {
        type: 'notRegExp',
        value: /[A-z]/,
        prompt: globalTranslate.ex_PasswordNoLowSimvol
      }, {
        type: 'notRegExp',
        value: /\d/,
        prompt: globalTranslate.ex_PasswordNoNumbers
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
    extension.$mobile_number.focusout(function (e) {
      var phone = $(e.target).val().replace(/[^0-9]/g, "");

      if (phone === '') {
        $(e.target).val('');
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJleF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnMiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiaW5pdGlhbGl6ZUZvcm0iLCJwYXN0ZWRWYWx1ZSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJlbWFpbEF2YWlsYWJsZSIsInBhcmVudCIsIm1hc2tlZFZhbHVlIiwidW5tYXNrZWRWYWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJuZXdNb2JpbGVOdW1iZXIiLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImNoYXJzIiwicGFzcyIsIngiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2hhckF0IiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJVcGRhdGVQaG9uZVJlcHJlc2VudCIsIkZvcm0iLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSIsImF2YXRhciIsImV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBR0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxZQUFZLEVBQUUsRUFERztBQUVqQkMsRUFBQUEsYUFBYSxFQUFFLEVBRkU7QUFHakJDLEVBQUFBLG1CQUFtQixFQUFFLEVBSEo7QUFJakJDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKTztBQUtqQkMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsYUFBRCxDQUxHO0FBTWpCRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5BO0FBT2pCRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQVBEO0FBUWpCSSxFQUFBQSxxQkFBcUIsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBUlA7QUFTakJLLEVBQUFBLDRCQUE0QixFQUFFTCxDQUFDLENBQUMsOEJBQUQsQ0FUZDtBQVVqQk0sRUFBQUEsTUFBTSxFQUFFTixDQUFDLENBQUMs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Q0FaRCxDLENBY0E7OztBQUNBN0gsQ0FBQyxDQUFDMkgsRUFBRixDQUFLbEMsSUFBTCxDQUFVTyxRQUFWLENBQW1CbkYsS0FBbkIsQ0FBeUJrSCxTQUF6QixHQUFxQyxVQUFDL0YsS0FBRCxFQUFRZ0csU0FBUjtBQUFBLFNBQXNCaEksQ0FBQyxZQUFLZ0ksU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUVBakksQ0FBQyxDQUFDa0ksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnhJLEVBQUFBLFNBQVMsQ0FBQ2dELFVBQVY7QUFDQXlGLEVBQUFBLE1BQU0sQ0FBQ3pGLFVBQVA7QUFDQTBGLEVBQUFBLHlCQUF5QixDQUFDMUYsVUFBMUI7QUFDQSxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbiA9IHtcblx0ZGVmYXVsdEVtYWlsOiAnJyxcblx0ZGVmYXVsdE51bWJlcjogJycsXG5cdGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuXHQkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG5cdCRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuXHQkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcblx0JGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuXHQkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cdCRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblx0Zm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG51bWJlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ251bWJlcicsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0Jyxcblx0XHRcdFx0XHRwcm9tcHQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZVNwZWNpYWxDaGFyYWN0ZXJzXG5cdFx0XHRcdH1cblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ21pbkxlbmd0aFs1XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZSAgIDogJ25vdFJlZ0V4cCcsXG5cdFx0XHRcdFx0dmFsdWUgIDogL1tBLXpdLyxcblx0XHRcdFx0XHRwcm9tcHQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb0xvd1NpbXZvbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZSAgIDogJ25vdFJlZ0V4cCcsXG5cdFx0XHRcdFx0dmFsdWUgIDogL1xcZC8sXG5cdFx0XHRcdFx0cHJvbXB0IDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9OdW1iZXJzXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX3JpbmdsZW5ndGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG5cdFx0XHRkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbmJ1c3k6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29uYnVzeScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuXHRcdGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuXHRcdCQoJyNxdWFsaWZ5JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGlmICgkKCcjcXVhbGlmeScpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0JChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG5cdFx0aWYgKCQoJyNzaXBfc2VjcmV0JykudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG5cdFx0JCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHRleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG5cdFx0XHRpbnB1dG1hc2s6IHtcblx0XHRcdFx0ZGVmaW5pdGlvbnM6IHtcblx0XHRcdFx0XHQnIyc6IHtcblx0XHRcdFx0XHRcdHZhbGlkYXRvcjogJ1swLTldJyxcblx0XHRcdFx0XHRcdGNhcmRpbmFsaXR5OiAxLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuXHRcdFx0XHRzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogbWFza0xpc3QsXG5cdFx0XHRsaXN0S2V5OiAnbWFzaycsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuXHRcdFx0b25Vbk1hc2s6IGV4dGVuc2lvbi5jYk9uVW5tYXNrRW1haWwsXG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uKGUpIHtcblx0XHRcdGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLFwiXCIpO1xuXHRcdFx0aWYocGhvbmUgPT09ICcnKXtcblx0XHRcdFx0JChlLnRhcmdldCkudmFsKCcnKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBjb3Vwb25cblx0ICovXG5cdGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc29sZS5sb2coJ2NiT25Db21wbGV0ZU1vYmlsZU51bWJlcicpO1xuXHRcdGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4INCy0YvQsdGA0LDQvdC90YvQuSDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG5cdFx0Ly8g0J/QtdGA0LXQt9Cw0L/QvtC70L3QuNC8INGB0YLRgNC+0LrRgyDQtNC+0L3QsNCx0L7RgNCwXG5cdFx0aWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcblx0XHRcdHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuXHRcdCkge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0fVxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INC80LXQvdGP0LvRgdGPINC70Lgg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0Y29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQsdGL0LvQsCDQu9C4INC90LDRgdGC0YDQvtC10L3QsCDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjRjyDQvdCwINC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcblx0XHRjb25zb2xlLmxvZyhgbmV3IG1vYmlsZSBudW1iZXIgJHtleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcn0gYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0L7Rh9C40YHRgtC60LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcblx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsICcnKTtcblxuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG5cdFx0fVxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgLTEpO1xuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkg0KDQsNCx0L7RgtCwINGBINC/0LDRgNC+0LvQtdC8IFNJUCDRg9GH0LXRgtC60Lhcblx0ICovXG5cdGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSAnYWJjZGVmMTIzNDU2Nzg5MCc7XG5cdFx0bGV0IHBhc3MgPSAnJztcblx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IDMyOyB4ICs9IDEpIHtcblx0XHRcdGNvbnN0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpO1xuXHRcdFx0cGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwocGFzcyk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBleHRlbnNpb24udmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5cblxuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG5cdGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG5cdGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cdGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aD4wXG5cdFx0JiYgKFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScwJ1xuXHRcdFx0fHxcblx0XHRcdGZ3ZFJpbmdMZW5ndGg9PT0nJ1xuXHRcdCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vLyDQn9GA0L7QstC10YDQutCwINC90LXRgiDQu9C4INC+0YjQuNCx0LrQuCDQt9Cw0L3Rj9GC0L7Qs9C+INC00YDRg9Cz0L7QuSDRg9GH0LXRgtC60L7QuSDQvdC+0LzQtdGA0LBcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuXHRhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19