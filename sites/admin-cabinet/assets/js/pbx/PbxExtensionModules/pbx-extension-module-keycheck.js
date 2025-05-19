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
    keyCheck.$formObj.removeClass('loading');
    keyCheck.$saveKeyButton.removeClass('loading disabled');
    keyCheck.$activateCouponButton.removeClass('loading disabled');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwiJHJlc2V0Q29uZmlybU1vZGFsIiwiJGNvbmZpcm1SZXNldEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiUGJ4QXBpIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsImNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkiLCJpbml0aWFsaXplRm9ybSIsImdsb2JhbFBCWExpY2Vuc2UiLCJodG1sIiwic2hvdyIsImF0dHIiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2JBZnRlckdldExpY2Vuc2VJbmZvIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJmb3JtIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImxpY2Vuc2UiLCJzaG93TGljZW5zZUVycm9yIiwibGljX0dlbmVyYWxFcnJvciIsImRhdGFDaGFuZ2VkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9ybURhdGEiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5IiwidmFsdWUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTEU7QUFPYkMsRUFBQUEsb0JBQW9CLEVBQUVELENBQUMsQ0FBQyx5QkFBRCxDQVBWO0FBUWJFLEVBQUFBLHVCQUF1QixFQUFFRixDQUFDLENBQUMsNEJBQUQsQ0FSYjtBQVNiRyxFQUFBQSxxQkFBcUIsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBVFg7QUFVYkksRUFBQUEsNEJBQTRCLEVBQUVKLENBQUMsQ0FBQyw4Q0FBRCxDQVZsQjtBQVdiSyxFQUFBQSx3QkFBd0IsRUFBRUwsQ0FBQyxDQUFDLDBCQUFELENBWGQ7QUFZYk0sRUFBQUEsY0FBYyxFQUFFTixDQUFDLENBQUMsZ0JBQUQsQ0FaSjtBQWFiTyxFQUFBQSxrQkFBa0IsRUFBRVAsQ0FBQyxDQUFDLHNCQUFELENBYlI7QUFjYlEsRUFBQUEsT0FBTyxFQUFFUixDQUFDLENBQUMsU0FBRCxDQWRHO0FBZWJTLEVBQUFBLE9BQU8sRUFBRVQsQ0FBQyxDQUFDLFNBQUQsQ0FmRztBQWdCYlUsRUFBQUEsTUFBTSxF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TCxhQUFjQyxhQUFkLG9CQUZhLENBRWdDOztBQUM3Qy9FLElBQUFBLElBQUksQ0FBQ3BDLGFBQUwsR0FBcUJ2QixRQUFRLENBQUN1QixhQUE5QixDQUhhLENBR2dDOztBQUM3Q29DLElBQUFBLElBQUksQ0FBQ3lFLGdCQUFMLEdBQXdCcEksUUFBUSxDQUFDb0ksZ0JBQWpDLENBSmEsQ0FJc0M7O0FBQ25EekUsSUFBQUEsSUFBSSxDQUFDMkUsZUFBTCxHQUF1QnRJLFFBQVEsQ0FBQ3NJLGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pEM0UsSUFBQUEsSUFBSSxDQUFDbEIsVUFBTDtBQUNIO0FBN1dZLENBQWpCO0FBZ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0F2QyxDQUFDLENBQUN5SSxFQUFGLENBQUtmLElBQUwsQ0FBVVMsUUFBVixDQUFtQjNHLEtBQW5CLENBQXlCa0gsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDcEUsU0FBUTdJLFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDUyxNQUE1QyxLQUF1RCxFQUF2RCxJQUE2RG9GLEtBQUssQ0FBQ3BGLE1BQU4sR0FBZSxDQUFwRjtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBdkQsQ0FBQyxDQUFDNEksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9JLEVBQUFBLFFBQVEsQ0FBQ3lDLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIFVzZXJNZXNzYWdlKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbW9kdWxlcyBsaWNlbnNlIGtleVxuICpcbiAqIEBtb2R1bGUga2V5Q2hlY2tcbiAqL1xuY29uc3Qga2V5Q2hlY2sgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaGVhZGVyJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8gLmNvbmZpZGVudGlhbC1maWVsZCcpLFxuICAgICRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG4gICAgJGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuICAgICRsaWNLZXk6ICQoJyNsaWNLZXknKSxcbiAgICAkY291cG9uOiAkKCcjY291cG9uJyksXG4gICAgJGVtYWlsOiAkKCcjZW1haWwnKSxcbiAgICAkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcbiAgICAkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgICRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UtYnV0dG9uJyksXG4gICAgJHNhdmVLZXlCdXR0b246ICQoJyNzYXZlLWxpY2Vuc2Uta2V5LWJ1dHRvbicpLFxuICAgICRhY3RpdmF0ZUNvdXBvbkJ1dHRvbjogJCgnI2NvdXBvbi1hY3RpdmF0aW9uLWJ1dHRvbicpLFxuICAgICRtYW5hZ2VLZXlCdXR0b246ICQoJyNtYW5hZ2UtbGljZW5zZS1idXR0b24nKSxcblxuICAgICRyZXNldENvbmZpcm1Nb2RhbDogJCgnI3Jlc2V0LWxpY2Vuc2UtY29uZmlybS1tb2RhbCcpLFxuICAgICRjb25maXJtUmVzZXRCdXR0b246ICQoJyNjb25maXJtLXJlc2V0LWxpY2Vuc2UtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNhdmUga2V5IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgcmVzZXQgYnV0dG9uIGNsaWNrIGhhbmRsZXJcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY29uZmlybSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkoa2V5Q2hlY2suY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGFjdGl2YXRlIGNvdXBvbiBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwICYma2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGEgbGljZW5zZSBrZXkgaXMgcHJlc2VudFxuICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyLmh0bWwoZ2xvYmFsUEJYTGljZW5zZSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uLmF0dHIoJ2hyZWYnLENvbmZpZy5rZXlNYW5hZ2VtZW50VXJsKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXNcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjApIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5lbXB0eSgpO1xuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBpMThuKCdsaWNfRXhwaXJlZEFmdGVyJywge2V4cGlyZWQ6IHByb2R1Y3QuZXhwaXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gaTE4bignbGljX0ZlYXR1cmVJbmZvJywge25hbWU6IGZlYXR1cmUubmFtZSwgY291bnQ6IGZlYXR1cmUuY291bnQsIGNvdW50ZWFjaDogZmVhdHVyZS5jb3VudGVhY2gsIGNhcHR1cmVkOiBmZWF0dXJlLmNhcHR1cmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cgKz0gJzwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwga2V5Q2hlY2suY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0ga2V5Q2hlY2suJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgZmllbGQgaXMgZW1wdHkgb25seSBpZiB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgbm90IGVtcHR5LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmaWVsZCBiZWluZyB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBmaWVsZCBpcyBub3QgZW1wdHkgb3IgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIGVtcHR5LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoID09PSAyMCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbGljZW5zaW5nIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG59KTtcblxuIl19