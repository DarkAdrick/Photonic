package com.phoenixfactory.photonic;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotonicBackendPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
