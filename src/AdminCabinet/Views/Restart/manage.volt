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

{# Modal window for active calls confirmation #}
<div class="ui small modal" id="active-calls-modal">
    <div class="header">
        <i class="warning sign icon"></i>
        {{ t._('rs_ActiveCallsWarning') }}
    </div>
    <div class="content">
        <div class="ui warning message">
            <p>{{ t._('rs_ShutdownRebootMessage') }}</p>
        </div>
        <div id="modal-calls-list"></div>
    </div>
    <div class="actions">
        <div class="ui deny button">
            <i class="remove icon"></i>
            {{ t._('rs_Cancel') }}
        </div>
        <div class="ui red approve button">
            <i class="checkmark icon"></i>
            {{ t._('rs_ContinueAnyway') }}
        </div>
    </div>
</div>
