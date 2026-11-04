package mg.alumg.app;

import android.content.Context;
import android.webkit.CookieManager;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

// Toutes les ~15 min, même application fermée : demande au site le nombre de non lus avec la session du WebView et met la pastille à jour.
public class UnreadWorker extends Worker {
    static final String SITE = "https://alumg.vercel.app";

    public UnreadWorker(@NonNull Context ctx, @NonNull WorkerParameters params) {
        super(ctx, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            String cookie = CookieManager.getInstance().getCookie(SITE);
            if (cookie == null || cookie.isEmpty()) {
                Badge.update(getApplicationContext(), 0); // déconnecté
                return Result.success();
            }
            HttpURLConnection c = (HttpURLConnection) new URL(SITE + "/api/badge").openConnection();
            c.setConnectTimeout(10000);
            c.setReadTimeout(10000);
            c.setRequestProperty("Cookie", cookie);
            int code = c.getResponseCode();
            if (code == 401 || code == 403) {
                Badge.update(getApplicationContext(), 0);
                return Result.success();
            }
            if (code != 200) return Result.retry();
            try (InputStream in = c.getInputStream()) {
                byte[] buf = in.readAllBytes();
                Badge.update(getApplicationContext(), new JSONObject(new String(buf, "UTF-8")).optInt("count", 0));
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
