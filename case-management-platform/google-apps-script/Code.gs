/**
 * ConnectCare: Google Form intake.
 *
 * Builds the intake form and sends every submission to the ConnectCare app,
 * where it appears in the supervisor's intake queue with a client ID.
 *
 * Setup (once): see google-apps-script/README.md.
 *   1. Project Settings > Script properties:
 *        CONNECTCARE_URL     e.g. https://connectcare.example.org
 *        CONNECTCARE_SECRET  same value as GOOGLE_FORM_WEBHOOK_SECRET on the server
 *   2. Run setup() and approve the permissions.
 *
 * Privacy: after the app confirms it saved a submission, the response is deleted from
 * Google Forms so client information lives only in the encrypted ConnectCare database.
 * Do not link this form to a Google Sheet.
 */

var DELETE_AFTER_SEND = true;
var SEND_CONFIRMATION_EMAIL = true;
var FORM_TITLE = "Ask for help: Outreach Team";

// Question titles. Keep these in sync with what the server expects (src/lib/google-intake.ts).
var Q = {
  name: "Your name",
  pronouns: "Your pronouns",
  email: "Email",
  contact: "Best place or way to contact you",
  language: "Preferred language",
  urgentNeed: "What do you need most urgently?",
  helpToday: "Do you need help today?",
  needs: "What else can we help with?",
  lgbtqCare: "Would you like LGBTQ+ affirming care?",
  disability: "Do you have a disability, or need any accommodations?",
  accessNeeds: "If yes, what would help us support you?",
  area: "Which area are you in?",
  otherInfo: "Anything else you'd like us to know?",
  consent: "Consent",
};

// Must match NEEDS labels in src/lib/options.ts (checked by tests/google-intake.test.ts).
var NEED_CHOICES = [
  "Medical care",
  "Dental, vision, or hearing",
  "Mental health",
  "Substance use support",
  "Shelter tonight",
  "Housing (longer term)",
  "Food",
  "Showers, laundry, clothing",
  "Benefits (Medi-Cal, CalFresh, cash aid)",
  "ID, documents, or a phone",
  "Transportation",
  "Work or job training",
  "Legal help",
  "Safety (violence or abuse)",
  "Pet care",
];

// Must match LANGUAGES in src/lib/options.ts ("Other" lets people type their language).
var LANGUAGE_CHOICES = ["English", "Spanish", "Vietnamese", "Chinese", "Tagalog"];

// Must match DISABILITY_ANSWERS in src/lib/options.ts.
var DISABILITY_CHOICES = ["Yes", "No", "Prefer not to say"];

// Must match CITIES in src/lib/options.ts.
var AREA_CHOICES = [
  "Mountain View",
  "Sunnyvale",
  "San Jose",
  "Milpitas",
  "Palo Alto",
  "Santa Clara",
  "Other Santa Clara County",
  "East Palo Alto",
  "Menlo Park",
  "Redwood City",
  "Other San Mateo County",
  "Other / not sure",
];

var CONSENT_TEXT =
  "I agree that the outreach case management team may store this information securely and use it to contact me " +
  "and connect me with services. Only the case management team can see it, and it is never sold. I can ask to see " +
  "or delete my information at any time.";

// Help text under each English question.
var HELP = {
  name: "First name or nickname is fine.",
  pronouns: "Optional. For example: she/her, he/him, they/them.",
  email: "Optional. We will send your request number here.",
  contact: "A phone number, or where and when we can usually find you (for example: Hope's Corner on Thursday mornings).",
  urgentNeed: "Share only what you are comfortable with. Please don't include Social Security numbers.",
  lgbtqCare: "Optional. Only the case management team will see your answer.",
  disability: "Optional.",
  accessNeeds: "Optional. For example: wheelchair access, ASL interpreter, large print, help filling out forms.",
  otherInfo: "Optional. Share only what you are comfortable with. Please don't include Social Security numbers.",
};

var DESCRIPTION =
  "Tell us what you need and a case manager from the outreach team will follow up.\n\n" +
  "In danger right now? Call 911. Mental health crisis? Call or text 988, any time.";

// ---------- Languages ----------
// Guests pick a language on the first page and the form jumps to that section.
// Answers are converted back to English before they are sent, so the app and
// case managers always see English choices. Written answers stay as the guest wrote them.
// Translation lists must line up item by item with the English lists above.

// This is the form's only language question: it picks the section to fill out and is
// saved as the guest's preferred language. Languages without their own section use English.
var LANGUAGE_PICKER = "Language / Idioma / Ngôn ngữ";
var LANGUAGE_OPTIONS = [
  { label: "English", section: "en", language: "English" },
  { label: "Español", section: "es", language: "Spanish" },
  { label: "Tiếng Việt", section: "vi", language: "Vietnamese" },
  { label: "中文 (Chinese, form in English)", section: "en", language: "Chinese" },
  { label: "Tagalog (form in English)", section: "en", language: "Tagalog" },
  { label: "Another language (form in English)", section: "en", language: "Other" },
];
var FORM_LANGUAGE_NAMES = { en: "English", es: "Spanish", vi: "Vietnamese" };
var MULTILINGUAL_TITLE = "Ask for help · Pida ayuda · Xin giúp đỡ";
var MULTILINGUAL_DESCRIPTION =
  "Choose your language to start. Elija su idioma para empezar. Chọn ngôn ngữ của bạn để bắt đầu.\n\n" +
  "Emergency / Emergencia / Cấp cứu: 911. Mental health crisis / Crisis de salud mental / Khủng hoảng tâm lý: 988.";
var CONFIRMATION_MESSAGE =
  "Thank you. We got your request and a case manager will reach out. If you gave an email, we sent your request number there.\n\n" +
  "Gracias. Recibimos su solicitud y un administrador de casos se comunicará con usted. Si nos dio un correo electrónico, le enviamos su número de solicitud.\n\n" +
  "Cảm ơn bạn. Chúng tôi đã nhận được yêu cầu và một nhân viên quản lý hồ sơ sẽ liên lạc với bạn. Nếu bạn để lại email, chúng tôi đã gửi mã số yêu cầu đến đó.\n\n" +
  "911 · 988 · 211";

var TRANSLATIONS = {
  es: {
    section: "Español",
    description:
      "Cuéntenos qué necesita y un administrador de casos del equipo de alcance comunitario le contactará.\n\n" +
      "¿Está en peligro ahora? Llame al 911. ¿Crisis de salud mental? Llame o envíe un mensaje de texto al 988, a cualquier hora.",
    q: {
      name: "Su nombre",
      pronouns: "Sus pronombres",
      email: "Correo electrónico",
      contact: "El mejor lugar o forma de contactarle",
      language: "Idioma preferido",
      urgentNeed: "¿Qué es lo que más necesita con urgencia?",
      helpToday: "¿Necesita ayuda hoy?",
      needs: "¿En qué más le podemos ayudar?",
      lgbtqCare: "¿Le gustaría recibir atención que afirme a las personas LGBTQ+?",
      disability: "¿Tiene alguna discapacidad o necesita alguna adaptación?",
      accessNeeds: "Si es así, ¿qué nos ayudaría a apoyarle?",
      area: "¿En qué zona se encuentra?",
      otherInfo: "¿Hay algo más que quiera que sepamos?",
      consent: "Consentimiento",
    },
    help: {
      name: "Basta con su nombre o apodo.",
      pronouns: "Opcional. Por ejemplo: ella, él, elle.",
      email: "Opcional. Le enviaremos aquí su número de solicitud.",
      contact: "Un número de teléfono, o dónde y cuándo podemos encontrarle normalmente (por ejemplo: Hope's Corner los jueves por la mañana).",
      urgentNeed: "Comparta solo lo que le haga sentir cómodo/a. Por favor, no incluya números de Seguro Social.",
      lgbtqCare: "Opcional. Solo el equipo de administración de casos verá su respuesta.",
      disability: "Opcional.",
      accessNeeds: "Opcional. Por ejemplo: acceso para silla de ruedas, intérprete de lenguaje de señas, letra grande, ayuda para llenar formularios.",
      otherInfo: "Opcional. Comparta solo lo que le haga sentir cómodo/a. Por favor, no incluya números de Seguro Social.",
    },
    yesNo: ["Sí", "No"],
    needs: [
      "Atención médica",
      "Dental, vista u oído",
      "Salud mental",
      "Apoyo por uso de sustancias",
      "Refugio para esta noche",
      "Vivienda (a largo plazo)",
      "Comida",
      "Duchas, lavandería, ropa",
      "Beneficios (Medi-Cal, CalFresh, ayuda en efectivo)",
      "Identificación, documentos o un teléfono",
      "Transporte",
      "Trabajo o capacitación laboral",
      "Ayuda legal",
      "Seguridad (violencia o abuso)",
      "Cuidado de mascotas",
    ],
    languages: ["Inglés", "Español", "Vietnamita", "Chino", "Tagalo"],
    disability: ["Sí", "No", "Prefiero no decir"],
    areas: [
      "Mountain View",
      "Sunnyvale",
      "San Jose",
      "Milpitas",
      "Palo Alto",
      "Santa Clara",
      "Otro lugar del condado de Santa Clara",
      "East Palo Alto",
      "Menlo Park",
      "Redwood City",
      "Otro lugar del condado de San Mateo",
      "Otro / no estoy seguro/a",
    ],
    consent:
      "Acepto que el equipo de administración de casos de alcance comunitario guarde esta información de forma segura y la use " +
      "para contactarme y conectarme con servicios. Solo el equipo de administración de casos puede verla y nunca se vende. " +
      "Puedo pedir ver o borrar mi información en cualquier momento.",
    emailSubject: "Recibimos su solicitud",
    emailBody:
      "Gracias por comunicarse. Un administrador de casos del equipo de alcance comunitario se comunicará con usted.\n\n" +
      "Su número de solicitud es {code}. Por favor, menciónelo cuando hable con el equipo.\n\n" +
      "Emergencias: 911\nCrisis de salud mental: llame o envíe un mensaje de texto al 988\nCualquier servicio, las 24 horas: 211\n",
  },
  vi: {
    section: "Tiếng Việt",
    description:
      "Hãy cho chúng tôi biết bạn cần gì, một nhân viên quản lý hồ sơ từ nhóm tiếp cận cộng đồng sẽ liên lạc với bạn.\n\n" +
      "Đang gặp nguy hiểm? Gọi 911. Khủng hoảng sức khỏe tâm thần? Gọi hoặc nhắn tin 988, bất cứ lúc nào.",
    q: {
      name: "Tên của bạn",
      pronouns: "Đại từ nhân xưng của bạn",
      email: "Địa chỉ email",
      contact: "Nơi hoặc cách tốt nhất để liên lạc với bạn",
      language: "Ngôn ngữ ưa thích",
      urgentNeed: "Bạn cần gì gấp nhất?",
      helpToday: "Bạn có cần giúp đỡ ngay hôm nay không?",
      needs: "Chúng tôi có thể giúp gì thêm cho bạn?",
      lgbtqCare: "Bạn có muốn được chăm sóc thân thiện với người LGBTQ+ không?",
      disability: "Bạn có khuyết tật hoặc cần hỗ trợ đặc biệt nào không?",
      accessNeeds: "Nếu có, điều gì sẽ giúp chúng tôi hỗ trợ bạn?",
      area: "Bạn đang ở khu vực nào?",
      otherInfo: "Bạn có muốn cho chúng tôi biết điều gì khác không?",
      consent: "Đồng ý",
    },
    help: {
      name: "Chỉ cần tên hoặc biệt danh.",
      pronouns: "Không bắt buộc. Ví dụ: she/her, he/him, they/them.",
      email: "Không bắt buộc. Chúng tôi sẽ gửi mã số yêu cầu của bạn đến đây.",
      contact: "Số điện thoại, hoặc nơi và lúc chúng tôi thường có thể gặp bạn (ví dụ: Hope's Corner vào sáng thứ Năm).",
      urgentNeed: "Chỉ chia sẻ những gì bạn thấy thoải mái. Xin đừng ghi số An Sinh Xã Hội.",
      lgbtqCare: "Không bắt buộc. Chỉ nhóm quản lý hồ sơ mới thấy câu trả lời của bạn.",
      disability: "Không bắt buộc.",
      accessNeeds: "Không bắt buộc. Ví dụ: lối đi cho xe lăn, thông dịch viên ngôn ngữ ký hiệu, chữ in lớn, giúp điền đơn.",
      otherInfo: "Không bắt buộc. Chỉ chia sẻ những gì bạn thấy thoải mái. Xin đừng ghi số An Sinh Xã Hội.",
    },
    yesNo: ["Có", "Không"],
    needs: [
      "Chăm sóc y tế",
      "Răng, mắt hoặc thính giác",
      "Sức khỏe tâm thần",
      "Hỗ trợ về sử dụng chất gây nghiện",
      "Chỗ ngủ tối nay",
      "Nhà ở (lâu dài)",
      "Thức ăn",
      "Tắm, giặt đồ, quần áo",
      "Trợ cấp (Medi-Cal, CalFresh, trợ cấp tiền mặt)",
      "Giấy tờ tùy thân, giấy tờ hoặc điện thoại",
      "Phương tiện đi lại",
      "Việc làm hoặc đào tạo nghề",
      "Trợ giúp pháp lý",
      "An toàn (bạo lực hoặc lạm dụng)",
      "Chăm sóc thú cưng",
    ],
    languages: ["Tiếng Anh", "Tiếng Tây Ban Nha", "Tiếng Việt", "Tiếng Trung", "Tiếng Tagalog"],
    disability: ["Có", "Không", "Không muốn trả lời"],
    areas: [
      "Mountain View",
      "Sunnyvale",
      "San Jose",
      "Milpitas",
      "Palo Alto",
      "Santa Clara",
      "Nơi khác trong quận Santa Clara",
      "East Palo Alto",
      "Menlo Park",
      "Redwood City",
      "Nơi khác trong quận San Mateo",
      "Khác / không rõ",
    ],
    consent:
      "Tôi đồng ý để nhóm quản lý hồ sơ của chương trình tiếp cận cộng đồng lưu trữ thông tin này một cách an toàn và dùng nó " +
      "để liên lạc với tôi và kết nối tôi với các dịch vụ. Chỉ nhóm quản lý hồ sơ mới xem được và thông tin không bao giờ bị bán. " +
      "Tôi có thể yêu cầu xem hoặc xóa thông tin của mình bất cứ lúc nào.",
    emailSubject: "Chúng tôi đã nhận được yêu cầu của bạn",
    emailBody:
      "Cảm ơn bạn đã liên hệ. Một nhân viên quản lý hồ sơ từ nhóm tiếp cận cộng đồng sẽ liên lạc với bạn.\n\n" +
      "Mã số yêu cầu của bạn là {code}. Vui lòng cho nhóm biết mã số này khi nói chuyện.\n\n" +
      "Cấp cứu: 911\nKhủng hoảng sức khỏe tâm thần: gọi hoặc nhắn tin 988\nMọi dịch vụ, 24 giờ: 211\n",
  },
};

/** Titles, help text and choices for one language ("en", "es" or "vi"). */
function strings_(lang) {
  if (lang === "en") {
    return {
      section: "English",
      description: DESCRIPTION,
      q: Q,
      help: HELP,
      choices: {
        helpToday: ["Yes", "No"],
        lgbtqCare: ["Yes", "No"],
        needs: NEED_CHOICES,
        language: LANGUAGE_CHOICES,
        disability: DISABILITY_CHOICES,
        area: AREA_CHOICES,
      },
      consent: CONSENT_TEXT,
      emailSubject: "We received your request",
      emailBody:
        "Thank you for reaching out. A case manager from the outreach team will contact you.\n\n" +
        "Your request number is {code}. Please mention it when you talk to the team.\n\n" +
        "Emergency: 911\nMental health crisis: call or text 988\nAny service, 24 hours: 211\n",
    };
  }
  var t = TRANSLATIONS[lang];
  return {
    section: t.section,
    description: t.description,
    q: t.q,
    help: t.help,
    choices: {
      helpToday: t.yesNo,
      lgbtqCare: t.yesNo,
      needs: t.needs,
      language: t.languages,
      disability: t.disability,
      area: t.areas,
    },
    consent: t.consent,
    emailSubject: t.emailSubject,
    emailBody: t.emailBody,
  };
}

// Question order within each language section. Consent stays last.
var ORDER = [
  "name", "pronouns", "email", "contact", "urgentNeed", "helpToday",
  "needs", "lgbtqCare", "disability", "accessNeeds", "area", "otherInfo", "consent",
];

/** Run once: creates the form (or reuses it) and installs the submit and retry triggers. */
function setup() {
  config_(); // fail early if properties are missing
  var props = PropertiesService.getScriptProperties();
  var form;
  var formId = props.getProperty("FORM_ID");
  if (formId) {
    form = FormApp.openById(formId);
    addMissingQuestions_(form); // forms made by an older version of this script
    if (addLanguageSections_(form)) applyFormText_(form);
    removeSectionLanguageQuestions_(form);
    setLanguageChoices_(form);
  } else {
    form = buildForm_();
    props.setProperty("FORM_ID", form.getId());
  }

  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger("retryUndelivered").timeBased().everyMinutes(15).create();

  Logger.log("Form ready. Share this link: " + form.getPublishedUrl());
  Logger.log("Edit the form here: " + form.getEditUrl());
  return form.getPublishedUrl();
}

function buildForm_() {
  var form = FormApp.create(MULTILINGUAL_TITLE);
  form.setCollectEmail(false).setAllowResponseEdits(false).setShowLinkToRespondAgain(true);
  try {
    form.setRequireLogin(false); // Workspace forms default to "your organization only"
  } catch (e) {
    // Personal Google accounts do not support this setting; their forms are already public.
  }
  ORDER.forEach(function (key) {
    addQuestion_(form, key, "en");
  });
  addLanguageSections_(form);
  applyFormText_(form);
  return form;
}

/** Form title, intro and thank-you message, in all three languages. */
function applyFormText_(form) {
  if (!form.getTitle() || form.getTitle() === FORM_TITLE) form.setTitle(MULTILINGUAL_TITLE);
  form.setDescription(MULTILINGUAL_DESCRIPTION).setConfirmationMessage(CONFIRMATION_MESSAGE);
}

/** Adds one question in the given language at the end of the form and returns it. */
function addQuestion_(form, key, lang) {
  var S = strings_(lang);
  var title = S.q[key];
  var help = S.help[key];
  var item;
  var choices = function (it, list) {
    return it.setChoices(list.map(function (c) { return it.createChoice(c); }));
  };
  switch (key) {
    case "name":
    case "pronouns":
      item = form.addTextItem().setTitle(title);
      if (key === "name") item.setRequired(true);
      break;
    case "email":
      item = form.addTextItem().setTitle(title).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
      break;
    case "contact":
    case "urgentNeed":
      item = form.addParagraphTextItem().setTitle(title).setRequired(true);
      break;
    case "accessNeeds":
    case "otherInfo":
      item = form.addParagraphTextItem().setTitle(title);
      break;
    case "helpToday":
    case "lgbtqCare":
    case "disability":
      item = form.addMultipleChoiceItem().setTitle(title);
      choices(item, S.choices[key]);
      break;
    case "needs":
      item = form.addCheckboxItem().setTitle(title);
      choices(item, S.choices.needs);
      break;
    case "area":
      item = form.addListItem().setTitle(title);
      choices(item, S.choices.area);
      break;
    case "consent":
      item = form.addCheckboxItem().setTitle(title).setRequired(true);
      choices(item, [S.consent]);
      break;
  }
  if (help) item.setHelpText(help);
  return item;
}

/** Adds questions introduced after the form was first created, keeping Consent last. */
function addMissingQuestions_(form) {
  var titles = form.getItems().map(function (i) { return i.getTitle(); });
  var has = function (t) { return titles.indexOf(t) !== -1; };
  var place = function (item, afterTitle) {
    var items = form.getItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle() === afterTitle) {
        form.moveItem(item.getIndex(), i + 1);
        return;
      }
    }
  };
  if (!has(Q.pronouns)) place(addQuestion_(form, "pronouns", "en"), Q.name);
  if (!has(Q.lgbtqCare)) place(addQuestion_(form, "lgbtqCare", "en"), Q.needs);
  if (!has(Q.disability)) place(addQuestion_(form, "disability", "en"), Q.lgbtqCare);
  if (!has(Q.accessNeeds)) place(addQuestion_(form, "accessNeeds", "en"), Q.disability);
  if (!has(Q.otherInfo)) place(addQuestion_(form, "otherInfo", "en"), Q.area);
}

/**
 * Turns an English-only form into: a language question, then an English, Spanish and
 * Vietnamese section. The existing English questions (and the form's link) stay as they are.
 * Returns false if the form already has the language sections.
 */
function addLanguageSections_(form) {
  var already = form.getItems().some(function (i) { return i.getTitle() === LANGUAGE_PICKER; });
  if (already) return false;

  var picker = form
    .addMultipleChoiceItem()
    .setTitle(LANGUAGE_PICKER)
    .setHelpText("Choose your language. Elija su idioma. Chọn ngôn ngữ của bạn.")
    .setRequired(true);
  form.moveItem(picker.getIndex(), 0);
  var english = form.addPageBreakItem().setTitle("English").setHelpText(DESCRIPTION);
  form.moveItem(english.getIndex(), 1);

  ["es", "vi"].forEach(function (lang) {
    var S = strings_(lang);
    // A section break's "go to" applies to the section before it: finish that language and submit.
    form
      .addPageBreakItem()
      .setTitle(S.section)
      .setHelpText(S.description)
      .setGoToPage(FormApp.PageNavigationType.SUBMIT);
    ORDER.forEach(function (key) {
      addQuestion_(form, key, lang);
    });
  });

  setLanguageChoices_(form);
  return true;
}

/** Points each choice of the language question at its section. Safe to run again. */
function setLanguageChoices_(form) {
  var picker = null;
  var pages = {};
  var sectionTitles = { English: "en" };
  sectionTitles[strings_("es").section] = "es";
  sectionTitles[strings_("vi").section] = "vi";
  form.getItems().forEach(function (item) {
    var title = item.getTitle();
    if (title === LANGUAGE_PICKER) picker = item.asMultipleChoiceItem();
    else if (sectionTitles[title] && item.getType() === FormApp.ItemType.PAGE_BREAK) pages[sectionTitles[title]] = item.asPageBreakItem();
  });
  if (!picker || !pages.en || !pages.es || !pages.vi) return;
  picker.setChoices(
    LANGUAGE_OPTIONS.map(function (o) {
      return picker.createChoice(o.label, pages[o.section]);
    }),
  );
}

/**
 * Earlier versions also asked "Preferred language" inside each section. The language question
 * at the start now covers it, so those repeats are removed.
 */
function removeSectionLanguageQuestions_(form) {
  var repeats = [Q.language, strings_("es").q.language, strings_("vi").q.language];
  form.getItems().forEach(function (item) {
    if (repeats.indexOf(item.getTitle()) !== -1) form.deleteItem(item);
  });
}

/** Trigger: runs on every form submission. */
function onFormSubmit(e) {
  deliver_(e.response);
}

/** Trigger: every 15 minutes, resends anything that failed (e.g. the app was down). */
function retryUndelivered() {
  var form = getForm_();
  form.getResponses().forEach(function (r) {
    deliver_(r);
  });
}

function deliver_(response) {
  var cfg = config_();
  var payload = JSON.stringify(toPayload_(response));
  var timestamp = String(Math.floor(Date.now() / 1000));
  var signature = toHex_(Utilities.computeHmacSha256Signature(timestamp + "." + payload, cfg.secret));

  var res;
  try {
    res = UrlFetchApp.fetch(cfg.url + "/api/intake/google", {
      method: "post",
      contentType: "application/json",
      payload: payload,
      headers: { "X-ConnectCare-Timestamp": timestamp, "X-ConnectCare-Signature": signature },
      muteHttpExceptions: true,
      followRedirects: false,
    });
  } catch (e) {
    // Network errors throw even with muteHttpExceptions. Keep the response for retryUndelivered().
    console.error("Could not reach ConnectCare for submission " + response.getId() + ": " + e);
    return false;
  }
  var code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    // Keep the response in Google Forms; retryUndelivered() will try again.
    console.error("ConnectCare rejected submission " + response.getId() + ": HTTP " + code + " " + res.getContentText());
    return false;
  }
  var result = JSON.parse(res.getContentText());
  if (code === 201 && SEND_CONFIRMATION_EMAIL) sendConfirmation_(response, result.clientCode);
  if (DELETE_AFTER_SEND) {
    try {
      getForm_().deleteResponse(response.getId());
    } catch (e) {
      // Already deleted by an overlapping run (submit trigger and retry at the same time).
    }
  }
  return true;
}

/** Which question (and in which language) an item title belongs to. */
function questionFor_(title) {
  var langs = ["en", "es", "vi"];
  for (var i = 0; i < langs.length; i++) {
    var q = strings_(langs[i]).q;
    for (var key in q) {
      if (q[key] === title) return { key: key, lang: langs[i] };
    }
  }
  return null;
}

/** A translated choice back to its English wording (unknown values, like "Other" answers, pass through). */
function toEnglish_(lang, key, value) {
  var list = strings_(lang).choices[key];
  var i = list ? list.indexOf(value) : -1;
  return i === -1 ? value : strings_("en").choices[key][i];
}

/** The answer to the language question: which section they used and their preferred language. */
function languageChoiceOf_(response) {
  var choice = LANGUAGE_OPTIONS[0];
  response.getItemResponses().forEach(function (ir) {
    if (ir.getItem().getTitle() !== LANGUAGE_PICKER) return;
    LANGUAGE_OPTIONS.forEach(function (o) {
      if (o.label === String(ir.getResponse())) choice = o;
    });
  });
  return choice;
}

function toPayload_(response) {
  var answers = {
    name: "", pronouns: "", email: "", contact: "", language: "", urgentNeed: "", helpToday: "",
    needs: [], lgbtqCare: "", disability: "", accessNeeds: "", area: "", otherInfo: "", consent: false,
  };
  response.getItemResponses().forEach(function (ir) {
    var found = questionFor_(ir.getItem().getTitle());
    if (!found) return;
    var key = found.key;
    var value = ir.getResponse();
    if (key === "consent") answers.consent = [].concat(value).length > 0;
    else if (key === "needs") answers.needs = [].concat(value).map(function (v) { return toEnglish_(found.lang, "needs", String(v)); });
    else answers[key] = toEnglish_(found.lang, key, String(value));
  });
  var choice = languageChoiceOf_(response);
  // Older forms asked "Preferred language" again inside each section; otherwise the first question answers it.
  if (!answers.language) answers.language = choice.language;
  answers.formLanguage = FORM_LANGUAGE_NAMES[choice.section];
  return {
    responseId: response.getId(),
    submittedAt: response.getTimestamp().toISOString(),
    answers: answers,
  };
}

function sendConfirmation_(response, clientCode) {
  var email = "";
  response.getItemResponses().forEach(function (ir) {
    var found = questionFor_(ir.getItem().getTitle());
    if (found && found.key === "email") email = String(ir.getResponse()).trim();
  });
  if (!email || !clientCode) return;
  var S = strings_(languageChoiceOf_(response).section);
  MailApp.sendEmail({ to: email, subject: S.emailSubject, body: S.emailBody.replace("{code}", clientCode) });
}

function getForm_() {
  var id = PropertiesService.getScriptProperties().getProperty("FORM_ID");
  if (!id) throw new Error("Run setup() first.");
  return FormApp.openById(id);
}

function config_() {
  var props = PropertiesService.getScriptProperties();
  var url = (props.getProperty("CONNECTCARE_URL") || "").replace(/\/+$/, "");
  var secret = props.getProperty("CONNECTCARE_SECRET") || "";
  if (!/^https:\/\//.test(url) && !/^http:\/\/localhost/.test(url)) {
    throw new Error("Set the CONNECTCARE_URL script property to your app's https:// address.");
  }
  if (secret.length < 32) throw new Error("Set the CONNECTCARE_SECRET script property (at least 32 characters).");
  return { url: url, secret: secret };
}

function toHex_(bytes) {
  return bytes
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    })
    .join("");
}
