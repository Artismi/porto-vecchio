package it.artismi.portovecchio;
import android.view.View; import android.webkit.WebChromeClient; import android.widget.FrameLayout;
// requestFullscreen() del sito («Schermo intero» nel menu del Game Boy): la vista a tutto schermo sopra la WebView
public class Chrome extends WebChromeClient {
  final Main m; View custom; CustomViewCallback cb;
  Chrome(Main m) { this.m = m; }
  @Override public void onShowCustomView(View v, CustomViewCallback c) {
    if (custom != null) { onHideCustomView(); }
    custom = v; cb = c;
    m.root.addView(v, new FrameLayout.LayoutParams(-1, -1));
    m.w.setVisibility(View.INVISIBLE); m.hide();
  }
  @Override public void onHideCustomView() {
    if (custom == null) return;
    m.root.removeView(custom); custom = null;
    m.w.setVisibility(View.VISIBLE);
    if (cb != null) { cb.onCustomViewHidden(); cb = null; }
    m.hide();
  }
}
