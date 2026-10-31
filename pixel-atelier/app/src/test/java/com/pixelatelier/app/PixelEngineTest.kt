package com.pixelatelier.app

import org.junit.Assert.*
import org.junit.Test

class PixelEngineTest {
    @Test fun singlePixelAndBounds() {
        val d = PixelDocument.new(16,16)
        d.beginStroke(); d.setPixel(5,7,0xff123456.toInt()); d.setPixel(-1,1,42); d.finishStroke()
        assertEquals(0xff123456.toInt(),d.pixel(5,7))
        assertEquals(1,d.currentLayer.pixels.count { it != 0 })
    }

    @Test fun linesCoverEndpointsInEightOctants() {
        for (x in -4..4) for (y in -4..4) {
            val d = PixelDocument.new(16,16)
            d.beginStroke()
            d.line(8,8,8+x,8+y,0xffff0011.toInt())
            d.finishStroke()
            assertEquals(0xffff0011.toInt(),d.pixel(8,8))
            assertEquals(0xffff0011.toInt(),d.pixel(8+x,8+y))
        }
    }

    @Test fun fillStopsAtWall() {
        val d = PixelDocument.new(8,8)
        d.beginStroke(); d.line(3,0,3,7,0xff000000.toInt()); d.finishStroke()
        d.beginStroke(); d.floodFill(0,0,0xff00aa00.toInt()); d.finishStroke()
        assertEquals(0xff00aa00.toInt(),d.pixel(2,7))
        assertEquals(0,d.pixel(4,7))
    }

    @Test fun cancelDoesNotModifyImageOrHistory() {
        val d = PixelDocument.new(8,8)
        d.beginStroke(); d.setPixel(1,1,0xffffffff.toInt()); d.cancelStroke()
        assertEquals(0,d.pixel(1,1))
        assertFalse(d.canUndo)
    }

    @Test fun undoRedoIsLossless() {
        val d = PixelDocument.new(32,32)
        d.beginStroke(); d.rectangle(2,3,24,20,0xff224466.toInt(),true); d.finishStroke()
        val expected = d.composite().copyOf()
        assertTrue(d.undo()); assertEquals(0,d.pixel(2,3))
        assertTrue(d.redo()); assertArrayEquals(expected,d.composite())
    }

    @Test fun lockedLayerNeverChanges() {
        val d = PixelDocument.new(8,8)
        d.currentLayer.locked = true
        d.beginStroke(); d.setPixel(3,4,-1); d.finishStroke()
        assertEquals(0,d.pixel(3,4))
    }

    @Test fun layersCompositeAndCopy() {
        val d = PixelDocument.new(2,2)
        d.beginStroke(); d.setPixel(0,0,0xff0000ff.toInt()); d.finishStroke()
        assertTrue(d.addLayer())
        d.beginStroke(); d.setPixel(1,1,0xffff0000.toInt()); d.finishStroke()
        assertEquals(0xff0000ff.toInt(),d.composite()[0])
        assertEquals(0xffff0000.toInt(),d.composite()[3])
        val clone=d.deepCopy()
        d.currentLayer.pixels[3]=0
        assertEquals(0xffff0000.toInt(),clone.composite()[3])
    }
}
