<div class="ui tabular menu" id="system-diagnostic-menu">
    <a class="item active" data-tab="show-log">{{ t._('sd_ShowLog') }}</a>
    <a class="item" data-tab="capture-log">{{ t._('sd_CapturePcap') }}</a>
</div>

<div class="ui tab" data-tab="show-log">
    <form class="ui form" id="system-diagnostic-form">
        <div class="fields">
          <div class="field ui form">
            <div class="inline field small">
              <label>
                  {{ t._('sd_Filename') }}
              </label>
              {{ form.render('filenames') }}
            </div>
          </div>
          <div class="field ui form">
            <div class="inline field small">
              <label>
                  {{ t._('sd_lines') }}
              </label>
              {{ form.render('lines') }}
            </div>
          </div>
          <div class="field ui form">
            <div class="inline field small">
              <label>
                  {{ t._('sd_filter') }}
              </label>
              {{ form.render('filter') }}
            </div>
          </div>
          <button class="ui primary button" id="show-last-log">
             {{ t._('sd_ShowLastLog') }}
          </button>
        </div>
    </form>

    <div id="application-code-readonly" class="application-code"><pre>{{ content|e }}</pre></div>
    <div id="application-code" class="hidden"></div>

</div>

<div class="ui tab" data-tab="capture-log">
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
