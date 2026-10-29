import unittest
from train_rl import candidate, episode, key, next_pixel, state

class PaintEnvTests(unittest.TestCase):
    def test_brushes_do_not_change_target_or_paint_wrong_colour(self):
        target=[0]*256
        target[0:4]=[2]*4
        target[16:20]=[2]*4
        current=[0]*256
        self.assertEqual(candidate(target,current,0,1),[0,1,2,3])
        self.assertEqual(candidate(target,current,0,2),[0,16])
        self.assertEqual(candidate(target,current,0,3),[0,1,16,17])
        self.assertTrue(len(candidate(target,current,0,4))>=8)
    def test_agent_can_reconstruct_reference_with_finite_actions(self):
        target=[0]*256
        for y in range(4,12):
            for x in range(4,12):
                target[y*16+x]=3 if x<8 else 4
        naive=episode(target)
        self.assertTrue(naive['complete'])
        self.assertEqual(naive['strokes'],64)
        q={}
        for _ in range(50):episode(target,q,train=True,epsilon=.2)
        learned=episode(target,q)
        self.assertTrue(learned['complete'])
        self.assertLessEqual(learned['strokes'],naive['strokes'])
if __name__=='__main__':unittest.main()
