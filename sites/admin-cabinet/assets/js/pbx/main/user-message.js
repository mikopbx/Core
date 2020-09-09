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
            if (Array.isArray(messagesArray)) {
              messagesArray.pop(index);
            } else {
              delete messagesArray[index];
            }
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
          } else if (index === 'info') {
            UserMessage.showInformation(newValue, header);
          } else {
            UserMessage.showWraning(newValue, header);
          }

          previousMessage = value;
        });
      } else {
        var content = '';
        $.each(messagesArray, function (index, value) {
          var newValue = value;

          if (previousMessage !== value) {
            if (Array.isArray(newValue)) {
              newValue = newValue.join('<br>');
            }

            content = "".concat(content, "<br>").concat(newValue);
          }

          previousMessage = value;
        });
        UserMessage.$ajaxMessagesDiv.after("<div class=\"ui warning message ajax\"><div class=\"ui header\">".concat(header, "</div>").concat(content, "</div>"));
        UserMessage.scrollToMessages();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwic2hvd0Vycm9yIiwidGV4dCIsImhlYWRlciIsInRvYXN0IiwiZGlzcGxheVRpbWUiLCJtZXNzYWdlIiwidGl0bGUiLCJjb21wYWN0Iiwic2hvd1dyYW5pbmciLCJzaG93SW5mb3JtYXRpb24iLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJwb3AiLCJlcnJvciIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiam9pbiIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsImNvbnRlbnQiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7QUFRQSxJQUFNQSxXQUFXLEdBQUc7QUFDbkJDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FEQTtBQUVuQkMsRUFBQUEsU0FGbUI7QUFBQSx1QkFFVEMsSUFGUyxFQUVVO0FBQUEsVUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQzVCSCxNQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQ0VJLEtBREYsQ0FDUTtBQUNOLGlCQUFPLE9BREQ7QUFFTkMsUUFBQUEsV0FBVyxFQUFFLENBRlA7QUFHTkMsUUFBQUEsT0FBTyxFQUFFSixJQUhIO0FBSU5LLFFBQUFBLEtBQUssRUFBRUosTUFKRDtBQUtOSyxRQUFBQSxPQUFPLEVBQUU7QUFMSCxPQURSO0FBUUE7O0FBWGtCO0FBQUE7QUFZbkJDLEVBQUFBLFdBWm1CO0FBQUEseUJBWVBQLElBWk8sRUFZWTtBQUFBLFVBQWJDLE1BQWEsdUVBQUosRUFBSTtBQUM5QkgsTUFBQUEs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QUFXLENBQUNDLGdCQUFaLENBQTZCa0MsTUFBN0IsR0FBc0NDO0FBRDFCLE9BQXhCLEVBRUcsSUFGSDtBQUdBOztBQWpHa0I7QUFBQTtBQUFBLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuXHQkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXHRzaG93RXJyb3IodGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnZXJyb3InLFxuXHRcdFx0XHRkaXNwbGF5VGltZTogMCxcblx0XHRcdFx0bWVzc2FnZTogdGV4dCxcblx0XHRcdFx0dGl0bGU6IGhlYWRlcixcblx0XHRcdFx0Y29tcGFjdDogZmFsc2UsXG5cdFx0XHR9KTtcblx0fSxcblx0c2hvd1dyYW5pbmcodGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnd2FybmluZycsXG5cdFx0XHRcdGRpc3BsYXlUaW1lOiAwLFxuXHRcdFx0XHRtZXNzYWdlOiB0ZXh0LFxuXHRcdFx0XHR0aXRsZTogaGVhZGVyLFxuXHRcdFx0XHRjb21wYWN0OiBmYWxzZSxcblx0XHRcdH0pO1xuXHR9LFxuXHRzaG93SW5mb3JtYXRpb24odGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnc3VjY2VzcycsXG5cdFx0XHRcdGRpc3BsYXlUaW1lOiA1MDAwLFxuXHRcdFx0XHRtZXNzYWdlOiB0ZXh0LFxuXHRcdFx0XHR0aXRsZTogaGVhZGVyLFxuXHRcdFx0XHRjb21wYWN0OiBmYWxzZSxcblx0XHRcdH0pO1xuXHR9LFxuXHRzaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGhlYWRlciA9ICcnKSB7XG5cdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdGlmICghbWVzc2FnZXMpIHJldHVybjtcblxuXHRcdC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcblx0XHRsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuXHRcdGlmICgoQXJyYXkuaXNBcnJheShtZXNzYWdlcykgfHwgdHlwZW9mIG1lc3NhZ2VzID09PSAnb2JqZWN0Jylcblx0XHRcdCYmIE9iamVjdC5rZXlzKG1lc3NhZ2VzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRtZXNzYWdlc0FycmF5ID0gbWVzc2FnZXM7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXMsIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0aWYgKCF2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzQXJyYXkpKXtcblx0XHRcdFx0XHRcdG1lc3NhZ2VzQXJyYXkucG9wKGluZGV4KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2VzQXJyYXlbaW5kZXhdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSAmJiBtZXNzYWdlcykge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IHsgZXJyb3I6IG1lc3NhZ2VzIH07XG5cdFx0fVxuXHRcdGxldCBwcmV2aW91c01lc3NhZ2UgPSAnJztcblx0XHRpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRpZiAocHJldmlvdXNNZXNzYWdlID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0bmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG5ld1ZhbHVlLmxlbmd0aCA+IDEwMCkge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke25ld1ZhbHVlfTwvZGl2PmApO1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gJ2luZm8nKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dXcmFuaW5nKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCBjb250ZW50ID0gJyc7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0aWYgKHByZXZpb3VzTWVzc2FnZSAhPT0gdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcblx0XHRcdFx0XHRcdG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb250ZW50ID0gYCR7Y29udGVudH08YnI+JHtuZXdWYWx1ZX1gO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2XG5cdFx0XHRcdC5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZSBhamF4XCI+PGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PiR7Y29udGVudH08L2Rpdj5gKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0XHR9XG5cdH0sXG5cdHNjcm9sbFRvTWVzc2FnZXMoKSB7XG5cdFx0JCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0c2Nyb2xsVG9wOiBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2Lm9mZnNldCgpLnRvcCxcblx0XHR9LCAyMDAwKTtcblx0fSxcbn07XG4iXX0=