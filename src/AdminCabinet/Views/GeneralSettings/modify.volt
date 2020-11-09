{{ form('general-settings/save', 'role': 'form', 'class': 'ui form large', 'id':'general-settings-form') }}
<input type="hidden" name="dirrty" id="dirrty"/>
<div class="ui grid">
    <div class="four wide column">
        <div class="ui vertical fluid tabular menu" id="general-settings-menu">
            <a class="item active" data-tab="general">{{ t._('gs_MainTab') }}</a>
            <a class="item" data-tab="recording">{{ t._('gs_CallRecordTab') }}</a>
            <a class="item" data-tab="features">{{ t._('gs_FeaturesTab') }}</a>
            <a class="item" data-tab="sip">{{ t._('gs_SIPTab') }}</a>
            <a class="item" data-tab="codecs">{{ t._('gs_CodecsTab') }}</a>
            <a class="item" data-tab="ami">{{ t._('gs_AMITab') }}</a>
            <a class="item" data-tab="ssh">{{ t._('gs_SSHTab') }}</a>
            <a class="item" data-tab="web">{{ t._('gs_WebTab') }}</a>
            <a class="item" data-tab="passwords">{{ t._('gs_Passwords') }}</a>
            <a class="item" data-tab="deleteAll">{{ t._('gs_DangerZone') }}</a>
        </div>
    </div>
    <div class="twelve wide column">

        <!-- general -->
        <div class="ui tab segment active" data-tab="general">
            {{ partial("GeneralSettings/general") }}
        </div>
        <!-- recording -->
        <div class="ui tab segment" data-tab="recording">
            {{ partial("GeneralSettings/recording") }}
        </div>

        <!-- features -->
        <div class="ui tab segment" data-tab="features">
            {{ partial("GeneralSettings/features") }}
        </div>

        <!-- sip -->
        <div class="ui tab segment" data-tab="sip">
            {{ partial("GeneralSettings/sip") }}
        </div>

        <!-- codecs -->
        <div class="ui tab segment" data-tab="codecs">
            {{ partial("GeneralSettings/codecs") }}
        </div>

        <!-- ami -->
        <div class="ui tab segment" data-tab="ami">
            {{ partial("GeneralSettings/ami") }}
        </div>

        <!-- ssh -->
        <div class="ui  tab segment" data-tab="ssh">
            {{ partial("GeneralSettings/ssh") }}
        </div>

        <!-- web -->
        <div class="ui tab segment" data-tab="web">
            {{ partial("GeneralSettings/web") }}
        </div>

        <!-- passwords -->
        <div class="ui  tab segment" data-tab="passwords">
            {{ partial("GeneralSettings/passwords") }}
        </div>

        <!-- deleteall -->
        <div class="ui tab segment" data-tab="deleteAll">
            {{ partial("GeneralSettings/deleteall") }}
        </div>

    </div>
</div>


{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
</form>