"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZW5kTWV0cmljcy9zZW5kLW1ldHJpY3MtaW5kZXguanMiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJpc01ldHJpY3NTZW5kIiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwib25TdWNjZXNzIiwic2V0SXRlbSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBQSxDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsYUFBYSxHQUFHQyxjQUFjLENBQUNDLE9BQWYsQ0FBdUIsb0JBQXZCLENBQXRCOztBQUNBLE1BQUlGLGFBQWEsS0FBSyxJQUF0QixFQUE0QjtBQUMzQkgsSUFBQUEsQ0FBQyxDQUFDTSxHQUFGLENBQU07QUFDTEMsTUFBQUEsR0FBRyxZQUFLQyxhQUFMLHVCQURFO0FBRUxDLE1BQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLE1BQUFBLFNBSEs7QUFBQSw2QkFHTztBQUNYTixVQUFBQSxjQUFjLENBQUNPLE9BQWYsQ0FBdUIsb0JBQXZCLEVBQTZDLE1BQTdDO0FBQ0E7O0FBTEk7QUFBQTtBQUFBLEtBQU47QUFPQTtBQUNELENBWEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjb25zdCBpc01ldHJpY3NTZW5kID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnTWV0cmljc0FscmVhZHlTZW50Jyk7XG5cdGlmIChpc01ldHJpY3NTZW5kID09PSBudWxsKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNlbmQtbWV0cmljcy9pbmRleGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ01ldHJpY3NBbHJlYWR5U2VudCcsICd0cnVlJyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG59KTsiXX0=