"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalTranslate, UserMessage */
var PbxExtensionStatus =
/*#__PURE__*/
function () {
  function PbxExtensionStatus(uniqid) {
    var changeLabel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    _classCallCheck(this, PbxExtensionStatus);

    this.$toggle = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]"));

    if (changeLabel) {
      this.$label = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]")).find('label');
    } else {
      this.$label = false;
    }

    this.uniqid = uniqid;
    this.$disabilityFields = $("tr#".concat(uniqid, " .disability"));
    var cbOnChecked = $.proxy(this.cbOnChecked, this);
    var cbOnUnchecked = $.proxy(this.cbOnUnchecked, this);
    this.$toggle.checkbox({
      onChecked: cbOnChecked,
      onUnchecked: cbOnUnchecked
    });
  }

  _createClass(PbxExtensionStatus, [{
    key: "changeLabelText",
    value: function () {
      function changeLabelText(newText) {
        if (this.$label) {
          this.$label.text(newText);
        }
      }

      return changeLabelText;
    }()
  }, {
    key: "cbOnChecked",
    value: function () {
      function cbOnChecked() {
        this.$toggle.addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
        PbxApi.SystemEnableModule(this.uniqid, cbAfterModuleEnable);
      }

      return cbOnChecked;
    }()
  }, {
    key: "cbOnUnchecked",
    value: function () {
      function cbOnUnchecked() {
        this.$toggle.addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
        PbxApi.SystemDisableModule(this.uniqid, cbAfterModuleDisable);
      }

      return cbOnUnchecked;
    }()
  }, {
    key: "cbAfterModuleDisable",
    value: function () {
      function cbAfterModuleDisable(response, success) {
        if (success) {
          this.$toggle.checkbox('set unchecked');
          PbxApi.SystemReloadModule(this.uniqid);
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          var event = document.createEvent('Event');
          event.initEvent('ModuleStatusChanged', false, true);
          window.dispatchEvent(event);
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event);
          this.$disabilityFields.addClass('disabled');
        } else {
          this.$toggle.checkbox('set checked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          this.$disabilityFields.removeClass('disabled');
        }

        if (response !== undefined && response.messages !== undefined) {
          UserMessage.showMultiString(response.message, globalTranslate.ext_ModuleChangeStatusError);
        }

        this.$toggle.removeClass('disabled');
      }

      return cbAfterModuleDisable;
    }()
  }, {
    key: "cbAfterModuleEnable",
    value: function () {
      function cbAfterModuleEnable(response, success) {
        if (success) {
          this.$toggle.checkbox('set checked');
          PbxApi.SystemReloadModule(this.uniqid);
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          var event = document.createEvent('Event');
          event.initEvent('ModuleStatusChanged', false, true);
          window.dispatchEvent(event);
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event);
          this.$disabilityFields.removeClass('disabled');
        } else {
          this.$toggle.checkbox('set unchecked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          this.$disabilityFields.addClass('disabled');
        }

        if (response !== undefined && response.messages !== undefined) {
          UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
        }

        this.$toggle.removeClass('disabled');
      }

      return cbAfterModuleEnable;
    }()
  }]);

  return PbxExtensionStatus;
}();

$(document).ready(function () {
  var uniqId = $('#module-status-toggle').attr('data-value');

  if (uniqId) {
    var pageStatus = new PbxExtensionStatus(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJ1bmRlZmluZWQiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsImV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciIsInJlYWR5IiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7Ozs7O0FBUUE7SUFFTUEsa0I7OztBQUNMLDhCQUFZQyxNQUFaLEVBQXdDO0FBQUEsUUFBcEJDLFdBQW9CLHVFQUFOLElBQU07O0FBQUE7O0FBQ3ZDLFNBQUtD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QUFDQTs7QUFDRCxhQUFLdkMsT0FBTCxDQUFhaUMsV0FBYixDQUF5QixVQUF6QjtBQUNBOzs7Ozs7Ozs7QUFHRmhDLENBQUMsQ0FBQzBCLFFBQUQsQ0FBRCxDQUFZYSxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHeEMsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJ5QyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJOUMsa0JBQUosQ0FBdUI0QyxNQUF2QixFQUErQixJQUEvQixDQUFuQjtBQUNBO0FBQ0QsQ0FMRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlICovXG5cbmNsYXNzIFBieEV4dGVuc2lvblN0YXR1cyB7XG5cdGNvbnN0cnVjdG9yKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG5cdFx0dGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG5cdFx0aWYgKGNoYW5nZUxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gZmFsc2U7XG5cdFx0fVxuXHRcdHRoaXMudW5pcWlkID0gdW5pcWlkO1xuXHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMgPSAkKGB0ciMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKTtcblx0XHRjb25zdCBjYk9uQ2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uQ2hlY2tlZCwgdGhpcyk7XG5cdFx0Y29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcblx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goe1xuXHRcdFx0b25DaGVja2VkOiBjYk9uQ2hlY2tlZCxcblx0XHRcdG9uVW5jaGVja2VkOiBjYk9uVW5jaGVja2VkLFxuXHRcdH0pO1xuXHR9XG5cdGNoYW5nZUxhYmVsVGV4dChuZXdUZXh0KSB7XG5cdFx0aWYgKHRoaXMuJGxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbC50ZXh0KG5ld1RleHQpO1xuXHRcdH1cblx0fVxuXHRjYk9uQ2hlY2tlZCgpIHtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZUVuYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRW5hYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuU3lzdGVtRW5hYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRW5hYmxlKTtcblx0fVxuXHRjYk9uVW5jaGVja2VkKCkge1xuXHRcdHRoaXMuJHRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRGlzYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodGhpcy51bmlxaWQpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHR9XG5cdFx0dGhpcy4kdG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG59XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRpZiAodW5pcUlkKSB7XG5cdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXModW5pcUlkLCB0cnVlKTtcblx0fVxufSk7XG4iXX0=