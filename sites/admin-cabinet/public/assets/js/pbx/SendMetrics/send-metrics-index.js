"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, sessionStorage */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZW5kTWV0cmljcy9zZW5kLW1ldHJpY3MtaW5kZXguanMiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJpc01ldHJpY3NTZW5kIiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwib25TdWNjZXNzIiwic2V0SXRlbSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBQSxDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsYUFBYSxHQUFHQyxjQUFjLENBQUNDLE9BQWYsQ0FBdUIsb0JBQXZCLENBQXRCOztBQUNBLE1BQUlGLGFBQWEsS0FBSyxJQUF0QixFQUE0QjtBQUMzQkgsSUFBQUEsQ0FBQyxDQUFDTSxHQUFGLENBQU07QUFDTEMsTUFBQUEsR0FBRyxZQUFLQyxhQUFMLHVCQURFO0FBRUxDLE1BQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLE1BQUFBLFNBSEs7QUFBQSw2QkFHTztBQUNYTixVQUFBQSxjQUFjLENBQUNPLE9BQWYsQ0FBdUIsb0JBQXZCLEVBQTZDLE1BQTdDO0FBQ0E7O0FBTEk7QUFBQTtBQUFBLEtBQU47QUFPQTtBQUNELENBWEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgaXNNZXRyaWNzU2VuZCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ01ldHJpY3NBbHJlYWR5U2VudCcpO1xuXHRpZiAoaXNNZXRyaWNzU2VuZCA9PT0gbnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZW5kLW1ldHJpY3MvaW5kZXhgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdNZXRyaWNzQWxyZWFkeVNlbnQnLCAndHJ1ZScpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxufSk7Il19