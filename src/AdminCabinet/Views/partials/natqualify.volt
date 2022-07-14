<div class="five wide field">
    <label for="nat">{{ t._('qf_NatMode') }}</label>
    {{ form.render('nat') }}
</div>
{{ t._('qf_NatModeInstructions') }}

<label>{{ t._('qf_Qualify') }}</label>
<div class="inline fields">
    <div class="ui toggle checkbox" id="qualify">
        {{ form.render('qualify') }}
    </div>
    <div class=" field" id="qualify-freq">
        {{ t._('qf_Frequency') }}
        {{ form.render('qualifyfreq') }}
    </div>
</div>
{{ t._('qf_QualifyInstructions') }}