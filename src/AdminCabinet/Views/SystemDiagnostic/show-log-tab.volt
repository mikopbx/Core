<div class="ui basic segment">
<div class="ui active dimmer" id="get-logs-dimmer">
    <div class="ui indeterminate text loader">{{ t._('sd_CollectingLogsInfo') }}</div>
</div>
<form class="ui form" id="system-diagnostic-form">
    {{ form.render('filename') }}
    <input type="hidden" name="offset" id="offset" value=0/>
    <div class="fields">
        <div class="eight wide field">
            <label for="filenames">{{ t._('sd_Filename') }}</label>
            <div class="fluid field">
                {{ form.render('filenames') }}
            </div>
        </div>
        <div class="field">
            <label for="offset">{{ t._('sd_offset') }}</label>
            <div class="field max-width-100">
                {{ form.render('offset') }}
            </div>
        </div>
        <div class="field">
            <label for="lines">{{ t._('sd_lines') }}</label>
            <div class="field max-width-100">
                {{ form.render('lines') }}
            </div>
        </div>
        <div class="four wide field">
            <label>{{ t._('sd_filter') }}</label>
            <div class="field max-width-400">{{ form.render('filter') }}</div>
        </div>
        <div class="ui right floated field">
            <label>&nbsp;</label>
            <div class="ui buttons">
                <div class="ui icon button" id="download-file" data-content="{{ t._('sd_ToolTipDownload') }}" ><i class="download icon"></i></div>
                <div class="ui icon button" id="show-last-log" data-content="{{ t._('sd_ToolTipRefresh') }}"><i class="refresh icon"></i></div>
                <div class="ui icon button" id="show-last-log-auto" data-content="{{ t._('sd_ToolTipAutoUpdate') }}">
                    <i class="icons">
                        <i class="refresh icon"></i>
                        <i class="corner font icon"></i>
                    </i>
                </div>
                <div class="ui icon button" id="erase-file" data-content="{{ t._('sd_ToolTipErase') }}"><i class="red erase icon"></i></div>
            </div>
        </div>
    </div>
</form>

<div id="log-content-readonly" class="log-content-readonly">
    <pre></pre>
</div>
</div>