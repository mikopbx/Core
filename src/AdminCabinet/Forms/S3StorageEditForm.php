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

use MikoPBX\AdminCabinet\Forms\Elements\SemanticUIDropdown;
use MikoPBX\Common\Library\S3ProviderPresets;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\StorageSettings;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;

/**
 * S3StorageEditForm
 *
 * Form for S3 cloud storage settings.
 * Sends data to: PATCH /pbxcore/api/v3/s3-storage
 *
 * @package MikoPBX\AdminCabinet\Forms
 */
class S3StorageEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // S3 Storage settings group
        // Enable S3 storage checkbox
        $this->add(new Check('s3_enabled', ['value' => 1]));

        // Provider preset dropdown — pre-fills endpoint placeholder, region
        // default, and the path-style flag based on the chosen S3-compatible
        // provider. The actual settings (region, endpoint, use_path_style)
        // remain plain fields in the database; the preset is only a UI helper.
        // Labels and placeholder are resolved server-side here because
        // SemanticUIDropdown renders option text and the empty-state via
        // htmlspecialchars and never calls TranslationProvider itself.
        $presetOptions = [];
        foreach (S3ProviderPresets::all() as $preset) {
            $presetOptions[$preset['id']] = $this->translation->_($preset['label_key']);
        }
        $presetDropdown = new SemanticUIDropdown('s3_provider_preset', $presetOptions, [
            'class' => 'ui selection dropdown s3-preset-dropdown',
            'placeholder' => $this->translation->_('storage_s3_preset_placeholder'),
            'id' => 's3-provider-preset-dropdown',
        ]);
        $presetDropdown->setDefault(StorageSettings::PRESET_CUSTOM);
        $this->add($presetDropdown);

        // S3 Endpoint URL
        $this->add(new Text('s3_endpoint', [
            'placeholder' => 'https://s3.amazonaws.com',
        ]));

        // S3 Region
        $this->add(new Text('s3_region', [
            'placeholder' => 'us-east-1',
        ]));

        // S3 Bucket name
        $this->add(new Text('s3_bucket', [
            'placeholder' => 'mikopbx-recordings',
        ]));

        // S3 Access key
        $this->add(new Text('s3_access_key', [
            'autocomplete' => 'off',
            'readonly' => 'readonly',
            'onfocus' => "this.removeAttribute('readonly')",
        ]));

        // S3 Secret key (password field for security)
        $this->add(new Password('s3_secret_key', [
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true',
        ]));

        // Path-style URL flag — driven by the preset dropdown but exposed as
        // a hidden field so explicit toggling and form serialization work.
        $this->add(new Hidden('s3_use_path_style', ['value' => 0]));

        // Local retention period (how long to keep files locally before uploading to S3)
        // The actual value will be loaded via REST API in JavaScript
        $this->add(new Hidden(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS));
    }
}
