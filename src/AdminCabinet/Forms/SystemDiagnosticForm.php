<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Core\System\System;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

/**
 * Class SystemDiagnosticForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class SystemDiagnosticForm extends Form{

    const   DEFAULT_FILENAME = 'asterisk/messages';
    private $filelist;
    private $logDir;

    public function initialize(): void
    {
        $this->logDir     = System::getLogDir();
        $this->filelist   = [];
        $this->findFilesInDir('asterisk');
        $this->findFilesInDir('system');
        $this->findFilesInDir('php');
        $this->findFilesInDir('nats', 'log');

        $select = new Select(
            'filenames',
            $this->filelist
            , [
                'using'    => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class'    => 'ui selection dropdown type-select',
            ]
        );

        if(key_exists(self::DEFAULT_FILENAME, $this->filelist)){
            $select->setDefault(self::DEFAULT_FILENAME);
        }

        $this->add($select);
        $this->add(new Text('filter', ['value' => '']));
        $this->add(new Text('lines',  ['value' => '500']));

    }

    private function findFilesInDir($subDir, $exten=''){
        $entries = scandir($this->logDir."/{$subDir}");
        foreach($entries as $entry) {
            if($entry == '.' || $entry == '..'){
                continue;
            }

            if(!empty($exten) && $exten !== substr($entry,(-1)*strlen($exten)) ){
                continue;
            }

            $this->filelist["{$subDir}/{$entry}"] = "{$subDir}/{$entry}";
        }
    }
}