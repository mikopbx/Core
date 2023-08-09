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
  $getNewKeyLicenseSection: $('#getNewKeyLicenseSection'),
  $couponSection: $('#couponSection'),
  $formErrorMessages: $('#form-error-messages'),
  $licKey: $('#licKey'),
  $coupon: $('#coupon'),
  $email: $('#email'),
  $ajaxMessages: $('.ui.message.ajax'),
  $licenseDetailInfo: $('#licenseDetailInfo'),
  $resetButton: $('#reset-license'),
  $productDetails: $('#productDetails'),
  $accordions: $('#licencing-modify-form .ui.accordion'),

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
    keyCheck.$licenseDetailInfo.hide(); // Set input mask for coupon code field

    keyCheck.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
      onBeforePaste: keyCheck.cbOnCouponBeforePaste
    }); // Set input mask for license key field

    keyCheck.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
      oncomplete: keyCheck.cbOnLicenceKeyInputChange,
      onincomplete: keyCheck.cbOnLicenceKeyInputChange,
      clearIncomplete: true,
      onBeforePaste: keyCheck.cbOnLicenceKeyBeforePaste
    });
    keyCheck.$email.inputmask('email'); // Restore previous license error message to prevent blinking

    var previousKeyMessage = sessionStorage.getItem("previousKeyMessage".concat(globalWebAdminLanguage));

    if (previousKeyMessage && globalPBXLicense.length > 0) {
      UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, JSON.parse(previousKeyMessage), true);
    } // Handle reset button click


    keyCheck.$resetButton.on('click', function () {
      keyCheck.$formObj.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(keyCheck.cbAfterResetLicenseKey);
    });
    keyCheck.cbOnLicenceKeyInputChange();
    keyCheck.initializeForm(); // Check if a license key is present

    if (globalPBXLicense.length === 28) {
      keyCheck.$filledLicenseKeyInfo.html("".concat(globalPBXLicense, " <i class=\"spinner loading icon\"></i>")).show();
      keyCheck.$filledLicenseKeyHeader.show();
      keyCheck.$filledLicenseKeyInfo.after("<br>".concat(globalTranslate.lic_ManageLicenseKeyOnSitePreLinkText, "&nbsp<a href=\"").concat(Config.keyManagementUrl, "\" class=\"\">").concat(globalTranslate.lic_ManageLicenseKeyOnSiteLinkText, "</a>."));
      PbxApi.LicenseGetMikoPBXFeatureStatus(keyCheck.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(keyCheck.cbAfterGetLicenseInfo);
      keyCheck.$emptyLicenseKeyInfo.hide();
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
    // Remove the loading and disabled classes from the form
    keyCheck.$formObj.removeClass('loading disabled');

    if (response !== false) {
      // If the response is not false, indicating a successful license key reset,
      // reload the window to apply the changes
      window.location.reload();
    }
  },

  /**
   * Callback function triggered after getting the MikoPBX feature status.
   * @param {boolean|Object} response - The response indicating the MikoPBX feature status.
   */
  cbAfterGetMikoPBXFeatureStatus: function cbAfterGetMikoPBXFeatureStatus(response) {
    // Remove the loading spinner and any previous AJAX messages
    $('.spinner.loading.icon').remove();

    if (response === true) {
      // MikoPBX feature status is true (valid)
      keyCheck.$formObj.removeClass('error').addClass('success');
      keyCheck.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      keyCheck.$filledLicenseKeyHeader.show();
    } else {
      // MikoPBX feature status is false or an error occurred
      if (response === false || response.messages === undefined) {
        // Failed to check license status (response is false or no messages available)
        UserMessage.showMultiString(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, globalTranslate.lic_LicenseProblem);
        keyCheck.$filledLicenseKeyHeader.show();
      } else {
        // Failed to check license status with error messages
        sessionStorage.setItem("previousKeyMessage".concat(globalWebAdminLanguage), JSON.stringify(response.messages));
        UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, response.messages, true);
        keyCheck.$filledLicenseKeyHeader.show();
      }
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
    var licKey = keyCheck.$licKey.val();

    if (licKey.length === 28) {
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
          var expiredText = globalTranslate.lic_ExpiredAfter;
          expiredText = expiredText.replace('%expired%', product.expired);
          row += "<br><small>".concat(expiredText, "</small>");
        }

        row += '<br><span class="features">';
        $.each(productValue.feature, function (index, featureValue) {
          var featureInfo = globalTranslate.lic_FeatureInfo;
          var feature = featureValue;

          if (featureValue['@attributes'] !== undefined) {
            feature = featureValue['@attributes'];
          }

          featureInfo = featureInfo.replace('%name%', feature.name);
          featureInfo = featureInfo.replace('%count%', feature.count);
          featureInfo = featureInfo.replace('%counteach%', feature.counteach);
          featureInfo = featureInfo.replace('%captured%', feature.captured);
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
    } else if (response.messages !== undefined) {
      UserMessage.showMultiString(response.messages);
    } else {
      UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
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
  return keyCheck.$licKey.val().length === 28 || value.length > 0;
};
/**
 *  Initialize licensing modify form on document ready
 */


$(document).ready(function () {
  keyCheck.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCJ2YWxpZGF0ZVJ1bGVzIiwiY29tcGFueW5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJwcmV2aW91c0tleU1lc3NhZ2UiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiZ2xvYmFsUEJYTGljZW5zZSIsImxlbmd0aCIsIlVzZXJNZXNzYWdlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19MaWNlbnNlUHJvYmxlbSIsIkpTT04iLCJwYXJzZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJhZnRlciIsImxpY19NYW5hZ2VMaWNlbnNlS2V5T25TaXRlUHJlTGlua1RleHQiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwibGljX01hbmFnZUxpY2Vuc2VLZXlPblNpdGVMaW5rVGV4dCIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsInNob3dNdWx0aVN0cmluZyIsImxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsInZhbCIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJtZXNzYWdlIiwibGljZW5zZURhdGEiLCJ0ZXh0IiwidGVsIiwicHJvZHVjdHMiLCJwcm9kdWN0IiwiQXJyYXkiLCJpc0FycmF5IiwicHVzaCIsImtleSIsInByb2R1Y3RWYWx1ZSIsInJvdyIsImRhdGVFeHBpcmVkIiwiRGF0ZSIsImV4cGlyZWQiLCJkYXRlTm93IiwibmFtZSIsImxpY19FeHBpcmVkIiwidHJpYWwiLCJleHBpcmVkVGV4dCIsImxpY19FeHBpcmVkQWZ0ZXIiLCJmZWF0dXJlIiwiZmVhdHVyZVZhbHVlIiwiZmVhdHVyZUluZm8iLCJsaWNfRmVhdHVyZUluZm8iLCJjb3VudCIsImNvdW50ZWFjaCIsImNhcHR1cmVkIiwiYXBwZW5kIiwiY2JBZnRlckZvcm1Qcm9jZXNzaW5nIiwic3VjY2VzcyIsImRhdGEiLCJQQlhMaWNlbnNlIiwiZm9ybSIsInNob3dFcnJvciIsImxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxFO0FBT2JDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQVjtBQVFiRSxFQUFBQSx1QkFBdUIsRUFBRUYsQ0FBQyxDQUFDLDRCQUFELENBUmI7QUFTYkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRYO0FBVWJJLEVBQUFBLHdCQUF3QixFQUFFSixDQUFDLENBQUMsMEJBQUQsQ0FWZDtBQVdiSyxFQUFBQSxjQUFj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LENBQVVNLFFBQVYsQ0FBbUJ4SCxLQUFuQixDQUF5QitILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVFwSixRQUFRLENBQUNTLE9BQVQsQ0FBaUJnRixHQUFqQixHQUF1QnRDLE1BQXZCLEtBQWtDLEVBQWxDLElBQXdDaUcsS0FBSyxDQUFDakcsTUFBTixHQUFlLENBQS9EO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FqRCxDQUFDLENBQUNtSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdEosRUFBQUEsUUFBUSxDQUFDbUMsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgVXNlck1lc3NhZ2UqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtb2R1bGVzIGxpY2Vuc2Uga2V5XG4gKlxuICogQG1vZHVsZSBrZXlDaGVja1xuICovXG5jb25zdCBrZXlDaGVjayA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnLmVtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUhlYWRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG4gICAgJGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuICAgICRsaWNLZXk6ICQoJyNsaWNLZXknKSxcbiAgICAkY291cG9uOiAkKCcjY291cG9uJyksXG4gICAgJGVtYWlsOiAkKCcjZW1haWwnKSxcbiAgICAkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91cyBsaWNlbnNlIGVycm9yIG1lc3NhZ2UgdG8gcHJldmVudCBibGlua2luZ1xuICAgICAgICBjb25zdCBwcmV2aW91c0tleU1lc3NhZ2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIGlmIChwcmV2aW91c0tleU1lc3NhZ2UgJiYgZ2xvYmFsUEJYTGljZW5zZS5sZW5ndGg+MCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtLCBKU09OLnBhcnNlKHByZXZpb3VzS2V5TWVzc2FnZSksdHJ1ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShrZXlDaGVjay5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG4gICAgICAgIGtleUNoZWNrLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChnbG9iYWxQQlhMaWNlbnNlLmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuICAgICAgICAgICAgICAgIC5odG1sKGAke2dsb2JhbFBCWExpY2Vuc2V9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2VLZXlPblNpdGVQcmVMaW5rVGV4dH0mbmJzcDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIGNsYXNzPVwiXCI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2VLZXlPblNpdGVMaW5rVGV4dH08L2E+LmApXG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGtleUNoZWNrLmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGtleUNoZWNrLmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpcyBub3QgZmFsc2UsIGluZGljYXRpbmcgYSBzdWNjZXNzZnVsIGxpY2Vuc2Uga2V5IHJlc2V0LFxuICAgICAgICAgICAgLy8gcmVsb2FkIHRoZSB3aW5kb3cgdG8gYXBwbHkgdGhlIGNoYW5nZXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgc3Bpbm5lciBhbmQgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gTWlrb1BCWCBmZWF0dXJlIHN0YXR1cyBpcyB0cnVlICh2YWxpZClcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgZmFsc2Ugb3IgYW4gZXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgcmVzcG9uc2UubWVzc2FnZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyAocmVzcG9uc2UgaXMgZmFsc2Ugb3Igbm8gbWVzc2FnZXMgYXZhaWxhYmxlKVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNLZXlNZXNzYWdlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLm1lc3NhZ2VzKSk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtLCByZXNwb25zZS5tZXNzYWdlcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBjb25zdCBsaWNLZXkgPSBrZXlDaGVjay4kbGljS2V5LnZhbCgpO1xuICAgICAgICBpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2VzcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBrZXlDaGVjay5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBrZXlDaGVjay52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0ga2V5Q2hlY2suY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGtleUNoZWNrLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAoa2V5Q2hlY2suJGxpY0tleS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=