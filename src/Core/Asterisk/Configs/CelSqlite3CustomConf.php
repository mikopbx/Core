<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


class CelSqlite3CustomConf extends \MikoPBX\Modules\Config\ConfigClass
{
    protected $description = 'cel_sqlite3_custom.conf';

    protected function generateConfigProtected(): void
    {
        $cal    = "eventtype, eventtime, cidname, cidnum, cidani, cidrdnis, ciddnid, context, exten, channame, appname, appdata, amaflags, accountcode, uniqueid, userfield, peer, userdeftype, eventextra, linkedid";
        $values = '\'${eventtype}\',\'${eventtime}\',\'${CALLERID(name)}\',\'${CALLERID(num)}\',\'${CALLERID(ANI)}\',\'${CALLERID(RDNIS)}\',\'${CALLERID(DNID)}\',\'${CHANNEL(context)}\',\'${CHANNEL(exten)}\',\'${CHANNEL(channame)}\',\'${CHANNEL(appname)}\',\'${CHANNEL(appdata)}\',\'${CHANNEL(amaflags)}\',\'${CHANNEL(accountcode)}\',\'${CHANNEL(uniqueid)}\',\'${CHANNEL(userfield)}\',\'${BRIDGEPEER}\',\'${userdeftype}\',\'${eventextra}\',\'${CHANNEL(linkedid)}\'';

        $conf = "[master]\n" .
            "table = cel\n" .
            "columns => $cal \n" .
            "values => $values \n";

        file_put_contents($this->astConfDir . "/cel_sqlite3_custom.conf", $conf);
    }
}