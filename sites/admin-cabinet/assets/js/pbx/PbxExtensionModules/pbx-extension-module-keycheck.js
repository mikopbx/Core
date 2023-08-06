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
        UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, response.messages, true);
        sessionStorage.setItem("previousKeyMessage".concat(globalWebAdminLanguage), JSON.stringify(response.messages));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCJ2YWxpZGF0ZVJ1bGVzIiwiY29tcGFueW5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJwcmV2aW91c0tleU1lc3NhZ2UiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiZ2xvYmFsUEJYTGljZW5zZSIsImxlbmd0aCIsIlVzZXJNZXNzYWdlIiwic2hvd0xpY2Vuc2VFcnJvciIsImxpY19MaWNlbnNlUHJvYmxlbSIsIkpTT04iLCJwYXJzZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJhZnRlciIsImxpY19NYW5hZ2VMaWNlbnNlS2V5T25TaXRlUHJlTGlua1RleHQiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwibGljX01hbmFnZUxpY2Vuc2VLZXlPblNpdGVMaW5rVGV4dCIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsInNob3dNdWx0aVN0cmluZyIsImxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsInZhbCIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJtZXNzYWdlIiwibGljZW5zZURhdGEiLCJ0ZXh0IiwidGVsIiwicHJvZHVjdHMiLCJwcm9kdWN0IiwiQXJyYXkiLCJpc0FycmF5IiwicHVzaCIsImtleSIsInByb2R1Y3RWYWx1ZSIsInJvdyIsImRhdGVFeHBpcmVkIiwiRGF0ZSIsImV4cGlyZWQiLCJkYXRlTm93IiwibmFtZSIsImxpY19FeHBpcmVkIiwidHJpYWwiLCJleHBpcmVkVGV4dCIsImxpY19FeHBpcmVkQWZ0ZXIiLCJmZWF0dXJlIiwiZmVhdHVyZVZhbHVlIiwiZmVhdHVyZUluZm8iLCJsaWNfRmVhdHVyZUluZm8iLCJjb3VudCIsImNvdW50ZWFjaCIsImNhcHR1cmVkIiwiYXBwZW5kIiwiY2JBZnRlckZvcm1Qcm9jZXNzaW5nIiwic3VjY2VzcyIsImRhdGEiLCJQQlhMaWNlbnNlIiwiZm9ybSIsInNob3dFcnJvciIsImxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxFO0FBT2JDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQVjtBQVFiRSxFQUFBQSx1QkFBdUIsRUFBRUYsQ0FBQyxDQUFDLDRCQUFELENBUmI7QUFTYkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRYO0FBVWJJLEVBQUFBLHdCQUF3QixFQUFFSixDQUFDLENBQUMsMEJBQUQsQ0FWZDtBQVdiSyxFQUFBQSxjQUFj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Q0FBVU0sUUFBVixDQUFtQnhILEtBQW5CLENBQXlCK0gsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDcEUsU0FBUXBKLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQmdGLEdBQWpCLEdBQXVCdEMsTUFBdkIsS0FBa0MsRUFBbEMsSUFBd0NpRyxLQUFLLENBQUNqRyxNQUFOLEdBQWUsQ0FBL0Q7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQWpELENBQUMsQ0FBQ21KLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ0SixFQUFBQSxRQUFRLENBQUNtQyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgICRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcuZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcbiAgICAkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcbiAgICAkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG4gICAgJGxpY0tleTogJCgnI2xpY0tleScpLFxuICAgICRjb3Vwb246ICQoJyNjb3Vwb24nKSxcbiAgICAkZW1haWw6ICQoJyNlbWFpbCcpLFxuICAgICRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcbiAgICAkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuICAgICRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcbiAgICAkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBjb21wYW55bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdlbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29udGFjdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbGljS2V5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbGljS2V5JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvdXBvbjoge1xuICAgICAgICAgICAgZGVwZW5kczogJ2xpY0tleScsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY291cG9uJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgbGljZW5zaW5nIHBhZ2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAga2V5Q2hlY2suJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgb25pbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblxuICAgICAgICAvLyBSZXN0b3JlIHByZXZpb3VzIGxpY2Vuc2UgZXJyb3IgbWVzc2FnZSB0byBwcmV2ZW50IGJsaW5raW5nXG4gICAgICAgIGNvbnN0IHByZXZpb3VzS2V5TWVzc2FnZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzS2V5TWVzc2FnZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgaWYgKHByZXZpb3VzS2V5TWVzc2FnZSAmJiBnbG9iYWxQQlhMaWNlbnNlLmxlbmd0aD4wKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZVByb2JsZW0sIEpTT04ucGFyc2UocHJldmlvdXNLZXlNZXNzYWdlKSx0cnVlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHJlc2V0IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGtleUNoZWNrLmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG4gICAgICAgICAgICAgICAgLmh0bWwoYCR7Z2xvYmFsUEJYTGljZW5zZX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZUtleU9uU2l0ZVByZUxpbmtUZXh0fSZuYnNwPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgY2xhc3M9XCJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZUtleU9uU2l0ZUxpbmtUZXh0fTwvYT4uYClcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMoa2V5Q2hlY2suY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8oa2V5Q2hlY2suY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJlc2V0dGluZyB0aGUgbGljZW5zZSBrZXkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBsaWNlbnNlIGtleSByZXNldC5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBhbmQgZGlzYWJsZWQgY2xhc3NlcyBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGlzIG5vdCBmYWxzZSwgaW5kaWNhdGluZyBhIHN1Y2Nlc3NmdWwgbGljZW5zZSBrZXkgcmVzZXQsXG4gICAgICAgICAgICAvLyByZWxvYWQgdGhlIHdpbmRvdyB0byBhcHBseSB0aGUgY2hhbmdlc1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciBnZXR0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICovXG4gICAgY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBzcGlubmVyIGFuZCBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIHRydWUgKHZhbGlkKVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZUtleVZhbGlkfTwvZGl2PmApO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTWlrb1BCWCBmZWF0dXJlIHN0YXR1cyBpcyBmYWxzZSBvciBhbiBlcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCByZXNwb25zZS5tZXNzYWdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGNoZWNrIGxpY2Vuc2Ugc3RhdHVzIChyZXNwb25zZSBpcyBmYWxzZSBvciBubyBtZXNzYWdlcyBhdmFpbGFibGUpXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5saWNfRmFpbGVkQ2hlY2tMaWNlbnNlTm90UGJ4UmVzcG9uc2UsIGdsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZVByb2JsZW0pO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGNoZWNrIGxpY2Vuc2Ugc3RhdHVzIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZVByb2JsZW0sIHJlc3BvbnNlLm1lc3NhZ2VzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UubWVzc2FnZXMpKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGxpY0tleSA9IGtleUNoZWNrLiRsaWNLZXkudmFsKCk7XG4gICAgICAgIGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGluY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBsaWNlbnNlIGtleSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLTy0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBjb3Vwb24gZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS09VUEQtJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuICAgICAgICAgICAgICAgICAgICBleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgY2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgUGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGtleUNoZWNrLmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGtleUNoZWNrLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGtleUNoZWNrLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBrZXlDaGVjay5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0ga2V5Q2hlY2suY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==