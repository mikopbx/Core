#!/usr/bin/php
<?php
require_once 'Globals.php';
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\PBX;

$dbUpdater = new UpdateDatabase();
$dbUpdater->updateDatabaseStructure();
PBX::sipReload();
PBX::dialplanReload();
PBX::managerReload();
PBX::modulesReload();
PBX::featuresReload();
PBX::voicemailReload();
PBX::coreReload();

$cmd = Util::which('pbx-console');
shell_exec("$cmd services restart-all");