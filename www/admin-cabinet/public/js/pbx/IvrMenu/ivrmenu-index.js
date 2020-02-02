"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */
var IvrMenuTable = {
  $ivrTable: $('#ivr-menu-table'),
  initialize: function () {
    function initialize() {
      $('.menu-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "ivr-menu/modify/").concat(id);
      });
      IvrMenuTable.initializeDataTable();
    }

    return initialize;
  }(),

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function () {
    function initializeDataTable() {
      IvrMenuTable.$ivrTable.DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, null, null, null, null, {
          orderable: false,
          searchable: false
        }],
        order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation
      });
      $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
    }

    return initializeDataTable;
  }()
};
$(document).ready(function () {
  IvrMenuTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOlsiSXZyTWVudVRhYmxlIiwiJGl2clRhYmxlIiwiJCIsImluaXRpYWxpemUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxTQUFTLEVBQUNDLENBQUMsQ0FBQyxpQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxVQUZvQjtBQUFBLDBCQUVQO0FBQ1pELE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JFLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdKLENBQUMsQ0FBQ0csQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLDZCQUFxRE4sRUFBckQ7QUFDQSxPQUhEO0FBS0FOLE1BQUFBLFlBQVksQ0FBQ2EsbUJBQWI7QUFDQTs7QUFUbUI7QUFBQTs7QUFXcEI7OztBQUdBQSxFQUFBQSxtQkFkb0I7QUFBQSxtQ0FjRTtBQUNyQmIsTUFBQUEsWUFBWSxDQUFDQyxTQUFiLENBQXVCYSxTQUF2QixDQUFpQztBQUNoQ0MsUUFBQUEsWUFBWSxFQUFFLEtBRGtCO0FBRWhDQyxRQUFBQSxNQUFNLEVBQUUsS0FGd0I7QUFHaENDLFFBQUFBLE9BQU8sRUFBRSxDQUNSLElBRFEsRUFFUixJQUZRLEVBR1IsSUFIUSxFQUlSLElBSlEsRUFLUixJQUxRLEVBTVI7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQU5RLENBSHVCO0FBV2hDQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQVh5QjtBQVloQ0MsUUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUFaQyxPQUFqQztBQWNBckIsTUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJzQixRQUFyQixDQUE4QnRCLENBQUMsQ0FBQyx3QkFBRCxDQUEvQjtBQUNBOztBQTlCbUI7QUFBQTtBQUFBLENBQXJCO0FBaUNBQSxDQUFDLENBQUN1QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCMUIsRUFBQUEsWUFBWSxDQUFDRyxVQUFiO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuY29uc3QgSXZyTWVudVRhYmxlID0ge1xuXHQkaXZyVGFibGU6JCgnI2l2ci1tZW51LXRhYmxlJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLm1lbnUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXG5cdFx0SXZyTWVudVRhYmxlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRJdnJNZW51VGFibGUuJGl2clRhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdF0sXG5cdFx0XHRvcmRlcjogWzEsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0SXZyTWVudVRhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=