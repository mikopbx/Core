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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOlsiSXZyTWVudVRhYmxlIiwiJGl2clRhYmxlIiwiJCIsImluaXRpYWxpemUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxTQUFTLEVBQUVDLENBQUMsQ0FBQyxpQkFBRCxDQURRO0FBRXBCQyxFQUFBQSxVQUZvQjtBQUFBLDBCQUVQO0FBQ1pELE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JFLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdKLENBQUMsQ0FBQ0csQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLDZCQUFxRE4sRUFBckQ7QUFDQSxPQUhEO0FBS0FOLE1BQUFBLFlBQVksQ0FBQ2EsbUJBQWI7QUFDQTs7QUFUbUI7QUFBQTs7QUFXcEI7OztBQUdBQSxFQUFBQSxtQkFkb0I7QUFBQSxtQ0FjRTtBQUNyQmIsTUFBQUEsWUFBWSxDQUFDQyxTQUFiLENBQXVCYSxTQUF2QixDQUFpQztBQUNoQ0MsUUFBQUEsWUFBWSxFQUFFLEtBRGtCO0FBRWhDQyxRQUFBQSxNQUFNLEVBQUUsS0FGd0I7QUFHaENDLFFBQUFBLE9BQU8sRUFBRSxDQUNSLElBRFEsRUFFUixJQUZRLEVBR1IsSUFIUSxFQUlSLElBSlEsRUFLUixJQUxRLEVBTVI7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQU5RLENBSHVCO0FBV2hDQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQVh5QjtBQVloQ0MsUUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUFaQyxPQUFqQztBQWNBckIsTUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJzQixRQUFyQixDQUE4QnRCLENBQUMsQ0FBQyx3QkFBRCxDQUEvQjtBQUNBOztBQTlCbUI7QUFBQTtBQUFBLENBQXJCO0FBaUNBQSxDQUFDLENBQUN1QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCMUIsRUFBQUEsWUFBWSxDQUFDRyxVQUFiO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuY29uc3QgSXZyTWVudVRhYmxlID0ge1xuXHQkaXZyVGFibGU6ICQoJyNpdnItbWVudS10YWJsZScpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy5tZW51LXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblxuXHRcdEl2ck1lbnVUYWJsZS5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0SXZyTWVudVRhYmxlLiRpdnJUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdEl2ck1lbnVUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19