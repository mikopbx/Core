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

/* global globalRootUrl, globalTranslate, Form, sessionStorage */
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
  initialize: function () {
    function initialize() {
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
      licensingModify.$licensingMenu.tab({
        historyType: 'hash'
      });
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
    }

    return initialize;
  }(),

  /**
   * After send ResetLicenseKey callback
   * @param response
   */
  cbAfterResetLicenseKey: function () {
    function cbAfterResetLicenseKey(response) {
      licensingModify.$formObj.removeClass('loading disabled');
      if (response !== false) window.location.reload();
    }

    return cbAfterResetLicenseKey;
  }(),

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetMikoPBXFeatureStatus: function () {
    function cbAfterGetMikoPBXFeatureStatus(response) {
      $('.spinner.loading.icon').remove();
      licensingModify.$ajaxMessages.remove();

      if (response === true) {
        licensingModify.$formObj.removeClass('error').addClass('success');
        licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      } else {
        licensingModify.$formObj.addClass('error').removeClass('success');
        licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.messages, "</div>"));
      }
    }

    return cbAfterGetMikoPBXFeatureStatus;
  }(),

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetLicenseInfo: function () {
    function cbAfterGetLicenseInfo(response) {
      if (response.licenseInfo !== undefined) {
        licensingModify.showLicenseInfo(response.licenseInfo);
        licensingModify.$licenseDetailInfo.show();
      } else {
        licensingModify.$licenseDetailInfo.hide();
      }
    }

    return cbAfterGetLicenseInfo;
  }(),

  /**
   * On change license key input field
   */
  cbOnLicenceKeyInputChange: function () {
    function cbOnLicenceKeyInputChange() {
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
    }

    return cbOnLicenceKeyInputChange;
  }(),

  /**
   * Callback after paste license key
   */
  cbOnLicenceKeyBeforePaste: function () {
    function cbOnLicenceKeyBeforePaste(pastedValue) {
      if (pastedValue.indexOf('MIKO-') === -1) {
        licensingModify.$licKey.transition('shake');
        return false;
      }

      return pastedValue.replace(/\s+/g, '');
    }

    return cbOnLicenceKeyBeforePaste;
  }(),

  /**
   * Callback after paste license coupon
   */
  cbOnCouponBeforePaste: function () {
    function cbOnCouponBeforePaste(pastedValue) {
      if (pastedValue.indexOf('MIKOUPD-') === -1) {
        licensingModify.$coupon.transition('shake');
        return false;
      }

      return pastedValue.replace(/\s+/g, '');
    }

    return cbOnCouponBeforePaste;
  }(),

  /**
   * Parses and builds license info presentation
   */
  showLicenseInfo: function () {
    function showLicenseInfo(message) {
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
    }

    return showLicenseInfo;
  }(),

  /**
   * After update license key, get new one, activate coupon
   * @param response
   * @param success
   */
  cbAfterFormProcessing: function () {
    function cbAfterFormProcessing(response, success) {
      if (success === true) {
        window.location.reload();
      } else if (response.messages !== undefined) {
        UserMessage.showMultiString(response.messages);
      } else {
        UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
      }

      licensingModify.$dirrtyField.val(Math.random());
      licensingModify.$dirrtyField.trigger('change');
    }

    return cbAfterFormProcessing;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      return settings;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      var formData = licensingModify.$formObj.form('get values');
      PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = licensingModify.$formObj;
      Form.url = "".concat(globalRootUrl, "licensing/save");
      Form.validateRules = licensingModify.validateRules;
      Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm;
      Form.cbAfterSendForm = licensingModify.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  licensingModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJ0YWIiLCJoaXN0b3J5VHlwZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsImxpY2Vuc2VJbmZvIiwidW5kZWZpbmVkIiwic2hvd0xpY2Vuc2VJbmZvIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsU0FBRCxDQUZRO0FBR3ZCWSxFQUFBQSx5QkFBeUIsRUFBQ1osQ0FBQyxDQUFDLHdCQUFELENBSEo7QUFJdkJhLEVBQUFBLG9CQUFvQixFQUFFYixDQUFDLENBQUMseUJBQUQsQ0FKQTtBQUt2QmMsRUFBQUEscUJBQXFCLEVBQUVkLENBQUMsQ0FBQywwQkFBRCxDQUxEO0FBTXZCZSxFQUFBQSx3QkFBd0IsRUFBRWYsQ0FBQyxDQUFDLDBCQUFELENBTko7QUFPdkJnQixFQUFBQSxjQUFjLEVBQUVoQixDQUFDLENBQUMsZ0JBQUQsQ0FQTTtBQVF2QmlCLEVBQUFBLGtCQUFrQixFQUFFakIsQ0FBQyxDQUFDLHNCQUFELENBUkU7QUFTdkJrQixFQUFBQSxPQUFPLEVBQUVsQixDQUFDLENBQUMsU0FBRCxDQVRhO0FBVXZCbUIsRUFBQUEsT0FBTyxFQUFFbkIsQ0FBQyxDQUFDLFNBQUQsQ0FWYTtBQVd2Qm9CLEVBQUFBLE1BQU0sRUFBRXBCLENBQUMsQ0FBQyxRQUFELENBWGM7QUFZdkJxQixFQUFBQSxhQUFhLEVBQUVyQixDQUFDLENBQUMsa0JBQUQsQ0FaTztBQWF2QnNCLEVBQUFBLGtCQUFrQixFQUFFdEIsQ0FBQyxDQUFDLG9CQUFELENBYkU7QUFjdkJ1QixFQUFBQSxZQUFZLEVBQUV2QixDQUFDLENBQUMsZ0JBQUQsQ0FkUTtBQWV2QndCLEVBQUFBLGVBQWUsRUFBRXhCLENBQUMsQ0FBQyxpQkFBRCxDQWZLO0FBZ0J2QnlCLEVBQUFBLGNBQWMsRUFBRXpCLENBQUMsQ0FBQyx1QkFBRCxDQWhCTTtBQWlCdkIwQixFQUFBQSxXQUFXLEVBQUUxQixDQUFDLENBQUMsc0NBQUQsQ0FqQlM7QUFrQnZCMkIsRUFBQUEsaUJBQWlCLEVBQUUsSUFsQkk7QUFtQnZCQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1pDLE1BQUFBLFVBQVUsRUFBRSxhQURBO0FBRVoxQixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMkIsUUFBQUEsSUFBSSxFQUFFLDZCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkssS0FEQztBQVVkQyxJQUFBQSxLQUFLLEVBQUU7QUFDTkwsTUFBQUEsVUFBVSxFQUFFLE9BRE47QUFFTjFCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MyQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRCxLQVZPO0FBbUJkQyxJQUFBQSxPQUFPLEVBQUU7QUFDUlAsTUFBQUEsVUFBVSxFQUFFLFNBREo7QUFFUjFCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MyQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRnpCLE9BRE07QUFGQyxLQW5CSztBQTRCZEMsSUFBQUEsTUFBTSxFQUFFO0FBQ1BULE1BQUFBLFVBQVUsRUFBRSxRQURMO0FBRVBVLE1BQUFBLFFBQVEsRUFBRSxJQUZIO0FBR1BwQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMkIsUUFBQUEsSUFBSSxFQUFFLGlCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDUTtBQUZ6QixPQURNO0FBSEEsS0E1Qk07QUFzQ2RDLElBQUFBLE1BQU0sRUFBRTtBQUNQQyxNQUFBQSxPQUFPLEVBQUUsUUFERjtBQUVQYixNQUFBQSxVQUFVLEVBQUUsUUFGTDtBQUdQVSxNQUFBQSxRQUFRLEVBQUUsSUFISDtBQUlQcEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQzJCLFFBQUFBLElBQUksRUFBRSxpQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGekIsT0FETTtBQUpBO0FBdENNLEdBbkJRO0FBcUV2QkMsRUFBQUEsVUFyRXVCO0FBQUEsMEJBcUVWO0FBQ1pwQyxNQUFBQSxlQUFlLENBQUNpQixXQUFoQixDQUE0Qm9CLFNBQTVCO0FBQ0FyQyxNQUFBQSxlQUFlLENBQUNhLGtCQUFoQixDQUFtQ3lCLElBQW5DO0FBQ0F0QyxNQUFBQSxlQUFlLENBQUNVLE9BQWhCLENBQXdCNkIsU0FBeEIsQ0FBa0MsaUNBQWxDLEVBQXFFO0FBQ3BFQyxRQUFBQSxhQUFhLEVBQUV4QyxlQUFlLENBQUN5QztBQURxQyxPQUFyRTtBQUdBekMsTUFBQUEsZUFBZSxDQUFDUyxPQUFoQixDQUF3QjhCLFNBQXhCLENBQWtDLDhCQUFsQyxFQUFrRTtBQUNqRUcsUUFBQUEsVUFBVSxFQUFFMUMsZUFBZSxDQUFDMkMseUJBRHFDO0FBRWpFQyxRQUFBQSxZQUFZLEVBQUU1QyxlQUFlLENBQUMyQyx5QkFGbUM7QUFHakVFLFFBQUFBLGVBQWUsRUFBRSxJQUhnRDtBQUlqRUwsUUFBQUEsYUFBYSxFQUFFeEMsZUFBZSxDQUFDOEM7QUFKa0MsT0FBbEU7QUFNQTlDLE1BQUFBLGVBQWUsQ0FBQ1csTUFBaEIsQ0FBdUI0QixTQUF2QixDQUFpQyxPQUFqQztBQUNBdkMsTUFBQUEsZUFBZSxDQUFDa0IsaUJBQWhCLEdBQW9DbEIsZUFBZSxDQUFDUyxPQUFoQixDQUF3QlgsR0FBeEIsRUFBcEM7QUFFQUUsTUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0IrQixHQUEvQixDQUFtQztBQUNsQ0MsUUFBQUEsV0FBVyxFQUFFO0FBRHFCLE9BQW5DO0FBSUFoRCxNQUFBQSxlQUFlLENBQUNjLFlBQWhCLENBQTZCbUMsRUFBN0IsQ0FBZ0MsT0FBaEMsRUFBd0MsWUFBSTtBQUMzQ2pELFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJpRCxRQUF6QixDQUFrQyxrQkFBbEM7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxzQkFBUCxDQUE4QnBELGVBQWUsQ0FBQ3FELHNCQUE5QztBQUNBLE9BSEQ7QUFLQXJELE1BQUFBLGVBQWUsQ0FBQzJDLHlCQUFoQjtBQUVBM0MsTUFBQUEsZUFBZSxDQUFDc0QsY0FBaEI7O0FBRUEsVUFBSXRELGVBQWUsQ0FBQ2tCLGlCQUFoQixDQUFrQ25CLE1BQWxDLEtBQTZDLEVBQWpELEVBQXFEO0FBQ3BEQyxRQUFBQSxlQUFlLENBQUNLLHFCQUFoQixDQUNFa0QsSUFERixXQUNVdkQsZUFBZSxDQUFDa0IsaUJBRDFCLDhDQUVFc0MsSUFGRjtBQUdBTCxRQUFBQSxNQUFNLENBQUNNLDhCQUFQLENBQXNDekQsZUFBZSxDQUFDMEQsOEJBQXREO0FBQ0FQLFFBQUFBLE1BQU0sQ0FBQ1EscUJBQVAsQ0FBNkIzRCxlQUFlLENBQUM0RCxxQkFBN0M7QUFDQTVELFFBQUFBLGVBQWUsQ0FBQ0ksb0JBQWhCLENBQXFDa0MsSUFBckM7QUFDQSxPQVBELE1BT087QUFDTnRDLFFBQUFBLGVBQWUsQ0FBQ0sscUJBQWhCLENBQXNDaUMsSUFBdEM7QUFDQXRDLFFBQUFBLGVBQWUsQ0FBQ0ksb0JBQWhCLENBQXFDb0QsSUFBckM7QUFDQTs7QUFFRCxVQUFJeEQsZUFBZSxDQUFDa0IsaUJBQWhCLEtBQXNDLEVBQTFDLEVBQThDO0FBQzdDbEIsUUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0IrQixHQUEvQixDQUFtQyxZQUFuQyxFQUFpRCxZQUFqRDtBQUNBOztBQUVEL0MsTUFBQUEsZUFBZSxDQUFDRyx5QkFBaEIsQ0FBMEM4QyxFQUExQyxDQUE2QyxPQUE3QyxFQUFxRCxVQUFDWSxDQUFELEVBQUs7QUFDekRBLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBOUQsUUFBQUEsZUFBZSxDQUFDZ0IsY0FBaEIsQ0FBK0IrQixHQUEvQixDQUFtQyxZQUFuQyxFQUFpRCxZQUFqRDtBQUNBLE9BSEQ7QUFLQTs7QUF0SHNCO0FBQUE7O0FBdUh2Qjs7OztBQUlBTSxFQUFBQSxzQkEzSHVCO0FBQUEsb0NBMkhBVSxRQTNIQSxFQTJIUztBQUMvQi9ELE1BQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUIrRCxXQUF6QixDQUFxQyxrQkFBckM7QUFDQSxVQUFJRCxRQUFRLEtBQUcsS0FBZixFQUFzQkUsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQjtBQUN0Qjs7QUE5SHNCO0FBQUE7O0FBK0h2Qjs7OztBQUlBVCxFQUFBQSw4QkFuSXVCO0FBQUEsNENBbUlRSyxRQW5JUixFQW1JaUI7QUFDdkN4RSxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQjZFLE1BQTNCO0FBQ0FwRSxNQUFBQSxlQUFlLENBQUNZLGFBQWhCLENBQThCd0QsTUFBOUI7O0FBQ0EsVUFBSUwsUUFBUSxLQUFHLElBQWYsRUFBb0I7QUFDbkIvRCxRQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCK0QsV0FBekIsQ0FBcUMsT0FBckMsRUFBOENkLFFBQTlDLENBQXVELFNBQXZEO0FBQ0FsRCxRQUFBQSxlQUFlLENBQUNLLHFCQUFoQixDQUFzQ2dFLEtBQXRDLHFGQUFxSDdDLGVBQWUsQ0FBQzhDLG1CQUFySTtBQUNBLE9BSEQsTUFHTztBQUNOdEUsUUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QmlELFFBQXpCLENBQWtDLE9BQWxDLEVBQTJDYyxXQUEzQyxDQUF1RCxTQUF2RDtBQUNBaEUsUUFBQUEsZUFBZSxDQUFDSyxxQkFBaEIsQ0FBc0NnRSxLQUF0QyxnR0FBZ0lOLFFBQVEsQ0FBQ1EsUUFBekk7QUFDQTtBQUNEOztBQTdJc0I7QUFBQTs7QUErSXZCOzs7O0FBSUFYLEVBQUFBLHFCQW5KdUI7QUFBQSxtQ0FtSkRHLFFBbkpDLEVBbUpRO0FBQzlCLFVBQUlBLFFBQVEsQ0FBQ1MsV0FBVCxLQUF5QkMsU0FBN0IsRUFBd0M7QUFDdkN6RSxRQUFBQSxlQUFlLENBQUMwRSxlQUFoQixDQUFnQ1gsUUFBUSxDQUFDUyxXQUF6QztBQUNBeEUsUUFBQUEsZUFBZSxDQUFDYSxrQkFBaEIsQ0FBbUMyQyxJQUFuQztBQUNBLE9BSEQsTUFHTztBQUNOeEQsUUFBQUEsZUFBZSxDQUFDYSxrQkFBaEIsQ0FBbUN5QixJQUFuQztBQUNBO0FBQ0Q7O0FBMUpzQjtBQUFBOztBQTRKdkI7OztBQUdBSyxFQUFBQSx5QkEvSnVCO0FBQUEseUNBK0pLO0FBQzNCLFVBQU1iLE1BQU0sR0FBRzlCLGVBQWUsQ0FBQ1MsT0FBaEIsQ0FBd0JYLEdBQXhCLEVBQWY7O0FBQ0EsVUFBSWdDLE1BQU0sQ0FBQy9CLE1BQVAsS0FBa0IsRUFBdEIsRUFBMEI7QUFDekJDLFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUIwRSxJQUF6QixDQUE4QixnQkFBOUIsRUFBZ0RDLElBQWhELENBQXFELFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNwRXZGLFVBQUFBLENBQUMsQ0FBQ3VGLEdBQUQsQ0FBRCxDQUFPQyxJQUFQLENBQVksUUFBWixFQUFzQixFQUF0QjtBQUNBLFNBRkQ7QUFHQS9FLFFBQUFBLGVBQWUsQ0FBQ00sd0JBQWhCLENBQXlDZ0MsSUFBekM7QUFDQXRDLFFBQUFBLGVBQWUsQ0FBQ08sY0FBaEIsQ0FBK0JpRCxJQUEvQjtBQUNBeEQsUUFBQUEsZUFBZSxDQUFDUSxrQkFBaEIsQ0FBbUN3RSxLQUFuQztBQUNBLE9BUEQsTUFPTztBQUNOaEYsUUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QjBFLElBQXpCLENBQThCLGdCQUE5QixFQUFnREMsSUFBaEQsQ0FBcUQsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ3BFdkYsVUFBQUEsQ0FBQyxDQUFDdUYsR0FBRCxDQUFELENBQU9HLFVBQVAsQ0FBa0IsUUFBbEI7QUFDQSxTQUZEO0FBR0FqRixRQUFBQSxlQUFlLENBQUNNLHdCQUFoQixDQUF5Q2tELElBQXpDO0FBQ0F4RCxRQUFBQSxlQUFlLENBQUNPLGNBQWhCLENBQStCK0IsSUFBL0I7QUFDQTtBQUNEOztBQS9Lc0I7QUFBQTs7QUFnTHZCOzs7QUFHQVEsRUFBQUEseUJBbkx1QjtBQUFBLHVDQW1MR29DLFdBbkxILEVBbUxnQjtBQUN0QyxVQUFJQSxXQUFXLENBQUNDLE9BQVosQ0FBb0IsT0FBcEIsTUFBaUMsQ0FBQyxDQUF0QyxFQUF5QztBQUN4Q25GLFFBQUFBLGVBQWUsQ0FBQ1MsT0FBaEIsQ0FBd0IyRSxVQUF4QixDQUFtQyxPQUFuQztBQUNBLGVBQU8sS0FBUDtBQUNBOztBQUNELGFBQU9GLFdBQVcsQ0FBQ0csT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFQO0FBQ0E7O0FBekxzQjtBQUFBOztBQTBMdkI7OztBQUdBNUMsRUFBQUEscUJBN0x1QjtBQUFBLG1DQTZMRHlDLFdBN0xDLEVBNkxZO0FBQ2xDLFVBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixVQUFwQixNQUFvQyxDQUFDLENBQXpDLEVBQTRDO0FBQzNDbkYsUUFBQUEsZUFBZSxDQUFDVSxPQUFoQixDQUF3QjBFLFVBQXhCLENBQW1DLE9BQW5DO0FBQ0EsZUFBTyxLQUFQO0FBQ0E7O0FBQ0QsYUFBT0YsV0FBVyxDQUFDRyxPQUFaLENBQW9CLE1BQXBCLEVBQTRCLEVBQTVCLENBQVA7QUFDQTs7QUFuTXNCO0FBQUE7O0FBb012Qjs7O0FBR0FYLEVBQUFBLGVBdk11QjtBQUFBLDZCQXVNUFksT0F2TU8sRUF1TUU7QUFDeEIsVUFBTUMsV0FBVyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsT0FBWCxDQUFwQjs7QUFDQSxVQUFJQyxXQUFXLENBQUMsYUFBRCxDQUFYLEtBQStCZCxTQUFuQyxFQUE4QztBQUM3QztBQUNBOztBQUNEbEYsTUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JtRyxJQUF0QixDQUEyQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQm5FLFdBQXREO0FBQ0E3QixNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCbUcsSUFBbEIsQ0FBdUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkIzRCxPQUFsRDtBQUNBckMsTUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQm1HLElBQWhCLENBQXFCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCN0QsS0FBaEQ7QUFDQW5DLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY21HLElBQWQsQ0FBbUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJJLEdBQTlDO0FBQ0EsVUFBSUMsUUFBUSxHQUFHTCxXQUFXLENBQUNNLE9BQTNCOztBQUNBLFVBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNILFFBQWQsQ0FBTCxFQUE4QjtBQUM3QkEsUUFBQUEsUUFBUSxHQUFHLEVBQVg7QUFDQUEsUUFBQUEsUUFBUSxDQUFDSSxJQUFULENBQWNULFdBQVcsQ0FBQ00sT0FBMUI7QUFDQTs7QUFDRHRHLE1BQUFBLENBQUMsQ0FBQ3FGLElBQUYsQ0FBT2dCLFFBQVAsRUFBaUIsVUFBQ0ssR0FBRCxFQUFNQyxZQUFOLEVBQXVCO0FBQ3ZDLFlBQUlDLEdBQUcsR0FBRyxVQUFWO0FBQ0EsWUFBSU4sT0FBTyxHQUFHSyxZQUFkOztBQUNBLFlBQUlMLE9BQU8sQ0FBQyxhQUFELENBQVAsS0FBMkJwQixTQUEvQixFQUEwQztBQUN6Q29CLFVBQUFBLE9BQU8sR0FBR0ssWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDQTs7QUFDRCxZQUFNRSxXQUFXLEdBQUcsSUFBSUMsSUFBSixDQUFTUixPQUFPLENBQUNTLE9BQVIsQ0FBZ0JqQixPQUFoQixDQUF3Qix5QkFBeEIsRUFBbUQsVUFBbkQsQ0FBVCxDQUFwQjtBQUNBLFlBQU1rQixPQUFPLEdBQUcsSUFBSUYsSUFBSixFQUFoQjs7QUFDQSxZQUFJRSxPQUFPLEdBQUdILFdBQWQsRUFBMkI7QUFDMUJELFVBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNNaEYsZUFBZSxDQUFDaUYsV0FEdEIsYUFBSDtBQUVBLFNBSEQsTUFHTyxJQUFJWixPQUFPLENBQUNTLE9BQVIsQ0FBZ0J2RyxNQUFoQixLQUEyQixDQUEzQixJQUFnQzhGLE9BQU8sQ0FBQ2EsS0FBUixLQUFrQixHQUF0RCxFQUEyRDtBQUNqRVAsVUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ01oRixlQUFlLENBQUNpRixXQUR0QixhQUFIO0FBRUEsU0FITSxNQUdBO0FBQ05OLFVBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELENBQUg7O0FBQ0EsY0FBSVgsT0FBTyxDQUFDUyxPQUFSLENBQWdCdkcsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDL0IsZ0JBQUk0RyxXQUFXLEdBQUduRixlQUFlLENBQUNvRixnQkFBbEM7QUFDQUQsWUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUN0QixPQUFaLENBQW9CLFdBQXBCLEVBQWlDUSxPQUFPLENBQUNTLE9BQXpDLENBQWQ7QUFDQUgsWUFBQUEsR0FBRyx5QkFBa0JRLFdBQWxCLGFBQUg7QUFDQTs7QUFDRFIsVUFBQUEsR0FBRyxJQUFJLDZCQUFQO0FBQ0E1RyxVQUFBQSxDQUFDLENBQUNxRixJQUFGLENBQU9zQixZQUFZLENBQUNXLE9BQXBCLEVBQTZCLFVBQUNoQyxLQUFELEVBQVFpQyxZQUFSLEVBQXlCO0FBQ3JELGdCQUFJQyxXQUFXLEdBQUd2RixlQUFlLENBQUN3RixlQUFsQztBQUNBLGdCQUFJSCxPQUFPLEdBQUdDLFlBQWQ7O0FBQ0EsZ0JBQUlBLFlBQVksQ0FBQyxhQUFELENBQVosS0FBZ0NyQyxTQUFwQyxFQUErQztBQUM5Q29DLGNBQUFBLE9BQU8sR0FBR0MsWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDQTs7QUFDREMsWUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLFFBQXBCLEVBQThCd0IsT0FBTyxDQUFDTCxJQUF0QyxDQUFkO0FBQ0FPLFlBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDMUIsT0FBWixDQUFvQixTQUFwQixFQUErQndCLE9BQU8sQ0FBQ0ksS0FBdkMsQ0FBZDtBQUNBRixZQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzFCLE9BQVosQ0FBb0IsYUFBcEIsRUFBbUN3QixPQUFPLENBQUNLLFNBQTNDLENBQWQ7QUFDQUgsWUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLFlBQXBCLEVBQWtDd0IsT0FBTyxDQUFDTSxRQUExQyxDQUFkO0FBQ0FoQixZQUFBQSxHQUFHLGNBQU9ZLFdBQVAsU0FBSDtBQUNBLFdBWEQ7QUFZQVosVUFBQUEsR0FBRyxJQUFJLFNBQVA7QUFDQTs7QUFDREEsUUFBQUEsR0FBRyxJQUFJLGtCQUFQO0FBQ0E1RyxRQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQjZILE1BQTNCLENBQWtDakIsR0FBbEM7QUFDQSxPQXRDRDtBQXVDQTs7QUE1UHNCO0FBQUE7O0FBNlB2Qjs7Ozs7QUFLQWtCLEVBQUFBLHFCQWxRdUI7QUFBQSxtQ0FrUUR0RCxRQWxRQyxFQWtRU3VELE9BbFFULEVBa1FrQjtBQUN4QyxVQUFJQSxPQUFPLEtBQUcsSUFBZCxFQUFtQjtBQUNsQnJELFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEI7QUFDQSxPQUZELE1BRU8sSUFBSUosUUFBUSxDQUFDUSxRQUFULEtBQXNCRSxTQUExQixFQUFxQztBQUMzQzhDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnpELFFBQVEsQ0FBQ1EsUUFBckM7QUFDQSxPQUZNLE1BRUQ7QUFDTGdELFFBQUFBLFdBQVcsQ0FBQ0UsU0FBWixDQUFzQmpHLGVBQWUsQ0FBQ2tHLDhCQUF0QztBQUNBOztBQUNEMUgsTUFBQUEsZUFBZSxDQUFDRSxZQUFoQixDQUE2QkosR0FBN0IsQ0FBaUM2SCxJQUFJLENBQUNDLE1BQUwsRUFBakM7QUFDQTVILE1BQUFBLGVBQWUsQ0FBQ0UsWUFBaEIsQ0FBNkIySCxPQUE3QixDQUFxQyxRQUFyQztBQUNBOztBQTVRc0I7QUFBQTtBQTZRdkJDLEVBQUFBLGdCQTdRdUI7QUFBQSw4QkE2UU5wSSxRQTdRTSxFQTZRSTtBQUMxQixhQUFPQSxRQUFQO0FBQ0E7O0FBL1FzQjtBQUFBO0FBZ1J2QnFJLEVBQUFBLGVBaFJ1QjtBQUFBLCtCQWdSTDtBQUNqQixVQUFNQyxRQUFRLEdBQUdoSSxlQUFlLENBQUNDLFFBQWhCLENBQXlCUixJQUF6QixDQUE4QixZQUE5QixDQUFqQjtBQUNBMEQsTUFBQUEsTUFBTSxDQUFDOEUseUJBQVAsQ0FBaUNELFFBQWpDLEVBQTJDaEksZUFBZSxDQUFDcUgscUJBQTNEO0FBQ0E7O0FBblJzQjtBQUFBO0FBb1J2Qi9ELEVBQUFBLGNBcFJ1QjtBQUFBLDhCQW9STjtBQUNoQjRFLE1BQUFBLElBQUksQ0FBQ2pJLFFBQUwsR0FBZ0JELGVBQWUsQ0FBQ0MsUUFBaEM7QUFDQWlJLE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQy9HLGFBQUwsR0FBcUJuQixlQUFlLENBQUNtQixhQUFyQztBQUNBK0csTUFBQUEsSUFBSSxDQUFDSixnQkFBTCxHQUF3QjlILGVBQWUsQ0FBQzhILGdCQUF4QztBQUNBSSxNQUFBQSxJQUFJLENBQUNILGVBQUwsR0FBdUIvSCxlQUFlLENBQUMrSCxlQUF2QztBQUNBRyxNQUFBQSxJQUFJLENBQUM5RixVQUFMO0FBQ0E7O0FBM1JzQjtBQUFBO0FBQUEsQ0FBeEI7QUE4UkE3QyxDQUFDLENBQUM4SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCdEksRUFBQUEsZUFBZSxDQUFDb0MsVUFBaEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlICovXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0cmV0dXJuICgkKCcjbGljS2V5JykudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbmNvbnN0IGxpY2Vuc2luZ01vZGlmeSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblx0JGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cdCRnb1RvTGljZW5zZU1hbmFnZW1lbnRCVE46JCgnI2NoYW5nZVBhZ2VUb0xpY2Vuc2luZycpLFxuXHQkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnI2VtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcjZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcblx0JGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG5cdCRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblx0JGxpY0tleTogJCgnI2xpY0tleScpLFxuXHQkY291cG9uOiAkKCcjY291cG9uJyksXG5cdCRlbWFpbDogJCgnI2VtYWlsJyksXG5cdCRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcblx0JGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcblx0JHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuXHQkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuXHQkbGljZW5zaW5nTWVudTogJCgnI2xpY2Vuc2luZy1tZW51IC5pdGVtJyksXG5cdCRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0ZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRjb21wYW55bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGVtYWlsOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb250YWN0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29udGFjdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bGljS2V5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbGljS2V5Jyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb3Vwb246IHtcblx0XHRcdGRlcGVuZHM6ICdsaWNLZXknLFxuXHRcdFx0aWRlbnRpZmllcjogJ2NvdXBvbicsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRjbGVhckluY29tcGxldGU6IHRydWUsXG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoe1xuXHRcdFx0aGlzdG9yeVR5cGU6ICdoYXNoJyxcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywoKT0+e1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm9cblx0XHRcdFx0Lmh0bWwoYCR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApXG5cdFx0XHRcdC5zaG93KCk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcblx0XHR9XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ICE9PSAnJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0fVxuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRnb1RvTGljZW5zZU1hbmFnZW1lbnRCVE4ub24oJ2NsaWNrJywoZSk9Pntcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH0pO1xuXG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIFJlc2V0TGljZW5zZUtleSBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2Upe1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXNwb25zZSE9PWZhbHNlKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKXtcblx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRpZiAocmVzcG9uc2U9PT10cnVlKXtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZUtleVZhbGlkfTwvZGl2PmApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2VzfTwvZGl2PmApO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBHZXRMaWNlbnNlSW5mbyBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSl7XG5cdFx0aWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogT24gY2hhbmdlIGxpY2Vuc2Uga2V5IGlucHV0IGZpZWxkXG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuXHRcdGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBrZXlcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2UgY291cG9uXG5cdCAqL1xuXHRjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIFBhcnNlcyBhbmQgYnVpbGRzIGxpY2Vuc2UgaW5mbyBwcmVzZW50YXRpb25cblx0ICovXG5cdHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG5cdFx0Y29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuXHRcdGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcblx0XHQkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuXHRcdCQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcblx0XHQkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcblx0XHRsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcblx0XHRcdHByb2R1Y3RzID0gW107XG5cdFx0XHRwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuXHRcdH1cblx0XHQkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuXHRcdFx0bGV0IHJvdyA9ICc8dHI+PHRkPic7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcblx0XHRcdGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuXHRcdFx0Y29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcblx0XHRcdFx0aWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG5cdFx0XHRcdFx0ZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+Jztcblx0XHRcdFx0JC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG5cdFx0XHRcdFx0aWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyb3cgKz0gJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdFx0cm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+Jztcblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gc3VjY2Vzc1xuXHQgKi9cblx0Y2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3M9PT10cnVlKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0fWVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQpO1xuXHRcdH1cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzO1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0Y29uc3QgZm9ybURhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=