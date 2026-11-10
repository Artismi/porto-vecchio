package it.artismi.portovecchio;
import android.app.Activity; import android.os.Bundle; import android.view.*; import android.webkit.*; import android.widget.FrameLayout;
// Porto Vecchio: il sito di Artismi (https://www.artismidesignstudio.com/porto-vecchio, il gioco nel Game Boy) in una WebView a tutto schermo.
public class Main extends Activity {
  static final String START = "https://www.artismidesignstudio.com/porto-vecchio";
  WebView w; FrameLayout root; Chrome chrome;
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    if (android.os.Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
    root = new FrameLayout(this); root.setBackgroundColor(0xff000000);
    w = new WebView(this);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setAllowFileAccess(false); s.setAllowContentAccess(false);
    s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true); s.setSupportZoom(false);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    CookieManager.getInstance().setAcceptCookie(true);
    chrome = new Chrome(this); w.setWebChromeClient(chrome);
    w.setWebViewClient(new Client(this));
    root.addView(w, new FrameLayout.LayoutParams(-1, -1));
    setContentView(root);
    hide();
    if (b == null || w.restoreState(b) == null) w.loadUrl(START);
  }
  void hide() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  }
  @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hide(); }
  @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); w.saveState(o); }
  @Override public void onBackPressed() {
    if (chrome.custom != null) { chrome.onHideCustomView(); return; }
    if (w.canGoBack()) w.goBack(); else super.onBackPressed();
  }
  @Override protected void onPause() { super.onPause(); w.onPause(); }
  @Override protected void onResume() { super.onResume(); w.onResume(); hide(); }
  @Override protected void onDestroy() { if (w != null) { root.removeView(w); w.destroy(); } super.onDestroy(); }
}
