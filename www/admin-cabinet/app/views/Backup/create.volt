{{ form('backup/create', 'role': 'form', 'class': 'ui form large', 'id':'backup-create-form') }}
<div class="ui header">{{ t._('bkp_CreateBackupHeader') }}</div>
 {% for key, toggle in whatBackup %}
     <div class="ui segment">
         <div class="field">
             <div class="ui toggle checkbox">
                 {{ form.render(key) }}
                 <label>{{ t._('bkp_'~key) }}</label>
             </div>
         </div>
     </div>
 {% endfor %}
<div class="field">
    <div class="ui indicating progress" id="backup-progress-bar">
        <div class="bar">
            <div class="progress"></div>
        </div>
    </div>
</div>


{{ partial("partials/submitbutton",
    [
        'indexurl':'backup/index',
        'submitBtnText':'bkp_CreateBackup',
        'submitBtnIconClass':'save'
    ]
) }}
<button type="submit" class="ui left labeled icon large right floated red button" id="stopbackupbutton" data-value="">
        <i class="stop icon"></i>
        {{ t._('bkp_StopCreateBackup') }}
</button>

</form>