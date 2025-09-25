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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwiJHJlc2V0Q29uZmlybU1vZGFsIiwiJGNvbmZpcm1SZXNldEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiZ2xvYmFsUEJYTGljZW5zZSIsImh0bWwiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJsaWNlbnNlSW5mbyIsInVuZGVmaW5lZCIsInNob3dMaWNlbnNlSW5mbyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJpMThuIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJkYXRhIiwiUEJYTGljZW5zZSIsImZvcm0iLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJsaWNfR2VuZXJhbEVycm9yIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsInByb2Nlc3NVc2VyUmVxdWVzdCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxFO0FBT2JDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQVjtBQVFiRSxFQUFBQSx1QkFBdUIsRUFBRUYsQ0FBQyxDQUFDLDRCQUFELENBUmI7QUFTYkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRYO0FBVWJJLEVBQUFBLDRCQUE0QixFQUFFSixDQUFDLENBQUMsOENBQUQsQ0FWbEI7QUFXYkssRUFBQUEsd0JBQXdCLEVBQUVMLENBQUMsQ0FBQywwQkFBRCxDQVhkO0FBWWJNLEVBQUFBLGNBQWMsRUFBRU4sQ0FBQyxDQUFDLGdCQUFELENBWko7QUFhYk8sRUFBQUEsa0JBQWtCLEVBQUVQLENBQUMsQ0FBQyxzQkFBRCxDQWJSO0FBY2JRLEVBQUFBLE9BQU8sRUFBRVIsQ0FBQyxDQUFDLFNBQUQsQ0FkRztBQWViUyxFQUFBQSxPQUFPLEVBQUVULENBQUMsQ0FBQyxTQUFELENBZkc7QUFnQmJVLEVBQUFBLE1BQU0sRUFBRVYsQ0FBQyxDQUFDLFFB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LENBRWdDOztBQUM3Qy9FLElBQUFBLElBQUksQ0FBQ3BDLGFBQUwsR0FBcUJ2QixRQUFRLENBQUN1QixhQUE5QixDQUhhLENBR2dDOztBQUM3Q29DLElBQUFBLElBQUksQ0FBQ3lFLGdCQUFMLEdBQXdCcEksUUFBUSxDQUFDb0ksZ0JBQWpDLENBSmEsQ0FJc0M7O0FBQ25EekUsSUFBQUEsSUFBSSxDQUFDMkUsZUFBTCxHQUF1QnRJLFFBQVEsQ0FBQ3NJLGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pEM0UsSUFBQUEsSUFBSSxDQUFDbEIsVUFBTDtBQUNIO0FBN1dZLENBQWpCO0FBZ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0F2QyxDQUFDLENBQUN5SSxFQUFGLENBQUtmLElBQUwsQ0FBVVMsUUFBVixDQUFtQjNHLEtBQW5CLENBQXlCa0gsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDcEUsU0FBUTdJLFFBQVEsQ0FBQ1UsT0FBVCxDQUFpQnNDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDUyxNQUE1QyxLQUF1RCxFQUF2RCxJQUE2RG9GLEtBQUssQ0FBQ3BGLE1BQU4sR0FBZSxDQUFwRjtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBdkQsQ0FBQyxDQUFDNEksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9JLEVBQUFBLFFBQVEsQ0FBQ3lDLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIFVzZXJNZXNzYWdlLCBMaWNlbnNlQVBJKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbW9kdWxlcyBsaWNlbnNlIGtleVxuICpcbiAqIEBtb2R1bGUga2V5Q2hlY2tcbiAqL1xuY29uc3Qga2V5Q2hlY2sgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaGVhZGVyJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8gLmNvbmZpZGVudGlhbC1maWVsZCcpLFxuICAgICRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG4gICAgJGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuICAgICRsaWNLZXk6ICQoJyNsaWNLZXknKSxcbiAgICAkY291cG9uOiAkKCcjY291cG9uJyksXG4gICAgJGVtYWlsOiAkKCcjZW1haWwnKSxcbiAgICAkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcbiAgICAkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgICRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UtYnV0dG9uJyksXG4gICAgJHNhdmVLZXlCdXR0b246ICQoJyNzYXZlLWxpY2Vuc2Uta2V5LWJ1dHRvbicpLFxuICAgICRhY3RpdmF0ZUNvdXBvbkJ1dHRvbjogJCgnI2NvdXBvbi1hY3RpdmF0aW9uLWJ1dHRvbicpLFxuICAgICRtYW5hZ2VLZXlCdXR0b246ICQoJyNtYW5hZ2UtbGljZW5zZS1idXR0b24nKSxcblxuICAgICRyZXNldENvbmZpcm1Nb2RhbDogJCgnI3Jlc2V0LWxpY2Vuc2UtY29uZmlybS1tb2RhbCcpLFxuICAgICRjb25maXJtUmVzZXRCdXR0b246ICQoJyNjb25maXJtLXJlc2V0LWxpY2Vuc2UtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNhdmUga2V5IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgcmVzZXQgYnV0dG9uIGNsaWNrIGhhbmRsZXJcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY29uZmlybSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgTGljZW5zZUFQSS5yZXNldEtleShrZXlDaGVjay5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgYWN0aXZhdGUgY291cG9uIGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjAgJiZrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG4gICAgICAgIGtleUNoZWNrLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChnbG9iYWxQQlhMaWNlbnNlLmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIuaHRtbChnbG9iYWxQQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRtYW5hZ2VLZXlCdXR0b24uYXR0cignaHJlZicsQ29uZmlnLmtleU1hbmFnZW1lbnRVcmwpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJlc2V0dGluZyB0aGUgbGljZW5zZSBrZXkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBsaWNlbnNlIGtleSByZXNldC5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBhbmQgZGlzYWJsZWQgY2xhc3Nlc1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoID09PSAyMCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGluY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBsaWNlbnNlIGtleSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLTy0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBjb3Vwb24gZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS09VUEQtJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmVtcHR5KCk7XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGkxOG4oJ2xpY19FeHBpcmVkQWZ0ZXInLCB7ZXhwaXJlZDogcHJvZHVjdC5leHBpcmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBpMThuKCdsaWNfRmVhdHVyZUluZm8nLCB7bmFtZTogZmVhdHVyZS5uYW1lLCBjb3VudDogZmVhdHVyZS5jb3VudCwgY291bnRlYWNoOiBmZWF0dXJlLmNvdW50ZWFjaCwgY2FwdHVyZWQ6IGZlYXR1cmUuY2FwdHVyZWR9KTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHN1Y2Nlc3MgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGdsb2JhbFBCWExpY2Vuc2UgPSByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2U7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xpY0tleScsIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5odG1sKCcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2NvdXBvbicsICcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yLCByZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmxpY19HZW5lcmFsRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIExpY2Vuc2VBUEkucHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBrZXlDaGVjay5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBrZXlDaGVjay52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0ga2V5Q2hlY2suY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGtleUNoZWNrLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwIHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=