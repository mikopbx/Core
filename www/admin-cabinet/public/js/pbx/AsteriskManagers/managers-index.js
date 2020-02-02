"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
var managersTable = {
  initialize: function () {
    function initialize() {
      $('.user-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "asterisk-managers/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  managersTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXJzVGFibGUiLCJpbml0aWFsaXplIiwiJCIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxVQURxQjtBQUFBLDBCQUNSO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JDLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdILENBQUMsQ0FBQ0UsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLHNDQUE4RE4sRUFBOUQ7QUFDQSxPQUhEO0FBSUE7O0FBTm9CO0FBQUE7QUFBQSxDQUF0QjtBQVNBSCxDQUFDLENBQUNVLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJiLEVBQUFBLGFBQWEsQ0FBQ0MsVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbmNvbnN0IG1hbmFnZXJzVGFibGUgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLnVzZXItcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYW5hZ2Vyc1RhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=