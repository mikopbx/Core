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

    public const MODE_NONE = 'none';
    public const MODE_APPEND = 'append';
    public const MODE_OVERRIDE = 'override';
    public const MODE_SCRIPT = 'script';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Filepath of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $filepath = '';

    /**
     * Content of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $content = null;

    /**
     * File replacement mode
     * append - append to the end of the file
     * override - override the file
     * none - do nothing
     *
     * @Column(type="string", nullable=true, default="none") {'script'|'append'|'override'|'none'}
     */
    public ?string $mode = self::MODE_NONE;

    /**
     * Indicates if the file has been changed
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $changed = '0';

    /**
     * Description of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_CustomFiles');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
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

    /**
     * Get the decoded content from the model.
     *
     * @return string The decoded content.
     */
    public function getContent(): string
    {
        return base64_decode((string)$this->content);
    }

    /**
     * Set the encoded content for the model.
     *
     * @param string $text The content to be encoded and set.
     * @return void
     */
    public function setContent(string  $text): void
    {
        $this->content = base64_encode($text);
    }
}