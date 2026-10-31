package com.pixelatelier.app

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Android instrumentation of user-visible foundational features. */
@RunWith(AndroidJUnit4::class)
class BasicEditorUiTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()

    private fun openCanvas() {
        compose.onNodeWithText("＋  新建像素作品").performClick()
        compose.onNodeWithText("创建画布").performClick()
    }

    @Test fun clearCanvasIsAccessibleWithoutOverflowMenu() {
        openCanvas()
        compose.onNodeWithTag("pixel-canvas").performTouchInput {
            down(Offset(center.x,center.y))
            up()
        }
        compose.onNodeWithText("清空画布").performScrollTo().performClick()
        compose.onNodeWithText("确认修改").assertExists()
        compose.onNodeWithText("取消").performClick()
        compose.onNodeWithText("撤销").assertExists()
        compose.onNodeWithText("清空画布").performScrollTo().performClick()
        compose.onNodeWithText("确认修改").performClick()
        compose.onNodeWithText("确认修改").assertDoesNotExist()
        compose.onNodeWithText("撤销").performClick()
        compose.onNodeWithText("重做").assertExists()
    }

    @Test fun colorWheelSvSquareRgbAndSwatchesCanBeOperated() {
        openCanvas()
        compose.onNodeWithText("颜色").performClick()
        compose.onNodeWithText("专业颜色选择").assertExists()
        compose.onNodeWithTag("hsv-color-wheel").performTouchInput {
            down(Offset(center.x + 90f, center.y))
            moveTo(Offset(center.x,center.y+90f))
            up()
            down(Offset(center.x,center.y))
            moveTo(Offset(center.x+28f,center.y-28f))
            up()
        }
        compose.onNodeWithText("RGB").performClick()
        compose.onNodeWithText("红 R").assertExists()
        compose.onNodeWithText("色板").performClick()
        compose.onNodeWithText("使用颜色").performClick()
        compose.onNodeWithText("专业颜色选择").assertDoesNotExist()
    }
}
