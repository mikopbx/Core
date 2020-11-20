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
        this.$statusIcon = $("tr#".concat(uniqid, " i.status-icon"));

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
        this.$statusIcon.addClass('spinner loading icon');
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
        this.$statusIcon.addClass('spinner loading icon');
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
          this.$statusIcon.removeClass('spinner loading icon');
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
        this.$statusIcon.removeClass('spinner loading icon');
      }

      return cbAfterModuleDisable;
    }()
  }, {
    key: "cbAfterModuleEnable",
    value: function () {
      function cbAfterModuleEnable(response, success) {
        if (success) {
          this.$toggle.checkbox('set checked');
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
        this.$statusIcon.removeClass('spinner loading icon');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHN0YXR1c0ljb24iLCIkbGFiZWwiLCJmaW5kIiwiJGRpc2FiaWxpdHlGaWVsZHMiLCJjYk9uQ2hlY2tlZCIsInByb3h5IiwiY2JPblVuY2hlY2tlZCIsImNoZWNrYm94Iiwib25DaGVja2VkIiwib25VbmNoZWNrZWQiLCJuZXdUZXh0IiwidGV4dCIsImFkZENsYXNzIiwiY2hhbmdlTGFiZWxUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nIiwiY2JBZnRlck1vZHVsZUVuYWJsZSIsIlBieEFwaSIsIlN5c3RlbUVuYWJsZU1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVEaXNhYmxlIiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsInJlc3BvbnNlIiwic3VjY2VzcyIsInJlbW92ZUNsYXNzIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJ3aW5kb3ciLCJkaXNwYXRjaEV2ZW50IiwiZGF0YSIsImNoYW5nZWRPYmplY3RzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwibWVzc2FnZXMiLCJleHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiaW5pdGlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtJQUNNQSxrQjs7Ozs7Ozs7OzswQkFDTUMsTSxFQUE0QjtBQUFBLFlBQXBCQyxXQUFvQix1RUFBTixJQUFNO0FBQ3RDLGFBQUtDLE9BQUwsR0FBZUMsQ0FBQyw0Q0FBb0NILE1BQXBDLFNBQWhCO0FBQ0EsYUFBS0ksV0FBTCxHQUFtQkQsQ0FBQyxjQUFPSCxNQUFQLG9CQUFwQjs7QUFDQSxZQUFJQyxXQUFKLEVBQWlCO0FBQ2hCLGVBQUtJLE1BQUwsR0FBY0YsQ0FBQyw0Q0FBb0NILE1BQXBDLFNBQUQsQ0FBaURNLElBQWpELENBQXNELE9BQXRELENBQWQ7QUFDQSxTQUZELE1BRU87QUFDTixlQUFLRCxNQUFMLEdBQWMsS0FBZDtBQUNBOztBQUNELGFBQUtMLE1BQUwsR0FBY0EsTUFBZDtBQUNBLGFBQUtPLGlCQUFMLEdBQXlCSixDQUFDLGNBQU9ILE1BQVAsa0JBQTFCO0FBQ0EsWUFBTVEsV0FBVyxHQUFHTCxDQUFDLENBQUNNLEtBQUYsQ0FBUSxLQUFLRCxXQUFiLEVBQTBCLElBQTFCLENBQXBCO0FBQ0EsWUFBTUUsYUFBYSxHQUFHUCxDQUFDLENBQUNNLEtBQUYsQ0FBUSxLQUFLQyxhQUFiLEVBQTRCLElBQTVCLENBQXRCO0FBQ0EsYUFBS1IsT0FBTCxDQUFhUyxRQUFiLENBQXNCO0FBQ3JCQyxVQUFBQSxTQUFTLEVBQUVKLFdBRFU7QUFFckJLLFVBQUFBLFdBQVcsRUFBRUg7QUFGUSxTQUF0QjtBQUlBOzs7Ozs7OytCQUNlSSxPLEVBQVM7QUFDeEIsWUFBSSxLQUFLVCxNQUFULEVBQWlCO0FBQ2hCLGVBQUtBLE1BQUwsQ0FBWVUsSUFBWixDQUFpQkQsT0FBakI7QUFDQTtBQUNEOzs7Ozs7OzZCQUNhO0FBQ2IsYUFBS1YsV0FBTCxDQUFpQlksUUFBakIsQ0FBMEIsc0JBQTFCO0FBQ0EsYUFBS2QsT0FBTCxDQUFhYyxRQUFiLENBQXNCLFVBQXRCO0FBQ0EsYUFBS0MsZUFBTCxDQUFxQkMsZUFBZSxDQUFDQyx3QkFBckM7QUFDQSxZQUFNQyxtQkFBbUIsR0FBR2pCLENBQUMsQ0FBQ00sS0FBRixDQUFRLEtBQUtXLG1CQUFiLEVBQWtDLElBQWxDLENBQTVCO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0Msa0JBQVAsQ0FBMEIsS0FBS3RCLE1BQS9CLEVBQXVDb0IsbUJBQXZDO0FBQ0E7Ozs7Ozs7K0JBQ2U7QUFDZixhQUFLaEIsV0FBTCxDQUFpQlksUUFBakIsQ0FBMEIsc0JBQTFCO0FBQ0EsYUFBS2QsT0FBTCxDQUFhYyxRQUFiLENBQXNCLFVBQXRCO0FBQ0EsYUFBS0MsZUFBTCxDQUFxQkMsZUFBZSxDQUFDQyx3QkFBckM7QUFDQSxZQUFNSSxvQkFBb0IsR0FBR3BCLENBQUMsQ0FBQ00sS0FBRixDQUFRLEtBQUtjLG9CQUFiLEVBQW1DLElBQW5DLENBQTdCO0FBQ0FGLFFBQUFBLE1BQU0sQ0FBQ0csbUJBQVAsQ0FBMkIsS0FBS3hCLE1BQWhDLEVBQXdDdUIsb0JBQXhDO0FBQ0E7Ozs7Ozs7b0NBQ29CRSxRLEVBQVVDLE8sRUFBUztBQUN2QyxZQUFJQSxPQUFKLEVBQWE7QUFDWixlQUFLeEIsT0FBTCxDQUFhUyxRQUFiLENBQXNCLGVBQXRCO0FBQ0EsZUFBS1AsV0FBTCxDQUFpQnVCLFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBLGVBQUtWLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ1UsZ0NBQXJDO0FBQ0EsY0FBTUMsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixVQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IscUJBQWhCLEVBQXVDLEtBQXZDLEVBQThDLElBQTlDO0FBQ0FDLFVBQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckI7QUFDQUEsVUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBQyxVQUFBQSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJMLEtBQXJCO0FBQ0EsZUFBS3RCLGlCQUFMLENBQXVCUyxRQUF2QixDQUFnQyxVQUFoQzs7QUFDQSxjQUFJUyxRQUFRLENBQUNVLElBQVQsQ0FBY0MsY0FBZCxLQUFpQ0MsU0FBckMsRUFBK0M7QUFDOUNDLFlBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QmQsUUFBUSxDQUFDVSxJQUFULENBQWNDLGNBQTFDLEVBQTBEbEIsZUFBZSxDQUFDc0Isd0JBQTFFO0FBQ0E7QUFDRCxTQWJELE1BYU87QUFDTixlQUFLdEMsT0FBTCxDQUFhUyxRQUFiLENBQXNCLGFBQXRCO0FBQ0EsZUFBS00sZUFBTCxDQUFxQkMsZUFBZSxDQUFDdUIsK0JBQXJDO0FBQ0EsZUFBS2xDLGlCQUFMLENBQXVCb0IsV0FBdkIsQ0FBbUMsVUFBbkM7O0FBQ0EsY0FBSUYsUUFBUSxLQUFLWSxTQUFiLElBQTBCWixRQUFRLENBQUNpQixRQUFULEtBQXNCTCxTQUFwRCxFQUErRDtBQUM5REMsWUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCZCxRQUFRLENBQUNpQixRQUFyQyxFQUErQ3hCLGVBQWUsQ0FBQ3lCLDJCQUEvRDtBQUNBO0FBQ0Q7O0FBQ0QsYUFBS3pDLE9BQUwsQ0FBYXlCLFdBQWIsQ0FBeUIsVUFBekI7QUFDQSxhQUFLdkIsV0FBTCxDQUFpQnVCLFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBOzs7Ozs7O21DQUNtQkYsUSxFQUFVQyxPLEVBQVM7QUFDdEMsWUFBSUEsT0FBSixFQUFhO0FBQ1osZUFBS3hCLE9BQUwsQ0FBYVMsUUFBYixDQUFzQixhQUF0QjtBQUNBLGVBQUtNLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ3VCLCtCQUFyQztBQUNBLGNBQU1aLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsVUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLHFCQUFoQixFQUF1QyxLQUF2QyxFQUE4QyxJQUE5QztBQUNBQyxVQUFBQSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJMLEtBQXJCO0FBQ0FBLFVBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQUMsVUFBQUEsTUFBTSxDQUFDQyxhQUFQLENBQXFCTCxLQUFyQjtBQUNBLGVBQUt0QixpQkFBTCxDQUF1Qm9CLFdBQXZCLENBQW1DLFVBQW5DOztBQUNBLGNBQUlGLFFBQVEsQ0FBQ1UsSUFBVCxDQUFjQyxjQUFkLEtBQWlDQyxTQUFyQyxFQUErQztBQUM5Q0MsWUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCZCxRQUFRLENBQUNVLElBQVQsQ0FBY0MsY0FBMUMsRUFBMERsQixlQUFlLENBQUNzQix3QkFBMUU7QUFDQTtBQUNELFNBWkQsTUFZTztBQUNOLGVBQUt0QyxPQUFMLENBQWFTLFFBQWIsQ0FBc0IsZUFBdEI7QUFDQSxlQUFLTSxlQUFMLENBQXFCQyxlQUFlLENBQUNVLGdDQUFyQztBQUNBLGVBQUtyQixpQkFBTCxDQUF1QlMsUUFBdkIsQ0FBZ0MsVUFBaEM7O0FBQ0EsY0FBSVMsUUFBUSxLQUFLWSxTQUFiLElBQTBCWixRQUFRLENBQUNpQixRQUFULEtBQXNCTCxTQUFwRCxFQUErRDtBQUM5REMsWUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCZCxRQUFRLENBQUNpQixRQUFyQyxFQUErQ3hCLGVBQWUsQ0FBQ3lCLDJCQUEvRDtBQUNBO0FBQ0Q7O0FBQ0QsYUFBS3pDLE9BQUwsQ0FBYXlCLFdBQWIsQ0FBeUIsVUFBekI7QUFDQSxhQUFLdkIsV0FBTCxDQUFpQnVCLFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBOzs7Ozs7Ozs7QUFHRnhCLENBQUMsQ0FBQzJCLFFBQUQsQ0FBRCxDQUFZYyxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHMUMsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkIyQyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJaEQsa0JBQUosRUFBbkI7QUFDQWdELElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDQTtBQUNELENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblx0aW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuXHRcdHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuXHRcdHRoaXMuJHN0YXR1c0ljb24gPSAkKGB0ciMke3VuaXFpZH0gaS5zdGF0dXMtaWNvbmApO1xuXHRcdGlmIChjaGFuZ2VMYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9IGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLnVuaXFpZCA9IHVuaXFpZDtcblx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG5cdFx0Y29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuXHRcdGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG5cdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcblx0XHRcdG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG5cdFx0XHRvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcblx0XHR9KTtcblx0fVxuXHRjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuXHRcdGlmICh0aGlzLiRsYWJlbCkge1xuXHRcdFx0dGhpcy4kbGFiZWwudGV4dChuZXdUZXh0KTtcblx0XHR9XG5cdH1cblx0Y2JPbkNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZUVuYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRW5hYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuU3lzdGVtRW5hYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRW5hYmxlKTtcblx0fVxuXHRjYk9uVW5jaGVja2VkKCkge1xuXHRcdHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVEaXNhYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVEaXNhYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZURpc2FibGUpO1xuXHR9XG5cdGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuJHRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHR9XG59XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRpZiAodW5pcUlkKSB7XG5cdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcblx0XHRwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCB0cnVlKTtcblx0fVxufSk7XG4iXX0=