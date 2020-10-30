"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global sessionStorage, PbxApi */
var sendMetrics = {
  initialize: function () {
    function initialize() {
      var isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');

      if (isMetricsSend === null) {
        PbxApi.LicenseSendPBXMetrics(sendMetrics.cbAfterMetricsSent);
      }
    }

    return initialize;
  }(),
  cbAfterMetricsSent: function () {
    function cbAfterMetricsSent(result) {
      if (result === true) {
        sessionStorage.setItem('MetricsAlreadySent', 'true');
      }
    }

    return cbAfterMetricsSent;
  }()
};
$(document).ready(function () {
  sendMetrics.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZW5kTWV0cmljcy9zZW5kLW1ldHJpY3MtaW5kZXguanMiXSwibmFtZXMiOlsic2VuZE1ldHJpY3MiLCJpbml0aWFsaXplIiwiaXNNZXRyaWNzU2VuZCIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsIlBieEFwaSIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsImNiQWZ0ZXJNZXRyaWNzU2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNuQkMsRUFBQUEsVUFEbUI7QUFBQSwwQkFDUDtBQUNYLFVBQU1DLGFBQWEsR0FBR0MsY0FBYyxDQUFDQyxPQUFmLENBQXVCLG9CQUF2QixDQUF0Qjs7QUFDQSxVQUFJRixhQUFhLEtBQUssSUFBdEIsRUFBNEI7QUFDM0JHLFFBQUFBLE1BQU0sQ0FBQ0MscUJBQVAsQ0FBNkJOLFdBQVcsQ0FBQ08sa0JBQXpDO0FBRUE7QUFDRDs7QUFQa0I7QUFBQTtBQVFuQkEsRUFBQUEsa0JBUm1CO0FBQUEsZ0NBUUFDLE1BUkEsRUFRTztBQUN6QixVQUFJQSxNQUFNLEtBQUcsSUFBYixFQUFrQjtBQUNqQkwsUUFBQUEsY0FBYyxDQUFDTSxPQUFmLENBQXVCLG9CQUF2QixFQUE2QyxNQUE3QztBQUNBO0FBQ0Q7O0FBWmtCO0FBQUE7QUFBQSxDQUFwQjtBQWNBQyxDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJaLEVBQUFBLFdBQVcsQ0FBQ0MsVUFBWjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGkgKi9cbmNvbnN0IHNlbmRNZXRyaWNzID0ge1xuXHRpbml0aWFsaXplKCl7XG5cdFx0Y29uc3QgaXNNZXRyaWNzU2VuZCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ01ldHJpY3NBbHJlYWR5U2VudCcpO1xuXHRcdGlmIChpc01ldHJpY3NTZW5kID09PSBudWxsKSB7XG5cdFx0XHRQYnhBcGkuTGljZW5zZVNlbmRQQlhNZXRyaWNzKHNlbmRNZXRyaWNzLmNiQWZ0ZXJNZXRyaWNzU2VudCk7XG5cblx0XHR9XG5cdH0sXG5cdGNiQWZ0ZXJNZXRyaWNzU2VudChyZXN1bHQpe1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ01ldHJpY3NBbHJlYWR5U2VudCcsICd0cnVlJyk7XG5cdFx0fVxuXHR9XG59XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHNlbmRNZXRyaWNzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==