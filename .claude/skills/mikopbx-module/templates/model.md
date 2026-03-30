# Template: Models/{Entity}.php

Read the canonical example before generating:
`Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Models/ModuleExampleForm.php`

## Key Structure

```php
<?php

declare(strict_types=1);

namespace Modules\Module{Feature}\Models;

use MikoPBX\Common\Models\Providers\ModulesModelsBase;
use Phalcon\Mvc\Model\Relation;

/**
 * {Entity} model.
 *
 * @package Modules\Module{Feature}\Models
 *
 * @Indexes(
 *     [name='id', columns=['id'], type='']
 * )
 */
class {Entity} extends ModulesModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public ?string $id = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $enabled = '0';

    /**
     * Initialize model.
     */
    public function initialize(): void
    {
        $this->setSource('m_{Entity}');
        parent::initialize();
    }
}
```

## Column Type Annotations

| PHP Type | Annotation | Default | Notes |
|----------|-----------|---------|-------|
| String | `@Column(type="string")` | `''` | General text |
| Integer | `@Column(type="integer")` | `'0'` | Numbers stored as string |
| Boolean | `@Column(type="integer")` | `'0'` | 0/1 flag |
| Text | `@Column(type="text")` | `''` | Long text, JSON |

**Note:** All column values are stored as strings in SQLite. Use `?string` type with string defaults.

## Relations

```php
public function initialize(): void
{
    $this->setSource('m_{Entity}');
    parent::initialize();

    // Belongs to core extension
    $this->belongsTo(
        'extension',
        Extensions::class,
        'number',
        ['alias' => 'Extensions', 'foreignKey' => ['allowNulls' => true]]
    );

    // Has many child records
    $this->hasMany(
        'id',
        ChildEntity::class,
        'parent_id',
        ['alias' => 'Children', 'foreignKey' => ['allowNulls' => true, 'action' => Relation::ACTION_CASCADE]]
    );
}
```
