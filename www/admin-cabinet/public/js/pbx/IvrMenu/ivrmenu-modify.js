"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl, ivrActions, globalTranslate, Form, Extensions */
$.fn.form.settings.rules.existRule = function () {
  return $('#extension-error').hasClass('hidden');
};

var ivrMenu = {
  $formObj: $('#ivr-menu-form'),
  $number: $('#extension'),
  $dirrtyField: $('#dirrty'),
  $errorMessages: $('#form-error-messages'),
  $rowTemplate: $('#row-template'),
  defaultExtension: '',
  actionsRowsCount: 0,
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateNameIsEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsEmpty
      }, {
        type: 'existRule',
        prompt: globalTranslate.iv_ValidateExtensionIsDouble
      }]
    },
    timeout_extension: {
      identifier: 'timeout_extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateTimeoutExtensionIsEmpty
      }]
    },
    audio_message_id: {
      identifier: 'audio_message_id',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateAudioFileIsEmpty
      }]
    },
    timeout: {
      identifier: 'timeout',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateTimeoutOutOfRange
      }]
    },
    number_of_repeat: {
      identifier: 'number_of_repeat',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateRepeatNumberOutOfRange
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.ui.dropdown').dropdown(); // Динамическая прововерка свободен ли выбранный номер

      ivrMenu.$number.on('change', function () {
        var newNumber = ivrMenu.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(ivrMenu.defaultNumber, newNumber);
      });
      $('#add-new-ivr-action').on('click', function (el) {
        ivrMenu.addNewActionRow();
        ivrMenu.rebuildActionExtensionsDropdown();
        ivrMenu.$dirrtyField.val(Math.random());
        ivrMenu.$dirrtyField.trigger('change');
        el.preventDefault();
      });
      ivrMenu.initializeForm();
      ivrMenu.buildIvrMenuActions();
      ivrMenu.defaultExtension = ivrMenu.$formObj.form('get value', 'extension');
    }

    return initialize;
  }(),
  buildIvrMenuActions: function () {
    function buildIvrMenuActions() {
      var objActions = JSON.parse(ivrActions);
      objActions.forEach(function (element) {
        ivrMenu.addNewActionRow(element);
      });
      if (objActions.length === 0) ivrMenu.addNewActionRow();
      ivrMenu.rebuildActionExtensionsDropdown();
    }

    return buildIvrMenuActions;
  }(),
  addNewFormRules: function () {
    function addNewFormRules(newRowId) {
      var $digitsClass = "digits-".concat(newRowId);
      ivrMenu.validateRules[$digitsClass] = {
        identifier: $digitsClass,
        rules: [{
          type: 'regExp[/^[0-9]{1,7}$/]',
          prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
        }, {
          type: 'checkDoublesDigits',
          prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
        }]
      };
      var $extensionClass = "extension-".concat(newRowId);
      ivrMenu.validateRules[$extensionClass] = {
        identifier: $extensionClass,
        rules: [{
          type: 'empty',
          prompt: globalTranslate.iv_ValidateExtensionIsNotCorrect
        }]
      };
    }

    return addNewFormRules;
  }(),
  addNewActionRow: function () {
    function addNewActionRow(paramObj) {
      var param = {
        id: '',
        extension: '',
        extensionRepresent: '',
        digits: ''
      };

      if (paramObj !== undefined) {
        param = paramObj;
      }

      ivrMenu.actionsRowsCount += 1;
      var $actionTemplate = ivrMenu.$rowTemplate.clone();
      $actionTemplate.removeClass('hidden').attr('id', "row-".concat(ivrMenu.actionsRowsCount)).attr('data-value', ivrMenu.actionsRowsCount).attr('style', '');
      $actionTemplate.find('input[name="digits-id"]').attr('id', "digits-".concat(ivrMenu.actionsRowsCount)).attr('name', "digits-".concat(ivrMenu.actionsRowsCount)).attr('value', param.digits);
      $actionTemplate.find('input[name="extension-id"]').attr('id', "extension-".concat(ivrMenu.actionsRowsCount)).attr('name', "extension-".concat(ivrMenu.actionsRowsCount)).attr('value', param.extension);
      $actionTemplate.find('div.delete-action-row').attr('data-value', ivrMenu.actionsRowsCount);

      if (param.extensionRepresent.length > 0) {
        $actionTemplate.find('div.default.text').removeClass('default').html(param.extensionRepresent);
      } else {
        $actionTemplate.find('div.default.text').html(globalTranslate.ex_SelectNumber);
      }

      $('#actions-place').append($actionTemplate);
      ivrMenu.addNewFormRules(ivrMenu.actionsRowsCount);
    }

    return addNewActionRow;
  }(),
  rebuildActionExtensionsDropdown: function () {
    function rebuildActionExtensionsDropdown() {
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty(ivrMenu.cbOnExtensionSelect));
      Extensions.fixBugDropdownIcon();
      $('.delete-action-row').on('click', function (e) {
        e.preventDefault();
        var id = $(this).attr('data-value');
        delete ivrMenu.validateRules["digits-".concat(id)];
        delete ivrMenu.validateRules["extension-".concat(id)];
        $("#row-".concat(id)).remove();
        ivrMenu.$dirrtyField.val(Math.random());
        ivrMenu.$dirrtyField.trigger('change');
      });
    }

    return rebuildActionExtensionsDropdown;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = ivrMenu.$formObj.form('get values');
      var arrActions = [];
      $('.action-row').each(function (index, obj) {
        var rowId = $(obj).attr('data-value');

        if (rowId > 0) {
          arrActions.push({
            digits: ivrMenu.$formObj.form('get value', "digits-".concat(rowId)),
            extension: ivrMenu.$formObj.form('get value', "extension-".concat(rowId))
          });
        }
      });

      if (arrActions.length === 0) {
        result = false;
        ivrMenu.$errorMessages.html(globalTranslate.iv_ValidateNoIVRExtensions);
        ivrMenu.$formObj.addClass('error');
      } else {
        result.data.actions = JSON.stringify(arrActions);
      }

      return result;
    }

    return cbBeforeSendForm;
  }(),

  /**
   * Срабатывает при выборе номера из выпадающего списка
   */
  cbOnExtensionSelect: function () {
    function cbOnExtensionSelect() {
      ivrMenu.$dirrtyField.val(Math.random());
      ivrMenu.$dirrtyField.trigger('change');
    }

    return cbOnExtensionSelect;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = ivrMenu.$formObj;
      Form.url = "".concat(globalRootUrl, "ivr-menu/save");
      Form.validateRules = ivrMenu.validateRules;
      Form.cbBeforeSendForm = ivrMenu.cbBeforeSendForm;
      Form.cbAfterSendForm = ivrMenu.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};

$.fn.form.settings.rules.checkDoublesDigits = function (value) {
  var count = 0;
  $("input[id^='digits']").each(function (index, obj) {
    if (ivrMenu.$formObj.form('get value', "".concat(obj.id)) === value) count += 1;
  });
  return count === 1;
};

$(document).ready(function () {
  ivrMenu.initialize();
});
//# sourceMappingURL=ivrmenu-modify.js.map