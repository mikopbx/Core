# GitHub Issue: REST API v2 Implementation for Provider Management

## Title
Implement REST API v2 for comprehensive provider management

## Description

### English Description

The current provider management system lacks a modern RESTful API implementation. This enhancement introduces REST API v2 with comprehensive provider management capabilities, security features, and proper data validation.

#### Current Implementation Overview
- ✅ Basic provider CRUD operations exist using old API approach
- ✅ Simple form-based provider management works
- ❌ No RESTful API endpoints for provider management
- ❌ Missing proper input sanitization and validation in API
- ❌ No structured action-based architecture
- ❌ Lack of comprehensive API documentation
- ❌ No support for batch operations
- ❌ Missing proper error handling and response structure

#### Proposed Changes/Solution

1. **RESTful API Architecture Implementation**
   - Create `ProvidersManagementProcessor` with enum-based action handling
   - Implement standard REST endpoints: GET, POST, PUT, DELETE
   - Add action-based routing with proper URL structure
   - Support both path parameters and query parameters

2. **Comprehensive Action Classes**
   - `GetListAction` - Retrieve all providers with filtering options
   - `GetRecordAction` - Get single provider or create new structure
   - `SaveRecordAction` - Create/update provider with validation
   - `DeleteRecordAction` - Remove provider with dependency checks
   - `GetStatusByIdAction` - Individual provider status
   - `GetAllStatusesAction` - Batch status retrieval
   - `GetHistoryAction` - Provider event history
   - `GetStatsAction` - Statistics and metrics
   - `UpdateStatusAction` - Enable/disable providers

3. **Frontend API Client (ProvidersAPI)**
   - Centralized JavaScript API client
   - Built-in XSS protection and input sanitization
   - Consistent error handling
   - Support for async operations
   - CSRF protection through session cookies

4. **Data Structure and Validation**
   - `DataStructure` class for provider data templates
   - Type-specific validation rules (SIP/IAX)
   - Sanitization rules with field-level constraints
   - Support for additional hosts management
   - Proper boolean field handling

5. **Security Enhancements**
   - Input sanitization at multiple levels
   - XSS protection for display data
   - SQL injection prevention through ORM
   - Rate limiting support
   - Authentication middleware integration

6. **API Documentation**
   - PHPDoc annotations for API endpoints
   - Request/response structure documentation
   - Error code standardization
   - Usage examples

#### Benefits
- Modern RESTful API following industry standards
- Improved security through multi-layer validation
- Better maintainability with action-based architecture
- Consistent error handling and response format
- Enhanced developer experience with clear documentation
- Support for future API versioning
- Easier integration with external systems

---

### Русское описание

Текущая система управления провайдерами не имеет современной RESTful API реализации. Данное улучшение внедряет REST API v2 с полноценными возможностями управления провайдерами, функциями безопасности и правильной валидацией данных.

#### Обзор текущей реализации
- ✅ Базовые CRUD операции для провайдеров существуют с использованием старого подхода API
- ✅ Простое управление провайдерами через формы работает
- ❌ Отсутствуют RESTful API endpoints для управления провайдерами
- ❌ Отсутствует правильная санитизация и валидация входных данных в API
- ❌ Нет структурированной архитектуры на основе действий
- ❌ Отсутствует полноценная документация API
- ❌ Нет поддержки пакетных операций
- ❌ Отсутствует правильная обработка ошибок и структура ответов

#### Предлагаемые изменения/решение

1. **Реализация архитектуры RESTful API**
   - Создание `ProvidersManagementProcessor` с обработкой действий на основе enum
   - Реализация стандартных REST endpoints: GET, POST, PUT, DELETE
   - Добавление маршрутизации на основе действий с правильной структурой URL
   - Поддержка как path параметров, так и query параметров

2. **Комплексные классы действий**
   - `GetListAction` - Получение всех провайдеров с опциями фильтрации
   - `GetRecordAction` - Получение одного провайдера или создание новой структуры
   - `SaveRecordAction` - Создание/обновление провайдера с валидацией
   - `DeleteRecordAction` - Удаление провайдера с проверкой зависимостей
   - `GetStatusByIdAction` - Статус отдельного провайдера
   - `GetAllStatusesAction` - Пакетное получение статусов
   - `GetHistoryAction` - История событий провайдера
   - `GetStatsAction` - Статистика и метрики
   - `UpdateStatusAction` - Включение/отключение провайдеров

3. **Frontend API клиент (ProvidersAPI)**
   - Централизованный JavaScript API клиент
   - Встроенная защита от XSS и санитизация входных данных
   - Консистентная обработка ошибок
   - Поддержка асинхронных операций
   - CSRF защита через сессионные cookies

4. **Структура данных и валидация**
   - Класс `DataStructure` для шаблонов данных провайдера
   - Правила валидации специфичные для типа (SIP/IAX)
   - Правила санитизации с ограничениями на уровне полей
   - Поддержка управления дополнительными хостами
   - Правильная обработка булевых полей

5. **Улучшения безопасности**
   - Санитизация входных данных на нескольких уровнях
   - Защита от XSS для отображаемых данных
   - Предотвращение SQL инъекций через ORM
   - Поддержка ограничения частоты запросов
   - Интеграция middleware аутентификации

6. **Документация API**
   - PHPDoc аннотации для API endpoints
   - Документация структуры запросов/ответов
   - Стандартизация кодов ошибок
   - Примеры использования

#### Преимущества
- Современный RESTful API следующий отраслевым стандартам
- Улучшенная безопасность через многоуровневую валидацию
- Лучшая поддерживаемость с архитектурой на основе действий
- Консистентная обработка ошибок и формат ответов
- Улучшенный опыт разработчиков с четкой документацией
- Поддержка будущего версионирования API
- Более простая интеграция с внешними системами

---

### Labels
- enhancement
- api
- security

### Milestone
- v2025.1.0