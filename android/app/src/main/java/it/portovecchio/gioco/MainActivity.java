package it.portovecchio.gioco;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Porto Vecchio: la pagina /porto-vecchio del sito in una WebView a schermo intero, nel verso del telefono (il Game Boy si
 * dispone da sé in verticale e di traverso, come sul sito). In / l'ingresso (il Game Boy di artismi, compilato da android/ingresso),
 * in /gioco/ il gioco di v7/ (index.html, mondo_cotto.js, assets/), come PROGETTI.game.path sul sito.
 * Gli asset dell'APK si servono da https://appassets.androidplatform.net/
 * con WebViewAssetLoader: un'origine https vera (fetch, DecompressionStream, i lavoratori e WebGL2 come sul sito), niente file://.
 * Le funzioni del server (/api/: la mente dei personaggi, lo stato, i ritocchi dello Studio) qui non ci sono: rispondono 503 e il
 * gioco passa da solo al ripiego senza rete, come quando il server non risponde.
 * Il tasto Indietro non chiude l'app: manda Esc al gioco (chiude menu e pannelli); due volte entro 2 s esce. «Esci» nel menu del gioco
 * (la console lo passa alla pagina) chiude l'app: PVApp.esci().
 */
public class MainActivity extends Activity {
    static final String ORIGINE = "https://" + WebViewAssetLoader.DEFAULT_DOMAIN;
    private WebView web;
    private Scarico scarico;
    private long ultimoIndietro = 0;
    private Object richiamoIndietro;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle stato) {
        super.onCreate(stato);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                    ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        prestazioni(w);

        scarico = new Scarico(this);
        if (!scarico.pronti()) new Thread(scarico, "tasselli").start();   // mentre la pagina e il Game Boy si caricano
        // [prestazioni] nella build di prova (-Pprova: un altro applicationId) il debug della WebView acceso: chrome://inspect dal computer col
        // cavo USB vede la pagina (DevTools, Performance). Mai nell'APK vera (v7/squadra/prestazioni/MISURA_TELEFONO.md)
        if (!"it.portovecchio.gioco".equals(getPackageName())) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(0xFF16121B);
        // [fluido3] la WebView disegna sulla scheda video (mai LAYER_TYPE_SOFTWARE: senza WebGL) e senza un livello suo fuori schermo
        // (LAYER_TYPE_HARDWARE la ricopierebbe in una tessitura a ogni fotogramma): il compositore di Chromium va dritto alla finestra
        web.setLayerType(View.LAYER_TYPE_NONE, null);
        // il processo della pagina tiene la priorità alta anche quando la memoria scarseggia (Android 8+)
        if (Build.VERSION.SDK_INT >= 26) web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        setContentView(web);
        // [fluido3] la WebView è opaca e copre tutto: lo sfondo della finestra (il colore del tema) non si ridisegna sotto a ogni fotogramma
        w.setBackgroundDrawable(null);
        immersivo();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);   // l'audio senza il primo tocco
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setOffscreenPreRaster(false);
        s.setTextZoom(100);

        // i .gz stanno negli asset come .gz.pv (aapt toglierebbe l'estensione): app/build.gradle, copiaGioco
        final WebViewAssetLoader.AssetsPathHandler asset = new WebViewAssetLoader.AssetsPathHandler(this);
        // [tasselli] la città a tasselli: scaricata alla prima apertura (Scarico), poi servita dalla memoria dell'app come un asset.
        // Finché non è tutta qui, /gioco/tasselli/ dà solo quello che sta nell'APK (insegne4.json) e il gioco costruisce la città
        final WebViewAssetLoader.InternalStoragePathHandler[] locali = { null };
        final WebViewAssetLoader caricatore = new WebViewAssetLoader.Builder()
                .addPathHandler("/gioco/tasselli/", percorso -> {
                    if (scarico.pronti()) {
                        if (locali[0] == null) locali[0] = new WebViewAssetLoader.InternalStoragePathHandler(this, scarico.dir);
                        if (new java.io.File(scarico.dir, percorso).exists()) return locali[0].handle(percorso);
                    }
                    return asset.handle("gioco/tasselli/" + percorso);
                })
                .addPathHandler("/api/", percorso -> senzaServer())
                .addPathHandler("/gioco/api/", percorso -> senzaServer())   // i ritocchi dello Studio (relativi alla pagina del gioco)
                .addPathHandler("/", percorso -> asset.handle(percorso.endsWith(".gz") ? percorso + ".pv" : percorso))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return caricatore.shouldInterceptRequest(r.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                // si resta nel gioco: un collegamento esterno non apre niente dentro la WebView
                return !ORIGINE.equals(r.getUrl().getScheme() + "://" + r.getUrl().getHost());
            }

            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                // il processo della pagina è caduto (memoria): si rifà la WebView invece di chiudere l'app
                ricrea();
                return true;
            }
        });

        web.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void esci() { runOnUiThread(MainActivity.this::finish); }
            // [prestazioni] la misura delle prestazioni (il riquadro del gioco, «Manda la misura»): negli appunti e nel foglio di condivisione di
            // Android (WhatsApp, posta…), così il riassunto arriva a chi lo deve leggere senza ricopiarlo
            @android.webkit.JavascriptInterface
            public void condividi(String testo) {
                runOnUiThread(() -> {
                    try {
                        android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                        if (cm != null) cm.setPrimaryClip(android.content.ClipData.newPlainText("Porto Vecchio · misura", testo));
                        android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_SEND);
                        i.setType("text/plain");
                        i.putExtra(android.content.Intent.EXTRA_SUBJECT, "Porto Vecchio · misura delle prestazioni");
                        i.putExtra(android.content.Intent.EXTRA_TEXT, testo);
                        startActivity(android.content.Intent.createChooser(i, "Manda la misura"));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Misura copiata negli appunti", Toast.LENGTH_SHORT).show();
                    }
                });
            }
            // lo stato dei tasselli per la pagina d'attesa (attesa.html): {stato: via|fatto|errore|niente, p, fatti, totale, motivo}
            @android.webkit.JavascriptInterface
            public String scarico() { return scarico.json(); }
        }, "PVApp");
        registraIndietro();
        web.loadUrl(ORIGINE + "/index.html");
    }

    /**
     * [fluido3] Le prestazioni costanti (v7/FLUIDO3.md).
     * - Lo schermo a 60 Hz: il gioco sul telefono va a 30 regolari (peso_ritmo.js: un fotogramma ogni due giri dello schermo); su uno schermo
     *   a 90/120 Hz il browser girava a 90/120 i suoi giri (requestAnimationFrame di tutti i moduli, il compositore) per disegnarne 30.
     *   A 60 Hz: metà dei giri a vuoto, 30 = 60/2 senza scatti (a 90 Hz 30 è 90/3, ma ogni giro costa). La scelta finale è del sistema.
     * - Le prestazioni sostenute (Android 7+, dove il telefono le offre): frequenze che il telefono regge senza scaldarsi, invece del
     *   picco dei primi minuti e poi il taglio termico (i fotogrammi che calano dopo 5-10 minuti di gioco). Solo mentre il gioco è davanti.
     */
    private void prestazioni(Window w) {
        try {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.preferredRefreshRate = 60f;
            if (Build.VERSION.SDK_INT >= 23) {
                android.view.Display d = getWindowManager().getDefaultDisplay();
                android.view.Display.Mode cur = d.getMode(), best = null;
                for (android.view.Display.Mode m : d.getSupportedModes()) {
                    if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
                    float r = m.getRefreshRate(); if (r < 59f) continue;
                    if (best == null || Math.abs(r - 60f) < Math.abs(best.getRefreshRate() - 60f)) best = m;
                }
                if (best != null && best.getRefreshRate() < 61f) lp.preferredDisplayModeId = best.getModeId();
            }
            w.setAttributes(lp);
        } catch (Exception e) { /* il sistema decide comunque */ }
        sostenuto(w, true);
    }

    private void sostenuto(Window w, boolean on) {
        if (Build.VERSION.SDK_INT < 24) return;
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && pm.isSustainedPerformanceModeSupported()) w.setSustainedPerformanceMode(on);
        } catch (Exception e) { /* non offerto */ }
    }

    private static WebResourceResponse senzaServer() {
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-store");
        return new WebResourceResponse("application/json", "utf-8", 503, "Service Unavailable", h,
                new ByteArrayInputStream("{\"ok\":false,\"offline\":true}".getBytes(StandardCharsets.UTF_8)));
    }

    private void ricrea() {
        if (web != null) {
            android.view.ViewGroup p = (android.view.ViewGroup) web.getParent();
            if (p != null) p.removeView(web);
            web.destroy();
            web = null;
        }
        recreate();
    }

    private void immersivo() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    // ---- Indietro: Esc alla pagina, due volte per uscire ----
    private void registraIndietro() {
        if (Build.VERSION.SDK_INT >= 33) {
            OnBackInvokedCallback cb = this::indietro;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, cb);
            richiamoIndietro = cb;
        }
    }

    private void indietro() {
        long ora = SystemClock.uptimeMillis();
        if (ora - ultimoIndietro < 2000) { finish(); return; }
        ultimoIndietro = ora;
        // Esc al gioco nel riquadro, non alla pagina: sulla pagina Esc chiude la console (e l'app)
        if (web != null) web.evaluateJavascript(
                "(function(){try{var f=document.querySelector('iframe'),d=f&&f.contentWindow&&f.contentWindow.document;if(!d)return;"
                        + "var t=d.activeElement||d.body,o={key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true,cancelable:true};"
                        + "t.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown',o));t.dispatchEvent(new f.contentWindow.KeyboardEvent('keyup',o));}catch(e){}})()", null);
        Toast.makeText(this, R.string.esci, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {   // fino ad Android 12 (dal 13 passa da OnBackInvokedCallback)
        indietro();
    }

    @Override
    public void onWindowFocusChanged(boolean fuoco) {
        super.onWindowFocusChanged(fuoco);
        if (fuoco) immersivo();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();   // in pausa niente fotogrammi né audio
        sostenuto(getWindow(), false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        sostenuto(getWindow(), true);
        immersivo();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && richiamoIndietro != null)
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) richiamoIndietro);
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
