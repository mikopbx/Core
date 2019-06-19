"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl , ConfigWorker, globalTranslate */
var Form = {
  $formObj: '',
  validateRules: {},
  url: '',
  cbBeforeSendForm: '',
  cbAfterSendForm: '',
  $submitButton: $('#submitbutton'),
  $dropdownSubmit: $('#dropdownSubmit'),
  $submitModeInput: $('input[name="submitMode"]'),
  processData: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  keyboardShortcuts: true,
  enableDirrity: true,
  configWorkerEnabled: true,
  oldFormValues: [],
  initialize: function () {
    function initialize() {
      if (Form.enableDirrity) Form.initializeDirrity();
      Form.$submitButton.on('click', function (e) {
        e.preventDefault();
        if (Form.$submitButton.hasClass('loading')) return;
        if (Form.$submitButton.hasClass('disabled')) return;
        Form.$formObj.form({
          on: 'blur',
          fields: Form.validateRules,
          onSuccess: function () {
            function onSuccess() {
              Form.submitForm();
            }

            return onSuccess;
          }(),
          onFailure: function () {
            function onFailure() {
              Form.$formObj.removeClass('error').addClass('error');
            }

            return onFailure;
          }()
        });
        Form.$formObj.form('validate form');
      });

      if (Form.$dropdownSubmit.length > 0) {
        Form.$dropdownSubmit.dropdown({
          onChange: function () {
            function onChange(value) {
              var translateKey = "bt_".concat(value);
              Form.$submitModeInput.val(value);
              Form.$submitButton.html("<i class=\"save icon\"></i> ".concat(globalTranslate[translateKey])).click();
            }

            return onChange;
          }()
        });
      }

      Form.$formObj.on('submit', function (e) {
        e.preventDefault();
      });
    }

    return initialize;
  }(),

  /**
   * Инициализация отслеживания изменений формы
   */
  initializeDirrity: function () {
    function initializeDirrity() {
      Form.saveInitialValues();
      Form.setEvents();
      Form.$submitButton.addClass('disabled');
      Form.$dropdownSubmit.addClass('disabled');
    }

    return initializeDirrity;
  }(),

  /**
   * Сохраняет первоначальные значения для проверки на изменения формы
   */
  saveInitialValues: function () {
    function saveInitialValues() {
      Form.oldFormValues = Form.$formObj.form('get values');
    }

    return saveInitialValues;
  }(),

  /**
   * Запускает обработчики изменения объектов формы
   */
  setEvents: function () {
    function setEvents() {
      Form.$formObj.find('input, select').change(function () {
        Form.checkValues();
      });
      Form.$formObj.find('input, textarea').on('keyup keydown blur', function () {
        Form.checkValues();
      });
      Form.$formObj.find('.ui.checkbox').on('click', function () {
        Form.checkValues();
      });
    }

    return setEvents;
  }(),

  /**
   * Сверяет изменения старых и новых значений формы
   */
  checkValues: function () {
    function checkValues() {
      var newFormValues = Form.$formObj.form('get values');

      if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
        Form.$submitButton.addClass('disabled');
        Form.$dropdownSubmit.addClass('disabled');
      } else {
        Form.$submitButton.removeClass('disabled');
        Form.$dropdownSubmit.removeClass('disabled');
      }
    }

    return checkValues;
  }(),

  /**
   * Отправка формы на сервер
   */
  submitForm: function () {
    function submitForm() {
      $.api({
        url: Form.url,
        on: 'now',
        method: 'POST',
        processData: Form.processData,
        contentType: Form.contentType,
        keyboardShortcuts: Form.keyboardShortcuts,
        beforeSend: function () {
          function beforeSend(settings) {
            Form.$submitButton.addClass('loading');
            var cbBeforeSendResult = Form.cbBeforeSendForm(settings);

            if (cbBeforeSendResult === false) {
              Form.$submitButton.transition('shake').removeClass('loading');
            } else {
              $.each(cbBeforeSendResult.data, function (index, value) {
                if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
                if (typeof value === 'string') cbBeforeSendResult.data[index] = value.trim();
              });
            }

            return cbBeforeSendResult;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            $('.ui.message.ajax').remove();
            var requestWithoutErrors = true;
            $.each(response.message, function (index, value) {
              if (index === 'error') {
                Form.$submitButton.transition('shake').removeClass('loading');
                Form.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
                requestWithoutErrors = false;
              }
            });
            var event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
            Form.cbAfterSendForm(response);
            if (Form.configWorkerEnabled && requestWithoutErrors) ConfigWorker.restartWorker();

            if (response.success && response.reload.length > 0 && Form.$submitModeInput.val() === 'SaveSettings') {
              window.location = globalRootUrl + response.reload;
            } else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndAddNew') {
              var emptyUrl = window.location.href.split('modify');

              if (emptyUrl.length > 1) {
                window.location = "".concat(emptyUrl[0], "modify/");
              }
            } else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndExit') {
              var _emptyUrl = window.location.href.split('modify');

              if (_emptyUrl.length > 1) {
                window.location = "".concat(_emptyUrl[0]);
              }
            } else if (response.success && response.reload.length > 0) {
              window.location = globalRootUrl + response.reload;
            } else if (Form.enableDirrity) {
              Form.initializeDirrity();
            }
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            Form.$formObj.after(response);
            Form.$submitButton.transition('shake').removeClass('loading');
          }

          return onFailure;
        }()
      });
    }

    return submitForm;
  }()
}; // export default Form;
//# sourceMappingURL=form.js.map