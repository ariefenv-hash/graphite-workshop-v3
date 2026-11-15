package com.materialyou.capacitor;

import android.app.WallpaperColors;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.material.color.DynamicColors;

import org.json.JSONObject;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Capacitor bridge that exposes the Android system's Material You (Monet)
 * palette to the WebView.
 *
 * <p>Android 12+: resolves the exact color roles the system UI uses by
 * wrapping a Material 3 theme with {@link DynamicColors#wrapContextIfAvailable}
 * and reading the resolved attribute values. Both the light and the dark
 * role sets are returned in a single call so the web side can switch instantly.</p>
 *
 * <p>Below Android 12 (8.1+): returns the wallpaper's primary
 * {@link WallpaperColors} color as a seed so the web side can generate a full
 * MD3 palette with @material/material-color-utilities (the same algorithm
 * family the system uses).</p>
 *
 * <p>No permissions are required: color role resolution needs no special
 * access and reading wallpaper <em>colors</em> (not the wallpaper bitmap) is
 * permission-free.</p>
 */
@CapacitorPlugin(name = "MaterialYou")
public class MaterialYouPlugin extends Plugin {

    /**
     * MD3 color role key (camelCase, matching the web Material 3 scheme
     * naming) -> Material Components attribute resource id. Ordered for
     * readability; the JSON payload keeps this order.
     */
    private static final Map<String, Integer> ROLE_ATTRS;

    static {
        Map<String, Integer> m = new LinkedHashMap<>();
        // Primary role
        m.put("primary", com.google.android.material.R.attr.colorPrimary);
        m.put("onPrimary", com.google.android.material.R.attr.colorOnPrimary);
        m.put("primaryContainer", com.google.android.material.R.attr.colorPrimaryContainer);
        m.put("onPrimaryContainer", com.google.android.material.R.attr.colorOnPrimaryContainer);
        // Secondary role
        m.put("secondary", com.google.android.material.R.attr.colorSecondary);
        m.put("onSecondary", com.google.android.material.R.attr.colorOnSecondary);
        m.put("secondaryContainer", com.google.android.material.R.attr.colorSecondaryContainer);
        m.put("onSecondaryContainer", com.google.android.material.R.attr.colorOnSecondaryContainer);
        // Tertiary role
        m.put("tertiary", com.google.android.material.R.attr.colorTertiary);
        m.put("onTertiary", com.google.android.material.R.attr.colorOnTertiary);
        m.put("tertiaryContainer", com.google.android.material.R.attr.colorTertiaryContainer);
        m.put("onTertiaryContainer", com.google.android.material.R.attr.colorOnTertiaryContainer);
        // Surface hierarchy (material >= 1.8 required for the container roles)
        m.put("surface", com.google.android.material.R.attr.colorSurface);
        m.put("surfaceDim", com.google.android.material.R.attr.colorSurfaceDim);
        m.put("surfaceBright", com.google.android.material.R.attr.colorSurfaceBright);
        m.put("surfaceContainerLowest", com.google.android.material.R.attr.colorSurfaceContainerLowest);
        m.put("surfaceContainerLow", com.google.android.material.R.attr.colorSurfaceContainerLow);
        m.put("surfaceContainer", com.google.android.material.R.attr.colorSurfaceContainer);
        m.put("surfaceContainerHigh", com.google.android.material.R.attr.colorSurfaceContainerHigh);
        m.put("surfaceContainerHighest", com.google.android.material.R.attr.colorSurfaceContainerHighest);
        m.put("onSurface", com.google.android.material.R.attr.colorOnSurface);
        m.put("onSurfaceVariant", com.google.android.material.R.attr.colorOnSurfaceVariant);
        // Inverse roles
        m.put("inverseSurface", com.google.android.material.R.attr.colorInverseSurface);
        m.put("inverseOnSurface", com.google.android.material.R.attr.colorInverseOnSurface);
        m.put("inversePrimary", com.google.android.material.R.attr.colorInversePrimary);
        // Outline & error roles
        m.put("outline", com.google.android.material.R.attr.colorOutline);
        m.put("outlineVariant", com.google.android.material.R.attr.colorOutlineVariant);
        m.put("error", com.google.android.material.R.attr.colorError);
        m.put("onError", com.google.android.material.R.attr.colorOnError);
        m.put("errorContainer", com.google.android.material.R.attr.colorErrorContainer);
        m.put("onErrorContainer", com.google.android.material.R.attr.colorOnErrorContainer);
        ROLE_ATTRS = Collections.unmodifiableMap(m);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        int sdkInt = Build.VERSION.SDK_INT;
        boolean monet = sdkInt >= 31 && DynamicColors.isDynamicColorAvailable();
        ret.put("available", monet);
        ret.put("monetAvailable", monet);
        ret.put("sdkInt", sdkInt);
        call.resolve(ret);
    }

    @PluginMethod
    public void getSystemColors(PluginCall call) {
        Context base = bridge.getContext();
        int sdkInt = Build.VERSION.SDK_INT;

        // 1) Android 12+ Monet dynamic color: resolve both palettes.
        boolean monet = sdkInt >= 31 && DynamicColors.isDynamicColorAvailable();
        JSObject lightRoles = new JSObject();
        JSObject darkRoles = new JSObject();
        if (monet) {
            try {
                lightRoles = resolveRoles(wrapDynamic(base, false));
                darkRoles = resolveRoles(wrapDynamic(base, true));
            } catch (Exception ignored) {
                lightRoles = new JSObject();
                darkRoles = new JSObject();
                monet = false;
            }
        }

        // 2) Wallpaper seed fallback (Android 8.1+). Reported even when Monet
        //    works, so the web side can fill any role the host material
        //    version failed to resolve.
        String wallpaperSeed = readWallpaperSeed(base, sdkInt);

        // 3) System dark mode.
        boolean isDark = (base.getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;

        String source;
        if (monet && lightRoles.length() > 0 && darkRoles.length() > 0) {
            source = "monet";
        } else if (wallpaperSeed != null) {
            source = "wallpaper";
        } else {
            source = "none";
        }

        JSObject ret = new JSObject();
        ret.put("available", !"none".equals(source));
        ret.put("monetAvailable", monet);
        ret.put("source", source);
        ret.put("isDark", isDark);
        ret.put("sdkInt", sdkInt);
        ret.put("light", lightRoles.length() > 0 ? lightRoles : JSONObject.NULL);
        ret.put("dark", darkRoles.length() > 0 ? darkRoles : JSONObject.NULL);
        ret.put("seedHex", wallpaperSeed != null ? wallpaperSeed : JSONObject.NULL);
        call.resolve(ret);
    }

    /**
     * Wraps the base context with an explicit Material 3 light/dark theme and
     * applies the dynamic color overlay when the device supports it, so the
     * resolved attribute values are the exact Monet colors for that mode.
     */
    private static Context wrapDynamic(Context base, boolean dark) {
        ContextThemeWrapper themed = new ContextThemeWrapper(
                base,
                dark
                        ? com.google.android.material.R.style.Theme_Material3_Dark_NoActionBar
                        : com.google.android.material.R.style.Theme_Material3_Light_NoActionBar);
        return DynamicColors.wrapContextIfAvailable(themed);
    }

    private static JSObject resolveRoles(Context themed) {
        JSObject out = new JSObject();
        for (Map.Entry<String, Integer> entry : ROLE_ATTRS.entrySet()) {
            String hex = resolveHex(themed, entry.getValue());
            if (hex != null) {
                out.put(entry.getKey(), hex);
            }
        }
        return out;
    }

    private static String resolveHex(Context themed, int attr) {
        try {
            TypedValue tv = new TypedValue();
            if (!themed.getTheme().resolveAttribute(attr, tv, true)) {
                return null;
            }
            if (tv.type >= TypedValue.TYPE_FIRST_COLOR_INT && tv.type <= TypedValue.TYPE_LAST_COLOR_INT) {
                return String.format(Locale.US, "#%06X", tv.data & 0xFFFFFF);
            }
        } catch (Exception ignored) {
            // Theme resolution can fail on exotic OEM overlays; treat as missing.
        }
        return null;
    }

    private static String readWallpaperSeed(Context base, int sdkInt) {
        if (sdkInt < 27) {
            return null; // WallpaperColors arrived in Android 8.1.
        }
        try {
            WallpaperManager wm = WallpaperManager.getInstance(base);
            WallpaperColors colors = wm.getWallpaperColors(WallpaperManager.FLAG_SYSTEM);
            if (colors == null || colors.getPrimaryColor() == null) {
                return null;
            }
            return String.format(Locale.US, "#%06X", colors.getPrimaryColor().toArgb() & 0xFFFFFF);
        } catch (Exception ignored) {
            // Some OEM ROMs restrict wallpaper color access; treat as missing.
            return null;
        }
    }
}
