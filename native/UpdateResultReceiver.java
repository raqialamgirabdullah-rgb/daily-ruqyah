package com.dailyruqyah.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.widget.Toast;

// PackageInstaller-এর ফল: ফোন নিশ্চিত করতে চাইলে সেই পর্দা খোলে
public class UpdateResultReceiver extends BroadcastReceiver {
    @Override
    @SuppressWarnings("deprecation")
    public void onReceive(Context c, Intent i) {
        int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, -1);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent ui = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (ui != null) {
                ui.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    c.startActivity(ui);
                } catch (Exception e) {
                    Toast.makeText(c, "নিশ্চিত করার পর্দা খুলল না — আবার চেষ্টা করুন", Toast.LENGTH_LONG).show();
                }
            }
        } else if (st != PackageInstaller.STATUS_SUCCESS) {
            String m = i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            Toast.makeText(c, "আপডেট হয়নি: " + (m == null ? "" : m), Toast.LENGTH_LONG).show();
        }
    }
}
