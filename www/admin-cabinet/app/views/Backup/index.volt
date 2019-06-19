<input type="file" accept=".zip, .xml, .img" name="restore-file" style="display: none!important;"/>
{{ link_to("backup/create", '<i class="save icon"></i> '~t._('bkp_CreateBackup'), "class": " ui blue button ") }}
{{ link_to("backup/automatic", '<i class="calendar alternate outline icon"></i> '~t._('bkp_CreateBackupAutomatic'), "class": " ui blue button ") }}
<button class="ui button" id="uploadbtn"><i class="cloud upload alternate icon"></i>{{ t._('bkp_RestoreFileName') }}</button>
<div class="ui hidden divider"></div>
<div class="ui indicating progress" id="upload-progress-bar">
    <div class="bar">
        <div class="progress"></div>
    </div>
</div>
<div id="existing-backup-files">
    <table class="ui selectable compact table" id="existing-backup-files-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('bkp_CreateDate') }}</th>
            <th>{{ t._('bkp_Filesize') }}</th>
            <th></th>
        </tr>
        </thead>
        <tbody>
        <tr id="dummy-row">
            <td class="center aligned disabled" colspan="4">{{ t._('bkp_NoBackupRecordsAvailable') }}</td>
        </tr>
        <tr id="backup-template-row">
            <td class="status"><i class="spinner loading icon"></i></td>
            <td class="create-date">17.01.2008</td>
            <td class="file-size">127 MB</td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': '',
                    'restore' : 'backup/restore/',
                    'download' : 'backup/download/'
                ]) }}
        </tr>
        </tbody>
    </table>
</div>