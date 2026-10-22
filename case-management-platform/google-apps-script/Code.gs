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
  email: "Email",
  contact: "Best place or way to contact you",
  urgentNeed: "What do you need most urgently?",
  helpToday: "Do you need help today?",
  needs: "What else can we help with?",
  area: "Which area are you in?",
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

/** Run once: creates the form (or reuses it) and installs the submit and retry triggers. */
function setup() {
  config_(); // fail early if properties are missing
  var props = PropertiesService.getScriptProperties();
  var form;
  var formId = props.getProperty("FORM_ID");
  if (formId) {
    form = FormApp.openById(formId);
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
  var form = FormApp.create(FORM_TITLE);
  form
    .setDescription(
      "Tell us what you need and a case manager from the outreach team will follow up.\n\n" +
        "In danger right now? Call 911. Mental health crisis? Call or text 988, any time.",
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(true)
    .setConfirmationMessage(
      "Thank you. We got your request and a case manager will reach out. " +
        "If you gave an email, we sent your request number there.\n\n" +
        "Emergency: 911. Mental health crisis: 988. Any service, 24 hours: 211.",
    );
  try {
    form.setRequireLogin(false); // Workspace forms default to "your organization only"
  } catch (e) {
    // Personal Google accounts do not support this setting; their forms are already public.
  }

  form.addTextItem().setTitle(Q.name).setHelpText("First name or nickname is fine.").setRequired(true);
  form
    .addTextItem()
    .setTitle(Q.email)
    .setHelpText("Optional. We will send your request number here.")
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form
    .addParagraphTextItem()
    .setTitle(Q.contact)
    .setHelpText("A phone number, or where and when we can usually find you (for example: Hope's Corner on Thursday mornings).")
    .setRequired(true);
  form
    .addParagraphTextItem()
    .setTitle(Q.urgentNeed)
    .setHelpText("Share only what you are comfortable with. Please don't include Social Security numbers.")
    .setRequired(true);
  var today = form.addMultipleChoiceItem().setTitle(Q.helpToday);
  today.setChoices([today.createChoice("Yes"), today.createChoice("No")]);
  var needs = form.addCheckboxItem().setTitle(Q.needs);
  needs.setChoices(NEED_CHOICES.map(function (c) { return needs.createChoice(c); }));
  var area = form.addListItem().setTitle(Q.area);
  area.setChoices(AREA_CHOICES.map(function (c) { return area.createChoice(c); }));
  var consent = form.addCheckboxItem().setTitle(Q.consent).setRequired(true);
  consent.setChoices([consent.createChoice(CONSENT_TEXT)]);
  return form;
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

function toPayload_(response) {
  var answers = { name: "", email: "", contact: "", urgentNeed: "", helpToday: "", needs: [], area: "", consent: false };
  response.getItemResponses().forEach(function (ir) {
    var title = ir.getItem().getTitle();
    var value = ir.getResponse();
    if (title === Q.name) answers.name = String(value);
    else if (title === Q.email) answers.email = String(value);
    else if (title === Q.contact) answers.contact = String(value);
    else if (title === Q.urgentNeed) answers.urgentNeed = String(value);
    else if (title === Q.helpToday) answers.helpToday = String(value);
    else if (title === Q.needs) answers.needs = [].concat(value).map(String);
    else if (title === Q.area) answers.area = String(value);
    else if (title === Q.consent) answers.consent = [].concat(value).length > 0;
  });
  return {
    responseId: response.getId(),
    submittedAt: response.getTimestamp().toISOString(),
    answers: answers,
  };
}

function sendConfirmation_(response, clientCode) {
  var email = "";
  response.getItemResponses().forEach(function (ir) {
    if (ir.getItem().getTitle() === Q.email) email = String(ir.getResponse()).trim();
  });
  if (!email || !clientCode) return;
  MailApp.sendEmail({
    to: email,
    subject: "We received your request",
    body:
      "Thank you for reaching out. A case manager from the outreach team will contact you.\n\n" +
      "Your request number is " + clientCode + ". Please mention it when you talk to the team.\n\n" +
      "Emergency: 911\nMental health crisis: call or text 988\nAny service, 24 hours: 211\n",
  });
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
