package com.phoenixfactory.photonic;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotonicBackendPlugin.class);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) {
                    moveTaskToBack(true);
                    return;
                }
                bridge.eval(
                    "window.__photonicHandleBack ? window.__photonicHandleBack() : false",
                    value -> {
                        boolean handled = value != null && value.trim().equals("true");
                        if (!handled) {
                            moveTaskToBack(true);
                        }
                    }
                );
            }
        });
    }
}