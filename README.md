# Проектная работа "Веб-ларек"

Стек: HTML, SCSS, TS, Webpack

Структура проекта:
- src/ — исходные файлы проекта
- src/components/ — папка с JS компонентами
- src/components/base/ — папка с базовым кодом

Важные файлы:
- src/pages/index.html — HTML-файл главной страницы
- src/types/index.ts — файл с типами
- src/index.ts — точка входа приложения
- src/scss/styles.scss — корневой файл стилей
- src/utils/constants.ts — файл с константами
- src/utils/utils.ts — файл с утилитами

## Установка и запуск
Для установки и запуска проекта необходимо выполнить команды

```
npm install
npm run start
```

или

```
yarn
yarn start
```
## Сборка

```
npm run build
```

или

```
yarn build
```
## Данные и типы данных, используемые в приложении
Карточка товара:
```typescript
export interface ICard {
    _id: string;
    description: string;
    image: string;
    title: string;
    category: string;
    price: number;
    inOrder:boolean;
}
```
Данные корзины:
```typescript
export interface IBasket {
    items: string[];
	total: number;
}
```
Информация о покупателе для совершения покупки:
```typescript
export interface IOrder{
    payment: TPaymentMethod;
    email: string;
    phone: string;
    adress: string;
    total: number;
    items: string[];
}
```

Данные о методе оплаты:
```typescript
export type TPaymentMethod = 'card' | 'cash';
```

Данные формы заказа и контактов:
```typescript
export type TOrder = Omit<IOrder, 'items' | 'total'>;
```
Данные формы заказа:
```typescript
export type TOrderForm = Pick<IOrder, 'payment' | 'adress'>;
```

Данные формы контактов: 
```typescript
export type TContactsForm = Pick<IOrder, 'email' | 'phone'>;
```

Данные отправки формы успешной покупки:
```typescript
export type TOrderResult  = Pick<IOrder, 'total'>;

export interface IOrderResult  {
	id: string;
	total: number;
}
```

## Архитектура приложения

Код приложения разделен на слои согласно парадигме MVP: 
- слой представления, отвечает за отображение данных на странице, 
- слой данных, отвечает за хранение и изменение данных
- презентер, отвечает за связь представления и данных.

### Базовый код

#### Класс `Api`
Содержит в себе базовую логику отправки запросов. В конструктор передается базовый адрес сервера и опциональный объект с заголовками запросов.
Методы: 
- `get` - выполняет GET запрос на переданный в параметрах ендпоинт и возвращает промис с объектом, которым ответил сервер
- `post` - принимает объект с данными, которые будут переданы в JSON в теле запроса, и отправляет эти данные на ендпоинт переданный как параметр при вызове метода. По умолчанию выполняется `POST` запрос, но метод запроса может быть переопределен заданием третьего параметра при вызове.

#### Класс `EventEmitter`
Брокер событий позволяет отправлять события и подписываться на события, происходящие в системе. Класс используется в презентере для обработки событий и в слоях приложения для генерации событий.  
Основные методы, реализуемые классом описаны интерфейсом `IEvents`:
- `on` - подписка на событие
- `emit` - инициализация события
- `trigger` - возвращает функцию, при вызове которой инициализируется требуемое в параметрах событие   

#### Класс `Component<T>`
Абстрактный базовый класс, предназначенным для создания компонентов пользовательского интерфейса. Класс обеспечивает инструментарий для управления DOM элементами и поведением компонента. Наследуется всеми классами представления(View)

`constructor(container: HTMLElement)` - принимает элемент контейнера, в который будет помещен компонент\

Методы:
- `toggleClass` - переключает класс
- `setText` - устанавливает текстовое содержимое
- `setDisabled` - изменяет статус блокировки
- `setHidden` - скрывает элемент
- `setVisible` - показывает элемент
- `setImage` - устанавливает изображения с алтернативным текстом
- `render` - возвращает корневой DOM-элемент

#### Класс `Model<T>`
Базовый класс, расширяющий класс Component, предназначен для работы с данными, используется для представления и для работы с данными.
`constructor(data:Partial<T>, events: IEvents)` - конструктор, на вход принимает исходные данные для модели и объект событий для сообщения об изменениях модели.

Методы: 
- полностью наследуются от класса Component<T>
- `emitChanges` - сообщает всем об изменении модели

### Общие классы

#### Класс `Form`

Класс `Form` - класс для работы с формами.\
Наследуется от класса `Component` и расширяет его функциональность.\
`constructor(container: HTMLFormElement, events: IEvents)` - DOM элемент для кнопки отправки формы и отображения ошибок\

Поля:
- _submit - кнопка сабмита формы,
- _errors - контейнер вывода ошибок валидации.

Методы:
- set valid - контроль активности кнопки отправки формы в зависимости от правильности заполнения формы,
- set errors - отображение списка ошибок валидации,
- render - отображение состояние формы
- onInputChange - обработчик изменений в полях ввода и обновление состояния формы. 

#### Класс `Modal`

Класс `Modal` - класс для работы с модальными окнами.\
Наследуется от класса `Component` и расширяет его функциональность.\
`constructor(container: HTMLElement, events: IEvents)` - DOM элемент для кнопки закрыти и контента модального окна \

Поля:
- _closeButton - кнопка закрытия модального окна,
- _content - содержимое модального окна.

Методы:
- set content - устанавливает содержимое модального окна,
- open - открытие модального окна,
- close - закрытие модального окна,
- render - отображение модального окна.

### Классы для работы с отображением

#### Класс `Card`

Класс `Card` - класс для работы с карточкой товара на главной странице, в модальном окне и в корзине.\
`constructor(container: HTMLElement, actions?: ICardActions)` - DOM элемент карточки и её действия \

Поля:
- _description - описание товара,
- _image - изображение товара,
- _title - название товара,
- _category - категория товара,
- _price - цена товара,
- _button - кнопка на карточке.

Методы:
- set/get id - установка и получение идентификатора карточки,
- set description - установка текста описания товара,
- set image - установка значения свойства image объекта,
- set/get title - установка и получение аголовка карточки,
- set/get category - установка и получение категории товара,
- set/get price - установка и получение цены товара,
- set button - установка текста на кнопке.

#### Класс `Basket`

Класс `Basket` - класс для работы с карточкой товара на главной странице, в модальном окне и в корзине.\
`constructor(protected events: IEvents)` - принимает брокер событий \

Поля:
- _list - список товаров в корзине,
- _total - общая стоимость заказа в корзине,
- _button - кнопка оформления заказа в корзине.

Методы:
- set listItems - установка значения содержимого в корзине,
- set totalCost - установка общей стоимости покупки,
- statusButton - состояние активности кнопки.

#### Класс `Page`

Класс `Page` - класс оотбражения и управления всеми элементами на главной странице.\
`constructor(container: HTMLElement, events: IEvents)` - DOM элемент главной страницы и брокер событий \

Поля:
- _counter - счётчик товаров на значке "корзина",
- _catalog - каталог товаров,
- _wrapper - контейнер для отображения товаров из каталога,
- _basket - корзина покупателя.


Методы:
- set counter - установка счётчика,
- set catalog - установка содержимого каталога товаров,
- set locked - установка обёртки.

#### Класс `Order`

Класс `Order` - реализует форму выбора способа оплаты и ввода адреса доставки товара.\
`constructor(container: HTMLElement, events: IEvents)` - DOM элемент формы оформления покупки и брокер событий \

Поля:
- _paymentCard - кнопка оплаты картой,
- _paymentCash - кнопка оплаты при получении,
- _adress - поле ввода адресса доставки товара.

Методы:
- set payment - переключение кнопок выбора способа оплаты,
- set adress - установка адреса доставки.

#### Класс `Contact`

Класс `Contact` - класс для работы с формой контактов.\
`constructor(container: HTMLElement, events: IEvents)` - DOM элемент формы контакты и брокер событий \

Поля:
- _email - поле ввода почты,
- _phone - поле ввода номера телефона.

Методы:
- set email - установка почты,
- set phone - установка номера телефона.

#### Класс `Success`

Класс `Success` - класс для работы с формой контактов.\
`constructor(container: HTMLElement, events: IEvents)` - DOM элемент формы успешной покупки и брокер событий \

Поля:
- _total - общая сумма покупки,
- _close - кнопка закрытия успешной покупки.

Методы:
- set total - меняет содержимое элемента с суммой покупки.
