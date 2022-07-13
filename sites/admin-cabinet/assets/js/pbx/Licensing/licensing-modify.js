"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeVR5cGUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsImxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSIsImxpY2Vuc2VJbmZvIiwic2hvd0xpY2Vuc2VJbmZvIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsU0FBRCxDQUZRO0FBR3ZCWSxFQUFBQSx5QkFBeUIsRUFBQ1osQ0FBQyxDQUFDLHdCQUFELENBSEo7QUFJdkJhLEVBQUFBLG9CQUFvQixFQUFFYixDQUFDLENBQUMseUJBQUQsQ0FKQTtBQUt2QmMsRUFBQUEscUJBQXFCLEVBQUVkLENBQUMsQ0FBQywwQkFBRCxDQUxEO0FBTXZCZSxFQUFBQSx3QkFBd0IsRUFBRWYsQ0FBQyxDQUFDLDBCQUFELENBTko7QUFPdkJnQixFQUFBQSxjQUFjLEVBQUVoQixDQUFDLENBQUMsZ0JBQUQsQ0FQTTtBQVF2QmlCLEVBQUFBLGtCQUFrQixFQUFFakIsQ0FBQyxDQUFDLHNCQUFELENBUkU7QUFTdkJrQixFQUFBQSxPQUFPLEVBQUVsQixDQUFDLENBQUMsU0FBRCxDQVRhO0FBVXZCbUIsRUFBQUEsT0FBTyxFQUFFbkIsQ0FBQyxDQUFDLFNBQUQsQ0FWYTtBQVd2Qm9CLEVBQUFBLE1BQU0sRUFBRXBCLENBQUMsQ0FBQyxRQUFELENBWGM7QUFZdkJxQixFQUFBQSxhQUFhLEVBQUVyQixDQUFDLENBQUMsa0JBQUQsQ0FaTztBQWF2QnNCLEVBQUFBLGtCQUFrQixFQUFFdEIsQ0FBQyxDQUFDLG9CQUFELENBYkU7QUFjdkJ1QixFQUFBQSxZQUFZLEVBQUV2QixDQUFDLENBQUMsZ0JBQUQsQ0FkUTtBQWV2QndCLEVBQUFBLGVBQWUsRUFBRXhCLENBQUMsQ0FBQyxpQkFBRCxDQWZLO0FBZ0J2QnlCLEVBQUFBLGNBQWMsRUFBRXpCLENBQUMsQ0FBQyx1QkFBRCxDQWhCTTtBQWlCdkIwQixFQUFBQSxXQUFXLEVBQUUxQixDQUFDLENBQUMsc0NBQUQsQ0FqQlM7QUFrQnZCMkIsRUFBQUEsaUJBQWlCLEVBQUUsSUFsQkk7QUFtQnZCQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1pDLE1BQUFBLFVBQVUsRUFBRSxhQURBO0FBRVoxQixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMkIsUUFBQUEsSUFBSSxFQUFFLDZCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkssS0FEQztBQVVkQyxJQUFBQSxLQUFLLEVBQUU7QUFDTkwsTUFBQUEsVUFBVSxFQUFFLE9BRE47QUFFTjFCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MyQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRCxLQVZPO0FBbUJkQyxJQUFBQSxPQUFPLEVBQUU7QUFDUlAsTUFBQUEsVUFBVSxFQUFFLFNBREo7QUFFUjFCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MyQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRnpCLE9BRE07QUFGQyxLQW5CSztBQTRCZEMsSUFBQUEsTUFBTSxFQUFFO0FBQ1BULE1BQUFBLFVBQVUsRUFBRSxRQURMO0FBRVBVLE1BQUFBLFFBQVEsRUFBRSxJQUZIO0FBR1BwQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMkIsUUFBQUEsSUFBSSxFQUFFLGlCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDUTtBQUZ6QixPQURNO0FBSEEsS0E1Qk07QUFzQ2RDLElBQUFBLE1BQU0sRUFBRTtBQUNQQyxNQUFBQSxPQUFPLEVBQUUsUUFERjtBQUVQYixNQUFBQSxVQUFVLEVBQUUsUUFGTDtBQUdQVSxNQUFBQSxRQUFRLEVBQUUsSUFISDtBQUlQcEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQzJCLFFBQUFBLElBQUksRUFBRSxpQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGekIsT0FETTtBQUpBO0FBdENNLEdBbkJRO0FBcUV2QkMsRUFBQUEsVUFyRXVCLHdCQXFFVjtBQUNacEMsSUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0JxQixHQUEvQixDQUFtQztBQUNsQ0MsTUFBQUEsV0FBVyxFQUFFO0FBRHFCLEtBQW5DOztBQUdBLFFBQUcvQyxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QlEsTUFBOUIsS0FBeUMsQ0FBNUMsRUFBOEM7QUFDN0NDLE1BQUFBLGVBQWUsQ0FBQ2dCLGNBQWhCLENBQStCcUIsR0FBL0IsQ0FBbUMsWUFBbkMsRUFBaUQsWUFBakQsRUFENkMsQ0FFN0M7O0FBQ0E7QUFDQTs7QUFDRHJDLElBQUFBLGVBQWUsQ0FBQ2lCLFdBQWhCLENBQTRCc0IsU0FBNUI7QUFDQXZDLElBQUFBLGVBQWUsQ0FBQ2Esa0JBQWhCLENBQW1DMkIsSUFBbkM7QUFDQXhDLElBQUFBLGVBQWUsQ0FBQ1UsT0FBaEIsQ0FBd0IrQixTQUF4QixDQUFrQyxpQ0FBbEMsRUFBcUU7QUFDcEVDLE1BQUFBLGFBQWEsRUFBRTFDLGVBQWUsQ0FBQzJDO0FBRHFDLEtBQXJFO0FBR0EzQyxJQUFBQSxlQUFlLENBQUNTLE9BQWhCLENBQXdCZ0MsU0FBeEIsQ0FBa0MsOEJBQWxDLEVBQWtFO0FBQ2pFRyxNQUFBQSxVQUFVLEVBQUU1QyxlQUFlLENBQUM2Qyx5QkFEcUM7QUFFakVDLE1BQUFBLFlBQVksRUFBRTlDLGVBQWUsQ0FBQzZDLHlCQUZtQztBQUdqRUUsTUFBQUEsZUFBZSxFQUFFLElBSGdEO0FBSWpFTCxNQUFBQSxhQUFhLEVBQUUxQyxlQUFlLENBQUNnRDtBQUprQyxLQUFsRTtBQU1BaEQsSUFBQUEsZUFBZSxDQUFDVyxNQUFoQixDQUF1QjhCLFNBQXZCLENBQWlDLE9BQWpDO0FBQ0F6QyxJQUFBQSxlQUFlLENBQUNrQixpQkFBaEIsR0FBb0NsQixlQUFlLENBQUNTLE9BQWhCLENBQXdCWCxHQUF4QixFQUFwQztBQUVBRSxJQUFBQSxlQUFlLENBQUNjLFlBQWhCLENBQTZCbUMsRUFBN0IsQ0FBZ0MsT0FBaEMsRUFBd0MsWUFBSTtBQUMzQ2pELE1BQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJpRCxRQUF6QixDQUFrQyxrQkFBbEM7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxzQkFBUCxDQUE4QnBELGVBQWUsQ0FBQ3FELHNCQUE5QztBQUNBLEtBSEQ7QUFLQXJELElBQUFBLGVBQWUsQ0FBQzZDLHlCQUFoQjtBQUVBN0MsSUFBQUEsZUFBZSxDQUFDc0QsY0FBaEI7O0FBRUEsUUFBSXRELGVBQWUsQ0FBQ2tCLGlCQUFoQixDQUFrQ25CLE1BQWxDLEtBQTZDLEVBQWpELEVBQXFEO0FBQ3BEQyxNQUFBQSxlQUFlLENBQUNLLHFCQUFoQixDQUNFa0QsSUFERixXQUNVdkQsZUFBZSxDQUFDa0IsaUJBRDFCLDhDQUVFc0MsSUFGRjtBQUdBTCxNQUFBQSxNQUFNLENBQUNNLDhCQUFQLENBQXNDekQsZUFBZSxDQUFDMEQsOEJBQXREO0FBQ0FQLE1BQUFBLE1BQU0sQ0FBQ1EscUJBQVAsQ0FBNkIzRCxlQUFlLENBQUM0RCxxQkFBN0M7QUFDQTVELE1BQUFBLGVBQWUsQ0FBQ0ksb0JBQWhCLENBQXFDb0MsSUFBckM7QUFDQSxLQVBELE1BT087QUFDTnhDLE1BQUFBLGVBQWUsQ0FBQ0sscUJBQWhCLENBQXNDbUMsSUFBdEM7QUFDQXhDLE1BQUFBLGVBQWUsQ0FBQ0ksb0JBQWhCLENBQXFDb0QsSUFBckM7QUFDQTs7QUFFRCxRQUFJeEQsZUFBZSxDQUFDa0IsaUJBQWhCLEtBQXNDLEVBQTFDLEVBQThDO0FBQzdDbEIsTUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0JxQixHQUEvQixDQUFtQyxZQUFuQyxFQUFpRCxZQUFqRDtBQUNBOztBQUVEckMsSUFBQUEsZUFBZSxDQUFDRyx5QkFBaEIsQ0FBMEM4QyxFQUExQyxDQUE2QyxPQUE3QyxFQUFxRCxVQUFDWSxDQUFELEVBQUs7QUFDekRBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBOUQsTUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0JxQixHQUEvQixDQUFtQyxZQUFuQyxFQUFpRCxZQUFqRDtBQUNBLEtBSEQ7QUFLQSxHQTFIc0I7O0FBMkh2QjtBQUNEO0FBQ0E7QUFDQTtBQUNDZ0IsRUFBQUEsc0JBL0h1QixrQ0ErSEFVLFFBL0hBLEVBK0hTO0FBQy9CL0QsSUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QitELFdBQXpCLENBQXFDLGtCQUFyQztBQUNBLFFBQUlELFFBQVEsS0FBRyxLQUFmLEVBQXNCRSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ3RCLEdBbElzQjs7QUFtSXZCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NULEVBQUFBLDhCQXZJdUIsMENBdUlRSyxRQXZJUixFQXVJaUI7QUFDdkN4RSxJQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQjZFLE1BQTNCO0FBQ0FwRSxJQUFBQSxlQUFlLENBQUNZLGFBQWhCLENBQThCd0QsTUFBOUI7O0FBQ0EsUUFBSUwsUUFBUSxLQUFHLElBQWYsRUFBb0I7QUFDbkIvRCxNQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCK0QsV0FBekIsQ0FBcUMsT0FBckMsRUFBOENkLFFBQTlDLENBQXVELFNBQXZEO0FBQ0FsRCxNQUFBQSxlQUFlLENBQUNLLHFCQUFoQixDQUFzQ2dFLEtBQXRDLHFGQUFxSDdDLGVBQWUsQ0FBQzhDLG1CQUFySTtBQUNBLEtBSEQsTUFHTztBQUNOdEUsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QmlELFFBQXpCLENBQWtDLE9BQWxDLEVBQTJDYyxXQUEzQyxDQUF1RCxTQUF2RDs7QUFDQSxVQUFHRCxRQUFRLEtBQUssS0FBYixJQUFzQkEsUUFBUSxDQUFDUSxRQUFULEtBQXNCQyxTQUEvQyxFQUF5RDtBQUN4RGpGLFFBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I2RSxNQUFsQjtBQUNBcEUsUUFBQUEsZUFBZSxDQUFDSyxxQkFBaEIsQ0FBc0NnRSxLQUF0QyxtSEFBaUo3QyxlQUFlLENBQUNpRCxvQ0FBaks7QUFDQSxPQUhELE1BR0s7QUFDSmxGLFFBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCNkUsTUFBckI7QUFDQXBFLFFBQUFBLGVBQWUsQ0FBQ0sscUJBQWhCLENBQXNDZ0UsS0FBdEMsc0hBQW9KTixRQUFRLENBQUNRLFFBQTdKO0FBQ0E7QUFDRDtBQUNELEdBdkpzQjs7QUF5SnZCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NYLEVBQUFBLHFCQTdKdUIsaUNBNkpERyxRQTdKQyxFQTZKUTtBQUM5QixRQUFJQSxRQUFRLENBQUNXLFdBQVQsS0FBeUJGLFNBQTdCLEVBQXdDO0FBQ3ZDeEUsTUFBQUEsZUFBZSxDQUFDMkUsZUFBaEIsQ0FBZ0NaLFFBQVEsQ0FBQ1csV0FBekM7QUFDQTFFLE1BQUFBLGVBQWUsQ0FBQ2Esa0JBQWhCLENBQW1DMkMsSUFBbkM7QUFDQSxLQUhELE1BR087QUFDTnhELE1BQUFBLGVBQWUsQ0FBQ2Esa0JBQWhCLENBQW1DMkIsSUFBbkM7QUFDQTtBQUNELEdBcEtzQjs7QUFzS3ZCO0FBQ0Q7QUFDQTtBQUNDSyxFQUFBQSx5QkF6S3VCLHVDQXlLSztBQUMzQixRQUFNZixNQUFNLEdBQUc5QixlQUFlLENBQUNTLE9BQWhCLENBQXdCWCxHQUF4QixFQUFmOztBQUNBLFFBQUlnQyxNQUFNLENBQUMvQixNQUFQLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3pCQyxNQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCMkUsSUFBekIsQ0FBOEIsZ0JBQTlCLEVBQWdEQyxJQUFoRCxDQUFxRCxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDcEV4RixRQUFBQSxDQUFDLENBQUN3RixHQUFELENBQUQsQ0FBT0MsSUFBUCxDQUFZLFFBQVosRUFBc0IsRUFBdEI7QUFDQSxPQUZEO0FBR0FoRixNQUFBQSxlQUFlLENBQUNNLHdCQUFoQixDQUF5Q2tDLElBQXpDO0FBQ0F4QyxNQUFBQSxlQUFlLENBQUNPLGNBQWhCLENBQStCaUQsSUFBL0I7QUFDQXhELE1BQUFBLGVBQWUsQ0FBQ1Esa0JBQWhCLENBQW1DeUUsS0FBbkM7QUFDQSxLQVBELE1BT087QUFDTmpGLE1BQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUIyRSxJQUF6QixDQUE4QixnQkFBOUIsRUFBZ0RDLElBQWhELENBQXFELFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNwRXhGLFFBQUFBLENBQUMsQ0FBQ3dGLEdBQUQsQ0FBRCxDQUFPRyxVQUFQLENBQWtCLFFBQWxCO0FBQ0EsT0FGRDtBQUdBbEYsTUFBQUEsZUFBZSxDQUFDTSx3QkFBaEIsQ0FBeUNrRCxJQUF6QztBQUNBeEQsTUFBQUEsZUFBZSxDQUFDTyxjQUFoQixDQUErQmlDLElBQS9CO0FBQ0E7QUFDRCxHQXpMc0I7O0FBMEx2QjtBQUNEO0FBQ0E7QUFDQ1EsRUFBQUEseUJBN0x1QixxQ0E2TEdtQyxXQTdMSCxFQTZMZ0I7QUFDdEMsUUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLE9BQXBCLE1BQWlDLENBQUMsQ0FBdEMsRUFBeUM7QUFDeENwRixNQUFBQSxlQUFlLENBQUNTLE9BQWhCLENBQXdCNEUsVUFBeEIsQ0FBbUMsT0FBbkM7QUFDQSxhQUFPLEtBQVA7QUFDQTs7QUFDRCxXQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNBLEdBbk1zQjs7QUFvTXZCO0FBQ0Q7QUFDQTtBQUNDM0MsRUFBQUEscUJBdk11QixpQ0F1TUR3QyxXQXZNQyxFQXVNWTtBQUNsQyxRQUFJQSxXQUFXLENBQUNDLE9BQVosQ0FBb0IsVUFBcEIsTUFBb0MsQ0FBQyxDQUF6QyxFQUE0QztBQUMzQ3BGLE1BQUFBLGVBQWUsQ0FBQ1UsT0FBaEIsQ0FBd0IyRSxVQUF4QixDQUFtQyxPQUFuQztBQUNBLGFBQU8sS0FBUDtBQUNBOztBQUNELFdBQU9GLFdBQVcsQ0FBQ0csT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFQO0FBQ0EsR0E3TXNCOztBQThNdkI7QUFDRDtBQUNBO0FBQ0NYLEVBQUFBLGVBak51QiwyQkFpTlBZLE9Bak5PLEVBaU5FO0FBQ3hCLFFBQU1DLFdBQVcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdILE9BQVgsQ0FBcEI7O0FBQ0EsUUFBSUMsV0FBVyxDQUFDLGFBQUQsQ0FBWCxLQUErQmhCLFNBQW5DLEVBQThDO0FBQzdDO0FBQ0E7O0FBQ0RqRixJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQm9HLElBQXRCLENBQTJCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCcEUsV0FBdEQ7QUFDQTdCLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JvRyxJQUFsQixDQUF1QkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQjVELE9BQWxEO0FBQ0FyQyxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCb0csSUFBaEIsQ0FBcUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkI5RCxLQUFoRDtBQUNBbkMsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjb0csSUFBZCxDQUFtQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQkksR0FBOUM7QUFDQSxRQUFJQyxRQUFRLEdBQUdMLFdBQVcsQ0FBQ00sT0FBM0I7O0FBQ0EsUUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsUUFBZCxDQUFMLEVBQThCO0FBQzdCQSxNQUFBQSxRQUFRLEdBQUcsRUFBWDtBQUNBQSxNQUFBQSxRQUFRLENBQUNJLElBQVQsQ0FBY1QsV0FBVyxDQUFDTSxPQUExQjtBQUNBOztBQUNEdkcsSUFBQUEsQ0FBQyxDQUFDc0YsSUFBRixDQUFPZ0IsUUFBUCxFQUFpQixVQUFDSyxHQUFELEVBQU1DLFlBQU4sRUFBdUI7QUFDdkMsVUFBSUMsR0FBRyxHQUFHLFVBQVY7QUFDQSxVQUFJTixPQUFPLEdBQUdLLFlBQWQ7O0FBQ0EsVUFBSUwsT0FBTyxDQUFDLGFBQUQsQ0FBUCxLQUEyQnRCLFNBQS9CLEVBQTBDO0FBQ3pDc0IsUUFBQUEsT0FBTyxHQUFHSyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNBOztBQUNELFVBQU1FLFdBQVcsR0FBRyxJQUFJQyxJQUFKLENBQVNSLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQmpCLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsVUFBTWtCLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFVBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUMxQkQsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ01qRixlQUFlLENBQUNrRixXQUR0QixhQUFIO0FBRUEsT0FIRCxNQUdPLElBQUlaLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQnhHLE1BQWhCLEtBQTJCLENBQTNCLElBQWdDK0YsT0FBTyxDQUFDYSxLQUFSLEtBQWtCLEdBQXRELEVBQTJEO0FBQ2pFUCxRQUFBQSxHQUFHLGlEQUF3Q04sT0FBTyxDQUFDVyxJQUFoRCxrQ0FDTWpGLGVBQWUsQ0FBQ2tGLFdBRHRCLGFBQUg7QUFFQSxPQUhNLE1BR0E7QUFDTk4sUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsQ0FBSDs7QUFDQSxZQUFJWCxPQUFPLENBQUNTLE9BQVIsQ0FBZ0J4RyxNQUFoQixHQUF5QixDQUE3QixFQUFnQztBQUMvQixjQUFJNkcsV0FBVyxHQUFHcEYsZUFBZSxDQUFDcUYsZ0JBQWxDO0FBQ0FELFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDdEIsT0FBWixDQUFvQixXQUFwQixFQUFpQ1EsT0FBTyxDQUFDUyxPQUF6QyxDQUFkO0FBQ0FILFVBQUFBLEdBQUcseUJBQWtCUSxXQUFsQixhQUFIO0FBQ0E7O0FBQ0RSLFFBQUFBLEdBQUcsSUFBSSw2QkFBUDtBQUNBN0csUUFBQUEsQ0FBQyxDQUFDc0YsSUFBRixDQUFPc0IsWUFBWSxDQUFDVyxPQUFwQixFQUE2QixVQUFDaEMsS0FBRCxFQUFRaUMsWUFBUixFQUF5QjtBQUNyRCxjQUFJQyxXQUFXLEdBQUd4RixlQUFlLENBQUN5RixlQUFsQztBQUNBLGNBQUlILE9BQU8sR0FBR0MsWUFBZDs7QUFDQSxjQUFJQSxZQUFZLENBQUMsYUFBRCxDQUFaLEtBQWdDdkMsU0FBcEMsRUFBK0M7QUFDOUNzQyxZQUFBQSxPQUFPLEdBQUdDLFlBQVksQ0FBQyxhQUFELENBQXRCO0FBQ0E7O0FBQ0RDLFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDMUIsT0FBWixDQUFvQixRQUFwQixFQUE4QndCLE9BQU8sQ0FBQ0wsSUFBdEMsQ0FBZDtBQUNBTyxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzFCLE9BQVosQ0FBb0IsU0FBcEIsRUFBK0J3QixPQUFPLENBQUNJLEtBQXZDLENBQWQ7QUFDQUYsVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLGFBQXBCLEVBQW1Dd0IsT0FBTyxDQUFDSyxTQUEzQyxDQUFkO0FBQ0FILFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDMUIsT0FBWixDQUFvQixZQUFwQixFQUFrQ3dCLE9BQU8sQ0FBQ00sUUFBMUMsQ0FBZDtBQUNBaEIsVUFBQUEsR0FBRyxjQUFPWSxXQUFQLFNBQUg7QUFDQSxTQVhEO0FBWUFaLFFBQUFBLEdBQUcsSUFBSSxTQUFQO0FBQ0E7O0FBQ0RBLE1BQUFBLEdBQUcsSUFBSSxrQkFBUDtBQUNBN0csTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI4SCxNQUEzQixDQUFrQ2pCLEdBQWxDO0FBQ0EsS0F0Q0Q7QUF1Q0EsR0F0UXNCOztBQXVRdkI7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNDa0IsRUFBQUEscUJBNVF1QixpQ0E0UUR2RCxRQTVRQyxFQTRRU3dELE9BNVFULEVBNFFrQjtBQUN4QyxRQUFJQSxPQUFPLEtBQUcsSUFBZCxFQUFtQjtBQUNsQixVQUFHLE9BQU94RCxRQUFRLENBQUN5RCxJQUFULENBQWNDLFVBQXJCLEtBQW9DLFdBQXZDLEVBQW1EO0FBQ2xEQyxRQUFBQSxnQkFBZ0IsR0FBRzNELFFBQVEsQ0FBQ3lELElBQVQsQ0FBY0MsVUFBakM7QUFDQWxJLFFBQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYU8sR0FBYixDQUFpQmlFLFFBQVEsQ0FBQ3lELElBQVQsQ0FBY0MsVUFBL0I7QUFDQTs7QUFDRGxJLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCZ0UsSUFBM0IsQ0FBZ0MsRUFBaEM7QUFDQWhFLE1BQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYU8sR0FBYixDQUFpQixFQUFqQjtBQUNBRSxNQUFBQSxlQUFlLENBQUNvQyxVQUFoQjs7QUFDQSxVQUFHMkIsUUFBUSxDQUFDUSxRQUFULENBQWtCeEUsTUFBbEIsS0FBNkIsQ0FBaEMsRUFBa0M7QUFDakM0SCxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEI3RCxRQUFRLENBQUNRLFFBQXJDO0FBQ0E7QUFDRCxLQVhELE1BV08sSUFBSVIsUUFBUSxDQUFDUSxRQUFULEtBQXNCQyxTQUExQixFQUFxQztBQUMzQ21ELE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjdELFFBQVEsQ0FBQ1EsUUFBckM7QUFDQSxLQUZNLE1BRUQ7QUFDTG9ELE1BQUFBLFdBQVcsQ0FBQ0UsU0FBWixDQUFzQnJHLGVBQWUsQ0FBQ3NHLDhCQUF0QztBQUNBOztBQUNEOUgsSUFBQUEsZUFBZSxDQUFDRSxZQUFoQixDQUE2QkosR0FBN0IsQ0FBaUNpSSxJQUFJLENBQUNDLE1BQUwsRUFBakM7QUFDQWhJLElBQUFBLGVBQWUsQ0FBQ0UsWUFBaEIsQ0FBNkIrSCxPQUE3QixDQUFxQyxRQUFyQztBQUNBLEdBL1JzQjtBQWdTdkJDLEVBQUFBLGdCQWhTdUIsNEJBZ1NOeEksUUFoU00sRUFnU0k7QUFDMUIsV0FBT0EsUUFBUDtBQUNBLEdBbFNzQjtBQW1TdkJ5SSxFQUFBQSxlQW5TdUIsNkJBbVNMO0FBQ2pCLFFBQU1DLFFBQVEsR0FBR3BJLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJSLElBQXpCLENBQThCLFlBQTlCLENBQWpCO0FBQ0EwRCxJQUFBQSxNQUFNLENBQUNrRix5QkFBUCxDQUFpQ0QsUUFBakMsRUFBMkNwSSxlQUFlLENBQUNzSCxxQkFBM0Q7QUFDQSxHQXRTc0I7QUF1U3ZCaEUsRUFBQUEsY0F2U3VCLDRCQXVTTjtBQUNoQmdGLElBQUFBLElBQUksQ0FBQ3JJLFFBQUwsR0FBZ0JELGVBQWUsQ0FBQ0MsUUFBaEM7QUFDQXFJLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLElBQUFBLElBQUksQ0FBQ25ILGFBQUwsR0FBcUJuQixlQUFlLENBQUNtQixhQUFyQztBQUNBbUgsSUFBQUEsSUFBSSxDQUFDSixnQkFBTCxHQUF3QmxJLGVBQWUsQ0FBQ2tJLGdCQUF4QztBQUNBSSxJQUFBQSxJQUFJLENBQUNILGVBQUwsR0FBdUJuSSxlQUFlLENBQUNtSSxlQUF2QztBQUNBRyxJQUFBQSxJQUFJLENBQUNsRyxVQUFMO0FBQ0E7QUE5U3NCLENBQXhCO0FBaVRBN0MsQ0FBQyxDQUFDa0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFJLEVBQUFBLGVBQWUsQ0FBQ29DLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSovXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0cmV0dXJuICgkKCcjbGljS2V5JykudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbmNvbnN0IGxpY2Vuc2luZ01vZGlmeSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblx0JGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cdCRnb1RvTGljZW5zZU1hbmFnZW1lbnRCVE46JCgnI2NoYW5nZVBhZ2VUb0xpY2Vuc2luZycpLFxuXHQkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnI2VtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcjZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcblx0JGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG5cdCRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblx0JGxpY0tleTogJCgnI2xpY0tleScpLFxuXHQkY291cG9uOiAkKCcjY291cG9uJyksXG5cdCRlbWFpbDogJCgnI2VtYWlsJyksXG5cdCRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcblx0JGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcblx0JHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuXHQkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuXHQkbGljZW5zaW5nTWVudTogJCgnI2xpY2Vuc2luZy1tZW51IC5pdGVtJyksXG5cdCRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0ZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRjb21wYW55bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGVtYWlsOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb250YWN0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29udGFjdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bGljS2V5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbGljS2V5Jyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb3Vwb246IHtcblx0XHRcdGRlcGVuZHM6ICdsaWNLZXknLFxuXHRcdFx0aWRlbnRpZmllcjogJ2NvdXBvbicsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3RvcnlUeXBlOiAnaGFzaCcsXG5cdFx0fSk7XG5cdFx0aWYoJCgnI2ZpbGxlZC1saWNlbnNlLWtleS1pbmZvJykubGVuZ3RoID09PSAwKXtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdFx0Ly8g0J3QtdGCINC40L3RgtC10YDQvdC10YIg0L3QsCDRgdGC0LDQvdGG0LjQuC4g0KTQvtGA0LzQsCDQvdC1INC+0YLRgNC40YHQvtCy0LDQvdCwLlxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRjbGVhckluY29tcGxldGU6IHRydWUsXG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywoKT0+e1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm9cblx0XHRcdFx0Lmh0bWwoYCR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApXG5cdFx0XHRcdC5zaG93KCk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcblx0XHR9XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ICE9PSAnJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0fVxuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRnb1RvTGljZW5zZU1hbmFnZW1lbnRCVE4ub24oJ2NsaWNrJywoZSk9Pntcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH0pO1xuXG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIFJlc2V0TGljZW5zZUtleSBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2Upe1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXNwb25zZSE9PWZhbHNlKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKXtcblx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRpZiAocmVzcG9uc2U9PT10cnVlKXtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZUtleVZhbGlkfTwvZGl2PmApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGlmKHJlc3BvbnNlID09PSBmYWxzZSB8fCByZXNwb25zZS5tZXNzYWdlcyA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0JCgnI2xpY0ZhaWxJbmZvJykucmVtb3ZlKCk7XG5cdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlfTwvZGl2PmApO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdCQoJyNsaWNGYWlsSW5mb01zZycpLnJlbW92ZSgpO1xuXHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGlkPVwibGljRmFpbEluZm9Nc2dcIiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgcmVkIGljb25cIj48L2k+ICR7cmVzcG9uc2UubWVzc2FnZXN9PC9kaXY+YCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKXtcblx0XHRpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBPbiBjaGFuZ2UgbGljZW5zZSBrZXkgaW5wdXQgZmllbGRcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG5cdFx0Y29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0aWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGtleVxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBjb3Vwb25cblx0ICovXG5cdGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogUGFyc2VzIGFuZCBidWlsZHMgbGljZW5zZSBpbmZvIHByZXNlbnRhdGlvblxuXHQgKi9cblx0c2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcblx0XHRjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG5cdFx0aWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuXHRcdCQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG5cdFx0JCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuXHRcdCQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuXHRcdGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuXHRcdFx0cHJvZHVjdHMgPSBbXTtcblx0XHRcdHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG5cdFx0fVxuXHRcdCQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG5cdFx0XHRsZXQgcm93ID0gJzx0cj48dGQ+Jztcblx0XHRcdGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuXHRcdFx0aWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG5cdFx0XHRjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcblx0XHRcdGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuXHRcdFx0XHRpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcblx0XHRcdFx0XHRleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuXHRcdFx0XHQkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcblx0XHRcdFx0XHRsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcblx0XHRcdFx0XHRpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudCUnLCBmZWF0dXJlLmNvdW50KTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJvdyArPSAnPC9zcGFuPic7XG5cdFx0XHR9XG5cdFx0XHRyb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuXHRcdFx0JCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqIEBwYXJhbSBzdWNjZXNzXG5cdCAqL1xuXHRjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcz09PXRydWUpe1xuXHRcdFx0aWYodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuXHRcdFx0XHQkKCcjbGljS2V5JykudmFsKHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSlcblx0XHRcdH1cblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXHRcdFx0JCgnI2NvdXBvbicpLnZhbCgnJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xuXHRcdFx0aWYocmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKXtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0fWVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQpO1xuXHRcdH1cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzO1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0Y29uc3QgZm9ybURhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=