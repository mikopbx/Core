<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Keeps only the phpcs violations that sit on lines changed since a base commit (#1284).
 *
 * Usage: php phpcs-changed-lines.php <base-sha> <phpcs-json-report>
 *
 * Prints a checkstyle report of those violations to stdout (for cs2pr) and a summary
 * of the whole-file totals to stderr, so the legacy debt stays visible without failing
 * the step. Exits 0; cs2pr decides the step result from the filtered report.
 */

declare(strict_types=1);

/**
 * Lines added or modified in a file since the base commit, from the `git diff -U0` hunks.
 *
 * Compares with the working tree, i.e. the very content phpcs has just checked.
 *
 * @return array<int, true>|null Line numbers in the new version of the file, null if git failed.
 */
function changedLines(string $base, string $file): ?array
{
    $cmd = sprintf(
        'git diff -U0 --no-color --no-ext-diff %s -- %s',
        escapeshellarg($base),
        escapeshellarg($file)
    );
    exec($cmd, $output, $exitCode);
    if ($exitCode !== 0) {
        fwrite(STDERR, "git diff failed for $file, treating every line as changed\n");
        return null;
    }

    $lines = [];
    foreach ($output as $row) {
        // Hunk header: @@ -a[,b] +c[,d] @@; d defaults to 1, d = 0 is a pure deletion.
        if (preg_match('/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/', $row, $m) !== 1) {
            continue;
        }
        $start = (int)$m[1];
        $count = isset($m[2]) ? (int)$m[2] : 1;
        for ($line = $start; $line < $start + $count; $line++) {
            $lines[$line] = true;
        }
    }

    return $lines;
}

/**
 * Whether git knows the file at the base commit; a file missing there is new as a whole.
 */
function existsAtBase(string $base, string $file): bool
{
    exec(sprintf('git cat-file -e %s 2>/dev/null', escapeshellarg($base . ':' . $file)), $output, $exitCode);
    return $exitCode === 0;
}

if ($argc < 3) {
    fwrite(STDERR, "Usage: php phpcs-changed-lines.php <base-sha> <phpcs-json-report>\n");
    exit(2);
}

[, $base, $reportPath] = $argv;

$report = json_decode((string)file_get_contents($reportPath), true);
if (!is_array($report) || !isset($report['files']) || !is_array($report['files'])) {
    fwrite(STDERR, "Cannot read phpcs JSON report: $reportPath\n");
    exit(2);
}

$cwd = getcwd() . '/';
$xml = new XMLWriter();
$xml->openMemory();
$xml->setIndent(true);
$xml->startDocument('1.0', 'UTF-8');
$xml->startElement('checkstyle');

$total = 0;
$kept = 0;
foreach ($report['files'] as $path => $fileReport) {
    $messages = $fileReport['messages'] ?? [];
    if ($messages === []) {
        continue;
    }
    $total += count($messages);

    $file = str_starts_with($path, $cwd) ? substr($path, strlen($cwd)) : $path;
    $lines = existsAtBase($base, $file) ? changedLines($base, $file) : null;
    // A new file, or a failed diff, is checked as a whole rather than hiding violations.
    $wholeFile = $lines === null;

    $fileOpened = false;
    foreach ($messages as $message) {
        if (!$wholeFile && !isset($lines[(int)$message['line']])) {
            continue;
        }
        if (!$fileOpened) {
            $xml->startElement('file');
            $xml->writeAttribute('name', $file);
            $fileOpened = true;
        }
        $xml->startElement('error');
        $xml->writeAttribute('line', (string)$message['line']);
        $xml->writeAttribute('column', (string)$message['column']);
        $xml->writeAttribute('severity', strtolower((string)$message['type']));
        $xml->writeAttribute('message', (string)$message['message']);
        $xml->writeAttribute('source', (string)$message['source']);
        $xml->endElement();
        $kept++;
    }
    if ($fileOpened) {
        $xml->endElement();
    }
}

$xml->endElement();
$xml->endDocument();
echo $xml->outputMemory();

fwrite(
    STDERR,
    sprintf(
        "phpcs: %d violation(s) in the checked files, %d on lines changed since %s\n",
        $total,
        $kept,
        $base
    )
);
