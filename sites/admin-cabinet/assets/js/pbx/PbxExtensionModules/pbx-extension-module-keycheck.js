"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense, UserMessage*/

/**
 * Object for managing modules license key
 *
 * @module keyCheck
 */
var keyCheck = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#licencing-modify-form'),
  $emptyLicenseKeyInfo: $('.empty-license-key-info'),
  $filledLicenseKeyHeader: $('.filled-license-key-header'),
  $filledLicenseKeyInfo: $('.filled-license-key-info'),
  $filledLicenseKeyPlaceholder: $('.filled-license-key-info .confidential-field'),
  $getNewKeyLicenseSection: $('#getNewKeyLicenseSection'),
  $couponSection: $('#couponSection'),
  $formErrorMessages: $('#form-error-messages'),
  $licKey: $('#licKey'),
  $coupon: $('#coupon'),
  $email: $('#email'),
  $ajaxMessages: $('.ui.message.ajax'),
  $licenseDetailInfo: $('#licenseDetailInfo'),
  $productDetails: $('#productDetails'),
  $accordions: $('#licencing-modify-form .ui.accordion'),
  $resetButton: $('#reset-license-button'),
  $saveKeyButton: $('#save-license-key-button'),
  $activateCouponButton: $('#coupon-activation-button'),
  $manageKeyButton: $('#manage-license-button'),
  $resetConfirmModal: $('#reset-license-confirm-modal'),
  $confirmResetButton: $('#confirm-reset-license-button'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    companyname: {
      identifier: 'companyname',
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateCompanyNameEmpty
      }]
    },
    email: {
      identifier: 'email',
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateContactEmail
      }]
    },
    contact: {
      identifier: 'contact',
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateContactName
      }]
    },
    licKey: {
      identifier: 'licKey',
      optional: true,
      rules: [{
        type: 'exactLength[28]',
        prompt: globalTranslate.lic_ValidateLicenseKeyEmpty
      }]
    },
    coupon: {
      depends: 'licKey',
      identifier: 'coupon',
      optional: true,
      rules: [{
        type: 'exactLength[31]',
        prompt: globalTranslate.lic_ValidateCouponEmpty
      }]
    }
  },
  // Initialize the licensing page.
  initialize: function initialize() {
    keyCheck.$accordions.accordion();
    keyCheck.$licenseDetailInfo.hide(); // Initialize confirmation modal

    keyCheck.$resetConfirmModal.modal({
      closable: false,
      onDeny: function onDeny() {
        return true;
      },
      onApprove: function onApprove() {
        return false;
      }
    }); // Set input mask for coupon code field

    keyCheck.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
      onBeforePaste: keyCheck.cbOnCouponBeforePaste
    }); // Set input mask for license key field

    keyCheck.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
      oncomplete: keyCheck.cbOnLicenceKeyInputChange,
      onincomplete: keyCheck.cbOnLicenceKeyInputChange,
      clearIncomplete: true,
      onBeforePaste: keyCheck.cbOnLicenceKeyBeforePaste
    });
    keyCheck.$email.inputmask('email'); // Handle save key button click

    keyCheck.$saveKeyButton.on('click', function () {
      if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$saveKeyButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$saveKeyButton.transition('shake');
      }
    }); // Update reset button click handler

    keyCheck.$resetButton.on('click', function () {
      keyCheck.$resetConfirmModal.modal('show');
    }); // Handle confirm reset button click

    keyCheck.$confirmResetButton.on('click', function () {
      keyCheck.$formObj.addClass('loading disabled');
      keyCheck.$confirmResetButton.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(keyCheck.cbAfterResetLicenseKey);
      keyCheck.$resetConfirmModal.modal('hide');
    }); // Handle activate coupon button click

    keyCheck.$activateCouponButton.on('click', function () {
      if (keyCheck.$coupon.inputmask('unmaskedvalue').length === 20 && keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$activateCouponButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$activateCouponButton.transition('shake');
      }
    });
    keyCheck.cbOnLicenceKeyInputChange();
    keyCheck.initializeForm(); // Check if a license key is present

    if (globalPBXLicense.length === 28) {
      keyCheck.$filledLicenseKeyPlaceholder.html(globalPBXLicense);
      keyCheck.$filledLicenseKeyHeader.show();
      keyCheck.$manageKeyButton.attr('href', Config.keyManagementUrl);
      keyCheck.$emptyLicenseKeyInfo.hide();
      keyCheck.$filledLicenseKeyInfo.show();
    } else {
      keyCheck.$filledLicenseKeyHeader.hide();
      keyCheck.$filledLicenseKeyInfo.hide();
      keyCheck.$emptyLicenseKeyInfo.show();
    }
  },

  /**
   * Callback function triggered after resetting the license key.
   * @param {boolean} response - The response indicating the success of the license key reset.
   */
  cbAfterResetLicenseKey: function cbAfterResetLicenseKey(response) {
    // Remove the loading and disabled classes
    keyCheck.$formObj.removeClass('loading disabled');
    keyCheck.$confirmResetButton.removeClass('loading disabled');

    if (response !== false) {
      window.location.reload();
    }
  },

  /**
   * Callback function triggered after retrieving the license information.
   * @param {Object} response - The response containing the license information.
   */
  cbAfterGetLicenseInfo: function cbAfterGetLicenseInfo(response) {
    if (response.licenseInfo !== undefined) {
      // License information is available
      keyCheck.showLicenseInfo(response.licenseInfo);
      keyCheck.$licenseDetailInfo.show();
    } else {
      // License information is not available
      keyCheck.$licenseDetailInfo.hide();
    }
  },

  /**
   * Callback function triggered when there is a change in the license key input.
   */
  cbOnLicenceKeyInputChange: function cbOnLicenceKeyInputChange() {
    if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
      // License key is complete
      keyCheck.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).attr('hidden', '');
      });
      keyCheck.$getNewKeyLicenseSection.hide();
      keyCheck.$couponSection.show();
      keyCheck.$formErrorMessages.empty();
    } else {
      // License key is incomplete
      keyCheck.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).removeAttr('hidden');
      });
      keyCheck.$getNewKeyLicenseSection.show();
      keyCheck.$couponSection.hide();
    }
  },

  /**
   * Callback function triggered before pasting a value into the license key field.
   * @param {string} pastedValue - The value being pasted into the field.
   * @returns {boolean|string} - Returns false if the pasted value does not contain 'MIKO-', otherwise returns the pasted value with whitespace removed.
   */
  cbOnLicenceKeyBeforePaste: function cbOnLicenceKeyBeforePaste(pastedValue) {
    if (pastedValue.indexOf('MIKO-') === -1) {
      keyCheck.$licKey.transition('shake');
      return false;
    }

    return pastedValue.replace(/\s+/g, '');
  },

  /**
   * Callback function triggered before pasting a value into the coupon field.
   * @param {string} pastedValue - The value being pasted into the field.
   * @returns {boolean|string} - Returns false if the pasted value does not contain 'MIKOUPD-', otherwise returns the pasted value with whitespace removed.
   */
  cbOnCouponBeforePaste: function cbOnCouponBeforePaste(pastedValue) {
    if (pastedValue.indexOf('MIKOUPD-') === -1) {
      keyCheck.$coupon.transition('shake');
      return false;
    }

    return pastedValue.replace(/\s+/g, '');
  },

  /**
   * Display license information.
   * @param {string} message - The license information message.
   */
  showLicenseInfo: function showLicenseInfo(message) {
    var licenseData = JSON.parse(message);

    if (licenseData['@attributes'] === undefined) {
      return;
    }

    $('#key-companyname').text(licenseData['@attributes'].companyname);
    $('#key-contact').text(licenseData['@attributes'].contact);
    $('#key-email').text(licenseData['@attributes'].email);
    $('#key-tel').text(licenseData['@attributes'].tel);
    var products = licenseData.product;

    if (!Array.isArray(products)) {
      products = [];
      products.push(licenseData.product);
    }

    $('#productDetails tbody').empty();
    $.each(products, function (key, productValue) {
      if (productValue === undefined) {
        return;
      }

      var row = '<tr><td>';
      var product = productValue;

      if (product['@attributes'] !== undefined) {
        product = productValue['@attributes'];
      }

      var dateExpired = new Date(product.expired.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3'));
      var dateNow = new Date();

      if (dateNow > dateExpired) {
        row += "<div class=\"ui disabled segment\">".concat(product.name, "<br>\n\t\t\t\t<small>").concat(globalTranslate.lic_Expired, "</small>");
      } else if (product.expired.length === 0 && product.trial === '1') {
        row += "<div class=\"ui disabled segment\">".concat(product.name, "<br>\n\t\t\t\t<small>").concat(globalTranslate.lic_Expired, "</small>");
      } else {
        row += "<div class=\"ui positive message\">".concat(product.name);

        if (product.expired.length > 0) {
          var expiredText = i18n('lic_ExpiredAfter', {
            expired: product.expired
          });
          row += "<br><small>".concat(expiredText, "</small>");
        }

        row += '<br><span class="features">';
        $.each(productValue.feature, function (index, featureValue) {
          var feature = featureValue;

          if (featureValue['@attributes'] !== undefined) {
            feature = featureValue['@attributes'];
          }

          var featureInfo = i18n('lic_FeatureInfo', {
            name: feature.name,
            count: feature.count,
            counteach: feature.counteach,
            captured: feature.captured
          });
          row += "".concat(featureInfo, "<br>");
        });
        row += '</span>';
      }

      row += '</div></td></tr>';
      $('#productDetails tbody').append(row);
    });
  },

  /**
   * After update license key, get new one, activate coupon
   * @param response
   * @param success
   */
  cbAfterFormProcessing: function cbAfterFormProcessing(response, success) {
    if (success === true) {
      if (typeof response.data.PBXLicense !== 'undefined') {
        globalPBXLicense = response.data.PBXLicense;
        keyCheck.$formObj.form('set value', 'licKey', response.data.PBXLicense);
      }

      $('#productDetails tbody').html('');
      keyCheck.$formObj.form('set value', 'coupon', '');
      keyCheck.initialize();

      if (response.messages.length !== 0) {
        UserMessage.showMultiString(response.messages);
      }
    } else if (response.messages.license !== undefined) {
      UserMessage.showLicenseError(globalTranslate.lic_GeneralError, response.messages.license);
    } else {
      UserMessage.showMultiString(response.messages, globalTranslate.lic_GeneralError);
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    return settings;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    keyCheck.$formObj.removeClass('loading');
    keyCheck.$saveKeyButton.removeClass('loading disabled');
    keyCheck.$activateCouponButton.removeClass('loading disabled');
    var formData = keyCheck.$formObj.form('get values');
    PbxApi.LicenseProcessUserRequest(formData, keyCheck.cbAfterFormProcessing);
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = keyCheck.$formObj;
    Form.url = "".concat(globalRootUrl, "licensing/save"); // Form submission URL

    Form.validateRules = keyCheck.validateRules; // Form validation rules

    Form.cbBeforeSendForm = keyCheck.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = keyCheck.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Custom validation rule to check if a field is empty only if the license key field is not empty.
 * @param {string} value - The value of the field being validated.
 * @returns {boolean} - True if the field is not empty or the license key field is empty, false otherwise.
 */

$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return keyCheck.$licKey.inputmask('unmaskedvalue').length === 20 || value.length > 0;
};
/**
 *  Initialize licensing modify form on document ready
 */


$(document).ready(function () {
  keyCheck.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwiJHJlc2V0Q29uZmlybU1vZGFsIiwiJGNvbmZpcm1SZXNldEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiUGJ4QXBpIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsImNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkiLCJpbml0aWFsaXplRm9ybSIsImdsb2JhbFBCWExpY2Vuc2UiLCJodG1sIiwic2hvdyIsImF0dHIiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2JBZnRlckdldExpY2Vuc2VJbmZvIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJmb3JtIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImxpY2Vuc2UiLCJzaG93TGljZW5zZUVycm9yIiwibGljX0dlbmVyYWxFcnJvciIsImRhdGFDaGFuZ2VkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9ybURhdGEiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5IiwidmFsdWUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTEU7QUFPYkMsRUFBQUEsb0JBQW9CLEVBQUVELENBQUMsQ0FBQyx5QkFBRCxDQVBWO0FBUWJFLEVBQUFBLHVCQUF1QixFQUFFRixDQUFDLENBQUMsNEJBQUQsQ0FSYjtBQVNiRyxFQUFBQSxxQkFBcUIsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBVFg7QUFVYkksRUFBQUEsNEJBQTRCLEVBQUVKLENBQUMsQ0FBQyw4Q0FBRCxDQVZsQjtBQVdiSyxFQUFBQSx3QkFBd0IsRUFBRUwsQ0FBQyxDQUFDLDBCQUFELENBWGQ7QUFZYk0sRUFBQUEsY0FBYyxFQUFFTixDQUFDLENBQUMsZ0JBQUQsQ0FaSjtBQWFiTyxFQUFBQSxrQkFBa0IsRUFBRVAsQ0FBQyxDQUFDLHNCQUFELENBYlI7QUFjYlEsRUFBQUEsT0FBTyxFQUFFUixDQUFDLENBQUMsU0FBRCxDQWRHO0FBZWJTLEVBQUFBLE9BQU8sRUFBRVQsQ0FBQyxDQUFDLFNBQUQsQ0FmRztBQWdCYlUsRUFBQUEsTUFBTSxFQUFFVixDQUFDLENBQUMsUUFBRCxDQWhCSTtBQWlCYlcsRUFBQUEsYUFBYSxFQUFFWCxDQUFDLENBQUMsa0JBQUQsQ0FqQkg7QUFrQmJZLEVBQUFBLGtCQUFrQixFQUFFWixDQUFDLENBQUMsb0JBQUQsQ0FsQlI7QUFtQmJhLEVBQUFBLGVBQWUsRUFBRWIsQ0FBQyxDQUFDLGlCQUFELENBbkJMO0FBb0JiYyxFQUFBQSxXQUFXLEVBQUVkLENBQUMsQ0FBQyxzQ0FBRCxDQXBCRDtBQXNCYmUsRUFBQUEsWUFBWSxFQUFFZixDQUFDLENBQUMsdUJBQUQsQ0F0QkY7QUF1QmJnQixFQUFBQSxjQUFjLEVBQUVoQixDQUFDLENBQUMsMEJBQUQsQ0F2Qko7QUF3QmJpQixFQUFBQSxxQkFBcUIsRUFBRWpCLENBQUMsQ0FBQywyQkFBRCxDQXhCWDtBQXlCYmtCLEVBQUFBLGdCQUFnQixFQUFFbEIsQ0FBQyxDQUFDLHdCQUFELENBekJOO0FBMkJibUIsRUFBQUEsa0JBQWtCLEVBQUVuQixDQUFDLENBQUMsOEJBQUQsQ0EzQlI7QUE0QmJvQixFQUFBQSxtQkFBbUIsRUFBRXBCLENBQUMsQ0FBQywrQkFBRCxDQTVCVDs7QUE4QmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJcUIsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRSxLQURGO0FBVVhDLElBQUFBLEtBQUssRUFBRTtBQUNITixNQUFBQSxVQUFVLEVBQUUsT0FEVDtBQUVIQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BREc7QUFGSixLQVZJO0FBbUJYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTFIsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLDZCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSztBQUY1QixPQURHO0FBRkYsS0FuQkU7QUE0QlhDLElBQUFBLE1BQU0sRUFBRTtBQUNKVixNQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKVyxNQUFBQSxRQUFRLEVBQUUsSUFGTjtBQUdKVixNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsaUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNRO0FBRjVCLE9BREc7QUFISCxLQTVCRztBQXNDWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pDLE1BQUFBLE9BQU8sRUFBRSxRQURMO0FBRUpkLE1BQUFBLFVBQVUsRUFBRSxRQUZSO0FBR0pXLE1BQUFBLFFBQVEsRUFBRSxJQUhOO0FBSUpWLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FERztBQUpIO0FBdENHLEdBbkNGO0FBc0ZiO0FBQ0FDLEVBQUFBLFVBdkZhLHdCQXVGQTtBQUNUekMsSUFBQUEsUUFBUSxDQUFDZ0IsV0FBVCxDQUFxQjBCLFNBQXJCO0FBQ0ExQyxJQUFBQSxRQUFRLENBQUNjLGtCQUFULENBQTRCNkIsSUFBNUIsR0FGUyxDQUlUOztBQUNBM0MsSUFBQUEsUUFBUSxDQUFDcUIsa0JBQVQsQ0FBNEJ1QixLQUE1QixDQUFrQztBQUM5QkMsTUFBQUEsUUFBUSxFQUFFLEtBRG9CO0FBRTlCQyxNQUFBQSxNQUFNLEVBQUUsa0JBQU07QUFDVixlQUFPLElBQVA7QUFDSCxPQUo2QjtBQUs5QkMsTUFBQUEsU0FBUyxFQUFFLHFCQUFNO0FBQ2IsZUFBTyxLQUFQO0FBQ0g7QUFQNkIsS0FBbEMsRUFMUyxDQWVUOztBQUNBL0MsSUFBQUEsUUFBUSxDQUFDVyxPQUFULENBQWlCcUMsU0FBakIsQ0FBMkIsaUNBQTNCLEVBQThEO0FBQzFEQyxNQUFBQSxhQUFhLEVBQUVqRCxRQUFRLENBQUNrRDtBQURrQyxLQUE5RCxFQWhCUyxDQW9CVDs7QUFDQWxELElBQUFBLFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLDhCQUEzQixFQUEyRDtBQUN2REcsTUFBQUEsVUFBVSxFQUFFbkQsUUFBUSxDQUFDb0QseUJBRGtDO0FBRXZEQyxNQUFBQSxZQUFZLEVBQUVyRCxRQUFRLENBQUNvRCx5QkFGZ0M7QUFHdkRFLE1BQUFBLGVBQWUsRUFBRSxJQUhzQztBQUl2REwsTUFBQUEsYUFBYSxFQUFFakQsUUFBUSxDQUFDdUQ7QUFKK0IsS0FBM0Q7QUFPQXZELElBQUFBLFFBQVEsQ0FBQ1ksTUFBVCxDQUFnQm9DLFNBQWhCLENBQTBCLE9BQTFCLEVBNUJTLENBOEJUOztBQUNBaEQsSUFBQUEsUUFBUSxDQUFDa0IsY0FBVCxDQUF3QnNDLEVBQXhCLENBQTJCLE9BQTNCLEVBQW9DLFlBQU07QUFDdEMsVUFBSXhELFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDUyxNQUE1QyxLQUFxRCxFQUF6RCxFQUE0RDtBQUN4RHpELFFBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQnlELFFBQWxCLENBQTJCLGtCQUEzQjtBQUNBMUQsUUFBQUEsUUFBUSxDQUFDa0IsY0FBVCxDQUF3QndDLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBQyxRQUFBQSxJQUFJLENBQUNDLFVBQUw7QUFDSCxPQUpELE1BSU87QUFDSDVELFFBQUFBLFFBQVEsQ0FBQ2tCLGNBQVQsQ0FBd0IyQyxVQUF4QixDQUFtQyxPQUFuQztBQUNIO0FBQ0osS0FSRCxFQS9CUyxDQXlDVDs7QUFDQTdELElBQUFBLFFBQVEsQ0FBQ2lCLFlBQVQsQ0FBc0J1QyxFQUF0QixDQUF5QixPQUF6QixFQUFrQyxZQUFNO0FBQ3BDeEQsTUFBQUEsUUFBUSxDQUFDcUIsa0JBQVQsQ0FBNEJ1QixLQUE1QixDQUFrQyxNQUFsQztBQUNILEtBRkQsRUExQ1MsQ0E4Q1Q7O0FBQ0E1QyxJQUFBQSxRQUFRLENBQUNzQixtQkFBVCxDQUE2QmtDLEVBQTdCLENBQWdDLE9BQWhDLEVBQXlDLFlBQU07QUFDM0N4RCxNQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J5RCxRQUFsQixDQUEyQixrQkFBM0I7QUFDQTFELE1BQUFBLFFBQVEsQ0FBQ3NCLG1CQUFULENBQTZCb0MsUUFBN0IsQ0FBc0Msa0JBQXRDO0FBQ0FJLE1BQUFBLE1BQU0sQ0FBQ0Msc0JBQVAsQ0FBOEIvRCxRQUFRLENBQUNnRSxzQkFBdkM7QUFDQWhFLE1BQUFBLFFBQVEsQ0FBQ3FCLGtCQUFULENBQTRCdUIsS0FBNUIsQ0FBa0MsTUFBbEM7QUFDSCxLQUxELEVBL0NTLENBc0RUOztBQUNBNUMsSUFBQUEsUUFBUSxDQUFDbUIscUJBQVQsQ0FBK0JxQyxFQUEvQixDQUFrQyxPQUFsQyxFQUEyQyxZQUFNO0FBQzdDLFVBQUl4RCxRQUFRLENBQUNXLE9BQVQsQ0FBaUJxQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBcUQsRUFBckQsSUFBMER6RCxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBcUQsRUFBbkgsRUFBc0g7QUFDbEh6RCxRQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J5RCxRQUFsQixDQUEyQixrQkFBM0I7QUFDQTFELFFBQUFBLFFBQVEsQ0FBQ21CLHFCQUFULENBQStCdUMsUUFBL0IsQ0FBd0Msa0JBQXhDO0FBQ0FDLFFBQUFBLElBQUksQ0FBQ0MsVUFBTDtBQUNILE9BSkQsTUFJTztBQUNINUQsUUFBQUEsUUFBUSxDQUFDbUIscUJBQVQsQ0FBK0IwQyxVQUEvQixDQUEwQyxPQUExQztBQUNIO0FBQ0osS0FSRDtBQVVBN0QsSUFBQUEsUUFBUSxDQUFDb0QseUJBQVQ7QUFFQXBELElBQUFBLFFBQVEsQ0FBQ2lFLGNBQVQsR0FuRVMsQ0FxRVQ7O0FBQ0EsUUFBSUMsZ0JBQWdCLENBQUNULE1BQWpCLEtBQTRCLEVBQWhDLEVBQW9DO0FBQ2hDekQsTUFBQUEsUUFBUSxDQUFDTSw0QkFBVCxDQUFzQzZELElBQXRDLENBQTJDRCxnQkFBM0M7QUFDQWxFLE1BQUFBLFFBQVEsQ0FBQ0ksdUJBQVQsQ0FBaUNnRSxJQUFqQztBQUNBcEUsTUFBQUEsUUFBUSxDQUFDb0IsZ0JBQVQsQ0FBMEJpRCxJQUExQixDQUErQixNQUEvQixFQUFzQ0MsTUFBTSxDQUFDQyxnQkFBN0M7QUFDQXZFLE1BQUFBLFFBQVEsQ0FBQ0csb0JBQVQsQ0FBOEJ3QyxJQUE5QjtBQUNBM0MsTUFBQUEsUUFBUSxDQUFDSyxxQkFBVCxDQUErQitELElBQS9CO0FBQ0gsS0FORCxNQU1PO0FBQ0hwRSxNQUFBQSxRQUFRLENBQUNJLHVCQUFULENBQWlDdUMsSUFBakM7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ0sscUJBQVQsQ0FBK0JzQyxJQUEvQjtBQUNBM0MsTUFBQUEsUUFBUSxDQUFDRyxvQkFBVCxDQUE4QmlFLElBQTlCO0FBQ0g7QUFDSixHQXhLWTs7QUEwS2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUosRUFBQUEsc0JBOUthLGtDQThLVVEsUUE5S1YsRUE4S29CO0FBQzdCO0FBQ0F4RSxJQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J3RSxXQUFsQixDQUE4QixrQkFBOUI7QUFDQXpFLElBQUFBLFFBQVEsQ0FBQ3NCLG1CQUFULENBQTZCbUQsV0FBN0IsQ0FBeUMsa0JBQXpDOztBQUNBLFFBQUlELFFBQVEsS0FBSyxLQUFqQixFQUF3QjtBQUNwQkUsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQjtBQUNIO0FBQ0osR0FyTFk7O0FBdUxiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQTNMYSxpQ0EyTFNMLFFBM0xULEVBMkxtQjtBQUM1QixRQUFJQSxRQUFRLENBQUNNLFdBQVQsS0FBeUJDLFNBQTdCLEVBQXdDO0FBQ3BDO0FBQ0EvRSxNQUFBQSxRQUFRLENBQUNnRixlQUFULENBQXlCUixRQUFRLENBQUNNLFdBQWxDO0FBQ0E5RSxNQUFBQSxRQUFRLENBQUNjLGtCQUFULENBQTRCc0QsSUFBNUI7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBcEUsTUFBQUEsUUFBUSxDQUFDYyxrQkFBVCxDQUE0QjZCLElBQTVCO0FBQ0g7QUFDSixHQXBNWTs7QUFzTWI7QUFDSjtBQUNBO0FBQ0lTLEVBQUFBLHlCQXpNYSx1Q0F5TWU7QUFDeEIsUUFBSXBELFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDUyxNQUE1QyxLQUF1RCxFQUEzRCxFQUErRDtBQUMzRDtBQUNBekQsTUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCZ0YsSUFBbEIsQ0FBdUIsZ0JBQXZCLEVBQXlDQyxJQUF6QyxDQUE4QyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMURsRixRQUFBQSxDQUFDLENBQUNrRixHQUFELENBQUQsQ0FBT2YsSUFBUCxDQUFZLFFBQVosRUFBc0IsRUFBdEI7QUFDSCxPQUZEO0FBR0FyRSxNQUFBQSxRQUFRLENBQUNPLHdCQUFULENBQWtDb0MsSUFBbEM7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ1EsY0FBVCxDQUF3QjRELElBQXhCO0FBQ0FwRSxNQUFBQSxRQUFRLENBQUNTLGtCQUFULENBQTRCNEUsS0FBNUI7QUFDSCxLQVJELE1BUU87QUFDSDtBQUNBckYsTUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCZ0YsSUFBbEIsQ0FBdUIsZ0JBQXZCLEVBQXlDQyxJQUF6QyxDQUE4QyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMURsRixRQUFBQSxDQUFDLENBQUNrRixHQUFELENBQUQsQ0FBT0UsVUFBUCxDQUFrQixRQUFsQjtBQUNILE9BRkQ7QUFHQXRGLE1BQUFBLFFBQVEsQ0FBQ08sd0JBQVQsQ0FBa0M2RCxJQUFsQztBQUNBcEUsTUFBQUEsUUFBUSxDQUFDUSxjQUFULENBQXdCbUMsSUFBeEI7QUFDSDtBQUNKLEdBMU5ZOztBQTROYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lZLEVBQUFBLHlCQWpPYSxxQ0FpT2FnQyxXQWpPYixFQWlPMEI7QUFDbkMsUUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLE9BQXBCLE1BQWlDLENBQUMsQ0FBdEMsRUFBeUM7QUFDckN4RixNQUFBQSxRQUFRLENBQUNVLE9BQVQsQ0FBaUJtRCxVQUFqQixDQUE0QixPQUE1QjtBQUNBLGFBQU8sS0FBUDtBQUNIOztBQUNELFdBQU8wQixXQUFXLENBQUNFLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBdk9ZOztBQXlPYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2QyxFQUFBQSxxQkE5T2EsaUNBOE9TcUMsV0E5T1QsRUE4T3NCO0FBQy9CLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixVQUFwQixNQUFvQyxDQUFDLENBQXpDLEVBQTRDO0FBQ3hDeEYsTUFBQUEsUUFBUSxDQUFDVyxPQUFULENBQWlCa0QsVUFBakIsQ0FBNEIsT0FBNUI7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPMEIsV0FBVyxDQUFDRSxPQUFaLENBQW9CLE1BQXBCLEVBQTRCLEVBQTVCLENBQVA7QUFDSCxHQXBQWTs7QUFzUGI7QUFDSjtBQUNBO0FBQ0E7QUFDSVQsRUFBQUEsZUExUGEsMkJBMFBHVSxPQTFQSCxFQTBQWTtBQUNyQixRQUFNQyxXQUFXLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxPQUFYLENBQXBCOztBQUNBLFFBQUlDLFdBQVcsQ0FBQyxhQUFELENBQVgsS0FBK0JaLFNBQW5DLEVBQThDO0FBQzFDO0FBQ0g7O0FBQ0Q3RSxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQjRGLElBQXRCLENBQTJCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCbkUsV0FBdEQ7QUFDQXRCLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I0RixJQUFsQixDQUF1QkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQjFELE9BQWxEO0FBQ0EvQixJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCNEYsSUFBaEIsQ0FBcUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkI1RCxLQUFoRDtBQUNBN0IsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjNEYsSUFBZCxDQUFtQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQkksR0FBOUM7QUFDQSxRQUFJQyxRQUFRLEdBQUdMLFdBQVcsQ0FBQ00sT0FBM0I7O0FBQ0EsUUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsUUFBZCxDQUFMLEVBQThCO0FBQzFCQSxNQUFBQSxRQUFRLEdBQUcsRUFBWDtBQUNBQSxNQUFBQSxRQUFRLENBQUNJLElBQVQsQ0FBY1QsV0FBVyxDQUFDTSxPQUExQjtBQUNIOztBQUNEL0YsSUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJtRixLQUEzQjtBQUNBbkYsSUFBQUEsQ0FBQyxDQUFDZ0YsSUFBRixDQUFPYyxRQUFQLEVBQWlCLFVBQUNLLEdBQUQsRUFBTUMsWUFBTixFQUF1QjtBQUNwQyxVQUFJQSxZQUFZLEtBQUt2QixTQUFyQixFQUFnQztBQUM1QjtBQUNIOztBQUNELFVBQUl3QixHQUFHLEdBQUcsVUFBVjtBQUNBLFVBQUlOLE9BQU8sR0FBR0ssWUFBZDs7QUFDQSxVQUFJTCxPQUFPLENBQUMsYUFBRCxDQUFQLEtBQTJCbEIsU0FBL0IsRUFBMEM7QUFDdENrQixRQUFBQSxPQUFPLEdBQUdLLFlBQVksQ0FBQyxhQUFELENBQXRCO0FBQ0g7O0FBQ0QsVUFBTUUsV0FBVyxHQUFHLElBQUlDLElBQUosQ0FBU1IsT0FBTyxDQUFDUyxPQUFSLENBQWdCakIsT0FBaEIsQ0FBd0IseUJBQXhCLEVBQW1ELFVBQW5ELENBQVQsQ0FBcEI7QUFDQSxVQUFNa0IsT0FBTyxHQUFHLElBQUlGLElBQUosRUFBaEI7O0FBQ0EsVUFBSUUsT0FBTyxHQUFHSCxXQUFkLEVBQTJCO0FBQ3ZCRCxRQUFBQSxHQUFHLGlEQUF3Q04sT0FBTyxDQUFDVyxJQUFoRCxrQ0FDTi9FLGVBQWUsQ0FBQ2dGLFdBRFYsYUFBSDtBQUVILE9BSEQsTUFHTyxJQUFJWixPQUFPLENBQUNTLE9BQVIsQ0FBZ0JqRCxNQUFoQixLQUEyQixDQUEzQixJQUFnQ3dDLE9BQU8sQ0FBQ2EsS0FBUixLQUFrQixHQUF0RCxFQUEyRDtBQUM5RFAsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ04vRSxlQUFlLENBQUNnRixXQURWLGFBQUg7QUFFSCxPQUhNLE1BR0E7QUFDSE4sUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsQ0FBSDs7QUFDQSxZQUFJWCxPQUFPLENBQUNTLE9BQVIsQ0FBZ0JqRCxNQUFoQixHQUF5QixDQUE3QixFQUFnQztBQUM1QixjQUFJc0QsV0FBVyxHQUFHQyxJQUFJLENBQUMsa0JBQUQsRUFBcUI7QUFBQ04sWUFBQUEsT0FBTyxFQUFFVCxPQUFPLENBQUNTO0FBQWxCLFdBQXJCLENBQXRCO0FBQ0FILFVBQUFBLEdBQUcseUJBQWtCUSxXQUFsQixhQUFIO0FBQ0g7O0FBQ0RSLFFBQUFBLEdBQUcsSUFBSSw2QkFBUDtBQUNBckcsUUFBQUEsQ0FBQyxDQUFDZ0YsSUFBRixDQUFPb0IsWUFBWSxDQUFDVyxPQUFwQixFQUE2QixVQUFDOUIsS0FBRCxFQUFRK0IsWUFBUixFQUF5QjtBQUVsRCxjQUFJRCxPQUFPLEdBQUdDLFlBQWQ7O0FBQ0EsY0FBSUEsWUFBWSxDQUFDLGFBQUQsQ0FBWixLQUFnQ25DLFNBQXBDLEVBQStDO0FBQzNDa0MsWUFBQUEsT0FBTyxHQUFHQyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNELGNBQUlDLFdBQVcsR0FBR0gsSUFBSSxDQUFDLGlCQUFELEVBQW9CO0FBQUNKLFlBQUFBLElBQUksRUFBRUssT0FBTyxDQUFDTCxJQUFmO0FBQXFCUSxZQUFBQSxLQUFLLEVBQUVILE9BQU8sQ0FBQ0csS0FBcEM7QUFBMkNDLFlBQUFBLFNBQVMsRUFBRUosT0FBTyxDQUFDSSxTQUE5RDtBQUF5RUMsWUFBQUEsUUFBUSxFQUFFTCxPQUFPLENBQUNLO0FBQTNGLFdBQXBCLENBQXRCO0FBQ0FmLFVBQUFBLEdBQUcsY0FBT1ksV0FBUCxTQUFIO0FBQ0gsU0FSRDtBQVNBWixRQUFBQSxHQUFHLElBQUksU0FBUDtBQUNIOztBQUNEQSxNQUFBQSxHQUFHLElBQUksa0JBQVA7QUFDQXJHLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCcUgsTUFBM0IsQ0FBa0NoQixHQUFsQztBQUNILEtBckNEO0FBc0NILEdBL1NZOztBQWlUYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lpQixFQUFBQSxxQkF0VGEsaUNBc1RTaEQsUUF0VFQsRUFzVG1CaUQsT0F0VG5CLEVBc1Q0QjtBQUNyQyxRQUFJQSxPQUFPLEtBQUssSUFBaEIsRUFBc0I7QUFDbEIsVUFBSSxPQUFPakQsUUFBUSxDQUFDa0QsSUFBVCxDQUFjQyxVQUFyQixLQUFvQyxXQUF4QyxFQUFxRDtBQUNqRHpELFFBQUFBLGdCQUFnQixHQUFHTSxRQUFRLENBQUNrRCxJQUFULENBQWNDLFVBQWpDO0FBQ0EzSCxRQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0IySCxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxRQUFwQyxFQUE4Q3BELFFBQVEsQ0FBQ2tELElBQVQsQ0FBY0MsVUFBNUQ7QUFDSDs7QUFDRHpILE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCaUUsSUFBM0IsQ0FBZ0MsRUFBaEM7QUFFQW5FLE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQjJILElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFFBQXBDLEVBQThDLEVBQTlDO0FBRUE1SCxNQUFBQSxRQUFRLENBQUN5QyxVQUFUOztBQUNBLFVBQUkrQixRQUFRLENBQUNxRCxRQUFULENBQWtCcEUsTUFBbEIsS0FBNkIsQ0FBakMsRUFBb0M7QUFDaENxRSxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJ2RCxRQUFRLENBQUNxRCxRQUFyQztBQUNIO0FBQ0osS0FiRCxNQWFPLElBQUlyRCxRQUFRLENBQUNxRCxRQUFULENBQWtCRyxPQUFsQixLQUE0QmpELFNBQWhDLEVBQTBDO0FBQzdDK0MsTUFBQUEsV0FBVyxDQUFDRyxnQkFBWixDQUE2QnBHLGVBQWUsQ0FBQ3FHLGdCQUE3QyxFQUErRDFELFFBQVEsQ0FBQ3FELFFBQVQsQ0FBa0JHLE9BQWpGO0FBQ0gsS0FGTSxNQUVBO0FBQ0hGLE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnZELFFBQVEsQ0FBQ3FELFFBQXJDLEVBQStDaEcsZUFBZSxDQUFDcUcsZ0JBQS9EO0FBQ0gsS0FsQm9DLENBb0JyQzs7O0FBQ0F2RSxJQUFBQSxJQUFJLENBQUN3RSxXQUFMO0FBQ0gsR0E1VVk7O0FBOFViO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBblZhLDRCQW1WSUMsUUFuVkosRUFtVmM7QUFDdkIsV0FBT0EsUUFBUDtBQUNILEdBclZZOztBQXVWYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQTNWYSwyQkEyVkc5RCxRQTNWSCxFQTJWYTtBQUN0QnhFLElBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQndFLFdBQWxCLENBQThCLFNBQTlCO0FBQ0F6RSxJQUFBQSxRQUFRLENBQUNrQixjQUFULENBQXdCdUQsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0F6RSxJQUFBQSxRQUFRLENBQUNtQixxQkFBVCxDQUErQnNELFdBQS9CLENBQTJDLGtCQUEzQztBQUNBLFFBQU04RCxRQUFRLEdBQUd2SSxRQUFRLENBQUNDLFFBQVQsQ0FBa0IySCxJQUFsQixDQUF1QixZQUF2QixDQUFqQjtBQUNBOUQsSUFBQUEsTUFBTSxDQUFDMEUseUJBQVAsQ0FBaUNELFFBQWpDLEVBQTJDdkksUUFBUSxDQUFDd0gscUJBQXBEO0FBQ0gsR0FqV1k7O0FBbVdiO0FBQ0o7QUFDQTtBQUNJdkQsRUFBQUEsY0F0V2EsNEJBc1dJO0FBQ2JOLElBQUFBLElBQUksQ0FBQzFELFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQTBELElBQUFBLElBQUksQ0FBQzhFLEdBQUwsYUFBY0MsYUFBZCxvQkFGYSxDQUVnQzs7QUFDN0MvRSxJQUFBQSxJQUFJLENBQUNwQyxhQUFMLEdBQXFCdkIsUUFBUSxDQUFDdUIsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NvQyxJQUFBQSxJQUFJLENBQUN5RSxnQkFBTCxHQUF3QnBJLFFBQVEsQ0FBQ29JLGdCQUFqQyxDQUphLENBSXNDOztBQUNuRHpFLElBQUFBLElBQUksQ0FBQzJFLGVBQUwsR0FBdUJ0SSxRQUFRLENBQUNzSSxlQUFoQyxDQUxhLENBS29DOztBQUNqRDNFLElBQUFBLElBQUksQ0FBQ2xCLFVBQUw7QUFDSDtBQTdXWSxDQUFqQjtBQWdYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBdkMsQ0FBQyxDQUFDeUksRUFBRixDQUFLZixJQUFMLENBQVVTLFFBQVYsQ0FBbUIzRyxLQUFuQixDQUF5QmtILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVE3SSxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBdUQsRUFBdkQsSUFBNkRvRixLQUFLLENBQUNwRixNQUFOLEdBQWUsQ0FBcEY7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQXZELENBQUMsQ0FBQzRJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIvSSxFQUFBQSxRQUFRLENBQUN5QyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgICRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcuZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvIC5jb25maWRlbnRpYWwtZmllbGQnKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlLWJ1dHRvbicpLFxuICAgICRzYXZlS2V5QnV0dG9uOiAkKCcjc2F2ZS1saWNlbnNlLWtleS1idXR0b24nKSxcbiAgICAkYWN0aXZhdGVDb3Vwb25CdXR0b246ICQoJyNjb3Vwb24tYWN0aXZhdGlvbi1idXR0b24nKSxcbiAgICAkbWFuYWdlS2V5QnV0dG9uOiAkKCcjbWFuYWdlLWxpY2Vuc2UtYnV0dG9uJyksXG5cbiAgICAkcmVzZXRDb25maXJtTW9kYWw6ICQoJyNyZXNldC1saWNlbnNlLWNvbmZpcm0tbW9kYWwnKSxcbiAgICAkY29uZmlybVJlc2V0QnV0dG9uOiAkKCcjY29uZmlybS1yZXNldC1saWNlbnNlLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbmZpcm1hdGlvbiBtb2RhbFxuICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgY291cG9uIGNvZGUgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzYXZlIGtleSBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHJlc2V0IGJ1dHRvbiBjbGljayBoYW5kbGVyXG4gICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvbmZpcm0gcmVzZXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGtleUNoZWNrLmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuICAgICAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBhY3RpdmF0ZSBjb3Vwb24gYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCAmJmtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlci5odG1sKGdsb2JhbFBCWExpY2Vuc2UpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJG1hbmFnZUtleUJ1dHRvbi5hdHRyKCdocmVmJyxDb25maWcua2V5TWFuYWdlbWVudFVybCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmVzZXR0aW5nIHRoZSBsaWNlbnNlIGtleS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIGxpY2Vuc2Uga2V5IHJlc2V0LlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIGFuZCBkaXNhYmxlZCBjbGFzc2VzXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgaW5jb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGxpY2Vuc2Uga2V5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPLScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFRoZSBsaWNlbnNlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcbiAgICAgICAgJCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcbiAgICAgICAgJCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuICAgICAgICAkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcbiAgICAgICAgbGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuICAgICAgICAgICAgcHJvZHVjdHMgPSBbXTtcbiAgICAgICAgICAgIHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuZW1wdHkoKTtcbiAgICAgICAgJC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuICAgICAgICAgICAgbGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcbiAgICAgICAgICAgICAgICBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGlyZWRUZXh0ID0gaTE4bignbGljX0V4cGlyZWRBZnRlcicsIHtleHBpcmVkOiBwcm9kdWN0LmV4cGlyZWR9KTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JztcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlSW5mbyA9IGkxOG4oJ2xpY19GZWF0dXJlSW5mbycsIHtuYW1lOiBmZWF0dXJlLm5hbWUsIGNvdW50OiBmZWF0dXJlLmNvdW50LCBjb3VudGVhY2g6IGZlYXR1cmUuY291bnRlYWNoLCBjYXB0dXJlZDogZmVhdHVyZS5jYXB0dXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgY2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgUGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGtleUNoZWNrLmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGtleUNoZWNrLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGtleUNoZWNrLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBrZXlDaGVjay5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0ga2V5Q2hlY2suY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjAgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==