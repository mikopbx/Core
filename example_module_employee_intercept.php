<?php
/**
 * EXAMPLE: Универсальный перехват сохранения Employee/Extension
 * Поддерживает:
 * - Старый API v2: /api/extensions/saveRecord
 * - Новый REST API v3: /pbxcore/api/v3/employees
 *
 * Файл: YourModuleConf.php
 */

namespace Modules\YourModule;

use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use MikoPBX\Modules\Config\SystemConfigInterface;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Mvc\Micro;

class YourModuleConf extends ConfigClass implements RestAPIConfigInterface, SystemConfigInterface
{
    /**
     * ========================================================================
     * НОВЫЙ REST API v3 (для MikoPBX 2024.1+)
     * ========================================================================
     */

    /**
     * Перехват REST API v3 запросов ПОСЛЕ выполнения
     * Срабатывает после успешного сохранения employee
     *
     * @param Micro $app
     * @return void
     */
    public function onAfterExecuteRestAPIRoute(Micro $app): void
    {
        // Получаем информацию о маршруте
        $router = $app->getRouter();
        $matchedRoute = $router->getMatchedRoute();

        if ($matchedRoute === null) {
            return;
        }

        $pattern = $matchedRoute->getPattern();
        $httpMethod = $app->request->getMethod();

        // Проверяем, что это операция с employees (полное сохранение)
        // POST /pbxcore/api/v3/employees - создание
        // PUT /pbxcore/api/v3/employees/{id} - обновление
        $isEmployeeRoute = preg_match('#^/pbxcore/api/v3/employees(/\d+)?$#', $pattern);
        $isFullSave = in_array($httpMethod, ['POST', 'PUT'], true);

        if ($isEmployeeRoute && $isFullSave) {
            // Получаем данные запроса (то, что отправил клиент)
            $requestData = $app->request->getJsonRawBody(true) ?? $app->request->getPost();

            // Получаем ответ (результат выполнения SaveRecordAction)
            $response = $app->getReturnedValue();

            // Проверяем успешность операции
            if (isset($response['success']) && $response['success'] === true) {

                // Определяем тип операции
                $isCreate = ($httpMethod === 'POST' && empty($requestData['id']));

                // Извлекаем данные employee
                $employeeData = [
                    'id' => $response['data']['id'] ?? null,
                    'number' => $requestData['number'] ?? null,
                    'username' => $requestData['user_username'] ?? null,
                    'email' => $requestData['user_email'] ?? null,
                    'mobile' => $requestData['mobile_number'] ?? null,
                    // Добавьте свои кастомные поля
                    'custom_field' => $requestData['custom_field'] ?? null,
                ];

                // Сохраняем через общий метод
                $this->saveEmployeeCustomData($employeeData, $isCreate, 'rest_api_v3');

                $this->logMessage("REST API v3: Перехвачено сохранение employee #{$employeeData['id']}, ext: {$employeeData['number']}");
            }
        }
    }

    /**
     * Перехват REST API v3 запросов ДО выполнения
     * Используйте для валидации или модификации данных
     *
     * @param Micro $app
     * @return void
     */
    public function onBeforeExecuteRestAPIRoute(Micro $app): void
    {
        // Можно использовать для предварительной валидации
        // или модификации данных перед сохранением
    }

    /**
     * ========================================================================
     * СТАРЫЙ API v2 (для MikoPBX до 2024.1)
     * ========================================================================
     */

    /**
     * Перехват событий изменения данных моделей
     * Срабатывает после сохранения любой модели
     *
     * @param mixed $data
     * @return void
     */
    public function modelsEventChangeData($data): void
    {
        // Проверяем, что это модель Extensions
        if (!is_array($data) || !isset($data['model'])) {
            return;
        }

        $modelClass = $data['model'];
        $recordId = $data['recordId'] ?? null;
        $action = $data['action'] ?? null; // 'insert', 'update', 'delete'

        // Отслеживаем изменения Extensions (старый API сохранял через эту модель)
        if ($modelClass === 'Extensions' && in_array($action, ['insert', 'update'], true)) {

            // Получаем полные данные extension
            $extension = \MikoPBX\Common\Models\Extensions::findFirst([
                'conditions' => 'id = :id:',
                'bind' => ['id' => $recordId]
            ]);

            if ($extension === null) {
                return;
            }

            // Для SIP extensions получаем данные пользователя
            if ($extension->type === 'SIP') {
                $employeeData = [
                    'id' => $extension->userid ?? null,
                    'number' => $extension->number ?? null,
                    'username' => $extension->callerid ?? null,
                    'email' => $extension->Users?->email ?? null,
                    'mobile' => null, // В старом API нужно искать отдельно
                    'custom_field' => null, // Ваше кастомное поле
                ];

                // Пытаемся получить кастомное поле из сессии или другого источника
                $employeeData['custom_field'] = $this->getCustomFieldFromSession();

                $isCreate = ($action === 'insert');

                // Сохраняем через общий метод
                $this->saveEmployeeCustomData($employeeData, $isCreate, 'old_api_v2');

                $this->logMessage("Old API v2: Перехвачено сохранение extension #{$recordId}, ext: {$employeeData['number']}");
            }
        }
    }

    /**
     * ========================================================================
     * ОБЩИЕ МЕТОДЫ ОБРАБОТКИ ДАННЫХ
     * ========================================================================
     */

    /**
     * Универсальный метод сохранения кастомных данных employee
     * Работает для обоих API
     *
     * @param array $employeeData Данные employee
     * @param bool $isCreate Это создание или обновление
     * @param string $source Источник данных (rest_api_v3 или old_api_v2)
     * @return bool
     */
    private function saveEmployeeCustomData(array $employeeData, bool $isCreate, string $source): bool
    {
        try {
            // Валидация обязательных полей
            if (empty($employeeData['id']) || empty($employeeData['number'])) {
                $this->logMessage("Ошибка: отсутствуют обязательные поля (id или number)");
                return false;
            }

            // Ищем существующую запись в таблице модуля
            $record = YourModuleModel::findFirst([
                'conditions' => 'employee_id = :id:',
                'bind' => ['id' => $employeeData['id']]
            ]);

            // Создаем новую запись, если не найдена
            if ($record === null) {
                $record = new YourModuleModel();
                $record->employee_id = $employeeData['id'];
                $record->created_at = date('Y-m-d H:i:s');
            }

            // Обновляем поля
            $record->extension_number = $employeeData['number'];
            $record->username = $employeeData['username'] ?? '';
            $record->email = $employeeData['email'] ?? '';
            $record->mobile = $employeeData['mobile'] ?? '';
            $record->custom_field = $employeeData['custom_field'] ?? '';
            $record->data_source = $source;
            $record->updated_at = date('Y-m-d H:i:s');

            // Сохраняем в базу данных
            if ($record->save()) {
                $this->logMessage("Успешно сохранены данные employee #{$employeeData['id']} из источника: {$source}");

                // Дополнительная обработка после сохранения
                $this->afterEmployeeDataSaved($employeeData, $isCreate, $source);

                return true;
            } else {
                $errors = implode(', ', $record->getMessages());
                $this->logMessage("Ошибка сохранения: {$errors}");
                return false;
            }

        } catch (\Exception $e) {
            $this->logMessage("Exception при сохранении: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Дополнительная обработка после успешного сохранения
     *
     * @param array $employeeData
     * @param bool $isCreate
     * @param string $source
     * @return void
     */
    private function afterEmployeeDataSaved(array $employeeData, bool $isCreate, string $source): void
    {
        // Здесь можно добавить дополнительную логику:
        // - Отправить уведомление
        // - Обновить кэш
        // - Вызвать внешний API
        // - Записать в лог-файл модуля
        // - Запустить фоновую задачу

        if ($isCreate) {
            $this->logMessage("Создан новый employee: {$employeeData['username']} ({$employeeData['number']})");
        } else {
            $this->logMessage("Обновлен employee: {$employeeData['username']} ({$employeeData['number']})");
        }
    }

    /**
     * ========================================================================
     * ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
     * ========================================================================
     */

    /**
     * Получение кастомного поля из сессии (для старого API)
     * В старом API кастомные поля могут передаваться через форму
     *
     * @return string|null
     */
    private function getCustomFieldFromSession(): ?string
    {
        try {
            $di = \Phalcon\Di\Di::getDefault();
            $session = $di->get('session');

            // Пытаемся получить из сессии
            $customField = $session->get('temp_custom_field');

            // Очищаем после получения
            if ($customField !== null) {
                $session->remove('temp_custom_field');
            }

            return $customField;

        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Логирование сообщений модуля
     *
     * @param string $message
     * @param string $level
     * @return void
     */
    private function logMessage(string $message, string $level = 'info'): void
    {
        $moduleName = 'YourModule';
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$moduleName}] [{$level}] {$message}";

        // Логируем в syslog
        \MikoPBX\Core\System\Util::sysLogMsg($moduleName, $logMessage);

        // Опционально: логируем в файл модуля
        $logFile = '/var/log/mikopbx/yourmodule.log';
        @file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
    }

    /**
     * Определение версии API на основе окружения
     *
     * @return string 'v2' или 'v3'
     */
    private function detectApiVersion(): string
    {
        // Проверяем версию MikoPBX
        $pbxVersion = \MikoPBX\Core\System\Util::getVersionPBX();

        // Версии 2024.1.0 и выше используют REST API v3
        if (version_compare($pbxVersion, '2024.1.0', '>=')) {
            return 'v3';
        }

        return 'v2';
    }

    /**
     * ========================================================================
     * ОБЯЗАТЕЛЬНЫЕ МЕТОДЫ ИНТЕРФЕЙСОВ (пустые заглушки)
     * ========================================================================
     */

    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [];
    }

    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        return new PBXApiResult();
    }

    public function modelsEventNeedReload(array $plannedReloadActions): void
    {
        // Не используется в данном примере
    }
}
