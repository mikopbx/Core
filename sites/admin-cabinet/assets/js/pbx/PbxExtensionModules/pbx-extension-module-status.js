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
          event.initEvent('ConfigDataChanged', false, true);
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
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event);
          this.$disabilityFields.removeClass('disabled');
        } else {
          this.$toggle.checkbox('set unchecked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          this.$disabilityFields.addClass('disabled');
        }

        if (response.data !== undefined && response.data.messages !== undefined) {
          UserMessage.showMultiString(response.data.messages, globalTranslate.ext_ModuleChangeStatusError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJkYXRhIiwidW5kZWZpbmVkIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJleHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBRU1BLGtCOzs7QUFDTCw4QkFBWUMsTUFBWixFQUF3QztBQUFBLFFBQXBCQyxXQUFvQix1RUFBTixJQUFNOztBQUFBOztBQUN2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S3hDLE9BQUwsQ0FBYWlDLFdBQWIsQ0FBeUIsVUFBekI7QUFDQTs7Ozs7Ozs7O0FBR0ZoQyxDQUFDLENBQUMwQixRQUFELENBQUQsQ0FBWWMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCLE1BQU1DLE1BQU0sR0FBR3pDLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCMEMsSUFBM0IsQ0FBZ0MsWUFBaEMsQ0FBZjs7QUFDQSxNQUFJRCxNQUFKLEVBQVk7QUFDWCxRQUFNRSxVQUFVLEdBQUcsSUFBSS9DLGtCQUFKLENBQXVCNkMsTUFBdkIsRUFBK0IsSUFBL0IsQ0FBbkI7QUFDQTtBQUNELENBTEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXHRjb25zdHJ1Y3Rvcih1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuXHRcdHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuXHRcdGlmIChjaGFuZ2VMYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9IGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLnVuaXFpZCA9IHVuaXFpZDtcblx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG5cdFx0Y29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuXHRcdGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG5cdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG5cdFx0XHRvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcblx0XHR9KTtcblx0fVxuXHRjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuXHRcdGlmICh0aGlzLiRsYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwudGV4dChuZXdUZXh0KTtcblx0XHR9XG5cdH1cblx0Y2JPbkNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbUVuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG5cdH1cblx0Y2JPblVuY2hlY2tlZCgpIHtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRGlzYWJsZSk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kYXRhICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UuZGF0YS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0fVxuXHRcdHRoaXMuJHRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodGhpcy51bmlxaWQpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UuZGF0YSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLmRhdGEubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdGlmICh1bmlxSWQpIHtcblx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cyh1bmlxSWQsIHRydWUpO1xuXHR9XG59KTtcbiJdfQ==