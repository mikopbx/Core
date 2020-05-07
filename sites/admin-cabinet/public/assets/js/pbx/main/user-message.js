"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
var UserMessage = {
  $ajaxMessagesDiv: $('#ajax-messages'),
  showError: function () {
    function showError(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'error',
        displayTime: 0,
        message: text,
        title: header,
        compact: false
      });
    }

    return showError;
  }(),
  showWraning: function () {
    function showWraning(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'warning',
        displayTime: 0,
        message: text,
        title: header,
        compact: false
      });
    }

    return showWraning;
  }(),
  showInformation: function () {
    function showInformation(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'success',
        displayTime: 5000,
        message: text,
        title: header,
        compact: false
      });
    }

    return showInformation;
  }(),
  showMultiString: function () {
    function showMultiString(messages) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('.ui.message.ajax').remove();
      if (!messages) return; // Remove empty values

      var messagesArray = [];

      if ((Array.isArray(messages) || _typeof(messages) === 'object') && Object.keys(messages).length > 0) {
        messagesArray = messages;
        $.each(messages, function (index, value) {
          if (!value) {
            messagesArray.pop(index);
          }
        });
      } else if (!Array.isArray(messages) && messages) {
        messagesArray = {
          error: messages
        };
      }

      var previousMessage = '';

      if (messagesArray.length === 1 || Object.keys(messagesArray).length === 1) {
        $.each(messagesArray, function (index, value) {
          if (previousMessage === value) {
            return;
          }

          var newValue = value;

          if (Array.isArray(newValue)) {
            newValue = newValue.join('<br>');
          }

          if (newValue.length > 100) {
            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(newValue, "</div>"));
            UserMessage.scrollToMessages();
          } else if (index === 'error') {
            UserMessage.showError(newValue, header);
          } else if (index === 'warning') {
            UserMessage.showWraning(newValue, header);
          } else {
            UserMessage.showInformation(newValue, header);
          }

          previousMessage = value;
        });
      } else {
        $.each(messagesArray, function (index, value) {
          var newValue = value;

          if (previousMessage !== value) {
            if (Array.isArray(newValue)) {
              newValue = newValue.join('<br>');
            }

            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(newValue, "</div>"));
            UserMessage.scrollToMessages();
          }

          previousMessage = value;
        });
      }
    }

    return showMultiString;
  }(),
  scrollToMessages: function () {
    function scrollToMessages() {
      $('html, body').animate({
        scrollTop: UserMessage.$ajaxMessagesDiv.offset().top
      }, 2000);
    }

    return scrollToMessages;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwic2hvd0Vycm9yIiwidGV4dCIsImhlYWRlciIsInRvYXN0IiwiZGlzcGxheVRpbWUiLCJtZXNzYWdlIiwidGl0bGUiLCJjb21wYWN0Iiwic2hvd1dyYW5pbmciLCJzaG93SW5mb3JtYXRpb24iLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJwb3AiLCJlcnJvciIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiam9pbiIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7OztBQVFBLElBQU1BLFdBQVcsR0FBRztBQUNuQkMsRUFBQUEsZ0JBQWdCLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURBO0FBRW5CQyxFQUFBQSxTQUZtQjtBQUFBLHVCQUVUQyxJQUZTLEVBRVU7QUFBQSxVQUFiQyxNQUFhLHVFQUFKLEVBQUk7QUFDNUJILE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FDRUksS0FERixDQUNRO0FBQ04saUJBQU8sT0FERDtBQUVOQyxRQUFBQSxXQUFXLEVBQUUsQ0FGUDtBQUdOQyxRQUFBQSxPQUFPLEVBQUVKLElBSEg7QUFJTkssUUFBQUEsS0FBSyxFQUFFSixNQUpEO0FBS05LLFFBQUFBLE9BQU8sRUFBRTtBQUxILE9BRFI7QUFRQTs7QUFYa0I7QUFBQTtBQVluQkMsRUFBQUEsV0FabUI7QUFBQSx5QkFZUFAsSUFaTyxFQVlZO0FBQUEsVUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQzlCSCxNQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQ0VJLEtBREYsQ0FDUTtBQUNOLGlCQUFPLFNBREQ7QUFFTkMsUUFBQUEsV0FBVyxFQUFFLENBRlA7QUFHTkMsUUFBQUEsT0FBTyxFQUFFSixJQUhIO0FBSU5LLFFBQUFBLEtBQUssRUFBRUosTUFKRDtBQUtOSyxRQUFBQSxPQUFPLEVBQUU7QUFMSCxPQURSO0FBUUE7O0FBckJrQjtBQUFBO0FBc0JuQkUsRUFBQUEsZUF0Qm1CO0FBQUEsNkJBc0JIUixJQXRCRyxFQXNCZ0I7QUFBQSxVQUFiQyxNQUFhLHVFQUFKLEVBQUk7QUFDbENILE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FDRUksS0FERixDQUNRO0FBQ04saUJBQU8sU0FERDtBQUVOQyxRQUFBQSxXQUFXLEVBQUUsSUFGUDtBQUdOQyxRQUFBQSxPQUFPLEVBQUVKLElBSEg7QUFJTkssUUFBQUEsS0FBSyxFQUFFSixNQUpEO0FBS05LLFFBQUFBLE9BQU8sRUFBRTtBQUxILE9BRFI7QUFRQTs7QUEvQmtCO0FBQUE7QUFnQ25CRyxFQUFBQSxlQWhDbUI7QUFBQSw2QkFnQ0hDLFFBaENHLEVBZ0NvQjtBQUFBLFVBQWJULE1BQWEsdUVBQUosRUFBSTtBQUN0Q0gsTUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JhLE1BQXRCO0FBQ0EsVUFBSSxDQUFDRCxRQUFMLEVBQWUsT0FGdUIsQ0FJdEM7O0FBQ0EsVUFBSUUsYUFBYSxHQUFHLEVBQXBCOztBQUNBLFVBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNKLFFBQWQsS0FBMkIsUUFBT0EsUUFBUCxNQUFvQixRQUFoRCxLQUNBSyxNQUFNLENBQUNDLElBQVAsQ0FBWU4sUUFBWixFQUFzQk8sTUFBdEIsR0FBK0IsQ0FEbkMsRUFDc0M7QUFDckNMLFFBQUFBLGFBQWEsR0FBR0YsUUFBaEI7QUFDQVosUUFBQUEsQ0FBQyxDQUFDb0IsSUFBRixDQUFPUixRQUFQLEVBQWlCLFVBQUNTLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNsQyxjQUFJLENBQUNBLEtBQUwsRUFBWTtBQUNYUixZQUFBQSxhQUFhLENBQUNTLEdBQWQsQ0FBa0JGLEtBQWxCO0FBQ0E7QUFDRCxTQUpEO0FBS0EsT0FSRCxNQVFPLElBQUksQ0FBQ04sS0FBSyxDQUFDQyxPQUFOLENBQWNKLFFBQWQsQ0FBRCxJQUE0QkEsUUFBaEMsRUFBMEM7QUFDaERFLFFBQUFBLGFBQWEsR0FBRztBQUFFVSxVQUFBQSxLQUFLLEVBQUVaO0FBQVQsU0FBaEI7QUFDQTs7QUFDRCxVQUFJYSxlQUFlLEdBQUcsRUFBdEI7O0FBQ0EsVUFBSVgsYUFBYSxDQUFDSyxNQUFkLEtBQXlCLENBQXpCLElBQThCRixNQUFNLENBQUNDLElBQVAsQ0FBWUosYUFBWixFQUEyQkssTUFBM0IsS0FBc0MsQ0FBeEUsRUFBMkU7QUFDMUVuQixRQUFBQSxDQUFDLENBQUNvQixJQUFGLENBQU9OLGFBQVAsRUFBc0IsVUFBQ08sS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQ3ZDLGNBQUlHLGVBQWUsS0FBS0gsS0FBeEIsRUFBK0I7QUFDOUI7QUFDQTs7QUFDRCxjQUFJSSxRQUFRLEdBQUdKLEtBQWY7O0FBQ0EsY0FBSVAsS0FBSyxDQUFDQyxPQUFOLENBQWNVLFFBQWQsQ0FBSixFQUE2QjtBQUM1QkEsWUFBQUEsUUFBUSxHQUFHQSxRQUFRLENBQUNDLElBQVQsQ0FBYyxNQUFkLENBQVg7QUFDQTs7QUFDRCxjQUFJRCxRQUFRLENBQUNQLE1BQVQsR0FBa0IsR0FBdEIsRUFBMkI7QUFDMUJyQixZQUFBQSxXQUFXLENBQUNDLGdCQUFaLENBQTZCNkIsS0FBN0IsMkJBQXFEUCxLQUFyRCw2QkFBNEVLLFFBQTVFO0FBQ0E1QixZQUFBQSxXQUFXLENBQUMrQixnQkFBWjtBQUNBLFdBSEQsTUFHTyxJQUFJUixLQUFLLEtBQUssT0FBZCxFQUF1QjtBQUM3QnZCLFlBQUFBLFdBQVcsQ0FBQ0csU0FBWixDQUFzQnlCLFFBQXRCLEVBQWdDdkIsTUFBaEM7QUFDQSxXQUZNLE1BRUEsSUFBSWtCLEtBQUssS0FBSyxTQUFkLEVBQXlCO0FBQy9CdkIsWUFBQUEsV0FBVyxDQUFDVyxXQUFaLENBQXdCaUIsUUFBeEIsRUFBa0N2QixNQUFsQztBQUNBLFdBRk0sTUFFQTtBQUNOTCxZQUFBQSxXQUFXLENBQUNZLGVBQVosQ0FBNEJnQixRQUE1QixFQUFzQ3ZCLE1BQXRDO0FBQ0E7O0FBQ0RzQixVQUFBQSxlQUFlLEdBQUdILEtBQWxCO0FBQ0EsU0FuQkQ7QUFvQkEsT0FyQkQsTUFxQk87QUFDTnRCLFFBQUFBLENBQUMsQ0FBQ29CLElBQUYsQ0FBT04sYUFBUCxFQUFzQixVQUFDTyxLQUFELEVBQVFDLEtBQVIsRUFBa0I7QUFDdkMsY0FBSUksUUFBUSxHQUFHSixLQUFmOztBQUNBLGNBQUlHLGVBQWUsS0FBS0gsS0FBeEIsRUFBK0I7QUFDOUIsZ0JBQUlQLEtBQUssQ0FBQ0MsT0FBTixDQUFjVSxRQUFkLENBQUosRUFBNkI7QUFDNUJBLGNBQUFBLFFBQVEsR0FBR0EsUUFBUSxDQUFDQyxJQUFULENBQWMsTUFBZCxDQUFYO0FBQ0E7O0FBQ0Q3QixZQUFBQSxXQUFXLENBQUNDLGdCQUFaLENBQ0U2QixLQURGLDJCQUMwQlAsS0FEMUIsNkJBQ2lESyxRQURqRDtBQUVBNUIsWUFBQUEsV0FBVyxDQUFDK0IsZ0JBQVo7QUFDQTs7QUFDREosVUFBQUEsZUFBZSxHQUFHSCxLQUFsQjtBQUNBLFNBWEQ7QUFZQTtBQUNEOztBQXJGa0I7QUFBQTtBQXNGbkJPLEVBQUFBLGdCQXRGbUI7QUFBQSxnQ0FzRkE7QUFDbEI3QixNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCOEIsT0FBaEIsQ0FBd0I7QUFDdkJDLFFBQUFBLFNBQVMsRUFBRWpDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJpQyxNQUE3QixHQUFzQ0M7QUFEMUIsT0FBeEIsRUFFRyxJQUZIO0FBR0E7O0FBMUZrQjtBQUFBO0FBQUEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuY29uc3QgVXNlck1lc3NhZ2UgPSB7XG5cdCRhamF4TWVzc2FnZXNEaXY6ICQoJyNhamF4LW1lc3NhZ2VzJyksXG5cdHNob3dFcnJvcih0ZXh0LCBoZWFkZXIgPSAnJykge1xuXHRcdCQoJ2JvZHknKVxuXHRcdFx0LnRvYXN0KHtcblx0XHRcdFx0Y2xhc3M6ICdlcnJvcicsXG5cdFx0XHRcdGRpc3BsYXlUaW1lOiAwLFxuXHRcdFx0XHRtZXNzYWdlOiB0ZXh0LFxuXHRcdFx0XHR0aXRsZTogaGVhZGVyLFxuXHRcdFx0XHRjb21wYWN0OiBmYWxzZSxcblx0XHRcdH0pO1xuXHR9LFxuXHRzaG93V3JhbmluZyh0ZXh0LCBoZWFkZXIgPSAnJykge1xuXHRcdCQoJ2JvZHknKVxuXHRcdFx0LnRvYXN0KHtcblx0XHRcdFx0Y2xhc3M6ICd3YXJuaW5nJyxcblx0XHRcdFx0ZGlzcGxheVRpbWU6IDAsXG5cdFx0XHRcdG1lc3NhZ2U6IHRleHQsXG5cdFx0XHRcdHRpdGxlOiBoZWFkZXIsXG5cdFx0XHRcdGNvbXBhY3Q6IGZhbHNlLFxuXHRcdFx0fSk7XG5cdH0sXG5cdHNob3dJbmZvcm1hdGlvbih0ZXh0LCBoZWFkZXIgPSAnJykge1xuXHRcdCQoJ2JvZHknKVxuXHRcdFx0LnRvYXN0KHtcblx0XHRcdFx0Y2xhc3M6ICdzdWNjZXNzJyxcblx0XHRcdFx0ZGlzcGxheVRpbWU6IDUwMDAsXG5cdFx0XHRcdG1lc3NhZ2U6IHRleHQsXG5cdFx0XHRcdHRpdGxlOiBoZWFkZXIsXG5cdFx0XHRcdGNvbXBhY3Q6IGZhbHNlLFxuXHRcdFx0fSk7XG5cdH0sXG5cdHNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgaGVhZGVyID0gJycpIHtcblx0XHQkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0aWYgKCFtZXNzYWdlcykgcmV0dXJuO1xuXG5cdFx0Ly8gUmVtb3ZlIGVtcHR5IHZhbHVlc1xuXHRcdGxldCBtZXNzYWdlc0FycmF5ID0gW107XG5cdFx0aWYgKChBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSB8fCB0eXBlb2YgbWVzc2FnZXMgPT09ICdvYmplY3QnKVxuXHRcdFx0JiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcblx0XHRcdG1lc3NhZ2VzQXJyYXkgPSBtZXNzYWdlcztcblx0XHRcdCQuZWFjaChtZXNzYWdlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRpZiAoIXZhbHVlKSB7XG5cdFx0XHRcdFx0bWVzc2FnZXNBcnJheS5wb3AoaW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSAmJiBtZXNzYWdlcykge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IHsgZXJyb3I6IG1lc3NhZ2VzIH07XG5cdFx0fVxuXHRcdGxldCBwcmV2aW91c01lc3NhZ2UgPSAnJztcblx0XHRpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRpZiAocHJldmlvdXNNZXNzYWdlID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0bmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG5ld1ZhbHVlLmxlbmd0aCA+IDEwMCkge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke25ld1ZhbHVlfTwvZGl2PmApO1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gJ3dhcm5pbmcnKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd1dyYW5pbmcobmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRpZiAocHJldmlvdXNNZXNzYWdlICE9PSB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuXHRcdFx0XHRcdFx0bmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXZcblx0XHRcdFx0XHRcdC5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7bmV3VmFsdWV9PC9kaXY+YCk7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHRzY3JvbGxUb01lc3NhZ2VzKCkge1xuXHRcdCQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcblx0XHRcdHNjcm9sbFRvcDogVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5vZmZzZXQoKS50b3AsXG5cdFx0fSwgMjAwMCk7XG5cdH0sXG59O1xuIl19