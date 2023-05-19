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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense*/
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return $('#licKey').val().length === 28 || value.length > 0;
};

var licensingModify = {
  $formObj: $('#licencing-modify-form'),
  $dirrtyField: $('#dirrty'),
  $goToLicenseManagementBTN: $('#changePageToLicensing'),
  $emptyLicenseKeyInfo: $('#empty-license-key-info'),
  $filledLicenseKeyInfo: $('#filled-license-key-info'),
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
  $licensingMenu: $('#licensing-menu .item'),
  $accordions: $('#licencing-modify-form .ui.accordion'),
  defaultLicenseKey: null,
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
  initialize: function initialize() {
    licensingModify.$licensingMenu.tab({
      historyType: 'hash'
    });

    if ($('#filled-license-key-info').length === 0) {
      licensingModify.$licensingMenu.tab('change tab', 'management'); // Нет интернет на станции. Форма не отрисована.

      return;
    }

    licensingModify.$accordions.accordion();
    licensingModify.$licenseDetailInfo.hide();
    licensingModify.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
      onBeforePaste: licensingModify.cbOnCouponBeforePaste
    });
    licensingModify.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
      oncomplete: licensingModify.cbOnLicenceKeyInputChange,
      onincomplete: licensingModify.cbOnLicenceKeyInputChange,
      clearIncomplete: true,
      onBeforePaste: licensingModify.cbOnLicenceKeyBeforePaste
    });
    licensingModify.$email.inputmask('email');
    licensingModify.defaultLicenseKey = licensingModify.$licKey.val();
    licensingModify.$resetButton.on('click', function () {
      licensingModify.$formObj.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(licensingModify.cbAfterResetLicenseKey);
    });
    licensingModify.cbOnLicenceKeyInputChange();
    licensingModify.initializeForm();

    if (licensingModify.defaultLicenseKey.length === 28) {
      licensingModify.$filledLicenseKeyInfo.html("".concat(licensingModify.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show();
      PbxApi.LicenseGetMikoPBXFeatureStatus(licensingModify.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(licensingModify.cbAfterGetLicenseInfo);
      licensingModify.$emptyLicenseKeyInfo.hide();
    } else {
      licensingModify.$filledLicenseKeyInfo.hide();
      licensingModify.$emptyLicenseKeyInfo.show();
    }

    if (licensingModify.defaultLicenseKey !== '') {
      licensingModify.$licensingMenu.tab('change tab', 'management');
    }

    licensingModify.$goToLicenseManagementBTN.on('click', function (e) {
      e.preventDefault();
      licensingModify.$licensingMenu.tab('change tab', 'management');
    });
  },

  /**
   * After send ResetLicenseKey callback
   * @param response
   */
  cbAfterResetLicenseKey: function cbAfterResetLicenseKey(response) {
    licensingModify.$formObj.removeClass('loading disabled');
    if (response !== false) window.location.reload();
  },

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetMikoPBXFeatureStatus: function cbAfterGetMikoPBXFeatureStatus(response) {
    $('.spinner.loading.icon').remove();
    licensingModify.$ajaxMessages.remove();

    if (response === true) {
      licensingModify.$formObj.removeClass('error').addClass('success');
      licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
    } else {
      licensingModify.$formObj.addClass('error').removeClass('success');

      if (response === false || response.messages === undefined) {
        $('#licFailInfo').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfo\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, "</div>"));
      } else {
        $('#licFailInfoMsg').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfoMsg\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.messages, "</div>"));
      }
    }
  },

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetLicenseInfo: function cbAfterGetLicenseInfo(response) {
    if (response.licenseInfo !== undefined) {
      licensingModify.showLicenseInfo(response.licenseInfo);
      licensingModify.$licenseDetailInfo.show();
    } else {
      licensingModify.$licenseDetailInfo.hide();
    }
  },

  /**
   * On change license key input field
   */
  cbOnLicenceKeyInputChange: function cbOnLicenceKeyInputChange() {
    var licKey = licensingModify.$licKey.val();

    if (licKey.length === 28) {
      licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).attr('hidden', '');
      });
      licensingModify.$getNewKeyLicenseSection.hide();
      licensingModify.$couponSection.show();
      licensingModify.$formErrorMessages.empty();
    } else {
      licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).removeAttr('hidden');
      });
      licensingModify.$getNewKeyLicenseSection.show();
      licensingModify.$couponSection.hide();
    }
  },

  /**
   * Callback after paste license key
   */
  cbOnLicenceKeyBeforePaste: function cbOnLicenceKeyBeforePaste(pastedValue) {
    if (pastedValue.indexOf('MIKO-') === -1) {
      licensingModify.$licKey.transition('shake');
      return false;
    }

    return pastedValue.replace(/\s+/g, '');
  },

  /**
   * Callback after paste license coupon
   */
  cbOnCouponBeforePaste: function cbOnCouponBeforePaste(pastedValue) {
    if (pastedValue.indexOf('MIKOUPD-') === -1) {
      licensingModify.$coupon.transition('shake');
      return false;
    }

    return pastedValue.replace(/\s+/g, '');
  },

  /**
   * Parses and builds license info presentation
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
        $('#licKey').val(response.data.PBXLicense);
      }

      $('#productDetails tbody').html('');
      $('#coupon').val('');
      licensingModify.initialize();

      if (response.messages.length !== 0) {
        UserMessage.showMultiString(response.messages);
      }
    } else if (response.messages !== undefined) {
      UserMessage.showMultiString(response.messages);
    } else {
      UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
    }

    licensingModify.$dirrtyField.val(Math.random());
    licensingModify.$dirrtyField.trigger('change');
  },
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    return settings;
  },
  cbAfterSendForm: function cbAfterSendForm() {
    var formData = licensingModify.$formObj.form('get values');
    PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
  },
  initializeForm: function initializeForm() {
    Form.$formObj = licensingModify.$formObj;
    Form.url = "".concat(globalRootUrl, "licensing/save");
    Form.validateRules = licensingModify.validateRules;
    Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm;
    Form.cbAfterSendForm = licensingModify.cbAfterSendForm;
    Form.initialize();
  }
};
$(document).ready(function () {
  licensingModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeVR5cGUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsImxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSIsImxpY2Vuc2VJbmZvIiwic2hvd0xpY2Vuc2VJbmZvIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsU0FBRCxDQUZRO0FBR3ZCWSxFQUFBQSx5QkFBeUIsRUFBQ1osQ0FBQyxDQUFDLHdCQUFELENBSEo7QUFJdkJhLEVBQUFBLG9CQUFvQixFQUFFYixDQUFDLENBQUMseUJBQUQsQ0FKQTtBQUt2QmMsRUFBQUEscUJBQXFCLEVBQUVkLENBQUMsQ0FBQywwQkFBRCxDQUxEO0FB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QUF2QztBQUNBRyxJQUFBQSxJQUFJLENBQUNsRyxVQUFMO0FBQ0E7QUFqVHNCLENBQXhCO0FBb1RBN0MsQ0FBQyxDQUFDa0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFJLEVBQUFBLGVBQWUsQ0FBQ29DLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlKi9cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRyZXR1cm4gKCQoJyNsaWNLZXknKS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuXHQkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXHQkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblx0JGdvVG9MaWNlbnNlTWFuYWdlbWVudEJUTjokKCcjY2hhbmdlUGFnZVRvTGljZW5zaW5nJyksXG5cdCRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcjZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJyNmaWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuXHQkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcblx0JGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXHQkbGljS2V5OiAkKCcjbGljS2V5JyksXG5cdCRjb3Vwb246ICQoJyNjb3Vwb24nKSxcblx0JGVtYWlsOiAkKCcjZW1haWwnKSxcblx0JGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuXHQkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuXHQkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG5cdCRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG5cdCRsaWNlbnNpbmdNZW51OiAkKCcjbGljZW5zaW5nLW1lbnUgLml0ZW0nKSxcblx0JGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXHRkZWZhdWx0TGljZW5zZUtleTogbnVsbCxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGNvbXBhbnluYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZW1haWw6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdlbWFpbCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvbnRhY3Q6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb250YWN0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRsaWNLZXk6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdsaWNLZXknLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvdXBvbjoge1xuXHRcdFx0ZGVwZW5kczogJ2xpY0tleScsXG5cdFx0XHRpZGVudGlmaWVyOiAnY291cG9uJyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoe1xuXHRcdFx0aGlzdG9yeVR5cGU6ICdoYXNoJyxcblx0XHR9KTtcblx0XHRpZigkKCcjZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKS5sZW5ndGggPT09IDApe1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0XHQvLyDQndC10YIg0LjQvdGC0LXRgNC90LXRgiDQvdCwINGB0YLQsNC90YbQuNC4LiDQpNC+0YDQvNCwINC90LUg0L7RgtGA0LjRgdC+0LLQsNC90LAuXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0b25pbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCgpPT57XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuXHRcdFx0XHQuaHRtbChgJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcblx0XHRcdFx0LnNob3coKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGdvVG9MaWNlbnNlTWFuYWdlbWVudEJUTi5vbignY2xpY2snLChlKT0+e1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0fSk7XG5cblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgUmVzZXRMaWNlbnNlS2V5IGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSl7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2UpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2Upe1xuXHRcdCQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdGlmIChyZXNwb25zZT09PXRydWUpe1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0aWYocmVzcG9uc2UgPT09IGZhbHNlIHx8IHJlc3BvbnNlLm1lc3NhZ2VzID09PSB1bmRlZmluZWQpe1xuXHRcdFx0XHQkKCcjbGljRmFpbEluZm8nKS5yZW1vdmUoKTtcblx0XHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBpZD1cImxpY0ZhaWxJbmZvXCIgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfRmFpbGVkQ2hlY2tMaWNlbnNlTm90UGJ4UmVzcG9uc2V9PC9kaXY+YCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0JCgnI2xpY0ZhaWxJbmZvTXNnJykucmVtb3ZlKCk7XG5cdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb01zZ1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtyZXNwb25zZS5tZXNzYWdlc308L2Rpdj5gKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2Upe1xuXHRcdGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE9uIGNoYW5nZSBsaWNlbnNlIGtleSBpbnB1dCBmaWVsZFxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcblx0XHRjb25zdCBsaWNLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2Uga2V5XG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGNvdXBvblxuXHQgKi9cblx0Y2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBQYXJzZXMgYW5kIGJ1aWxkcyBsaWNlbnNlIGluZm8gcHJlc2VudGF0aW9uXG5cdCAqL1xuXHRzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuXHRcdGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG5cdFx0JCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcblx0XHQkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG5cdFx0JCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG5cdFx0bGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG5cdFx0XHRwcm9kdWN0cyA9IFtdO1xuXHRcdFx0cHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcblx0XHR9XG5cdFx0JC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcblx0XHRcdGlmKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bGV0IHJvdyA9ICc8dHI+PHRkPic7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcblx0XHRcdGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuXHRcdFx0Y29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcblx0XHRcdFx0aWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG5cdFx0XHRcdFx0ZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+Jztcblx0XHRcdFx0JC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG5cdFx0XHRcdFx0aWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyb3cgKz0gJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdFx0cm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+Jztcblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gc3VjY2Vzc1xuXHQgKi9cblx0Y2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3M9PT10cnVlKXtcblx0XHRcdGlmKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0Z2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcblx0XHRcdFx0JCgnI2xpY0tleScpLnZhbChyZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpXG5cdFx0XHR9XG5cdFx0XHQkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5odG1sKCcnKTtcblx0XHRcdCQoJyNjb3Vwb24nKS52YWwoJycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcblx0XHRcdGlmKHJlc3BvbnNlLm1lc3NhZ2VzLmxlbmd0aCAhPT0gMCl7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdH1lbHNlIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dldFRyaWFsRXJyb3JDaGVja0ludGVybmV0KTtcblx0XHR9XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdHJldHVybiBzZXR0aW5ncztcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdGNvbnN0IGZvcm1EYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwgbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19