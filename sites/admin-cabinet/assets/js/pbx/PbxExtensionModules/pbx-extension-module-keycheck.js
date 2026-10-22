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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense, UserMessage, LicenseAPI, entitlement */

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
      keyCheck.$filledLicenseKeyPlaceholder.text(globalPBXLicense);
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
      keyCheck.cbOnLicenceKeyInputChange(); // #1148: the entitlement block judges by the key — a saved key changes its lines.

      entitlement.refresh();

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlciIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCIkcmVzZXRCdXR0b24iLCIkc2F2ZUtleUJ1dHRvbiIsIiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbiIsIiRtYW5hZ2VLZXlCdXR0b24iLCIkcmVzZXRDb25maXJtTW9kYWwiLCIkY29uZmlybVJlc2V0QnV0dG9uIiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJhY2NvcmRpb24iLCJoaWRlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJvZmYiLCJvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRm9ybSIsInN1Ym1pdEZvcm0iLCJ0cmFuc2l0aW9uIiwiTGljZW5zZUFQSSIsInJlc2V0S2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwicmVmcmVzaExpY2Vuc2VLZXlWaWV3IiwiZ2xvYmFsUEJYTGljZW5zZSIsInRleHQiLCJzaG93IiwiYXR0ciIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJyZXNwb25zZSIsImlzU3VjY2Vzc2Z1bCIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJkYXRhIiwibGljZW5zZUluZm8iLCJ1bmRlZmluZWQiLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJpMThuIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJQQlhMaWNlbnNlIiwiaHRtbCIsImVudGl0bGVtZW50IiwicmVmcmVzaCIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19HZW5lcmFsRXJyb3IiLCJkYXRhQ2hhbmdlZCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5HO0FBUWJDLEVBQUFBLG9CQUFvQixFQUFFLElBUlQ7QUFTYkMsRUFBQUEsdUJBQXVCLEVBQUUsSUFUWjtBQVViQyxFQUFBQSxxQkFBcUIsRUFBRSxJQVZWO0FBV2JDLEVBQUFBLDRCQUE0QixFQUFFLElBWGpCO0FBWWJDLEVBQUFBLHdCQUF3QixFQUFFLElBWmI7QUFhYkMsRUFBQUEsY0FBYyxFQUFFLElBYkg7QUFjYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFkUDtBQWViQyxFQUFBQSxPQUFPLEVBQUUsSUFmSTtBQWdCYkMsRUFBQUEsT0FBTyxFQUFFLElBaEJJO0FBaUJiQyxFQUFBQSxNQUFNLEVBQUUsSUFqQks7QUFrQmJDLEVBQUFBLGFBQWEsRUFBRSxJQWxCRjtBQW1CYkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFuQlA7QUFvQmJDLEVBQUFBLGVBQWUsRUFBRSxJQXBCSjtBQXFCYkMsRUFBQUEsV0FBVyxFQUFFLElBckJBO0FBdUJiQyxFQUFBQSxZQUFZLEVBQUUsSUF2QkQ7QUF3QmJDLEVBQUFBLGNBQWMsRUFBRSxJQXhCSDtBQXlCYkMsRUFBQUEscUJBQXFCLEVBQUUsSUF6QlY7QUEwQmJDLEVBQUFBLGdCQUFnQixFQUFFLElBMUJMO0FBNEJiQyxFQUFBQSxrQkFBa0IsRUFBRSxJQTVCUDtBQTZCYkMsRUFBQUEsbUJBQW1CLEVBQUUsSUE3QlI7O0FBK0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRSxLQURGO0FBVVhDLElBQUFBLEtBQUssRUFBRTtBQUNITixNQUFBQSxVQUFVLEVBQUUsT0FEVDtBQUVIQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BREc7QUFGSixLQVZJO0FBbUJYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTFIsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLDZCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSztBQUY1QixPQURHO0FBRkYsS0FuQkU7QUE0QlhDLElBQUFBLE1BQU0sRUFBRTtBQUNKVixNQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKVyxNQUFBQSxRQUFRLEVBQUUsSUFGTjtBQUdKVixNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsaUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNRO0FBRjVCLE9BREc7QUFISCxLQTVCRztBQXNDWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pDLE1BQUFBLE9BQU8sRUFBRSxRQURMO0FBRUpkLE1BQUFBLFVBQVUsRUFBRSxRQUZSO0FBR0pXLE1BQUFBLFFBQVEsRUFBRSxJQUhOO0FBSUpWLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FERztBQUpIO0FBdENHLEdBcENGO0FBdUZiO0FBQ0FDLEVBQUFBLFVBeEZhLHdCQXdGQTtBQUNUO0FBQ0E7QUFDQXhDLElBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxHQUFvQndDLENBQUMsQ0FBQyx3QkFBRCxDQUFyQjtBQUNBekMsSUFBQUEsUUFBUSxDQUFDRSxvQkFBVCxHQUFnQ3VDLENBQUMsQ0FBQyx5QkFBRCxDQUFqQztBQUNBekMsSUFBQUEsUUFBUSxDQUFDRyx1QkFBVCxHQUFtQ3NDLENBQUMsQ0FBQyw0QkFBRCxDQUFwQztBQUNBekMsSUFBQUEsUUFBUSxDQUFDSSxxQkFBVCxHQUFpQ3FDLENBQUMsQ0FBQywwQkFBRCxDQUFsQztBQUNBekMsSUFBQUEsUUFBUSxDQUFDSyw0QkFBVCxHQUF3Q29DLENBQUMsQ0FBQyw4Q0FBRCxDQUF6QztBQUNBekMsSUFBQUEsUUFBUSxDQUFDTSx3QkFBVCxHQUFvQ21DLENBQUMsQ0FBQywwQkFBRCxDQUFyQztBQUNBekMsSUFBQUEsUUFBUSxDQUFDTyxjQUFULEdBQTBCa0MsQ0FBQyxDQUFDLGdCQUFELENBQTNCO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNRLGtCQUFULEdBQThCaUMsQ0FBQyxDQUFDLHNCQUFELENBQS9CO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNTLE9BQVQsR0FBbUJnQyxDQUFDLENBQUMsU0FBRCxDQUFwQjtBQUNBekMsSUFBQUEsUUFBUSxDQUFDVSxPQUFULEdBQW1CK0IsQ0FBQyxDQUFDLFNBQUQsQ0FBcEI7QUFDQXpDLElBQUFBLFFBQVEsQ0FBQ1csTUFBVCxHQUFrQjhCLENBQUMsQ0FBQyxRQUFELENBQW5CO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNZLGFBQVQsR0FBeUI2QixDQUFDLENBQUMsa0JBQUQsQ0FBMUI7QUFDQXpDLElBQUFBLFFBQVEsQ0FBQ2Esa0JBQVQsR0FBOEI0QixDQUFDLENBQUMsb0JBQUQsQ0FBL0I7QUFDQXpDLElBQUFBLFFBQVEsQ0FBQ2MsZUFBVCxHQUEyQjJCLENBQUMsQ0FBQyxpQkFBRCxDQUE1QjtBQUNBekMsSUFBQUEsUUFBUSxDQUFDZSxXQUFULEdBQXVCMEIsQ0FBQyxDQUFDLHNDQUFELENBQXhCO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNnQixZQUFULEdBQXdCeUIsQ0FBQyxDQUFDLHVCQUFELENBQXpCO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNpQixjQUFULEdBQTBCd0IsQ0FBQyxDQUFDLDBCQUFELENBQTNCO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNrQixxQkFBVCxHQUFpQ3VCLENBQUMsQ0FBQywyQkFBRCxDQUFsQztBQUNBekMsSUFBQUEsUUFBUSxDQUFDbUIsZ0JBQVQsR0FBNEJzQixDQUFDLENBQUMsd0JBQUQsQ0FBN0I7QUFDQXpDLElBQUFBLFFBQVEsQ0FBQ29CLGtCQUFULEdBQThCcUIsQ0FBQyxDQUFDLDhCQUFELENBQS9CO0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNxQixtQkFBVCxHQUErQm9CLENBQUMsQ0FBQywrQkFBRCxDQUFoQztBQUVBekMsSUFBQUEsUUFBUSxDQUFDZSxXQUFULENBQXFCMkIsU0FBckI7QUFDQTFDLElBQUFBLFFBQVEsQ0FBQ2Esa0JBQVQsQ0FBNEI4QixJQUE1QixHQTFCUyxDQTRCVDs7QUFDQTNDLElBQUFBLFFBQVEsQ0FBQ29CLGtCQUFULENBQTRCd0IsS0FBNUIsQ0FBa0M7QUFDOUJDLE1BQUFBLFFBQVEsRUFBRSxLQURvQjtBQUU5QkMsTUFBQUEsTUFBTSxFQUFFLGtCQUFNO0FBQ1YsZUFBTyxJQUFQO0FBQ0gsT0FKNkI7QUFLOUJDLE1BQUFBLFNBQVMsRUFBRSxxQkFBTTtBQUNiLGVBQU8sS0FBUDtBQUNIO0FBUDZCLEtBQWxDLEVBN0JTLENBdUNUOztBQUNBL0MsSUFBQUEsUUFBUSxDQUFDVSxPQUFULENBQWlCc0MsU0FBakIsQ0FBMkIsaUNBQTNCLEVBQThEO0FBQzFEQyxNQUFBQSxhQUFhLEVBQUVqRCxRQUFRLENBQUNrRDtBQURrQyxLQUE5RCxFQXhDUyxDQTRDVDs7QUFDQWxELElBQUFBLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQnVDLFNBQWpCLENBQTJCLDhCQUEzQixFQUEyRDtBQUN2REcsTUFBQUEsVUFBVSxFQUFFbkQsUUFBUSxDQUFDb0QseUJBRGtDO0FBRXZEQyxNQUFBQSxZQUFZLEVBQUVyRCxRQUFRLENBQUNvRCx5QkFGZ0M7QUFHdkRFLE1BQUFBLGVBQWUsRUFBRSxJQUhzQztBQUl2REwsTUFBQUEsYUFBYSxFQUFFakQsUUFBUSxDQUFDdUQ7QUFKK0IsS0FBM0Q7QUFPQXZELElBQUFBLFFBQVEsQ0FBQ1csTUFBVCxDQUFnQnFDLFNBQWhCLENBQTBCLE9BQTFCLEVBcERTLENBc0RUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FoRCxJQUFBQSxRQUFRLENBQUNpQixjQUFULENBQXdCdUMsR0FBeEIsQ0FBNEIsZ0JBQTVCLEVBQThDQyxFQUE5QyxDQUFpRCxnQkFBakQsRUFBbUUsWUFBTTtBQUNyRSxVQUFJekQsUUFBUSxDQUFDUyxPQUFULENBQWlCdUMsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENVLE1BQTVDLEtBQXFELEVBQXpELEVBQTREO0FBQ3hEMUQsUUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCMEQsUUFBbEIsQ0FBMkIsa0JBQTNCO0FBQ0EzRCxRQUFBQSxRQUFRLENBQUNpQixjQUFULENBQXdCMEMsUUFBeEIsQ0FBaUMsa0JBQWpDO0FBQ0FDLFFBQUFBLElBQUksQ0FBQ0MsVUFBTDtBQUNILE9BSkQsTUFJTztBQUNIN0QsUUFBQUEsUUFBUSxDQUFDaUIsY0FBVCxDQUF3QjZDLFVBQXhCLENBQW1DLE9BQW5DO0FBQ0g7QUFDSixLQVJELEVBM0RTLENBcUVUOztBQUNBOUQsSUFBQUEsUUFBUSxDQUFDZ0IsWUFBVCxDQUFzQndDLEdBQXRCLENBQTBCLGdCQUExQixFQUE0Q0MsRUFBNUMsQ0FBK0MsZ0JBQS9DLEVBQWlFLFlBQU07QUFDbkV6RCxNQUFBQSxRQUFRLENBQUNvQixrQkFBVCxDQUE0QndCLEtBQTVCLENBQWtDLE1BQWxDO0FBQ0gsS0FGRCxFQXRFUyxDQTBFVDs7QUFDQTVDLElBQUFBLFFBQVEsQ0FBQ3FCLG1CQUFULENBQTZCbUMsR0FBN0IsQ0FBaUMsZ0JBQWpDLEVBQW1EQyxFQUFuRCxDQUFzRCxnQkFBdEQsRUFBd0UsWUFBTTtBQUMxRXpELE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQjBELFFBQWxCLENBQTJCLGtCQUEzQjtBQUNBM0QsTUFBQUEsUUFBUSxDQUFDcUIsbUJBQVQsQ0FBNkJzQyxRQUE3QixDQUFzQyxrQkFBdEM7QUFDQUksTUFBQUEsVUFBVSxDQUFDQyxRQUFYLENBQW9CaEUsUUFBUSxDQUFDaUUsc0JBQTdCO0FBQ0FqRSxNQUFBQSxRQUFRLENBQUNvQixrQkFBVCxDQUE0QndCLEtBQTVCLENBQWtDLE1BQWxDO0FBQ0gsS0FMRCxFQTNFUyxDQWtGVDs7QUFDQTVDLElBQUFBLFFBQVEsQ0FBQ2tCLHFCQUFULENBQStCc0MsR0FBL0IsQ0FBbUMsZ0JBQW5DLEVBQXFEQyxFQUFyRCxDQUF3RCxnQkFBeEQsRUFBMEUsWUFBTTtBQUM1RSxVQUFJekQsUUFBUSxDQUFDVSxPQUFULENBQWlCc0MsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENVLE1BQTVDLEtBQXFELEVBQXJELElBQTBEMUQsUUFBUSxDQUFDUyxPQUFULENBQWlCdUMsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENVLE1BQTVDLEtBQXFELEVBQW5ILEVBQXNIO0FBQ2xIMUQsUUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCMEQsUUFBbEIsQ0FBMkIsa0JBQTNCO0FBQ0EzRCxRQUFBQSxRQUFRLENBQUNrQixxQkFBVCxDQUErQnlDLFFBQS9CLENBQXdDLGtCQUF4QztBQUNBQyxRQUFBQSxJQUFJLENBQUNDLFVBQUw7QUFDSCxPQUpELE1BSU87QUFDSDdELFFBQUFBLFFBQVEsQ0FBQ2tCLHFCQUFULENBQStCNEMsVUFBL0IsQ0FBMEMsT0FBMUM7QUFDSDtBQUNKLEtBUkQ7QUFVQTlELElBQUFBLFFBQVEsQ0FBQ29ELHlCQUFUO0FBRUFwRCxJQUFBQSxRQUFRLENBQUNrRSxjQUFUO0FBRUFsRSxJQUFBQSxRQUFRLENBQUNtRSxxQkFBVDtBQUNILEdBMUxZOztBQTRMYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxxQkFuTWEsbUNBbU1XO0FBQ3BCLFFBQUlDLGdCQUFnQixDQUFDVixNQUFqQixLQUE0QixFQUFoQyxFQUFvQztBQUNoQzFELE1BQUFBLFFBQVEsQ0FBQ0ssNEJBQVQsQ0FBc0NnRSxJQUF0QyxDQUEyQ0QsZ0JBQTNDO0FBQ0FwRSxNQUFBQSxRQUFRLENBQUNHLHVCQUFULENBQWlDbUUsSUFBakM7QUFDQXRFLE1BQUFBLFFBQVEsQ0FBQ21CLGdCQUFULENBQTBCb0QsSUFBMUIsQ0FBK0IsTUFBL0IsRUFBc0NDLE1BQU0sQ0FBQ0MsZ0JBQTdDO0FBQ0F6RSxNQUFBQSxRQUFRLENBQUNFLG9CQUFULENBQThCeUMsSUFBOUI7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ0kscUJBQVQsQ0FBK0JrRSxJQUEvQjtBQUNILEtBTkQsTUFNTztBQUNIdEUsTUFBQUEsUUFBUSxDQUFDRyx1QkFBVCxDQUFpQ3dDLElBQWpDO0FBQ0EzQyxNQUFBQSxRQUFRLENBQUNJLHFCQUFULENBQStCdUMsSUFBL0I7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ0Usb0JBQVQsQ0FBOEJvRSxJQUE5QjtBQUNIO0FBQ0osR0EvTVk7O0FBaU5iO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUwsRUFBQUEsc0JBdE5hLGtDQXNOVVMsUUF0TlYsRUFzTm9CQyxZQXROcEIsRUFzTmtDO0FBQzNDO0FBQ0EzRSxJQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0IyRSxXQUFsQixDQUE4QixrQkFBOUI7QUFDQTVFLElBQUFBLFFBQVEsQ0FBQ3FCLG1CQUFULENBQTZCdUQsV0FBN0IsQ0FBeUMsa0JBQXpDOztBQUNBLFFBQUlELFlBQVksSUFBSUQsUUFBUSxLQUFLLEtBQWpDLEVBQXdDO0FBQ3BDRyxNQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0g7QUFDSixHQTdOWTs7QUErTmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxxQkFwT2EsaUNBb09TTixRQXBPVCxFQW9PbUJDLFlBcE9uQixFQW9PaUM7QUFDMUMsUUFBSUEsWUFBWSxJQUFJRCxRQUFRLENBQUNPLElBQVQsQ0FBY0MsV0FBZCxLQUE4QkMsU0FBbEQsRUFBNkQ7QUFDekQ7QUFDQW5GLE1BQUFBLFFBQVEsQ0FBQ29GLGVBQVQsQ0FBeUJWLFFBQVEsQ0FBQ08sSUFBVCxDQUFjQyxXQUF2QztBQUNBbEYsTUFBQUEsUUFBUSxDQUFDYSxrQkFBVCxDQUE0QnlELElBQTVCO0FBQ0gsS0FKRCxNQUlPO0FBQ0g7QUFDQXRFLE1BQUFBLFFBQVEsQ0FBQ2Esa0JBQVQsQ0FBNEI4QixJQUE1QjtBQUNIO0FBQ0osR0E3T1k7O0FBK09iO0FBQ0o7QUFDQTtBQUNJUyxFQUFBQSx5QkFsUGEsdUNBa1BlO0FBQ3hCLFFBQUlwRCxRQUFRLENBQUNTLE9BQVQsQ0FBaUJ1QyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1UsTUFBNUMsS0FBdUQsRUFBM0QsRUFBK0Q7QUFDM0Q7QUFDQTFELE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQm9GLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Q0MsSUFBekMsQ0FBOEMsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQzFEL0MsUUFBQUEsQ0FBQyxDQUFDK0MsR0FBRCxDQUFELENBQU9qQixJQUFQLENBQVksUUFBWixFQUFzQixFQUF0QjtBQUNILE9BRkQ7QUFHQXZFLE1BQUFBLFFBQVEsQ0FBQ00sd0JBQVQsQ0FBa0NxQyxJQUFsQztBQUNBM0MsTUFBQUEsUUFBUSxDQUFDTyxjQUFULENBQXdCK0QsSUFBeEI7QUFDQXRFLE1BQUFBLFFBQVEsQ0FBQ1Esa0JBQVQsQ0FBNEJpRixLQUE1QjtBQUNILEtBUkQsTUFRTztBQUNIO0FBQ0F6RixNQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0JvRixJQUFsQixDQUF1QixnQkFBdkIsRUFBeUNDLElBQXpDLENBQThDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUMxRC9DLFFBQUFBLENBQUMsQ0FBQytDLEdBQUQsQ0FBRCxDQUFPRSxVQUFQLENBQWtCLFFBQWxCO0FBQ0gsT0FGRDtBQUdBMUYsTUFBQUEsUUFBUSxDQUFDTSx3QkFBVCxDQUFrQ2dFLElBQWxDO0FBQ0F0RSxNQUFBQSxRQUFRLENBQUNPLGNBQVQsQ0FBd0JvQyxJQUF4QjtBQUNIO0FBQ0osR0FuUVk7O0FBcVFiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVksRUFBQUEseUJBMVFhLHFDQTBRYW9DLFdBMVFiLEVBMFEwQjtBQUNuQyxRQUFJQSxXQUFXLENBQUNDLE9BQVosQ0FBb0IsT0FBcEIsTUFBaUMsQ0FBQyxDQUF0QyxFQUF5QztBQUNyQzVGLE1BQUFBLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQnFELFVBQWpCLENBQTRCLE9BQTVCO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBQ0QsV0FBTzZCLFdBQVcsQ0FBQ0UsT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFQO0FBQ0gsR0FoUlk7O0FBa1JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTNDLEVBQUFBLHFCQXZSYSxpQ0F1UlN5QyxXQXZSVCxFQXVSc0I7QUFDL0IsUUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLFVBQXBCLE1BQW9DLENBQUMsQ0FBekMsRUFBNEM7QUFDeEM1RixNQUFBQSxRQUFRLENBQUNVLE9BQVQsQ0FBaUJvRCxVQUFqQixDQUE0QixPQUE1QjtBQUNBLGFBQU8sS0FBUDtBQUNIOztBQUNELFdBQU82QixXQUFXLENBQUNFLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBN1JZOztBQStSYjtBQUNKO0FBQ0E7QUFDQTtBQUNJVCxFQUFBQSxlQW5TYSwyQkFtU0dVLE9BblNILEVBbVNZO0FBQ3JCLFFBQU1DLFdBQVcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdILE9BQVgsQ0FBcEI7O0FBQ0EsUUFBSUMsV0FBVyxDQUFDLGFBQUQsQ0FBWCxLQUErQlosU0FBbkMsRUFBOEM7QUFDMUM7QUFDSDs7QUFDRDFDLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCNEIsSUFBdEIsQ0FBMkIwQixXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCeEUsV0FBdEQ7QUFDQWtCLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I0QixJQUFsQixDQUF1QjBCLFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkIvRCxPQUFsRDtBQUNBUyxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCNEIsSUFBaEIsQ0FBcUIwQixXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCakUsS0FBaEQ7QUFDQVcsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjNEIsSUFBZCxDQUFtQjBCLFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJHLEdBQTlDO0FBQ0EsUUFBSUMsUUFBUSxHQUFHSixXQUFXLENBQUNLLE9BQTNCOztBQUNBLFFBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNILFFBQWQsQ0FBTCxFQUE4QjtBQUMxQkEsTUFBQUEsUUFBUSxHQUFHLEVBQVg7QUFDQUEsTUFBQUEsUUFBUSxDQUFDSSxJQUFULENBQWNSLFdBQVcsQ0FBQ0ssT0FBMUI7QUFDSDs7QUFDRDNELElBQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCZ0QsS0FBM0I7QUFDQWhELElBQUFBLENBQUMsQ0FBQzZDLElBQUYsQ0FBT2EsUUFBUCxFQUFpQixVQUFDSyxHQUFELEVBQU1DLFlBQU4sRUFBdUI7QUFDcEMsVUFBSUEsWUFBWSxLQUFLdEIsU0FBckIsRUFBZ0M7QUFDNUI7QUFDSDs7QUFDRCxVQUFJdUIsR0FBRyxHQUFHLFVBQVY7QUFDQSxVQUFJTixPQUFPLEdBQUdLLFlBQWQ7O0FBQ0EsVUFBSUwsT0FBTyxDQUFDLGFBQUQsQ0FBUCxLQUEyQmpCLFNBQS9CLEVBQTBDO0FBQ3RDaUIsUUFBQUEsT0FBTyxHQUFHSyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNELFVBQU1FLFdBQVcsR0FBRyxJQUFJQyxJQUFKLENBQVNSLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQmhCLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsVUFBTWlCLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFVBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUN2QkQsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ05uRixlQUFlLENBQUNvRixXQURWLGFBQUg7QUFFSCxPQUhELE1BR08sSUFBSVosT0FBTyxDQUFDUyxPQUFSLENBQWdCbkQsTUFBaEIsS0FBMkIsQ0FBM0IsSUFBZ0MwQyxPQUFPLENBQUNhLEtBQVIsS0FBa0IsR0FBdEQsRUFBMkQ7QUFDOURQLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNObkYsZUFBZSxDQUFDb0YsV0FEVixhQUFIO0FBRUgsT0FITSxNQUdBO0FBQ0hOLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELENBQUg7O0FBQ0EsWUFBSVgsT0FBTyxDQUFDUyxPQUFSLENBQWdCbkQsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUIsY0FBSXdELFdBQVcsR0FBR0MsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQUNOLFlBQUFBLE9BQU8sRUFBRVQsT0FBTyxDQUFDUztBQUFsQixXQUFyQixDQUF0QjtBQUNBSCxVQUFBQSxHQUFHLHlCQUFrQlEsV0FBbEIsYUFBSDtBQUNIOztBQUNEUixRQUFBQSxHQUFHLElBQUksNkJBQVA7QUFDQWpFLFFBQUFBLENBQUMsQ0FBQzZDLElBQUYsQ0FBT21CLFlBQVksQ0FBQ1csT0FBcEIsRUFBNkIsVUFBQzdCLEtBQUQsRUFBUThCLFlBQVIsRUFBeUI7QUFFbEQsY0FBSUQsT0FBTyxHQUFHQyxZQUFkOztBQUNBLGNBQUlBLFlBQVksQ0FBQyxhQUFELENBQVosS0FBZ0NsQyxTQUFwQyxFQUErQztBQUMzQ2lDLFlBQUFBLE9BQU8sR0FBR0MsWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDSDs7QUFDRCxjQUFJQyxXQUFXLEdBQUdILElBQUksQ0FBQyxpQkFBRCxFQUFvQjtBQUFDSixZQUFBQSxJQUFJLEVBQUVLLE9BQU8sQ0FBQ0wsSUFBZjtBQUFxQlEsWUFBQUEsS0FBSyxFQUFFSCxPQUFPLENBQUNHLEtBQXBDO0FBQTJDQyxZQUFBQSxTQUFTLEVBQUVKLE9BQU8sQ0FBQ0ksU0FBOUQ7QUFBeUVDLFlBQUFBLFFBQVEsRUFBRUwsT0FBTyxDQUFDSztBQUEzRixXQUFwQixDQUF0QjtBQUNBZixVQUFBQSxHQUFHLGNBQU9ZLFdBQVAsU0FBSDtBQUNILFNBUkQ7QUFTQVosUUFBQUEsR0FBRyxJQUFJLFNBQVA7QUFDSDs7QUFDREEsTUFBQUEsR0FBRyxJQUFJLGtCQUFQO0FBQ0FqRSxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQmlGLE1BQTNCLENBQWtDaEIsR0FBbEM7QUFDSCxLQXJDRDtBQXNDSCxHQXhWWTs7QUEwVmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJaUIsRUFBQUEsZ0JBL1ZhLDRCQStWSUMsUUEvVkosRUErVmM7QUFDdkIsUUFBTUMsTUFBTSxHQUFHRCxRQUFmLENBRHVCLENBRXZCOztBQUNBQyxJQUFBQSxNQUFNLENBQUM1QyxJQUFQLEdBQWNqRixRQUFRLENBQUNDLFFBQVQsQ0FBa0I2SCxJQUFsQixDQUF1QixZQUF2QixDQUFkO0FBQ0EsV0FBT0QsTUFBUDtBQUNILEdBcFdZOztBQXNXYjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxlQTFXYSwyQkEwV0dyRCxRQTFXSCxFQTBXYTtBQUN0QjFFLElBQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQjJFLFdBQWxCLENBQThCLFNBQTlCO0FBQ0E1RSxJQUFBQSxRQUFRLENBQUNpQixjQUFULENBQXdCMkQsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0E1RSxJQUFBQSxRQUFRLENBQUNrQixxQkFBVCxDQUErQjBELFdBQS9CLENBQTJDLGtCQUEzQzs7QUFFQSxRQUFJRixRQUFRLENBQUNtRCxNQUFULEtBQW9CLElBQXhCLEVBQThCO0FBQzFCLFVBQUksT0FBT25ELFFBQVEsQ0FBQ08sSUFBVCxDQUFjK0MsVUFBckIsS0FBb0MsV0FBeEMsRUFBcUQ7QUFDakQ1RCxRQUFBQSxnQkFBZ0IsR0FBR00sUUFBUSxDQUFDTyxJQUFULENBQWMrQyxVQUFqQztBQUNBaEksUUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCNkgsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsUUFBcEMsRUFBOENwRCxRQUFRLENBQUNPLElBQVQsQ0FBYytDLFVBQTVEO0FBQ0g7O0FBQ0R2RixNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQndGLElBQTNCLENBQWdDLEVBQWhDO0FBRUFqSSxNQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0I2SCxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxRQUFwQyxFQUE4QyxFQUE5QyxFQVAwQixDQVMxQjtBQUNBO0FBQ0E7O0FBQ0E5SCxNQUFBQSxRQUFRLENBQUNtRSxxQkFBVDtBQUNBbkUsTUFBQUEsUUFBUSxDQUFDb0QseUJBQVQsR0FiMEIsQ0FjMUI7O0FBQ0E4RSxNQUFBQSxXQUFXLENBQUNDLE9BQVo7O0FBQ0EsVUFBSXpELFFBQVEsQ0FBQzBELFFBQVQsSUFBcUIxRCxRQUFRLENBQUMwRCxRQUFULENBQWtCMUUsTUFBbEIsS0FBNkIsQ0FBdEQsRUFBeUQ7QUFDckQyRSxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEI1RCxRQUFRLENBQUMwRCxRQUFyQztBQUNIO0FBQ0osS0FuQkQsTUFtQk8sSUFBSTFELFFBQVEsQ0FBQzBELFFBQVQsSUFBcUIxRCxRQUFRLENBQUMwRCxRQUFULENBQWtCRyxPQUFsQixLQUE4QnBELFNBQXZELEVBQWlFO0FBQ3BFa0QsTUFBQUEsV0FBVyxDQUFDRyxnQkFBWixDQUE2QjVHLGVBQWUsQ0FBQzZHLGdCQUE3QyxFQUErRC9ELFFBQVEsQ0FBQzBELFFBQVQsQ0FBa0JHLE9BQWpGO0FBQ0gsS0FGTSxNQUVBO0FBQ0hGLE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjVELFFBQVEsQ0FBQzBELFFBQXJDLEVBQStDeEcsZUFBZSxDQUFDNkcsZ0JBQS9EO0FBQ0gsS0E1QnFCLENBOEJ0Qjs7O0FBQ0E3RSxJQUFBQSxJQUFJLENBQUM4RSxXQUFMO0FBQ0gsR0ExWVk7O0FBNFliO0FBQ0o7QUFDQTtBQUNJeEUsRUFBQUEsY0EvWWEsNEJBK1lJO0FBQ2JOLElBQUFBLElBQUksQ0FBQzNELFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQTJELElBQUFBLElBQUksQ0FBQytFLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEIvRSxJQUFBQSxJQUFJLENBQUN0QyxhQUFMLEdBQXFCdEIsUUFBUSxDQUFDc0IsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NzQyxJQUFBQSxJQUFJLENBQUMrRCxnQkFBTCxHQUF3QjNILFFBQVEsQ0FBQzJILGdCQUFqQyxDQUphLENBSXNDOztBQUNuRC9ELElBQUFBLElBQUksQ0FBQ21FLGVBQUwsR0FBdUIvSCxRQUFRLENBQUMrSCxlQUFoQyxDQUxhLENBS29DO0FBRWpEOztBQUNBbkUsSUFBQUEsSUFBSSxDQUFDZ0YsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQWpGLElBQUFBLElBQUksQ0FBQ2dGLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCL0UsVUFBN0I7QUFDQUgsSUFBQUEsSUFBSSxDQUFDZ0YsV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsb0JBQTlCO0FBRUFuRixJQUFBQSxJQUFJLENBQUNwQixVQUFMO0FBQ0g7QUE1WlksQ0FBakI7QUErWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUMsQ0FBQyxDQUFDdUcsRUFBRixDQUFLbEIsSUFBTCxDQUFVRixRQUFWLENBQW1CbkcsS0FBbkIsQ0FBeUJ3SCwyQkFBekIsR0FBdUQsVUFBVUMsS0FBVixFQUFpQjtBQUNwRSxTQUFRbEosUUFBUSxDQUFDUyxPQUFULENBQWlCdUMsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENVLE1BQTVDLEtBQXVELEVBQXZELElBQTZEd0YsS0FBSyxDQUFDeEYsTUFBTixHQUFlLENBQXBGO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FqQixDQUFDLENBQUMwRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcEosRUFBQUEsUUFBUSxDQUFDd0MsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgVXNlck1lc3NhZ2UsIExpY2Vuc2VBUEksIGVudGl0bGVtZW50ICovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86IG51bGwsXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6IG51bGwsXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiBudWxsLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiBudWxsLFxuICAgICRjb3Vwb25TZWN0aW9uOiBudWxsLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogbnVsbCxcbiAgICAkbGljS2V5OiBudWxsLFxuICAgICRjb3Vwb246IG51bGwsXG4gICAgJGVtYWlsOiBudWxsLFxuICAgICRhamF4TWVzc2FnZXM6IG51bGwsXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiBudWxsLFxuICAgICRwcm9kdWN0RGV0YWlsczogbnVsbCxcbiAgICAkYWNjb3JkaW9uczogbnVsbCxcblxuICAgICRyZXNldEJ1dHRvbjogbnVsbCxcbiAgICAkc2F2ZUtleUJ1dHRvbjogbnVsbCxcbiAgICAkYWN0aXZhdGVDb3Vwb25CdXR0b246IG51bGwsXG4gICAgJG1hbmFnZUtleUJ1dHRvbjogbnVsbCxcblxuICAgICRyZXNldENvbmZpcm1Nb2RhbDogbnVsbCxcbiAgICAkY29uZmlybVJlc2V0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqID0gJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpO1xuICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mbyA9ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyID0gJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKTtcbiAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvID0gJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIgPSAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8gLmNvbmZpZGVudGlhbC1maWVsZCcpO1xuICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24gPSAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKTtcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24gPSAkKCcjY291cG9uU2VjdGlvbicpO1xuICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMgPSAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpO1xuICAgICAgICBrZXlDaGVjay4kbGljS2V5ID0gJCgnI2xpY0tleScpO1xuICAgICAgICBrZXlDaGVjay4kY291cG9uID0gJCgnI2NvdXBvbicpO1xuICAgICAgICBrZXlDaGVjay4kZW1haWwgPSAkKCcjZW1haWwnKTtcbiAgICAgICAga2V5Q2hlY2suJGFqYXhNZXNzYWdlcyA9ICQoJy51aS5tZXNzYWdlLmFqYXgnKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvID0gJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyk7XG4gICAgICAgIGtleUNoZWNrLiRwcm9kdWN0RGV0YWlscyA9ICQoJyNwcm9kdWN0RGV0YWlscycpO1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucyA9ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpO1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24gPSAkKCcjcmVzZXQtbGljZW5zZS1idXR0b24nKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24gPSAkKCcjc2F2ZS1saWNlbnNlLWtleS1idXR0b24nKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uID0gJCgnI2NvdXBvbi1hY3RpdmF0aW9uLWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uID0gJCgnI21hbmFnZS1saWNlbnNlLWJ1dHRvbicpO1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwgPSAkKCcjcmVzZXQtbGljZW5zZS1jb25maXJtLW1vZGFsJyk7XG4gICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24gPSAkKCcjY29uZmlybS1yZXNldC1saWNlbnNlLWJ1dHRvbicpO1xuXG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNhdmUga2V5IGJ1dHRvbiBjbGljay5cbiAgICAgICAgLy8gQmluZCB3aXRoIGEgbmFtZXNwYWNlZCAub2ZmKCkub24oKSBzbyBpbml0aWFsaXplKCkgaXMgaWRlbXBvdGVudDogaWYgaXRcbiAgICAgICAgLy8gaXMgZXZlciBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgdGhlIGhhbmRsZXIgaXMgcmVwbGFjZWQsIG5vdCBzdGFja2VkLlxuICAgICAgICAvLyBTdGFja2VkIGhhbmRsZXJzIHdvdWxkIGZpcmUgdGhlIHJlcXVlc3QgTiB0aW1lcyBwZXIgY2xpY2sg4oCUIHRoZSByb290IG9mXG4gICAgICAgIC8vIHRoZSBkdXBsaWNhdGUgY291cG9uIGFjdGl2YXRpb24gdGhhdCBwcm9kdWNlZCBhIGZhbHNlIDIwNDEgKGlzc3VlICMxMDg5KS5cbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ub2ZmKCdjbGljay5rZXlDaGVjaycpLm9uKCdjbGljay5rZXlDaGVjaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSByZXNldCBidXR0b24gY2xpY2sgaGFuZGxlclxuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24ub2ZmKCdjbGljay5rZXlDaGVjaycpLm9uKCdjbGljay5rZXlDaGVjaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldENvbmZpcm1Nb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY29uZmlybSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGNvbmZpcm1SZXNldEJ1dHRvbi5vZmYoJ2NsaWNrLmtleUNoZWNrJykub24oJ2NsaWNrLmtleUNoZWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb25maXJtUmVzZXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIExpY2Vuc2VBUEkucmVzZXRLZXkoa2V5Q2hlY2suY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRDb25maXJtTW9kYWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGFjdGl2YXRlIGNvdXBvbiBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLm9mZignY2xpY2sua2V5Q2hlY2snKS5vbignY2xpY2sua2V5Q2hlY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCAmJmtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICBrZXlDaGVjay5yZWZyZXNoTGljZW5zZUtleVZpZXcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCB0aGUgXCJsaWNlbnNlIGtleSBwcmVzZW50IC8gYWJzZW50XCIgYmxvY2sgZnJvbSBnbG9iYWxQQlhMaWNlbnNlLlxuICAgICAqIFNwbGl0IG91dCBvZiBpbml0aWFsaXplKCkgc28gY2JBZnRlclNlbmRGb3JtIGNhbiByZWZyZXNoIHRoZSB2aWV3IGFmdGVyIGFcbiAgICAgKiBzdWNjZXNzZnVsIHN1Ym1pdCBXSVRIT1VUIHJlLXJ1bm5pbmcgaW5pdGlhbGl6ZSgpIOKAlCB0aGUgbGF0dGVyIHJlLWJpbmRzXG4gICAgICogY2xpY2sgaGFuZGxlcnMgKGhlcmUgYW5kIGluIHRoZSBzaGFyZWQgRm9ybS5pbml0aWFsaXplKCkgZm9yICNzdWJtaXRidXR0b24pXG4gICAgICogYW5kIHdvdWxkIHN0YWNrIHRoZW0sIGZpcmluZyB0aGUgcmVxdWVzdCBOIHRpbWVzIHBlciBjbGljayAoaXNzdWUgIzEwODkpLlxuICAgICAqL1xuICAgIHJlZnJlc2hMaWNlbnNlS2V5VmlldygpIHtcbiAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlci50ZXh0KGdsb2JhbFBCWExpY2Vuc2UpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJG1hbmFnZUtleUJ1dHRvbi5hdHRyKCdocmVmJyxDb25maWcua2V5TWFuYWdlbWVudFVybCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmVzZXR0aW5nIHRoZSBsaWNlbnNlIGtleS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1N1Y2Nlc3NmdWwgLSBXaGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBhbmQgZGlzYWJsZWQgY2xhc3Nlc1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kY29uZmlybVJlc2V0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChpc1N1Y2Nlc3NmdWwgJiYgcmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1N1Y2Nlc3NmdWwgLSBXaGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlLCBpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgaWYgKGlzU3VjY2Vzc2Z1bCAmJiByZXNwb25zZS5kYXRhLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UuZGF0YS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBpZiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgaW5jb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGxpY2Vuc2Uga2V5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPLScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFRoZSBsaWNlbnNlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcbiAgICAgICAgJCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcbiAgICAgICAgJCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuICAgICAgICAkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcbiAgICAgICAgbGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuICAgICAgICAgICAgcHJvZHVjdHMgPSBbXTtcbiAgICAgICAgICAgIHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuZW1wdHkoKTtcbiAgICAgICAgJC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuICAgICAgICAgICAgbGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcbiAgICAgICAgICAgICAgICBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGlyZWRUZXh0ID0gaTE4bignbGljX0V4cGlyZWRBZnRlcicsIHtleHBpcmVkOiBwcm9kdWN0LmV4cGlyZWR9KTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JztcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlSW5mbyA9IGkxOG4oJ2xpY19GZWF0dXJlSW5mbycsIHtuYW1lOiBmZWF0dXJlLm5hbWUsIGNvdW50OiBmZWF0dXJlLmNvdW50LCBjb3VudGVhY2g6IGZlYXR1cmUuY291bnRlYWNoLCBjYXB0dXJlZDogZmVhdHVyZS5jYXB0dXJlZH0pO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyBmb3IgQVBJXG4gICAgICAgIHJlc3VsdC5kYXRhID0ga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSB2aWV3IG9ubHkg4oCUIGRvIE5PVCByZS1ydW4gaW5pdGlhbGl6ZSgpIGhlcmUsIG9yIGl0c1xuICAgICAgICAgICAgLy8gY2xpY2sgYmluZGluZ3MgKGFuZCBGb3JtLmluaXRpYWxpemUoKSdzICNzdWJtaXRidXR0b24gYmluZGluZylcbiAgICAgICAgICAgIC8vIHdvdWxkIHN0YWNrIGFuZCBkdXBsaWNhdGUgdGhlIHJlcXVlc3Qgb24gdGhlIG5leHQgY2xpY2sgKCMxMDg5KS5cbiAgICAgICAgICAgIGtleUNoZWNrLnJlZnJlc2hMaWNlbnNlS2V5VmlldygpO1xuICAgICAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuICAgICAgICAgICAgLy8gIzExNDg6IHRoZSBlbnRpdGxlbWVudCBibG9jayBqdWRnZXMgYnkgdGhlIGtleSDigJQgYSBzYXZlZCBrZXkgY2hhbmdlcyBpdHMgbGluZXMuXG4gICAgICAgICAgICBlbnRpdGxlbWVudC5yZWZyZXNoKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyAobW9kZXJuIHBhdHRlcm4pXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTGljZW5zZUFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3Byb2Nlc3NVc2VyUmVxdWVzdCc7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjAgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==