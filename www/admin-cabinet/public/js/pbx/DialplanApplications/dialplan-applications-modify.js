"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, ace, Form, Extensions */
// Проверка нет ли ошибки занятого другой учеткой номера
$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

var dialplanApplication = {
  $number: $('#extension'),
  defaultExtension: '',
  $formObj: $('#dialplan-application-form'),
  $dirrtyField: $('#dirrty'),
  editor: '',
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.da_ValidateNameIsEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.da_ValidateExtensionIsEmpty
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.da_ValidateExtensionDouble
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#application-code-menu .item').tab();

      if (dialplanApplication.$formObj.form('get value', 'name').length === 0) {
        $('#application-code-menu .item').tab('change tab', 'main');
      }

      $('.type-select').dropdown({
        onChange: dialplanApplication.changeAceMode
      }); // Динамическая проверка свободен ли внутренний номер

      dialplanApplication.$number.on('change', function () {
        var newNumber = dialplanApplication.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(dialplanApplication.defaultExtension, newNumber);
      });
      dialplanApplication.initializeAce();
      dialplanApplication.initializeForm();
      dialplanApplication.changeAceMode();
      dialplanApplication.defaultExtension = dialplanApplication.$formObj.form('get value', 'extension');
    }

    return initialize;
  }(),
  initializeAce: function () {
    function initializeAce() {
      dialplanApplication.editor = ace.edit('application-code');
      dialplanApplication.editor.setTheme('ace/theme/monokai');
      dialplanApplication.editor.resize();
      dialplanApplication.editor.getSession().on('change', function () {
        dialplanApplication.$dirrtyField.val(Math.random());
        dialplanApplication.$dirrtyField.trigger('change');
      });
    }

    return initializeAce;
  }(),
  changeAceMode: function () {
    function changeAceMode() {
      var mode = dialplanApplication.$formObj.form('get value', 'type');
      var NewMode;

      if (mode === 'php') {
        NewMode = ace.require('ace/mode/php').Mode;
      } else {
        NewMode = ace.require('ace/mode/julia').Mode;
      }

      dialplanApplication.editor.session.setMode(new NewMode());
      dialplanApplication.editor.setTheme('ace/theme/monokai');
    }

    return changeAceMode;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = dialplanApplication.$formObj.form('get values');
      result.data.applicationlogic = dialplanApplication.editor.getValue();
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = dialplanApplication.$formObj;
      Form.url = "".concat(globalRootUrl, "dialplan-applications/save");
      Form.validateRules = dialplanApplication.validateRules;
      Form.cbBeforeSendForm = dialplanApplication.cbBeforeSendForm;
      Form.cbAfterSendForm = dialplanApplication.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  dialplanApplication.initialize();
});
//# sourceMappingURL=dialplan-applications-modify.js.map