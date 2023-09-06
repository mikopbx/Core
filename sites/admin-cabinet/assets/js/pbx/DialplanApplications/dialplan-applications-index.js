"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiRGlhbHBsYW5BcHBsaWNhdGlvbnNUYWJsZSIsImluaXRpYWxpemUiLCIkIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFDQSxJQUFNQSx5QkFBeUIsR0FBRztBQUNqQ0MsRUFBQUEsVUFEaUM7QUFBQSwwQkFDcEI7QUFDWkMsTUFBQUEsQ0FBQyxDQUFDLDRCQUFELENBQUQsQ0FBZ0NDLFNBQWhDLENBQTBDO0FBQ3pDQyxRQUFBQSxZQUFZLEVBQUUsS0FEMkI7QUFFekNDLFFBQUFBLE1BQU0sRUFBRSxLQUZpQztBQUd6Q0MsUUFBQUEsT0FBTyxFQUFFLENBQ1IsSUFEUSxFQUVSLElBRlEsRUFHUjtBQUFDQyxVQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsVUFBQUEsVUFBVSxFQUFFO0FBQS9CLFNBSFEsRUFJUjtBQUFDRCxVQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsVUFBQUEsVUFBVSxFQUFFO0FBQS9CLFNBSlEsQ0FIZ0M7QUFTekNDLFFBQUFBLEtBQUssRUFBRSxDQUFDLENBQUQsRUFBSSxLQUFKLENBVGtDO0FBVXpDQyxRQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQztBQVZVLE9BQTFDO0FBWUFWLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCVyxRQUFyQixDQUE4QlgsQ0FBQyxDQUFDLHdCQUFELENBQS9CO0FBRUFBLE1BQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJZLEVBQWpCLENBQW9CLFVBQXBCLEVBQWdDLFVBQUNDLENBQUQsRUFBTztBQUN0QyxZQUFNQyxFQUFFLEdBQUdkLENBQUMsQ0FBQ2EsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLDBDQUFrRU4sRUFBbEU7QUFDQSxPQUhEO0FBSUE7O0FBcEJnQztBQUFBO0FBQUEsQ0FBbEM7QUF3QkFkLENBQUMsQ0FBQ3FCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ4QixFQUFBQSx5QkFBeUIsQ0FBQ0MsVUFBMUI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuY29uc3QgRGlhbHBsYW5BcHBsaWNhdGlvbnNUYWJsZSA9IHtcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjY3VzdG9tLWFwcGxpY2F0aW9ucy10YWJsZScpLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdF0sXG5cdFx0XHRvcmRlcjogWzAsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblxuXHRcdCQoJy5hcHAtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1kaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHREaWFscGxhbkFwcGxpY2F0aW9uc1RhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=