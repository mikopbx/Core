{{ form('dialplan-applications/save', 'role': 'form', 'class': 'ui form large', 'id':'dialplan-application-form') }}
<input type="hidden" name="dirrty" id="dirrty"/>
{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('applicationlogic') }}
<div class="ui ribbon label" id="dialplan-application-extension-number">
    <i class="phone icon"></i> {{ extension }}
</div>
<h3 class="ui hidden header "></h3>
<div class="ui top attached tabular menu" id="application-code-menu">
    <a class="item" data-tab="main">{{ t._('da_Main') }}</a>
    <a class="item active" data-tab="code">{{ t._('da_Applicationlogic') }}</a>
</div>
<div class="ui bottom attached tab segment" data-tab="main">

    <div class="field">
        <label>{{ t._('da_Name') }}</label>
        {{ form.render('name') }}
    </div>
    <div class="field">
        <label>{{ t._('da_Description') }}</label>
        {{ form.render('description') }}
    </div>
    <div class="four wide field">
        <label>{{ t._('da_Extensions') }}</label>
        <div class="ui icon input extension">
            <i class="search icon"></i>
            {{ form.render('extension') }}
        </div>

        <div class="ui top pointing red label hidden" id="extension-error">
            {{ t._("da_ThisNumberIsNotFree") }}
        </div>
    </div>
    <div class="field">
        <label>{{ t._('da_Type') }}</label>
        {{ form.render('type') }}
    </div>
</div>
<div class="ui bottom attached tab segment active" data-tab="code">
    <div id="application-code" class="application-code">
        <pre></pre>
    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'dialplan-applications/index/']) }}
</form>
