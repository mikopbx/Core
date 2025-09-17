<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="PBXRecordCalls">{{ t._('gs_PBXRecordCalls') }}</label>
            {{ form.render('PBXRecordCalls') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="PBXRecordCallsInner">{{ t._('gs_PBXRecordCallsInner') }}</label>
            {{ form.render('PBXRecordCallsInner') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="PBXSplitAudioThread">{{ t._('gs_PBXSplitAudioThread') }}
                <i class="small info circle icon field-info-icon"
                   data-field="PBXSplitAudioThread"></i>
            </label>
            {{ form.render('PBXSplitAudioThread') }}
        </div>
    </div>
</div>
{{ partial("partials/playAddNewSoundWithIcons", ['label': t._('gs_PBXRecordAnnouncementIn'), 'id':'PBXRecordAnnouncementIn', 'fieldClass':'field', 'fieldId':'']) }}
{{ partial("partials/playAddNewSoundWithIcons", ['label': t._('gs_PBXRecordAnnouncementOut'), 'id':'PBXRecordAnnouncementOut', 'fieldClass':'field', 'fieldId':'']) }}