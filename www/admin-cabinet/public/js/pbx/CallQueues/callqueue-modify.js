"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl, globalTranslate, Extensions,Form  */
// Проверка нет ли ошибки занятого другой учеткой номера
$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

var callQueue = {
  defaultExtension: '',
  $number: $('#extension'),
  $dirrtyField: $('#dirrty'),
  AvailableMembersList: [],
  $formObj: $('#queue-form'),
  $errorMessages: $('#form-error-messages'),
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateExtensionEmpty
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.cq_ValidateExtensionDouble
      }]
    }
  },
  initialize: function () {
    function initialize() {
      Extensions.getPhoneExtensions(callQueue.setAvailableQueueMembers);
      callQueue.defaultExtension = $('#extension').val();
      $('.ui.accordion').accordion();
      $('.dropdown').dropdown();
      $('.checkbox').checkbox();
      $('.periodic-announce-sound-id-select').dropdown({
        onChange: function () {
          function onChange(value) {
            if (parseInt(value, 10) === -1) $(this).dropdown('clear'); // console.log(value);
          }

          return onChange;
        }()
      });
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
      Extensions.fixBugDropdownIcon(); // Динамическая прововерка свободен ли внутренний номер

      callQueue.$number.on('change', function () {
        var newNumber = callQueue.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(callQueue.defaultNumber, newNumber);
      });
      callQueue.initializeDragAndDropExtensionTableRows(); // Удаление строки из таблицы участников очереди

      $('.delete-row-button').on('click', function (e) {
        $(e.target).closest('tr').remove();
        callQueue.reinitializeExtensionSelect();
        callQueue.updateExtensionTableView();
        callQueue.$dirrtyField.val(Math.random());
        callQueue.$dirrtyField.trigger('change');
        e.preventDefault();
        return false;
      });
      callQueue.initializeForm();
    }

    return initialize;
  }(),
  setAvailableQueueMembers: function () {
    function setAvailableQueueMembers(arrResult) {
      $.each(arrResult.results, function (index, extension) {
        callQueue.AvailableMembersList.push({
          number: extension.value,
          callerid: extension.name
        });
      });
      callQueue.reinitializeExtensionSelect();
      callQueue.updateExtensionTableView();
    }

    return setAvailableQueueMembers;
  }(),
  // Вернуть список доступных членов очереди
  getAvailableQueueMembers: function () {
    function getAvailableQueueMembers() {
      var result = [];
      callQueue.AvailableMembersList.forEach(function (member) {
        if ($(".member-row#".concat(member.number)).length === 0) {
          result.push({
            name: member.callerid,
            value: member.number
          });
        }
      }); // result.sort((a, b) => ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)));

      return result;
    }

    return getAvailableQueueMembers;
  }(),
  // Пересобрать членов очереди с учетом уже выбранных
  reinitializeExtensionSelect: function () {
    function reinitializeExtensionSelect() {
      $('#extensionselect').dropdown({
        action: 'hide',
        forceSelection: false,
        onChange: function () {
          function onChange(value, text) {
            if (value) {
              var $tr = $('.member-row-tpl').last();
              var $clone = $tr.clone(true);
              $clone.removeClass('member-row-tpl').addClass('member-row').show();
              $clone.attr('id', value);
              $clone.find('.number').html(value);
              $clone.find('.callerid').html(text);

              if ($('.member-row').last().length === 0) {
                $tr.after($clone);
              } else {
                $('.member-row').last().after($clone);
              }

              callQueue.reinitializeExtensionSelect();
              callQueue.updateExtensionTableView();
              callQueue.$dirrtyField.val(Math.random());
              callQueue.$dirrtyField.trigger('change');
            }
          }

          return onChange;
        }(),
        values: callQueue.getAvailableQueueMembers()
      });
    }

    return reinitializeExtensionSelect;
  }(),
  // Включить возможность перетаскивания элементов таблицы участников очереди
  initializeDragAndDropExtensionTableRows: function () {
    function initializeDragAndDropExtensionTableRows() {
      $('#extensionsTable').tableDnD({
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle',
        onDrop: function () {
          function onDrop() {
            callQueue.$dirrtyField.val(Math.random());
            callQueue.$dirrtyField.trigger('change');
          }

          return onDrop;
        }()
      });
    }

    return initializeDragAndDropExtensionTableRows;
  }(),
  // Отобразить заглушку если в таблице 0 строк
  updateExtensionTableView: function () {
    function updateExtensionTableView() {
      var dummy = "<tr class=\"dummy\"><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.cq_AddQueueMembers, "</td></tr>");

      if ($('.member-row').length === 0) {
        $('#extensionsTable tbody').append(dummy);
      } else {
        $('.dummy').remove();
      }
    }

    return updateExtensionTableView;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = callQueue.$formObj.form('get values');
      var arrMembers = [];
      $('.member-row').each(function (index, obj) {
        if ($(obj).attr('id')) {
          arrMembers.push({
            number: $(obj).attr('id'),
            priority: index
          });
        }
      });

      if (arrMembers.length === 0) {
        result = false;
        callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
        callQueue.$formObj.addClass('error');
      } else {
        result.data.members = JSON.stringify(arrMembers);
      }

      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      callQueue.defaultNumber = callQueue.$number.val();
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = callQueue.$formObj;
      Form.url = "".concat(globalRootUrl, "call-queues/save");
      Form.validateRules = callQueue.validateRules;
      Form.cbBeforeSendForm = callQueue.cbBeforeSendForm;
      Form.cbAfterSendForm = callQueue.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  callQueue.initialize();
});
//# sourceMappingURL=callqueue-modify.js.map