"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
var conferenceTable = {
  initialize: function () {
    function initialize() {
      $('.record-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "conference-rooms/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  conferenceTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Db25mZXJlbmNlUm9vbXMvY29uZmVyZW5jZS1yb29tcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJjb25mZXJlbmNlVGFibGUiLCJpbml0aWFsaXplIiwiJCIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxVQUR1QjtBQUFBLDBCQUNWO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CQyxFQUFwQixDQUF1QixVQUF2QixFQUFtQyxVQUFDQyxDQUFELEVBQU87QUFDekMsWUFBTUMsRUFBRSxHQUFHSCxDQUFDLENBQUNFLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJDLElBQTFCLENBQStCLElBQS9CLENBQVg7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQixxQ0FBNkROLEVBQTdEO0FBQ0EsT0FIRDtBQUlBOztBQU5zQjtBQUFBO0FBQUEsQ0FBeEI7QUFTQUgsQ0FBQyxDQUFDVSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCYixFQUFBQSxlQUFlLENBQUNDLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3QgY29uZmVyZW5jZVRhYmxlID0ge1xuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy5yZWNvcmQtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1jb25mZXJlbmNlLXJvb21zL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGNvbmZlcmVuY2VUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19