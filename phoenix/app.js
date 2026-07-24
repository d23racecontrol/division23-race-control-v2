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
const rollenAnzeige = document.getElementById("rollen-anzeige");
const adminBereich = document.getElementById("admin-bereich");
const benutzerStatus = document.getElementById("benutzer-status");
const benutzerListe = document.getElementById("benutzer-liste");
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

async function aktualisiereLoginAnsicht(session) {
  loginBereich.hidden = Boolean(session);
  angemeldetBereich.hidden = !session;
  if (!session) {
  rollenAnzeige.textContent = "";
  adminBereich.hidden = true;
  benutzerStatus.textContent = "";
benutzerListe.innerHTML = "";
  return;
}
const { data: profil, error } = await supabaseClient
  .from("phoenix_profiles")
  .select("role")
  .eq("id", session.user.id)
  .single();
  if (error) {
  rollenAnzeige.textContent = "Rolle konnte nicht geladen werden";
  return;
}
rollenAnzeige.textContent = `Rolle: ${profil.role}`;
adminBereich.hidden = profil.role !== "admin";
if (profil.role === "admin") {
  await ladeBenutzer();
}
}

async function pruefeAnmeldestatus() {
  const { data } = await supabaseClient.auth.getSession();
  aktualisiereLoginAnsicht(data.session);
  await pruefeDatenbankverbindung();
}
async function ladeBenutzer() {
  benutzerStatus.textContent = "Benutzer werden geladen …";
  benutzerListe.innerHTML = "";
  const { data: benutzer, error } = await supabaseClient
  .from("phoenix_profiles")
  .select("id, email, role, created_at")
  .order("created_at", { ascending: true });
  if (error) {
  benutzerStatus.textContent = "Benutzer konnten nicht geladen werden.";
  return;}
  benutzerStatus.textContent = `${benutzer.length} Benutzer gefunden.`;
  benutzer.forEach((eintrag) => {
  const benutzerKarte = document.createElement("article");
  benutzerKarte.className = "benutzer-karte";
  benutzerKarte.textContent = `${eintrag.email} – Rolle: ${eintrag.role}`;
  benutzerListe.appendChild(benutzerKarte);
});

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