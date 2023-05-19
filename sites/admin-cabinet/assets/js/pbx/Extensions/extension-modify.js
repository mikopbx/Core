"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
    $("i.question").popup();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJleF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnMiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwicG9wdXAiLCJpbml0aWFsaXplRm9ybSIsInBhc3RlZFZhbHVlIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN0YXRlQ29udGV4dCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsInJlc3VsdCIsInVybERhdGEiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwiY29uc29sZSIsImxvZyIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFHQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLFlBQVksRUFBRSxFQURHO0FBRWpCQyxFQUFBQSxhQUFhLEVBQUUsRUFGRTtBQUdqQkMsRUFBQUEsbUJBQW1CLEVBQUUsRUFISjtBQUlqQkMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpPO0FBS2pCQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEc7QUFNakJFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBTkE7QUFPakJHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEQ7QUFRakJJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0FSUDtBQVNqQkssRUFBQUEsNEJBQTRCLEVBQUVMLENBQUMsQ0FBQyw4QkFBRCxDQVRkO0FBVWpCTSxFQUFBQSxNQUFNLEVBQUVOLENB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QUpkLENBQUosRUFLSTtBQUNILFdBQU8sS0FBUDtBQUNBOztBQUNELFNBQU8sSUFBUDtBQUNBLENBWkQsQyxDQWNBOzs7QUFDQTlILENBQUMsQ0FBQzRILEVBQUYsQ0FBS2xDLElBQUwsQ0FBVU8sUUFBVixDQUFtQnBGLEtBQW5CLENBQXlCbUgsU0FBekIsR0FBcUMsVUFBQ2hHLEtBQUQsRUFBUWlHLFNBQVI7QUFBQSxTQUFzQmpJLENBQUMsWUFBS2lJLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQzs7QUFFQWxJLENBQUMsQ0FBQ21JLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ6SSxFQUFBQSxTQUFTLENBQUNnRCxVQUFWO0FBQ0EwRixFQUFBQSxNQUFNLENBQUMxRixVQUFQO0FBQ0EyRixFQUFBQSx5QkFBeUIsQ0FBQzNGLFVBQTFCO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbiA9IHtcblx0ZGVmYXVsdEVtYWlsOiAnJyxcblx0ZGVmYXVsdE51bWJlcjogJycsXG5cdGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuXHQkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG5cdCRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuXHQkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcblx0JGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcblx0JGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuXHQkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cdCRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblx0Zm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG51bWJlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ251bWJlcicsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRtb2JpbGVfbnVtYmVyOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnbWFzaycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfZW1haWw6IHtcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbWFpbCcsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJfdXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0Jyxcblx0XHRcdFx0XHRwcm9tcHQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZVNwZWNpYWxDaGFyYWN0ZXJzXG5cdFx0XHRcdH1cblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzaXBfc2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ21pbkxlbmd0aFs1XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZSAgIDogJ25vdFJlZ0V4cCcsXG5cdFx0XHRcdFx0dmFsdWUgIDogL1tBLXpdLyxcblx0XHRcdFx0XHRwcm9tcHQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb0xvd1NpbXZvbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZSAgIDogJ25vdFJlZ0V4cCcsXG5cdFx0XHRcdFx0dmFsdWUgIDogL1xcZC8sXG5cdFx0XHRcdFx0cHJvbXB0IDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9OdW1iZXJzXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX3JpbmdsZW5ndGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG5cdFx0XHRkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZndkX2ZvcndhcmRpbmdvbmJ1c3k6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29uYnVzeScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuXHRcdGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXHRcdCQoJyNleHRlbnNpb25zLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuXHRcdCQoJyNxdWFsaWZ5JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGlmICgkKCcjcXVhbGlmeScpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0JChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG5cdFx0aWYgKCQoJyNzaXBfc2VjcmV0JykudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG5cdFx0JCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0pO1xuXG5cdFx0ZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHRleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG5cdFx0XHRpbnB1dG1hc2s6IHtcblx0XHRcdFx0ZGVmaW5pdGlvbnM6IHtcblx0XHRcdFx0XHQnIyc6IHtcblx0XHRcdFx0XHRcdHZhbGlkYXRvcjogJ1swLTldJyxcblx0XHRcdFx0XHRcdGNhcmRpbmFsaXR5OiAxLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuXHRcdFx0XHRvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuXHRcdFx0XHRzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogbWFza0xpc3QsXG5cdFx0XHRsaXN0S2V5OiAnbWFzaycsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuXHRcdFx0b25Vbk1hc2s6IGV4dGVuc2lvbi5jYk9uVW5tYXNrRW1haWwsXG5cdFx0XHRvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwsXG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uKGUpIHtcblx0XHRcdGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLFwiXCIpO1xuXHRcdFx0aWYocGhvbmUgPT09ICcnKXtcblx0XHRcdFx0JChlLnRhcmdldCkudmFsKCcnKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoXCJpLnF1ZXN0aW9uXCIpLnBvcHVwKCk7XG5cdFx0ZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGNvdXBvblxuXHQgKi9cblx0Y2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstC+0L7QtNCwINC90L7QvNC10YDQsCDRgtC10LvQtdGE0L7QvdCwINC00LvRjyDQv9GA0L7QstC10YDQutC4INC90LXRgiDQu9C4INC/0LXRgNC10YHQtdGH0LXQvdC40Lkg0YFcblx0ICog0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC80Lgg0L3QvtC80LXRgNCw0LzQuFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuXHRcdGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9C+0YHQu9C1INCy0LLQvtC00LAg0L/QvtC70L3QvtCz0L4gRW1haWwg0LDQtNGA0LXRgdCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVFbWFpbCgpIHtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4IEVtYWlsXG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXVzZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogJy51aS5pbnB1dC5lbWFpbCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG5cdFx0XHRcdFx0fHwgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9PT0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHQkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INC/0L7Qu9GD0YfQtdC90LjQuCDQsdC10LfQvNCw0YHQvtGH0L3QvtCz0L4g0LfQvdCw0YfQtdC90LjRj1xuXHQgKi9cblx0Y2JPblVubWFza0VtYWlsKG1hc2tlZFZhbHVlLCB1bm1hc2tlZFZhbHVlKSB7XG5cdFx0cmV0dXJuIHVubWFza2VkVmFsdWU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0LLQstC+0LTQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcblx0XHRjb25zb2xlLmxvZygnY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyJyk7XG5cdFx0Y29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXHRcdC8vINCU0LjQvdCw0LzQuNGH0LXRgdC60LDRjyDQv9GA0L7QstC+0LLQtdGA0LrQsCDRgdCy0L7QsdC+0LTQtdC9INC70Lgg0LLRi9Cx0YDQsNC90L3Ri9C5INC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0RXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cblx0XHQvLyDQn9C10YDQtdC30LDQv9C+0LvQvdC40Lwg0YHRgtGA0L7QutGDINC00L7QvdCw0LHQvtGA0LBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuXHRcdFx0fHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG5cdFx0KSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHR9XG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LzQtdC90Y/Qu9GB0Y8g0LvQuCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcblx0XHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXHRcdGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQvtGH0LjRgdGC0LrQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcblx0ICovXG5cdGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG5cdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG5cblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC90LUg0LHRi9C70LAg0LvQuCDQvdCw0YHRgtGA0L7QtdC90LAg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Y8g0L3QsCDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgJycpO1xuXG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJylcblx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG5cdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuXHRcdH1cblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblx0XHRcdGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSDQoNCw0LHQvtGC0LAg0YEg0L/QsNGA0L7Qu9C10LwgU0lQINGD0YfQtdGC0LrQuFxuXHQgKi9cblx0Z2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcblx0XHRjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblx0XHRsZXQgcGFzcyA9ICcnO1xuXHRcdGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuXHRcdFx0Y29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHR9XG5cdFx0ZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cblxuXG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcblx0Y29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcblx0Y29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblx0aWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoPjBcblx0XHQmJiAoXG5cdFx0XHRmd2RSaW5nTGVuZ3RoPT09JzAnXG5cdFx0XHR8fFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScnXG5cdFx0KSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8vINCf0YDQvtCy0LXRgNC60LAg0L3QtdGCINC70Lgg0L7RiNC40LHQutC4INC30LDQvdGP0YLQvtCz0L4g0LTRgNGD0LPQvtC5INGD0YfQtdGC0LrQvtC5INC90L7QvNC10YDQsFxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG5cdGF2YXRhci5pbml0aWFsaXplKCk7XG5cdGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=