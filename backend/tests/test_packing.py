import random
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.api import api
from src.core.cutting_optimizer_fast import FastCuttingOptimizer


class PackingTests(unittest.TestCase):
    def assert_layout(self, pieces, width, height, expected):
        self.assertEqual(len(pieces), expected)
        self.assertEqual(len({p['id'].removesuffix('_rot') for p in pieces}), expected)
        for i, p in enumerate(pieces):
            self.assertGreater(p['width'], 0)
            self.assertGreater(p['height'], 0)
            self.assertGreaterEqual(p['x'], 0)
            self.assertGreaterEqual(p['y'], 0)
            self.assertLessEqual(p['x']+p['width'], width)
            self.assertLessEqual(p['y']+p['height'], height)
            for q in pieces[i+1:]:
                self.assertTrue(p['x']+p['width'] <= q['x'] or q['x']+q['width'] <= p['x'] or
                                p['y']+p['height'] <= q['y'] or q['y']+q['height'] <= p['y'])

    def test_rotation_minimizes_length(self):
        r = api.optimize_cutting(100, 0, [(20,80,1,True,'Porta')], time_limit=1)
        self.assertTrue(r['success'], r)
        self.assertEqual(r['layout_metrics']['used_height'], 20)
        self.assertTrue(r['result']['is_optimal'])
        self.assertEqual(r['result']['total_area'], 2000)
        self.assertAlmostEqual(r['result']['waste_percentage'], 20)
        self.assertEqual(r['result']['pieces_placed'][0]['description'], 'Porta')

    def test_individual_rotation_is_preserved(self):
        r = api.optimize_cutting(100,0,[(20,80,1,False,'Sem rotação'),(10,10,2,True,'Quadrado')],time_limit=1)
        self.assertTrue(r['success'], r)
        p = next(p for p in r['result']['pieces_placed'] if p['description'] == 'Sem rotação')
        self.assertFalse(p['rotated'])
        self.assertEqual((p['width'],p['height']), (20,80))
        invalid = api.optimize_cutting(100,0,[(120,80,1,False,'Não cabe'),(10,10,1,True,'Outra')],time_limit=1)
        self.assertFalse(invalid['success'])

    def test_maxrects_fills_cavity(self):
        o = FastCuttingOptimizer(100,80,[(60,40,1),(40,20,1),(100,20,1),(40,20,1)],False)
        placed,h = o._simulate_maxrects(o.flat_pieces,60,'bottom')
        self.assertEqual(h,60)
        self.assert_layout(placed,100,60,4)
        r = o.optimize(time_limit=1)
        self.assertEqual(r.used_height,60)
        self.assertTrue(r.is_optimal)

    def test_random_layouts_are_complete_and_valid(self):
        rng = random.Random(42)
        for n in (3,12,40):
            pieces = [(rng.randint(5,100),rng.randint(5,100),rng.randint(1,2),rng.choice([True,False]),str(i)) for i in range(n)]
            r = api.optimize_cutting(100,0,pieces,time_limit=0.3)
            self.assertTrue(r['success'],r)
            self.assert_layout(r['result']['pieces_placed'],100,r['layout_metrics']['used_height'],sum(p[2] for p in pieces))
            for placed in r['result']['pieces_placed']:
                source = pieces[int(placed['description'])]
                if not source[3]:
                    self.assertFalse(placed['rotated'])
                    self.assertEqual((placed['width'],placed['height']), source[:2])

    def test_fixed_sheet_and_infeasible_input(self):
        r = api.optimize_cutting(100,100,[(20,80,1,True,'A')],time_limit=1)
        self.assertTrue(r['success'])
        self.assertEqual(r['result']['total_area'],10000)
        self.assertEqual(r['result']['stock_dimensions']['height'],100)
        self.assertAlmostEqual(r['layout_metrics']['consumed_area_efficiency'],80)
        for pieces in ([],[(0,20,1,True,'A')],[(20,20,0,True,'A')],[(120,120,1,True,'A')]):
            self.assertFalse(api.optimize_cutting(100,100,pieces,time_limit=0.1)['success'])

    def test_export_contract(self):
        r = api.optimize_cutting(100,0,[(20,80,1,True,'Porta & lateral')],time_limit=1)
        with tempfile.TemporaryDirectory() as directory:
            saved = api.save_results(r,directory)
            self.assertTrue(saved['success'],saved)
            text = Path(saved['saved_files']['csv']).read_text()
            self.assertIn('Porta & lateral',text)
            self.assertIn('Largura (mm)',text)
            self.assertIn('INSTRUÇÕES',Path(saved['saved_files']['instructions']).read_text())

    def test_area_density_uses_square_meters(self):
        r=api.optimize_cutting(1000,1000,[(100,100,10,False,'A')],time_limit=0.1)
        self.assertTrue(r['success'],r)
        self.assertEqual(r['efficiency_metrics']['piece_density'],10)


if __name__ == '__main__':
    unittest.main()
