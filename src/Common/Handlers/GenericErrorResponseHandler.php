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

declare(strict_types=1);

namespace MikoPBX\Common\Handlers;

use Whoops\Handler\Handler;

/**
 * Whoops output handler for the web interface: a generic error with no trace, source or request data.
 *
 * The details go to syslog through the earlier handlers of the stack.
 * AJAX requests get the AdminCabinet JSON shape, page loads get a static HTML page.
 */
class GenericErrorResponseHandler extends Handler
{
    public const string MESSAGE = 'Internal Server Error';

    /**
     * @param bool $asJson Answer with JSON (AJAX) instead of the HTML page.
     */
    public function __construct(private readonly bool $asJson)
    {
    }

    /**
     * Writes the generic error body; Whoops sends it with HTTP 500.
     *
     * @return int Handler::QUIT
     */
    public function handle(): int
    {
        echo $this->asJson ? $this->renderJson() : $this->renderHtml();
        return Handler::QUIT;
    }

    /**
     * Content type that Whoops sends before the output.
     *
     * @return string
     */
    public function contentType(): string
    {
        return $this->asJson ? 'application/json' : 'text/html';
    }

    /**
     * Builds the body in the format of AdminCabinet AJAX responses.
     *
     * @return string
     */
    private function renderJson(): string
    {
        return (string)json_encode([
            'success' => false,
            'reload' => false,
            'message' => ['error' => [self::MESSAGE]],
        ]);
    }

    /**
     * Builds a self-contained HTML page that needs no assets, DB or translations.
     *
     * @return string
     */
    private function renderHtml(): string
    {
        $message = self::MESSAGE;
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>500 {$message}</title>
<style>
body{margin:0;font-family:sans-serif;background:#f5f5f5;color:#333}
body{display:flex;align-items:center;justify-content:center;min-height:100vh}
main{text-align:center;padding:16px}
h1{font-size:48px;margin:0 0 8px}
p{margin:4px 0}
</style>
</head>
<body>
<main>
<h1>500</h1>
<p>{$message}</p>
<p>The error has been logged. Please reload the page or try again later.</p>
</main>
</body>
</html>
HTML;
    }
}
