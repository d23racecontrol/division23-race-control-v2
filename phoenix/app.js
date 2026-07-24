async function pruefeDatenbankverbindung() {
  const statusAnzeige = document.getElementById("database-status");

  const { data, error } = await supabaseClient
    .from("phoenix_status")
    .select("status")
    .limit(1)
    .maybeSingle();

  if (error) {
    statusAnzeige.textContent = "Datenbankverbindung fehlgeschlagen";
    console.error("Supabase-Verbindung fehlgeschlagen:", error);
    return;
  }

  statusAnzeige.textContent =
    data?.status === "verbunden"
      ? "Datenbankverbindung: verbunden ✅"
      : "Datenbankverbindung: kein Status gefunden";
}



const loginFormular = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

loginFormular.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const passwort = document.getElementById("login-password").value;

  loginStatus.textContent = "Anmeldung wird geprüft …";

 const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: passwort
  });

  if (error) {
    loginStatus.textContent =
      "Anmeldung fehlgeschlagen – bitte E-Mail und Passwort prüfen.";
    return;
  }
aktualisiereLoginAnsicht(data.session);
  loginStatus.textContent = "Erfolgreich angemeldet ✅";
});

const loginBereich = document.getElementById("login-bereich");
const angemeldetBereich = document.getElementById("angemeldet-bereich");
const abmeldenButton = document.getElementById("abmelden-button");

function aktualisiereLoginAnsicht(session) {
  loginBereich.hidden = Boolean(session);
  angemeldetBereich.hidden = !session;
}

async function pruefeAnmeldestatus() {
  const { data } = await supabaseClient.auth.getSession();
  aktualisiereLoginAnsicht(data.session);
  await pruefeDatenbankverbindung();
}

supabaseClient.auth.onAuthStateChange((_ereignis, session) => {
  aktualisiereLoginAnsicht(session);
});

pruefeAnmeldestatus();

abmeldenButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Abmelden fehlgeschlagen – bitte erneut versuchen.");
    return;
  }

  loginStatus.textContent = "Erfolgreich abgemeldet.";
});