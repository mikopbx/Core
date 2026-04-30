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

namespace MikoPBX\Common\Library;

use MikoPBX\Common\Models\StorageSettings;

/**
 * Registry of known S3-compatible providers.
 *
 * The registry is the single source of truth for UI defaults (endpoint
 * placeholder, region, path-style flag) and documentation links. The
 * engine code (S3Client) does NOT consult this registry — it works only
 * with the explicit settings stored in m_StorageSettings. The preset is
 * a UI affordance: users pick "Garage" and the form pre-fills the right
 * defaults; the database stores those defaults as plain values.
 *
 * To add a new provider:
 *   1. Add a PRESET_* constant in StorageSettings.
 *   2. Add an entry to PRESETS below.
 *   3. Add a doc page at docs.mikopbx.com/manual/maintenance/storage/{id}.md.
 *   4. Add translation keys storage_s3_preset_{id} (label + tooltip).
 */
final class S3ProviderPresets
{
    /**
     * Preset metadata. Keys match StorageSettings::PRESET_* values and
     * docs filenames at /manual/maintenance/storage/{id}.md.
     *
     * Field meanings:
     *   - label_key:           translation key for the dropdown option label.
     *   - endpoint_placeholder: placeholder shown in the endpoint input.
     *   - region_default:      default value pre-filled in region input.
     *   - use_path_style:      whether path-style URLs are required.
     *   - hint_key:            translation key for the inline help hint.
     */
    private const array PRESETS = [
        StorageSettings::PRESET_AWS => [
            'label_key' => 'storage_s3_preset_aws',
            'endpoint_placeholder' => 'https://s3.us-east-1.amazonaws.com',
            'region_default' => 'us-east-1',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_aws_hint',
        ],
        StorageSettings::PRESET_MINIO => [
            'label_key' => 'storage_s3_preset_minio',
            'endpoint_placeholder' => 'https://minio.example.com:9000',
            'region_default' => 'us-east-1',
            'use_path_style' => true,
            'hint_key' => 'storage_s3_preset_minio_hint',
        ],
        StorageSettings::PRESET_GARAGE => [
            'label_key' => 'storage_s3_preset_garage',
            'endpoint_placeholder' => 'https://garage.example.com:3900',
            'region_default' => 'garage',
            'use_path_style' => true,
            'hint_key' => 'storage_s3_preset_garage_hint',
        ],
        StorageSettings::PRESET_CEPH => [
            'label_key' => 'storage_s3_preset_ceph',
            'endpoint_placeholder' => 'https://rgw.example.com',
            'region_default' => 'default',
            'use_path_style' => true,
            'hint_key' => 'storage_s3_preset_ceph_hint',
        ],
        StorageSettings::PRESET_WASABI => [
            'label_key' => 'storage_s3_preset_wasabi',
            'endpoint_placeholder' => 'https://s3.wasabisys.com',
            'region_default' => 'us-east-1',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_wasabi_hint',
        ],
        StorageSettings::PRESET_DIGITALOCEAN => [
            'label_key' => 'storage_s3_preset_digitalocean',
            'endpoint_placeholder' => 'https://nyc3.digitaloceanspaces.com',
            'region_default' => 'nyc3',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_digitalocean_hint',
        ],
        StorageSettings::PRESET_YANDEX => [
            'label_key' => 'storage_s3_preset_yandex',
            'endpoint_placeholder' => 'https://storage.yandexcloud.net',
            'region_default' => 'ru-central1',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_yandex_hint',
        ],
        StorageSettings::PRESET_VKCLOUD => [
            'label_key' => 'storage_s3_preset_vkcloud',
            'endpoint_placeholder' => 'https://hb.ru-msk.vkcs.cloud',
            'region_default' => 'ru-msk',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_vkcloud_hint',
        ],
        StorageSettings::PRESET_SELECTEL => [
            'label_key' => 'storage_s3_preset_selectel',
            'endpoint_placeholder' => 'https://s3.ru-1.storage.selcloud.ru',
            'region_default' => 'ru-1',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_selectel_hint',
        ],
        StorageSettings::PRESET_CUSTOM => [
            'label_key' => 'storage_s3_preset_custom',
            'endpoint_placeholder' => '',
            'region_default' => '',
            'use_path_style' => false,
            'hint_key' => 'storage_s3_preset_custom_hint',
        ],
    ];

    /**
     * All preset ids in display order (AWS first, custom last).
     *
     * @return string[]
     */
    public static function ids(): array
    {
        return array_keys(self::PRESETS);
    }

    /**
     * Whether a preset id is known.
     */
    public static function isKnown(string $id): bool
    {
        return isset(self::PRESETS[$id]);
    }

    /**
     * Metadata for a single preset. Falls back to PRESET_CUSTOM when the
     * id is not registered (e.g. preset removed in a downgrade scenario).
     *
     * @return array{label_key:string,endpoint_placeholder:string,region_default:string,use_path_style:bool,hint_key:string}
     */
    public static function get(string $id): array
    {
        return self::PRESETS[$id] ?? self::PRESETS[StorageSettings::PRESET_CUSTOM];
    }

    /**
     * All presets as an ordered list with id field, suitable for REST API
     * responses and dropdown rendering.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function all(): array
    {
        $result = [];
        foreach (self::PRESETS as $id => $meta) {
            $result[] = ['id' => $id] + $meta;
        }
        return $result;
    }
}
