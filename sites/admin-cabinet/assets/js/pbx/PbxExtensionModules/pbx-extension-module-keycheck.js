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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense, UserMessage, LicenseAPI*/

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
      LicenseAPI.resetKey(keyCheck.cbAfterResetLicenseKey);
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
   * @param {Object} response - The response indicating the success of the license key reset.
   * @param {boolean} isSuccessful - Whether the request was successful
   */
  cbAfterResetLicenseKey: function cbAfterResetLicenseKey(response, isSuccessful) {
    // Remove the loading and disabled classes
    keyCheck.$formObj.removeClass('loading disabled');
    keyCheck.$confirmResetButton.removeClass('loading disabled');

    if (isSuccessful && response !== false) {
      window.location.reload();
    }
  },

  /**
   * Callback function triggered after retrieving the license information.
   * @param {Object} response - The response containing the license information.
   * @param {boolean} isSuccessful - Whether the request was successful
   */
  cbAfterGetLicenseInfo: function cbAfterGetLicenseInfo(response, isSuccessful) {
    if (isSuccessful && response.data.licenseInfo !== undefined) {
      // License information is available
      keyCheck.showLicenseInfo(response.data.licenseInfo);
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
    LicenseAPI.processUserRequest(formData, keyCheck.cbAfterFormProcessing);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwiJHJlc2V0Q29uZmlybU1vZGFsIiwiJGNvbmZpcm1SZXNldEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiZ2xvYmFsUEJYTGljZW5zZSIsImh0bWwiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsImlzU3VjY2Vzc2Z1bCIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJkYXRhIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiUEJYTGljZW5zZSIsImZvcm0iLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJsaWNfR2VuZXJhbEVycm9yIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsInByb2Nlc3NVc2VyUmVxdWVzdCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxFO0FBT2JDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQVjtBQVFiRSxFQUFBQSx1QkFBdUIsRUFBRUYsQ0FBQyxDQUFDLDRCQUFELENBUmI7QUFTYkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRYO0FBVWJJLEVBQUFBLDRCQUE0QixFQUFFSixDQUFDLENBQUMsOENBQUQsQ0FWbEI7QUFXYkssRUFBQUEsd0JBQXdCLEVBQUVMLENBQUMsQ0FBQywwQkFBRCxDQVhkO0FBWWJNLEVBQUFBLGNBQWMsRUFBRU4sQ0FBQyxDQUFDLGdCQUFELENBWko7QUFhYk8sRUFBQUEsa0JBQWtCLEVBQUVQLENBQUMsQ0FBQyxzQkFBRCxDQWJSO0FBY2JRLEVBQUFBLE9BQU8sRUFBRVIsQ0FBQyxDQUFDLFNBQUQsQ0FkRztBQWViUyxFQUFBQSxPQUFPLEVBQUVULENBQUMsQ0FBQyxTQUFELENBZkc7QUFnQmJVLEVBQUFBLE1BQU0sRUFB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O0FBQ2JOLElBQUFBLElBQUksQ0FBQzFELFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQTBELElBQUFBLElBQUksQ0FBQytFLEdBQUwsYUFBY0MsYUFBZCxvQkFGYSxDQUVnQzs7QUFDN0NoRixJQUFBQSxJQUFJLENBQUNwQyxhQUFMLEdBQXFCdkIsUUFBUSxDQUFDdUIsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NvQyxJQUFBQSxJQUFJLENBQUMwRSxnQkFBTCxHQUF3QnJJLFFBQVEsQ0FBQ3FJLGdCQUFqQyxDQUphLENBSXNDOztBQUNuRDFFLElBQUFBLElBQUksQ0FBQzRFLGVBQUwsR0FBdUJ2SSxRQUFRLENBQUN1SSxlQUFoQyxDQUxhLENBS29DOztBQUNqRDVFLElBQUFBLElBQUksQ0FBQ2xCLFVBQUw7QUFDSDtBQS9XWSxDQUFqQjtBQWtYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBdkMsQ0FBQyxDQUFDMEksRUFBRixDQUFLZixJQUFMLENBQVVTLFFBQVYsQ0FBbUI1RyxLQUFuQixDQUF5Qm1ILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVE5SSxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBdUQsRUFBdkQsSUFBNkRxRixLQUFLLENBQUNyRixNQUFOLEdBQWUsQ0FBcEY7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQXZELENBQUMsQ0FBQzZJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoSixFQUFBQSxRQUFRLENBQUN5QyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSwgTGljZW5zZUFQSSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgICRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcuZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvIC5jb25maWRlbnRpYWwtZmllbGQnKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlLWJ1dHRvbicpLFxuICAgICRzYXZlS2V5QnV0dG9uOiAkKCcjc2F2ZS1saWNlbnNlLWtleS1idXR0b24nKSxcbiAgICAkYWN0aXZhdGVDb3Vwb25CdXR0b246ICQoJyNjb3Vwb24tYWN0aXZhdGlvbi1idXR0b24nKSxcbiAgICAkbWFuYWdlS2V5QnV0dG9uOiAkKCcjbWFuYWdlLWxpY2Vuc2UtYnV0dG9uJyksXG5cbiAgICAkcmVzZXRDb25maXJtTW9kYWw6ICQoJyNyZXNldC1saWNlbnNlLWNvbmZpcm0tbW9kYWwnKSxcbiAgICAkY29uZmlybVJlc2V0QnV0dG9uOiAkKCcjY29uZmlybS1yZXNldC1saWNlbnNlLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbmZpcm1hdGlvbiBtb2RhbFxuICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgY291cG9uIGNvZGUgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzYXZlIGtleSBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHJlc2V0IGJ1dHRvbiBjbGljayBoYW5kbGVyXG4gICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvbmZpcm0gcmVzZXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIExpY2Vuc2VBUEkucmVzZXRLZXkoa2V5Q2hlY2suY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGFjdGl2YXRlIGNvdXBvbiBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwICYma2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGEgbGljZW5zZSBrZXkgaXMgcHJlc2VudFxuICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyLmh0bWwoZ2xvYmFsUEJYTGljZW5zZSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uLmF0dHIoJ2hyZWYnLENvbmZpZy5rZXlNYW5hZ2VtZW50VXJsKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBsaWNlbnNlIGtleSByZXNldC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzU3VjY2Vzc2Z1bCAtIFdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlLCBpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIGFuZCBkaXNhYmxlZCBjbGFzc2VzXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKGlzU3VjY2Vzc2Z1bCAmJiByZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzU3VjY2Vzc2Z1bCAtIFdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UsIGlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICBpZiAoaXNTdWNjZXNzZnVsICYmIHJlc3BvbnNlLmRhdGEubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5kYXRhLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjApIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5lbXB0eSgpO1xuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBpMThuKCdsaWNfRXhwaXJlZEFmdGVyJywge2V4cGlyZWQ6IHByb2R1Y3QuZXhwaXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gaTE4bignbGljX0ZlYXR1cmVJbmZvJywge25hbWU6IGZlYXR1cmUubmFtZSwgY291bnQ6IGZlYXR1cmUuY291bnQsIGNvdW50ZWFjaDogZmVhdHVyZS5jb3VudGVhY2gsIGNhcHR1cmVkOiBmZWF0dXJlLmNhcHR1cmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cgKz0gJzwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBMaWNlbnNlQVBJLnByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwga2V5Q2hlY2suY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0ga2V5Q2hlY2suJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgZmllbGQgaXMgZW1wdHkgb25seSBpZiB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgbm90IGVtcHR5LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmaWVsZCBiZWluZyB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBmaWVsZCBpcyBub3QgZW1wdHkgb3IgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIGVtcHR5LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoID09PSAyMCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbGljZW5zaW5nIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG59KTtcblxuIl19