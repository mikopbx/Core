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
    var pageStatus = new PbxExtensionStatus();
    pageStatus.initialize(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJ1bmRlZmluZWQiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsImV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciIsInJlYWR5IiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiLCJpbml0aWFsaXplIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBQ01BLGtCOzs7Ozs7Ozs7OzBCQUNNQyxNLEVBQTRCO0FBQUEsWUFBcEJDLFdBQW9CLHVFQUFOLElBQU07QUFDdEMs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MkJBQS9EO0FBQ0E7O0FBQ0QsYUFBS3ZDLE9BQUwsQ0FBYWlDLFdBQWIsQ0FBeUIsVUFBekI7QUFDQTs7Ozs7Ozs7O0FBR0ZoQyxDQUFDLENBQUMwQixRQUFELENBQUQsQ0FBWWEsS0FBWixDQUFrQixZQUFNO0FBQ3ZCLE1BQU1DLE1BQU0sR0FBR3hDLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCeUMsSUFBM0IsQ0FBZ0MsWUFBaEMsQ0FBZjs7QUFDQSxNQUFJRCxNQUFKLEVBQVk7QUFDWCxRQUFNRSxVQUFVLEdBQUcsSUFBSTlDLGtCQUFKLEVBQW5CO0FBQ0E4QyxJQUFBQSxVQUFVLENBQUNDLFVBQVgsQ0FBc0JILE1BQXRCLEVBQThCLElBQTlCO0FBQ0E7QUFDRCxDQU5EIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UgKi9cbmNsYXNzIFBieEV4dGVuc2lvblN0YXR1cyB7XG5cdGluaXRpYWxpemUodW5pcWlkLCBjaGFuZ2VMYWJlbCA9IHRydWUpIHtcblx0XHR0aGlzLiR0b2dnbGUgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKTtcblx0XHRpZiAoY2hhbmdlTGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy51bmlxaWQgPSB1bmlxaWQ7XG5cdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuXHRcdGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcblx0XHRjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuXHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG5cdFx0XHRvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuXHRcdFx0b25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG5cdFx0fSk7XG5cdH1cblx0Y2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcblx0XHRpZiAodGhpcy4kbGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG5cdFx0fVxuXHR9XG5cdGNiT25DaGVja2VkKCkge1xuXHRcdHRoaXMuJHRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRW5hYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVFbmFibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1FbmFibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVFbmFibGUpO1xuXHR9XG5cdGNiT25VbmNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVEaXNhYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVEaXNhYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZURpc2FibGUpO1xuXHR9XG5cdGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVJlbG9hZE1vZHVsZSh0aGlzLnVuaXFpZCk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0fVxuXHRcdHRoaXMuJHRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodGhpcy51bmlxaWQpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdGlmICh1bmlxSWQpIHtcblx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIHRydWUpO1xuXHR9XG59KTtcbiJdfQ==