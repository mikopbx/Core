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
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Get form values for API

    result.data = keyCheck.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    keyCheck.$formObj.removeClass('loading');
    keyCheck.$saveKeyButton.removeClass('loading disabled');
    keyCheck.$activateCouponButton.removeClass('loading disabled');

    if (response.result === true) {
      if (typeof response.data.PBXLicense !== 'undefined') {
        globalPBXLicense = response.data.PBXLicense;
        keyCheck.$formObj.form('set value', 'licKey', response.data.PBXLicense);
      }

      $('#productDetails tbody').html('');
      keyCheck.$formObj.form('set value', 'coupon', '');
      keyCheck.initialize();

      if (response.messages && response.messages.length !== 0) {
        UserMessage.showMultiString(response.messages);
      }
    } else if (response.messages && response.messages.license !== undefined) {
      UserMessage.showLicenseError(globalTranslate.lic_GeneralError, response.messages.license);
    } else {
      UserMessage.showMultiString(response.messages, globalTranslate.lic_GeneralError);
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = keyCheck.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = keyCheck.validateRules; // Form validation rules

    Form.cbBeforeSendForm = keyCheck.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = keyCheck.cbAfterSendForm; // Callback after form is sent
    // Configure REST API settings (modern pattern)

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = LicenseAPI;
    Form.apiSettings.saveMethod = 'processUserRequest';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwiJHJlc2V0Q29uZmlybU1vZGFsIiwiJGNvbmZpcm1SZXNldEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiZ2xvYmFsUEJYTGljZW5zZSIsImh0bWwiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsImlzU3VjY2Vzc2Z1bCIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJkYXRhIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiUEJYTGljZW5zZSIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19HZW5lcmFsRXJyb3IiLCJkYXRhQ2hhbmdlZCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxFO0FBT2JDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQVjtBQVFiRSxFQUFBQSx1QkFBdUIsRUFBRUYsQ0FBQyxDQUFDLDRCQUFELENBUmI7QUFTYkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRYO0FBVWJJLEVBQUFBLDRCQUE0QixFQUFFSixDQUFDLENBQUMsOENBQUQsQ0FWbEI7QUFXYkssRUFBQUEsd0JBQXdCLEVBQUVMLENBQUMsQ0FBQywwQkFBRCxDQVhkO0FBWWJNLEVBQUFBLGNBQWMsRUFBRU4sQ0FBQyxDQUFDLGdCQUFELENBWko7QUFhYk8sRUFBQUEsa0JBQWtCLEVBQUVQLENBQUMsQ0FBQyxzQkFBRCxDQWJSO0FBY2JRLEVBQUFBLE9BQU8sRUFBRVIsQ0FBQyxDQUFDLFNBQUQsQ0FkRztBQWViUyxFQUFBQSxPQUFPLEVBQUVULENBQUMsQ0FBQyxTQUFELENBZkc7QUFnQmJVLEVBQUFBLE1BQU0sRUFBRVYsQ0FBQyxDQUFDLFFBQUQsQ0FoQkk7QUFpQmJXLEVBQUFBLGFBQWEsRUFBRVgsQ0FBQyxDQUFDLGtCQUFELENBakJIO0FBa0JiWSxFQUFBQSxrQkFBa0IsRUFBRVosQ0FBQyxDQUFDLG9CQUFELENBbEJSO0FBbUJiYSxFQUFBQSxlQUFlLEVBQUViLENBQUMsQ0FBQyxpQkFBRCxDQW5CTDtBQW9CYmMsRUFBQUEsV0FBVyxFQUFFZCxDQUFDLENBQUMsc0NBQUQsQ0FwQkQ7QUFzQmJlLEVBQUFBLFlBQVksRUFBRWYsQ0FBQyxDQUFDLHVCQUFELENBdEJGO0FBdUJiZ0IsRUFBQUEsY0FBYyxFQUFFaEIsQ0FBQyxDQUFDLDBCQUFELENBdkJKO0FBd0JiaUIsRUFBQUEscUJBQXFCLEVBQUVqQixDQUFDLENBQUMsMkJBQUQsQ0F4Qlg7QUF5QmJrQixFQUFBQSxnQkFBZ0IsRUFBRWxCLENBQUMsQ0FBQyx3QkFBRCxDQXpCTjtBQTJCYm1CLEVBQUFBLGtCQUFrQixFQUFFbkIsQ0FBQyxDQUFDLDhCQUFELENBM0JSO0FBNEJib0IsRUFBQUEsbUJBQW1CLEVBQUVwQixDQUFDLENBQUMsK0JBQUQsQ0E1QlQ7O0FBOEJiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXFCLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxXQUFXLEVBQUU7QUFDVEMsTUFBQUEsVUFBVSxFQUFFLGFBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLDZCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkUsS0FERjtBQVVYQyxJQUFBQSxLQUFLLEVBQUU7QUFDSE4sTUFBQUEsVUFBVSxFQUFFLE9BRFQ7QUFFSEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLDZCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUY1QixPQURHO0FBRkosS0FWSTtBQW1CWEMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xSLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSw2QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0s7QUFGNUIsT0FERztBQUZGLEtBbkJFO0FBNEJYQyxJQUFBQSxNQUFNLEVBQUU7QUFDSlYsTUFBQUEsVUFBVSxFQUFFLFFBRFI7QUFFSlcsTUFBQUEsUUFBUSxFQUFFLElBRk47QUFHSlYsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDUTtBQUY1QixPQURHO0FBSEgsS0E1Qkc7QUFzQ1hDLElBQUFBLE1BQU0sRUFBRTtBQUNKQyxNQUFBQSxPQUFPLEVBQUUsUUFETDtBQUVKZCxNQUFBQSxVQUFVLEVBQUUsUUFGUjtBQUdKVyxNQUFBQSxRQUFRLEVBQUUsSUFITjtBQUlKVixNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsaUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNXO0FBRjVCLE9BREc7QUFKSDtBQXRDRyxHQW5DRjtBQXNGYjtBQUNBQyxFQUFBQSxVQXZGYSx3QkF1RkE7QUFDVHpDLElBQUFBLFFBQVEsQ0FBQ2dCLFdBQVQsQ0FBcUIwQixTQUFyQjtBQUNBMUMsSUFBQUEsUUFBUSxDQUFDYyxrQkFBVCxDQUE0QjZCLElBQTVCLEdBRlMsQ0FJVDs7QUFDQTNDLElBQUFBLFFBQVEsQ0FBQ3FCLGtCQUFULENBQTRCdUIsS0FBNUIsQ0FBa0M7QUFDOUJDLE1BQUFBLFFBQVEsRUFBRSxLQURvQjtBQUU5QkMsTUFBQUEsTUFBTSxFQUFFLGtCQUFNO0FBQ1YsZUFBTyxJQUFQO0FBQ0gsT0FKNkI7QUFLOUJDLE1BQUFBLFNBQVMsRUFBRSxxQkFBTTtBQUNiLGVBQU8sS0FBUDtBQUNIO0FBUDZCLEtBQWxDLEVBTFMsQ0FlVDs7QUFDQS9DLElBQUFBLFFBQVEsQ0FBQ1csT0FBVCxDQUFpQnFDLFNBQWpCLENBQTJCLGlDQUEzQixFQUE4RDtBQUMxREMsTUFBQUEsYUFBYSxFQUFFakQsUUFBUSxDQUFDa0Q7QUFEa0MsS0FBOUQsRUFoQlMsQ0FvQlQ7O0FBQ0FsRCxJQUFBQSxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQiw4QkFBM0IsRUFBMkQ7QUFDdkRHLE1BQUFBLFVBQVUsRUFBRW5ELFFBQVEsQ0FBQ29ELHlCQURrQztBQUV2REMsTUFBQUEsWUFBWSxFQUFFckQsUUFBUSxDQUFDb0QseUJBRmdDO0FBR3ZERSxNQUFBQSxlQUFlLEVBQUUsSUFIc0M7QUFJdkRMLE1BQUFBLGFBQWEsRUFBRWpELFFBQVEsQ0FBQ3VEO0FBSitCLEtBQTNEO0FBT0F2RCxJQUFBQSxRQUFRLENBQUNZLE1BQVQsQ0FBZ0JvQyxTQUFoQixDQUEwQixPQUExQixFQTVCUyxDQThCVDs7QUFDQWhELElBQUFBLFFBQVEsQ0FBQ2tCLGNBQVQsQ0FBd0JzQyxFQUF4QixDQUEyQixPQUEzQixFQUFvQyxZQUFNO0FBQ3RDLFVBQUl4RCxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBcUQsRUFBekQsRUFBNEQ7QUFDeER6RCxRQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J5RCxRQUFsQixDQUEyQixrQkFBM0I7QUFDQTFELFFBQUFBLFFBQVEsQ0FBQ2tCLGNBQVQsQ0FBd0J3QyxRQUF4QixDQUFpQyxrQkFBakM7QUFDQUMsUUFBQUEsSUFBSSxDQUFDQyxVQUFMO0FBQ0gsT0FKRCxNQUlPO0FBQ0g1RCxRQUFBQSxRQUFRLENBQUNrQixjQUFULENBQXdCMkMsVUFBeEIsQ0FBbUMsT0FBbkM7QUFDSDtBQUNKLEtBUkQsRUEvQlMsQ0F5Q1Q7O0FBQ0E3RCxJQUFBQSxRQUFRLENBQUNpQixZQUFULENBQXNCdUMsRUFBdEIsQ0FBeUIsT0FBekIsRUFBa0MsWUFBTTtBQUNwQ3hELE1BQUFBLFFBQVEsQ0FBQ3FCLGtCQUFULENBQTRCdUIsS0FBNUIsQ0FBa0MsTUFBbEM7QUFDSCxLQUZELEVBMUNTLENBOENUOztBQUNBNUMsSUFBQUEsUUFBUSxDQUFDc0IsbUJBQVQsQ0FBNkJrQyxFQUE3QixDQUFnQyxPQUFoQyxFQUF5QyxZQUFNO0FBQzNDeEQsTUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCeUQsUUFBbEIsQ0FBMkIsa0JBQTNCO0FBQ0ExRCxNQUFBQSxRQUFRLENBQUNzQixtQkFBVCxDQUE2Qm9DLFFBQTdCLENBQXNDLGtCQUF0QztBQUNBSSxNQUFBQSxVQUFVLENBQUNDLFFBQVgsQ0FBb0IvRCxRQUFRLENBQUNnRSxzQkFBN0I7QUFDQWhFLE1BQUFBLFFBQVEsQ0FBQ3FCLGtCQUFULENBQTRCdUIsS0FBNUIsQ0FBa0MsTUFBbEM7QUFDSCxLQUxELEVBL0NTLENBc0RUOztBQUNBNUMsSUFBQUEsUUFBUSxDQUFDbUIscUJBQVQsQ0FBK0JxQyxFQUEvQixDQUFrQyxPQUFsQyxFQUEyQyxZQUFNO0FBQzdDLFVBQUl4RCxRQUFRLENBQUNXLE9BQVQsQ0FBaUJxQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBcUQsRUFBckQsSUFBMER6RCxRQUFRLENBQUNVLE9BQVQsQ0FBaUJzQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBcUQsRUFBbkgsRUFBc0g7QUFDbEh6RCxRQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J5RCxRQUFsQixDQUEyQixrQkFBM0I7QUFDQTFELFFBQUFBLFFBQVEsQ0FBQ21CLHFCQUFULENBQStCdUMsUUFBL0IsQ0FBd0Msa0JBQXhDO0FBQ0FDLFFBQUFBLElBQUksQ0FBQ0MsVUFBTDtBQUNILE9BSkQsTUFJTztBQUNINUQsUUFBQUEsUUFBUSxDQUFDbUIscUJBQVQsQ0FBK0IwQyxVQUEvQixDQUEwQyxPQUExQztBQUNIO0FBQ0osS0FSRDtBQVVBN0QsSUFBQUEsUUFBUSxDQUFDb0QseUJBQVQ7QUFFQXBELElBQUFBLFFBQVEsQ0FBQ2lFLGNBQVQsR0FuRVMsQ0FxRVQ7O0FBQ0EsUUFBSUMsZ0JBQWdCLENBQUNULE1BQWpCLEtBQTRCLEVBQWhDLEVBQW9DO0FBQ2hDekQsTUFBQUEsUUFBUSxDQUFDTSw0QkFBVCxDQUFzQzZELElBQXRDLENBQTJDRCxnQkFBM0M7QUFDQWxFLE1BQUFBLFFBQVEsQ0FBQ0ksdUJBQVQsQ0FBaUNnRSxJQUFqQztBQUNBcEUsTUFBQUEsUUFBUSxDQUFDb0IsZ0JBQVQsQ0FBMEJpRCxJQUExQixDQUErQixNQUEvQixFQUFzQ0MsTUFBTSxDQUFDQyxnQkFBN0M7QUFDQXZFLE1BQUFBLFFBQVEsQ0FBQ0csb0JBQVQsQ0FBOEJ3QyxJQUE5QjtBQUNBM0MsTUFBQUEsUUFBUSxDQUFDSyxxQkFBVCxDQUErQitELElBQS9CO0FBQ0gsS0FORCxNQU1PO0FBQ0hwRSxNQUFBQSxRQUFRLENBQUNJLHVCQUFULENBQWlDdUMsSUFBakM7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ0sscUJBQVQsQ0FBK0JzQyxJQUEvQjtBQUNBM0MsTUFBQUEsUUFBUSxDQUFDRyxvQkFBVCxDQUE4QmlFLElBQTlCO0FBQ0g7QUFDSixHQXhLWTs7QUEwS2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxzQkEvS2Esa0NBK0tVUSxRQS9LVixFQStLb0JDLFlBL0twQixFQStLa0M7QUFDM0M7QUFDQXpFLElBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQnlFLFdBQWxCLENBQThCLGtCQUE5QjtBQUNBMUUsSUFBQUEsUUFBUSxDQUFDc0IsbUJBQVQsQ0FBNkJvRCxXQUE3QixDQUF5QyxrQkFBekM7O0FBQ0EsUUFBSUQsWUFBWSxJQUFJRCxRQUFRLEtBQUssS0FBakMsRUFBd0M7QUFDcENHLE1BQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEI7QUFDSDtBQUNKLEdBdExZOztBQXdMYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQTdMYSxpQ0E2TFNOLFFBN0xULEVBNkxtQkMsWUE3TG5CLEVBNkxpQztBQUMxQyxRQUFJQSxZQUFZLElBQUlELFFBQVEsQ0FBQ08sSUFBVCxDQUFjQyxXQUFkLEtBQThCQyxTQUFsRCxFQUE2RDtBQUN6RDtBQUNBakYsTUFBQUEsUUFBUSxDQUFDa0YsZUFBVCxDQUF5QlYsUUFBUSxDQUFDTyxJQUFULENBQWNDLFdBQXZDO0FBQ0FoRixNQUFBQSxRQUFRLENBQUNjLGtCQUFULENBQTRCc0QsSUFBNUI7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBcEUsTUFBQUEsUUFBUSxDQUFDYyxrQkFBVCxDQUE0QjZCLElBQTVCO0FBQ0g7QUFDSixHQXRNWTs7QUF3TWI7QUFDSjtBQUNBO0FBQ0lTLEVBQUFBLHlCQTNNYSx1Q0EyTWU7QUFDeEIsUUFBSXBELFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDUyxNQUE1QyxLQUF1RCxFQUEzRCxFQUErRDtBQUMzRDtBQUNBekQsTUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCa0YsSUFBbEIsQ0FBdUIsZ0JBQXZCLEVBQXlDQyxJQUF6QyxDQUE4QyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMURwRixRQUFBQSxDQUFDLENBQUNvRixHQUFELENBQUQsQ0FBT2pCLElBQVAsQ0FBWSxRQUFaLEVBQXNCLEVBQXRCO0FBQ0gsT0FGRDtBQUdBckUsTUFBQUEsUUFBUSxDQUFDTyx3QkFBVCxDQUFrQ29DLElBQWxDO0FBQ0EzQyxNQUFBQSxRQUFRLENBQUNRLGNBQVQsQ0FBd0I0RCxJQUF4QjtBQUNBcEUsTUFBQUEsUUFBUSxDQUFDUyxrQkFBVCxDQUE0QjhFLEtBQTVCO0FBQ0gsS0FSRCxNQVFPO0FBQ0g7QUFDQXZGLE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQmtGLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Q0MsSUFBekMsQ0FBOEMsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQzFEcEYsUUFBQUEsQ0FBQyxDQUFDb0YsR0FBRCxDQUFELENBQU9FLFVBQVAsQ0FBa0IsUUFBbEI7QUFDSCxPQUZEO0FBR0F4RixNQUFBQSxRQUFRLENBQUNPLHdCQUFULENBQWtDNkQsSUFBbEM7QUFDQXBFLE1BQUFBLFFBQVEsQ0FBQ1EsY0FBVCxDQUF3Qm1DLElBQXhCO0FBQ0g7QUFDSixHQTVOWTs7QUE4TmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJWSxFQUFBQSx5QkFuT2EscUNBbU9ha0MsV0FuT2IsRUFtTzBCO0FBQ25DLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixPQUFwQixNQUFpQyxDQUFDLENBQXRDLEVBQXlDO0FBQ3JDMUYsTUFBQUEsUUFBUSxDQUFDVSxPQUFULENBQWlCbUQsVUFBakIsQ0FBNEIsT0FBNUI7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPNEIsV0FBVyxDQUFDRSxPQUFaLENBQW9CLE1BQXBCLEVBQTRCLEVBQTVCLENBQVA7QUFDSCxHQXpPWTs7QUEyT2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJekMsRUFBQUEscUJBaFBhLGlDQWdQU3VDLFdBaFBULEVBZ1BzQjtBQUMvQixRQUFJQSxXQUFXLENBQUNDLE9BQVosQ0FBb0IsVUFBcEIsTUFBb0MsQ0FBQyxDQUF6QyxFQUE0QztBQUN4QzFGLE1BQUFBLFFBQVEsQ0FBQ1csT0FBVCxDQUFpQmtELFVBQWpCLENBQTRCLE9BQTVCO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBQ0QsV0FBTzRCLFdBQVcsQ0FBQ0UsT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFQO0FBQ0gsR0F0UFk7O0FBd1BiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLGVBNVBhLDJCQTRQR1UsT0E1UEgsRUE0UFk7QUFDckIsUUFBTUMsV0FBVyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsT0FBWCxDQUFwQjs7QUFDQSxRQUFJQyxXQUFXLENBQUMsYUFBRCxDQUFYLEtBQStCWixTQUFuQyxFQUE4QztBQUMxQztBQUNIOztBQUNEL0UsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0I4RixJQUF0QixDQUEyQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQnJFLFdBQXREO0FBQ0F0QixJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCOEYsSUFBbEIsQ0FBdUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkI1RCxPQUFsRDtBQUNBL0IsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQjhGLElBQWhCLENBQXFCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCOUQsS0FBaEQ7QUFDQTdCLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzhGLElBQWQsQ0FBbUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJJLEdBQTlDO0FBQ0EsUUFBSUMsUUFBUSxHQUFHTCxXQUFXLENBQUNNLE9BQTNCOztBQUNBLFFBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNILFFBQWQsQ0FBTCxFQUE4QjtBQUMxQkEsTUFBQUEsUUFBUSxHQUFHLEVBQVg7QUFDQUEsTUFBQUEsUUFBUSxDQUFDSSxJQUFULENBQWNULFdBQVcsQ0FBQ00sT0FBMUI7QUFDSDs7QUFDRGpHLElBQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCcUYsS0FBM0I7QUFDQXJGLElBQUFBLENBQUMsQ0FBQ2tGLElBQUYsQ0FBT2MsUUFBUCxFQUFpQixVQUFDSyxHQUFELEVBQU1DLFlBQU4sRUFBdUI7QUFDcEMsVUFBSUEsWUFBWSxLQUFLdkIsU0FBckIsRUFBZ0M7QUFDNUI7QUFDSDs7QUFDRCxVQUFJd0IsR0FBRyxHQUFHLFVBQVY7QUFDQSxVQUFJTixPQUFPLEdBQUdLLFlBQWQ7O0FBQ0EsVUFBSUwsT0FBTyxDQUFDLGFBQUQsQ0FBUCxLQUEyQmxCLFNBQS9CLEVBQTBDO0FBQ3RDa0IsUUFBQUEsT0FBTyxHQUFHSyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNELFVBQU1FLFdBQVcsR0FBRyxJQUFJQyxJQUFKLENBQVNSLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQmpCLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsVUFBTWtCLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFVBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUN2QkQsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ05qRixlQUFlLENBQUNrRixXQURWLGFBQUg7QUFFSCxPQUhELE1BR08sSUFBSVosT0FBTyxDQUFDUyxPQUFSLENBQWdCbkQsTUFBaEIsS0FBMkIsQ0FBM0IsSUFBZ0MwQyxPQUFPLENBQUNhLEtBQVIsS0FBa0IsR0FBdEQsRUFBMkQ7QUFDOURQLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNOakYsZUFBZSxDQUFDa0YsV0FEVixhQUFIO0FBRUgsT0FITSxNQUdBO0FBQ0hOLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELENBQUg7O0FBQ0EsWUFBSVgsT0FBTyxDQUFDUyxPQUFSLENBQWdCbkQsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUIsY0FBSXdELFdBQVcsR0FBR0MsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQUNOLFlBQUFBLE9BQU8sRUFBRVQsT0FBTyxDQUFDUztBQUFsQixXQUFyQixDQUF0QjtBQUNBSCxVQUFBQSxHQUFHLHlCQUFrQlEsV0FBbEIsYUFBSDtBQUNIOztBQUNEUixRQUFBQSxHQUFHLElBQUksNkJBQVA7QUFDQXZHLFFBQUFBLENBQUMsQ0FBQ2tGLElBQUYsQ0FBT29CLFlBQVksQ0FBQ1csT0FBcEIsRUFBNkIsVUFBQzlCLEtBQUQsRUFBUStCLFlBQVIsRUFBeUI7QUFFbEQsY0FBSUQsT0FBTyxHQUFHQyxZQUFkOztBQUNBLGNBQUlBLFlBQVksQ0FBQyxhQUFELENBQVosS0FBZ0NuQyxTQUFwQyxFQUErQztBQUMzQ2tDLFlBQUFBLE9BQU8sR0FBR0MsWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDSDs7QUFDRCxjQUFJQyxXQUFXLEdBQUdILElBQUksQ0FBQyxpQkFBRCxFQUFvQjtBQUFDSixZQUFBQSxJQUFJLEVBQUVLLE9BQU8sQ0FBQ0wsSUFBZjtBQUFxQlEsWUFBQUEsS0FBSyxFQUFFSCxPQUFPLENBQUNHLEtBQXBDO0FBQTJDQyxZQUFBQSxTQUFTLEVBQUVKLE9BQU8sQ0FBQ0ksU0FBOUQ7QUFBeUVDLFlBQUFBLFFBQVEsRUFBRUwsT0FBTyxDQUFDSztBQUEzRixXQUFwQixDQUF0QjtBQUNBZixVQUFBQSxHQUFHLGNBQU9ZLFdBQVAsU0FBSDtBQUNILFNBUkQ7QUFTQVosUUFBQUEsR0FBRyxJQUFJLFNBQVA7QUFDSDs7QUFDREEsTUFBQUEsR0FBRyxJQUFJLGtCQUFQO0FBQ0F2RyxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQnVILE1BQTNCLENBQWtDaEIsR0FBbEM7QUFDSCxLQXJDRDtBQXNDSCxHQWpUWTs7QUFtVGI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJaUIsRUFBQUEsZ0JBeFRhLDRCQXdUSUMsUUF4VEosRUF3VGM7QUFDdkIsUUFBTUMsTUFBTSxHQUFHRCxRQUFmLENBRHVCLENBRXZCOztBQUNBQyxJQUFBQSxNQUFNLENBQUM3QyxJQUFQLEdBQWMvRSxRQUFRLENBQUNDLFFBQVQsQ0FBa0I0SCxJQUFsQixDQUF1QixZQUF2QixDQUFkO0FBQ0EsV0FBT0QsTUFBUDtBQUNILEdBN1RZOztBQStUYjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxlQW5VYSwyQkFtVUd0RCxRQW5VSCxFQW1VYTtBQUN0QnhFLElBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQnlFLFdBQWxCLENBQThCLFNBQTlCO0FBQ0ExRSxJQUFBQSxRQUFRLENBQUNrQixjQUFULENBQXdCd0QsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0ExRSxJQUFBQSxRQUFRLENBQUNtQixxQkFBVCxDQUErQnVELFdBQS9CLENBQTJDLGtCQUEzQzs7QUFFQSxRQUFJRixRQUFRLENBQUNvRCxNQUFULEtBQW9CLElBQXhCLEVBQThCO0FBQzFCLFVBQUksT0FBT3BELFFBQVEsQ0FBQ08sSUFBVCxDQUFjZ0QsVUFBckIsS0FBb0MsV0FBeEMsRUFBcUQ7QUFDakQ3RCxRQUFBQSxnQkFBZ0IsR0FBR00sUUFBUSxDQUFDTyxJQUFULENBQWNnRCxVQUFqQztBQUNBL0gsUUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCNEgsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsUUFBcEMsRUFBOENyRCxRQUFRLENBQUNPLElBQVQsQ0FBY2dELFVBQTVEO0FBQ0g7O0FBQ0Q3SCxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQmlFLElBQTNCLENBQWdDLEVBQWhDO0FBRUFuRSxNQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0I0SCxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxRQUFwQyxFQUE4QyxFQUE5QztBQUVBN0gsTUFBQUEsUUFBUSxDQUFDeUMsVUFBVDs7QUFDQSxVQUFJK0IsUUFBUSxDQUFDd0QsUUFBVCxJQUFxQnhELFFBQVEsQ0FBQ3dELFFBQVQsQ0FBa0J2RSxNQUFsQixLQUE2QixDQUF0RCxFQUF5RDtBQUNyRHdFLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjFELFFBQVEsQ0FBQ3dELFFBQXJDO0FBQ0g7QUFDSixLQWJELE1BYU8sSUFBSXhELFFBQVEsQ0FBQ3dELFFBQVQsSUFBcUJ4RCxRQUFRLENBQUN3RCxRQUFULENBQWtCRyxPQUFsQixLQUE4QmxELFNBQXZELEVBQWlFO0FBQ3BFZ0QsTUFBQUEsV0FBVyxDQUFDRyxnQkFBWixDQUE2QnZHLGVBQWUsQ0FBQ3dHLGdCQUE3QyxFQUErRDdELFFBQVEsQ0FBQ3dELFFBQVQsQ0FBa0JHLE9BQWpGO0FBQ0gsS0FGTSxNQUVBO0FBQ0hGLE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjFELFFBQVEsQ0FBQ3dELFFBQXJDLEVBQStDbkcsZUFBZSxDQUFDd0csZ0JBQS9EO0FBQ0gsS0F0QnFCLENBd0J0Qjs7O0FBQ0ExRSxJQUFBQSxJQUFJLENBQUMyRSxXQUFMO0FBQ0gsR0E3Vlk7O0FBK1ZiO0FBQ0o7QUFDQTtBQUNJckUsRUFBQUEsY0FsV2EsNEJBa1dJO0FBQ2JOLElBQUFBLElBQUksQ0FBQzFELFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQTBELElBQUFBLElBQUksQ0FBQzRFLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEI1RSxJQUFBQSxJQUFJLENBQUNwQyxhQUFMLEdBQXFCdkIsUUFBUSxDQUFDdUIsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NvQyxJQUFBQSxJQUFJLENBQUMrRCxnQkFBTCxHQUF3QjFILFFBQVEsQ0FBQzBILGdCQUFqQyxDQUphLENBSXNDOztBQUNuRC9ELElBQUFBLElBQUksQ0FBQ21FLGVBQUwsR0FBdUI5SCxRQUFRLENBQUM4SCxlQUFoQyxDQUxhLENBS29DO0FBRWpEOztBQUNBbkUsSUFBQUEsSUFBSSxDQUFDNkUsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQTlFLElBQUFBLElBQUksQ0FBQzZFLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCNUUsVUFBN0I7QUFDQUgsSUFBQUEsSUFBSSxDQUFDNkUsV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsb0JBQTlCO0FBRUFoRixJQUFBQSxJQUFJLENBQUNsQixVQUFMO0FBQ0g7QUEvV1ksQ0FBakI7QUFrWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXZDLENBQUMsQ0FBQzBJLEVBQUYsQ0FBS2YsSUFBTCxDQUFVRixRQUFWLENBQW1CakcsS0FBbkIsQ0FBeUJtSCwyQkFBekIsR0FBdUQsVUFBVUMsS0FBVixFQUFpQjtBQUNwRSxTQUFROUksUUFBUSxDQUFDVSxPQUFULENBQWlCc0MsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENTLE1BQTVDLEtBQXVELEVBQXZELElBQTZEcUYsS0FBSyxDQUFDckYsTUFBTixHQUFlLENBQXBGO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0F2RCxDQUFDLENBQUM2SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEosRUFBQUEsUUFBUSxDQUFDeUMsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgVXNlck1lc3NhZ2UsIExpY2Vuc2VBUEkqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtb2R1bGVzIGxpY2Vuc2Uga2V5XG4gKlxuICogQG1vZHVsZSBrZXlDaGVja1xuICovXG5jb25zdCBrZXlDaGVjayA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnLmVtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUhlYWRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbyAuY29uZmlkZW50aWFsLWZpZWxkJyksXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcbiAgICAkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcbiAgICAkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG4gICAgJGxpY0tleTogJCgnI2xpY0tleScpLFxuICAgICRjb3Vwb246ICQoJyNjb3Vwb24nKSxcbiAgICAkZW1haWw6ICQoJyNlbWFpbCcpLFxuICAgICRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcbiAgICAkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuICAgICRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXG4gICAgJHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZS1idXR0b24nKSxcbiAgICAkc2F2ZUtleUJ1dHRvbjogJCgnI3NhdmUtbGljZW5zZS1rZXktYnV0dG9uJyksXG4gICAgJGFjdGl2YXRlQ291cG9uQnV0dG9uOiAkKCcjY291cG9uLWFjdGl2YXRpb24tYnV0dG9uJyksXG4gICAgJG1hbmFnZUtleUJ1dHRvbjogJCgnI21hbmFnZS1saWNlbnNlLWJ1dHRvbicpLFxuXG4gICAgJHJlc2V0Q29uZmlybU1vZGFsOiAkKCcjcmVzZXQtbGljZW5zZS1jb25maXJtLW1vZGFsJyksXG4gICAgJGNvbmZpcm1SZXNldEJ1dHRvbjogJCgnI2NvbmZpcm0tcmVzZXQtbGljZW5zZS1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBjb21wYW55bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdlbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29udGFjdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbGljS2V5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbGljS2V5JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvdXBvbjoge1xuICAgICAgICAgICAgZGVwZW5kczogJ2xpY0tleScsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY291cG9uJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgbGljZW5zaW5nIHBhZ2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAga2V5Q2hlY2suJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb25maXJtYXRpb24gbW9kYWxcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgb25pbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblxuICAgICAgICAvLyBIYW5kbGUgc2F2ZSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSByZXNldCBidXR0b24gY2xpY2sgaGFuZGxlclxuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb25maXJtIHJlc2V0IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBMaWNlbnNlQVBJLnJlc2V0S2V5KGtleUNoZWNrLmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuICAgICAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBhY3RpdmF0ZSBjb3Vwb24gYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCAmJmtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlci5odG1sKGdsb2JhbFBCWExpY2Vuc2UpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJG1hbmFnZUtleUJ1dHRvbi5hdHRyKCdocmVmJyxDb25maWcua2V5TWFuYWdlbWVudFVybCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmVzZXR0aW5nIHRoZSBsaWNlbnNlIGtleS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1N1Y2Nlc3NmdWwgLSBXaGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBhbmQgZGlzYWJsZWQgY2xhc3Nlc1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChpc1N1Y2Nlc3NmdWwgJiYgcmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1N1Y2Nlc3NmdWwgLSBXaGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlLCBpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgaWYgKGlzU3VjY2Vzc2Z1bCAmJiByZXNwb25zZS5kYXRhLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UuZGF0YS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgaW5jb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGxpY2Vuc2Uga2V5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPLScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFRoZSBsaWNlbnNlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcbiAgICAgICAgJCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcbiAgICAgICAgJCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuICAgICAgICAkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcbiAgICAgICAgbGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuICAgICAgICAgICAgcHJvZHVjdHMgPSBbXTtcbiAgICAgICAgICAgIHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuZW1wdHkoKTtcbiAgICAgICAgJC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuICAgICAgICAgICAgbGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcbiAgICAgICAgICAgICAgICBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGlyZWRUZXh0ID0gaTE4bignbGljX0V4cGlyZWRBZnRlcicsIHtleHBpcmVkOiBwcm9kdWN0LmV4cGlyZWR9KTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JztcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlSW5mbyA9IGkxOG4oJ2xpY19GZWF0dXJlSW5mbycsIHtuYW1lOiBmZWF0dXJlLm5hbWUsIGNvdW50OiBmZWF0dXJlLmNvdW50LCBjb3VudGVhY2g6IGZlYXR1cmUuY291bnRlYWNoLCBjYXB0dXJlZDogZmVhdHVyZS5jYXB0dXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyBmb3IgQVBJXG4gICAgICAgIHJlc3VsdC5kYXRhID0ga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyAobW9kZXJuIHBhdHRlcm4pXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTGljZW5zZUFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3Byb2Nlc3NVc2VyUmVxdWVzdCc7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjAgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==