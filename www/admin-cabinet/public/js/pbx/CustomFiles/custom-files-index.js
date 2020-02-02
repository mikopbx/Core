"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, SemanticLocalization */
var FilesTable = {
  initialize: function () {
    function initialize() {
      $('#custom-files-table').DataTable({
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
      $('.file-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "custom-files/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  FilesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtaW5kZXguanMiXSwibmFtZXMiOlsiRmlsZXNUYWJsZSIsImluaXRpYWxpemUiLCIkIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFVBQVUsR0FBRztBQUNsQkMsRUFBQUEsVUFEa0I7QUFBQSwwQkFDTDtBQUNaQyxNQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QkMsU0FBekIsQ0FBbUM7QUFDbENDLFFBQUFBLFlBQVksRUFBRSxLQURvQjtBQUVsQ0MsUUFBQUEsTUFBTSxFQUFFLEtBRjBCO0FBR2xDQyxRQUFBQSxPQUFPLEVBQUUsQ0FDUixJQURRLEVBRVIsSUFGUSxFQUdSO0FBQUNDLFVBQUFBLFNBQVMsRUFBRSxLQUFaO0FBQW1CQyxVQUFBQSxVQUFVLEVBQUU7QUFBL0IsU0FIUSxFQUlSO0FBQUNELFVBQUFBLFNBQVMsRUFBRSxLQUFaO0FBQW1CQyxVQUFBQSxVQUFVLEVBQUU7QUFBL0IsU0FKUSxDQUh5QjtBQVNsQ0MsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FBRCxFQUFJLEtBQUosQ0FUMkI7QUFVbENDLFFBQUFBLFFBQVEsRUFBRUMsb0JBQW9CLENBQUNDO0FBVkcsT0FBbkM7QUFhQVYsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQlcsRUFBbEIsQ0FBcUIsVUFBckIsRUFBaUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDLFlBQU1DLEVBQUUsR0FBR2IsQ0FBQyxDQUFDWSxDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLElBQXBCLEVBQTBCQyxJQUExQixDQUErQixJQUEvQixDQUFYO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckIsaUNBQXlETixFQUF6RDtBQUNBLE9BSEQ7QUFJQTs7QUFuQmlCO0FBQUE7QUFBQSxDQUFuQjtBQXVCQWIsQ0FBQyxDQUFDb0IsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnZCLEVBQUFBLFVBQVUsQ0FBQ0MsVUFBWDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbmNvbnN0IEZpbGVzVGFibGUgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI2N1c3RvbS1maWxlcy10YWJsZScpLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdF0sXG5cdFx0XHRvcmRlcjogWzAsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cblx0XHQkKCcuZmlsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWN1c3RvbS1maWxlcy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdEZpbGVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==