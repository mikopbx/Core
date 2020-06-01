"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form */
var manager = {
  $formObj: $('#save-ami-form'),
  $dropDowns: $('#save-ami-form .ui.dropdown'),
  $masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),
  $childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),
  $allCheckBoxes: $('#save-ami-form .list .checkbox'),
  $unCheckButton: $('.uncheck.button'),
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
      manager.$dropDowns.dropdown();
      manager.$masterCheckBoxes.checkbox({
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
      manager.$childrenCheckBoxes.checkbox({
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
      manager.$unCheckButton.on('click', function (e) {
        e.preventDefault();
        manager.$allCheckBoxes.checkbox('uncheck');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImNoZWNrYm94Iiwib25DaGVja2VkIiwiJGNoaWxkQ2hlY2tib3giLCJjbG9zZXN0Iiwic2libGluZ3MiLCJmaW5kIiwib25VbmNoZWNrZWQiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCIkbGlzdEdyb3VwIiwiJHBhcmVudENoZWNrYm94IiwiY2hpbGRyZW4iLCIkY2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZWFjaCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaW5pdGlhbGl6ZUZvcm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFPQTtBQUVBLElBQU1BLE9BQU8sR0FBRztBQUNmQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURJO0FBRWZDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLDZCQUFELENBRkU7QUFHZkUsRUFBQUEsaUJBQWlCLEVBQUVGLENBQUMs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QUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmxELEVBQUFBLE9BQU8sQ0FBQ2tCLFVBQVI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuY29uc3QgbWFuYWdlciA9IHtcblx0JGZvcm1PYmo6ICQoJyNzYXZlLWFtaS1mb3JtJyksXG5cdCRkcm9wRG93bnM6ICQoJyNzYXZlLWFtaS1mb3JtIC51aS5kcm9wZG93bicpLFxuXHQkbWFzdGVyQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLm1hc3Rlci5jaGVja2JveCcpLFxuXHQkY2hpbGRyZW5DaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hpbGQuY2hlY2tib3gnKSxcblx0JGFsbENoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5jaGVja2JveCcpLFxuXHQkdW5DaGVja0J1dHRvbjogJCgnLnVuY2hlY2suYnV0dG9uJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHR1c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzZWNyZXQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bWFuYWdlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cdFx0bWFuYWdlci4kbWFzdGVyQ2hlY2tCb3hlc1xuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gY2hlY2sgYWxsIGNoaWxkcmVuXG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyB1bmNoZWNrIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHRtYW5hZ2VyLiRjaGlsZHJlbkNoZWNrQm94ZXNcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdC8vIEZpcmUgb24gbG9hZCB0byBzZXQgcGFyZW50IHZhbHVlXG5cdFx0XHRcdGZpcmVPbkluaXQ6IHRydWUsXG5cdFx0XHRcdC8vIENoYW5nZSBwYXJlbnQgc3RhdGUgb24gZWFjaCBjaGlsZCBjaGVja2JveCBjaGFuZ2Vcblx0XHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdFx0Y29uc3QgJGxpc3RHcm91cCA9ICQodGhpcykuY2xvc2VzdCgnLmxpc3QnKTtcblx0XHRcdFx0XHRjb25zdCAkcGFyZW50Q2hlY2tib3ggPSAkbGlzdEdyb3VwLmNsb3Nlc3QoJy5pdGVtJykuY2hpbGRyZW4oJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdGNvbnN0ICRjaGVja2JveCA9ICRsaXN0R3JvdXAuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0bGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGxldCBhbGxVbmNoZWNrZWQgPSB0cnVlO1xuXHRcdFx0XHRcdC8vIGNoZWNrIHRvIHNlZSBpZiBhbGwgb3RoZXIgc2libGluZ3MgYXJlIGNoZWNrZWQgb3IgdW5jaGVja2VkXG5cdFx0XHRcdFx0JGNoZWNrYm94LmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdFx0XHRhbGxVbmNoZWNrZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGFsbENoZWNrZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHQvLyBzZXQgcGFyZW50IGNoZWNrYm94IHN0YXRlLCBidXQgZG9udCB0cmlnZ2VyIGl0cyBvbkNoYW5nZSBjYWxsYmFja1xuXHRcdFx0XHRcdGlmIChhbGxDaGVja2VkKSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0bWFuYWdlci4kdW5DaGVja0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuXHRcdH0pO1xuXHRcdG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBtYW5hZ2VyLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYW5hZ2VyLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG5cbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19