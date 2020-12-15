<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Common\Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class CustomFiles
 *
 * @package MikoPBX\Common\Models
 */
class CustomFiles extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $filepath = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $content = null;

    /**
     * Режим подмены файла
     * append - добавить в конец файла
     * override - переопределить
     * none - ничего не делать
     *
     * @Column(type="string", nullable=true, default="none") {'append'|'override'|'none'}
     */
    public ?string $mode = 'none';

    /**
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $changed = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    public function initialize(): void
    {
        $this->setSource('m_CustomFiles');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'filepath',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisFilepathMustBeUniqueForCustomFilesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    public function getContent(): string
    {
        return base64_decode($this->content);
    }

    public function setContent($text): void
    {
        $this->content = base64_encode($text);
    }
}