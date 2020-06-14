{{ form('backup/automatic', 'role': 'form', 'class': 'ui form large', 'id':'backup-automatic-form') }}
<div class="ui segment">
    <div class="field">
        <div class="ui toggle checkbox" id="enable-disable-toggle">
            {{ form.render('enabled') }}
            <label>{{ t._('bkp_Enabled') }}</label>
        </div>
    </div>
</div>
<div class="two fields disability">
    <div class="field">
        <div class="ten wide field">
            <label>{{ t._('bkp_FTPHost') }}</label>
            {{ form.render('ftp_host') }}
        </div>

        <div class="sixteen wide field">
            <label>{{ t._('bkp_FTPPort') }}</label>
            <div class="inline fields">
                <div class="field">
                    {{ form.render('ftp_port') }}
                </div>
                <div class="field">
                    <div class="ui toggle checkbox" id="sftp-toggle">
                        {{ form.render('ftp_sftp_mode') }}
                        <label>{{ t._('bkp_SFTPMode') }}</label>
                    </div>
                </div>
            </div>
        </div>

        <div class="ten wide field">
            <label>{{ t._('bkp_FTPUsername') }}</label>
            {{ form.render('ftp_username') }}
        </div>

        <div class="ten wide field">
            <label>{{ t._('bkp_FTPSecret') }}</label>
            {{ form.render('ftp_secret') }}
        </div>

        <div class="sixteen wide field">
            <label>{{ t._('bkp_FTPPath') }}</label>
            {{ form.render('ftp_path') }}
        </div>

    </div>
    <div class="field">
        <div class="field">
            <label>{{ t._('bkp_BackupSheidule') }}</label>
            <div class="three fields">
                <div class="eleven wide field">
                    {{ form.render('every') }}
                </div>
                <div class="five wide field time-select" id="time-start">
                    <div class="ui input left icon calendar">
                        <i class="time icon"></i>
                        {{ form.render('at_time') }}
                    </div>
                </div>
            </div>
        </div>
        <div class="field">
            <label>{{ t._('bkp_KeepOlderVersions') }}</label>
            {{ form.render('keep_older_versions') }}
        </div>
        {% for key, toggle in whatBackup %}
            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox rules">
                        {{ formbackup.render(key) }}
                        <label>{{ t._('bkp_'~key) }}</label>
                    </div>
                </div>
            </div>
        {% endfor %}
    </div>

</div>
<div class="ui segment disability">
    <div class="field">
        <div class="ui toggle checkbox" id="create-now">
            <input type="checkbox" name="create-now">
            <label for="create-now">{{ t._('bkp_CreateBackupAfterSaveSettings') }}</label>
        </div>
    </div>
</div>
{{ partial("partials/submitbutton",[]) }}
{{ link_to('backup/index', "<i class='angle left icon'></i>"~t._('bt_Back'), "class": "ui large labeled icon button") }}
</form>