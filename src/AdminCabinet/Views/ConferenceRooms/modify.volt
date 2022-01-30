{{ form('conference-rooms/save', 'role': 'form', 'class': 'ui large form','id':'conference-room-form') }}

{{ form.render('uniqid') }}
{{ form.render('id') }}
<div class="ui ribbon label" id="conference-extension-number">
    <i class="phone icon"></i> {{ extension }}
</div>
<h3 class="ui hidden header "></h3>
<div class="ten wide field">
    <label>{{ t._('cr_Name') }}</label>
    {{ form.render('name') }}
</div>

<div class="six wide field">
    <label>{{ t._('cr_Extensions') }}</label>
    <div class="ui icon input extension">
        <i class="search icon"></i>
        {{ form.render('extension') }}
    </div>

    <div class="ui top pointing red label hidden" id="extension-error">
        {{ t._("cr_ThisNumberIsNotFree") }}
    </div>
</div>

<div class="six wide field">
    <label>{{ t._('cr_pinCode') }}</label>
    <div class="ui icon input pin">
        <i class="key icon"></i>
        {{ form.render('pinCode') }}
    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'conference-rooms/index/']) }}
</form>
