<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_PBXRecordCalls') }}</label>
            {{ form.render('PBXRecordCalls') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_PBXRecordCallsInner') }}</label>
            {{ form.render('PBXRecordCallsInner') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_PBXSplitAudioThread') }}</label>
            {{ form.render('PBXSplitAudioThread') }}
        </div>
    </div>
</div>
{{ partial("partials/playAddNewSound", ['label': t._('gs_PBXRecordAnnouncementIn'), 'id':'PBXRecordAnnouncementIn', 'fieldClass':'field', 'fieldId':'']) }}
{{ partial("partials/playAddNewSound", ['label': t._('gs_PBXRecordAnnouncementOut'), 'id':'PBXRecordAnnouncementOut', 'fieldClass':'field', 'fieldId':'']) }}