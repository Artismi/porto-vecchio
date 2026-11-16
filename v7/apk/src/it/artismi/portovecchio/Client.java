package it.artismi.portovecchio;
import android.content.Intent; import android.net.Uri; import android.webkit.*;
// Il sito di Artismi resta nella WebView; gli altri indirizzi (Instagram, LinkedIn, WhatsApp, mail, telefono) vanno alle loro app
public class Client extends WebViewClient {
  final Main m; Client(Main m) { this.m = m; }
  static boolean nostro(Uri u) {
    String h = u.getHost(), s = u.getScheme();
    if (h == null || !("https".equals(s) || "http".equals(s))) return false;
    return h.equals("artismidesignstudio.com") || h.endsWith(".artismidesignstudio.com");
  }
  @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
    if (!r.isForMainFrame()) return false;
    Uri u = r.getUrl(); if (nostro(u)) return false;
    try {
      Intent i = "intent".equals(u.getScheme()) ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, u);
      i.addCategory(Intent.CATEGORY_BROWSABLE); i.setComponent(null); i.setSelector(null);
      m.startActivity(i);
    } catch (Exception e) { }
    return true;
  }
}
