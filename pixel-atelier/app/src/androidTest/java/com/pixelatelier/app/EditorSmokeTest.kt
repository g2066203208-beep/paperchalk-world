package com.pixelatelier.app

import android.graphics.Bitmap
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.click
import androidx.compose.ui.geometry.Offset
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/** Real Compose UI smoke test; executed on an Android emulator, not on a JVM stub. */
@RunWith(AndroidJUnit4::class)
class EditorSmokeTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun createImageDrawAndOpenLayers() {
        compose.onNodeWithText("＋  新建像素作品").performClick()
        compose.onNodeWithText("创建画布").performClick()
        compose.onNodeWithText("铅笔").assertExists()
        compose.onRoot().performTouchInput { click(Offset(center.x,center.y)) }
        compose.onNodeWithText("撤销").assertIsEnabled()
        compose.onNodeWithText("图层 1").performClick()
        compose.onNodeWithText("图层管理").assertExists()
        compose.onNodeWithText("完成").performClick()
        compose.waitForIdle()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val screenshot = instrumentation.uiAutomation.takeScreenshot()
        check(screenshot.width > 100 && screenshot.height > 100)
        screenshot.recycle()
        val output = instrumentation.uiAutomation.executeShellCommand(
            "screencap -p /sdcard/Download/pixel-atelier-editor-smoke.png")
        android.os.ParcelFileDescriptor.AutoCloseInputStream(output).use { it.readBytes() }
    }
}
