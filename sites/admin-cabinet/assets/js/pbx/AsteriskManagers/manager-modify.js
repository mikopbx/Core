"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl,globalTranslate, Form */

/**
 * Manager module.
 * @module manager
 */
var manager = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-ami-form'),

  /**
   * jQuery objects for dropdown elements.
   * @type {jQuery}
   */
  $dropDowns: $('#save-ami-form .ui.dropdown'),

  /**
   * jQuery objects for all checkbox elements.
   * @type {jQuery}
   */
  $allCheckBoxes: $('#save-ami-form .list .checkbox'),

  /**
   * jQuery object for the uncheck button.
   * @type {jQuery}
   */
  $unCheckButton: $('.uncheck.button'),

  /**
   * jQuery object for the username input field.
   * @type {jQuery}
   */
  $username: $('#username'),

  /**
   * Original username value.
   * @type {string}
   */
  originalName: '',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }, {
        type: 'existRule[username-error]',
        prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable
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

  /**
   * Initializes the manager module.
   */
  initialize: function initialize() {
    // Initialize dropdowns
    manager.$dropDowns.dropdown(); // Handle uncheck button click

    manager.$unCheckButton.on('click', function (e) {
      e.preventDefault();
      manager.$allCheckBoxes.checkbox('uncheck');
    }); // Handle username change

    manager.$username.on('change', function (value) {
      var userId = manager.$formObj.form('get value', 'id');
      var newValue = manager.$formObj.form('get value', 'username');
      manager.checkAvailability(manager.originalName, newValue, 'username', userId);
    });
    manager.initializeForm();
    manager.originalName = manager.$formObj.form('get value', 'username');
  },

  /**
   * Checks if the username doesn't exist in the database.
   * @param {string} oldName - The old username.
   * @param {string} newName - The new username.
   * @param {string} cssClassName - The CSS class name.
   * @param {string} userId - The user ID.
   */
  checkAvailability: function checkAvailability(oldName, newName) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'username';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldName === newName) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    }

    $.api({
      url: "".concat(globalRootUrl, "asterisk-managers/available/{value}"),
      stateContext: ".ui.input.".concat(cssClassName),
      on: 'now',
      beforeSend: function beforeSend(settings) {
        var result = settings;
        result.urlData = {
          value: newName
        };
        return result;
      },
      onSuccess: function onSuccess(response) {
        if (response.nameAvailable) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && response.userId === userId) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else {
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          $("#".concat(cssClassName, "-error")).removeClass('hidden');
        }
      }
    });
  },

  /**
   * Callback function before sending the form.
   * @param {object} settings - Settings object for the AJAX request.
   * @returns {object} - Modified settings object.
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = manager.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {// Callback function after sending the form
  },

  /**
   * Initializes the form.
   */
  initializeForm: function initializeForm() {
    Form.$formObj = manager.$formObj;
    Form.url = "".concat(globalRootUrl, "asterisk-managers/save"); // Form submission URL

    Form.validateRules = manager.validateRules; // Form validation rules

    Form.cbBeforeSendForm = manager.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = manager.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // Custom form validation rule for checking uniqueness of username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
 *  Initialize Asterisk Manager modify form on document ready
 */


$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImNoZWNrYm94IiwidmFsdWUiLCJ1c2VySWQiLCJmb3JtIiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVGb3JtIiwib2xkTmFtZSIsIm5ld05hbWUiLCJjc3NDbGFzc05hbWUiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN0YXRlQ29udGV4dCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsInJlc3VsdCIsInVybERhdGEiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm5hbWVBdmFpbGFibGUiLCJsZW5ndGgiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsT0FBTyxHQUFHO0FBQ1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMQzs7QUFPWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyw2QkFBRCxDQVhEOztBQWFaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLGdDQUFELENBakJMOztBQW1CWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxjQUFjLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQXZCTDs7QUF5Qlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsU0FBUyxFQUFFSixDQUFDLENBQUMsV0FBRCxDQTdCQTs7QUErQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsWUFBWSxFQUFFLEVBbkNGOztBQXFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTkMsTUFBQUEsVUFBVSxFQUFFLFVBRE47QUFFTkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREcsRUFLSDtBQUNJSCxRQUFBQSxJQUFJLEVBQUUsMkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNFO0FBRjVCLE9BTEc7QUFGRCxLQURDO0FBY1hDLElBQUFBLE1BQU0sRUFBRTtBQUNKUCxNQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0k7QUFGNUIsT0FERztBQUZIO0FBZEcsR0ExQ0g7O0FBbUVaO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXRFWSx3QkFzRUM7QUFDVDtBQUNBbkIsSUFBQUEsT0FBTyxDQUFDRyxVQUFSLENBQW1CaUIsUUFBbkIsR0FGUyxDQUlUOztBQUNBcEIsSUFBQUEsT0FBTyxDQUFDSyxjQUFSLENBQXVCZ0IsRUFBdkIsQ0FBMEIsT0FBMUIsRUFBbUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3RDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXZCLE1BQUFBLE9BQU8sQ0FBQ0ksY0FBUixDQUF1Qm9CLFFBQXZCLENBQWdDLFNBQWhDO0FBQ0gsS0FIRCxFQUxTLENBVVQ7O0FBQ0F4QixJQUFBQSxPQUFPLENBQUNNLFNBQVIsQ0FBa0JlLEVBQWxCLENBQXFCLFFBQXJCLEVBQStCLFVBQUNJLEtBQUQsRUFBVztBQUN0QyxVQUFNQyxNQUFNLEdBQUcxQixPQUFPLENBQUNDLFFBQVIsQ0FBaUIwQixJQUFqQixDQUFzQixXQUF0QixFQUFtQyxJQUFuQyxDQUFmO0FBQ0EsVUFBTUMsUUFBUSxHQUFHNUIsT0FBTyxDQUFDQyxRQUFSLENBQWlCMEIsSUFBakIsQ0FBc0IsV0FBdEIsRUFBbUMsVUFBbkMsQ0FBakI7QUFDQTNCLE1BQUFBLE9BQU8sQ0FBQzZCLGlCQUFSLENBQTBCN0IsT0FBTyxDQUFDTyxZQUFsQyxFQUFnRHFCLFFBQWhELEVBQTBELFVBQTFELEVBQXNFRixNQUF0RTtBQUNILEtBSkQ7QUFLQTFCLElBQUFBLE9BQU8sQ0FBQzhCLGNBQVI7QUFDQTlCLElBQUFBLE9BQU8sQ0FBQ08sWUFBUixHQUF1QlAsT0FBTyxDQUFDQyxRQUFSLENBQWlCMEIsSUFBakIsQ0FBc0IsV0FBdEIsRUFBbUMsVUFBbkMsQ0FBdkI7QUFDSCxHQXhGVzs7QUEwRlo7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsaUJBakdZLDZCQWlHTUUsT0FqR04sRUFpR2VDLE9BakdmLEVBaUdnRTtBQUFBLFFBQXhDQyxZQUF3Qyx1RUFBekIsVUFBeUI7QUFBQSxRQUFiUCxNQUFhLHVFQUFKLEVBQUk7O0FBQ3hFLFFBQUlLLE9BQU8sS0FBS0MsT0FBaEIsRUFBeUI7QUFDckI5QixNQUFBQSxDQUFDLHFCQUFjK0IsWUFBZCxFQUFELENBQStCQyxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQWpDLE1BQUFBLENBQUMsWUFBSytCLFlBQUwsWUFBRCxDQUE0QkcsUUFBNUIsQ0FBcUMsUUFBckM7QUFDQTtBQUNIOztBQUNEbEMsSUFBQUEsQ0FBQyxDQUFDbUMsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBS0MsYUFBTCx3Q0FERDtBQUVGQyxNQUFBQSxZQUFZLHNCQUFlUCxZQUFmLENBRlY7QUFHRlosTUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRm9CLE1BQUFBLFVBSkUsc0JBSVNDLFFBSlQsRUFJbUI7QUFDakIsWUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQUNibkIsVUFBQUEsS0FBSyxFQUFFTztBQURNLFNBQWpCO0FBR0EsZUFBT1csTUFBUDtBQUNILE9BVkM7QUFXRkUsTUFBQUEsU0FYRSxxQkFXUUMsUUFYUixFQVdrQjtBQUNoQixZQUFJQSxRQUFRLENBQUNDLGFBQWIsRUFBNEI7QUFDeEI3QyxVQUFBQSxDQUFDLHFCQUFjK0IsWUFBZCxFQUFELENBQStCQyxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQWpDLFVBQUFBLENBQUMsWUFBSytCLFlBQUwsWUFBRCxDQUE0QkcsUUFBNUIsQ0FBcUMsUUFBckM7QUFDSCxTQUhELE1BR08sSUFBSVYsTUFBTSxDQUFDc0IsTUFBUCxHQUFnQixDQUFoQixJQUFxQkYsUUFBUSxDQUFDcEIsTUFBVCxLQUFvQkEsTUFBN0MsRUFBcUQ7QUFDeER4QixVQUFBQSxDQUFDLHFCQUFjK0IsWUFBZCxFQUFELENBQStCQyxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQWpDLFVBQUFBLENBQUMsWUFBSytCLFlBQUwsWUFBRCxDQUE0QkcsUUFBNUIsQ0FBcUMsUUFBckM7QUFDSCxTQUhNLE1BR0E7QUFDSGxDLFVBQUFBLENBQUMscUJBQWMrQixZQUFkLEVBQUQsQ0FBK0JDLE1BQS9CLEdBQXdDRSxRQUF4QyxDQUFpRCxPQUFqRDtBQUNBbEMsVUFBQUEsQ0FBQyxZQUFLK0IsWUFBTCxZQUFELENBQTRCRSxXQUE1QixDQUF3QyxRQUF4QztBQUNIO0FBQ0o7QUF0QkMsS0FBTjtBQXdCSCxHQS9IVzs7QUFpSVo7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJYyxFQUFBQSxnQkF0SVksNEJBc0lLUCxRQXRJTCxFQXNJZTtBQUN2QixRQUFNQyxNQUFNLEdBQUdELFFBQWY7QUFDQUMsSUFBQUEsTUFBTSxDQUFDTyxJQUFQLEdBQWNsRCxPQUFPLENBQUNDLFFBQVIsQ0FBaUIwQixJQUFqQixDQUFzQixZQUF0QixDQUFkO0FBQ0EsV0FBT2dCLE1BQVA7QUFDSCxHQTFJVzs7QUE0SVo7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsZUFoSlksMkJBZ0pJTCxRQWhKSixFQWdKYyxDQUN0QjtBQUNILEdBbEpXOztBQW9KWjtBQUNKO0FBQ0E7QUFDSWhCLEVBQUFBLGNBdkpZLDRCQXVKSztBQUNic0IsSUFBQUEsSUFBSSxDQUFDbkQsUUFBTCxHQUFnQkQsT0FBTyxDQUFDQyxRQUF4QjtBQUNBbUQsSUFBQUEsSUFBSSxDQUFDZCxHQUFMLGFBQWNDLGFBQWQsNEJBRmEsQ0FFd0M7O0FBQ3JEYSxJQUFBQSxJQUFJLENBQUM1QyxhQUFMLEdBQXFCUixPQUFPLENBQUNRLGFBQTdCLENBSGEsQ0FHK0I7O0FBQzVDNEMsSUFBQUEsSUFBSSxDQUFDSCxnQkFBTCxHQUF3QmpELE9BQU8sQ0FBQ2lELGdCQUFoQyxDQUphLENBSXFDOztBQUNsREcsSUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCbkQsT0FBTyxDQUFDbUQsZUFBL0IsQ0FMYSxDQUttQzs7QUFDaERDLElBQUFBLElBQUksQ0FBQ2pDLFVBQUw7QUFDSDtBQTlKVyxDQUFoQixDLENBa0tBOztBQUNBakIsQ0FBQyxDQUFDbUQsRUFBRixDQUFLMUIsSUFBTCxDQUFVZSxRQUFWLENBQW1CL0IsS0FBbkIsQ0FBeUIyQyxTQUF6QixHQUFxQyxVQUFDN0IsS0FBRCxFQUFROEIsU0FBUjtBQUFBLFNBQXNCckQsQ0FBQyxZQUFLcUQsU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQXRELENBQUMsQ0FBQ3VELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxRCxFQUFBQSxPQUFPLENBQUNtQixVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSAqL1xuXG4vKipcbiAqIE1hbmFnZXIgbW9kdWxlLlxuICogQG1vZHVsZSBtYW5hZ2VyXG4gKi9cbmNvbnN0IG1hbmFnZXIgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYW1pLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBkcm9wZG93biBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNzYXZlLWFtaS1mb3JtIC51aS5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGFsbCBjaGVja2JveCBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhbGxDaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiAkKCcudW5jaGVjay5idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1c2VybmFtZSBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsTmFtZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtYW5hZ2VyIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBtYW5hZ2VyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBIYW5kbGUgdW5jaGVjayBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kdW5DaGVja0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJuYW1lJyk7XG4gICAgICAgICAgICBtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgdXNlcklkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VybmFtZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIHVzZXIgSUQuXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIHJlc3VsdC51cmxEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbmV3TmFtZSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm5hbWVBdmFpbGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcmVzcG9uc2UudXNlcklkID09PSB1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYmVmb3JlIHNlbmRpbmcgdGhlIGZvcm0uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3Mgb2JqZWN0IGZvciB0aGUgQUpBWCByZXF1ZXN0LlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gTW9kaWZpZWQgc2V0dGluZ3Mgb2JqZWN0LlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzZW5kaW5nIHRoZSBmb3JtXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB1bmlxdWVuZXNzIG9mIHVzZXJuYW1lXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogIEluaXRpYWxpemUgQXN0ZXJpc2sgTWFuYWdlciBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbWFuYWdlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==