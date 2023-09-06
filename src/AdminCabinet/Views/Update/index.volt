<div class="ui modal" id="update-modal-form">
    <div class="header">
        {{ t._('upd_UpdateTitle') }}
    </div>
    <div class="image content">
        <div class="image">
            <i class="icon attention"></i>
        </div>
        <div class="description">
            {{ t._('upd_UpdateDescription') }}<br><br>
            {{ t._('upd_EnterIHaveBackupPhrasePreText') }} &nbsp&nbsp<b>{{ t._('upd_EnterIHaveBackupPhrase') }}</b>
            <br><br>
            <div class="ui input fluid max-width-400">
                <label for="i-have-backup-input"></label>
                <input type="text" name="i-have-backup-input" value=""/>
            </div>
        </div>
    </div>
    <div class="actions">
        <div class="ui negative button">{{ t._('upd_Cancel') }}</div>
        <div class="ui positive disabled button" id="start-upgrade-button">{{ t._('upd_Update') }}</div>
    </div>
</div>
<form class="ui large grey segment form" id="upgrade-form">
    <div class="field">
        <label>{{ t._('upd_FileName') }}</label>
        <div class="ui action input">
            <input type="text" readonly>
            <input type="file" name="update-file" accept=".img" style="display: none!important;"/>
            <div class="ui icon button">
                <i class="cloud upload alternate icon"></i>
            </div>
        </div>
    </div>
    <div class="field">
        <div class="ui indicating progress" id="upload-progress-bar">
            <div class="bar">
                <div class="progress"></div>
            </div>
            <div class="label" id="upload-progress-bar-label"></div>
        </div>
    </div>
    {{ partial("partials/submitbutton",[
        'submitBtnText':'upd_UpdateSystem',
        'submitBtnIconClass':'save'
    ]) }}
    <div class="ui clearing hidden divider"></div>
</form>
<div id="online-updates-block" style="display: none">
    <h3 class="ui header">{{ t._('upd_AvailableUpdates') }}</h3>
    <table class="ui celled table" id="updates-table">
        <thead>
        <tr>
            <th class="collapsing center aligned column">{{ t._('upd_VersionColumn') }}</th>
            <th>{{ t._('upd_DescriptionColumn') }}</th>
            <th class="collapsing column"></th>
        </tr>
        </thead>
        <tbody>

        </tbody>
    </table>
</div>