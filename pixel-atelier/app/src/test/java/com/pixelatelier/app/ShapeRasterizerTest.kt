package com.pixelatelier.app

import org.junit.Assert.*
import org.junit.Test

class ShapeRasterizerTest {
    private val ink=0xffdb8866.toInt()

    @Test fun livePreviewNeverMutatesDocument() {
        val doc=PixelDocument.new(32,32)
        val draft=ShapeDraft(ShapeKind.LINE,PixelPoint(2,3),PixelPoint(24,19),ink)
        assertTrue(ShapeRasterizer.rasterize(32,32,draft).isNotEmpty())
        assertTrue(doc.currentLayer.pixels.all{it==0})
    }

    @Test fun previewMatchesCommittedPixelsForEveryShape() {
        for(kind in ShapeKind.entries.filter{it!=ShapeKind.RECT_SELECTION}) {
            val doc=PixelDocument.new(32,32)
            val draft=ShapeDraft(kind,PixelPoint(3,4),PixelPoint(24,19),ink)
            val expected=ShapeRasterizer.logicalMask(32,32,draft)
            assertTrue("unexpected empty shape $kind",ShapeRasterizer.commit(doc,draft))
            for(i in expected.indices) assertEquals("$kind pixel $i",expected[i],doc.currentLayer.pixels[i]==ink)
            assertTrue(doc.undo())
            assertTrue(doc.currentLayer.pixels.all{it==0})
            assertTrue(doc.redo())
            for(i in expected.indices) assertEquals(expected[i],doc.currentLayer.pixels[i]==ink)
        }
    }

    @Test fun changingEndpointsDoesNotLeaveOldPreviewPixels() {
        val original=ShapeDraft(ShapeKind.LINE,PixelPoint(0,0),PixelPoint(15,15),ink)
        val revised=original.withEnd(PixelPoint(15,0))
        val doc=PixelDocument.new(16,16)
        ShapeRasterizer.rasterize(16,16,original)
        val expected=ShapeRasterizer.logicalMask(16,16,revised)
        ShapeRasterizer.commit(doc,revised)
        for(i in expected.indices) assertEquals(expected[i],doc.currentLayer.pixels[i]==ink)
    }

    @Test fun reversedLineEndpointsHaveIdenticalPixelSet() {
        val a=ShapeDraft(ShapeKind.LINE,PixelPoint(1,2),PixelPoint(20,8),ink)
        val b=ShapeDraft(ShapeKind.LINE,a.end,a.start,ink)
        assertEquals(ShapeRasterizer.rasterize(32,32,a).toSet(),
            ShapeRasterizer.rasterize(32,32,b).toSet())
    }

    @Test fun boundsAndDegeneratesAreSafe() {
        for(kind in ShapeKind.entries) {
            val draft=ShapeDraft(kind,PixelPoint(-100000,-100000),PixelPoint(100000,100000),ink)
            if(kind==ShapeKind.RECT_SELECTION) assertEquals(64,ShapeRasterizer.selection(8,8,draft).count())
            else assertTrue(ShapeRasterizer.rasterize(8,8,draft).all{it in 0 until 64})
        }
        val one=ShapeDraft(ShapeKind.LINE,PixelPoint(4,3),PixelPoint(4,3),ink)
        assertArrayEquals(intArrayOf(3*8+4),ShapeRasterizer.rasterize(8,8,one))
    }

    @Test fun evenAndOddEllipseIsSymmetric() {
        for(side in listOf(1,2,3,4,10,11)) {
            val draft=ShapeDraft(ShapeKind.ELLIPSE,PixelPoint(0,0),PixelPoint(side-1,side-1),ink)
            val mask=ShapeRasterizer.logicalMask(side,side,draft)
            for(y in 0 until side) for(x in 0 until side) {
                assertEquals(mask[y*side+x],mask[y*side+side-1-x])
                assertEquals(mask[y*side+x],mask[(side-1-y)*side+x])
            }
        }
    }

    @Test fun selectionDraftIsNotCommittedAsPixels() {
        val doc=PixelDocument.new(16,16)
        val draft=ShapeDraft(ShapeKind.RECT_SELECTION,PixelPoint(1,2),PixelPoint(4,6),ink)
        assertEquals(20,ShapeRasterizer.selection(16,16,draft).count())
        assertFalse(ShapeRasterizer.commit(doc,draft))
        assertTrue(doc.currentLayer.pixels.all{it==0})
    }

    @Test fun lockedLayerRefusesToCommitAndKeepsHistoryClean() {
        val doc=PixelDocument.new(8,8)
        doc.currentLayer.locked=true
        val draft=ShapeDraft(ShapeKind.RECTANGLE,PixelPoint(0,0),PixelPoint(7,7),ink)
        assertFalse(ShapeRasterizer.commit(doc,draft))
        assertFalse(doc.canUndo)
    }
}
