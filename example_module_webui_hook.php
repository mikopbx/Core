<?php
/**
 * EXAMPLE: Добавление кастомного поля в форму редактирования employee
 *
 * Этот код добавляется в YourModuleConf.php для интеграции с веб-интерфейсом
 */

namespace Modules\YourModule;

use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Forms\Form;

/**
 * Добавляем WebUIConfigInterface к классу модуля
 */
class YourModuleConf extends ConfigClass implements
    RestAPIConfigInterface,
    SystemConfigInterface,
    WebUIConfigInterface  // <-- Добавляем этот интерфейс
{
    /**
     * ========================================================================
     * ВЕБ-ИНТЕРФЕЙС: Добавление полей в формы
     * ========================================================================
     */

    /**
     * Добавление HTML блоков в существующие страницы через Volt
     *
     * Используется для добавления кастомных полей в формы
     *
     * @param string $controller Имя контроллера
     * @param string $blockName Имя блока для вставки
     * @return string Volt-код для вставки
     */
    public function onVoltBlockCompile(string $controller, string $blockName): string
    {
        $result = '';

        // Добавляем поле в форму редактирования extensions (старый интерфейс)
        if ($controller === 'Extensions' && $blockName === 'tabBellowForm') {
            $result = $this->getExtensionFormBlock();
        }

        // Добавляем поле в форму редактирования employees (новый интерфейс, если есть)
        if ($controller === 'Employees' && $blockName === 'additionalFields') {
            $result = $this->getEmployeeFormBlock();
        }

        return $result;
    }

    /**
     * Генерация HTML блока для формы extension (старый интерфейс)
     *
     * @return string
     */
    private function getExtensionFormBlock(): string
    {
        // Создаем Volt-шаблон, который будет вставлен в форму
        return <<<'VOLT'
<div class="field">
    <label>{{ t._('ym_CustomFieldLabel') }}</label>
    <div class="ui input">
        <input type="text"
               name="custom_field"
               id="custom-field-input"
               placeholder="{{ t._('ym_CustomFieldPlaceholder') }}"
               value="{{ extensionData.custom_field ?? '' }}">
    </div>
    <div class="ui pointing label hidden" id="custom-field-error">
        {{ t._('ym_CustomFieldError') }}
    </div>
</div>

<script>
// Перехват отправки формы для сохранения кастомного поля
$(document).ready(function() {
    // Находим форму
    const $form = $('#extensions-form');

    if ($form.length === 0) {
        return;
    }

    // Сохраняем оригинальный обработчик
    const originalSubmit = $form.data('original-submit');

    // Добавляем свой обработчик
    $form.on('submit.customField', function(e) {
        // Получаем значение кастомного поля
        const customFieldValue = $('#custom-field-input').val();

        // Сохраняем в сессию для перехвата в modelsEventChangeData
        if (customFieldValue) {
            $.ajax({
                url: '/your-module/save-temp-field',
                method: 'POST',
                async: false,
                data: { custom_field: customFieldValue }
            });
        }
    });
});
</script>
VOLT;
    }

    /**
     * Генерация HTML блока для формы employee (новый интерфейс)
     *
     * @return string
     */
    private function getEmployeeFormBlock(): string
    {
        return <<<'VOLT'
<div class="field">
    <label>{{ t._('ym_CustomFieldLabel') }}</label>
    <div class="ui input">
        <input type="text"
               name="custom_field"
               id="custom-field-input"
               placeholder="{{ t._('ym_CustomFieldPlaceholder') }}"
               value="{{ employeeData.custom_field ?? '' }}">
    </div>
</div>

<script>
// Для нового REST API v3 поле автоматически попадет в запрос
// Дополнительная валидация, если нужна
$(document).ready(function() {
    $('#custom-field-input').on('blur', function() {
        const value = $(this).val();

        // Валидация (пример)
        if (value && value.length < 3) {
            $(this).closest('.field').addClass('error');
            $('#custom-field-error').removeClass('hidden');
        } else {
            $(this).closest('.field').removeClass('error');
            $('#custom-field-error').addClass('hidden');
        }
    });
});
</script>
VOLT;
    }

    /**
     * ========================================================================
     * AJAX ENDPOINT: Временное сохранение поля (для старого API)
     * ========================================================================
     */

    /**
     * Создаем дополнительные маршруты для модуля
     *
     * @return array
     */
    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [
            // Временное сохранение кастомного поля в сессию (для старого API)
            [
                '\Modules\YourModule\App\Controllers\ApiController',
                'saveTempFieldAction',
                '/your-module/save-temp-field',
                'post',
                '/',
                false // Требует авторизации
            ],

            // Получение данных модуля для employee
            [
                '\Modules\YourModule\App\Controllers\ApiController',
                'getEmployeeDataAction',
                '/your-module/employee-data/{id}',
                'get',
                '/',
                false
            ]
        ];
    }

    /**
     * ========================================================================
     * ИНИЦИАЛИЗАЦИЯ: Загрузка данных в форму
     * ========================================================================
     */

    /**
     * Модификация данных перед инициализацией формы
     * Добавляем данные из модуля в данные формы
     *
     * @param string $formClassName
     * @param Form $form
     * @return void
     */
    public function onBeforeFormInitialize(string $formClassName, Form $form): void
    {
        // Для формы Extensions (старый интерфейс)
        if ($formClassName === 'ExtensionEditForm') {
            $this->injectExtensionData($form);
        }

        // Для формы Employees (новый интерфейс)
        if ($formClassName === 'EmployeeEditForm') {
            $this->injectEmployeeData($form);
        }
    }

    /**
     * Добавляем данные модуля в форму extension
     *
     * @param Form $form
     * @return void
     */
    private function injectExtensionData(Form $form): void
    {
        // Получаем ID пользователя из формы
        $userId = $form->getValue('userid');

        if (!$userId) {
            return;
        }

        // Ищем данные в таблице модуля
        $moduleData = YourModuleModel::findByEmployeeId($userId);

        if ($moduleData) {
            // Добавляем данные в форму (они будут доступны в Volt шаблоне)
            $form->getEntity()->custom_field = $moduleData->custom_field;
        }
    }

    /**
     * Добавляем данные модуля в форму employee
     *
     * @param Form $form
     * @return void
     */
    private function injectEmployeeData(Form $form): void
    {
        // Получаем ID employee из формы
        $employeeId = $form->getValue('id');

        if (!$employeeId) {
            return;
        }

        // Ищем данные в таблице модуля
        $moduleData = YourModuleModel::findByEmployeeId($employeeId);

        if ($moduleData) {
            // Добавляем данные в entity формы
            $entity = $form->getEntity();
            $entity->custom_field = $moduleData->custom_field;
        }
    }

    /**
     * ========================================================================
     * ОБЯЗАТЕЛЬНЫЕ МЕТОДЫ ИНТЕРФЕЙСОВ (заглушки)
     * ========================================================================
     */

    public function onBeforeHeaderMenuShow(array &$menuItems): void
    {
        // Не используется
    }

    public function getTabMenuItems(string $controllerName, string $actionName): array
    {
        // Не используется
        return [];
    }
}
