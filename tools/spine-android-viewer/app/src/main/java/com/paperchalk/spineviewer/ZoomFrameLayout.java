package com.paperchalk.spineviewer;

import android.content.Context;
import android.util.AttributeSet;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.widget.FrameLayout;

/**
 * A small, dependency-free pan/zoom container for the Spine viewport.
 * Pinch to zoom, one-finger drag to pan, double-tap to reset.
 */
public class ZoomFrameLayout extends FrameLayout {
    private final ScaleGestureDetector scaleDetector;
    private final GestureDetector gestureDetector;
    private float scale = 1f;
    private float translationX = 0f;
    private float translationY = 0f;
    private float lastX;
    private float lastY;
    private boolean dragging;

    public ZoomFrameLayout(Context context) {
        this(context, null);
    }

    public ZoomFrameLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        setClipChildren(false);
        scaleDetector = new ScaleGestureDetector(context, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override public boolean onScale(ScaleGestureDetector detector) {
                float oldScale = scale;
                scale = clamp(scale * detector.getScaleFactor(), 0.2f, 8f);

                float focusX = detector.getFocusX() - getWidth() / 2f;
                float focusY = detector.getFocusY() - getHeight() / 2f;
                if (oldScale > 0f) {
                    float ratio = scale / oldScale;
                    translationX = focusX - (focusX - translationX) * ratio;
                    translationY = focusY - (focusY - translationY) * ratio;
                }
                applyTransform();
                return true;
            }
        });

        gestureDetector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onDoubleTap(MotionEvent e) {
                resetTransform();
                return true;
            }
        });
    }

    @Override public boolean onInterceptTouchEvent(MotionEvent ev) {
        return true;
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        gestureDetector.onTouchEvent(event);
        scaleDetector.onTouchEvent(event);

        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lastX = event.getX();
                lastY = event.getY();
                dragging = true;
                return true;
            case MotionEvent.ACTION_MOVE:
                if (dragging && !scaleDetector.isInProgress() && event.getPointerCount() == 1) {
                    float dx = event.getX() - lastX;
                    float dy = event.getY() - lastY;
                    translationX += dx;
                    translationY += dy;
                    applyTransform();
                }
                lastX = event.getX();
                lastY = event.getY();
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                dragging = false;
                return true;
            default:
                return true;
        }
    }

    public void resetTransform() {
        scale = 1f;
        translationX = 0f;
        translationY = 0f;
        applyTransform();
    }

    public float getViewportScale() {
        return scale;
    }

    private void applyTransform() {
        if (getChildCount() == 0) return;
        View child = getChildAt(0);
        child.setPivotX(getWidth() / 2f);
        child.setPivotY(getHeight() / 2f);
        child.setScaleX(scale);
        child.setScaleY(scale);
        child.setTranslationX(translationX);
        child.setTranslationY(translationY);
    }

    private static float clamp(float v, float min, float max) {
        return Math.max(min, Math.min(max, v));
    }
}
