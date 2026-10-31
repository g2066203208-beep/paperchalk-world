package com.pixelatelier.app

import org.junit.Assert.*
import org.junit.Test

class SelectionToolsTest {
    @Test fun rectangleAndBooleanOps() {
        val a = SelectionMask.rectangle(8, 8, 1, 2, 4, 6)
        assertEquals(12, a.count())
        assertEquals(PixelBounds(1,2,4,6), a.bounds())
        val b = SelectionMask.rectangle(8, 8, 3, 3, 6, 5)
        a.combine(b, MaskOperation.INTERSECT)
        assertEquals(2, a.count())
        a.invert()
        assertEquals(62, a.count())
    }
    @Test fun ellipseIsSymmetricEvenAndOddSize() {
        for (size in listOf(1, 2, 3, 4, 11)) {
            val a = SelectionMask.ellipse(size, size, 0, 0, size, size)
            assertTrue(a.count() >= 1)
            for (y in 0 until size) for (x in 0 until size) {
                assertEquals(a.get(x, y), a.get(size-1-x, y))
                assertEquals(a.get(x, y), a.get(x, size-1-y))
            }
        }
    }
    @Test fun magicWandHandlesFourVsEightConnected() {
        val pixels = intArrayOf(1,0,0, 0,1,0, 0,0,1)
        assertEquals(1, SelectionMask.magicWand(pixels,3,3,0,0,false).count())
        assertEquals(3, SelectionMask.magicWand(pixels,3,3,0,0,true).count())
    }
    @Test fun internalClipboardCopiesAlphaAndUndoPaste() {
        val doc = PixelDocument.new(8,8)
        doc.beginStroke()
        doc.setPixel(1,1,0x80882211.toInt())
        doc.setPixel(2,1,0)
        doc.finishStroke()
        val mask = SelectionMask.rectangle(8,8,1,1,3,2)
        val clipboard = PixelSelectionTools.copy(doc,mask)!!
        assertEquals(2,clipboard.width)
        assertEquals(0x80882211.toInt(),clipboard.pixels[0])
        assertEquals(0,clipboard.pixels[1])
        assertTrue(clipboard.pasteInto(doc,4,4))
        assertEquals(0x80882211.toInt(),doc.pixel(4,4))
        assertEquals(0,doc.pixel(5,4))
        assertTrue(doc.undo())
        assertEquals(0,doc.pixel(4,4))
        assertEquals(0x80882211.toInt(),doc.pixel(1,1))
    }
    @Test fun ninetyDegreeFourTimesIsIdentity() {
        val colors = intArrayOf(1,2,3,4,5,6)
        val clipboard = PixelClipboard(2,3,colors,BooleanArray(6){true})
        val original = clipboard.pixels
        val rotated = clipboard.rotate90().rotate90().rotate90().rotate90()
        assertEquals(2,rotated.width)
        assertEquals(3,rotated.height)
        assertArrayEquals(original,rotated.pixels)
    }
    @Test fun mirrorTwiceIsIdentity() {
        val pixels = intArrayOf(1,2,3,4,5,6)
        val clipboard = PixelClipboard(2,3,pixels, BooleanArray(6){true})
        assertArrayEquals(pixels,clipboard.flipHorizontal().flipHorizontal().pixels)
        assertArrayEquals(pixels,clipboard.flipVertical().flipVertical().pixels)
    }
    @Test fun wrappedBrushTouchesOppositeEdge() {
        val doc = PixelDocument.new(5,3)
        doc.beginStroke()
        PixelSelectionTools.paintWrapped(doc,-1,1,0xff123456.toInt(),true,false)
        PixelSelectionTools.paintWrapped(doc,5,-1,0xff654321.toInt(),true,true)
        doc.finishStroke()
        assertEquals(0xff123456.toInt(),doc.pixel(4,1))
        assertEquals(0xff654321.toInt(),doc.pixel(0,2))
    }
    @Test fun ellipseOnImageIsUndoable() {
        val doc=PixelDocument.new(16,16)
        assertTrue(PixelSelectionTools.drawEllipse(doc,2,3,12,13,0xff112233.toInt(),true))
        assertTrue(doc.composite().any { it!=0 })
        assertTrue(doc.undo())
        assertTrue(doc.composite().all { it==0 })
    }
}
