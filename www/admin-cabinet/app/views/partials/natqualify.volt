
<div class="five wide field">
    <label for="nat">{{ t._('qf_NatMode') }}</label>

    {{ form.render('nat') }}
</div>
{{ t._('qf_NatModeInstructions') }}
<div class="five wide field">
    <label>{{ t._('qf_Qualify') }}</label>
    <div class="ui segment">
        <div class="field">
            <div class="ui toggle checkbox" id="qualify">
                {{ form.render('qualify') }}

            </div>
        </div>
        <div class=" field" id="qualify-freq">
            <label for="qualifyfreq">{{ t._('qf_Frequency') }}</label>
            {{ form.render('qualifyfreq') }}
        </div>
    </div>
</div>
{{ t._('qf_QualifyInstructions') }}
