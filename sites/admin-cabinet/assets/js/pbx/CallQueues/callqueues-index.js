"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */
var callQueuesTable = {
  $queuesTable: $('#queues-table'),
  initialize: function () {
    function initialize() {
      $('.queue-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "call-queues/modify/").concat(id);
      });
      callQueuesTable.initializeDataTable();
    }

    return initialize;
  }(),

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function () {
    function initializeDataTable() {
      callQueuesTable.$queuesTable.DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, null, null, null, {
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
  callQueuesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZXMtaW5kZXguanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlc1RhYmxlIiwiJHF1ZXVlc1RhYmxlIiwiJCIsImluaXRpYWxpemUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxZQUFZLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBRFE7QUFFdkJDLEVBQUFBLFVBRnVCO0FBQUEsMEJBRVY7QUFDWkQsTUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQkUsRUFBbkIsQ0FBc0IsVUFBdEIsRUFBa0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3hDLFlBQU1DLEVBQUUsR0FBR0osQ0FBQyxDQUFDRyxDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLElBQXBCLEVBQTBCQyxJQUExQixDQUErQixJQUEvQixDQUFYO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckIsZ0NBQXdETixFQUF4RDtBQUNBLE9BSEQ7QUFJQU4sTUFBQUEsZUFBZSxDQUFDYSxtQkFBaEI7QUFDQTs7QUFSc0I7QUFBQTs7QUFTdkI7OztBQUdBQSxFQUFBQSxtQkFadUI7QUFBQSxtQ0FZRDtBQUNyQmIsTUFBQUEsZUFBZSxDQUFDQyxZQUFoQixDQUE2QmEsU0FBN0IsQ0FBdUM7QUFDdENDLFFBQUFBLFlBQVksRUFBRSxLQUR3QjtBQUV0Q0MsUUFBQUEsTUFBTSxFQUFFLEtBRjhCO0FBR3RDQyxRQUFBQSxPQUFPLEVBQUUsQ0FDUixJQURRLEVBRVIsSUFGUSxFQUdSLElBSFEsRUFJUixJQUpRLEVBS1I7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQUxRLENBSDZCO0FBVXRDQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQVYrQjtBQVd0Q0MsUUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUFYTyxPQUF2QztBQWFBckIsTUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJzQixRQUFyQixDQUE4QnRCLENBQUMsQ0FBQyx3QkFBRCxDQUEvQjtBQUNBOztBQTNCc0I7QUFBQTtBQUFBLENBQXhCO0FBOEJBQSxDQUFDLENBQUN1QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCMUIsRUFBQUEsZUFBZSxDQUFDRyxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG5jb25zdCBjYWxsUXVldWVzVGFibGUgPSB7XG5cdCRxdWV1ZXNUYWJsZTogJCgnI3F1ZXVlcy10YWJsZScpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy5xdWV1ZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdFx0Y2FsbFF1ZXVlc1RhYmxlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0Y2FsbFF1ZXVlc1RhYmxlLiRxdWV1ZXNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGNhbGxRdWV1ZXNUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19