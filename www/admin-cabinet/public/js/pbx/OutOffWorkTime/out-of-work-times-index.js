"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
var OutOfWorkTimesTable = {
  initialize: function () {
    function initialize() {
      $('.frame-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "out-off-work-time/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  OutOfWorkTimesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJPdXRPZldvcmtUaW1lc1RhYmxlIiwiaW5pdGlhbGl6ZSIsIiQiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLG1CQUFtQixHQUFHO0FBQzNCQyxFQUFBQSxVQUQyQjtBQUFBLDBCQUNkO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJDLEVBQW5CLENBQXNCLFVBQXRCLEVBQWtDLFVBQUNDLENBQUQsRUFBTztBQUN4QyxZQUFNQyxFQUFFLEdBQUdILENBQUMsQ0FBQ0UsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLHNDQUE4RE4sRUFBOUQ7QUFDQSxPQUhEO0FBSUE7O0FBTjBCO0FBQUE7QUFBQSxDQUE1QjtBQVVBSCxDQUFDLENBQUNVLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJiLEVBQUFBLG1CQUFtQixDQUFDQyxVQUFwQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3QgT3V0T2ZXb3JrVGltZXNUYWJsZSA9IHtcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcuZnJhbWUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1vdXQtb2ZmLXdvcmstdGltZS9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdE91dE9mV29ya1RpbWVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==