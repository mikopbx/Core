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
            <label>{{ t._('gs_PBXSplitAudioThread') }}</label>
            {{ form.render('PBXSplitAudioThread') }}
        </div>
    </div>
</div>