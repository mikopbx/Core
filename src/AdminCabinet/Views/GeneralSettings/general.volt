<div class="field">
    <label>{{ t._('gs_PBXName') }}</label>
    {{ form.render('Name') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXDescription') }}</label>
    {{ form.render('Description') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXLanguage') }}</label>
    {{ form.render('PBXLanguage') }}
    <div class="ui pointing teal basic label">
        {{ t._('gs_NeedRestartPBX') }}
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_PBXInternalExtensionLength') }}</label>
    {{ form.render('PBXInternalExtensionLength') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXFeatureDigitTimeout') }}</label>
    {{ form.render('PBXFeatureDigitTimeout') }}
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