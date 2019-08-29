"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2019
 *
 */

/* global globalSSHPort */
var sshConsole = {
  $menuLink: $('a[href$="/admin-cabinet/console/index/"]'),
  link: null,
  target: null,
  hide: false,
  initialize: function () {
    function initialize() {
      sshConsole.$menuLink.on('click', function (e) {
        e.preventDefault();
        window.open(sshConsole.link, sshConsole.target);
      }); // Проверим возможность запуска SSH

      var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !navigator.userAgent.match(/Opera|OPR\//);
      var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && navigator.userAgent && !navigator.userAgent.match('CriOS');

      if (isChrome) {
        sshConsole.detect('chrome-extension://pnhechapfaindjhompbnflcldabbghjo', function () {
          sshConsole.link = "chrome-extension://pnhechapfaindjhompbnflcldabbghjo/html/nassh.html#root@".concat(window.location.hostname, ":").concat(globalSSHPort);
          sshConsole.target = '_blank';
        }, function () {
          sshConsole.link = 'https://chrome.google.com/webstore/detail/secure-shell/pnhechapfaindjhompbnflcldabbghjo';
          sshConsole.target = '_blank';
        });
      } else if (isSafari) {
        sshConsole.link = "ssh://root@".concat(window.location.hostname, ":").concat(globalSSHPort);
        sshConsole.target = '_top';
      } else {
        sshConsole.$menuLink.hide();
      }
    }

    return initialize;
  }(),
  detect: function () {
    function detect(base, ifInstalled, ifNotInstalled) {
      $.get("".concat(base, "/html/nassh.html")).done(ifInstalled).fail(ifNotInstalled);
    }

    return detect;
  }()
};
$(document).ready(function () {
  sshConsole.initialize();
});
//# sourceMappingURL=ssh-console.js.map