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
          this.$disabilityFields.addClass('disabled');
        } else {
          this.$toggle.checkbox('set checked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          this.$disabilityFields.removeClass('disabled');
        }

        if (response.data !== undefined && response.data.messages !== undefined) {
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
          this.$disabilityFields.removeClass('disabled');
        } else {
          this.$toggle.checkbox('set unchecked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          this.$disabilityFields.addClass('disabled');
        }

        if (response.data !== undefined && response.data.messages !== undefined) {
          UserMessage.showMultiString(response.data, globalTranslate.ext_ModuleChangeStatusError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJkYXRhIiwidW5kZWZpbmVkIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJleHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBRU1BLGtCOzs7QUFDTCw4QkFBWUMsTUFBWixFQUF3QztBQUFBLFFBQXBCQyxXQUFvQix1RUFBTixJQUFNOztBQUFBOztBQUN2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LENBQTJCMEMsSUFBM0IsQ0FBZ0MsWUFBaEMsQ0FBZjs7QUFDQSxNQUFJRCxNQUFKLEVBQVk7QUFDWCxRQUFNRSxVQUFVLEdBQUcsSUFBSS9DLGtCQUFKLENBQXVCNkMsTUFBdkIsRUFBK0IsSUFBL0IsQ0FBbkI7QUFDQTtBQUNELENBTEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXHRjb25zdHJ1Y3Rvcih1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuXHRcdHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuXHRcdGlmIChjaGFuZ2VMYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9IGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLnVuaXFpZCA9IHVuaXFpZDtcblx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG5cdFx0Y29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuXHRcdGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG5cdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG5cdFx0XHRvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcblx0XHR9KTtcblx0fVxuXHRjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuXHRcdGlmICh0aGlzLiRsYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwudGV4dChuZXdUZXh0KTtcblx0XHR9XG5cdH1cblx0Y2JPbkNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbUVuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG5cdH1cblx0Y2JPblVuY2hlY2tlZCgpIHtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRGlzYWJsZSk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLmRhdGEgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5kYXRhLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHR9XG5cdFx0dGhpcy4kdG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG5cdGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVJlbG9hZE1vZHVsZSh0aGlzLnVuaXFpZCk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLmRhdGEgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5kYXRhLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHR9XG5cdFx0dGhpcy4kdG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG59XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRpZiAodW5pcUlkKSB7XG5cdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXModW5pcUlkLCB0cnVlKTtcblx0fVxufSk7XG4iXX0=