
// ===================================
// SUPABASE CONNECTION
// ===================================

const SUPABASE_URL = "https://kvtwgwvycxsffysnwtqa.supabase.co";
const SUPABASE_KEY = "sb_publishable_fqv4Vy8q_iLpbwfIY34nqg_FsRof_LJ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const ADMIN_EMAIL = "combathungr@gmail.com";

// ===================================
// PAGE ELEMENTS
// ===================================

const loginSection = document.querySelector("#admin-login");
const dashboardSection = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#login-form");
const eventForm = document.querySelector("#event-form");
const message = document.querySelector("#admin-message");
const eventsList = document.querySelector("#admin-events-list");

let currentSession = null;
let currentImageUrl = null;

// ===================================
// MESSAGES
// ===================================

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#b00020" : "green";
}

// ===================================
// LOGIN
// ===================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.querySelector("#admin-email").value.trim();
  const password = document.querySelector("#admin-password").value;

  if (email.toLowerCase() !== ADMIN_EMAIL) {
    showMessage("This email is not authorized.", true);
    return;
  }

  showMessage("Logging in...");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  currentSession = data.session;
  await checkAdminAccess();
});

// ===================================
// CHECK ADMIN ACCESS
// ===================================

async function checkAdminAccess() {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user ||
      data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    await supabaseClient.auth.signOut();
    currentSession = null;
    loginSection.style.display = "block";
    dashboardSection.style.display = "none";
    showMessage("You are not authorized to access this page.", true);
    return;
  }

  loginSection.style.display = "none";
  dashboardSection.style.display = "block";

  showMessage("Welcome to the COMBAT HUNGER event dashboard!");

  await loadAdminEvents();
}

// Check for an existing login when the page opens.
async function checkExistingLogin() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    currentSession = data.session;
    await checkAdminAccess();
  }
}

// ===================================
// LOAD EVENTS FOR ADMIN
// ===================================

async function loadAdminEvents() {
  eventsList.textContent = "Loading events...";

  const { data: events, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    eventsList.textContent = "Could not load events: " + error.message;
    return;
  }

  eventsList.replaceChildren();

  if (!events || events.length === 0) {
    eventsList.textContent = "No events have been added yet.";
    return;
  }

  events.forEach((event) => {
    const card = document.createElement("div");
    card.className = "admin-event";

    const title = document.createElement("h3");
    title.textContent = event.title;

    const date = document.createElement("p");
    date.textContent = event.event_date
      ? new Date(event.event_date + "T12:00:00")
          .toLocaleDateString()
      : "No date set";

    const status = document.createElement("p");
    status.textContent = event.is_published
      ? "Published"
      : "Hidden";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editEvent(event));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteEvent(event));

    card.append(title, date, status, editButton, deleteButton);
    eventsList.appendChild(card);
  });
}

// ===================================
// ADD OR EDIT EVENT
// ===================================

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentSession) {
    showMessage("Please log in first.", true);
    return;
  }

  const eventId = document.querySelector("#event-id").value;
  const imageFile = document.querySelector("#event-image").files[0];

  let imageUrl = currentImageUrl;

  // Upload a new photo if one was selected.
  if (imageFile) {
    showMessage("Uploading photo...");

    const fileExtension = imageFile.name.split(".").pop();
    const fileName =
      `${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("event-images")
      .upload(fileName, imageFile, {
        contentType: imageFile.type
      });

    if (uploadError) {
      showMessage("Photo upload failed: " + uploadError.message, true);
      return;
    }

    const { data: urlData } = supabaseClient.storage
      .from("event-images")
      .getPublicUrl(fileName);

    imageUrl = urlData.publicUrl;
  }

  const eventData = {
    title: document.querySelector("#event-title").value.trim(),
    event_date: document.querySelector("#event-date").value || null,
    event_time: document.querySelector("#event-time").value.trim(),
    location: document.querySelector("#event-location").value.trim(),
    description: document.querySelector("#event-description").value.trim(),
    image_url: imageUrl,
    registration_url:
      document.querySelector("#event-registration").value.trim(),
    is_published:
      document.querySelector("#event-published").checked,
    updated_at: new Date().toISOString()
  };

  let result;

  if (eventId) {
    result = await supabaseClient
      .from("events")
      .update(eventData)
      .eq("id", eventId);
  } else {
    result = await supabaseClient
      .from("events")
      .insert([eventData]);
  }

  if (result.error) {
    showMessage("Could not save event: " + result.error.message, true);
    return;
  }

  showMessage(eventId ? "Event updated!" : "Event added!");

  resetEventForm();
  await loadAdminEvents();
});

// ===================================
// EDIT EVENT
// ===================================

function editEvent(event) {
  document.querySelector("#event-id").value = event.id;
  document.querySelector("#event-title").value = event.title || "";
  document.querySelector("#event-date").value = event.event_date || "";
  document.querySelector("#event-time").value = event.event_time || "";
  document.querySelector("#event-location").value = event.location || "";
  document.querySelector("#event-description").value =
    event.description || "";
  document.querySelector("#event-registration").value =
    event.registration_url || "";
  document.querySelector("#event-published").checked =
    event.is_published;

  currentImageUrl = event.image_url || null;

  document.querySelector("#form-heading").textContent = "Edit Event";
  document.querySelector("#save-event-button").textContent =
    "Update Event";
  document.querySelector("#cancel-edit").style.display = "inline-block";

  showMessage("Editing: " + event.title);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===================================
// DELETE EVENT
// ===================================

async function deleteEvent(event) {
  const confirmed = confirm(
    `Are you sure you want to delete "${event.title}"?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("events")
    .delete()
    .eq("id", event.id);

  if (error) {
    showMessage("Could not delete event: " + error.message, true);
    return;
  }

  showMessage("Event deleted.");
  await loadAdminEvents();
}

// ===================================
// RESET EVENT FORM
// ===================================

function resetEventForm() {
  eventForm.reset();

  document.querySelector("#event-id").value = "";
  document.querySelector("#form-heading").textContent =
    "Add a New Event";
  document.querySelector("#save-event-button").textContent =
    "Save Event";
  document.querySelector("#cancel-edit").style.display = "none";

  currentImageUrl = null;
}

document.querySelector("#cancel-edit").addEventListener("click", () => {
  resetEventForm();
  showMessage("Editing cancelled.");
});

// ===================================
// LOG OUT
// ===================================

document.querySelector("#logout-button").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();

  currentSession = null;
  loginForm.reset();

  loginSection.style.display = "block";
  dashboardSection.style.display = "none";

  showMessage("You have been logged out.");
});

// ===================================
// START
// ===================================

checkExistingLogin();
