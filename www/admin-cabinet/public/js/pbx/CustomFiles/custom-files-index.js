"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
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
//# sourceMappingURL=custom-files-index.js.map