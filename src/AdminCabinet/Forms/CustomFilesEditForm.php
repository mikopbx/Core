<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;

/**
 * Class CustomFilesEditForm
 *
 * Form for editing custom files. Data is loaded via REST API from JavaScript.
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class CustomFilesEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Hidden fields
        $this->add(new Hidden('id'));
        $this->add(new Hidden('content'));

        // Filepath field - will be visible input for user-created files,
        // read-only for system-managed files
        $this->add(new Text('filepath', [
            'class' => 'ui input filepath-input'
        ]));

        // Description field
        $this->addTextArea('description', '', 65);

        // Hidden input for custom mode (technical mode not shown in dropdown)
        $this->add(new Hidden('mode-custom-value'));

        // Mode selection dropdown - using addSemanticUIDropdown for consistency
        // Note: MODE_CUSTOM is excluded - it's a technical mode set automatically by the system
        // for user-created files via hidden input and should not be manually selectable
        $this->addSemanticUIDropdown(
            'mode',
            [
                CustomFiles::MODE_NONE => $this->translation->_("cf_FileActionsNone"),
                CustomFiles::MODE_APPEND => $this->translation->_("cf_FileActionsAppend"),
                CustomFiles::MODE_OVERRIDE => $this->translation->_("cf_FileActionsOverride"),
                CustomFiles::MODE_SCRIPT => $this->translation->_("cf_FileActionsScript"),
            ],
            CustomFiles::MODE_NONE,  // Default value
            [
                'clearable' => false,
                'forceSelection' => true,
                'id' => 'mode-dropdown'
            ]
        );
    }
}