{{ form(['action' : 'outbound-routes/save', 'method': 'post', 'role': 'form', 'class': 'ui large form  ', 'id':'outbound-route-form']) }}

{{ form.render('id') }}
{{ form.render('priority') }}

<div class="field max-width-800">
    <label>{{ t._('or_RuleName') }}</label>
    {{ form.render('rulename') }}
</div>

<div class="field max-width-800">
    <label>{{ t._('or_Note') }}</label>
    {{ form.render('note') }}
</div>
<h3 class="ui dividing header ">{{ t._("or_PatternToMatch") }}</h3>
<div class="inline field">
    <label>{{ t._('or_NumberBeginsWithTheDigits') }}
        <i class="small info circle icon field-info-icon" 
           data-field="numberbeginswith"></i>
    </label>
    {{ form.render('numberbeginswith') }}
</div>
<div class="inline field">
    <label>{{ t._('or_TheRestOfTheNumberMustBe') }}
        <i class="small info circle icon field-info-icon" 
           data-field="restnumbers"></i>
    </label>
    {{ form.render('restnumbers') }}
</div>

<h3 class="ui dividing header ">{{ t._("or_ReformatNumber") }}</h3>
<div class="wide inline field">
    {{ t._('or_BeforeConnectingTheCallTrim') }}&nbsp;
    <i class="small info circle icon field-info-icon" 
       data-field="trimfrombegin"></i>&nbsp;
    {{ form.render('trimfrombegin') }}
    {{ t._('or_digitsFromTheFrontAndThenPrependTheDigits') }}&nbsp;
    <i class="small info circle icon field-info-icon" 
       data-field="prepend"></i>&nbsp;
    {{ form.render('prepend') }}
    {{ t._('or_toTheNumber') }}
</div>

<h3 class="ui dividing header ">{{ t._("or_CallThrough") }}</h3>

<div class="field max-width-500">
    <label for="providerid">{{ t._('or_Provider') }}
        <i class="small info circle icon field-info-icon" 
           data-field="providerid"></i>
    </label>
    {{ form.render('providerid') }}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'outbound-routes/index/']) }}
{{ close('form') }}