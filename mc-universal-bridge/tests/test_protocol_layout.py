import struct
import unittest

MAPPING_BYTES = 16 * 1024 * 1024

OFF_HEADER = 0x00000
OFF_HOST_STATE = 0x00100
OFF_MC_STATE = 0x00200
OFF_ENTITY_TABLE = 0x01000
OFF_INPUT_RING = 0x0A000
OFF_HOST_EVENT_RING = 0x11000
OFF_MC_EVENT_RING = 0x18000
OFF_COLLISION_RING = 0x20000
COLLISION_RING_BYTES = 4 * 1024 * 1024
OFF_RENDER_RING = OFF_COLLISION_RING + COLLISION_RING_BYTES
RENDER_RING_BYTES = 8 * 1024 * 1024

HEADER = struct.Struct("<IIIIIIQQQQQ")
HOST_STATE = struct.Struct("<IIQdddffIIdf15I")
MC_STATE = struct.Struct("<IIdddffffIIQddddddf3I")
ENTITY = struct.Struct("<QIIfffffff ffIII".replace(" ", ""))
INPUT = struct.Struct("<HHiiiiI")
EVENT = struct.Struct("<IIQQffffII")
TRIANGLE = struct.Struct("<9fI")
BOX = struct.Struct("<6fII")


class ProtocolLayoutTests(unittest.TestCase):
    def test_fixed_struct_sizes(self):
        self.assertEqual(HEADER.size, 64)
        self.assertEqual(HOST_STATE.size, 128)
        self.assertEqual(MC_STATE.size, 128)
        self.assertEqual(ENTITY.size, 64)
        self.assertEqual(INPUT.size, 24)
        self.assertEqual(EVENT.size, 48)
        self.assertEqual(TRIANGLE.size, 40)
        self.assertEqual(BOX.size, 32)

    def test_regions_do_not_overlap(self):
        entity_table_end = OFF_ENTITY_TABLE + 64 + 512 * ENTITY.size
        input_end = OFF_INPUT_RING + 0x80 + 1024 * INPUT.size
        host_event_end = OFF_HOST_EVENT_RING + 0x80 + 512 * EVENT.size
        mc_event_end = OFF_MC_EVENT_RING + 0x80 + 512 * EVENT.size

        self.assertLessEqual(entity_table_end, OFF_INPUT_RING)
        self.assertLessEqual(input_end, OFF_HOST_EVENT_RING)
        self.assertLessEqual(host_event_end, OFF_MC_EVENT_RING)
        self.assertLessEqual(mc_event_end, OFF_COLLISION_RING)
        self.assertLessEqual(OFF_RENDER_RING + RENDER_RING_BYTES, MAPPING_BYTES)

    def test_magic_bytes_are_mcub(self):
        self.assertEqual(struct.pack("<I", 0x4255434D), b"MCUB")


if __name__ == "__main__":
    unittest.main()
