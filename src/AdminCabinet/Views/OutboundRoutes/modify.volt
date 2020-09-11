{{ form('outbound-routes/save', 'role': 'form', 'class': 'ui large form  ', 'id':'outbound-route-form') }}

{{ form.render('id') }}
{{ form.render('priority') }}

<div class="ten wide field">
    <label>{{ t._('or_RuleName') }}</label>
    {{ form.render('rulename') }}
</div>

<div class="ten wide field">
    <label>{{ t._('or_Note') }}</label>
    {{ form.render('note') }}
</div>
<h3 class="ui dividing header ">{{ t._("or_PatternToMatch") }}</h3>
<div class="inline field">
    <label>{{ t._('or_NumberBeginsWithTheDigits') }}</label>
    {{ form.render('numberbeginswith') }}
</div>
<div class="inline field">
    <label>{{ t._('or_TheRestOfTheNumberMustBe') }}</label>
    {{ form.render('restnumbers') }}
</div>

<h3 class="ui dividing header ">{{ t._("or_ReformatNumber") }}</h3>
<div class="wide inline field">
    {{ t._('or_BeforeConnectingTheCallTrim') }}
    {{ form.render('trimfrombegin') }}
    {{ t._('or_digitsFromTheFrontAndThenPrependTheDigits') }}
    {{ form.render('prepend') }}
    {{ t._('or_toTheNumber') }}
</div>

<h3 class="ui dividing header ">{{ t._("or_CallThrough") }}</h3>

<div class="five wide field">
    <label>{{ t._('or_Provider') }}</label>
    {{ form.render('providerid') }}
</div>
{{ partial("partials/submitbutton",['indexurl':'outbound-routes/index/']) }}
</form>