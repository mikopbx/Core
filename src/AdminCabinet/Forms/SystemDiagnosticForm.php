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

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;

/**
 * Class SystemDiagnosticForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class SystemDiagnosticForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Filenames dropdown - V5.0 pattern: hidden input for dynamic dropdown
        // JavaScript will build the dropdown UI with DynamicDropdownBuilder
        $this->add(new Hidden('filenames', ['value' => '']));
        $this->add(new Hidden('filename', ['value' => $options['filename']]));
        $this->add(new Text('filter', ['value' => $options['filter']]));
        $this->add(new Numeric('lines', ['value' => '5000']));
        $this->add(new Numeric('offset', ['value' => '0']));
    }
}
