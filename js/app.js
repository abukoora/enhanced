import { CONFIG } from "./config.js";
import { state, subscribe, STAGES } from "./state.js";
import { signUp, signIn, signOut, loadProfile, updateProfileStage, initAuthListener } from "./auth.js";
import { loadContents, loadProgress, markComplete, getStageLabel, getProgressSummary } from "./dashboard.js";
import { listJournalEntries, addJournalEntry } from "./journal.js";
import { listTickets, createTicket, listMessages, sendMessage, subscribeToTicket } from "./support.js";
import { el, escapeHtml, sanitizeUrl } from "./utils/sanitize.js";

// ---------------------------------------------------------------
// عناصر DOM الرئيسية
// ---------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const viewAuth = $("#view-auth");
const viewOnboarding = $("#view-onboarding");
const appShell = $("#app-shell");

let activeUnsubscribeTicket = null;
let selectedMood = "😊";
let currentTicketId = null;

// ---------------------------------------------------------------
// Toast بسيط
// ---------------------------------------------------------------
function toast(message, type = "info") {
  const node = el("div", { className: `toast ${type === "error" ? "error" : ""}`, text: message });
  $("#toast-root").appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

// ---------------------------------------------------------------
// المصادقة: تبديل بين تسجيل الدخول وإنشاء الحساب
// ---------------------------------------------------------------
$("#link-to-signup").addEventListener("click", (e) => {
  e.preventDefault();
  $("#form-signin").classList.add("hidden");
  $("#form-signup").classList.remove("hidden");
});
$("#link-to-signin").addEventListener("click", (e) => {
  e.preventDefault();
  $("#form-signup").classList.add("hidden");
  $("#form-signin").classList.remove("hidden");
});

$("#form-signin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await signIn({
      email: $("#signin-email").value.trim(),
      password: $("#signin-password").value,
    });
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
});

$("#form-signup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await signUp({
      email: $("#signup-email").value.trim(),
      password: $("#signup-password").value,
      displayName: $("#signup-name").value.trim(),
      gender: $("#signup-gender").value,
    });
    toast("تم إنشاء الحساب! يمكنك الآن تسجيل الدخول.");
    $("#form-signup").classList.add("hidden");
    $("#form-signin").classList.remove("hidden");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
});

$("#btn-signout").addEventListener("click", async () => {
  if (activeUnsubscribeTicket) activeUnsubscribeTicket();
  await signOut();
});

// ---------------------------------------------------------------
// Onboarding (مرة واحدة لكل مستخدم — تُحفظ محلياً)
// ---------------------------------------------------------------
const ONBOARDING_SLIDES = [
  { icon: "🧭", title: "رحلة من 4 مراحل", text: "من ما قبل الخطوبة حتى استقرار الأسرة، محتوى مخصص لكل مرحلة تمر بها." },
  { icon: "📔", title: "مذكراتك خاصة تماماً", text: "مساحة شخصية لتدوين أفكارك ومشاعرك، لا يراها أحد حتى المشرفون." },
  { icon: "💬", title: "دعم دائم بجانبك", text: "افتح تذكرة دعم أو تواصل مباشرة عبر واتساب في أي وقت." },
];
let onboardingIndex = 0;

function renderOnboarding() {
  const slide = ONBOARDING_SLIDES[onboardingIndex];
  const container = $("#onboarding-slide");
  container.innerHTML = "";
  container.appendChild(
    el("div", {}, [
      el("div", { text: slide.icon, attrs: { style: "font-size:3rem; margin-bottom: 12px;" } }),
      el("h2", { text: slide.title, attrs: { style: "margin-bottom: 8px; color: var(--color-primary-dark);" } }),
      el("p", { text: slide.text, attrs: { style: "color: var(--color-text-muted); font-family: var(--font-utility);" } }),
    ])
  );
  const dots = $("#onboarding-dots");
  dots.innerHTML = "";
  ONBOARDING_SLIDES.forEach((_, i) => {
    dots.appendChild(el("span", { className: i === onboardingIndex ? "active" : "" }));
  });
  $("#btn-onboarding-next").textContent = onboardingIndex === ONBOARDING_SLIDES.length - 1 ? "ابدأ الآن" : "التالي";
}

$("#btn-onboarding-next").addEventListener("click", () => {
  if (onboardingIndex < ONBOARDING_SLIDES.length - 1) {
    onboardingIndex++;
    renderOnboarding();
  } else {
    finishOnboarding();
  }
});
$("#btn-onboarding-skip").addEventListener("click", finishOnboarding);

function finishOnboarding() {
  localStorage.setItem(`onboarding_done_${state.session.user.id}`, "1");
  showApp();
}

// ---------------------------------------------------------------
// حلقات المراحل: تلوين الحلقة بناءً على المرحلة الحالية للمستخدم
// ---------------------------------------------------------------
function paintStageRings() {
  const order = ["pre_engagement", "engaged", "newlywed", "settled"];
  const currentIndex = order.indexOf(state.profile?.stage);
  $$(".stage-ring").forEach((ring) => {
    order.forEach((key, i) => {
      ring.style.setProperty(`--seg${i + 1}`, i <= currentIndex ? "var(--color-accent)" : "var(--color-border)");
    });
  });
}

// ---------------------------------------------------------------
// إظهار التطبيق الرئيسي بعد تسجيل الدخول
// ---------------------------------------------------------------
async function showApp() {
  viewAuth.classList.add("hidden");
  viewOnboarding.classList.add("hidden");
  appShell.classList.remove("hidden");

  $("#header-username").textContent = state.profile.display_name || "مستخدم";
  $("#header-stage").textContent = getStageLabel(state.profile.stage);
  $("#profile-name").value = state.profile.display_name || "";
  $("#profile-stage").value = state.profile.stage;

  const waNumber = state.profile.whatsapp_number || CONFIG.WHATSAPP_DEFAULT_NUMBER;
  $("#whatsapp-fab").href = sanitizeUrl(`https://wa.me/${waNumber.replace(/\D/g, "")}`);

  paintStageRings();

  try {
    await loadContents();
    await loadProgress();
  } catch (err) {
    toast(err.message, "error");
  }

  navigate(location.hash.replace("#", "") || "dashboard");
}

// ---------------------------------------------------------------
// الراوتر (Hash-based)
// ---------------------------------------------------------------
const ROUTES = ["dashboard", "lesson", "journal", "support", "ticket", "profile"];

function navigate(route) {
  if (!ROUTES.includes(route)) route = "dashboard";
  if (activeUnsubscribeTicket && route !== "ticket") {
    activeUnsubscribeTicket();
    activeUnsubscribeTicket = null;
  }
  ROUTES.forEach((r) => $(`#view-${r}`).classList.toggle("hidden", r !== route));
  $$(".nav-item[data-route]").forEach((n) => n.classList.toggle("active", n.dataset.route === route));
  location.hash = route;

  if (route === "dashboard") renderDashboard();
  if (route === "journal") renderJournal();
  if (route === "support") renderTickets();
}

$$(".nav-item[data-route]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(link.dataset.route);
  });
});

// ---------------------------------------------------------------
// لوحة التحكم + قائمة الدروس
// ---------------------------------------------------------------
function renderDashboard() {
  const summary = getProgressSummary();
  $("#hero-title").textContent = `أهلاً ${state.profile.display_name || ""} 👋`;
  $("#hero-subtitle").textContent = `أنت الآن في مرحلة: ${getStageLabel(state.profile.stage)}`;
  $("#hero-percent").textContent = `${summary.percent}%`;

  const list = $("#content-list");
  list.innerHTML = "";

  if (state.contents.length === 0) {
    list.appendChild(
      el("div", { className: "empty-state" }, [
        el("div", { className: "icon", text: "📭" }),
        el("p", { text: "لا توجد دروس متاحة لمرحلتك حالياً، تابعنا قريباً." }),
      ])
    );
    return;
  }

  // ✅ تجميع الدروس حسب الفئة (الدورة)
  const groups = {};
  state.contents.forEach((content) => {
    const cat = content.category || "دروس عامة";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(content);
  });

  // عرض كل مجموعة كدورة قابلة للطي
  Object.keys(groups).forEach((category) => {
    const lessons = groups[category];
    
    // إنشاء بطاقة الدورة
    const courseCard = el("div", { className: "lesson-card", attrs: { style: "padding: var(--space-3); cursor: pointer;" } }, [
      el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center;" } }, [
        el("h3", { text: category, attrs: { style: "margin: 0; font-size: 1.1rem; color: var(--color-primary);" } }),
        el("span", { text: `📂 ${lessons.length} دروس`, attrs: { style: "font-size: 0.85rem; color: var(--color-text-muted);" } })
      ])
    ]);

    // إنشاء حاوية الدروس المخفية بداية
    const lessonsContainer = el("div", { attrs: { style: "display: none; margin-top: var(--space-3);" } });
    
    lessons.forEach((content) => {
      const done = state.progressByContentId.has(content.id);
      const lessonItem = el("div", { 
        className: "lesson-card", 
        attrs: { 
          style: "padding: var(--space-3); margin-bottom: var(--space-2); cursor: pointer; border-inline-start: 4px solid var(--color-accent);" 
        } 
      }, [
        done ? el("span", { className: "badge-done", text: "✓ مكتمل", attrs: { style: "margin-bottom: 4px;" } }) : null,
        el("h4", { text: content.title, attrs: { style: "margin: 0; font-size: 1rem;" } }),
        el("p", { className: "excerpt", text: (content.body || "").slice(0, 60) + "…", attrs: { style: "margin-top: 4px; font-size: 0.85rem;" } })
      ]);
      
      lessonItem.addEventListener("click", (e) => {
        e.stopPropagation();
        openLesson(content.id);
      });
      lessonsContainer.appendChild(lessonItem);
    });

    // إضافة حدث الضغط على الدورة لفتح/إغلاق الدروس
    courseCard.addEventListener("click", () => {
      const isHidden = lessonsContainer.style.display === "none";
      lessonsContainer.style.display = isHidden ? "block" : "none";
      courseCard.style.background = isHidden ? "var(--color-surface-2)" : "var(--color-surface)";
    });

    list.appendChild(courseCard);
    list.appendChild(lessonsContainer);
  });
}
// ---------------------------------------------------------------
// المذكرات
// ---------------------------------------------------------------
$$(".mood-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedMood = btn.dataset.mood;
    $$(".mood-option").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});
$(".mood-option")?.classList.add("selected");

async function renderJournal() {
  const list = $("#journal-list");
  list.innerHTML = "";
  list.appendChild(el("div", { className: "spinner" }));
  try {
    const entries = await listJournalEntries();
    list.innerHTML = "";
    if (entries.length === 0) {
      list.appendChild(
        el("div", { className: "empty-state" }, [
          el("div", { className: "icon", text: "📝" }),
          el("p", { text: "لم تكتب أي مذكرة بعد، ابدأ الآن." }),
        ])
      );
      return;
    }
    entries.forEach((entry) => {
      const date = new Date(entry.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
      list.appendChild(
        el("div", { className: "journal-entry" }, [
          el("div", {}, [
            el("span", { className: "mood", text: entry.mood || "📝" }),
            entry.title ? el("strong", { text: "  " + entry.title }) : null,
          ]),
          el("p", { text: entry.body, attrs: { style: "margin: 8px 0;" } }),
          el("div", { className: "date", text: date }),
        ])
      );
    });
  } catch (err) {
    list.innerHTML = "";
    toast(err.message, "error");
  }
}

$("#form-journal").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bodyEl = $("#journal-body");
  const titleEl = $("#journal-title");
  try {
    await addJournalEntry({ title: titleEl.value.trim(), body: bodyEl.value.trim(), mood: selectedMood });
    bodyEl.value = "";
    titleEl.value = "";
    toast("تم حفظ مذكرتك 📔");
    renderJournal();
  } catch (err) {
    toast(err.message, "error");
  }
});

// ---------------------------------------------------------------
// الدعم الفني
// ---------------------------------------------------------------
async function renderTickets() {
  const list = $("#ticket-list");
  list.innerHTML = "";
  list.appendChild(el("div", { className: "spinner" }));
  try {
    const tickets = await listTickets();
    list.innerHTML = "";
    if (tickets.length === 0) {
      list.appendChild(
        el("div", { className: "empty-state" }, [
          el("div", { className: "icon", text: "💬" }),
          el("p", { text: "لا توجد تذاكر دعم بعد." }),
        ])
      );
      return;
    }
    tickets.forEach((t) => {
      const item = el("div", { className: "ticket-item" }, [
        el("span", { text: t.subject }),
        el("span", { className: `ticket-status ${t.status}`, text: t.status === "open" ? "مفتوحة" : "مغلقة" }),
      ]);
      item.addEventListener("click", () => openTicket(t.id, t.subject));
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = "";
    toast(err.message, "error");
  }
}

$("#form-new-ticket").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#ticket-subject");
  try {
    const t = await createTicket(input.value.trim());
    input.value = "";
    toast("تم فتح التذكرة");
    await renderTickets();
    openTicket(t.id, t.subject);
  } catch (err) {
    toast(err.message, "error");
  }
});

async function openTicket(id, subject) {
  currentTicketId = id;
  $("#ticket-title").textContent = subject;
  navigate("ticket");
  await renderMessages();

  if (activeUnsubscribeTicket) activeUnsubscribeTicket();
  activeUnsubscribeTicket = subscribeToTicket(id, (msg) => {
    appendMessageBubble(msg);
  });
}

async function renderMessages() {
  const thread = $("#chat-thread");
  thread.innerHTML = "";
  try {
    const messages = await listMessages(currentTicketId);
    messages.forEach(appendMessageBubble);
    thread.scrollTop = thread.scrollHeight;
  } catch (err) {
    toast(err.message, "error");
  }
}

function appendMessageBubble(msg) {
  const isMe = msg.sender_id === state.session.user.id;
  const thread = $("#chat-thread");
  thread.appendChild(el("div", { className: `chat-bubble ${isMe ? "me" : "them"}`, text: msg.message }));
  thread.scrollTop = thread.scrollHeight;
}

$("#btn-back-to-support").addEventListener("click", () => navigate("support"));

$("#form-chat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    await sendMessage(currentTicketId, text);
  } catch (err) {
    toast(err.message, "error");
  }
});

// ---------------------------------------------------------------
// الحساب
// ---------------------------------------------------------------
$("#btn-save-stage").addEventListener("click", async () => {
  try {
    await updateProfileStage($("#profile-stage").value);
    $("#header-stage").textContent = getStageLabel(state.profile.stage);
    paintStageRings();
    toast("تم تحديث مرحلتك بنجاح");
    await loadContents();
    await loadProgress();
  } catch (err) {
    toast(err.message, "error");
  }
});

// ---------------------------------------------------------------
// نقطة البداية: مراقبة حالة الجلسة
// ---------------------------------------------------------------
initAuthListener(async (session) => {
  if (!session) {
    appShell.classList.add("hidden");
    viewOnboarding.classList.add("hidden");
    viewAuth.classList.remove("hidden");
    return;
  }
  try {
    await loadProfile(session.user.id);
    const onboardingDone = localStorage.getItem(`onboarding_done_${session.user.id}`);
    if (!onboardingDone) {
      viewAuth.classList.add("hidden");
      appShell.classList.add("hidden");
      viewOnboarding.classList.remove("hidden");
      onboardingIndex = 0;
      renderOnboarding();
    } else {
      showApp();
    }
  } catch (err) {
    toast(err.message, "error");
  }
});

window.addEventListener("hashchange", () => {
  if (!appShell.classList.contains("hidden")) {
    navigate(location.hash.replace("#", ""));
  }
});

// ---------------------------------------------------------------
// تسجيل Service Worker (PWA)
// ---------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
