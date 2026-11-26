package mg.alumg.devis;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

// Le WebView d'Android ignore window.print() : la page appelle AluMgPrint.print(), qui ouvre le service d'impression
// du téléphone (imprimante Wi-Fi ou « Enregistrer en PDF ») sur la page affichée. Les règles @media print n'en gardent que la feuille.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new PrintBridge(), "AluMgPrint");
    }

    private class PrintBridge {
        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(() -> {
                WebView web = getBridge().getWebView();
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                String name = title == null || title.isEmpty() ? "AluMg" : title;
                pm.print(name, web.createPrintDocumentAdapter(name), null);
            });
        }
    }
}
