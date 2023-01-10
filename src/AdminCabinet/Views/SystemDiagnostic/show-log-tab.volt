<div class="ui basic segment">
<div class="ui active dimmer" id="get-logs-dimmer">
    <div class="ui indeterminate text loader">{{ t._('sd_CollectingLogsInfo') }}</div>
</div>
<form class="ui form" id="system-diagnostic-form">
    {{ form.render('filename') }}
    <input type="hidden" name="offset" id="offset" value=0/>
    <div class="inline fields">
        <div class="seven wide field">
            <label>
                {{ t._('sd_Filename') }}
            </label>
            {{ form.render('filenames') }}
        </div>
        <div class="two wide field">
            <label>
                {{ t._('sd_offset') }}
            </label>
            {{ form.render('offset') }}
        </div>
        <div class="two wide field">
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