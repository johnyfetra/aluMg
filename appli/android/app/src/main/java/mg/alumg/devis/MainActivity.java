package mg.alumg.devis;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;

// Le WebView d'Android ignore window.print() : la page appelle AluMgPrint.print(), qui ouvre le service d'impression
// du téléphone (imprimante Wi-Fi ou « Enregistrer en PDF ») sur la page affichée. Les règles @media print n'en gardent que la feuille.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new PrintBridge(), "AluMgPrint");
        getBridge().getWebView().addJavascriptInterface(new ShareBridge(), "AluMgShare");
    }

    // Envoi direct d'un PDF du cache dans WhatsApp (puis WhatsApp Business) ; false si aucun n'est installé : la page ouvre alors la feuille de partage.
    private class ShareBridge {
        @JavascriptInterface
        public boolean whatsapp(String fileUri, String text) {
            Uri uri;
            try {
                // seulement un fichier du cache de l'application (chemin canonique : ni « ../ » ni dossier voisin)
                File file = new File(Uri.parse(fileUri).getPath()).getCanonicalFile();
                if (!file.getPath().startsWith(getCacheDir().getCanonicalPath() + File.separator)) return false;
                uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
            } catch (Exception e) {
                return false;
            }
            for (String pkg : new String[] { "com.whatsapp", "com.whatsapp.w4b" }) {
                Intent send = new Intent(Intent.ACTION_SEND).setType("application/pdf").setPackage(pkg)
                    .putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_TEXT, text)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    startActivity(send);
                    return true;
                } catch (ActivityNotFoundException e) {
                    // pas installé : essai suivant
                }
            }
            return false;
        }
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
