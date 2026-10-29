#!/usr/bin/php
<?php
require_once 'Globals.php';
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\Asterisk\Configs\AsteriskConf;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\FeaturesConf;
use MikoPBX\Core\Asterisk\Configs\IndicationConf;
use MikoPBX\Core\Asterisk\Configs\ManagerConf;
use MikoPBX\Core\Asterisk\Configs\ModulesConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;

$dbUpdater = new UpdateDatabase();
$dbUpdater->updateDatabaseStructure();

// Test 09 (call-A-to-B-attended-B-to-offNum) needs at least one offline SIP peer
// with NO forwarding configured: otherwise the attended-transfer attempt is redirected
// to the mobile number and the test gets ANSWERED CDR via trunk instead of NO_ANSWER.
// Keep extension 504 forwarding-free regardless of how the test DB was generated.
// The same for 241 (cNum) and 242 (dNum): in tests 12-17 C forwards by its phone's own 302, and
// when that forward fails (test 15) the PBX forwarding of C, or of D on busy, would add calls to
// their mobile numbers. Tests 01-11 do not depend on it: C always answers there.
$noForwarding = ['504', '241', '242'];
foreach (ExtensionForwardingRights::find(['extension IN ({ext:array})', 'bind' => ['ext' => $noForwarding]]) as $row) {
    $row->writeAttribute('forwarding', '');
    $row->writeAttribute('forwardingonbusy', '');
    $row->writeAttribute('forwardingonunavailable', '');
    $row->save();
}

// Tests 18+ transfer to this ring-all queue; C (241) and D (242) are its agents.
$queueNumber = '2200';
if (CallQueues::findFirst(['extension = :ext:', 'bind' => ['ext' => $queueNumber]]) === null) {
    $extension = new Extensions();
    $extension->type = Extensions::TYPE_QUEUE;
    $extension->number = $queueNumber;
    $extension->callerid = 'Test transfer queue';
    $extension->show_in_phonebook = '1';
    $extension->public_access = '1';
    $extension->save();

    $queue = new CallQueues();
    $queue->uniqid = CallQueues::generateUniqueID(Extensions::PREFIX_QUEUE);
    $queue->name = 'Test transfer queue';
    $queue->extension = $queueNumber;
    $queue->strategy = 'ringall';
    $queue->seconds_to_ring_each_member = '15';
    $queue->seconds_for_wrapup = '0';
    $queue->recive_calls_while_on_a_call = '1';
    $queue->caller_hear = 'ringing';
    $queue->save();

    foreach (['241', '242'] as $priority => $agent) {
        $member = new CallQueueMembers();
        $member->queue = $queue->uniqid;
        $member->extension = $agent;
        $member->priority = (string)$priority;
        $member->save();
    }
}

SIPConf::reload();;
ExtensionsConf::reload();
ManagerConf::reload();
ModulesConf::reload();
FeaturesConf::reload();
VoiceMailConf::reload();
AsteriskConf::reload();
IndicationConf::reload();

$cmd = Util::which('pbx-console');
shell_exec("$cmd services restart-all");