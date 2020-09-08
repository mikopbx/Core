<div class="ui tabular menu" id="system-diagnostic-menu">
    <a class="item active" data-tab="show-log">{{ t._('sd_ShowLog') }}</a>
    <a class="item" data-tab="show-sysinfo">{{ t._('sd_SystemInformation') }}</a>
    <a class="item" data-tab="capture-log">{{ t._('sd_CapturePcap') }}</a>
</div>

<div class="ui tab" data-tab="show-log">
    <form class="ui form" id="system-diagnostic-form">
        <input type="hidden" name="filename" id="filename"/>
        <div class="inline fields">
            <div class="eight wide field">
                <label>
                    {{ t._('sd_Filename') }}
                </label>
                {{ form.render('filenames') }}
            </div>
            <div class="three wide field">
                <label>
                    {{ t._('sd_lines') }}
                </label>
                {{ form.render('lines') }}
            </div>
            <div class="three wide field">
                <label>
                    {{ t._('sd_filter') }}
                </label>
                {{ form.render('filter') }}
            </div>
            <div class="field">
                <div class="ui buttons">
                    <div class="ui icon button" id="download-file"><i class="download icon"></i></div>
                    <div class="ui icon button" id="show-last-log"><i class="refresh icon"></i></div>
                    <div class="ui icon button" id="show-last-log-auto">
                        <i class="icons">
                            <i class="refresh icon"></i>
                            <i class="corner font icon"></i>
                        </i>
                    </div>
                </div>
            </div>
        </div>
    </form>

    <div id="log-content-readonly" class="log-content-readonly">
        <pre></pre>
    </div>
</div>
<div class="ui tab" data-tab="show-sysinfo">
    <div class="ui basic segment">
        <div class="ui active dimmer" id="sysinfo-dimmer">
            <div class="ui indeterminate text loader">{{ t._('sd_CollectingInfo') }}</div>
        </div>
        <div id="sysinfo-content-readonly" class="sysinfo-content-readonly">
            <pre></pre>
        </div>
    </div>
</div>
<div class="ui tab" data-tab="capture-log">
    <div class="ui basic segment">
        <div class="ui dimmer" id="capture-log-dimmer">
            <div class="ui indeterminate text loader">{{ t._('sd_PackingLogFiles') }}</div>
        </div>
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
</div>
