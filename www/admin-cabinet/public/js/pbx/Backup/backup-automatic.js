"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl, globalTranslate, Form, SemanticLocalization, PbxApi */
var automaticBackup = {
  $timeStart: $('#time-start'),
  $everySelect: $('#every'),
  $enableTgl: $('#enable-disable-toggle'),
  $sftpTgl: $('#sftp-toggle'),
  $ftpPort: $('#ftp_port'),
  $formObj: $('#backup-automatic-form'),
  $createNowTgl: $('#create-now'),
  validateRules: {
    ftp_host: {
      identifier: 'ftp_host',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.bkp_ValidateHostEmpty
      }]
    },
    ftp_port: {
      identifier: 'ftp_port',
      rules: [{
        type: 'integer[0..65535]',
        prompt: globalTranslate.bkp_ValidatePortEmpty
      }]
    },
    at_time: {
      identifier: 'at_time',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.bkp_ValidateTimeEmpty
      }]
    },
    keep_older_versions: {
      identifier: 'keep_older_versions',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.bkp_ValidateKeepVersionsEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      automaticBackup.$everySelect.dropdown();
      automaticBackup.$timeStart.calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        text: SemanticLocalization.calendarText,
        type: 'time',
        disableMinute: false,
        ampm: false
      });
      automaticBackup.$enableTgl.checkbox({
        onChange: automaticBackup.onEnableToggleChange,
        fireOnInit: true
      });
      automaticBackup.$sftpTgl.checkbox({
        onChange: automaticBackup.onSftpToggleChange
      });
      automaticBackup.initializeForm();
    }

    return initialize;
  }(),
  onEnableToggleChange: function () {
    function onEnableToggleChange() {
      if (automaticBackup.$enableTgl.checkbox('is unchecked')) {
        $('.disability').addClass('disabled');
      } else {
        $('.disability').removeClass('disabled');
      }
    }

    return onEnableToggleChange;
  }(),
  onSftpToggleChange: function () {
    function onSftpToggleChange() {
      if (automaticBackup.$sftpTgl.checkbox('is checked')) {
        automaticBackup.$ftpPort.val('22');
      } else {
        automaticBackup.$ftpPort.val('21');
      }
    }

    return onSftpToggleChange;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = automaticBackup.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      if (automaticBackup.$createNowTgl.checkbox('is checked')) {
        PbxApi.BackupStartScheduled(automaticBackup.cbAfterStartScheduled);
      }
    }

    return cbAfterSendForm;
  }(),
  cbAfterStartScheduled: function () {
    function cbAfterStartScheduled(result) {
      if (result) {
        window.location = "".concat(globalRootUrl, "backup/index");
      }
    }

    return cbAfterStartScheduled;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = automaticBackup.$formObj;
      Form.url = "".concat(globalRootUrl, "backup/save");
      Form.validateRules = automaticBackup.validateRules;
      Form.cbBeforeSendForm = automaticBackup.cbBeforeSendForm;
      Form.cbAfterSendForm = automaticBackup.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  automaticBackup.initialize();
});
//# sourceMappingURL=backup-automatic.js.map