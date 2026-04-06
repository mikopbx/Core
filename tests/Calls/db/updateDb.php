#!/usr/bin/php
<?php
require_once 'Globals.php';
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