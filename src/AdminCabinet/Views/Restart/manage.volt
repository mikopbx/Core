<button class="ui labeled icon large button" id="restart-button">
    <i class="refresh icon"></i>
    {{ t._('rs_RestartPhoneSystem') }}
</button>
<button class="ui labeled icon large red button" id="shutdown-button">
    <i class="power icon"></i>
    {{ t._('rs_ShutDownPhoneSystem') }}
</button>
<div class="ui hidden divider"></div>
<div id="current-calls-info"></div>

<div class="ui info message">{{ t._('rs_ShutdownRebootMessage') }}</div>
