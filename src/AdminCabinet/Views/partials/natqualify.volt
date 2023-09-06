<h4 class="ui dividing header ">{{ t._('qf_Qualify') }}</h4>
<div class="inline fields">
    <div class="ui toggle checkbox" id="qualify">
        {{ form.render('qualify') }}
    </div>
    <div class="field" id="qualify-freq">
        {{ t._('qf_Frequency') }}
        {{ form.render('qualifyfreq') }}
    </div>
</div>
<div class='ui info message'>
    {{ t._('qf_QualifyInstructions') }}
</div>