"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
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
      $('.ui.message.ajax').remove();
      var previousMessage = '';

      if (Object.keys(messages).length === 1) {
        $.each(messages, function (index, value) {
          if (index === 'error') {
            UserMessage.showError(value);
          } else if (index === 'warning') {
            UserMessage.showWraning(value);
          } else {
            UserMessage.showInformation(value);
          }
        });
      } else {
        $.each(messages, function (index, value) {
          if (previousMessage !== value) {
            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
          }

          previousMessage = value;
        });
      }
    }

    return showMultiString;
  }()
};
//# sourceMappingURL=user-message.js.map