package com.datrah.erp;

import android.os.Bundle;
import android.graphics.Color;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Evita que la barra de estado y la barra de navegación del sistema se superpongan sobre el contenido
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        
        // Asigna el color de fondo obsidian (#090d16) a la barra de estado y de navegación
        getWindow().setStatusBarColor(Color.parseColor("#090d16"));
        getWindow().setNavigationBarColor(Color.parseColor("#090d16"));
        
        WindowInsetsControllerCompat insetsController = 
            new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        // Iconos claros/blancos sobre fondo oscuro
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);
    }
}
