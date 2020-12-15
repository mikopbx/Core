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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOlsiSXZyTWVudVRhYmxlIiwiJGl2clRhYmxlIiwiJCIsImluaXRpYWxpemUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxZQUFZLEdBQUc7QUFDcEJDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLGlCQUFELENBRFE7QUFFcEJDLEVBQUFBLFVBRm9CO0FBQUEsMEJBRVA7QUFDWkQsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQkUsRUFBbEIsQ0FBcUIsVUFBckIsRUFBaUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDLFlBQU1DLEVBQUUsR0FBR0osQ0FBQyxDQUFDRyxDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLElBQXBCLEVBQTBCQyxJQUExQixDQUErQixJQUEvQixDQUFYO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckIsNkJBQXFETixFQUFyRDtBQUNBLE9BSEQ7QUFLQU4sTUFBQUEsWUFBWSxDQUFDYSxtQkFBYjtBQUNBOztBQVRtQjtBQUFBOztBQVdwQjs7O0FBR0FBLEVBQUFBLG1CQWRvQjtBQUFBLG1DQWNFO0FBQ3JCYixNQUFBQSxZQUFZLENBQUNDLFNBQWIsQ0FBdUJhLFNBQXZCLENBQWlDO0FBQ2hDQyxRQUFBQSxZQUFZLEVBQUUsS0FEa0I7QUFFaENDLFFBQUFBLE1BQU0sRUFBRSxLQUZ3QjtBQUdoQ0MsUUFBQUEsT0FBTyxFQUFFLENBQ1IsSUFEUSxFQUVSLElBRlEsRUFHUixJQUhRLEVBSVIsSUFKUSxFQUtSLElBTFEsRUFNUjtBQUFDQyxVQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsVUFBQUEsVUFBVSxFQUFFO0FBQS9CLFNBTlEsQ0FIdUI7QUFXaENDLFFBQUFBLEtBQUssRUFBRSxDQUFDLENBQUQsRUFBSSxLQUFKLENBWHlCO0FBWWhDQyxRQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQztBQVpDLE9BQWpDO0FBY0FyQixNQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnNCLFFBQXJCLENBQThCdEIsQ0FBQyxDQUFDLHdCQUFELENBQS9CO0FBQ0E7O0FBOUJtQjtBQUFBO0FBQUEsQ0FBckI7QUFpQ0FBLENBQUMsQ0FBQ3VCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIxQixFQUFBQSxZQUFZLENBQUNHLFVBQWI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG5jb25zdCBJdnJNZW51VGFibGUgPSB7XG5cdCRpdnJUYWJsZTogJCgnI2l2ci1tZW51LXRhYmxlJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLm1lbnUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXG5cdFx0SXZyTWVudVRhYmxlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRJdnJNZW51VGFibGUuJGl2clRhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdF0sXG5cdFx0XHRvcmRlcjogWzEsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0SXZyTWVudVRhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=