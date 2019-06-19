"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Extensions, Form */
// Если выбран вариант переадресации на номер, а сам номер не выбран
//
$.fn.form.settings.rules.extensionRule = function (value) {
  if ($('#action').val() === 'extension' && (value === -1 || value === '')) {
    return false;
  }

  return true;
};

var incomingRoutes = {
  $formObj: $('#default-rule-form'),
  validateRules: {
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'extensionRule',
        prompt: globalTranslate.ir_ValidateForwardingToBeFilled
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#routingTable').tableDnD({
        onDrop: function () {
          function onDrop() {
            $('.rule-row').each(function (index, obj) {
              var ruleId = $(obj).attr('id');
              var oldPriority = parseInt($(obj).attr('data-value'), 10);
              var newPriority = obj.rowIndex;

              if (oldPriority !== newPriority) {
                $.api({
                  on: 'now',
                  url: "".concat(globalRootUrl, "incoming-routes/changePriority/").concat(ruleId),
                  method: 'POST',
                  data: {
                    newPriority: newPriority
                  }
                });
              }
            });
          }

          return onDrop;
        }(),
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle'
      });
      $('#action').dropdown({
        onChange: function () {
          function onChange() {
            incomingRoutes.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      incomingRoutes.toggleDisabledFieldClass();
      incomingRoutes.initializeForm();
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty());
      Extensions.fixBugDropdownIcon();
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "incoming-routes/modify/").concat(id);
      });
    }

    return initialize;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (incomingRoutes.$formObj.form('get value', 'action') === 'extension') {
        $('#extension-group').show();
      } else {
        $('#extension-group').hide();
        $('#extension').dropdown('clear');
      }
    }

    return toggleDisabledFieldClass;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = incomingRoutes.$formObj.form('get values');
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
      Form.$formObj = incomingRoutes.$formObj;
      Form.url = "".concat(globalRootUrl, "incoming-routes/save");
      Form.validateRules = incomingRoutes.validateRules;
      Form.cbBeforeSendForm = incomingRoutes.cbBeforeSendForm;
      Form.cbAfterSendForm = incomingRoutes.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  incomingRoutes.initialize();
});
//# sourceMappingURL=incoming-route-index.js.map