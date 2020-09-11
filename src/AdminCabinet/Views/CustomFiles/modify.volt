{{ form('custom-files/save', 'role': 'form', 'class': 'ui form large', 'id':'custom-file-form') }}
<input type="hidden" name="dirrty" id="dirrty"/>
{{ form.render('id') }}
        {{ form.render('content') }}
{{ form.render('filepath') }}
<div class="field">
    <label>{{ t._('cf_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="field">
    <label>{{ t._('cf_Mode') }}</label>
    {{ form.render('mode') }}
</div>
<div id="application-code-readonly" class="application-code">
    <pre>{{ content|e }}</pre>
</div>
<div class="ui hidden divider"></div>
<div id="application-code" class="application-code">
    <pre>{{ content|e }}</pre>
</div>
<div class="ui hidden divider"></div>

{{ partial("partials/submitbutton",['indexurl':'custom-files/index/']) }}
</form>
