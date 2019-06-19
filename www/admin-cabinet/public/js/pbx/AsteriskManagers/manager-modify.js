"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl,globalTranslate, Form */
var manager = {
  $formObj: $('#save-ami-form'),
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMISecretIsEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.network-filter-select').dropdown();
      $('.list .master.checkbox').checkbox({
        // check all children
        onChecked: function () {
          function onChecked() {
            var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
            $childCheckbox.checkbox('check');
          }

          return onChecked;
        }(),
        // uncheck all children
        onUnchecked: function () {
          function onUnchecked() {
            var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
            $childCheckbox.checkbox('uncheck');
          }

          return onUnchecked;
        }()
      });
      $('.list .child.checkbox').checkbox({
        // Fire on load to set parent value
        fireOnInit: true,
        // Change parent state on each child checkbox change
        onChange: function () {
          function onChange() {
            var $listGroup = $(this).closest('.list');
            var $parentCheckbox = $listGroup.closest('.item').children('.checkbox');
            var $checkbox = $listGroup.find('.checkbox');
            var allChecked = true;
            var allUnchecked = true; // check to see if all other siblings are checked or unchecked

            $checkbox.each(function () {
              if ($(this).checkbox('is checked')) {
                allUnchecked = false;
              } else {
                allChecked = false;
              }
            }); // set parent checkbox state, but dont trigger its onChange callback

            if (allChecked) {
              $parentCheckbox.checkbox('set checked');
            } else if (allUnchecked) {
              $parentCheckbox.checkbox('set unchecked');
            } else {
              $parentCheckbox.checkbox('set indeterminate');
            }
          }

          return onChange;
        }()
      });
      $('.uncheck.button').on('click', function (e) {
        e.preventDefault();
        $('.checkbox').checkbox('uncheck');
      });
      manager.initializeForm();
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = manager.$formObj.form('get values');
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
      Form.$formObj = manager.$formObj;
      Form.url = "".concat(globalRootUrl, "asterisk-managers/save");
      Form.validateRules = manager.validateRules;
      Form.cbBeforeSendForm = manager.cbBeforeSendForm;
      Form.cbAfterSendForm = manager.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=manager-modify.js.map