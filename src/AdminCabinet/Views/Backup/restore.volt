<div class="ui modal" id="restore-modal-form">
    <div class="header">
        {{ t._('bkp_RestoreBackupTitle') }}
    </div>
    <div class="image content">
        <div class="image">
            <i class="icon attention"></i>
        </div>
        <div class="description">
            {{ t._('bkp_RestoreBackupConformation') }}
        </div>
    </div>
    <div class="actions">
        <div class="ui negative button">{{ t._('bkp_Cancel') }}</div>
        <div class="ui positive button">{{ t._('bkp_Restore') }}</div>
    </div>
</div>

<div class="ui header">{{ t._('bkp_RestoreBackupHeader') }}</div>
{{ form('backup/restore', 'role': 'form', 'class': 'ui form large', 'id':'backup-restore-form') }}
<div class="field">
    <div class="ui indicating progress" id="restore-progress-bar">
        <div class="bar">
            <div class="progress"></div>
        </div>
    </div>
</div>

{{ partial("partials/submitbutton",
    [
        'indexurl':'backup/index',
        'submitBtnText':'bkp_RestoreBackup',
        'submitBtnIconClass':'redo'
    ]
) }}
<button type="submit" class="ui left labeled icon large right floated red button" id = "deletebutton">
    <i class="trash icon"></i>
    {{ t._('bkp_DeleteFiles') }}
</button>
</form>