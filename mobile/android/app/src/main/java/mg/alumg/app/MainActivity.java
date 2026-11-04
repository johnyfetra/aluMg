package mg.alumg.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    // Seule porte ouverte au site : fixer le nombre affiché sur l'icône. Le WebView ne charge que alumg.vercel.app (les autres liens s'ouvrent dehors).
    private final class Native {
        @JavascriptInterface
        public void setBadge(int count) {
            Badge.update(getApplicationContext(), Math.max(0, Math.min(count, 999)));
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.getWebView().addJavascriptInterface(new Native(), "AluMgNative");
        // Le WebView ignore les téléchargements : on confie le fichier (nouvelle version de l'APK) au navigateur du téléphone.
        bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {
                // aucun navigateur : rien à faire
            }
        });
        if (Build.VERSION.SDK_INT >= 33) ActivityCompat.requestPermissions(this, new String[] {"android.permission.POST_NOTIFICATIONS"}, 1);
        PeriodicWorkRequest poll = new PeriodicWorkRequest.Builder(UnreadWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("unread", ExistingPeriodicWorkPolicy.KEEP, poll);
    }
}
