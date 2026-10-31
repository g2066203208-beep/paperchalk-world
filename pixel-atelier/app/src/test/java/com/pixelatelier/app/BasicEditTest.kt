package com.pixelatelier.app

import org.junit.Assert.*
import org.junit.Test

class BasicEditTest {
    private val red=0xFFCC2233.toInt()
    private val green=0xFF33CC22.toInt()

    @Test fun clearingOneLayerDoesNotTouchOtherLayer() {
        val doc=PixelDocument.new(4,4)
        doc.beginStroke();doc.setPixel(1,1,red);doc.finishStroke()
        assertTrue(doc.addLayer())
        doc.beginStroke();doc.setPixel(1,1,green);doc.finishStroke()
        assertTrue(doc.replaceArea())
        assertEquals(0, doc.pixel(1,1))
        assertEquals(red, doc.layers[0].pixels[5])
        assertTrue(doc.undo())
        assertEquals(green,doc.pixel(1,1))
        assertTrue(doc.redo())
        assertEquals(0,doc.pixel(1,1))
    }

    @Test fun selectedClearKeepsOutsidePixel() {
        val doc=PixelDocument.new(8,8)
        assertTrue(doc.replaceArea(red))
        val mask=SelectionMask.rectangle(8,8,2,2,5,5)
        assertTrue(doc.replaceArea(mask=mask))
        assertEquals(0,doc.pixel(2,2))
        assertEquals(red,doc.pixel(0,0))
        assertEquals(red,doc.pixel(7,7))
        assertTrue(doc.undo())
        assertEquals(red,doc.pixel(2,2))
    }

    @Test fun multilayerClearIsExactlyOneUndo() {
        val doc=PixelDocument.new(3,3)
        doc.beginStroke();doc.setPixel(0,0,red);doc.finishStroke()
        assertTrue(doc.addLayer())
        doc.beginStroke();doc.setPixel(1,1,green);doc.finishStroke()
        assertTrue(doc.replaceArea(scope=ClearScope.ALL_EDITABLE_LAYERS))
        assertEquals(0,doc.layers[0].pixels[0])
        assertEquals(0,doc.layers[1].pixels[4])
        assertTrue(doc.undo())
        assertEquals(red,doc.layers[0].pixels[0])
        assertEquals(green,doc.layers[1].pixels[4])
        assertTrue(doc.redo())
        assertEquals(0,doc.layers[0].pixels[0])
        assertEquals(0,doc.layers[1].pixels[4])
    }

    @Test fun lockedLayerSurvivesMassClear() {
        val doc=PixelDocument.new(3,3)
        doc.beginStroke();doc.setPixel(0,0,red);doc.finishStroke()
        doc.layers[0].locked=true
        assertTrue(doc.addLayer())
        assertTrue(doc.replaceArea(green))
        assertTrue(doc.replaceArea(scope=ClearScope.ALL_EDITABLE_LAYERS))
        assertEquals(red,doc.layers[0].pixels[0])
        assertTrue(doc.layers[1].pixels.all{it==0})
    }

    @Test fun clearingAlreadyTransparentLayerIsNoOp() {
        val doc=PixelDocument.new(16,16)
        assertFalse(doc.replaceArea())
        assertFalse(doc.canUndo)
        assertFalse(doc.canRedo)
    }

    @Test fun fullLayerColorFillRoundTrip() {
        val doc=PixelDocument.new(2,2)
        assertTrue(doc.replaceArea(0x8080FF00.toInt()))
        assertTrue(doc.currentLayer.pixels.all{it==0x8080FF00.toInt()})
        assertTrue(doc.undo())
        assertTrue(doc.currentLayer.pixels.all{it==0})
        assertTrue(doc.redo())
        assertTrue(doc.currentLayer.pixels.all{it==0x8080FF00.toInt()})
    }

    @Test fun emptySelectionIsNoOp() {
        val doc=PixelDocument.new(8,8)
        val empty=SelectionMask(8,8)
        assertFalse(doc.replaceArea(red,empty))
        assertFalse(doc.canUndo)
    }
}
