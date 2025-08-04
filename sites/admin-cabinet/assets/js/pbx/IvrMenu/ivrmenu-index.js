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

/* global globalRootUrl, IvrMenuAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex */

/**
 * IVR menu table management module using unified base class
 */
var ivrMenuIndex = {
  /**
   * DataTable instance from base class
   */
  dataTableInstance: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Create temporary instance to get description renderer
    var tempInstance = new PbxDataTableIndex({
      tableId: 'temp',
      apiModule: IvrMenuAPI,
      routePrefix: 'ivr-menu',
      columns: []
    }); // Create configuration with all columns including description

    var columns = [{
      data: 'extension',
      className: 'centered collapsing',
      render: function render(data) {
        // SECURITY: Properly escape extension data to prevent XSS
        return window.SecurityUtils.escapeHtml(data) || '—';
      }
    }, {
      data: 'name',
      className: 'collapsing',
      render: function render(data) {
        // SECURITY: Properly escape name data to prevent XSS
        return window.SecurityUtils.escapeHtml(data) || '—';
      }
    }, {
      data: 'actions',
      className: 'collapsing',
      render: function render(data) {
        if (!data || data.length === 0) {
          return '<small>—</small>';
        } // SECURITY: Escape digits and sanitize represent field allowing only safe icons


        var actionsHtml = data.map(function (action) {
          var safeDigits = window.SecurityUtils.escapeHtml(action.digits || '');
          var safeRepresent = window.SecurityUtils.sanitizeExtensionsApiContent(action.represent || '');
          return "".concat(safeDigits, " - ").concat(safeRepresent);
        }).join('<br>');
        return "<small>".concat(actionsHtml, "</small>");
      }
    }, {
      data: 'timeoutExtensionRepresent',
      className: 'hide-on-mobile collapsing',
      render: function render(data) {
        // SECURITY: Sanitize timeout extension representation allowing only safe icons
        if (!data) {
          return '<small>—</small>';
        }

        var safeData = window.SecurityUtils.sanitizeExtensionsApiContent(data);
        return "<small>".concat(safeData, "</small>");
      }
    }, {
      data: 'description',
      className: 'hide-on-mobile',
      orderable: false,
      // Use the description renderer from temp instance
      render: tempInstance.createDescriptionRenderer()
    }]; // Create real instance of base class with IVR Menu specific configuration

    this.dataTableInstance = new PbxDataTableIndex({
      tableId: 'ivr-menu-table',
      apiModule: IvrMenuAPI,
      routePrefix: 'ivr-menu',
      showSuccessMessages: true,
      actionButtons: ['edit', 'delete'],
      // No copy for IVR Menu
      translations: {
        deleteSuccess: globalTranslate.iv_IvrMenuDeleted,
        deleteError: globalTranslate.iv_ImpossibleToDeleteIvrMenu
      },
      descriptionSettings: {
        maxLines: 3,
        dynamicHeight: false
      },
      columns: columns
    }); // Initialize the base class

    this.dataTableInstance.initialize();
  }
};
/**
 *  Initialize IVR menu table on document ready
 */

$(document).ready(function () {
  ivrMenuIndex.initialize();
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU0sWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNJLEVBQUEsaUJBQWlCLEVBQUUsSUFKRjs7QUFNakI7QUFDSjtBQUNBO0FBQ0ksRUFBQSxVQVRpQix3QkFTSjtBQUNUO0FBQ0EsUUFBTSxZQUFZLEdBQUcsSUFBSSxpQkFBSixDQUFzQjtBQUN2QyxNQUFBLE9BQU8sRUFBRSxNQUQ4QjtBQUV2QyxNQUFBLFNBQVMsRUFBRSxVQUY0QjtBQUd2QyxNQUFBLFdBQVcsRUFBRSxVQUgwQjtBQUl2QyxNQUFBLE9BQU8sRUFBRTtBQUo4QixLQUF0QixDQUFyQixDQUZTLENBU1Q7O0FBQ0EsUUFBTSxPQUFPLEdBQUcsQ0FDWjtBQUNJLE1BQUEsSUFBSSxFQUFFLFdBRFY7QUFFSSxNQUFBLFNBQVMsRUFBRSxxQkFGZjtBQUdJLE1BQUEsTUFBTSxFQUFFLGdCQUFTLElBQVQsRUFBZTtBQUNuQjtBQUNBLGVBQU8sTUFBTSxDQUFDLGFBQVAsQ0FBcUIsVUFBckIsQ0FBZ0MsSUFBaEMsS0FBeUMsR0FBaEQ7QUFDSDtBQU5MLEtBRFksRUFTWjtBQUNJLE1BQUEsSUFBSSxFQUFFLE1BRFY7QUFFSSxNQUFBLFNBQVMsRUFBRSxZQUZmO0FBR0ksTUFBQSxNQUFNLEVBQUUsZ0JBQVMsSUFBVCxFQUFlO0FBQ25CO0FBQ0EsZUFBTyxNQUFNLENBQUMsYUFBUCxDQUFxQixVQUFyQixDQUFnQyxJQUFoQyxLQUF5QyxHQUFoRDtBQUNIO0FBTkwsS0FUWSxFQWlCWjtBQUNJLE1BQUEsSUFBSSxFQUFFLFNBRFY7QUFFSSxNQUFBLFNBQVMsRUFBRSxZQUZmO0FBR0ksTUFBQSxNQUFNLEVBQUUsZ0JBQVMsSUFBVCxFQUFlO0FBQ25CLFlBQUksQ0FBQyxJQUFELElBQVMsSUFBSSxDQUFDLE1BQUwsS0FBZ0IsQ0FBN0IsRUFBZ0M7QUFDNUIsaUJBQU8sa0JBQVA7QUFDSCxTQUhrQixDQUluQjs7O0FBQ0EsWUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUwsQ0FBUyxVQUFBLE1BQU0sRUFBSTtBQUNuQyxjQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBUCxDQUFxQixVQUFyQixDQUFnQyxNQUFNLENBQUMsTUFBUCxJQUFpQixFQUFqRCxDQUFuQjtBQUNBLGNBQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFQLENBQXFCLDRCQUFyQixDQUFrRCxNQUFNLENBQUMsU0FBUCxJQUFvQixFQUF0RSxDQUF0QjtBQUNBLDJCQUFVLFVBQVYsZ0JBQTBCLGFBQTFCO0FBQ0gsU0FKbUIsRUFJakIsSUFKaUIsQ0FJWixNQUpZLENBQXBCO0FBS0EsZ0NBQWlCLFdBQWpCO0FBQ0g7QUFkTCxLQWpCWSxFQWlDWjtBQUNJLE1BQUEsSUFBSSxFQUFFLDJCQURWO0FBRUksTUFBQSxTQUFTLEVBQUUsMkJBRmY7QUFHSSxNQUFBLE1BQU0sRUFBRSxnQkFBUyxJQUFULEVBQWU7QUFDbkI7QUFDQSxZQUFJLENBQUMsSUFBTCxFQUFXO0FBQ1AsaUJBQU8sa0JBQVA7QUFDSDs7QUFDRCxZQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsYUFBUCxDQUFxQiw0QkFBckIsQ0FBa0QsSUFBbEQsQ0FBakI7QUFDQSxnQ0FBaUIsUUFBakI7QUFDSDtBQVZMLEtBakNZLEVBNkNaO0FBQ0ksTUFBQSxJQUFJLEVBQUUsYUFEVjtBQUVJLE1BQUEsU0FBUyxFQUFFLGdCQUZmO0FBR0ksTUFBQSxTQUFTLEVBQUUsS0FIZjtBQUlJO0FBQ0EsTUFBQSxNQUFNLEVBQUUsWUFBWSxDQUFDLHlCQUFiO0FBTFosS0E3Q1ksQ0FBaEIsQ0FWUyxDQWdFVDs7QUFDQSxTQUFLLGlCQUFMLEdBQXlCLElBQUksaUJBQUosQ0FBc0I7QUFDM0MsTUFBQSxPQUFPLEVBQUUsZ0JBRGtDO0FBRTNDLE1BQUEsU0FBUyxFQUFFLFVBRmdDO0FBRzNDLE1BQUEsV0FBVyxFQUFFLFVBSDhCO0FBSTNDLE1BQUEsbUJBQW1CLEVBQUUsSUFKc0I7QUFLM0MsTUFBQSxhQUFhLEVBQUUsQ0FBQyxNQUFELEVBQVMsUUFBVCxDQUw0QjtBQUtSO0FBQ25DLE1BQUEsWUFBWSxFQUFFO0FBQ1YsUUFBQSxhQUFhLEVBQUUsZUFBZSxDQUFDLGlCQURyQjtBQUVWLFFBQUEsV0FBVyxFQUFFLGVBQWUsQ0FBQztBQUZuQixPQU42QjtBQVUzQyxNQUFBLG1CQUFtQixFQUFFO0FBQ2pCLFFBQUEsUUFBUSxFQUFFLENBRE87QUFFakIsUUFBQSxhQUFhLEVBQUU7QUFGRSxPQVZzQjtBQWMzQyxNQUFBLE9BQU8sRUFBRTtBQWRrQyxLQUF0QixDQUF6QixDQWpFUyxDQWtGVDs7QUFDQSxTQUFLLGlCQUFMLENBQXVCLFVBQXZCO0FBQ0g7QUE3RmdCLENBQXJCO0FBZ0dBO0FBQ0E7QUFDQTs7QUFDQSxDQUFDLENBQUMsUUFBRCxDQUFELENBQVksS0FBWixDQUFrQixZQUFNO0FBQ3BCLEVBQUEsWUFBWSxDQUFDLFVBQWI7QUFDSCxDQUZEIiwiZmlsZSI6Iml2cm1lbnUtaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRXh0ZW5zaW9ucywgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieERhdGFUYWJsZUluZGV4ICovXG5cbi8qKlxuICogSVZSIG1lbnUgdGFibGUgbWFuYWdlbWVudCBtb2R1bGUgdXNpbmcgdW5pZmllZCBiYXNlIGNsYXNzXG4gKi9cbmNvbnN0IGl2ck1lbnVJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBEYXRhVGFibGUgaW5zdGFuY2UgZnJvbSBiYXNlIGNsYXNzXG4gICAgICovXG4gICAgZGF0YVRhYmxlSW5zdGFuY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IGluc3RhbmNlIHRvIGdldCBkZXNjcmlwdGlvbiByZW5kZXJlclxuICAgICAgICBjb25zdCB0ZW1wSW5zdGFuY2UgPSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXgoe1xuICAgICAgICAgICAgdGFibGVJZDogJ3RlbXAnLFxuICAgICAgICAgICAgYXBpTW9kdWxlOiBJdnJNZW51QVBJLFxuICAgICAgICAgICAgcm91dGVQcmVmaXg6ICdpdnItbWVudScsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBjb25maWd1cmF0aW9uIHdpdGggYWxsIGNvbHVtbnMgaW5jbHVkaW5nIGRlc2NyaXB0aW9uXG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZGF0YTogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY2VudGVyZWQgY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBQcm9wZXJseSBlc2NhcGUgZXh0ZW5zaW9uIGRhdGEgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSkgfHwgJ+KAlCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkYXRhOiAnbmFtZScsXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBQcm9wZXJseSBlc2NhcGUgbmFtZSBkYXRhIHRvIHByZXZlbnQgWFNTXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEpIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZGF0YTogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPHNtYWxsPuKAlDwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBTRUNVUklUWTogRXNjYXBlIGRpZ2l0cyBhbmQgc2FuaXRpemUgcmVwcmVzZW50IGZpZWxkIGFsbG93aW5nIG9ubHkgc2FmZSBpY29uc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zSHRtbCA9IGRhdGEubWFwKGFjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGlnaXRzID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChhY3Rpb24uZGlnaXRzIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVSZXByZXNlbnQgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGFjdGlvbi5yZXByZXNlbnQgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke3NhZmVEaWdpdHN9IC0gJHtzYWZlUmVwcmVzZW50fWA7XG4gICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c21hbGw+JHthY3Rpb25zSHRtbH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkYXRhOiAndGltZW91dEV4dGVuc2lvblJlcHJlc2VudCcsXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUgY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiBhbGxvd2luZyBvbmx5IHNhZmUgaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxzbWFsbD7igJQ8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZURhdGEgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzbWFsbD4ke3NhZmVEYXRhfTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGRhdGE6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUnLFxuICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBkZXNjcmlwdGlvbiByZW5kZXJlciBmcm9tIHRlbXAgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICByZW5kZXI6IHRlbXBJbnN0YW5jZS5jcmVhdGVEZXNjcmlwdGlvblJlbmRlcmVyKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSByZWFsIGluc3RhbmNlIG9mIGJhc2UgY2xhc3Mgd2l0aCBJVlIgTWVudSBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UgPSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXgoe1xuICAgICAgICAgICAgdGFibGVJZDogJ2l2ci1tZW51LXRhYmxlJyxcbiAgICAgICAgICAgIGFwaU1vZHVsZTogSXZyTWVudUFQSSxcbiAgICAgICAgICAgIHJvdXRlUHJlZml4OiAnaXZyLW1lbnUnLFxuICAgICAgICAgICAgc2hvd1N1Y2Nlc3NNZXNzYWdlczogdHJ1ZSxcbiAgICAgICAgICAgIGFjdGlvbkJ1dHRvbnM6IFsnZWRpdCcsICdkZWxldGUnXSwgLy8gTm8gY29weSBmb3IgSVZSIE1lbnVcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uczoge1xuICAgICAgICAgICAgICAgIGRlbGV0ZVN1Y2Nlc3M6IGdsb2JhbFRyYW5zbGF0ZS5pdl9JdnJNZW51RGVsZXRlZCxcbiAgICAgICAgICAgICAgICBkZWxldGVFcnJvcjogZ2xvYmFsVHJhbnNsYXRlLml2X0ltcG9zc2libGVUb0RlbGV0ZUl2ck1lbnVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXNjcmlwdGlvblNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgbWF4TGluZXM6IDMsXG4gICAgICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBjb2x1bW5zXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYmFzZSBjbGFzc1xuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIElWUiBtZW51IHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==