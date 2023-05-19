<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;

/**
 * Generates the configuration content for cel_sqlite3_custom.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class CelSqlite3CustomConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'cel_sqlite3_custom.conf';

    /**
     * Generates the configuration content for cel_sqlite3_custom.conf.
     */
    protected function generateConfigProtected(): void
    {
        $cal    = "eventtype, eventtime, cidname, cidnum, cidani, cidrdnis, ciddnid, context, exten, channame, appname, appdata, amaflags, accountcode, uniqueid, userfield, peer, userdeftype, eventextra, linkedid";
        $values = '\'${eventtype}\',\'${eventtime}\',\'${CALLERID(name)}\',\'${CALLERID(num)}\',\'${CALLERID(ANI)}\',\'${CALLERID(RDNIS)}\',\'${CALLERID(DNID)}\',\'${CHANNEL(context)}\',\'${CHANNEL(exten)}\',\'${CHANNEL(channame)}\',\'${CHANNEL(appname)}\',\'${CHANNEL(appdata)}\',\'${CHANNEL(amaflags)}\',\'${CHANNEL(accountcode)}\',\'${CHANNEL(uniqueid)}\',\'${CHANNEL(userfield)}\',\'${BRIDGEPEER}\',\'${userdeftype}\',\'${eventextra}\',\'${CHANNEL(linkedid)}\'';

        $conf = "[master]\n" .
            "table = cel\n" .
            "columns => $cal \n" .
            "values => $values \n";

        // Write the configuration content to the file
        file_put_contents($this->config->path('asterisk.astetcdir') . "/cel_sqlite3_custom.conf", $conf);
    }
}