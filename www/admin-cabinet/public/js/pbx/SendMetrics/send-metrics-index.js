"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
 *
 */

/* global globalRootUrl */
$(document).ready(function () {
  var isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');

  if (isMetricsSend === null) {
    $.api({
      url: "".concat(globalRootUrl, "send-metrics/index"),
      on: 'now',
      onSuccess: function () {
        function onSuccess() {
          sessionStorage.setItem('MetricsAlreadySent', 'true');
        }

        return onSuccess;
      }()
    });
  }
});
//# sourceMappingURL=send-metrics-index.js.map