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
    public $id;

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

| PHP Property | Annotation | Default | Notes |
|-------------|-----------|---------|-------|
| `public $id` | `@Column(type="integer", nullable=false)` | — | Primary key, always untyped |
| `public ?string $name = ''` | `@Column(type="string")` | `''` | General text |
| `public ?string $count = '0'` | `@Column(type="integer")` | `'0'` | Numbers stored as string in SQLite |
| `public ?string $enabled = '0'` | `@Column(type="integer")` | `'0'` | 0/1 flag |
| `public ?string $data = ''` | `@Column(type="text")` | `''` | Long text, JSON |
| `public ?int $userid = null` | `@Column(type="integer")` | `null` | Integer foreign keys |

**Important:** Primary key `$id` is always untyped (`public $id;`). Other column properties use `?string` or `?int` with defaults. This follows the Phalcon ORM / MikoPBX core model convention.

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
