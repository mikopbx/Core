<h2 class="ui dividing header">{{ t._('gs_AMISettings') }}</h2>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="AMIEnabled">{{ t._('gs_AMIEnabled') }}
                <i class="small info circle icon field-info-icon"
                   data-field="AMIEnabled"></i>
            </label>
            {{ form.render('AMIEnabled') }}
        </div>
    </div>
</div>
<div class="inline field">
    {{ form.render('AMIPort') }}
    <label>{{ t._('gs_AMIPort') }}</label>
</div>

<h2 class="ui dividing header">{{ t._('gs_HTTPSettings') }}</h2>
<div class="inline field">
    {{ form.render('AJAMPort') }}
    <label>{{ t._('gs_HTTPPort') }}</label>
</div>
<div class="inline field">
    {{ form.render('AJAMPortTLS') }}
    <label>{{ t._('gs_HTTPPortTLS') }}</label>
</div>

<h2 class="ui dividing header">{{ t._('gs_AJAMSettings') }}</h2>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="AJAMEnabled">{{ t._('gs_AJAMEnabled') }}
                <i class="small info circle icon field-info-icon"
                   data-field="AJAMEnabled"></i>
            </label>
            {{ form.render('AJAMEnabled') }}
        </div>
    </div>
</div>

<h2 class="ui dividing header">{{ t._('gs_ARISettings') }}</h2>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="ARIEnabled">{{ t._('gs_ARIEnabled') }}
                <i class="small info circle icon field-info-icon"
                   data-field="ARIEnabled"></i>
            </label>
            {{ form.render('ARIEnabled') }}
        </div>
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_ARIAllowedOrigins') }}
        <i class="small info circle icon field-info-icon" 
           data-field="ARIAllowedOrigins"></i>
    </label>
    <div class="ui input">
        {{ form.render('ARIAllowedOrigins') }}
    </div>
</div>