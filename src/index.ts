
import { AppState } from './components/AppData';
import { EventEmitter } from './components/base/events';
import { Basket, BasketItem } from './components/Basket';
import { Card, CardPreview } from './components/Card';
import { IFormState } from './components/common/Form';
import { Modal } from './components/common/Modal';
import { ContactForm } from './components/Contact';
import { OrderForm } from './components/Oder';
import { Page } from './components/Page';
import { Success } from './components/Success';
import { LarekAPI } from './components/WebLarekAPI';
import './scss/styles.scss';
import { ICard, IOrder, IPaymentChange } from './types';
import { API_URL, CDN_URL } from './utils/constants';
import { cloneTemplate, ensureElement } from './utils/utils';

// Создание объектов для управления событиями и API
const events = new EventEmitter();
const api = new LarekAPI(CDN_URL, API_URL);

// Чтобы мониторить все события, для отладки
events.onAll(({ eventName, data }) => {
    console.log(eventName, data);
})

// Все шаблоны
const successTemplate = ensureElement<HTMLTemplateElement>('#success');
const cardCatalogTemplate = ensureElement<HTMLTemplateElement>('#card-catalog');
const cardPreviewTemplate = ensureElement<HTMLTemplateElement>('#card-preview');
const cardBasketTemplate = ensureElement<HTMLTemplateElement>('#card-basket');
const basketTemplate = ensureElement<HTMLTemplateElement>('#basket');
const orderTemplate = ensureElement<HTMLTemplateElement>('#order');
const contactsTemplate = ensureElement<HTMLTemplateElement>('#contacts');

// Модель данных приложения
const appState = new AppState({},events);

// Глобальные контейнеры
const page = new Page(ensureElement<HTMLElement>('.page'), events);
const modal = new Modal(ensureElement<HTMLElement>('#modal-container'), events);
const success = new Success(cloneTemplate(successTemplate),events);

// Переиспользуемые части интерфейса
const order = new OrderForm(cloneTemplate(orderTemplate), events);
const contact = new ContactForm(cloneTemplate(contactsTemplate), events);
const basket = new Basket(cloneTemplate(basketTemplate), {
	onClick: () => {
		events.emit('order:open');
	},
});

// Дальше идет бизнес-логика
// Поймали событие, сделали что нужно
  
// Получаем товары с сервера
api
    .getList()
    .then((data) => {appState.setCatalog = data;})
    .catch(err => {
        console.error(err);
    });

// Изменение элементов каталога
events.on('items:change', () => {
    page.catalog = appState.getCatalog.map((item) => {
		const card = new Card(cloneTemplate(cardCatalogTemplate), {
			onClick: () => {
				events.emit('card:select', item);
			},
		});

		return card.render({
			id: item.id,
            image: item.image,
            title: item.title,
			category: item.category,
			price: item.price,
		});
	});
});

// Открытие карточки товара
events.on('card:select', (item: ICard) => {
    const cardPreview = new CardPreview(cloneTemplate(cardPreviewTemplate), {
			onClick: () => {
				events.emit('card:add', item);
			},
		}
	);
	modal.render({ content: cardPreview.render(item) });
	if (item.price === null || item.price === undefined) {
		cardPreview.buttonDisable(true);
		cardPreview.button = 'Недоступко к покупке'
	} else if (
		appState.getBasket().some((basketItem) => basketItem.id === item.id)
	) {
		cardPreview.buttonDisable(true);
		cardPreview.button = 'Удалить из корзины'
	}
});

// Добавление карточки товара в корзину
events.on('card:add', (item: ICard) => {
	appState.addToBasket(item);
	page.counter = appState.getBasket().length;
	modal.close();
});

// Удаление карточки товара из корзины
events.on('card:remove', (item: ICard) => {
	appState.removeFromBasket(item);
	page.counter = appState.getBasket().length;
	events.emit('basket:changed', item);
});

// Открыть корзину с товарами
events.on('basket:changed', () => {
	appState.setOrderField('items', []);
	appState.setOrderField('total', 0);

	const arrayFromBasket = appState.getBasket();
	const cardBasketElements = arrayFromBasket.map((item, index) => {
		const cardBasketElement = cloneTemplate(cardBasketTemplate);
		const cardBasket = new BasketItem(cardBasketElement, {
			onClick: () => events.emit('card:remove', item),
		});
		cardBasket.index = index + 1;
		cardBasket.title = item.title;
		cardBasket.price = item.price;
		return cardBasketElement;
	});

	const totalPrice = arrayFromBasket.reduce(
		(total, item) => total + (item.price || 0), 0
	);
	appState.setOrderField('total', totalPrice);
	basket.items = cardBasketElements;
	basket.total = totalPrice;
	modal.render({ content: basket.render() });

    if (appState.getBasket().length === 0) {
		basket.buttonDisable(true);
	}
});

// Открытие корзины
events.on('basket:open', () => {
	modal.render({ content: basket.render({}) });
  });

// Оформление покупки: выбор способа оплаты и ввод адреса доставки
events.on('order:open', () => {
	if (appState.getBasket().length) {
		const initialState: Partial<IOrder> & IFormState = {
            address: '',
			valid: false,
			errors: [],
		};

		modal.render({ content: 
            order.render(initialState) 
        });
	}
});

// Выбор способа оплаты: card
events.on('paymentCard:changed', (payment: IPaymentChange) => {
	appState.setOrderField('payment', payment.method);
});

// Выбор способа оплаты: cash
events.on('paymentCash:changed', (payment: IPaymentChange) => {
	appState.setOrderField('payment', payment.method);
});

// Изменение данных оформления покупки
events.on(/^order\..*:change$/,(data: { field: keyof IOrder; value: string }) => {
    		appState.setOrderField(data.field, data.value);
    	}
    );

// Состояние валидации форм
events.on('formErrors:change', (error: Partial<IOrder>) => {
	const { payment, address, email, phone } = error;

	order.valid = !payment && !address;
    order.errors = Object.values({ payment, address, email, phone}).filter(i => !!i).join('; ');

    contact.valid = !email && !phone;
    contact.errors = Object.values({ payment, address, email, phone}).filter(i => !!i).join('; ');
});

// Изменения данных контакта
events.on(/^contacts\..*:change$/,(data: { field: keyof IOrder; value: string }) => {
		appState.setContactField(data.field, data.value);
	}
);

// Оформление покупки: ввод эл.почты и №телефона
events.on('order:submit', () => {
	const initialState: Partial<IOrder> & IFormState = {
        email: '',
		phone: '',
		valid: false,
		errors: [],
	};
	modal.render({ content: 
        contact.render(initialState) 
    });
});

// Отправлена форма заказа
events.on('contact:submit', () => {
    const arrayFromBasket = appState.getBasket();
	arrayFromBasket.forEach((item) => {
		appState.setOrderField('items', [...appState.order.items, item.id]);
	});
	api
		.orderItems(appState.order as IOrder)
		.then((res) => {
			success.description = `Списано: ${res.total} синапсов`;
			modal.render({ content: success.render() });
			console.log(res);


			appState.clearBasket();
			page.counter = appState.getBasket().length;
			order.clearForm();
			contact.clearForm();
		})
		.catch((err) => {
			console.log(err);
		});
  });

// Закрытие окна успешной покупки
events.on('success:close', () => {
	modal.close();
}); 

// Блокируем прокрутку страницы если открыта модалка
events.on('modal:open', () => {
    page.locked = true;
    order.updateButtonState();
	contact.updateButtonState();
});

// ... и разблокируем
events.on('modal:close', () => {
    page.locked = false;
});