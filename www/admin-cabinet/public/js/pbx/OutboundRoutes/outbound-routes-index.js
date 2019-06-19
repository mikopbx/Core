"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
var outboundRoutes = {
  initialize: function () {
    function initialize() {
      $('#routingTable').tableDnD({
        onDrop: function () {
          function onDrop() {
            $('.rule-row').each(function (index, obj) {
              var ruleId = $(obj).attr('id');
              var oldPriority = parseInt($(obj).attr('data-value'), 10);
              var newPriority = obj.rowIndex;

              if (oldPriority !== newPriority) {
                $.api({
                  on: 'now',
                  url: "".concat(globalRootUrl, "outbound-routes/changePriority/").concat(ruleId),
                  method: 'POST',
                  data: {
                    newPriority: newPriority
                  }
                });
              }
            });
          }

          return onDrop;
        }(),
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle'
      });
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "outbound-routes/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  outboundRoutes.initialize();
});
//# sourceMappingURL=outbound-routes-index.js.map