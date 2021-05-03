<div class="ui basic segment">
    <div class="ui dimmer" id="capture-log-dimmer">
        <div class="ui indeterminate text loader">{{ t._('sd_PackingLogFiles') }}</div>
    </div>
    <button class="ui labeled icon small button" id="download-logs-button">
        <i class="circle icon"></i>
        {{ t._('log_DownloadLogs') }}
    </button>
    {{ t._('log_CaptureMessage') }}
    <button class="ui labeled icon small button" id="start-capture-button">
        <i class="circle icon"></i>
        {{ t._('log_StartLogsCapture') }}
    </button>
    <button class="ui labeled icon small button" id="stop-capture-button">
        <i class="stop icon"></i>
        {{ t._('log_StopLogsCapture') }}
    </button>
</div>