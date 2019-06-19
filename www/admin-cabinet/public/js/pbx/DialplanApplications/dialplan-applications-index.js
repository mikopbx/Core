"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
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
//# sourceMappingURL=dialplan-applications-index.js.map