"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
      if (response.licenseInfo !== 'null') {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJ0YWIiLCJoaXN0b3J5VHlwZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsImxpY2Vuc2VJbmZvIiwic2hvd0xpY2Vuc2VJbmZvIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInVuZGVmaW5lZCIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3ZFLFNBQVFOLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYU8sR0FBYixHQUFtQkMsTUFBbkIsS0FBOEIsRUFBOUIsSUFBb0NGLEtBQUssQ0FBQ0UsTUFBTixHQUFlLENBQTNEO0FBQ0EsQ0FGRDs7QUFJQSxJQUFNQyxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRVYsQ0FBQyxDQUFDLHdCQUFELENBRFk7QUFFdkJXLEVBQUFBLFlBQVksRUFBRVgsQ0FBQyxDQUFDLFNBQUQsQ0FGUTtBQUd2QlksRUFBQUEseUJBQXlCLEVBQUNaLENBQUMsQ0FBQyx3QkFBRCxDQUhKO0FBSXZCYSxFQUFBQSxvQkFBb0IsRUFBRWIsQ0FBQyxDQUFDLHlCQUFELENBSkE7QUFLdkJjLEVBQUFBLHFCQUFxQixFQUFFZCxDQUFDLENBQUMsMEJBQUQsQ0FMRDtBQU12QmUsRUFBQUEsd0JBQXdCLEVBQUVmLENBQUMsQ0FBQywwQkFBRCxDQU5KO0FBT3ZCZ0IsRUFBQUEsY0FBYyxFQUFFaEIsQ0FBQyxDQUFDLGdCQUFELENBUE07QUFRdkJpQixFQUFBQSxrQkFBa0IsRUFBRWpCLENBQUMsQ0FBQyxzQkFBRCxDQVJFO0FBU3ZCa0IsRUFB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QWtCLFlBQU07QUFDdkJ0SSxFQUFBQSxlQUFlLENBQUNvQyxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRyZXR1cm4gKCQoJyNsaWNLZXknKS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuXHQkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXHQkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblx0JGdvVG9MaWNlbnNlTWFuYWdlbWVudEJUTjokKCcjY2hhbmdlUGFnZVRvTGljZW5zaW5nJyksXG5cdCRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcjZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJyNmaWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuXHQkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcblx0JGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXHQkbGljS2V5OiAkKCcjbGljS2V5JyksXG5cdCRjb3Vwb246ICQoJyNjb3Vwb24nKSxcblx0JGVtYWlsOiAkKCcjZW1haWwnKSxcblx0JGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuXHQkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuXHQkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG5cdCRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG5cdCRsaWNlbnNpbmdNZW51OiAkKCcjbGljZW5zaW5nLW1lbnUgLml0ZW0nKSxcblx0JGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXHRkZWZhdWx0TGljZW5zZUtleTogbnVsbCxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGNvbXBhbnluYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZW1haWw6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdlbWFpbCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvbnRhY3Q6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb250YWN0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRsaWNLZXk6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdsaWNLZXknLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvdXBvbjoge1xuXHRcdFx0ZGVwZW5kczogJ2xpY0tleScsXG5cdFx0XHRpZGVudGlmaWVyOiAnY291cG9uJyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0b25pbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYih7XG5cdFx0XHRoaXN0b3J5VHlwZTogJ2hhc2gnLFxuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCgpPT57XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuXHRcdFx0XHQuaHRtbChgJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcblx0XHRcdFx0LnNob3coKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGdvVG9MaWNlbnNlTWFuYWdlbWVudEJUTi5vbignY2xpY2snLChlKT0+e1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0fSk7XG5cblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgUmVzZXRMaWNlbnNlS2V5IGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSl7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2UpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2Upe1xuXHRcdCQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdGlmIChyZXNwb25zZT09PXRydWUpe1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgcmVkIGljb25cIj48L2k+ICR7cmVzcG9uc2UubWVzc2FnZXN9PC9kaXY+YCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKXtcblx0XHRpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09ICdudWxsJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBPbiBjaGFuZ2UgbGljZW5zZSBrZXkgaW5wdXQgZmllbGRcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG5cdFx0Y29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0aWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGtleVxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBjb3Vwb25cblx0ICovXG5cdGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogUGFyc2VzIGFuZCBidWlsZHMgbGljZW5zZSBpbmZvIHByZXNlbnRhdGlvblxuXHQgKi9cblx0c2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcblx0XHRjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG5cdFx0aWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuXHRcdCQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG5cdFx0JCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuXHRcdCQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuXHRcdGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuXHRcdFx0cHJvZHVjdHMgPSBbXTtcblx0XHRcdHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG5cdFx0fVxuXHRcdCQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG5cdFx0XHRsZXQgcm93ID0gJzx0cj48dGQ+Jztcblx0XHRcdGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuXHRcdFx0aWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG5cdFx0XHRjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcblx0XHRcdGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuXHRcdFx0XHRpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcblx0XHRcdFx0XHRleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuXHRcdFx0XHQkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcblx0XHRcdFx0XHRsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcblx0XHRcdFx0XHRpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudCUnLCBmZWF0dXJlLmNvdW50KTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJvdyArPSAnPC9zcGFuPic7XG5cdFx0XHR9XG5cdFx0XHRyb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuXHRcdFx0JCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqIEBwYXJhbSBzdWNjZXNzXG5cdCAqL1xuXHRjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcz09PXRydWUpe1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHR9ZWxzZSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCk7XG5cdFx0fVxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRjb25zdCBmb3JtRGF0YSA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0UGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbGljZW5zaW5nTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==