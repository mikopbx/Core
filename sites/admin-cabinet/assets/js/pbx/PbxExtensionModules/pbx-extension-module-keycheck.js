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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,
  $emptyLicenseKeyInfo: null,
  $filledLicenseKeyHeader: null,
  $filledLicenseKeyInfo: null,
  $filledLicenseKeyPlaceholder: null,
  $getNewKeyLicenseSection: null,
  $couponSection: null,
  $formErrorMessages: null,
  $licKey: null,
  $coupon: null,
  $email: null,
  $ajaxMessages: null,
  $licenseDetailInfo: null,
  $productDetails: null,
  $accordions: null,
  $resetButton: null,
  $saveKeyButton: null,
  $activateCouponButton: null,
  $manageKeyButton: null,
  $resetConfirmModal: null,
  $confirmResetButton: null,

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
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined (Sentry MIKOPBX-MG9 pattern).
    keyCheck.$formObj = $('#licencing-modify-form');
    keyCheck.$emptyLicenseKeyInfo = $('.empty-license-key-info');
    keyCheck.$filledLicenseKeyHeader = $('.filled-license-key-header');
    keyCheck.$filledLicenseKeyInfo = $('.filled-license-key-info');
    keyCheck.$filledLicenseKeyPlaceholder = $('.filled-license-key-info .confidential-field');
    keyCheck.$getNewKeyLicenseSection = $('#getNewKeyLicenseSection');
    keyCheck.$couponSection = $('#couponSection');
    keyCheck.$formErrorMessages = $('#form-error-messages');
    keyCheck.$licKey = $('#licKey');
    keyCheck.$coupon = $('#coupon');
    keyCheck.$email = $('#email');
    keyCheck.$ajaxMessages = $('.ui.message.ajax');
    keyCheck.$licenseDetailInfo = $('#licenseDetailInfo');
    keyCheck.$productDetails = $('#productDetails');
    keyCheck.$accordions = $('#licencing-modify-form .ui.accordion');
    keyCheck.$resetButton = $('#reset-license-button');
    keyCheck.$saveKeyButton = $('#save-license-key-button');
    keyCheck.$activateCouponButton = $('#coupon-activation-button');
    keyCheck.$manageKeyButton = $('#manage-license-button');
    keyCheck.$resetConfirmModal = $('#reset-license-confirm-modal');
    keyCheck.$confirmResetButton = $('#confirm-reset-license-button');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlciIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCIkcmVzZXRCdXR0b24iLCIkc2F2ZUtleUJ1dHRvbiIsIiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbiIsIiRtYW5hZ2VLZXlCdXR0b24iLCIkcmVzZXRDb25maXJtTW9kYWwiLCIkY29uZmlybVJlc2V0QnV0dG9uIiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiZ2xvYmFsUEJYTGljZW5zZSIsImh0bWwiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsImlzU3VjY2Vzc2Z1bCIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJkYXRhIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiUEJYTGljZW5zZSIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19HZW5lcmFsRXJyb3IiLCJkYXRhQ2hhbmdlZCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5HO0FBUWJDLEVBQUFBLG9CQUFvQixFQUFFLElBUlQ7QUFTYkMsRUFBQUEsdUJBQXVCLEVBQUUsSUFUWjtBQVViQyxFQUFBQSxxQkFBcUIsRUFBRSxJQVZWO0FBV2JDLEVBQUFBLDRCQUE0QixFQUFFLElBWGpCO0FBWWJDLEVBQUFBLHdCQUF3QixFQUFFLElBWmI7QUFhYkMsRUFBQUEsY0FBYyxFQUFFLElBYkg7QUFjYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFkUDtBQWViQyxFQUFBQSxPQUFPLEVBQUUsSUFmSTtBQWdCYkMsRUFBQUEsT0FBTyxFQUFFLElBaEJJO0FBaUJiQyxFQUFBQSxNQUFNLEVBQUUsSUFqQks7QUFrQmJDLEVBQUFBLGFBQWEsRUFBRSxJQWxCRjtBQW1CYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFuQlA7QUFvQmJDLEVBQUFBLGVBQWUsRUFBRSxJQXBCSjtBQXFCYkMsRUFBQUEsV0FBVyxFQUFFLElBckJBO0FBdUJiQyxFQUFBQSxZQUFZLEVBQUUsSUF2QkQ7QUF3QmJDLEVBQUFBLGNBQWMsRUFBRSxJQXhCSDtB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Q0FBQzRFLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEI1RSxJQUFBQSxJQUFJLENBQUNyQyxhQUFMLEdBQXFCdEIsUUFBUSxDQUFDc0IsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NxQyxJQUFBQSxJQUFJLENBQUMrRCxnQkFBTCxHQUF3QjFILFFBQVEsQ0FBQzBILGdCQUFqQyxDQUphLENBSXNDOztBQUNuRC9ELElBQUFBLElBQUksQ0FBQ21FLGVBQUwsR0FBdUI5SCxRQUFRLENBQUM4SCxlQUFoQyxDQUxhLENBS29DO0FBRWpEOztBQUNBbkUsSUFBQUEsSUFBSSxDQUFDNkUsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQTlFLElBQUFBLElBQUksQ0FBQzZFLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCNUUsVUFBN0I7QUFDQUgsSUFBQUEsSUFBSSxDQUFDNkUsV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsb0JBQTlCO0FBRUFoRixJQUFBQSxJQUFJLENBQUNuQixVQUFMO0FBQ0g7QUF4WVksQ0FBakI7QUEyWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUMsQ0FBQyxDQUFDbUcsRUFBRixDQUFLZixJQUFMLENBQVVGLFFBQVYsQ0FBbUJsRyxLQUFuQixDQUF5Qm9ILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVE5SSxRQUFRLENBQUNTLE9BQVQsQ0FBaUJ1QyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBdUQsRUFBdkQsSUFBNkRxRixLQUFLLENBQUNyRixNQUFOLEdBQWUsQ0FBcEY7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQWhCLENBQUMsQ0FBQ3NHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoSixFQUFBQSxRQUFRLENBQUN3QyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSwgTGljZW5zZUFQSSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86IG51bGwsXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6IG51bGwsXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiBudWxsLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiBudWxsLFxuICAgICRjb3Vwb25TZWN0aW9uOiBudWxsLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogbnVsbCxcbiAgICAkbGljS2V5OiBudWxsLFxuICAgICRjb3Vwb246IG51bGwsXG4gICAgJGVtYWlsOiBudWxsLFxuICAgICRhamF4TWVzc2FnZXM6IG51bGwsXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiBudWxsLFxuICAgICRwcm9kdWN0RGV0YWlsczogbnVsbCxcbiAgICAkYWNjb3JkaW9uczogbnVsbCxcblxuICAgICRyZXNldEJ1dHRvbjogbnVsbCxcbiAgICAkc2F2ZUtleUJ1dHRvbjogbnVsbCxcbiAgICAkYWN0aXZhdGVDb3Vwb25CdXR0b246IG51bGwsXG4gICAgJG1hbmFnZUtleUJ1dHRvbjogbnVsbCxcblxuICAgICRyZXNldENvbmZpcm1Nb2RhbDogbnVsbCxcbiAgICAkY29uZmlybVJlc2V0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqID0gJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpO1xuICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mbyA9ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyID0gJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKTtcbiAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvID0gJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIgPSAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8gLmNvbmZpZGVudGlhbC1maWVsZCcpO1xuICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24gPSAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKTtcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24gPSAkKCcjY291cG9uU2VjdGlvbicpO1xuICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMgPSAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpO1xuICAgICAgICBrZXlDaGVjay4kbGljS2V5ID0gJCgnI2xpY0tleScpO1xuICAgICAgICBrZXlDaGVjay4kY291cG9uID0gJCgnI2NvdXBvbicpO1xuICAgICAgICBrZXlDaGVjay4kZW1haWwgPSAkKCcjZW1haWwnKTtcbiAgICAgICAga2V5Q2hlY2suJGFqYXhNZXNzYWdlcyA9ICQoJy51aS5tZXNzYWdlLmFqYXgnKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvID0gJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRwcm9kdWN0RGV0YWlscyA9ICQoJyNwcm9kdWN0RGV0YWlscycpO1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucyA9ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpO1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24gPSAkKCcjcmVzZXQtbGljZW5zZS1idXR0b24nKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24gPSAkKCcjc2F2ZS1saWNlbnNlLWtleS1idXR0b24nKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uID0gJCgnI2NvdXBvbi1hY3RpdmF0aW9uLWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uID0gJCgnI21hbmFnZS1saWNlbnNlLWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwgPSAkKCcjcmVzZXQtbGljZW5zZS1jb25maXJtLW1vZGFsJyk7XG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24gPSAkKCcjY29uZmlybS1yZXNldC1saWNlbnNlLWJ1dHRvbicpO1xuXG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNhdmUga2V5IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgcmVzZXQgYnV0dG9uIGNsaWNrIGhhbmRsZXJcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY29uZmlybSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgTGljZW5zZUFQSS5yZXNldEtleShrZXlDaGVjay5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgYWN0aXZhdGUgY291cG9uIGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjAgJiZrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG4gICAgICAgIGtleUNoZWNrLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChnbG9iYWxQQlhMaWNlbnNlLmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIuaHRtbChnbG9iYWxQQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRtYW5hZ2VLZXlCdXR0b24uYXR0cignaHJlZicsQ29uZmlnLmtleU1hbmFnZW1lbnRVcmwpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJlc2V0dGluZyB0aGUgbGljZW5zZSBrZXkuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIGxpY2Vuc2Uga2V5IHJlc2V0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNTdWNjZXNzZnVsIC0gV2hldGhlciB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2UsIGlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXNcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBpZiAoaXNTdWNjZXNzZnVsICYmIHJlc3BvbnNlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNTdWNjZXNzZnVsIC0gV2hldGhlciB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIGlmIChpc1N1Y2Nlc3NmdWwgJiYgcmVzcG9uc2UuZGF0YS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmRhdGEubGljZW5zZUluZm8pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoID09PSAyMCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGluY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBsaWNlbnNlIGtleSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLTy0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBjb3Vwb24gZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS09VUEQtJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmVtcHR5KCk7XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGkxOG4oJ2xpY19FeHBpcmVkQWZ0ZXInLCB7ZXhwaXJlZDogcHJvZHVjdC5leHBpcmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBpMThuKCdsaWNfRmVhdHVyZUluZm8nLCB7bmFtZTogZmVhdHVyZS5uYW1lLCBjb3VudDogZmVhdHVyZS5jb3VudCwgY291bnRlYWNoOiBmZWF0dXJlLmNvdW50ZWFjaCwgY2FwdHVyZWQ6IGZlYXR1cmUuY2FwdHVyZWR9KTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXMgZm9yIEFQSVxuICAgICAgICByZXN1bHQuZGF0YSA9IGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGdsb2JhbFBCWExpY2Vuc2UgPSByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2U7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xpY0tleScsIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5odG1sKCcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2NvdXBvbicsICcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZW5lcmFsRXJyb3IsIHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0ga2V5Q2hlY2suJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGtleUNoZWNrLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBrZXlDaGVjay5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0ga2V5Q2hlY2suY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgKG1vZGVybiBwYXR0ZXJuKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IExpY2Vuc2VBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdwcm9jZXNzVXNlclJlcXVlc3QnO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwIHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=