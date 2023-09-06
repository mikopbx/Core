<div class="ui basic segment">
    <div class="ui dimmer" id="capture-log-dimmer">
        <div class="ui indeterminate text loader">{{ t._('sd_PackingLogFiles') }} <span class="progress"></span></div>
    </div>
    <button class="ui labeled icon small button" id="download-logs-button">
        <i class="download icon"></i>
        {{ t._('log_DownloadLogs') }}
    </button>
    <div class="ui info message">{{ t._('log_CaptureMessage') }}</div>
    <button class="ui labeled icon small button" id="start-capture-button">
        <i class="circle icon"></i>
        {{ t._('log_StartCapturePCAP') }}
    </button>
    <button class="ui labeled icon small button" id="stop-capture-button">
        <i class="stop icon"></i>
        {{ t._('log_StopCapturePCAP') }}
    </button>
</div>