/* ══════════════════════════════════════
   i18n.js — Hamogram Translations
   Languages: en / ar / ru
══════════════════════════════════════ */

const TRANSLATIONS = {
  en: {
    // Nav
    nav_home:    'Home',
    nav_deals:   'Deals',
    nav_new:     'New',
    nav_wallet:  'Wallet',
    nav_market:  'Market',

    // Market
    market_tab_all:      'All',
    market_tab_gifts:    'Gifts',
    market_tab_channels: 'Channels',
    market_tab_ids:      'Usernames',
    market_tab_mine:     'My Listings',
    market_empty:        'No listings yet — be the first!',
    market_search:       'Search listings...',
    market_buy:          'Buy',

    // Home
    hero_label:  'Escrow Dashboard',
    hero_title:  'Secure deals,',
    hero_span:   'on-chain trust.',
    hero_sub:    'Your TON is locked until you receive your gift — no trust required.',
    ton_held:    'TON Held',
    active:      'Active',
    completed:   'Completed',
    active_deals:'Active Deals',
    view_all:    'View all',

    // Deals
    all_deals:   'All Deals',
    disputes:    'Disputes',

    // New Deal
    new_deal:    'New Deal',
    buyer_label: "Buyer's Telegram Username or ID",
    buyer_ph:    '@username or 123456789',
    item_type_label: 'Deal Type',
    type_gift:   'NFT Gift',
    type_id:     'Username / ID',
    type_channel:'Channel',
    type_group:  'Group',
    chat_preview_loading: 'Verifying…',
    item_label:  'Item Description',
    item_ph:     'e.g. Rare sticker, channel subscription...',
    amount_label:'Amount',
    fee_hint:    '5% fee — you receive 95% when the buyer confirms',
    your_wallet: 'Your Wallet',
    deadline:    'Payment Deadline',
    deadline_val:'30 minutes',
    fee:         'Fee',
    fee_val:     '5% — you keep 95%',
    create_btn:  'Create Deal',
    not_connected:'Not connected',

    // Wallet
    connect_wallet:    'Connect Wallet',
    wallet_connected:  'Wallet Connected',
    wallet_sub_connect:'Add your TON wallet so you can get paid when a buyer confirms receipt.',
    wallet_sub_ready:  "Your TON wallet is ready — you'll get paid when buyers confirm receipt.",
    connect_ton:       'Connect via TON Connect',
    or_paste:          'or paste manually',
    wallet_addr_label: 'Your TON Wallet Address',
    save:              'Save',
    disconnect:        'Disconnect Wallet',
    how_payments:      'How Payments Work',
    step1_title:       'Add your wallet',
    step1_desc:        'Paste your TON address from Tonkeeper or MyTonWallet',
    step2_title:       'Create a deal',
    step2_desc:        "Set the gift, price, and buyer — they'll get a notification",
    step3_title:       'Send the gift after payment',
    step3_desc:        'Once the buyer pays, send them the gift and mark it sent',
    step4_title:       'Get paid instantly',
    step4_desc:        'TON goes straight to your wallet when the buyer confirms',

    // Disconnect sheet
    disc_title:  'Disconnect Wallet?',
    disc_body:   "If you remove your wallet, you won't be able to receive payment when deals complete.",
    cancel:      'Cancel',
    cancel_deal: 'Cancel Deal',
    report_user: 'Report User',

    // Deal sheet
    item:        'Item',
    you_receive: 'You receive',
    you_pay:     'You pay',
    deal_amount: 'Deal amount',
    platform_fee:'Platform fee',
    buyer:       'Buyer',
    seller:      'Seller',
    your_role:   'Your role',
    role_seller: 'Seller',
    role_buyer:  'Buyer',
    status:      'Status',
    created:     'Created',
    close:       'Close',
    gift_sent_btn: 'Gift Sent',
    got_it:      'I Got It',
    problem:     'Problem',
    accept_btn:  'Accept',
    reject_btn:  'Reject',

    // Hints
    hint_paid_buyer_for_seller: "💡 The buyer has paid — send the gift then confirm below",
    hint_pending_seller:   "⏳ Waiting for the buyer to accept your offer",
    hint_gift_sent_seller: "👀 Waiting for buyer to confirm receipt",
    hint_completed:        "✅ Deal completed — payment sent to your wallet",
    hint_disputed:         "⚠️ Dispute opened — admin will review",
    hint_refunded:         "↩️ Deal refunded to buyer",
    hint_expired:          "⌛ Deal expired",
    hint_gift_sent_buyer:  "📦 The seller marked the gift as sent — did you receive it?",
    hint_pending_buyer:    "🔔 You have a new deal offer — accept or reject it",
    hint_waiting_payment:  "💳 Please pay to activate this deal",
    hint_paid_buyer:       "✅ Payment received — waiting for seller to send the gift",

    // Accept / Reject toasts
    deal_accepted: "✅ Deal accepted — proceed to payment",
    deal_rejected: "❌ Deal rejected",

    // Cancel (seller, pending deal)
    cancel_btn:          'Cancel Deal',
    cancel_deal_title:   'Cancel this deal?',
    cancel_deal_body:    "The buyer won't be able to accept it anymore. This can't be undone.",
    cancel_deal_confirm: 'Yes, Cancel',
    deal_cancelled:      '🗑️ Deal cancelled',

    // Toast / errors
    enter_wallet:  'Enter wallet address',
    wallet_eq:     'Address must start with EQ or UQ',
    wallet_short:  'Address too short',
    wallet_saved:  "Wallet saved — you're ready to sell",
    wallet_already:'Wallet already connected',
    tc_not_loaded: 'TonConnect SDK not loaded',
    wallet_connected_toast: 'Wallet connected ✓',
    disconnecting: 'Disconnecting…',
    disconnected:  'Wallet disconnected',
    enter_buyer:   "Enter the buyer's username or ID",
    describe_gift: 'Describe the gift',
    enter_amount:  'Enter an amount (min 0.01 TON)',
    add_wallet_first: 'Add your wallet first',
    creating:      'Creating...',
    offline:       'Offline',
    no_active:     'No active deals',
    press_new:     'Press New to create your first deal',
    no_deals:      'No deals yet',
    create_first:  'Create your first deal above',
    could_not_load:'Could not load deals',
    try_again:     'Pull to refresh or try again later',
    could_not_connect: 'Could not connect — try again',

    // Status labels
    status_PENDING:         'Pending',
    status_WAITING_PAYMENT: 'Awaiting Payment',
    status_PAID:            'Paid',
    status_GIFT_SENT:       'Awaiting Confirm',
    status_COMPLETED:       'Completed',
    status_DISPUTED:        'Disputed',
    status_REFUNDED:        'Refunded',
    status_EXPIRED:         'Expired',
    status_REJECTED:        'Rejected',
    status_PAY_FAILED:      'Payment Failed',

    // Countdown
    cd_pay_within:  'Pay within',
    cd_send_within: 'Send gift within',

    // Language picker
    lang_title: 'Language',
    continue_btn: 'Continue',
    lets_go: "Let's Go",
    skip: 'Skip',
  },

  ar: {
    nav_home:    'الرئيسية',
    nav_deals:   'الصفقات',
    nav_new:     'جديد',
    nav_wallet:  'المحفظة',
    nav_market:  'السوق',

    // Market
    market_tab_all:      'الكل',
    market_tab_gifts:    'الهدايا',
    market_tab_channels: 'القنوات',
    market_tab_ids:      'المعرفات',
    market_tab_mine:     'قوائمي',
    market_empty:        'لا توجد قوائم بعد — كن أول من ينشر!',
    market_search:       'ابحث في القوائم...',
    market_buy:          'شراء',

    hero_label:  'لوحة الإيسكرو',
    hero_title:  'صفقات آمنة،',
    hero_span:   'ثقة على البلوكشين.',
    hero_sub:    'يُحتجز TON الخاص بك حتى تستلم هديتك — لا حاجة للثقة.',
    ton_held:    'TON محتجز',
    active:      'نشطة',
    completed:   'مكتملة',
    active_deals:'الصفقات النشطة',
    view_all:    'عرض الكل',

    all_deals:   'كل الصفقات',
    disputes:    'النزاعات',

    new_deal:    'صفقة جديدة',
    buyer_label: 'اسم المستخدم أو ID المشتري',
    buyer_ph:    '@username أو 123456789',
    item_type_label: 'نوع الصفقة',
    type_gift:   'هدية NFT',
    type_id:     'يوزر / معرّف',
    type_channel:'قناة',
    type_group:  'مجموعة',
    chat_preview_loading: 'جارٍ التحقق…',
    item_label:  'وصف العنصر',
    item_ph:     'مثال: ملصق نادر، اشتراك قناة...',
    amount_label:'المبلغ',
    fee_hint:    'رسوم 5% — تستلم 95% عند تأكيد المشتري',
    your_wallet: 'محفظتك',
    deadline:    'مهلة الدفع',
    deadline_val:'30 دقيقة',
    fee:         'الرسوم',
    fee_val:     '5% — تحتفظ بـ 95%',
    create_btn:  'إنشاء صفقة',
    not_connected:'غير متصلة',

    connect_wallet:    'ربط المحفظة',
    wallet_connected:  'المحفظة مربوطة',
    wallet_sub_connect:'أضف محفظة TON الخاصة بك لاستلام المدفوعات عند تأكيد المشتري.',
    wallet_sub_ready:  'محفظتك جاهزة — ستستلم المدفوعات عند تأكيد المشترين.',
    connect_ton:       'ربط عبر TON Connect',
    or_paste:          'أو الصق يدوياً',
    wallet_addr_label: 'عنوان محفظة TON الخاصة بك',
    save:              'حفظ',
    disconnect:        'فصل المحفظة',
    how_payments:      'كيف تعمل المدفوعات',
    step1_title:       'أضف محفظتك',
    step1_desc:        'الصق عنوان TON من Tonkeeper أو MyTonWallet',
    step2_title:       'أنشئ صفقة',
    step2_desc:        'حدد الهدية والسعر والمشتري — سيصله إشعار',
    step3_title:       'أرسل الهدية بعد الدفع',
    step3_desc:        'بمجرد دفع المشتري، أرسل الهدية وأشر إلى إرسالها',
    step4_title:       'استلم المدفوعات فوراً',
    step4_desc:        'يُحول TON مباشرة إلى محفظتك عند تأكيد المشتري',

    disc_title:  'فصل المحفظة؟',
    disc_body:   'إذا أزلت محفظتك، لن تتمكن من استلام المدفوعات عند اكتمال الصفقات.',
    cancel:      'إلغاء',
    cancel_deal: 'إلغاء الصفقة',
    report_user: 'إبلاغ عن المستخدم',

    item:        'العنصر',
    you_receive: 'ستستلم',
    you_pay:     'ستدفع',
    deal_amount: 'مبلغ الصفقة',
    platform_fee:'رسوم المنصة',
    buyer:       'المشتري',
    seller:      'البائع',
    your_role:   'دورك',
    role_seller: 'بائع',
    role_buyer:  'مشتري',
    status:      'الحالة',
    created:     'تاريخ الإنشاء',
    close:       'إغلاق',
    gift_sent_btn:'أرسلت الهدية',
    got_it:      'استلمتها ✅',
    problem:     'مشكلة ⚠️',
    accept_btn:  'قبول',
    reject_btn:  'رفض',

    hint_paid_buyer_for_seller: '💡 دفع المشتري — أرسل الهدية ثم أكّد بالأسفل',
    hint_pending_seller:   '⏳ بانتظار قبول المشتري للعرض',
    hint_gift_sent_seller: '👀 بانتظار تأكيد المشتري للاستلام',
    hint_completed:        '✅ اكتملت الصفقة — تم إرسال المدفوعات',
    hint_disputed:         '⚠️ نزاع مفتوح — سيراجعه المشرف',
    hint_refunded:         '↩️ تم استرداد المبلغ للمشتري',
    hint_expired:          '⌛ انتهت صلاحية الصفقة',
    hint_gift_sent_buyer:  '📦 أشار البائع إلى إرسال الهدية — هل استلمتها؟',
    hint_pending_buyer:    '🔔 لديك عرض صفقة جديد — اقبله أو ارفضه',
    hint_waiting_payment:  '💳 يرجى الدفع لتفعيل هذه الصفقة',
    hint_paid_buyer:       '✅ تم استلام الدفع — بانتظار البائع لإرسال الهدية',

    deal_accepted: '✅ تم قبول الصفقة — أكمل الدفع',
    deal_rejected: '❌ تم رفض الصفقة',

    cancel_btn:          'إلغاء الصفقة',
    cancel_deal_title:   'إلغاء هذه الصفقة؟',
    cancel_deal_body:    'لن يتمكن المشتري من قبولها بعد الآن. لا يمكن التراجع عن هذا الإجراء.',
    cancel_deal_confirm: 'نعم، إلغاء',
    deal_cancelled:      '🗑️ تم إلغاء الصفقة',

    enter_wallet:  'أدخل عنوان المحفظة',
    wallet_eq:     'يجب أن يبدأ العنوان بـ EQ أو UQ',
    wallet_short:  'العنوان قصير جداً',
    wallet_saved:  'تم حفظ المحفظة — أنت جاهز للبيع',
    wallet_already:'المحفظة مربوطة بالفعل',
    tc_not_loaded: 'لم يتم تحميل TonConnect',
    wallet_connected_toast: 'تم ربط المحفظة ✓',
    disconnecting: 'جاري الفصل…',
    disconnected:  'تم فصل المحفظة',
    enter_buyer:   'أدخل اسم المستخدم أو ID المشتري',
    describe_gift: 'صف الهدية',
    enter_amount:  'أدخل المبلغ (الحد الأدنى 0.01 TON)',
    add_wallet_first: 'أضف محفظتك أولاً',
    creating:      'جاري الإنشاء...',
    offline:       'غير متصل',
    no_active:     'لا توجد صفقات نشطة',
    press_new:     'اضغط جديد لإنشاء أول صفقة',
    no_deals:      'لا توجد صفقات بعد',
    create_first:  'أنشئ صفقتك الأولى أعلاه',
    could_not_load:'تعذر تحميل الصفقات',
    try_again:     'اسحب للتحديث أو حاول مرة أخرى',
    could_not_connect: 'تعذر الاتصال — حاول مرة أخرى',

    status_PENDING:         'قيد الانتظار',
    status_WAITING_PAYMENT: 'بانتظار الدفع',
    status_PAID:            'مدفوعة',
    status_GIFT_SENT:       'بانتظار التأكيد',
    status_COMPLETED:       'مكتملة',
    status_DISPUTED:        'متنازع عليها',
    status_REFUNDED:        'مستردة',
    status_EXPIRED:         'منتهية',
    status_REJECTED:        'مرفوضة',
    status_PAY_FAILED:      'فشل الدفع',

    cd_pay_within:  'ادفع خلال',
    cd_send_within: 'أرسل الهدية خلال',

    lang_title: 'اللغة',
    continue_btn: 'استمرار',
    lets_go: 'ابدأ',
    skip: 'تخطي',
  },

  ru: {
    nav_home:    'Главная',
    nav_deals:   'Сделки',
    nav_new:     'Новая',
    nav_wallet:  'Кошелёк',

    hero_label:  'Панель эскроу',
    hero_title:  'Безопасные сделки,',
    hero_span:   'доверие в блокчейне.',
    hero_sub:    'TON заморожен до получения подарка — доверие не нужно.',
    ton_held:    'TON заморожен',
    active:      'Активные',
    completed:   'Завершённые',
    active_deals:'Активные сделки',
    view_all:    'Все',

    all_deals:   'Все сделки',
    disputes:    'Споры',

    new_deal:    'Новая сделка',
    buyer_label: 'Username или ID покупателя',
    buyer_ph:    '@username или 123456789',
    item_type_label: 'Тип сделки',
    type_gift:   'NFT-подарок',
    type_id:     'Username / ID',
    type_channel:'Канал',
    type_group:  'Группа',
    chat_preview_loading: 'Проверяем…',
    item_label:  'Описание товара',
    item_ph:     'напр. Редкий стикер, подписка...',
    amount_label:'Сумма',
    fee_hint:    'Комиссия 5% — получите 95% после подтверждения',
    your_wallet: 'Ваш кошелёк',
    deadline:    'Срок оплаты',
    deadline_val:'30 минут',
    fee:         'Комиссия',
    fee_val:     '5% — вы получаете 95%',
    create_btn:  'Создать сделку',
    not_connected:'Не подключён',

    connect_wallet:    'Подключить кошелёк',
    wallet_connected:  'Кошелёк подключён',
    wallet_sub_connect:'Добавьте кошелёк TON для получения оплаты.',
    wallet_sub_ready:  'Ваш кошелёк готов — получите оплату после подтверждения.',
    connect_ton:       'Подключить через TON Connect',
    or_paste:          'или вставьте вручную',
    wallet_addr_label: 'Адрес вашего TON кошелька',
    save:              'Сохранить',
    disconnect:        'Отключить кошелёк',
    how_payments:      'Как работают платежи',
    step1_title:       'Добавьте кошелёк',
    step1_desc:        'Вставьте адрес TON из Tonkeeper или MyTonWallet',
    step2_title:       'Создайте сделку',
    step2_desc:        'Укажите подарок, цену и покупателя — он получит уведомление',
    step3_title:       'Отправьте подарок после оплаты',
    step3_desc:        'Как только покупатель оплатит — отправьте подарок',
    step4_title:       'Получите оплату мгновенно',
    step4_desc:        'TON поступит на ваш кошелёк после подтверждения',

    disc_title:  'Отключить кошелёк?',
    disc_body:   'Без кошелька вы не сможете получать оплату по сделкам.',
    cancel:      'Отмена',
    cancel_deal: 'Отменить сделку',
    report_user: 'Пожаловаться',

    item:        'Товар',
    you_receive: 'Вы получите',
    you_pay:     'Вы платите',
    deal_amount: 'Сумма сделки',
    platform_fee:'Комиссия платформы',
    buyer:       'Покупатель',
    seller:      'Продавец',
    your_role:   'Ваша роль',
    role_seller: 'Продавец',
    role_buyer:  'Покупатель',
    status:      'Статус',
    created:     'Создано',
    close:       'Закрыть',
    gift_sent_btn:'Подарок отправлен',
    got_it:      'Получил ✅',
    problem:     'Проблема ⚠️',
    accept_btn:  'Принять',
    reject_btn:  'Отклонить',

    hint_paid_buyer_for_seller: '💡 Покупатель оплатил — отправьте подарок и подтвердите ниже',
    hint_pending_seller:   '⏳ Ожидание принятия предложения покупателем',
    hint_gift_sent_seller: '👀 Ожидание подтверждения получения',
    hint_completed:        '✅ Сделка завершена — оплата отправлена',
    hint_disputed:         '⚠️ Открыт спор — admin рассмотрит',
    hint_refunded:         '↩️ Средства возвращены покупателю',
    hint_expired:          '⌛ Сделка истекла',
    hint_gift_sent_buyer:  '📦 Продавец отметил подарок как отправленный — вы получили?',
    hint_pending_buyer:    '🔔 У вас новое предложение сделки — примите или отклоните',
    hint_waiting_payment:  '💳 Оплатите для активации сделки',
    hint_paid_buyer:       '✅ Оплата получена — ожидайте подарок от продавца',

    deal_accepted: '✅ Сделка принята — переходите к оплате',
    deal_rejected: '❌ Сделка отклонена',

    cancel_btn:          'Отменить сделку',
    cancel_deal_title:   'Отменить эту сделку?',
    cancel_deal_body:    'Покупатель больше не сможет её принять. Это действие нельзя отменить.',
    cancel_deal_confirm: 'Да, отменить',
    deal_cancelled:      '🗑️ Сделка отменена',

    enter_wallet:  'Введите адрес кошелька',
    wallet_eq:     'Адрес должен начинаться с EQ или UQ',
    wallet_short:  'Адрес слишком короткий',
    wallet_saved:  'Кошелёк сохранён — готов к продаже',
    wallet_already:'Кошелёк уже подключён',
    tc_not_loaded: 'TonConnect SDK не загружен',
    wallet_connected_toast: 'Кошелёк подключён ✓',
    disconnecting: 'Отключение…',
    disconnected:  'Кошелёк отключён',
    enter_buyer:   'Введите username или ID покупателя',
    describe_gift: 'Опишите подарок',
    enter_amount:  'Введите сумму (мин. 0.01 TON)',
    add_wallet_first: 'Сначала добавьте кошелёк',
    creating:      'Создание...',
    offline:       'Оффлайн',
    no_active:     'Нет активных сделок',
    press_new:     'Нажмите Новая для создания сделки',
    no_deals:      'Сделок пока нет',
    create_first:  'Создайте первую сделку выше',
    could_not_load:'Не удалось загрузить сделки',
    try_again:     'Потяните для обновления',
    could_not_connect: 'Не удалось подключиться — попробуйте снова',

    status_PENDING:         'Ожидание',
    status_WAITING_PAYMENT: 'Ожидание оплаты',
    status_PAID:            'Оплачено',
    status_GIFT_SENT:       'Ожидание подтверждения',
    status_COMPLETED:       'Завершено',
    status_DISPUTED:        'Спор',
    status_REFUNDED:        'Возврат',
    status_EXPIRED:         'Истекло',
    status_REJECTED:        'Отклонено',
    status_PAY_FAILED:      'Ошибка оплаты',

    cd_pay_within:  'Оплатите в течение',
    cd_send_within: 'Отправьте подарок в течение',

    lang_title: 'Язык',
    continue_btn: 'Продолжить',
    lets_go: 'Начать',
    skip: 'Пропустить',
  }
};

// ── Engine ────────────────────────────────────────────────────
let _lang = 'en';

function detectLang() {
  try {
    const saved = localStorage.getItem('hg_lang');
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch(_) {}
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || '';
  if (tgLang.startsWith('ar')) return 'ar';
  if (tgLang.startsWith('ru')) return 'ru';
  return 'en';
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  try { localStorage.setItem('hg_lang', lang); } catch(_) {}
  // RTL للعربية
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  applyTranslations();
  // أغلق picker إن كان مفتوحاً
  document.getElementById('ov-lang')?.classList.remove('open');
}

function t(key) {
  return TRANSLATIONS[_lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

function applyTranslations() {
  // Nav
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
}

// Init
_lang = detectLang();
document.documentElement.dir  = _lang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = _lang;
