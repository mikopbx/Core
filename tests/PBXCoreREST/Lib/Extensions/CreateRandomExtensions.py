import requests
import random
from faker import Faker

def generate_random_mobile():
    return ''.join(random.choice("1234567890") for _ in range(11))

def main():
    faker_ru = Faker('ru_RU')
    faker_en = Faker('en_US')
    faker_zh = Faker('zh_CN')
    faker_ja = Faker('ja_JP')

    for number in range(1, 50):
        # Получение шаблона данных для нового сотрудника
        get_response = requests.get("http://127.0.0.1:8081/pbxcore/api/extensions/getRecord?id=")

        if get_response.json().get('result', False) == False:
            print(f"getRecord error: {get_response.json().get('messages', 'Unknown error')}")
            continue

        data = get_response.json().get('data', {})

        # Генерация произвольных данных
        locale = random.choice(['ru_RU', 'en_US', 'zh_CN', 'ja_JP'])
        faker = locals()[f"faker_{locale.split('_')[0].lower()}"]
        data['user_username'] = faker.name()
        data['user_email'] = faker.email()
        data['mobile_number'] = generate_random_mobile()
        data['fwd_forwarding'] = data['mobile_number']
        data['fwd_forwardingonbusy'] = data['mobile_number']

        # Создание нового сотрудника
        post_response = requests.post("http://127.0.0.1:8081/pbxcore/api/extensions/saveRecord", data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})

        if post_response.json().get('result', False):
            print(f"Created user {number} -> Username: {data['user_username']}, Email: {data['user_email']}, Mobile: {data['mobile_number']}")
        else:
            print(f"saveRecord error for user {number}: {post_response.json().get('messages', 'Unknown error')}")

        if post_response.status_code != 200 or not isinstance(post_response.json(), dict):
            print(f"Unknown error: {post_response.text}")

if __name__ == "__main__":
    main()

