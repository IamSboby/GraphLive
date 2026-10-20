package com.graphlive.android;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GraphLivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
