"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * Object for handling providers table
 *
 * @module providers
 */
var providers = {
  $deleteModalForm: $('#delete-modal-form'),
  $providersTable: $('#providers-table'),

  /**
   * Initializes the providers page.
   */
  initialize: function initialize() {
    providers.$deleteModalForm.modal(); // Enable/disable provider checkbox handlers

    $('.provider-row .checkbox').checkbox({
      onChecked: function onChecked() {
        var uniqid = $(this).closest('tr').attr('id');
        $.api({
          url: "".concat(globalRootUrl, "providers/enable/{type}/{uniqid}"),
          on: 'now',
          urlData: {
            type: $(this).closest('tr').attr('data-value'),
            uniqid: uniqid
          },
          onSuccess: function onSuccess(response) {
            if (response.success) {
              $("#".concat(uniqid, " .disability")).removeClass('disabled');
            }
          }
        });
      },
      onUnchecked: function onUnchecked() {
        var uniqid = $(this).closest('tr').attr('id');
        $.api({
          url: "".concat(globalRootUrl, "providers/disable/{type}/{uniqid}"),
          on: 'now',
          urlData: {
            type: $(this).closest('tr').attr('data-value'),
            uniqid: uniqid
          },
          onSuccess: function onSuccess(response) {
            if (response.success) {
              $("#".concat(uniqid, " .disability")).addClass('disabled');
            }
          }
        });
      }
    }); // Double-click provider row handler

    $('.provider-row td').on('dblclick', function (e) {
      var id = $(e.target).closest('tr').attr('id');
      var type = $(e.target).closest('tr').attr('data-value');
      window.location = "".concat(globalRootUrl, "providers/modify").concat(type, "/").concat(id);
    }); // Delete provider link handler

    $('body').on('click', '.provider-row a.delete', function (e) {
      e.preventDefault();
      var linksExist = $(e.target).closest('tr').attr('data-links');

      if (linksExist === 'true') {
        providers.$deleteModalForm.modal({
          closable: false,
          onDeny: function onDeny() {
            return true;
          },
          onApprove: function onApprove() {
            window.location = $(e.target).closest('a').attr('href');
            return true;
          }
        }).modal('show');
      } else {
        window.location = $(e.target).closest('a').attr('href');
      }
    });
    providers.initializeDataTable();
  },

  /**
   * Initializes the DataTable for the providers table.
   */
  initializeDataTable: function initializeDataTable() {
    providers.$providersTable.DataTable({
      lengthChange: false,
      paging: false,
      columns: [null, null, null, {
        "width": "0"
      }, null, null, {
        orderable: false,
        searchable: false
      }],
      autoWidth: false,
      order: [1, 'asc'],
      language: SemanticLocalization.dataTableLocalisation
    }); // Move the "Add New" button to the first eight-column div

    $('.add-new-button').appendTo($('div.eight.column:eq(0)'));
  }
};
/**
 *  Initialize providers table on document ready
 */

$(document).ready(function () {
  providers.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsIiRkZWxldGVNb2RhbEZvcm0iLCIkIiwiJHByb3ZpZGVyc1RhYmxlIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJ1bmlxaWQiLCJjbG9zZXN0IiwiYXR0ciIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsInVybERhdGEiLCJ0eXBlIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiZSIsImlkIiwidGFyZ2V0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImxpbmtzRXhpc3QiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFFZEMsRUFBQUEsZ0JBQWdCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQUZMO0FBR2RDLEVBQUFBLGVBQWUsRUFBRUQsQ0FBQyxDQUFDLGtCQUFELENBSEo7O0FBS2Q7QUFDSjtBQUNBO0FBQ0lFLEVBQUFBLFVBUmMsd0JB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RSxLQVpxQjtBQWFoQ0MsTUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FBRCxFQUFJLEtBQUosQ0FieUI7QUFjaENDLE1BQUFBLFFBQVEsRUFBRUMsb0JBQW9CLENBQUNDO0FBZEMsS0FBcEMsRUFEa0IsQ0FrQmxCOztBQUNBMUMsSUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUIyQyxRQUFyQixDQUE4QjNDLENBQUMsQ0FBQyx3QkFBRCxDQUEvQjtBQUNIO0FBdEdhLENBQWxCO0FBeUdBO0FBQ0E7QUFDQTs7QUFDQUEsQ0FBQyxDQUFDNEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9DLEVBQUFBLFNBQVMsQ0FBQ0ksVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgaGFuZGxpbmcgcHJvdmlkZXJzIHRhYmxlXG4gKlxuICogQG1vZHVsZSBwcm92aWRlcnNcbiAqL1xuY29uc3QgcHJvdmlkZXJzID0ge1xuXG4gICAgJGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG4gICAgJHByb3ZpZGVyc1RhYmxlOiAkKCcjcHJvdmlkZXJzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgcHJvdmlkZXJzIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcHJvdmlkZXJzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICAvLyBFbmFibGUvZGlzYWJsZSBwcm92aWRlciBjaGVja2JveCBoYW5kbGVyc1xuICAgICAgICAkKCcucHJvdmlkZXItcm93IC5jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5pcWlkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvZW5hYmxlL3t0eXBlfS97dW5pcWlkfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5pcWlkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvZGlzYWJsZS97dHlwZX0ve3VuaXFpZH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBEb3VibGUtY2xpY2sgcHJvdmlkZXIgcm93IGhhbmRsZXJcbiAgICAgICAgJCgnLnByb3ZpZGVyLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeSR7dHlwZX0vJHtpZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgcHJvdmlkZXIgbGluayBoYW5kbGVyXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnLnByb3ZpZGVyLXJvdyBhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBsaW5rc0V4aXN0ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWxpbmtzJyk7XG4gICAgICAgICAgICBpZiAobGlua3NFeGlzdCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXJzLiRkZWxldGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHByb3ZpZGVycy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBEYXRhVGFibGUgZm9yIHRoZSBwcm92aWRlcnMgdGFibGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgcHJvdmlkZXJzLiRwcm92aWRlcnNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAge1wid2lkdGhcIjogXCIwXCJ9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcjogWzEsICdhc2MnXSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdlxuICAgICAgICAkKCcuYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIHByb3ZpZGVycyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXJzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==