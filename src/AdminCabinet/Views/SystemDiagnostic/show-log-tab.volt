<div class="ui basic segment" id="system-logs-segment">
    <div class="ui active dimmer" id="get-logs-dimmer">
        <div class="ui indeterminate text loader">{{ t._('sd_CollectingLogsInfo') }}</div>
    </div>
    <form class="ui form" id="system-diagnostic-form">
        {{ form.render('filename') }}
        <div class="fields">
            <div class="five wide field">
                <label for="filenames">{{ t._('sd_Filename') }}</label>
                <div class="fluid field">
                    {{ form.render('filenames') }}
                </div>
            </div>

            <div class="three wide field">
                <label for="logLevel">{{ t._('sd_LogLevel') }}</label>
                {{ form.render('logLevel') }}
            </div>

            <div class="field filter-field">
                <label>{{ t._('sd_filter') }}</label>
                <div class="ui icon input fluid">
                    {{ form.render('filter') }}
                    <i class="link grey times icon clear-filter-btn" id="clear-filter-btn" data-content="{{ t._('sd_ClearFilter') }}"></i>
                </div>
            </div>

            <div class="field buttons-field">
                <label>&nbsp;</label>
                <div class="ui buttons">
                    <div class="ui icon button" id="download-file" data-content="{{ t._('sd_ToolTipDownload') }}"><i class="download icon"></i></div>
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

        {# Universal navigation - compact single line #}
        <div id="universal-navigation">
            <div class="time-navigation-modern">
                {# Period buttons + timeline in one row #}
                <div class="time-controls-inline">
                    <div class="quick-period-buttons" id="period-buttons">
                        <button type="button" class="period-btn" data-period="3600">1h</button>
                        <button type="button" class="period-btn" data-period="10800">3h</button>
                        <button type="button" class="period-btn" data-period="43200">12h</button>
                        <button type="button" class="period-btn" data-period="86400">1d</button>
                        <button type="button" class="period-btn" data-period="604800">1w</button>
                        <button type="button" class="period-btn" data-period="1209600">2w</button>
                    </div>
                    <div class="time-slider-inline">
                        <div id="time-slider-container"></div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <div class="code-container">
        <div id="log-content-readonly" class="log-content-readonly">
            <pre></pre>
        </div>

        <div class="fullscreen-toggle-btn">
            <i class="inverted expand icon"></i>
        </div>
    </div>
</div>