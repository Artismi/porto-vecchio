package it.portovecchio.gioco;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * La città a tasselli alla prima apertura. L'APK non li porta (peserebbe 75 MB): li scarica dal sito del gioco, quelli cotti per
 * l'impronta di questa pagina (gioco/tasselli/apk.json, scritto dalla build: impronta e indirizzo), file per file, nella memoria
 * dell'app (files/tasselli/<impronta>/). Un file arrivato resta: se la rete cade, alla prossima apertura si riparte da lì.
 * Quando ci sono tutti si scrive «fatto» e MainActivity li serve in /gioco/tasselli/ come se fossero nell'APK.
 * Se l'impronta del sito non è quella dell'APK (il sito è più nuovo o più vecchio), o manca la rete, niente: il gioco costruisce la
 * città sul telefono come senza tasselli. La pagina d'attesa (attesa.html) legge lo stato da PVApp.scarico().
 */
final class Scarico implements Runnable {
    private final Context ctx;
    volatile String stato = "via";   // via | fatto | errore | niente (nessuna impronta nell'APK)
    volatile String motivo = "";
    volatile long fatti = 0, totale = 0;
    final String impronta, base;
    final File dir;

    Scarico(Context c) {
        ctx = c.getApplicationContext();
        String imp = null, b = null;
        try (InputStream in = ctx.getAssets().open("gioco/tasselli/apk.json")) {
            JSONObject j = new JSONObject(new String(leggi(in), StandardCharsets.UTF_8));
            imp = j.optString("impronta", null); b = j.optString("base", null);
        } catch (Exception e) { motivo = "apk.json: " + e; }
        impronta = imp; base = b;
        dir = imp == null ? null : new File(new File(ctx.getFilesDir(), "tasselli"), imp);
        if (imp == null || b == null) stato = "niente";
        else if (new File(dir, "fatto").exists()) stato = "fatto";
    }

    boolean pronti() { return "fatto".equals(stato); }

    String json() {
        try {
            JSONObject o = new JSONObject();
            o.put("stato", stato); o.put("motivo", motivo); o.put("impronta", impronta == null ? "" : impronta);
            o.put("fatti", fatti); o.put("totale", totale); o.put("p", totale > 0 ? Math.min(1.0, (double) fatti / totale) : 0);
            return o.toString();
        } catch (Exception e) { return "{\"stato\":\"" + stato + "\"}"; }
    }

    @Override public void run() {
        if (!"via".equals(stato)) return;
        try {
            dir.mkdirs();
            // l'indice: l'impronta deve essere quella della pagina dell'APK
            byte[] ind = prendi(base + "indice.json?v=" + impronta, 3);
            JSONObject j = new JSONObject(new String(ind, StandardCharsets.UTF_8));
            if (!impronta.equals(j.optString("impronta"))) { stato = "errore"; motivo = "il sito ha i tasselli " + j.optString("impronta") + ", l'APK " + impronta; return; }
            // i file: i tasselli, la sagoma, i dati, i graffiti, le tessiture (del telefono quando ci sono), le insegne vive
            List<String[]> L = new ArrayList<>();   // [percorso, byte attesi o -1]
            JSONArray T = j.getJSONArray("tasselli");
            for (int i = 0; i < T.length(); i++) { JSONObject t = T.getJSONObject(i); L.add(new String[]{t.getString("file"), String.valueOf(t.optLong("byte", -1))}); }
            JSONObject sg = j.optJSONObject("sagoma"); if (sg != null) L.add(new String[]{sg.getString("file"), String.valueOf(sg.optLong("byte", -1))});
            JSONObject da = j.optJSONObject("dati"); if (da != null) { L.add(new String[]{da.getString("file"), "-1"}); if (da.optLong("vivi", 0) > 0) L.add(new String[]{"vivi.bin", String.valueOf(da.optLong("vivi"))}); }
            JSONObject gr = j.optJSONObject("graffiti"); if (gr != null) L.add(new String[]{gr.getString("file"), "-1"});
            JSONArray X = j.optJSONArray("tessiture");
            if (X != null) for (int i = 0; i < X.length(); i++) { JSONObject x = X.optJSONObject(i); if (x == null || !x.has("file")) continue;
                JSONObject tel = x.optJSONObject("tel");
                if (tel != null) L.add(new String[]{"tex/" + tel.getString("file"), String.valueOf(tel.optLong("byte", -1))});
                else L.add(new String[]{"tex/" + x.getString("file"), String.valueOf(x.optLong("byte", -1))}); }
            long tot = 0; for (String[] f : L) tot += Math.max(20000, Long.parseLong(f[1])); totale = tot;
            for (String[] f : L) {
                File out = new File(dir, f[0]); long atteso = Long.parseLong(f[1]);
                if (out.exists() && (atteso < 0 || out.length() == atteso)) { fatti += Math.max(20000, atteso); continue; }
                byte[] b = prendi(base + f[0] + "?v=" + impronta, 4);
                if (atteso >= 0 && b.length != atteso) throw new Exception(f[0] + ": " + b.length + " byte invece di " + atteso);
                scrivi(out, b); fatti += Math.max(20000, atteso);
            }
            // insegne4.json: la cottura nuova lo scrive, una vecchia no (allora le insegne prendono le correzioni da dati.json)
            try { scrivi(new File(dir, "insegne4.json"), prendi(base + "insegne4.json?v=" + impronta, 2)); } catch (Exception e) { /* facoltativo */ }
            scrivi(new File(dir, "indice.json"), ind);
            scrivi(new File(dir, "fatto"), impronta.getBytes(StandardCharsets.UTF_8));
            // le cotture di altre impronte (APK vecchi) se ne vanno
            File[] altre = dir.getParentFile().listFiles();
            if (altre != null) for (File a : altre) if (!a.getName().equals(impronta)) cancella(a);
            stato = "fatto";
        } catch (Exception e) { stato = "errore"; motivo = String.valueOf(e); }
    }

    private static byte[] prendi(String u, int tentativi) throws Exception {
        Exception ultimo = null;
        for (int k = 0; k < tentativi; k++) {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(u).openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(30000);
                int code = c.getResponseCode(); if (code != 200) throw new Exception(u + " → " + code);
                try (InputStream in = c.getInputStream()) { return leggi(in); }
            } catch (Exception e) { ultimo = e; try { Thread.sleep(800L * (k + 1)); } catch (InterruptedException ie) { break; } }
            finally { if (c != null) c.disconnect(); }
        }
        throw ultimo;
    }

    private static byte[] leggi(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[65536]; int n;
        while ((n = in.read(b)) > 0) o.write(b, 0, n); return o.toByteArray();
    }

    private static void scrivi(File f, byte[] b) throws Exception {
        f.getParentFile().mkdirs(); File tmp = new File(f.getPath() + ".part");
        try (OutputStream o = new FileOutputStream(tmp)) { o.write(b); }
        if (!tmp.renameTo(f)) throw new Exception("non si scrive " + f);
    }

    private static void cancella(File f) { File[] L = f.listFiles(); if (L != null) for (File x : L) cancella(x); f.delete(); }
}
