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

pruefeDatenbankverbindung();