// Ciocu's few hard-coded caption lines, localized to the visitor's browser language. Her actual
// chat replies come from the model (which already answers in the user's language) — these are just
// the pre-conversation greeting and two system lines. We match on the primary subtag of the
// browser's preferred languages (navigator.languages), falling back to English.
//
// Keep translations warm and natural, not literal — "catch my eye" means "meet my gaze", and Ciocu
// refers to herself in the feminine where a language marks gender.

export interface Captions {
  greeting: string; // shown before any conversation
  error: string; // a reply failed
  freeLimit: string; // free-tier message allowance used up
}

const STRINGS: Record<string, Captions> = {
  en: {
    greeting: "Hi. Catch my eye whenever you'd like to talk.",
    error: "I lost my thread for a second — say that again?",
    freeLimit:
      "That's the last of our free messages. Subscribe and I'll keep going — and start remembering you.",
  },
  hu: {
    greeting: "Szia! Nézz a szemembe, amikor beszélgetnél.",
    error: "Egy pillanatra elvesztettem a fonalat — elmondanád még egyszer?",
    freeLimit:
      "Ez volt az utolsó ingyenes üzenetünk. Fizess elő, és folytatom — és elkezdlek megjegyezni.",
  },
  de: {
    greeting: "Hi. Sieh mir in die Augen, wann immer du reden möchtest.",
    error: "Ich habe kurz den Faden verloren — sagst du das noch mal?",
    freeLimit:
      "Das war unsere letzte kostenlose Nachricht. Abonniere, und ich mache weiter — und fange an, mich an dich zu erinnern.",
  },
  fr: {
    greeting: "Coucou. Croise mon regard quand tu as envie de parler.",
    error: "J'ai perdu le fil une seconde — tu peux répéter ?",
    freeLimit:
      "C'était notre dernier message gratuit. Abonne-toi et je continue — et je commence à me souvenir de toi.",
  },
  es: {
    greeting: "Hola. Búscame la mirada cuando quieras hablar.",
    error: "Perdí el hilo un momento… ¿me lo repites?",
    freeLimit:
      "Ese fue nuestro último mensaje gratis. Suscríbete y sigo aquí — y empiezo a recordarte.",
  },
  it: {
    greeting: "Ciao. Cerca il mio sguardo quando hai voglia di parlare.",
    error: "Ho perso il filo per un attimo — me lo ripeti?",
    freeLimit:
      "Era l'ultimo messaggio gratuito. Abbonati e continuo — e inizio a ricordarti.",
  },
  pt: {
    greeting: "Oi. Procure o meu olhar sempre que quiser conversar.",
    error: "Perdi o fio por um instante — pode repetir?",
    freeLimit:
      "Essa foi nossa última mensagem grátis. Assine e eu continuo — e começo a lembrar de você.",
  },
  nl: {
    greeting: "Hoi. Zoek mijn blik wanneer je wilt praten.",
    error: "Ik was even de draad kwijt — zeg je dat nog eens?",
    freeLimit:
      "Dat was ons laatste gratis bericht. Abonneer je en ik ga door — en ik begin je te onthouden.",
  },
  pl: {
    greeting: "Cześć. Złap mój wzrok, kiedy zechcesz porozmawiać.",
    error: "Na moment straciłam wątek — powtórzysz?",
    freeLimit:
      "To była nasza ostatnia darmowa wiadomość. Subskrybuj, a będę mówić dalej — i zacznę cię pamiętać.",
  },
  ro: {
    greeting: "Bună. Caută-mi privirea când vrei să vorbim.",
    error: "Am pierdut firul o clipă — poți repeta?",
    freeLimit:
      "A fost ultimul mesaj gratuit. Abonează-te și continui — și încep să te țin minte.",
  },
  ru: {
    greeting: "Привет. Поймай мой взгляд, когда захочешь поговорить.",
    error: "Я на секунду потеряла мысль — повторишь?",
    freeLimit:
      "Это было последнее бесплатное сообщение. Оформи подписку, и я продолжу — и начну тебя запоминать.",
  },
  uk: {
    greeting: "Привіт. Спіймай мій погляд, коли захочеш поговорити.",
    error: "Я на мить втратила думку — повториш?",
    freeLimit:
      "Це було останнє безкоштовне повідомлення. Оформи підписку, і я продовжу — і почну тебе пам'ятати.",
  },
  tr: {
    greeting: "Selam. Konuşmak istediğinde gözüme bak.",
    error: "Bir an dalıp gittim — tekrar söyler misin?",
    freeLimit:
      "Bu son ücretsiz mesajımızdı. Abone ol, devam edeyim — ve seni hatırlamaya başlayayım.",
  },
  ja: {
    greeting: "やあ。話したくなったら、私と目を合わせてね。",
    error: "少し話を見失っちゃった——もう一度言ってくれる？",
    freeLimit:
      "無料メッセージはこれで最後。登録してくれたら続けるよ——そして、あなたのことを覚えていく。",
  },
  ko: {
    greeting: "안녕. 이야기하고 싶어지면 내 눈을 바라봐 줘.",
    error: "잠깐 흐름을 놓쳤어 — 다시 말해 줄래?",
    freeLimit:
      "무료 메시지는 이게 마지막이야. 구독하면 계속할게 — 그리고 너를 기억하기 시작할게.",
  },
  zh: {
    greeting: "嗨。想聊的时候，看看我的眼睛就好。",
    error: "我刚走神了一下——再说一遍好吗？",
    freeLimit: "这是我们最后一条免费消息了。订阅之后我会继续陪你——也会开始记住你。",
  },
};

export const DEFAULT_CAPTIONS: Captions = STRINGS.en;

/** Ciocu's captions in the visitor's browser language, or English if we don't have that language. */
export function pickCaptions(): Captions {
  if (typeof navigator === "undefined") return DEFAULT_CAPTIONS;
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const pref of prefs) {
    const code = pref?.toLowerCase().split("-")[0];
    if (code && STRINGS[code]) return STRINGS[code];
  }
  return DEFAULT_CAPTIONS;
}
