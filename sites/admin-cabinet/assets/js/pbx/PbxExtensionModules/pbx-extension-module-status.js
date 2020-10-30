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
  function PbxExtensionStatus() {
    _classCallCheck(this, PbxExtensionStatus);
  }

  _createClass(PbxExtensionStatus, [{
    key: "initialize",
    value: function () {
      function initialize(uniqid) {
        var changeLabel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
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

      return initialize;
    }()
  }, {
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

          if (response.data.changedObjects !== undefined) {
            UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
          }
        } else {
          this.$toggle.checkbox('set checked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          this.$disabilityFields.removeClass('disabled');

          if (response !== undefined && response.messages !== undefined) {
            UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
          }
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

          if (response.data.changedObjects !== undefined) {
            UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
          }
        } else {
          this.$toggle.checkbox('set unchecked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          this.$disabilityFields.addClass('disabled');

          if (response !== undefined && response.messages !== undefined) {
            UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
          }
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
    var pageStatus = new PbxExtensionStatus();
    pageStatus.initialize(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJkYXRhIiwiY2hhbmdlZE9iamVjdHMiLCJ1bmRlZmluZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQiLCJyZW1vdmVDbGFzcyIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVhZHkiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsImluaXRpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7Ozs7O0FBUUE7SUFDTUEsa0I7Ozs7Ozs7Ozs7MEJBQ01DLE0s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Q0FBNEJkLFFBQVEsQ0FBQ1UsSUFBVCxDQUFjQyxjQUExQyxFQUEwRGxCLGVBQWUsQ0FBQ3NCLHdCQUExRTtBQUNBO0FBQ0QsU0FiRCxNQWFPO0FBQ04sZUFBS3JDLE9BQUwsQ0FBYVEsUUFBYixDQUFzQixlQUF0QjtBQUNBLGVBQUtNLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ1UsZ0NBQXJDO0FBQ0EsZUFBS3JCLGlCQUFMLENBQXVCUyxRQUF2QixDQUFnQyxVQUFoQzs7QUFDQSxjQUFJUyxRQUFRLEtBQUtZLFNBQWIsSUFBMEJaLFFBQVEsQ0FBQ2tCLFFBQVQsS0FBc0JOLFNBQXBELEVBQStEO0FBQzlEQyxZQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJkLFFBQVEsQ0FBQ2tCLFFBQXJDLEVBQStDekIsZUFBZSxDQUFDMEIsMkJBQS9EO0FBQ0E7QUFDRDs7QUFDRCxhQUFLekMsT0FBTCxDQUFhdUMsV0FBYixDQUF5QixVQUF6QjtBQUNBOzs7Ozs7Ozs7QUFHRnRDLENBQUMsQ0FBQzBCLFFBQUQsQ0FBRCxDQUFZZSxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHMUMsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkIyQyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJaEQsa0JBQUosRUFBbkI7QUFDQWdELElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDQTtBQUNELENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblx0aW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuXHRcdHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuXHRcdGlmIChjaGFuZ2VMYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9IGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLnVuaXFpZCA9IHVuaXFpZDtcblx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG5cdFx0Y29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuXHRcdGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG5cdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG5cdFx0XHRvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcblx0XHR9KTtcblx0fVxuXHRjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuXHRcdGlmICh0aGlzLiRsYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwudGV4dChuZXdUZXh0KTtcblx0XHR9XG5cdH1cblx0Y2JPbkNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbUVuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG5cdH1cblx0Y2JPblVuY2hlY2tlZCgpIHtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRGlzYWJsZSk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuJHRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxufVxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGNvbnN0IHVuaXFJZCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0aWYgKHVuaXFJZCkge1xuXHRcdGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG5cdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgdHJ1ZSk7XG5cdH1cbn0pO1xuIl19