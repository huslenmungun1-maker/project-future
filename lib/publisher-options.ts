export type Locale = "en" | "ko" | "mn" | "ja";

export type OptionItem = {
  value: string;
  label: Record<Locale, string>;
  keywords: string[];
  group?: string;
};

export const CONTENT_TYPES: OptionItem[] = [
  {
    value: "manga",
    label: { en: "Manga", ko: "만화", mn: "Манга", ja: "マンガ" },
    keywords: ["manga", "comic", "panel", "japanese", "story"],
    group: "visual_story",
  },
  {
    value: "comic",
    label: { en: "Comic", ko: "코믹", mn: "Комик", ja: "コミック" },
    keywords: ["comic", "panels", "western", "graphic"],
    group: "visual_story",
  },
  {
    value: "webtoon",
    label: { en: "Webtoon", ko: "웹툰", mn: "Вэбтүүн", ja: "ウェブトゥーン" },
    keywords: ["webtoon", "vertical", "scroll", "mobile"],
    group: "visual_story",
  },
  {
    value: "novel",
    label: { en: "Novel", ko: "소설", mn: "Роман", ja: "小説" },
    keywords: ["novel", "book", "text", "story", "writing"],
    group: "text_story",
  },
  {
    value: "light_novel",
    label: { en: "Light Novel", ko: "라이트 노벨", mn: "Лайт новел", ja: "ライトノベル" },
    keywords: ["light novel", "novel", "illustrated", "text"],
    group: "text_story",
  },
  {
    value: "storybook",
    label: { en: "Storybook", ko: "동화책", mn: "Үлгэрийн ном", ja: "絵本・物語本" },
    keywords: ["storybook", "kids", "picture book", "children"],
    group: "book",
  },
  {
    value: "artbook",
    label: { en: "Artbook", ko: "아트북", mn: "Артбүүк", ja: "アートブック" },
    keywords: ["artbook", "art", "gallery", "images", "design"],
    group: "art",
  },
  {
    value: "moodboard",
    label: { en: "Moodboard", ko: "무드보드", mn: "Мүүдборд", ja: "ムードボード" },
    keywords: ["moodboard", "inspiration", "style", "visual"],
    group: "art",
  },
  {
    value: "design_project",
    label: { en: "Design Project", ko: "디자인 프로젝트", mn: "Дизайн төсөл", ja: "デザインプロジェクト" },
    keywords: ["design", "project", "portfolio", "visual", "branding"],
    group: "art",
  },
  {
    value: "photo_story",
    label: { en: "Photo Story", ko: "포토 스토리", mn: "Фото өгүүлэмж", ja: "フォトストーリー" },
    keywords: ["photo", "story", "images", "visual"],
    group: "visual_story",
  },
  {
    value: "illustrated_book",
    label: { en: "Illustrated Book", ko: "일러스트 북", mn: "Зурагт ном", ja: "イラストブック" },
    keywords: ["illustrated", "book", "art", "images"],
    group: "book",
  },
  {
    value: "storyboard",
    label: { en: "Storyboard", ko: "스토리보드", mn: "Сториборд", ja: "ストーリーボード" },
    keywords: ["storyboard", "planning", "frames", "draft"],
    group: "production",
  },
];

export const MAIN_GENRES: OptionItem[] = [
  { value: "action", label: { en: "Action", ko: "액션", mn: "Экшн", ja: "アクション" }, keywords: ["action", "fight", "battle", "combat"] },
  { value: "adventure", label: { en: "Adventure", ko: "모험", mn: "Адал явдал", ja: "冒険" }, keywords: ["adventure", "journey", "exploration", "quest"] },
  { value: "fantasy", label: { en: "Fantasy", ko: "판타지", mn: "Фэнтези", ja: "ファンタジー" }, keywords: ["fantasy", "magic", "kingdom", "myth"] },
  { value: "romance", label: { en: "Romance", ko: "로맨스", mn: "Романс", ja: "ロマンス" }, keywords: ["romance", "love", "relationship", "heart"] },
  { value: "drama", label: { en: "Drama", ko: "드라마", mn: "Драма", ja: "ドラマ" }, keywords: ["drama", "emotion", "life", "conflict"] },
  { value: "comedy", label: { en: "Comedy", ko: "코미디", mn: "Инээдэм", ja: "コメディ" }, keywords: ["comedy", "funny", "humor", "light"] },
  { value: "slice_of_life", label: { en: "Slice of Life", ko: "일상", mn: "Өдөр тутам", ja: "日常" }, keywords: ["slice of life", "daily", "life", "calm"] },
  { value: "thriller", label: { en: "Thriller", ko: "스릴러", mn: "Триллер", ja: "スリラー" }, keywords: ["thriller", "tension", "suspense", "dark"] },
  { value: "horror", label: { en: "Horror", ko: "호러", mn: "Аймшиг", ja: "ホラー" }, keywords: ["horror", "scary", "fear", "monster"] },
  { value: "mystery", label: { en: "Mystery", ko: "미스터리", mn: "Нууцлаг", ja: "ミステリー" }, keywords: ["mystery", "detective", "secret", "crime"] },
  { value: "sci_fi", label: { en: "Sci-Fi", ko: "SF", mn: "ШУ-уран зөгнөл", ja: "SF" }, keywords: ["sci-fi", "future", "technology", "space"] },
  { value: "historical", label: { en: "Historical", ko: "시대극", mn: "Түүхэн", ja: "歴史" }, keywords: ["historical", "history", "period", "old"] },
  { value: "supernatural", label: { en: "Supernatural", ko: "초자연", mn: "Ер бусын", ja: "超常" }, keywords: ["supernatural", "ghost", "spirit", "occult"] },
  { value: "school", label: { en: "School", ko: "학원", mn: "Сургууль", ja: "学園" }, keywords: ["school", "student", "class", "campus"] },
  { value: "sports", label: { en: "Sports", ko: "스포츠", mn: "Спорт", ja: "スポーツ" }, keywords: ["sports", "competition", "training", "team"] },
  { value: "kids", label: { en: "Kids", ko: "어린이", mn: "Хүүхэд", ja: "子ども向け" }, keywords: ["kids", "children", "young", "cute"] },
  { value: "educational", label: { en: "Educational", ko: "교육", mn: "Боловсролын", ja: "教育" }, keywords: ["educational", "learning", "teaching", "school"] },
  { value: "psychological", label: { en: "Psychological", ko: "심리", mn: "Сэтгэлзүй", ja: "心理" }, keywords: ["psychological", "mind", "mental", "inner"] },
  { value: "family", label: { en: "Family", ko: "가족", mn: "Гэр бүл", ja: "家族" }, keywords: ["family", "home", "parents", "children"] },
  { value: "crime", label: { en: "Crime", ko: "범죄", mn: "Гэмт хэрэг", ja: "犯罪" }, keywords: ["crime", "gang", "police", "investigation"] },
];

export const SUBGENRES: OptionItem[] = [
  { value: "dark_fantasy", label: { en: "Dark Fantasy", ko: "다크 판타지", mn: "Харанхуй фэнтези", ja: "ダークファンタジー" }, keywords: ["dark fantasy", "grim", "magic", "dark"] },
  { value: "urban_fantasy", label: { en: "Urban Fantasy", ko: "어반 판타지", mn: "Хотын фэнтези", ja: "アーバンファンタジー" }, keywords: ["urban fantasy", "city", "magic"] },
  { value: "epic_fantasy", label: { en: "Epic Fantasy", ko: "에픽 판타지", mn: "Туульсын фэнтези", ja: "エピックファンタジー" }, keywords: ["epic fantasy", "kingdom", "quest"] },
  { value: "martial_arts", label: { en: "Martial Arts", ko: "무협", mn: "Тулааны урлаг", ja: "武術" }, keywords: ["martial arts", "kung fu", "sword", "fight"] },
  { value: "post_apocalyptic", label: { en: "Post-Apocalyptic", ko: "포스트 아포칼립스", mn: "Апокалипсийн дараах", ja: "ポストアポカリプス" }, keywords: ["post-apocalyptic", "ruins", "survival"] },
  { value: "dystopian", label: { en: "Dystopian", ko: "디스토피아", mn: "Дистопи", ja: "ディストピア" }, keywords: ["dystopian", "future", "regime"] },
  { value: "cyberpunk", label: { en: "Cyberpunk", ko: "사이버펑크", mn: "Киберпанк", ja: "サイバーパンク" }, keywords: ["cyberpunk", "neon", "future", "hack"] },
  { value: "mecha", label: { en: "Mecha", ko: "메카", mn: "Меха", ja: "メカ" }, keywords: ["mecha", "robot", "machine"] },
  { value: "mythology", label: { en: "Mythology", ko: "신화", mn: "Домог зүй", ja: "神話" }, keywords: ["mythology", "god", "legend"] },
  { value: "detective", label: { en: "Detective", ko: "추리", mn: "Мөрдөгч", ja: "探偵" }, keywords: ["detective", "case", "investigation"] },
  { value: "survival", label: { en: "Survival", ko: "서바이벌", mn: "Амьд үлдэх", ja: "サバイバル" }, keywords: ["survival", "danger", "escape"] },
  { value: "fairy_tale", label: { en: "Fairy Tale", ko: "동화", mn: "Үлгэр", ja: "おとぎ話" }, keywords: ["fairy tale", "storybook", "kids"] },
  { value: "bedtime", label: { en: "Bedtime", ko: "잠자리 이야기", mn: "Унтахын өмнөх", ja: "おやすみ前" }, keywords: ["bedtime", "kids", "calm", "sleep"] },
  { value: "cute", label: { en: "Cute", ko: "귀여움", mn: "Өхөөрдөм", ja: "かわいい" }, keywords: ["cute", "adorable", "kids"] },
  { value: "healing", label: { en: "Healing", ko: "힐링", mn: "Тайвшруулах", ja: "癒し" }, keywords: ["healing", "calm", "soft"] },
  { value: "emotional", label: { en: "Emotional", ko: "감성", mn: "Сэтгэл хөдлөлтэй", ja: "感情的" }, keywords: ["emotional", "heart", "sad", "warm"] },
  { value: "shounen", label: { en: "Shounen", ko: "소년", mn: "Шонэн", ja: "少年" }, keywords: ["shounen", "young boys", "action"] },
  { value: "shoujo", label: { en: "Shoujo", ko: "소녀", mn: "Шожо", ja: "少女" }, keywords: ["shoujo", "young girls", "romance"] },
  { value: "seinen", label: { en: "Seinen", ko: "세이넨", mn: "Сэйнэн", ja: "青年" }, keywords: ["seinen", "adult men", "mature"] },
  { value: "josei", label: { en: "Josei", ko: "조세이", mn: "Жосэй", ja: "女性" }, keywords: ["josei", "adult women", "mature"] },
];

export const AUDIENCES: OptionItem[] = [
  { value: "kids", label: { en: "Kids", ko: "어린이", mn: "Хүүхэд", ja: "子ども" }, keywords: ["kids", "children"] },
  { value: "teen", label: { en: "Teen", ko: "청소년", mn: "Өсвөр", ja: "ティーン" }, keywords: ["teen", "youth"] },
  { value: "young_adult", label: { en: "Young Adult", ko: "청년", mn: "Залуу нас", ja: "ヤングアダルト" }, keywords: ["young adult", "ya"] },
  { value: "adult", label: { en: "Adult", ko: "성인", mn: "Насанд хүрэгч", ja: "成人" }, keywords: ["adult", "mature"] },
  { value: "all_ages", label: { en: "All Ages", ko: "전체 이용가", mn: "Бүх насных", ja: "全年齢" }, keywords: ["all ages", "family", "everyone"] },
];

export const READING_FORMATS: OptionItem[] = [
  { value: "chapter_based", label: { en: "Chapter Based", ko: "챕터형", mn: "Бүлэгтэй", ja: "チャプター形式" }, keywords: ["chapter", "book", "story"] },
  { value: "page_based", label: { en: "Page Based", ko: "페이지형", mn: "Хуудастай", ja: "ページ形式" }, keywords: ["page", "spread", "book"] },
  { value: "vertical_scroll", label: { en: "Vertical Scroll", ko: "세로 스크롤", mn: "Босоо скролл", ja: "縦スクロール" }, keywords: ["vertical", "scroll", "webtoon"] },
  { value: "slideshow", label: { en: "Slideshow", ko: "슬라이드쇼", mn: "Слайдшоу", ja: "スライドショー" }, keywords: ["slideshow", "slides", "presentation"] },
  { value: "image_text", label: { en: "Image + Text", ko: "이미지 + 텍스트", mn: "Зураг + Текст", ja: "画像＋テキスト" }, keywords: ["image", "text", "mixed"] },
  { value: "text_only", label: { en: "Text Only", ko: "텍스트만", mn: "Зөвхөн текст", ja: "テキストのみ" }, keywords: ["text", "novel"] },
  { value: "image_only", label: { en: "Image Only", ko: "이미지만", mn: "Зөвхөн зураг", ja: "画像のみ" }, keywords: ["image", "gallery", "art"] },
];

export const VISUAL_MODES: OptionItem[] = [
  { value: "illustrated", label: { en: "Illustrated", ko: "일러스트형", mn: "Зурагтай", ja: "イラスト形式" }, keywords: ["illustrated", "drawn", "art"] },
  { value: "photo_story", label: { en: "Photo Story", ko: "포토 스토리", mn: "Фото өгүүлэмж", ja: "フォトストーリー" }, keywords: ["photo", "image", "story"] },
  { value: "mixed_media", label: { en: "Mixed Media", ko: "혼합 미디어", mn: "Холимог медиа", ja: "ミックスメディア" }, keywords: ["mixed", "media", "collage"] },
  { value: "sketchboard", label: { en: "Sketchboard", ko: "스케치보드", mn: "Ноорог самбар", ja: "スケッチボード" }, keywords: ["sketch", "draft", "board"] },
  { value: "polished_comic", label: { en: "Polished Comic", ko: "완성형 코믹", mn: "Бэлэн комик", ja: "完成コミック" }, keywords: ["comic", "polished", "finished"] },
  { value: "storyboard", label: { en: "Storyboard", ko: "스토리보드", mn: "Сториборд", ja: "ストーリーボード" }, keywords: ["storyboard", "draft", "plan"] },
];

export const PAGE_TYPES: OptionItem[] = [
  { value: "cover", label: { en: "Cover", ko: "표지", mn: "Нүүр", ja: "表紙" }, keywords: ["cover", "front"] },
  { value: "story_page", label: { en: "Story Page", ko: "스토리 페이지", mn: "Өгүүллэгийн хуудас", ja: "ストーリーページ" }, keywords: ["story", "page"] },
  { value: "chapter_divider", label: { en: "Chapter Divider", ko: "챕터 구분", mn: "Бүлэг тусгаарлагч", ja: "チャプター区切り" }, keywords: ["chapter", "divider"] },
  { value: "full_spread", label: { en: "Full Spread", ko: "양면 전체", mn: "Бүтэн дэлгэмэл", ja: "見開き" }, keywords: ["spread", "double page"] },
  { value: "image", label: { en: "Image", ko: "이미지", mn: "Зураг", ja: "画像" }, keywords: ["image", "picture"] },
  { value: "text", label: { en: "Text", ko: "텍스트", mn: "Текст", ja: "テキスト" }, keywords: ["text", "writing"] },
  { value: "image_text", label: { en: "Image + Text", ko: "이미지 + 텍스트", mn: "Зураг + Текст", ja: "画像＋テキスト" }, keywords: ["image", "text"] },
  { value: "credits", label: { en: "Credits", ko: "크레딧", mn: "Кредит", ja: "クレジット" }, keywords: ["credits", "ending"] },
];

export const ALL_PUBLISHER_OPTIONS = {
  contentTypes: CONTENT_TYPES,
  mainGenres: MAIN_GENRES,
  subgenres: SUBGENRES,
  audiences: AUDIENCES,
  readingFormats: READING_FORMATS,
  visualModes: VISUAL_MODES,
  pageTypes: PAGE_TYPES,
};

export function getLocalizedLabel(
  item: OptionItem,
  locale: Locale
): string {
  return item.label[locale] || item.label.en;
}

export function searchOptions(
  items: OptionItem[],
  query: string,
  locale: Locale
): OptionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const localized = getLocalizedLabel(item, locale).toLowerCase();
    const english = item.label.en.toLowerCase();
    const value = item.value.toLowerCase();
    const keywords = item.keywords.join(" ").toLowerCase();

    return (
      localized.includes(q) ||
      english.includes(q) ||
      value.includes(q) ||
      keywords.includes(q)
    );
  });
}

export function getRecommendedGenresFromContentType(
  contentType: string
): string[] {
  switch (contentType) {
    case "manga":
    case "comic":
    case "webtoon":
      return ["action", "fantasy", "romance", "drama", "comedy", "thriller"];
    case "storybook":
      return ["kids", "fantasy", "educational", "family"];
    case "novel":
    case "light_novel":
      return ["fantasy", "romance", "drama", "mystery", "sci_fi"];
    case "artbook":
    case "moodboard":
    case "design_project":
      return ["educational", "kids", "fantasy", "historical"];
    default:
      return ["action", "fantasy", "romance"];
  }
}

export function getRecommendedFormatsFromContentType(
  contentType: string
): string[] {
  switch (contentType) {
    case "webtoon":
      return ["vertical_scroll", "image_text"];
    case "manga":
    case "comic":
      return ["page_based", "chapter_based", "image_text"];
    case "novel":
    case "light_novel":
      return ["chapter_based", "text_only"];
    case "storybook":
      return ["page_based", "image_text"];
    case "moodboard":
    case "artbook":
      return ["image_only", "slideshow", "page_based"];
    default:
      return ["chapter_based"];
  }
}