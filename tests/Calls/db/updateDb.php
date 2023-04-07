#!/usr/bin/php
<?php
require_once 'Globals.php';
$dbUpdater = new \MikoPBX\Core\System\Upgrade\UpdateDatabase();
$dbUpdater->updateDatabaseStructure();
\MikoPBX\Core\System\PBX::sipReload();
\MikoPBX\Core\System\PBX::dialplanReload();
\MikoPBX\Core\System\PBX::managerReload();
\MikoPBX\Core\System\PBX::modulesReload();
\MikoPBX\Core\System\PBX::featuresReload();
\MikoPBX\Core\System\PBX::voicemailReload();
\MikoPBX\Core\System\PBX::coreReload();

$cmd = \MikoPBX\Core\System\Util::which('pbx-console');
shell_exec("$cmd services restart-all");