// English / Arabic for the phone app and PC FaceHub (loaded there from /m/i18n.js).
// t('English text', {vars}) returns the text in the current language; English is the key.
// Static markup: <span data-i18n="English text">English text</span> is filled by i18n.apply().
(function () {
  const AR = {
    // ----- shared -----
    'Watch': 'الساعة',
    'My faces': 'واجهاتي',
    'Store': 'المتجر',
    'Designer': 'المصمّم',
    'On the watch': 'على الساعة',
    'Built-in {n}': 'مدمجة {n}',
    'in slot 8': 'في الخانة 8',
    'Install on watch': 'تثبيت على الساعة',
    '☆ Add to favourites': '☆ إضافة إلى المفضّلة',
    'Recolour': 'تغيير اللون',
    'Make recoloured copy': 'إنشاء نسخة بلون جديد',
    'Recolouring…': 'جارٍ تغيير اللون…',
    '📷 Pick colour from a photo': '📷 التقط اللون من صورة',
    'Recolour from a photo': 'تغيير اللون من صورة',
    'Time colour from a photo': 'لون الوقت من صورة',
    'Time colour': 'لون الوقت',
    'Time at': 'مكان الوقت',
    'top': 'أعلى',
    'bottom': 'أسفل',
    'Above': 'فوقه',
    'Below': 'تحته',
    'none': 'لا شيء',
    'date': 'التاريخ',
    'sleep': 'النوم',
    'heart rate': 'نبض القلب',
    'steps': 'الخطوات',
    'Update layout only': 'تحديث التخطيط فقط',
    'Delete': 'حذف',
    'Downloading…': 'جارٍ التنزيل…',
    'Loading store…': 'جارٍ تحميل المتجر…',
    'Store face #{id}': 'واجهة من المتجر #{id}',
    'Failed: {e}': 'فشل: {e}',
    '{kb} KB': '{kb} ك.ب',
    'New': 'جديدة', 'Recommended': 'مقترحة', 'Activity': 'نشاط', 'Classic': 'كلاسيكية',
    'Modern': 'عصرية', 'Art': 'فنية', 'Funny': 'مرحة', 'Colorful': 'ملوّنة',

    // ----- phone app -----
    'Connect watch': 'اتصال بالساعة',
    'This browser has no Web Bluetooth. Use Chrome on Android.': 'هذا المتصفح لا يدعم Web Bluetooth. استخدم Chrome على Android.',
    'Bluetooth needs HTTPS or localhost.': 'يتطلب البلوتوث صفحة HTTPS أو localhost.',
    "Turn off Bluetooth in the Da Fit app (or the phone's pairing with Da Fit) if connecting fails.":
      'إذا فشل الاتصال، أوقف البلوتوث في تطبيق Da Fit (أو ألغِ إقران الهاتف معه).',
    'Could not connect: {e}': 'تعذّر الاتصال: {e}',
    'Set the face\'s store ID first (see "Face ID" below).': 'حدّد رقم الواجهة في المتجر أولًا (انظر «رقم الواجهة» أدناه).',
    'Installing… {p}%': 'جارٍ التثبيت… {p}%',
    'Face installed ✓': 'تم تثبيت الواجهة ✓',
    'The watch did not accept the face. Try again.': 'لم تقبل الساعة الواجهة. حاول مرة أخرى.',
    'Install failed: {e}': 'فشل التثبيت: {e}',
    'This browser has no Web Bluetooth. Open FaceHub in <b>Chrome on Android</b>.': 'هذا المتصفح لا يدعم Web Bluetooth. افتح FaceHub في <b>Chrome على Android</b>.',
    'Web Bluetooth needs a secure page (HTTPS or localhost).': 'يتطلب Web Bluetooth صفحة آمنة (HTTPS أو localhost).',
    'Faces 1–7 are built in. Slot 8 holds one custom face; installing replaces it (about 20 s).':
      'الواجهات 1–7 مدمجة. الخانة 8 تحمل واجهة مخصّصة واحدة، والتثبيت يستبدلها (حوالي 20 ثانية).',
    'Tap a slot to show it.': 'اضغط على خانة لعرضها.',
    'Connect to switch faces.': 'اتصل بالساعة لتبديل الواجهات.',
    '🖼 Put your photo on face 2': '🖼 ضع صورتك على الواجهة 2',
    'Quick install': 'تثبيت سريع',
    'Custom': 'مخصّصة',
    'Your photo': 'صورتك',
    'showing': 'معروضة',
    'Watch stayed on face {n}': 'بقيت الساعة على الواجهة {n}',
    'No faces yet.<br>Get some from the Store, or import .bin files in My faces.': 'لا توجد واجهات بعد.<br>نزّل بعضها من المتجر، أو استورد ملفات .bin في «واجهاتي».',
    '＋ Import .bin': '＋ استيراد .bin',
    '⇣ From PC FaceHub': '⇣ من FaceHub على الكمبيوتر',
    'Your faces live here, stored on this phone.': 'واجهاتك تُحفظ هنا، على هذا الهاتف.',
    'on watch': 'على الساعة',
    'Imported {n} face{s}': 'تم استيراد الواجهات: {n}',
    'Copied {n} face{s} from the PC': 'تم نسخ واجهات من الكمبيوتر: {n}',
    'Nothing new on the PC': 'لا جديد على الكمبيوتر',
    'Store catalog unavailable offline.': 'المتجر غير متاح دون اتصال بالإنترنت.',
    'Show more': 'عرض المزيد',
    '✓ saved': '✓ محفوظة',
    'Download &amp; install': 'تنزيل وتثبيت',
    'Save to My faces': 'حفظ في «واجهاتي»',
    'Face 2: your photo': 'الواجهة 2: صورتك',
    'Background, time colour and info lines for built-in face 2': 'الخلفية ولون الوقت وسطرا المعلومات للواجهة المدمجة 2',
    'Choose a photo…': 'اختر صورة…',
    'Send photo + layout': 'إرسال الصورة والتخطيط',
    'Connecting…': 'جارٍ الاتصال…',
    'the watch did not report a customisable face': 'لم تُبلغ الساعة عن واجهة قابلة للتخصيص',
    'Sending photo… {p}%': 'جارٍ إرسال الصورة… {p}%',
    'the watch rejected the photo (checksum)': 'رفضت الساعة الصورة (خطأ في التحقق)',
    'Photo face updated ✓': 'تم تحديث واجهة الصورة ✓',
    'Layout updated ✓': 'تم تحديث التخطيط ✓',
    'On the watch (slot 8)': 'على الساعة (الخانة 8)',
    '★ Favourite': '★ في المفضّلة',
    "Shifts the face's accent colour and saves a copy.": 'يغيّر اللون الأساسي للواجهة ويحفظ نسخة جديدة.',
    'Face ID': 'رقم الواجهة',
    "The store ID the watch is told after installing. Copies keep the original's ID. Without a valid ID the watch shows a dark screen and goes back to a built-in face.":
      'رقم الواجهة في المتجر، ويُرسل إلى الساعة بعد التثبيت. النسخ تحتفظ برقم الأصل. بدون رقم صحيح تُظهر الساعة شاشة مظلمة ثم تعود إلى واجهة مدمجة.',
    'e.g. 26096': 'مثال: 26096',
    'Share .bin file': 'مشاركة ملف .bin',
    'Saved a recoloured copy': 'تم حفظ نسخة بلون جديد',
    'Face ID saved': 'تم حفظ رقم الواجهة',
    'Tap again to delete': 'اضغط مرة أخرى للحذف',
    'Picked {c}: tap “Make recoloured copy”': 'تم اختيار {c}: اضغط «إنشاء نسخة بلون جديد»',
    'Preview': 'معاينة',
    'not saved yet': 'لم تُحفظ بعد',
    'Show original': 'عرض الأصل',
    'Show preview': 'عرض المعاينة',

    // ----- colour picker -----
    'Colour from a photo': 'لون من صورة',
    'Cancel': 'إلغاء',
    'Take a photo of your T-shirt (or anything) and tap the spot whose colour you want. Daylight gives the truest colour.':
      'صوّر قميصك (أو أي شيء) ثم اضغط على المكان الذي تريد لونه. ضوء النهار يعطي أدق لون.',
    'Drop a picture here, or paste one (Ctrl+V)': 'اسحب صورة إلى هنا، أو الصقها (Ctrl+V)',
    'Take photo': 'التقط صورة',
    'Choose photo': 'اختر صورة',
    'That file is not a picture the browser can open': 'لا يستطيع المتصفح فتح هذا الملف كصورة',
    'Camera': 'الكاميرا',
    'Back': 'رجوع',
    'Could not open the camera ({why}). Choose a photo instead.': 'تعذّر فتح الكاميرا ({why}). اختر صورة بدلًا من ذلك.',
    'permission denied': 'تم رفض الإذن',
    'no camera found': 'لا توجد كاميرا',
    'Tap the colour you want': 'اضغط على اللون الذي تريده',
    'Main colours': 'الألوان الرئيسية',
    'In the photo': 'في الصورة',
    'Watch boost: brighter and richer, so it reads like the real thing on the watch screen':
      'تعزيز للساعة: أفتح وأغنى، ليبدو على شاشة الساعة مثل الحقيقة',
    'Another photo': 'صورة أخرى',
    'Use this colour': 'استخدم هذا اللون',

    // ----- PC FaceHub -----
    'Select a face': 'اختر واجهة',
    'All': 'الكل',
    '★ Favourites': '★ المفضّلة',
    'My designs & recolours': 'تصاميمي وألواني',
    'Downloaded': 'المُنزّلة',
    'No faces yet. Get some from the Store tab.': 'لا توجد واجهات بعد. نزّل بعضها من تبويب المتجر.',
    'mine': 'خاصّتي',
    'store': 'المتجر',
    'Load more': 'تحميل المزيد',
    'Import a face (.bin) or start a new 360×360 FaceN face, edit it, then press <b>Send to FaceHub</b>. It appears in My faces, ready to install.':
      'استورد واجهة (.bin) أو ابدأ واجهة FaceN جديدة بمقاس 360×360، عدّلها ثم اضغط <b>Send to FaceHub</b>. ستظهر في «واجهاتي» جاهزة للتثبيت.',
    'Open in its own window ↗': 'افتح في نافذة مستقلة ↗',
    "The designer isn't running. Start everything with <b>FaceHub.bat</b>, or run <code>npm run dev</code> in the dafit-canvas folder, then come back to this tab.":
      'المصمّم لا يعمل. شغّل كل شيء عبر <b>FaceHub.bat</b>، أو نفّذ <code>npm run dev</code> في مجلد dafit-canvas، ثم عد إلى هذا التبويب.',
    "The C29 has 7 built-in faces and <b>one</b> slot (8) for a downloaded face; swap favourites into it (about 20 s each). Built-in face <b>2</b> also takes your own photo, colour and info lines (side panel). Turn the phone's Bluetooth off first.":
      'في C29 سبع واجهات مدمجة وخانة <b>واحدة</b> (8) لواجهة مُنزّلة؛ بدّل مفضّلاتك فيها (حوالي 20 ثانية لكل واحدة). الواجهة المدمجة <b>2</b> تقبل أيضًا صورتك ولونًا وسطرَي معلومات (اللوحة الجانبية). أوقف بلوتوث الهاتف أولًا.',
    'Favourites, one click to put on the watch': 'المفضّلة، بنقرة واحدة إلى الساعة',
    'Custom slot': 'الخانة المخصّصة',
    'Built-in 2 · your photo': 'مدمجة 2 · صورتك',
    'showing now': 'معروضة الآن',
    'tap to show': 'انقر للعرض',
    'Star faces in My faces to list them here.': 'ضع نجمة على واجهات في «واجهاتي» لتظهر هنا.',
    'select, then install': 'اخترها ثم ثبّتها',
    'Showing face {n}.': 'الواجهة المعروضة: {n}.',
    'Read from watch': 'قراءة من الساعة',
    'Customise built-in face 2': 'تخصيص الواجهة المدمجة 2',
    'Face 2 takes your own background picture plus a time colour and two info lines.': 'الواجهة 2 تقبل صورة خلفية خاصة بك مع لون للوقت وسطرَي معلومات.',
    'Choose a picture…': 'اختر صورة…',
    'Send picture + layout': 'إرسال الصورة والتخطيط',
    'Store unavailable: {e}': 'المتجر غير متاح: {e}',
    'downloaded': 'مُنزّلة',
    'Open in My faces': 'افتح في «واجهاتي»',
    'Download to My faces': 'تنزيل إلى «واجهاتي»',
    'Download &amp; install on watch': 'تنزيل وتثبيت على الساعة',
    'My face': 'واجهتي',
    'Store face': 'واجهة من المتجر',
    'Install on watch (slot 8)': 'تثبيت على الساعة (الخانة 8)',
    '★ In favourites — remove': '★ في المفضّلة — إزالة',
    'Deleted': 'تم الحذف',
    'Click again to delete': 'انقر مرة أخرى للحذف',
    'idle': 'خاملة',
    'sending {p}%': 'إرسال {p}%',
    'working…': 'جارٍ العمل…',
    'done ✓': 'تم ✓',
    'failed': 'فشل',
    'Watch: {s}': 'الساعة: {s}',
    'Sending… {p}%': 'جارٍ الإرسال… {p}%',
    "Turn the phone's Bluetooth off first; the watch accepts only one connection.": 'أوقف بلوتوث الهاتف أولًا؛ الساعة تقبل اتصالًا واحدًا فقط.',
  };

  const CSS = `
[dir=rtl] body{font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif}
[dir=rtl] h1,[dir=rtl] h2,[dir=rtl] h3{letter-spacing:0!important}
[dir=rtl] .nm,[dir=rtl] .title{unicode-bidi:plaintext}
[dir=rtl] pre,[dir=rtl] code,[dir=rtl] input[type=number]{direction:ltr;text-align:left}
.lang-btn{font:inherit;font-size:13px;background:none;border:1px solid #2b3036;color:inherit;border-radius:999px;padding:5px 11px;cursor:pointer;line-height:1.2}`;

  let lang = null;
  try { lang = localStorage.getItem('lang'); } catch {}
  if (lang !== 'ar' && lang !== 'en') lang = (navigator.languages || [navigator.language]).some(l => /^ar\b/i.test(l)) ? 'ar' : 'en';

  window.t = (s, v) => {
    let r = (lang === 'ar' && AR[s]) || s;
    if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m);
    return r;
  };

  function apply() {
    const html = document.documentElement;
    html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('.lang-btn').forEach(b => { b.textContent = lang === 'ar' ? 'EN' : 'عربي'; b.title = lang === 'ar' ? 'English' : 'العربية'; });
  }

  window.i18n = {
    get lang() { return lang; },
    set(l) {
      lang = l; try { localStorage.setItem('lang', l); } catch {}
      apply(); window.dispatchEvent(new Event('langchange'));
    },
    toggle() { this.set(lang === 'ar' ? 'en' : 'ar'); },
    apply,
  };

  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
