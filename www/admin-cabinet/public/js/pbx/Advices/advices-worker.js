"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl, globalTranslate */
var advicesWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  $advices: $('#advices'),
  initialize: function () {
    function initialize() {
      advicesWorker.showPreviousAdvice(); // Запустим получение новых советов

      advicesWorker.restartWorker();
      window.addEventListener('ConfigDataChanged', advicesWorker.restartWorker);
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(advicesWorker.timeoutHandle);
      advicesWorker.worker();
    }

    return restartWorker;
  }(),

  /**
   * Показывает старые советы до получения обвноления со станции
   */
  showPreviousAdvice: function () {
    function showPreviousAdvice() {
      var previousAdvice = localStorage.getItem('previousAdvice');

      if (previousAdvice !== undefined) {
        advicesWorker.$advices.html(previousAdvice);
      }
    }

    return showPreviousAdvice;
  }(),
  worker: function () {
    function worker() {
      $.api({
        url: "".concat(globalRootUrl, "advices/getAdvices"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            advicesWorker.cbAfterResponse(response);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
      advicesWorker.timeoutHandle = window.setTimeout(advicesWorker.worker, advicesWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (response === undefined) return;
      advicesWorker.$advices.html('');

      if (response.success === true && response.message !== undefined) {
        var htmlMessages = '';

        if (response.message.error !== undefined && response.message.error.length > 0) {
          htmlMessages += '<div class="ui icon error message">';
          htmlMessages += '<i class="x icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeaderError, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.error, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        } else if (response.message.warning !== undefined && response.message.warning.length > 0) {
          htmlMessages += '<div class="ui icon warning message">';
          htmlMessages += '<i class="warning icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeader, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.warning, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        } else if (response.message.info !== undefined && response.message.info.length > 0) {
          htmlMessages += '<div class="ui icon info message">';
          htmlMessages += '<i class="info icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeader, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.info, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        }

        advicesWorker.$advices.html(htmlMessages);
        localStorage.setItem('previousAdvice', htmlMessages); // Проверим есть ли обновление системы

        if (response.message.info !== undefined && response.message.info.length > 0) {
          $.each(response.message.info, function (key, value) {
            if (value.indexOf('/admin-cabinet/update/index/') > -1) {
              $('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
            }
          });
        }
      } else if (response.success === true && response.message !== undefined && response.message.length === 0) {
        localStorage.removeItem('previousAdvice');
      }
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=advices-worker.js.map