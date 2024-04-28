<div class="field">
    <label>{{ t._('gs_PBXName') }}</label>
    {{ form.render('Name') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXDescription') }}</label>
    {{ form.render('Description') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXLanguage') }} </label>
    <div class="field max-width-400">
        {{ form.render('PBXLanguage') }}
        <div class="ui pointing teal basic label">
            {{ t._('gs_NeedRestartPBX') }}
        </div>
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_PBXInternalExtensionLength') }}</label>
    <div class="field max-width-200">
        {{ form.render('PBXInternalExtensionLength') }}
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_PBXAllowGuestCalls') }}</label>
            {{ form.render('PBXAllowGuestCalls') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_RestartEveryNight') }}</label>
            {{ form.render('RestartEveryNight') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_SendAnonymousMetrics') }}</label>
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