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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJleF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnMiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwicG9wdXAiLCJpbml0aWFsaXplRm9ybSIsInBhc3RlZFZhbHVlIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN0YXRlQ29udGV4dCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsInJlc3VsdCIsInVybERhdGEiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwiY29uc29sZSIsImxvZyIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFHQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLFlBQVksRUFBRSxFQURHO0FBRWpCQyxFQUFBQSxhQUFhLEVBQUUsRUFGRTtBQUdqQkMsRUFBQUEsbUJBQW1CLEVBQUUsRUFISjtBQUlqQkMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpPO0FBS2pCQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEc7QUFNakJFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBTkE7QUFPakJHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEQ7QUFRakJJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0FSUDtBQVNqQkssRUFBQUEsNEJBQTRCLEVBQUVMLENBQUMsQ0FBQyw4QkFBRCxDQVRkO0FBVWpCTSxFQUFBQSxNQUFNLEVBQUVOLENB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QUpkLENBQUosRUFLSTtBQUNILFdBQU8sS0FBUDtBQUNBOztBQUNELFNBQU8sSUFBUDtBQUNBLENBWkQsQyxDQWNBOzs7QUFDQTlILENBQUMsQ0FBQzRILEVBQUYsQ0FBS2xDLElBQUwsQ0FBVU8sUUFBVixDQUFtQnBGLEtBQW5CLENBQXlCbUgsU0FBekIsR0FBcUMsVUFBQ2hHLEtBQUQsRUFBUWlHLFNBQVI7QUFBQSxTQUFzQmpJLENBQUMsWUFBS2lJLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQzs7QUFFQWxJLENBQUMsQ0FBQ21JLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ6SSxFQUFBQSxTQUFTLENBQUNnRCxVQUFWO0FBQ0EwRixFQUFBQSxNQUFNLENBQUMxRixVQUFQO0FBQ0EyRixFQUFBQSx5QkFBeUIsQ0FBQzNGLFVBQTFCO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgKi9cblxuXG5jb25zdCBleHRlbnNpb24gPSB7XG5cdGRlZmF1bHRFbWFpbDogJycsXG5cdGRlZmF1bHROdW1iZXI6ICcnLFxuXHRkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcblx0JG51bWJlcjogJCgnI251bWJlcicpLFxuXHQkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcblx0JG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG5cdCRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG5cdCRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG5cdCRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcblx0JGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXHQkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXHQkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cdGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRudW1iZXI6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdudW1iZXInLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bW9iaWxlX251bWJlcjoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ21hc2snLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX2VtYWlsOiB7XG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1haWwnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VyX3VzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnc3BlY2lhbENoYXJhY3RlcnNFeGlzdCcsXG5cdFx0XHRcdFx0cHJvbXB0IDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVTcGVjaWFsQ2hhcmFjdGVyc1xuXHRcdFx0XHR9XG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2lwX3NlY3JldDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3NpcF9zZWNyZXQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2Vhayxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGUgICA6ICdub3RSZWdFeHAnLFxuXHRcdFx0XHRcdHZhbHVlICA6IC9bQS16XS8sXG5cdFx0XHRcdFx0cHJvbXB0IDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9Mb3dTaW12b2xcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGUgICA6ICdub3RSZWdFeHAnLFxuXHRcdFx0XHRcdHZhbHVlICA6IC9cXGQvLFxuXHRcdFx0XHRcdHByb21wdCA6IGdsb2JhbFRyYW5zbGF0ZS5leF9QYXNzd29yZE5vTnVtYmVyc1xuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9yaW5nbGVuZ3RoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuXHRcdFx0ZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZzoge1xuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXHRcdGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cblx0XHRleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHQkKCcjcXVhbGlmeScpLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRpZiAoJCgnI3F1YWxpZnknKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuXHRcdGlmICgkKCcjc2lwX3NlY3JldCcpLnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuXHRcdCQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblx0XHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9KTtcblxuXHRcdGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcblx0XHR9KTtcblxuXHRcdGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0ZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcblx0XHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcblx0XHRcdFx0b25CZWZvcmVQYXN0ZTogZXh0ZW5zaW9uLmNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSxcblx0XHRcdFx0c2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IG1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcblx0XHRcdG9uVW5NYXNrOiBleHRlbnNpb24uY2JPblVubWFza0VtYWlsLFxuXHRcdFx0b25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuXHRcdH0pO1xuXHRcdGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbihlKSB7XG5cdFx0XHRsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZyxcIlwiKTtcblx0XHRcdGlmKHBob25lID09PSAnJyl7XG5cdFx0XHRcdCQoZS50YXJnZXQpLnZhbCgnJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuXHRcdGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBjb3Vwb25cblx0ICovXG5cdGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0L7RgdC70LUg0LLQvtC+0LTQsCDQvdC+0LzQtdGA0LAg0YLQtdC70LXRhNC+0L3QsCDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdC10YIg0LvQuCDQv9C10YDQtdGB0LXRh9C10L3QuNC5INGBXG5cdCAqINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQvNC4INC90L7QvNC10YDQsNC80Lhcblx0ICovXG5cdGNiT25Db21wbGV0ZU51bWJlcigpIHtcblx0XHRjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHRFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/QvtGB0LvQtSDQstCy0L7QtNCwINC/0L7Qu9C90L7Qs9C+IEVtYWlsINCw0LTRgNC10YHQsFxuXHQgKi9cblx0Y2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cdFx0Ly8g0JTQuNC90LDQvNC40YfQtdGB0LrQsNGPINC/0YDQvtCy0L7QstC10YDQutCwINGB0LLQvtCx0L7QtNC10L0g0LvQuCBFbWFpbFxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyksXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5lbWFpbEF2YWlsYWJsZVxuXHRcdFx0XHRcdHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0JCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQt9GL0LLQsNC10YLRgdGPINC/0YDQuCDQv9C+0LvRg9GH0LXQvdC40Lgg0LHQtdC30LzQsNGB0L7Rh9C90L7Qs9C+INC30L3QsNGH0LXQvdC40Y9cblx0ICovXG5cdGNiT25Vbm1hc2tFbWFpbChtYXNrZWRWYWx1ZSwgdW5tYXNrZWRWYWx1ZSkge1xuXHRcdHJldHVybiB1bm1hc2tlZFZhbHVlO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C30YvQstCw0LXRgtGB0Y8g0L/RgNC4INCy0LLQvtC00LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG5cdFx0Y29uc29sZS5sb2coJ2NiT25Db21wbGV0ZU1vYmlsZU51bWJlcicpO1xuXHRcdGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblx0XHQvLyDQlNC40L3QsNC80LjRh9C10YHQutCw0Y8g0L/RgNC+0LLQvtCy0LXRgNC60LAg0YHQstC+0LHQvtC00LXQvSDQu9C4INCy0YvQsdGA0LDQvdC90YvQuSDQvNC+0LHQuNC70YzQvdGL0Lkg0L3QvtC80LXRgFxuXHRcdEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG5cdFx0Ly8g0J/QtdGA0LXQt9Cw0L/QvtC70L3QuNC8INGB0YLRgNC+0LrRgyDQtNC+0L3QsNCx0L7RgNCwXG5cdFx0aWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcblx0XHRcdHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuXHRcdCkge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0fVxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INC80LXQvdGP0LvRgdGPINC70Lgg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0Y29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L3QtSDQsdGL0LvQsCDQu9C4INC90LDRgdGC0YDQvtC10L3QsCDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjRjyDQvdCwINC80L7QsdC40LvRjNC90YvQuSDQvdC+0LzQtdGAXG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG5cdFx0XHRcdFx0LmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdH1cblx0XHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuXHRcdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcblx0XHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcblx0XHRjb25zb2xlLmxvZyhgbmV3IG1vYmlsZSBudW1iZXIgJHtleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcn0gYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0L7Rh9C40YHRgtC60LUg0LzQvtCx0LjQu9GM0L3QvtCz0L4g0YLQtdC70LXRhNC+0L3QsCDQsiDQutCw0YDRgtC+0YfQutC1INGB0L7RgtGA0YPQtNC90LjQutCwXG5cdCAqL1xuXHRjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcblx0XHRleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuXHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuXG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQvdC1INCx0YvQu9CwINC70Lgg0L3QsNGB0YLRgNC+0LXQvdCwINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNGPINC90LAg0LzQvtCx0LjQu9GM0L3Ri9C5INC90L7QvNC10YBcblx0XHRpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsICcnKTtcblxuXHRcdFx0ZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG5cdFx0fVxuXHRcdGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHRleHQnLCAnLScpXG5cdFx0XHRcdC5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuXHRcdFx0ZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcblx0XHR9XG5cdFx0aWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cdFx0XHRleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKVxuXHRcdFx0XHQuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcblx0XHRcdGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgLTEpO1xuXHRcdH1cblx0XHRleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkg0KDQsNCx0L7RgtCwINGBINC/0LDRgNC+0LvQtdC8IFNJUCDRg9GH0LXRgtC60Lhcblx0ICovXG5cdGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSAnYWJjZGVmMTIzNDU2Nzg5MCc7XG5cdFx0bGV0IHBhc3MgPSAnJztcblx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IDMyOyB4ICs9IDEpIHtcblx0XHRcdGNvbnN0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpO1xuXHRcdFx0cGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG5cdFx0fVxuXHRcdGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwocGFzcyk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0ZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBleHRlbnNpb24udmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5cblxuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG5cdGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG5cdGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cdGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aD4wXG5cdFx0JiYgKFxuXHRcdFx0ZndkUmluZ0xlbmd0aD09PScwJ1xuXHRcdFx0fHxcblx0XHRcdGZ3ZFJpbmdMZW5ndGg9PT0nJ1xuXHRcdCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vLyDQn9GA0L7QstC10YDQutCwINC90LXRgiDQu9C4INC+0YjQuNCx0LrQuCDQt9Cw0L3Rj9GC0L7Qs9C+INC00YDRg9Cz0L7QuSDRg9GH0LXRgtC60L7QuSDQvdC+0LzQtdGA0LBcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuXHRhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19