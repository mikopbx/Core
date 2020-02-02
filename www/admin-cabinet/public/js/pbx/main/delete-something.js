"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
var DeleteSomething = {
  initialize: function () {
    function initialize() {
      $('body').on('click', '.two-steps-delete', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var $button = $(e.target).closest('a');
        $button.removeClass('two-steps-delete');
        var $icon = $button.find('i.trash');
        $icon.removeClass('trash').addClass('close');
        setTimeout(function () {
          if ($button.length) {
            $button.addClass('two-steps-delete');
            $icon.removeClass('close').addClass('trash');
          }
        }, 3000);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  DeleteSomething.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2RlbGV0ZS1zb21ldGhpbmcuanMiXSwibmFtZXMiOlsiRGVsZXRlU29tZXRoaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsIiRidXR0b24iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCIkaWNvbiIsImZpbmQiLCJhZGRDbGFzcyIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7O0FBUUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxVQUR1QjtBQUFBLDBCQUNWO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBVUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsbUJBQXRCLEVBQTJDLFVBQUNDLENBQUQsRUFBTztBQUNqREEsUUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FELFFBQUFBLENBQUMsQ0FBQ0Usd0JBQUY7QUFDQSxZQUFNQyxPQUFPLEdBQUdMLENBQUMsQ0FBQ0UsQ0FBQyxDQUFDSSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixHQUFwQixDQUFoQjtBQUNBRixRQUFBQSxPQUFPLENBQUNHLFdBQVIsQ0FBb0Isa0JBQXBCO0FBQ0EsWUFBTUMsS0FBSyxHQUFHSixPQUFPLENBQUNLLElBQVIsQ0FBYSxTQUFiLENBQWQ7QUFDQUQsUUFBQUEsS0FBSyxDQUFDRCxXQUFOLENBQWtCLE9BQWxCLEVBQTJCRyxRQUEzQixDQUFvQyxPQUFwQztBQUNBQyxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNoQixjQUFJUCxPQUFPLENBQUNRLE1BQVosRUFBb0I7QUFDbkJSLFlBQUFBLE9BQU8sQ0FBQ00sUUFBUixDQUFpQixrQkFBakI7QUFDQUYsWUFBQUEsS0FBSyxDQUFDRCxXQUFOLENBQWtCLE9BQWxCLEVBQTJCRyxRQUEzQixDQUFvQyxPQUFwQztBQUNBO0FBQ0QsU0FMUyxFQUtQLElBTE8sQ0FBVjtBQU1BLE9BYkQ7QUFjQTs7QUFoQnNCO0FBQUE7QUFBQSxDQUF4QjtBQW1CQVgsQ0FBQyxDQUFDYyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakIsRUFBQUEsZUFBZSxDQUFDQyxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuY29uc3QgRGVsZXRlU29tZXRoaW5nID0ge1xuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnLnR3by1zdGVwcy1kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdGNvbnN0ICRidXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYnV0dG9uLnJlbW92ZUNsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG5cdFx0XHRjb25zdCAkaWNvbiA9ICRidXR0b24uZmluZCgnaS50cmFzaCcpO1xuXHRcdFx0JGljb24ucmVtb3ZlQ2xhc3MoJ3RyYXNoJykuYWRkQ2xhc3MoJ2Nsb3NlJyk7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYgKCRidXR0b24ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0JGJ1dHRvbi5hZGRDbGFzcygndHdvLXN0ZXBzLWRlbGV0ZScpO1xuXHRcdFx0XHRcdCRpY29uLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAzMDAwKTtcblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0RGVsZXRlU29tZXRoaW5nLmluaXRpYWxpemUoKTtcbn0pO1xuIl19