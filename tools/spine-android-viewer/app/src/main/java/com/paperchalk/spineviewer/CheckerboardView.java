package com.paperchalk.spineviewer;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;

/** Lightweight viewport background: checkerboard, dark, or light. */
public class CheckerboardView extends View {
    public enum Mode { CHECKER, DARK, LIGHT }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private Mode mode = Mode.CHECKER;
    private final int cellPx;

    public CheckerboardView(Context context) {
        super(context);
        cellPx = Math.max(16, (int)(24 * getResources().getDisplayMetrics().density));
    }

    public void setMode(Mode mode) {
        this.mode = mode;
        invalidate();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (mode == Mode.DARK) {
            canvas.drawColor(Color.rgb(24, 27, 34));
            return;
        }
        if (mode == Mode.LIGHT) {
            canvas.drawColor(Color.rgb(238, 240, 244));
            return;
        }

        canvas.drawColor(Color.rgb(42, 45, 54));
        paint.setStyle(Paint.Style.FILL);
        int cols = getWidth() / cellPx + 2;
        int rows = getHeight() / cellPx + 2;
        for (int y = 0; y < rows; y++) {
            for (int x = 0; x < cols; x++) {
                if (((x + y) & 1) == 0) {
                    paint.setColor(Color.rgb(54, 58, 69));
                    canvas.drawRect(x * cellPx, y * cellPx, (x + 1) * cellPx, (y + 1) * cellPx, paint);
                }
            }
        }
    }
}
