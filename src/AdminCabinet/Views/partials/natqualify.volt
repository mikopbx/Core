<div class="field">
    <div class="ui toggle checkbox" id="qualify">
        {{ form.render('qualify') }}
        <label for="qualify">
            {{ t._('qf_Qualify') }}
            <i class="small info circle icon field-info-icon" 
               data-field="qualify_session"></i>
        </label>
    </div>
</div>
<div class="field" id="qualify-freq">
    <label for="qualifyfreq">{{ t._('qf_Frequency') }}</label>
    <div class="field max-width-200">
        {{ form.render('qualifyfreq') }}
    </div>
</div>