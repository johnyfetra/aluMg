package mg.alumg.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

// Pastille du nombre de non lus sur l'icône : Android la tire d'une notification silencieuse qui porte ce nombre ; à zéro, on la retire.
final class Badge {
    private static final String CHANNEL = "unread";
    private static final int ID = 1;

    private Badge() {}

    static void update(Context ctx, int count) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (count <= 0) {
            nm.cancel(ID);
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, ctx.getString(R.string.unread_channel), NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(true);
            ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        nm.notify(ID, new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_alumg)
            .setContentTitle(ctx.getString(R.string.app_name))
            .setContentText(ctx.getResources().getQuantityString(R.plurals.unread_text, count, count))
            .setNumber(count)
            .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setOngoing(false)
            .setAutoCancel(false)
            .setContentIntent(pi)
            .build());
    }
}
