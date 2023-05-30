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

/**
 * Responsive object with methods for handling sidebar and elements visibility based on screen size.
 * @module responsive
 */
var responsive = {
  /**
   * Sidebar element.
   * @type {jQuery}
   */
  $sidebar: $('#sidebar-menu'),

  /**
   * Sidebar menu button element.
   * @type {jQuery}
   */
  $sidebarMenuButton: $('#sidebar-menu-button'),

  /**
   * Elements hidden on mobile.
   * @type {jQuery}
   */
  $hideOnMobileElements: $('.hide-on-mobile'),

  /**
   * Initializes the responsive object.
   */
  initialize: function initialize() {
    responsive.$sidebar.sidebar('setting', 'transition', 'overlay');
    responsive.$sidebar.sidebar('attach events', '#sidebar-menu-button');
    window.addEventListener('resize', responsive.toggleSidebar);
    responsive.toggleSidebar();
  },

  /**
   * Toggles the sidebar and elements visibility based on the screen size.
   * 
   */
  toggleSidebar: function toggleSidebar() {
    if (window.innerWidth <= 1000) {
      responsive.$sidebar.sidebar('hide');
      responsive.$sidebarMenuButton.show();
      responsive.$hideOnMobileElements.hide();
    } else {
      responsive.$sidebar.sidebar('show');
      responsive.$sidebarMenuButton.hide();
      responsive.$hideOnMobileElements.show();
    }
  }
}; // When the document is ready, initialize the responsive form view

$(document).ready(function () {
  responsive.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Jlc3BvbnNpdmUtdWkuanMiXSwibmFtZXMiOlsicmVzcG9uc2l2ZSIsIiRzaWRlYmFyIiwiJCIsIiRzaWRlYmFyTWVudUJ1dHRvbiIsIiRoaWRlT25Nb2JpbGVFbGVtZW50cyIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInRvZ2dsZVNpZGViYXIiLCJpbm5lcldpZHRoIiwic2hvdyIsImhpZGUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBTEk7O0FBT2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUVELENBQUMsQ0FBQyxzQkFBRCxDQVhOOztBQWFmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMsaUJBQUQsQ0FqQlQ7O0FBbUJmO0FBQ0o7QUFDQTtBQUNJRyxFQUFBQSxVQXRCZSx3QkFzQkY7QUFDVEwsSUFBQUEsVUFBVSxDQUFDQyxRQUFYLENBQW9CSyxPQUFwQixDQUE0QixTQUE1QixFQUF1QyxZQUF2QyxFQUFxRCxTQUFyRDtBQUNBTixJQUFBQSxVQUFVLENBQUNDLFFBQVgsQ0FBb0JLLE9BQXBCLENBQTRCLGVBQTVCLEVBQTZDLHNCQUE3QztBQUNBQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLFFBQXhCLEVBQWtDUixVQUFVLENBQUNTLGFBQTdDO0FBQ0FULElBQUFBLFVBQVUsQ0FBQ1MsYUFBWDtBQUNILEdBM0JjOztBQTZCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxhQWpDZSwyQkFpQ0M7QUFDWixRQUFJRixNQUFNLENBQUNHLFVBQVAsSUFBcUIsSUFBekIsRUFBK0I7QUFDM0JWLE1BQUFBLFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQkssT0FBcEIsQ0FBNEIsTUFBNUI7QUFDQU4sTUFBQUEsVUFBVSxDQUFDRyxrQkFBWCxDQUE4QlEsSUFBOUI7QUFDQVgsTUFBQUEsVUFBVSxDQUFDSSxxQkFBWCxDQUFpQ1EsSUFBakM7QUFDSCxLQUpELE1BSU87QUFDSFosTUFBQUEsVUFBVSxDQUFDQyxRQUFYLENBQW9CSyxPQUFwQixDQUE0QixNQUE1QjtBQUNBTixNQUFBQSxVQUFVLENBQUNHLGtCQUFYLENBQThCUyxJQUE5QjtBQUNBWixNQUFBQSxVQUFVLENBQUNJLHFCQUFYLENBQWlDTyxJQUFqQztBQUNIO0FBQ0o7QUEzQ2MsQ0FBbkIsQyxDQThDQTs7QUFDQVQsQ0FBQyxDQUFDVyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCZCxFQUFBQSxVQUFVLENBQUNLLFVBQVg7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBSZXNwb25zaXZlIG9iamVjdCB3aXRoIG1ldGhvZHMgZm9yIGhhbmRsaW5nIHNpZGViYXIgYW5kIGVsZW1lbnRzIHZpc2liaWxpdHkgYmFzZWQgb24gc2NyZWVuIHNpemUuXG4gKiBAbW9kdWxlIHJlc3BvbnNpdmVcbiAqL1xuY29uc3QgcmVzcG9uc2l2ZSA9IHtcbiAgICAvKipcbiAgICAgKiBTaWRlYmFyIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2lkZWJhcjogJCgnI3NpZGViYXItbWVudScpLFxuXG4gICAgLyoqXG4gICAgICogU2lkZWJhciBtZW51IGJ1dHRvbiBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNpZGViYXJNZW51QnV0dG9uOiAkKCcjc2lkZWJhci1tZW51LWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogRWxlbWVudHMgaGlkZGVuIG9uIG1vYmlsZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRoaWRlT25Nb2JpbGVFbGVtZW50czogJCgnLmhpZGUtb24tbW9iaWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgcmVzcG9uc2l2ZSBvYmplY3QuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcmVzcG9uc2l2ZS4kc2lkZWJhci5zaWRlYmFyKCdzZXR0aW5nJywgJ3RyYW5zaXRpb24nLCAnb3ZlcmxheScpO1xuICAgICAgICByZXNwb25zaXZlLiRzaWRlYmFyLnNpZGViYXIoJ2F0dGFjaCBldmVudHMnLCAnI3NpZGViYXItbWVudS1idXR0b24nKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc3BvbnNpdmUudG9nZ2xlU2lkZWJhcik7XG4gICAgICAgIHJlc3BvbnNpdmUudG9nZ2xlU2lkZWJhcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBzaWRlYmFyIGFuZCBlbGVtZW50cyB2aXNpYmlsaXR5IGJhc2VkIG9uIHRoZSBzY3JlZW4gc2l6ZS5cbiAgICAgKiBcbiAgICAgKi9cbiAgICB0b2dnbGVTaWRlYmFyKCkge1xuICAgICAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gMTAwMCkge1xuICAgICAgICAgICAgcmVzcG9uc2l2ZS4kc2lkZWJhci5zaWRlYmFyKCdoaWRlJyk7XG4gICAgICAgICAgICByZXNwb25zaXZlLiRzaWRlYmFyTWVudUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICByZXNwb25zaXZlLiRoaWRlT25Nb2JpbGVFbGVtZW50cy5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNwb25zaXZlLiRzaWRlYmFyLnNpZGViYXIoJ3Nob3cnKTtcbiAgICAgICAgICAgIHJlc3BvbnNpdmUuJHNpZGViYXJNZW51QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIHJlc3BvbnNpdmUuJGhpZGVPbk1vYmlsZUVsZW1lbnRzLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHJlc3BvbnNpdmUgZm9ybSB2aWV3XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcmVzcG9uc2l2ZS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==