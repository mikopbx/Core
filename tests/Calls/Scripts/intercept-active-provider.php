#!/usr/bin/env php
<?php

declare(strict_types=1);

use MikoPBX\Core\System\Util;
use MikoPBX\Tests\Calls\Scripts\Interception\ActiveProviderInterception;

require_once 'Globals.php';
require_once __DIR__ . '/Interception/ActiveProviderInterception.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This test script can only run from CLI.\n");
    exit(1);
}

$usage = <<<TEXT
Usage:
  php {$argv[0]} <provider-id> <internal-extension> [options]

Options:
  --channel=<channel>  Select a channel when the provider has several active calls
  --caller=<number>    Override CALLERID(num) read from the provider channel
  --execute            Perform Originate (without it the script is a dry run)

Example:
  php {$argv[0]} SIP-PROVIDER-AAA880B194BA809EA72C0FCC4D6363AB 206 --execute
TEXT;

$positionals = [];
$requestedChannel = null;
$callerOverride = null;
$execute = false;

foreach (array_slice($argv, 1) as $argument) {
    if ($argument === '--execute') {
        $execute = true;
        continue;
    }
    if (str_starts_with($argument, '--channel=')) {
        $requestedChannel = substr($argument, strlen('--channel='));
        continue;
    }
    if (str_starts_with($argument, '--caller=')) {
        $callerOverride = substr($argument, strlen('--caller='));
        continue;
    }
    if (str_starts_with($argument, '--')) {
        fwrite(STDERR, "Unknown option: $argument\n\n$usage\n");
        exit(1);
    }

    $positionals[] = $argument;
}

if (count($positionals) !== 2) {
    fwrite(STDERR, "$usage\n");
    exit(1);
}

[$providerId, $internalExtension] = $positionals;
$manager = null;
$exitCode = 0;

try {
    $manager = Util::getAstManager('off');
    $selectedChannel = ActiveProviderInterception::selectChannel(
        $manager->GetChannels(),
        $providerId,
        $requestedChannel
    );
    $callerNumber = $callerOverride ?? trim(
        (string)$manager->GetVar($selectedChannel['channel'], 'CALLERID(num)', null, false)
    );
    $request = ActiveProviderInterception::buildOriginateRequest(
        $selectedChannel,
        $internalExtension,
        $callerNumber
    );

    fwrite(STDOUT, "Provider channel: {$selectedChannel['channel']}\n");
    fwrite(STDOUT, "Linkedid:         {$selectedChannel['linkedid']}\n");
    fwrite(STDOUT, "Caller number:    {$request['exten']}\n");
    fwrite(STDOUT, "Originate channel: {$request['channel']}\n");
    fwrite(STDOUT, "Variables:        {$request['variables']}\n");

    if (!$execute) {
        fwrite(STDOUT, "DRY RUN: Originate was not executed. Add --execute to intercept the call.\n");
    } else {
        $response = $manager->Originate(
            $request['channel'],
            $request['exten'],
            $request['context'],
            $request['priority'],
            null,
            null,
            null,
            $request['callerId'],
            $request['variables'],
            null,
            false
        );

        fwrite(STDOUT, 'AMI response: ' . json_encode($response, JSON_UNESCAPED_SLASHES) . PHP_EOL);
        if (($response['Response'] ?? '') !== 'Success') {
            $exitCode = 2;
        }
    }
} catch (Throwable $exception) {
    fwrite(STDERR, 'Interception failed: ' . $exception->getMessage() . PHP_EOL);
    $exitCode = 2;
} finally {
    if ($manager !== null) {
        $manager->disconnect();
    }
}

exit($exitCode);
