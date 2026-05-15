#!/usr/bin/php
<?php
require_once 'Globals.php';
use MikoPBX\Common\Models\ExtensionForwardingRights;
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
foreach (ExtensionForwardingRights::find(['extension = :ext:', 'bind' => ['ext' => '504']]) as $row) {
    $row->writeAttribute('forwarding', '');
    $row->writeAttribute('forwardingonbusy', '');
    $row->writeAttribute('forwardingonunavailable', '');
    $row->save();
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