<div class="field">
    <label>{{ t._('gs_PBXName') }}</label>
    {{ form.render('Name') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXDescription') }}</label>
    {{ form.render('Description') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXLanguage') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXLanguage"></i>
    </label>
    <div class="field max-width-400">
        {{ form.render('PBXLanguage') }}
        <div class="ui pointing teal basic label" id="restart-warning-PBXLanguage" style="display: none;">
            {{ t._('gs_NeedRestartPBX') }}
        </div>
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_PBXInternalExtensionLength') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXInternalExtensionLength"></i>
    </label>
    <div class="field max-width-200">
        {{ form.render('PBXInternalExtensionLength') }}
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="PBXAllowGuestCalls">{{ t._('gs_PBXAllowGuestCalls') }}
                <i class="small info circle icon field-info-icon"
                   data-field="PBXAllowGuestCalls"></i>
            </label>
            {{ form.render('PBXAllowGuestCalls') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            {{ form.render('RestartEveryNight') }}
            <label for="RestartEveryNight">{{ t._('gs_RestartEveryNight') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="RestartEveryNight"></i>
            </label>
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="SendMetrics">{{ t._('gs_SendAnonymousMetrics') }}
                <i class="small info circle icon field-info-icon"
                   data-field="SendMetrics"></i>
            </label>
            {{ form.render('SendMetrics') }}
        </div>
    </div>
</div>
{#<div class="field">#}
{#    <div class="ui segment">#}
{#        <div class="ui toggle checkbox">#}
{#            <label>{{ t._('gs_DisableAllModules') }}</label>#}
{#            {{ form.render('DisableAllModules') }}#}
{#        </div>#}
{#    </div>#}
{#</div>#}