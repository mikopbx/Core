"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */
var DialplanApplicationsTable = {
  initialize: function () {
    function initialize() {
      $('#custom-applications-table').DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, null, {
          orderable: false,
          searchable: false
        }, {
          orderable: false,
          searchable: false
        }],
        order: [0, 'asc'],
        language: SemanticLocalization.dataTableLocalisation
      });
      $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
      $('.app-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "dialplan-applications/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  DialplanApplicationsTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiRGlhbHBsYW5BcHBsaWNhdGlvbnNUYWJsZSIsImluaXRpYWxpemUiLCIkIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBQ0EsSUFBTUEseUJBQXlCLEdBQUc7QUFDakNDLEVBQUFBLFVBRGlDO0FBQUEsMEJBQ3BCO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyw0QkFBRCxDQUFELENBQWdDQyxTQUFoQyxDQUEwQztBQUN6Q0MsUUFBQUEsWUFBWSxFQUFFLEtBRDJCO0FBRXpDQyxRQUFBQSxNQUFNLEVBQUUsS0FGaUM7QUFHekNDLFFBQUFBLE9BQU8sRUFBRSxDQUNSLElBRFEsRUFFUixJQUZRLEVBR1I7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQUhRLEVBSVI7QUFBQ0QsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQUpRLENBSGdDO0FBU3pDQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQVRrQztBQVV6Q0MsUUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUFWVSxPQUExQztBQVlBVixNQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQlcsUUFBckIsQ0FBOEJYLENBQUMsQ0FBQyx3QkFBRCxDQUEvQjtBQUVBQSxNQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCWSxFQUFqQixDQUFvQixVQUFwQixFQUFnQyxVQUFDQyxDQUFELEVBQU87QUFDdEMsWUFBTUMsRUFBRSxHQUFHZCxDQUFDLENBQUNhLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJDLElBQTFCLENBQStCLElBQS9CLENBQVg7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQiwwQ0FBa0VOLEVBQWxFO0FBQ0EsT0FIRDtBQUlBOztBQXBCZ0M7QUFBQTtBQUFBLENBQWxDO0FBd0JBZCxDQUFDLENBQUNxQixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCeEIsRUFBQUEseUJBQXlCLENBQUNDLFVBQTFCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cbmNvbnN0IERpYWxwbGFuQXBwbGljYXRpb25zVGFibGUgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI2N1c3RvbS1hcHBsaWNhdGlvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFswLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cblx0XHQkKCcuYXBwLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0RGlhbHBsYW5BcHBsaWNhdGlvbnNUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19