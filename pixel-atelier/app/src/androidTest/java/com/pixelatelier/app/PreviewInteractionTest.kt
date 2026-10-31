package com.pixelatelier.app

import android.graphics.Bitmap
import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.view.WindowInsets
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/** Tests the real Android screen: a shape preview must exist before pointer UP. */
@RunWith(AndroidJUnit4::class)
class PreviewInteractionTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun dragLinePreviewsBeforeReleaseAndCanCancelThenCommit() {
        compose.onNodeWithText("＋  新建像素作品").performClick()
        compose.onNodeWithText("创建画布").performClick()
        compose.onNodeWithText("形状").performClick()
        compose.onNodeWithText("直线").performClick()
        compose.waitForIdle()

        val bounds = compose.onNodeWithTag("pixel-canvas").fetchSemanticsNode().boundsInWindow
        val startX = bounds.center.x - 65f
        val startY = bounds.center.y - 52f
        val endX = bounds.center.x + 60f
        val endY = bounds.center.y + 32f
        val root = compose.activity.window.decorView
        val t0 = SystemClock.uptimeMillis()

        fun send(action: Int, x: Float, y: Float, at: Long) {
            val event = MotionEvent.obtain(t0,at,action,x,y,0)
            event.source = InputDevice.SOURCE_TOUCHSCREEN
            InstrumentationRegistry.getInstrumentation().runOnMainSync {
                root.dispatchTouchEvent(event)
            }
            event.recycle()
        }

        send(MotionEvent.ACTION_DOWN,startX,startY,t0)
        compose.waitForIdle()
        send(MotionEvent.ACTION_MOVE,endX,endY,t0+32L)
        compose.waitForIdle()

        // The pixel draft/controls MUST exist while the finger is still down.
        compose.onNodeWithTag("shape-preview-controls").assertExists()
        compose.onNodeWithText("撤销").assertIsNotEnabled()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        val screenshot = automation.takeScreenshot()
        assertTrue(screenshot.width > 100 && screenshot.height > 100)
        screenshot.recycle()
        val output = automation.executeShellCommand(
            "screencap -p /sdcard/Download/pixel-atelier-preview-pointer-down.png")
        android.os.ParcelFileDescriptor.AutoCloseInputStream(output).use { it.readBytes() }

        send(MotionEvent.ACTION_UP,endX,endY,t0+64L)
        compose.waitForIdle()
        compose.onNodeWithText("取消").performClick()
        compose.onNodeWithTag("shape-preview-controls").assertDoesNotExist()
        compose.onNodeWithText("撤销").assertIsNotEnabled()

        // A new draft can be committed exactly once; undo is enabled afterwards.
        compose.onNodeWithTag("pixel-canvas").performTouchInput {
            swipe(
                start = androidx.compose.ui.geometry.Offset(center.x-50f,center.y-40f),
                end = androidx.compose.ui.geometry.Offset(center.x+50f,center.y+50f),
                durationMillis = 230L
            )
        }
        compose.onNodeWithTag("shape-preview-controls").assertExists()
        compose.onNodeWithText("完成").performClick()
        compose.onNodeWithText("撤销").assertIsEnabled()
    }

    @Test fun toolbarIsBelowStatusBarOnAndroid15() {
        compose.onNodeWithText("＋  新建像素作品").performClick()
        compose.onNodeWithText("创建画布").performClick()
        compose.waitForIdle()
        val toolbar = compose.onNodeWithTag("top-toolbar").fetchSemanticsNode().boundsInWindow
        val topInset = compose.activity.window.decorView.rootWindowInsets
            ?.getInsets(WindowInsets.Type.statusBars())?.top ?: 0
        assertTrue("toolbar overlaps status bar: top=" + toolbar.top + " inset=" + topInset,
            toolbar.top >= topInset.toFloat())
    }
}
