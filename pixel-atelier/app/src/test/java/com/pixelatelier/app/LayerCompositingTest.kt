package com.pixelatelier.app

import org.junit.Assert.*
import org.junit.Test

class LayerCompositingTest {
    private val red=0xffff0000.toInt()
    private val blue=0xff0000ff.toInt()
    private val white=0xffffffff.toInt()
    private val black=0xff000000.toInt()

    @Test fun normalAlphaOverTransparentPreservesExactColor() {
        val source=0x808080c0.toInt()
        assertEquals(source,PixelBlend.over(0,source))
        assertEquals(black,PixelBlend.over(black,source,opacity=0))
    }
    @Test fun multiplyOpaqueRedBlueYieldsBlack() {
        assertEquals(black,PixelBlend.over(red,blue,mode=PixelBlendMode.MULTIPLY))
    }
    @Test fun screenOpaqueRedBlueYieldsMagenta() {
        assertEquals(0xffff00ff.toInt(),
            PixelBlend.over(red,blue,mode=PixelBlendMode.SCREEN))
    }
    @Test fun overlayUsesBackgroundAsThreshold() {
        assertEquals(black,PixelBlend.over(black,white,mode=PixelBlendMode.OVERLAY))
        assertEquals(white,PixelBlend.over(white,black,mode=PixelBlendMode.OVERLAY))
    }
    @Test fun alphaMaskHalfAndZeroBehaveCorrectly() {
        assertEquals(0,PixelBlend.over(0,red,coverage=0))
        assertEquals(0x80ff0000.toInt(),PixelBlend.over(0,red,coverage=128))
    }
    @Test fun layerMaskDoesNotDestroySourcePixelsAndUndoWorks() {
        val doc=PixelDocument.new(2,2)
        doc.replaceArea(red)
        assertTrue(doc.createMask())
        assertEquals(red,doc.composite()[0])
        assertTrue(doc.fillMask(0))
        assertEquals(0,doc.composite()[0])
        assertEquals(red,doc.currentLayer.pixels[0])
        assertTrue(doc.undo())
        assertEquals(red,doc.composite()[0])
        assertTrue(doc.redo())
        assertEquals(0,doc.composite()[0])
        assertTrue(doc.setMaskEnabled(false))
        assertEquals(red,doc.composite()[0])
    }
    @Test fun blendModeChangeIsUndoableAndDoesNotAlterPixels() {
        val doc=PixelDocument.new(1,1)
        doc.replaceArea(red)
        doc.addLayer()
        doc.replaceArea(blue)
        val source=doc.currentLayer.pixels.copyOf()
        assertTrue(doc.setBlendMode(PixelBlendMode.SCREEN))
        assertArrayEquals(source,doc.currentLayer.pixels)
        assertEquals(0xffff00ff.toInt(),doc.composite()[0])
        assertTrue(doc.undo())
        assertEquals(PixelBlendMode.NORMAL,doc.currentLayer.blendMode)
        assertEquals(blue,doc.composite()[0])
        assertTrue(doc.redo())
        assertEquals(PixelBlendMode.SCREEN,doc.currentLayer.blendMode)
    }
    @Test fun alphaLockPreservesAlphaAndPreventsPaintingBlankCells() {
        val doc=PixelDocument.new(2,1)
        doc.beginStroke();doc.setPixel(0,0,0x80665544.toInt());doc.finishStroke()
        assertTrue(doc.setAlphaLocked(true))
        doc.beginStroke()
        doc.setPixel(0,0,white)
        doc.setPixel(1,0,red)
        doc.finishStroke()
        assertEquals(0x80ffffff.toInt(),doc.currentLayer.pixels[0])
        assertEquals(0,doc.currentLayer.pixels[1])
        assertTrue(doc.undo())
        assertEquals(0x80665544.toInt(),doc.currentLayer.pixels[0])
    }
    @Test fun previewUsesSameBlendMathAsCommittedImage() {
        val doc=PixelDocument.new(3,3)
        doc.replaceArea(red)
        doc.addLayer()
        assertTrue(doc.setBlendMode(PixelBlendMode.MULTIPLY))
        val i=4
        val draftPreview=doc.compositeWithPreview(i,white)
        doc.beginStroke();doc.setPixel(1,1,white);doc.finishStroke()
        assertEquals(draftPreview,doc.composite()[i])
    }
    @Test fun alphaLockedEraserCannotDarkenOrDeleteExistingPixel() {
        val doc=PixelDocument.new(1,1)
        doc.replaceArea(0x80abcdef.toInt())
        doc.setAlphaLocked(true)
        doc.beginStroke()
        doc.setPixel(0,0,0)
        assertFalse(doc.finishStroke())
        assertEquals(0x80abcdef.toInt(),doc.pixel(0,0))
        assertFalse(doc.replaceArea(0))
        assertEquals(0x80abcdef.toInt(),doc.pixel(0,0))
    }

    @Test fun maskBrushStrokeHasOneUndoAndCanCancel() {
        val doc=PixelDocument.new(8,8)
        doc.replaceArea(red)
        assertTrue(doc.createMask())
        assertTrue(doc.beginMaskStroke())
        doc.maskLine(1,1,6,6,0)
        assertEquals(0,doc.composite()[1*8+1])
        assertEquals(red,doc.currentLayer.pixels[1*8+1])
        assertTrue(doc.finishMaskStroke())
        assertTrue(doc.undo())
        assertEquals(red,doc.composite()[1*8+1])
        assertTrue(doc.redo())
        assertEquals(0,doc.composite()[1*8+1])
        assertTrue(doc.beginMaskStroke())
        doc.maskLine(0,0,7,0,0)
        doc.cancelMaskStroke()
        assertEquals(red,doc.composite()[0])
    }

    @Test fun deepCopyOfMaskIsIndependent() {
        val doc=PixelDocument.new(2,2)
        doc.createMask()
        val clone=doc.deepCopy()
        clone.fillMask(0)
        assertEquals(255,doc.currentLayer.mask!![0].toInt() and 255)
        assertEquals(0,clone.currentLayer.mask!![0].toInt() and 255)
    }
}
