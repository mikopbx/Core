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
    keyCheck.$email.inputmask('email'); // Handle save key button click.
    // Bind with a namespaced .off().on() so initialize() is idempotent: if it
    // is ever called more than once the handler is replaced, not stacked.
    // Stacked handlers would fire the request N times per click — the root of
    // the duplicate coupon activation that produced a false 2041 (issue #1089).

    keyCheck.$saveKeyButton.off('click.keyCheck').on('click.keyCheck', function () {
      if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$saveKeyButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$saveKeyButton.transition('shake');
      }
    }); // Update reset button click handler

    keyCheck.$resetButton.off('click.keyCheck').on('click.keyCheck', function () {
      keyCheck.$resetConfirmModal.modal('show');
    }); // Handle confirm reset button click

    keyCheck.$confirmResetButton.off('click.keyCheck').on('click.keyCheck', function () {
      keyCheck.$formObj.addClass('loading disabled');
      keyCheck.$confirmResetButton.addClass('loading disabled');
      LicenseAPI.resetKey(keyCheck.cbAfterResetLicenseKey);
      keyCheck.$resetConfirmModal.modal('hide');
    }); // Handle activate coupon button click

    keyCheck.$activateCouponButton.off('click.keyCheck').on('click.keyCheck', function () {
      if (keyCheck.$coupon.inputmask('unmaskedvalue').length === 20 && keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$activateCouponButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$activateCouponButton.transition('shake');
      }
    });
    keyCheck.cbOnLicenceKeyInputChange();
    keyCheck.initializeForm();
    keyCheck.refreshLicenseKeyView();
  },

  /**
   * Refresh the "license key present / absent" block from globalPBXLicense.
   * Split out of initialize() so cbAfterSendForm can refresh the view after a
   * successful submit WITHOUT re-running initialize() — the latter re-binds
   * click handlers (here and in the shared Form.initialize() for #submitbutton)
   * and would stack them, firing the request N times per click (issue #1089).
   */
  refreshLicenseKeyView: function refreshLicenseKeyView() {
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
      keyCheck.$formObj.form('set value', 'coupon', ''); // Refresh the view only — do NOT re-run initialize() here, or its
      // click bindings (and Form.initialize()'s #submitbutton binding)
      // would stack and duplicate the request on the next click (#1089).

      keyCheck.refreshLicenseKeyView();
      keyCheck.cbOnLicenceKeyInputChange();

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlciIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCIkcmVzZXRCdXR0b24iLCIkc2F2ZUtleUJ1dHRvbiIsIiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbiIsIiRtYW5hZ2VLZXlCdXR0b24iLCIkcmVzZXRDb25maXJtTW9kYWwiLCIkY29uZmlybVJlc2V0QnV0dG9uIiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvZmYiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwicmVmcmVzaExpY2Vuc2VLZXlWaWV3IiwiZ2xvYmFsUEJYTGljZW5zZSIsImh0bWwiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsImlzU3VjY2Vzc2Z1bCIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJkYXRhIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwiaTE4biIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiUEJYTGljZW5zZSIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19HZW5lcmFsRXJyb3IiLCJkYXRhQ2hhbmdlZCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5HO0FBUWJDLEVBQUFBLG9CQUFvQixFQUFFLElBUlQ7QUFTYkMsRUFBQUEsdUJBQXVCLEVBQUUsSUFUWjtBQVViQyxFQUFBQSxxQkFBcUIsRUFBRSxJQVZWO0FBV2JDLEVBQUFBLDRCQUE0QixFQUFFLElBWGpCO0FBWWJDLEVBQUFBLHdCQUF3QixFQUFFLElBWmI7QUFhYkMsRUFBQUEsY0FBYyxFQUFFLElBYkg7QUFjYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFkUDtBQWViQyxFQUFBQSxPQUFPLEVBQUUsSUFmSTtBQWdCYkMsRUFBQUEsT0FBTyxFQUFFLElBaEJJO0FBaUJiQyxFQUFBQSxNQUFNLEVBQUUsSUFqQks7QUFrQmJDLEVBQUFBLGFBQWEsRUFBRSxJQWxCRjtBQW1CYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFuQlA7QUFvQmJDLEVBQUFBLGVBQWUsRUFBRSxJQXBCSjtBQXFCYkMsRUFBQUEsV0FBVyxFQUFFLElBckJBO0FBdUJiQyxFQUFBQSxZQUFZLEVBQUUsSUF2QkQ7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U0FBUWhKLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQnVDLFNBQWpCLENBQTJCLGVBQTNCLEVBQTRDVSxNQUE1QyxLQUF1RCxFQUF2RCxJQUE2RHNGLEtBQUssQ0FBQ3RGLE1BQU4sR0FBZSxDQUFwRjtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBakIsQ0FBQyxDQUFDd0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxKLEVBQUFBLFFBQVEsQ0FBQ3dDLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIFVzZXJNZXNzYWdlLCBMaWNlbnNlQVBJKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbW9kdWxlcyBsaWNlbnNlIGtleVxuICpcbiAqIEBtb2R1bGUga2V5Q2hlY2tcbiAqL1xuY29uc3Qga2V5Q2hlY2sgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogbnVsbCxcbiAgICAkZmlsbGVkTGljZW5zZUtleUhlYWRlcjogbnVsbCxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86IG51bGwsXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlcjogbnVsbCxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246IG51bGwsXG4gICAgJGNvdXBvblNlY3Rpb246IG51bGwsXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiBudWxsLFxuICAgICRsaWNLZXk6IG51bGwsXG4gICAgJGNvdXBvbjogbnVsbCxcbiAgICAkZW1haWw6IG51bGwsXG4gICAgJGFqYXhNZXNzYWdlczogbnVsbCxcbiAgICAkbGljZW5zZURldGFpbEluZm86IG51bGwsXG4gICAgJHByb2R1Y3REZXRhaWxzOiBudWxsLFxuICAgICRhY2NvcmRpb25zOiBudWxsLFxuXG4gICAgJHJlc2V0QnV0dG9uOiBudWxsLFxuICAgICRzYXZlS2V5QnV0dG9uOiBudWxsLFxuICAgICRhY3RpdmF0ZUNvdXBvbkJ1dHRvbjogbnVsbCxcbiAgICAkbWFuYWdlS2V5QnV0dG9uOiBudWxsLFxuXG4gICAgJHJlc2V0Q29uZmlybU1vZGFsOiBudWxsLFxuICAgICRjb25maXJtUmVzZXRCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFJlc29sdmUgalF1ZXJ5IHdyYXBwZXJzIGhlcmUg4oCUIGF0IG1vZHVsZS1sb2FkIHRpbWUgalF1ZXJ5IG1heVxuICAgICAgICAvLyBub3QgeWV0IGJlIGRlZmluZWQgKFNlbnRyeSBNSUtPUEJYLU1HOSBwYXR0ZXJuKS5cbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmogPSAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyk7XG4gICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvID0gJCgnLmVtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKTtcbiAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIgPSAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpO1xuICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8gPSAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKTtcbiAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlciA9ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbyAuY29uZmlkZW50aWFsLWZpZWxkJyk7XG4gICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiA9ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpO1xuICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbiA9ICQoJyNjb3Vwb25TZWN0aW9uJyk7XG4gICAgICAgIGtleUNoZWNrLiRmb3JtRXJyb3JNZXNzYWdlcyA9ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyk7XG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkgPSAkKCcjbGljS2V5Jyk7XG4gICAgICAgIGtleUNoZWNrLiRjb3Vwb24gPSAkKCcjY291cG9uJyk7XG4gICAgICAgIGtleUNoZWNrLiRlbWFpbCA9ICQoJyNlbWFpbCcpO1xuICAgICAgICBrZXlDaGVjay4kYWpheE1lc3NhZ2VzID0gJCgnLnVpLm1lc3NhZ2UuYWpheCcpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8gPSAkKCcjbGljZW5zZURldGFpbEluZm8nKTtcbiAgICAgICAga2V5Q2hlY2suJHByb2R1Y3REZXRhaWxzID0gJCgnI3Byb2R1Y3REZXRhaWxzJyk7XG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zID0gJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyk7XG4gICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbiA9ICQoJyNyZXNldC1saWNlbnNlLWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbiA9ICQoJyNzYXZlLWxpY2Vuc2Uta2V5LWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24gPSAkKCcjY291cG9uLWFjdGl2YXRpb24tYnV0dG9uJyk7XG4gICAgICAgIGtleUNoZWNrLiRtYW5hZ2VLZXlCdXR0b24gPSAkKCcjbWFuYWdlLWxpY2Vuc2UtYnV0dG9uJyk7XG4gICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbCA9ICQoJyNyZXNldC1saWNlbnNlLWNvbmZpcm0tbW9kYWwnKTtcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbiA9ICQoJyNjb25maXJtLXJlc2V0LWxpY2Vuc2UtYnV0dG9uJyk7XG5cbiAgICAgICAga2V5Q2hlY2suJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb25maXJtYXRpb24gbW9kYWxcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgb25pbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblxuICAgICAgICAvLyBIYW5kbGUgc2F2ZSBrZXkgYnV0dG9uIGNsaWNrLlxuICAgICAgICAvLyBCaW5kIHdpdGggYSBuYW1lc3BhY2VkIC5vZmYoKS5vbigpIHNvIGluaXRpYWxpemUoKSBpcyBpZGVtcG90ZW50OiBpZiBpdFxuICAgICAgICAvLyBpcyBldmVyIGNhbGxlZCBtb3JlIHRoYW4gb25jZSB0aGUgaGFuZGxlciBpcyByZXBsYWNlZCwgbm90IHN0YWNrZWQuXG4gICAgICAgIC8vIFN0YWNrZWQgaGFuZGxlcnMgd291bGQgZmlyZSB0aGUgcmVxdWVzdCBOIHRpbWVzIHBlciBjbGljayDigJQgdGhlIHJvb3Qgb2ZcbiAgICAgICAgLy8gdGhlIGR1cGxpY2F0ZSBjb3Vwb24gYWN0aXZhdGlvbiB0aGF0IHByb2R1Y2VkIGEgZmFsc2UgMjA0MSAoaXNzdWUgIzEwODkpLlxuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5vZmYoJ2NsaWNrLmtleUNoZWNrJykub24oJ2NsaWNrLmtleUNoZWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHJlc2V0IGJ1dHRvbiBjbGljayBoYW5kbGVyXG4gICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbi5vZmYoJ2NsaWNrLmtleUNoZWNrJykub24oJ2NsaWNrLmtleUNoZWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJHJlc2V0Q29uZmlybU1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb25maXJtIHJlc2V0IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLm9mZignY2xpY2sua2V5Q2hlY2snKS5vbignY2xpY2sua2V5Q2hlY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgTGljZW5zZUFQSS5yZXNldEtleShrZXlDaGVjay5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgYWN0aXZhdGUgY291cG9uIGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ub2ZmKCdjbGljay5rZXlDaGVjaycpLm9uKCdjbGljay5rZXlDaGVjaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwICYma2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCl7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIGtleUNoZWNrLnJlZnJlc2hMaWNlbnNlS2V5VmlldygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIHRoZSBcImxpY2Vuc2Uga2V5IHByZXNlbnQgLyBhYnNlbnRcIiBibG9jayBmcm9tIGdsb2JhbFBCWExpY2Vuc2UuXG4gICAgICogU3BsaXQgb3V0IG9mIGluaXRpYWxpemUoKSBzbyBjYkFmdGVyU2VuZEZvcm0gY2FuIHJlZnJlc2ggdGhlIHZpZXcgYWZ0ZXIgYVxuICAgICAqIHN1Y2Nlc3NmdWwgc3VibWl0IFdJVEhPVVQgcmUtcnVubmluZyBpbml0aWFsaXplKCkg4oCUIHRoZSBsYXR0ZXIgcmUtYmluZHNcbiAgICAgKiBjbGljayBoYW5kbGVycyAoaGVyZSBhbmQgaW4gdGhlIHNoYXJlZCBGb3JtLmluaXRpYWxpemUoKSBmb3IgI3N1Ym1pdGJ1dHRvbilcbiAgICAgKiBhbmQgd291bGQgc3RhY2sgdGhlbSwgZmlyaW5nIHRoZSByZXF1ZXN0IE4gdGltZXMgcGVyIGNsaWNrIChpc3N1ZSAjMTA4OSkuXG4gICAgICovXG4gICAgcmVmcmVzaExpY2Vuc2VLZXlWaWV3KCkge1xuICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyLmh0bWwoZ2xvYmFsUEJYTGljZW5zZSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uLmF0dHIoJ2hyZWYnLENvbmZpZy5rZXlNYW5hZ2VtZW50VXJsKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBsaWNlbnNlIGtleSByZXNldC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzU3VjY2Vzc2Z1bCAtIFdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlLCBpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIGFuZCBkaXNhYmxlZCBjbGFzc2VzXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKGlzU3VjY2Vzc2Z1bCAmJiByZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzU3VjY2Vzc2Z1bCAtIFdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UsIGlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICBpZiAoaXNTdWNjZXNzZnVsICYmIHJlc3BvbnNlLmRhdGEubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5kYXRhLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjApIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5lbXB0eSgpO1xuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBpMThuKCdsaWNfRXhwaXJlZEFmdGVyJywge2V4cGlyZWQ6IHByb2R1Y3QuZXhwaXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gaTE4bignbGljX0ZlYXR1cmVJbmZvJywge25hbWU6IGZlYXR1cmUubmFtZSwgY291bnQ6IGZlYXR1cmUuY291bnQsIGNvdW50ZWFjaDogZmVhdHVyZS5jb3VudGVhY2gsIGNhcHR1cmVkOiBmZWF0dXJlLmNhcHR1cmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cgKz0gJzwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIGZvciBBUElcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHZpZXcgb25seSDigJQgZG8gTk9UIHJlLXJ1biBpbml0aWFsaXplKCkgaGVyZSwgb3IgaXRzXG4gICAgICAgICAgICAvLyBjbGljayBiaW5kaW5ncyAoYW5kIEZvcm0uaW5pdGlhbGl6ZSgpJ3MgI3N1Ym1pdGJ1dHRvbiBiaW5kaW5nKVxuICAgICAgICAgICAgLy8gd291bGQgc3RhY2sgYW5kIGR1cGxpY2F0ZSB0aGUgcmVxdWVzdCBvbiB0aGUgbmV4dCBjbGljayAoIzEwODkpLlxuICAgICAgICAgICAga2V5Q2hlY2sucmVmcmVzaExpY2Vuc2VLZXlWaWV3KCk7XG4gICAgICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyAobW9kZXJuIHBhdHRlcm4pXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTGljZW5zZUFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3Byb2Nlc3NVc2VyUmVxdWVzdCc7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjAgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==