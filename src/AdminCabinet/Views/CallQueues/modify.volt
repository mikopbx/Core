{{ form('call-queues/save', 'role': 'form', 'class': 'ui large form','id':'queue-form') }}

<input type="hidden" name="dirrty" id="dirrty"/>
{{ form.render('id') }}
{{ form.render('uniqid') }}
<div class="ui ribbon label" id="queue-extension-number">
    <i class="phone icon"></i> {{ extension }}
</div>
<h3 class="ui dividing header ">{{ t._("cq_QueueSetup") }}</h3>
<div class="ten wide field">
    <label>{{ t._('cq_Name') }}</label>
    {{ form.render('name') }}
</div>

<div class="ten wide field">
    <label >{{ t._('cq_Description') }}</label>
    {{ form.render('description') }}
</div>

<h3 class="ui dividing header ">{{ t._("cq_QueueMembers") }}</h3>

<div class="six wide field">
    <label >{{ t._('cq_SelectAgentForAddToQueue') }}</label>
    <div class="ui selection dropdown search" id="extensionselect">
        <div class="default text">{{ t._('ex_SelectNumber') }}</div>
        <i class="dropdown icon"></i>
    </div>
</div>
    <div class="ui basic compact segment">
    <table class="ui selectable small very compact table" id="extensionsTable">
        <tbody>

{% for extension in extensionsTable %}
     <tr class="member-row" id="{{ extension['number'] }}">
        <td class="dragHandle"><i class="sort grey icon"></i></td>
        <td class="callerid">{{ extension['callerid'] }}</td>
        <td class="right aligned collapsing">
            <div class="ui icon small button delete-row-button"><i class="icon trash red"></i></div>
        </td>
    </tr>
{% endfor %}
<tr class="member-row-tpl" style="display: none">
    <td class="dragHandle"><i class="sort grey icon"></i></td>
    <td class="callerid"></td>
    <td class="right aligned collapsing">
        <div class="ui icon small button delete-row-button"><i class="icon trash red"></i></div>
    </td>
</tr>
        </tbody>
    </table>
    </div>

<div class="field">
    <label >{{ t._('cq_QueueStrategy') }}</label>
    {{ form.render('strategy') }}
</div>
<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class=" content field">
        <div class="six wide field">
            <label>{{ t._('cd_Extensions') }}</label>
            <div class="ui icon input extension">
                <i class="search icon"></i>
                {{ form.render('extension') }}
            </div>

            <div class="ui top pointing red label hidden" id="extension-error">
                {{ t._("cq_ThisNumberIsNotFree") }}
            </div>
        </div>
<div class="ui hidden divider"></div>
<h3 class="ui dividing header ">{{ t._("cq_QueueMemberSettings") }}</h3>

<div class="inline field">
    <label >{{ t._('cq_SecRingToEachMembers') }}</label>
    {{ form.render('seconds_to_ring_each_member') }}
</div>

<div class="inline field">
    <label >{{ t._('cq_WrapupTime') }}</label>
    {{ form.render('seconds_for_wrapup') }}
</div>

<div class="field">
    <div class="ui toggle checkbox">
        {{ form.render('recive_calls_while_on_a_call') }}
        <label >{{ t._('cq_ReciveCallWhileOnCall') }}</label>
    </div>
</div>

<div class="ui hidden divider"></div>
<h3 class="ui dividing header ">{{ t._("cq_QueueCallerSettings") }}</h3>


<div class="inline field">
    <label >{{ t._('cq_CallerHearOnQueued') }}</label>
    {{ form.render('caller_hear') }}
</div>

<div class="field">
    <div class="ui toggle checkbox">
        {{ form.render('announce_position') }}
        <label >{{ t._('cq_AnnoncePosition') }}</label>
    </div>
</div>

<div class="field">
    <div class="ui toggle checkbox">
        <label >{{ t._('cq_AnnonceHoldTime') }}</label>
        {{ form.render('announce_hold_time') }}

    </div>
</div>
<div class="fields">
    <div class="inline  field">
       <label >{{ t._('cq_PereodicAnonceSoundFile') }}</label>
        {{ form.render('periodic_announce_sound_id') }}
    </div>
    <div class="one wide field">
         <div class="ui basic icon button large action-playback-button" data-value="periodic_announce_sound_id"><i class="play icon"></i></div>
    </div>
</div>
<div class="inline field">
    <label >{{ t._('cq_PereodicAnonceFrequency') }}</label>
    {{ form.render('periodic_announce_frequency') }}
</div>

<div class="ui hidden divider"></div>
<h3 class="ui dividing header ">{{ t._("cq_CallRouting") }}</h3>

<div class="ui segment">
    <h4 class="ui header">{{ t._("cq_ScenaryOne") }}</h4>

    <div class="inline field">
        {{ t._("cq_IfQueueNotAnsweredFor") }}
        {{ form.render('timeout_to_redirect_to_extension') }}
        {{ t._("cq_SecondsCallWillBeRoutedTo") }}
        {{ form.render('timeout_extension') }}
    </div>

</div>

<div class="ui segment">
    <h4 class="ui header">{{ t._("cq_ScenaryTwo") }}</h4>

    <div class="inline field">
        {{ t._("cq_RedirectToExtensionIfEmtyQueue") }}
        {{ form.render('redirect_to_extension_if_empty') }}
    </div>

</div>

        {#http://git.miko.ru:8080/browse/ASK-31#}
{#<div class="ui segment">#}
    {#<h4 class="ui header">{{ t._("cq_ScenaryThree") }}</h4>#}

    {#<div class="inline field">#}
        {#{{ t._("cq_IfQueueNotAnsweredNumberCalls") }}#}
        {#{{ form.render('number_unanswered_calls_to_redirect') }}#}
        {#{{ t._("cq_CallsCallWillBeRoutedTo") }}#}
        {#{{ form.render('redirect_to_extension_if_unanswered') }}#}
    {#</div>#}

{#</div>#}

{#<div class="ui segment">#}
    {#<h4 class="ui header">{{ t._("cq_ScenaryFour") }}</h4>#}

    {#<div class="inline field">#}
        {#{{ t._("cq_IfQueueNotAnsweredRepeat") }}#}
        {#{{ form.render('number_repeat_unanswered_to_redirect') }}#}
        {#{{ t._("cq_CallsCallWillBeRoutedTo") }}#}
        {#{{ form.render('redirect_to_extension_if_repeat_exceeded') }}#}
    {#</div>#}

{#</div>#}

    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'call-queues/index/']) }}

</form>