"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Form */
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return $('#licKey').val().length === 28 || value.length > 0;
};

var licensingModify = {
  $formObj: $('#licencing-modify-form'),
  $emptyLicenseKeyInfo: $('#empty-license-key-info'),
  $filledLicenseKeyInfo: $('#filled-license-key-info'),
  $licKey: $('#licKey'),
  $coupon: $('#coupon'),
  $email: $('#email'),
  $ajaxMessages: $('.ui.message.ajax'),
  $licenseDetailInfo: $('#licenseDetailInfo'),
  $resetButton: $('#reset-license'),
  $productDetails: $('#productDetails'),
  $licensingMenu: $('#licensing-menu .item'),
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
      $('.ui.accordion').accordion();
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
        history: true,
        historyType: 'hash'
      });
      licensingModify.$resetButton.api({
        url: "".concat(globalRootUrl, "licensing/resetSettings"),
        method: 'GET',
        beforeSend: function () {
          function beforeSend(settings) {
            $(this).addClass('loading disabled');
            return settings;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            $(this).removeClass('loading disabled');
            licensingModify.$ajaxMessages.remove();
            if (response.success) window.location.reload();
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            $(this).removeClass('loading disabled');
            $('form').after(response);
          }

          return onFailure;
        }()
      });
      licensingModify.cbOnLicenceKeyInputChange();
      licensingModify.initializeForm();

      if (licensingModify.defaultLicenseKey.length === 28) {
        licensingModify.$filledLicenseKeyInfo.html("".concat(licensingModify.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show(); //  Проверим доступность фичии

        $.api({
          url: "".concat(globalRootUrl, "licensing/getBaseFeatureStatus/").concat(licensingModify.defaultLicenseKey),
          on: 'now',
          successTest: function () {
            function successTest(response) {
              // test whether a JSON response is valid
              return response !== undefined && Object.keys(response).length > 0 && response.success === true;
            }

            return successTest;
          }(),
          onSuccess: function () {
            function onSuccess() {
              licensingModify.$formObj.removeClass('error').addClass('success');
              licensingModify.$ajaxMessages.remove();
              licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
              $('.spinner.loading.icon').remove();
            }

            return onSuccess;
          }(),
          onFailure: function () {
            function onFailure(response) {
              licensingModify.$formObj.addClass('error').removeClass('success');
              licensingModify.$ajaxMessages.remove();
              licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.message, "</div>"));
              $('.spinner.loading.icon').remove();
            }

            return onFailure;
          }()
        }); // Получим информациию о лицензии

        $.api({
          url: "".concat(globalRootUrl, "licensing/getLicenseInfo/").concat(licensingModify.defaultLicenseKey),
          on: 'now',
          onSuccess: function () {
            function onSuccess(response) {
              licensingModify.cbShowLicenseInfo(response);
            }

            return onSuccess;
          }(),
          onError: function () {
            function onError(errorMessage, element, xhr) {
              if (xhr.status === 403) {
                window.location = "".concat(globalRootUrl, "session/index");
              }
            }

            return onError;
          }()
        }); // PbxApi.CheckLicense(licensingModify.cbCheckLicenseKey);

        licensingModify.$emptyLicenseKeyInfo.hide();
      } else {
        licensingModify.$filledLicenseKeyInfo.hide();
        licensingModify.$emptyLicenseKeyInfo.show();
      }

      if (licensingModify.defaultLicenseKey !== '') {
        licensingModify.$licensingMenu.tab('change tab', 'management');
      }
    }

    return initialize;
  }(),

  /**
   * Обработчик при вводе ключа
   */
  cbOnLicenceKeyInputChange: function () {
    function cbOnLicenceKeyInputChange() {
      var licKey = licensingModify.$licKey.val();

      if (licKey.length === 28) {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).attr('hidden', '');
        });
        $('#getTrialLicenseSection').hide();
        $('#couponSection').show();
        $('#form-error-messages').empty();
      } else {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).removeAttr('hidden');
        });
        $('#getTrialLicenseSection').show();
        $('#couponSection').hide();
      }
    }

    return cbOnLicenceKeyInputChange;
  }(),

  /**
   * Показать GetLicenseInfo
   * @param response
   */
  cbShowLicenseInfo: function () {
    function cbShowLicenseInfo(response) {
      if (response !== undefined && response.message !== 'null') {
        licensingModify.showLicenseInfo(response.message);
        licensingModify.$licenseDetailInfo.show();
      } else {
        licensingModify.$licenseDetailInfo.hide();
      }
    }

    return cbShowLicenseInfo;
  }(),

  /**
   * Обработка вставки ключа из буффера обмена
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
   * Обработка вставки купона из буффера обмена
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
   * Строит отображение информации о лицензировании ПП
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
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = licensingModify.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      licensingModify.defaultLicenseKey = licensingModify.$licKey.val();
      localStorage.clear('previousLicenseCheckResult');
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = licensingModify.$formObj;
      Form.url = "".concat(globalRootUrl, "licensing/updateLicense");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiZGVmYXVsdExpY2Vuc2VLZXkiLCJ2YWxpZGF0ZVJ1bGVzIiwiY29tcGFueW5hbWUiLCJpZGVudGlmaWVyIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm1ldGhvZCIsImJlZm9yZVNlbmQiLCJhZGRDbGFzcyIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZW1vdmUiLCJzdWNjZXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJvbkZhaWx1cmUiLCJhZnRlciIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJvbiIsInN1Y2Nlc3NUZXN0IiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlIiwiY2JTaG93TGljZW5zZUluZm8iLCJvbkVycm9yIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwic2hvd0xpY2Vuc2VJbmZvIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsImxvY2FsU3RvcmFnZSIsImNsZWFyIiwiRm9ybSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFHQUEsQ0FBQyxDQUFDQyxF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bGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHJldHVybiAoJCgnI2xpY0tleScpLnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cdCRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcjZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJyNmaWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuXHQkbGljS2V5OiAkKCcjbGljS2V5JyksXG5cdCRjb3Vwb246ICQoJyNjb3Vwb24nKSxcblx0JGVtYWlsOiAkKCcjZW1haWwnKSxcblx0JGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuXHQkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuXHQkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG5cdCRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG5cdCRsaWNlbnNpbmdNZW51OiAkKCcjbGljZW5zaW5nLW1lbnUgLml0ZW0nKSxcblx0ZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRjb21wYW55bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGVtYWlsOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb250YWN0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29udGFjdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bGljS2V5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbGljS2V5Jyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb3Vwb246IHtcblx0XHRcdGRlcGVuZHM6ICdsaWNLZXknLFxuXHRcdFx0aWRlbnRpZmllcjogJ2NvdXBvbicsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRjbGVhckluY29tcGxldGU6IHRydWUsXG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0XHRoaXN0b3J5VHlwZTogJ2hhc2gnLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24uYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvcmVzZXRTZXR0aW5nc2AsXG5cdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRcdHJldHVybiBzZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0XHQkKCdmb3JtJykuYWZ0ZXIocmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuXHRcdFx0XHQuaHRtbChgJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcblx0XHRcdFx0LnNob3coKTtcblxuXHRcdFx0Ly8gINCf0YDQvtCy0LXRgNC40Lwg0LTQvtGB0YLRg9C/0L3QvtGB0YLRjCDRhNC40YfQuNC4XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvZ2V0QmFzZUZlYXR1cmVTdGF0dXMvJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9YCxcblx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG5cdFx0XHRcdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2V9PC9kaXY+YCk7XG5cdFx0XHRcdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXG5cdFx0XHQvLyDQn9C+0LvRg9GH0LjQvCDQuNC90YTQvtGA0LzQsNGG0LjQuNGOINC+INC70LjRhtC10L3Qt9C40Lhcblx0XHRcdCQuYXBpKHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9nZXRMaWNlbnNlSW5mby8ke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX1gLFxuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS5jYlNob3dMaWNlbnNlSW5mbyhyZXNwb25zZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdFx0Ly8gUGJ4QXBpLkNoZWNrTGljZW5zZShsaWNlbnNpbmdNb2RpZnkuY2JDaGVja0xpY2Vuc2VLZXkpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQv9GA0Lgg0LLQstC+0LTQtSDQutC70Y7Rh9CwXG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuXHRcdGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0XHQkKCcjZ2V0VHJpYWxMaWNlbnNlU2VjdGlvbicpLmhpZGUoKTtcblx0XHRcdCQoJyNjb3Vwb25TZWN0aW9uJykuc2hvdygpO1xuXHRcdFx0JCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKS5lbXB0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0JCgnI2dldFRyaWFsTGljZW5zZVNlY3Rpb24nKS5zaG93KCk7XG5cdFx0XHQkKCcjY291cG9uU2VjdGlvbicpLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30LDRgtGMIEdldExpY2Vuc2VJbmZvXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JTaG93TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlICE9PSAnbnVsbCcpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINCy0YHRgtCw0LLQutC4INC60LvRjtGH0LAg0LjQtyDQsdGD0YTRhNC10YDQsCDQvtCx0LzQtdC90LBcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDQstGB0YLQsNCy0LrQuCDQutGD0L/QvtC90LAg0LjQtyDQsdGD0YTRhNC10YDQsCDQvtCx0LzQtdC90LBcblx0ICovXG5cdGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICog0KHRgtGA0L7QuNGCINC+0YLQvtCx0YDQsNC20LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0LvQuNGG0LXQvdC30LjRgNC+0LLQsNC90LjQuCDQn9CfXG5cdCAqL1xuXHRzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuXHRcdGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG5cdFx0JCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcblx0XHQkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG5cdFx0JCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG5cdFx0bGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG5cdFx0XHRwcm9kdWN0cyA9IFtdO1xuXHRcdFx0cHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcblx0XHR9XG5cdFx0JC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcblx0XHRcdGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuXHRcdFx0bGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG5cdFx0XHRpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcblx0XHRcdGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG5cdFx0XHRcdGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuXHRcdFx0XHRcdGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG5cdFx0XHRcdCQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcblx0XHRcdFx0XHRsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuXHRcdFx0XHRcdGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0ZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cm93ICs9ICc8L3NwYW4+Jztcblx0XHRcdH1cblx0XHRcdHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG5cdFx0XHQkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcblx0XHR9KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0bG9jYWxTdG9yYWdlLmNsZWFyKCdwcmV2aW91c0xpY2Vuc2VDaGVja1Jlc3VsdCcpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvdXBkYXRlTGljZW5zZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbGljZW5zaW5nTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==